import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  DONATION_CATEGORIES,
  DONATION_STATUS_ORDER,
  type Donation,
  type DonationCategory,
  type DonationRequest,
  type NgoNeed,
  type Organisation,
  type PlatformStats,
  type UserRole,
  type VolunteerTask,
} from './src/types.ts';
import {
  hashPassword,
  isServerSupabaseConfigured,
  requireAuth,
  requireRole,
  signToken,
  verifyPassword,
  type AuthenticatedRequest,
} from './server/auth.ts';
import { getDb, logActivity, resetDbToSeed, sanitizeUser, saveDb } from './server/db.ts';
import { evaluateFoodSafetyEligibility } from './server/safety.ts';
import {
  categorizeDonationImage,
  extractDonationDetailsFromText,
  extractReadableAiError,
  generateDonationDescription,
  isGeminiConfigured,
  matchNgosForDonation,
} from './server/ai.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '8mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use('/images', express.static(path.join(process.cwd(), 'public/images')));
  app.use('/src/assets/images', express.static(path.join(process.cwd(), 'public/images')));

  // Health & status
  app.get('/api/health', (_req, res) => {
    const supabaseActive = isServerSupabaseConfigured();
    res.json({
      ok: true,
      service: 'FOOD RESCUE AI',
      geminiConfigured: isGeminiConfigured(),
      supabaseConfigured: supabaseActive,
      databaseEngine: supabaseActive
        ? 'Supabase PostgreSQL + Auth + Storage'
        : 'Express Server Persistent Store (Demo Mode)',
    });
  });

  // Real platform statistics (strictly computed from stored records)
  app.get('/api/stats', (_req, res) => {
    const db = getDb();
    const supabaseActive = isServerSupabaseConfigured();
    const confirmedDonationIds = new Set(db.deliveryRecords.map((r) => r.donationId));

    const completedDonations = db.donations.filter(
      (d) => d.status === 'Delivered' && confirmedDonationIds.has(d.id)
    ).length;

    const availableDonations = db.donations.filter((d) => d.status === 'Available').length;
    const registeredNgos = db.organisations.filter(
      (o) => o.verificationStatus === 'verified'
    ).length;
    const pendingRequests = db.requests.filter((r) => r.status === 'Pending').length;
    const openTasks = db.volunteerTasks.filter(
      (t) => t.status === 'Open' || t.status === 'Accepted' || t.status === 'Picked Up'
    ).length;
    const activeVolunteers = db.users.filter(
      (u) => u.role === 'volunteer' && u.status === 'active'
    ).length;

    const categoryBreakdown = DONATION_CATEGORIES.map((category) => ({
      category,
      count: db.donations.filter((d) => d.category === category).length,
    }));

    const statusPipeline = DONATION_STATUS_ORDER.map((status) => ({
      status,
      count: db.donations.filter((d) => d.status === status).length,
    }));

    const stats: PlatformStats = {
      totalDonations: db.donations.length,
      availableDonations,
      completedDonations,
      registeredNgos,
      totalOrganisations: db.organisations.length,
      pendingRequests,
      openTasks,
      activeVolunteers,
      categoryBreakdown,
      statusPipeline,
      recentActivities: db.activityLogs.slice(0, 12),
      backendStatus: {
        databaseEngine: supabaseActive
          ? 'Supabase PostgreSQL + Auth + Storage'
          : 'Express Server Persistent Store',
        geminiConfigured: isGeminiConfigured(),
        supabaseConfigured: supabaseActive,
        demoAccountsEnabled: !supabaseActive,
      },
    };

    res.json(stats);
  });

  // Authentication routes
  app.post('/api/auth/register', (req, res) => {
    const {
      name,
      email,
      password,
      role,
      phone,
      city,
      address,
      orgName,
      orgType,
      registrationNumber,
      capacityNote,
    } = req.body || {};

    if (!name || !email || !password || !role) {
      res.status(400).json({ error: 'Name, email, password, and role are required.' });
      return;
    }

    const allowedRoles: UserRole[] = ['donor', 'ngo', 'volunteer'];
    if (!allowedRoles.includes(role)) {
      res.status(400).json({
        error:
          'Public registration supports Donor, NGO/Receiver, and Volunteer roles. Use Administrator demo access or contact support for admin onboarding.',
      });
      return;
    }

    if (String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const db = getDb();
    const normalizedEmail = String(email).trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const userId = `usr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const newUser = {
      id: userId,
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(String(password)),
      role: role as UserRole,
      phone: String(phone || '').trim() || 'Not provided',
      city: String(city || '').trim() || 'Bengaluru',
      address: String(address || '').trim() || 'Address pending',
      status: 'active' as const,
      isDemo: false,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    let organisation: Organisation | null = null;
    if (role === 'ngo') {
      organisation = {
        id: `org-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        userId,
        name: String(orgName || name).trim(),
        registrationNumber: String(registrationNumber || 'PENDING-REG').trim(),
        type: ['NGO', 'Orphanage', 'Shelter', 'Community Kitchen'].includes(orgType)
          ? orgType
          : 'NGO',
        city: newUser.city,
        address: newUser.address,
        contactPhone: newUser.phone,
        capacityNote: String(capacityNote || 'Community distribution center').trim(),
        documentsSummary: 'Submitted on registration — pending admin review',
        verificationStatus: 'pending',
        createdAt: new Date().toISOString(),
      };
      db.organisations.push(organisation);
    }

    logActivity(
      db,
      userId,
      newUser.name,
      newUser.role,
      `Registered new ${newUser.role} account`,
      'user',
      newUser.name
    );
    saveDb(db);

    const token = signToken({ userId: newUser.id, role: newUser.role, email: newUser.email });
    res.cookie('fr_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.status(201).json({
      token,
      user: sanitizeUser(newUser),
      organisation,
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const db = getDb();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === String(email).trim().toLowerCase()
    );
    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (user.status === 'suspended') {
      res.status(403).json({ error: 'This account has been suspended by an administrator.' });
      return;
    }

    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    const organisation = db.organisations.find((o) => o.userId === user.id) || null;

    res.cookie('fr_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.json({
      token,
      user: sanitizeUser(user),
      organisation,
    });
  });

  app.post('/api/auth/demo-login', (req, res) => {
    const { role } = req.body || {};
    const db = getDb();
    const demoUser = db.users.find((u) => u.role === role && u.isDemo);
    if (!demoUser) {
      res.status(404).json({ error: 'Demo account not found for that role.' });
      return;
    }
    if (demoUser.status === 'suspended') {
      res.status(403).json({ error: 'Demo account is currently suspended.' });
      return;
    }

    const token = signToken({
      userId: demoUser.id,
      role: demoUser.role,
      email: demoUser.email,
    });
    const organisation = db.organisations.find((o) => o.userId === demoUser.id) || null;

    res.cookie('fr_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.json({
      token,
      user: sanitizeUser(demoUser),
      organisation,
    });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('fr_token');
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.auth!.userId);
    if (!user) {
      res.status(401).json({ error: 'User account not found.' });
      return;
    }
    const organisation = db.organisations.find((o) => o.userId === user.id) || null;
    res.json({ user: sanitizeUser(user), organisation });
  });

  // Image upload endpoint
  app.post('/api/upload', requireAuth, (req: AuthenticatedRequest, res) => {
    const { dataUrl, filename } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ error: 'Image dataUrl is required.' });
      return;
    }

    const match = /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(
      dataUrl
    );
    if (!match) {
      res.status(400).json({ error: 'Invalid image format. Upload JPEG, PNG, or WEBP.' });
      return;
    }

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Image exceeds 5MB limit.' });
      return;
    }

    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, safeName), buffer);

    res.json({
      url: `/uploads/${safeName}`,
      originalName: filename || safeName,
      mimeType,
      sizeBytes: buffer.length,
    });
  });

  // Public donations browse
  app.get('/api/donations', (req, res) => {
    const db = getDb();
    const { category, status, city, q, donorId } = req.query;

    let list = [...db.donations];
    if (category && category !== 'All') {
      list = list.filter((d) => d.category === category);
    }
    if (status && status !== 'All') {
      list = list.filter((d) => d.status === status);
    }
    if (city && city !== 'All') {
      list = list.filter((d) => d.city.toLowerCase() === String(city).toLowerCase());
    }
    if (donorId) {
      list = list.filter((d) => d.donorId === String(donorId));
    }
    if (q && String(q).trim()) {
      const term = String(q).trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(term) ||
          d.description.toLowerCase().includes(term) ||
          d.subCategory.toLowerCase().includes(term) ||
          d.city.toLowerCase().includes(term) ||
          d.donorName.toLowerCase().includes(term)
      );
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ donations: list });
  });

  // Create donation (Donor or Admin)
  app.post(
    '/api/donations',
    requireAuth,
    requireRole('donor', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const user = db.users.find((u) => u.id === req.auth!.userId);
      if (!user) {
        res.status(401).json({ error: 'User not found.' });
        return;
      }

      const {
        title,
        description,
        category,
        subCategory,
        quantityValue,
        quantityUnit,
        location,
        city,
        availableFrom,
        availableUntil,
        imageUrl,
        foodDetails,
        aiMetadata,
      } = req.body || {};

      if (!title || !description || !category || !quantityValue || !quantityUnit || !location || !city) {
        res.status(400).json({
          error:
            'Title, description, category, quantity, unit, pickup address, and city are required.',
        });
        return;
      }

      if (!DONATION_CATEGORIES.includes(category)) {
        res.status(400).json({ error: 'Invalid donation category.' });
        return;
      }

      const qty = Number(quantityValue);
      if (!Number.isFinite(qty) || qty <= 0) {
        res.status(400).json({ error: 'Quantity must be a positive number.' });
        return;
      }

      const safetyEligibility = evaluateFoodSafetyEligibility(
        category as DonationCategory,
        foodDetails,
        availableUntil
      );

      if (!safetyEligibility.eligible) {
        res.status(400).json({
          error: `Donation failed deterministic safety eligibility checks: ${safetyEligibility.reasons.join(' ')}`,
          safetyEligibility,
        });
        return;
      }

      const defaultImages: Record<DonationCategory, string> = {
        Food: '/images/donation_prepared_meals_1794669342712.jpg',
        'Clothing & Warmth': '/images/donation_essentials_kit_1794669344223.jpg',
        'Education & Children': '/images/donation_essentials_kit_1794669344223.jpg',
        'Household & Daily Needs': '/images/about_community_hub_1794669343508.jpg',
      };

      const nowIso = new Date().toISOString();
      const donation: Donation = {
        id: `don-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        donorId: user.id,
        donorName: user.name,
        donorType: user.role === 'admin' ? 'Platform Desk' : 'Verified Donor',
        title: String(title).trim(),
        description: String(description).trim(),
        category: category as DonationCategory,
        subCategory: String(subCategory || 'General').trim(),
        quantityValue: qty,
        quantityUnit: String(quantityUnit).trim(),
        location: String(location).trim(),
        city: String(city).trim(),
        availableFrom: availableFrom || nowIso,
        availableUntil: availableUntil || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        imageUrl:
          typeof imageUrl === 'string' && imageUrl.trim()
            ? imageUrl.trim()
            : defaultImages[category as DonationCategory],
        status: 'Available',
        foodDetails: category === 'Food' ? foodDetails : undefined,
        safetyEligibility,
        aiMetadata,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      db.donations.unshift(donation);
      logActivity(
        db,
        user.id,
        user.name,
        user.role,
        'Published new donation listing',
        'donation',
        donation.title
      );
      saveDb(db);

      res.status(201).json({ donation });
    }
  );

  // Update donation
  app.put(
    '/api/donations/:id',
    requireAuth,
    requireRole('donor', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const idx = db.donations.findIndex((d) => d.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Donation not found.' });
        return;
      }

      const existing = db.donations[idx];
      if (req.auth!.role !== 'admin' && existing.donorId !== req.auth!.userId) {
        res.status(403).json({ error: 'You can only edit your own donation listings.' });
        return;
      }

      const nextCategory = (req.body.category || existing.category) as DonationCategory;
      const nextFoodDetails =
        nextCategory === 'Food' ? req.body.foodDetails ?? existing.foodDetails : undefined;
      const nextAvailableUntil = req.body.availableUntil ?? existing.availableUntil;

      const safetyEligibility = evaluateFoodSafetyEligibility(
        nextCategory,
        nextFoodDetails,
        nextAvailableUntil
      );
      if (!safetyEligibility.eligible) {
        res.status(400).json({
          error: `Updated details failed safety eligibility: ${safetyEligibility.reasons.join(' ')}`,
          safetyEligibility,
        });
        return;
      }

      if (req.body.quantityValue !== undefined) {
        const nextQty = Number(req.body.quantityValue);
        if (!Number.isFinite(nextQty) || nextQty <= 0) {
          res.status(400).json({ error: 'Quantity must be a positive number.' });
          return;
        }
      }

      const updated: Donation = {
        ...existing,
        title: req.body.title ? String(req.body.title).trim() : existing.title,
        description: req.body.description ? String(req.body.description).trim() : existing.description,
        category: nextCategory,
        subCategory: req.body.subCategory ? String(req.body.subCategory).trim() : existing.subCategory,
        quantityValue:
          req.body.quantityValue !== undefined
            ? Number(req.body.quantityValue)
            : existing.quantityValue,
        quantityUnit: req.body.quantityUnit
          ? String(req.body.quantityUnit).trim()
          : existing.quantityUnit,
        location: req.body.location ? String(req.body.location).trim() : existing.location,
        city: req.body.city ? String(req.body.city).trim() : existing.city,
        availableFrom: req.body.availableFrom ?? existing.availableFrom,
        availableUntil: nextAvailableUntil,
        imageUrl: req.body.imageUrl ? String(req.body.imageUrl).trim() : existing.imageUrl,
        foodDetails: nextFoodDetails,
        safetyEligibility,
        updatedAt: new Date().toISOString(),
      };

      db.donations[idx] = updated;
      saveDb(db);
      res.json({ donation: updated });
    }
  );

  // Quick photo update for any donation (Donor owner or Admin)
  app.patch(
    '/api/donations/:id/photo',
    requireAuth,
    requireRole('donor', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const idx = db.donations.findIndex((d) => d.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Donation not found.' });
        return;
      }
      const existing = db.donations[idx];
      if (req.auth!.role !== 'admin' && existing.donorId !== req.auth!.userId) {
        res.status(403).json({ error: 'You can only edit photos on your own donation listings.' });
        return;
      }
      const { imageUrl } = req.body || {};
      if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
        res.status(400).json({ error: 'Valid imageUrl is required.' });
        return;
      }
      const updated: Donation = {
        ...existing,
        imageUrl: imageUrl.trim(),
        updatedAt: new Date().toISOString(),
      };
      db.donations[idx] = updated;
      logActivity(
        db,
        req.auth!.userId,
        req.auth!.email,
        req.auth!.role,
        'Updated donation photo',
        'donation',
        existing.title
      );
      saveDb(db);
      res.json({ donation: updated });
    }
  );

  // Site editorial photos (Hero & About)
  app.get('/api/site-settings', (_req, res) => {
    const db = getDb();
    res.json({ siteSettings: db.siteSettings });
  });

  app.put(
    '/api/site-settings',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const { heroImageUrl, aboutImageUrl } = req.body || {};
      db.siteSettings = {
        heroImageUrl:
          typeof heroImageUrl === 'string' && heroImageUrl.trim()
            ? heroImageUrl.trim()
            : db.siteSettings.heroImageUrl,
        aboutImageUrl:
          typeof aboutImageUrl === 'string' && aboutImageUrl.trim()
            ? aboutImageUrl.trim()
            : db.siteSettings.aboutImageUrl,
        updatedAt: new Date().toISOString(),
      };
      logActivity(
        db,
        req.auth!.userId,
        'Administrator',
        'admin',
        'Updated site editorial photo',
        'site',
        'Editorial Imagery'
      );
      saveDb(db);
      res.json({ siteSettings: db.siteSettings });
    }
  );

  // Delete donation
  app.delete(
    '/api/donations/:id',
    requireAuth,
    requireRole('donor', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const existing = db.donations.find((d) => d.id === req.params.id);
      if (!existing) {
        res.status(404).json({ error: 'Donation not found.' });
        return;
      }
      if (req.auth!.role !== 'admin' && existing.donorId !== req.auth!.userId) {
        res.status(403).json({ error: 'You can only delete your own donation listings.' });
        return;
      }
      if (
        req.auth!.role !== 'admin' &&
        (existing.status === 'Picked Up' || existing.status === 'Delivered')
      ) {
        res.status(400).json({
          error: 'Donations already picked up or delivered cannot be deleted.',
        });
        return;
      }

      db.donations = db.donations.filter((d) => d.id !== existing.id);
      db.requests = db.requests.filter((r) => r.donationId !== existing.id);
      db.volunteerTasks = db.volunteerTasks.filter((t) => t.donationId !== existing.id);
      logActivity(
        db,
        req.auth!.userId,
        req.auth!.email,
        req.auth!.role,
        'Removed donation listing',
        'donation',
        existing.title
      );
      saveDb(db);
      res.json({ ok: true });
    }
  );

  // NGO Organisations & Needs
  app.get('/api/organisations/public', (_req, res) => {
    const db = getDb();
    const publicOrgs = db.organisations
      .filter((o) => o.verificationStatus === 'verified')
      .map((o) => ({
        id: o.id,
        name: o.name,
        type: o.type,
        city: o.city,
        capacityNote: o.capacityNote,
        verificationStatus: o.verificationStatus,
      }));
    const activeNeeds = db.ngoNeeds.filter((n) => n.active);
    res.json({ organisations: publicOrgs, needs: activeNeeds });
  });

  app.get('/api/ngo/my-organisation', requireAuth, requireRole('ngo', 'admin'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const org = db.organisations.find((o) => o.userId === req.auth!.userId) || null;
    res.json({ organisation: org });
  });

  app.put('/api/ngo/my-organisation', requireAuth, requireRole('ngo'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.auth!.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found.' });
      return;
    }

    const { name, registrationNumber, type, city, address, contactPhone, capacityNote, documentsSummary } =
      req.body || {};

    if (!name || !registrationNumber || !city || !address) {
      res.status(400).json({
        error: 'Organisation name, registration number, city, and address are required.',
      });
      return;
    }

    const existingIdx = db.organisations.findIndex((o) => o.userId === user.id);
    if (existingIdx >= 0) {
      const updated: Organisation = {
        ...db.organisations[existingIdx],
        name: String(name).trim(),
        registrationNumber: String(registrationNumber).trim(),
        type: ['NGO', 'Orphanage', 'Shelter', 'Community Kitchen'].includes(type)
          ? type
          : db.organisations[existingIdx].type,
        city: String(city).trim(),
        address: String(address).trim(),
        contactPhone: String(contactPhone || user.phone).trim(),
        capacityNote: String(capacityNote || '').trim(),
        documentsSummary: String(documentsSummary || db.organisations[existingIdx].documentsSummary).trim(),
      };
      db.organisations[existingIdx] = updated;
      saveDb(db);
      res.json({ organisation: updated });
      return;
    }

    const created: Organisation = {
      id: `org-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      userId: user.id,
      name: String(name).trim(),
      registrationNumber: String(registrationNumber).trim(),
      type: ['NGO', 'Orphanage', 'Shelter', 'Community Kitchen'].includes(type) ? type : 'NGO',
      city: String(city).trim(),
      address: String(address).trim(),
      contactPhone: String(contactPhone || user.phone).trim(),
      capacityNote: String(capacityNote || '').trim(),
      documentsSummary: String(documentsSummary || 'Submitted for verification').trim(),
      verificationStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.organisations.push(created);
    saveDb(db);
    res.json({ organisation: created });
  });

  app.get('/api/ngo-needs', (req, res) => {
    const db = getDb();
    const { ngoId } = req.query;
    let needs = db.ngoNeeds.filter((n) => n.active);
    if (ngoId) {
      needs = needs.filter((n) => n.ngoId === String(ngoId));
    }
    res.json({ needs });
  });

  app.post('/api/ngo-needs', requireAuth, requireRole('ngo'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const org = db.organisations.find((o) => o.userId === req.auth!.userId);
    if (!org) {
      res.status(400).json({ error: 'Please complete your organisation profile first.' });
      return;
    }

    const { category, title, quantityNeeded, unit, urgency, notes } = req.body || {};
    if (!category || !title || !quantityNeeded || !unit) {
      res.status(400).json({ error: 'Category, title, quantity, and unit are required.' });
      return;
    }

    const need: NgoNeed = {
      id: `need-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      ngoId: req.auth!.userId,
      orgId: org.id,
      orgName: org.name,
      category: category as DonationCategory,
      title: String(title).trim(),
      quantityNeeded: Number(quantityNeeded) || 1,
      unit: String(unit).trim(),
      urgency: ['Normal', 'High', 'Urgent'].includes(urgency) ? urgency : 'Normal',
      city: org.city,
      notes: String(notes || '').trim(),
      active: true,
      createdAt: new Date().toISOString(),
    };

    db.ngoNeeds.unshift(need);
    logActivity(
      db,
      req.auth!.userId,
      org.name,
      'ngo',
      'Published new resource requirement',
      'need',
      need.title
    );
    saveDb(db);
    res.status(201).json({ need });
  });

  app.delete('/api/ngo-needs/:id', requireAuth, requireRole('ngo', 'admin'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const need = db.ngoNeeds.find((n) => n.id === req.params.id);
    if (!need) {
      res.status(404).json({ error: 'Requirement not found.' });
      return;
    }
    if (req.auth!.role !== 'admin' && need.ngoId !== req.auth!.userId) {
      res.status(403).json({ error: 'Cannot remove another organisation’s requirement.' });
      return;
    }
    db.ngoNeeds = db.ngoNeeds.filter((n) => n.id !== need.id);
    saveDb(db);
    res.json({ ok: true });
  });

  // Requests workflow
  app.get('/api/requests', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { role, userId } = req.auth!;
    let list = [...db.requests];
    if (role === 'donor') {
      list = list.filter((r) => r.donorId === userId);
    } else if (role === 'ngo') {
      list = list.filter((r) => r.ngoId === userId);
    } else if (role === 'volunteer') {
      list = [];
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ requests: list });
  });

  app.post('/api/requests', requireAuth, requireRole('ngo'), (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const org = db.organisations.find((o) => o.userId === req.auth!.userId);
    if (!org) {
      res.status(400).json({ error: 'Please register your organisation profile before requesting donations.' });
      return;
    }
    if (org.verificationStatus !== 'verified') {
      res.status(403).json({
        error:
          'Your organisation is pending administrator verification. Verified NGOs can request donations.',
      });
      return;
    }

    const { donationId, requestedQuantity, notes } = req.body || {};
    const donation = db.donations.find((d) => d.id === donationId);
    if (!donation) {
      res.status(404).json({ error: 'Donation listing not found.' });
      return;
    }
    if (donation.status !== 'Available') {
      res.status(400).json({ error: `Donation is currently ${donation.status} and cannot be requested.` });
      return;
    }

    const alreadyPending = db.requests.some(
      (r) => r.donationId === donation.id && r.ngoId === req.auth!.userId && r.status === 'Pending'
    );
    if (alreadyPending) {
      res.status(409).json({ error: 'Your organisation already has a pending request for this item.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const requestRecord: DonationRequest = {
      id: `req-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      donationId: donation.id,
      donationTitle: donation.title,
      donationCategory: donation.category,
      donorId: donation.donorId,
      donorName: donation.donorName,
      ngoId: req.auth!.userId,
      orgId: org.id,
      orgName: org.name,
      requestedQuantity:
        String(requestedQuantity || `${donation.quantityValue} ${donation.quantityUnit}`).trim(),
      notes: String(notes || '').trim(),
      status: 'Pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    donation.status = 'Requested';
    donation.updatedAt = nowIso;
    db.requests.unshift(requestRecord);
    logActivity(
      db,
      req.auth!.userId,
      org.name,
      'ngo',
      'Requested donation',
      'donation',
      donation.title
    );
    saveDb(db);

    res.status(201).json({ request: requestRecord, donation });
  });

  app.patch(
    '/api/requests/:id/respond',
    requireAuth,
    requireRole('donor', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const requestRecord = db.requests.find((r) => r.id === req.params.id);
      if (!requestRecord) {
        res.status(404).json({ error: 'Request not found.' });
        return;
      }
      if (req.auth!.role !== 'admin' && requestRecord.donorId !== req.auth!.userId) {
        res.status(403).json({ error: 'You can only respond to requests for your own donations.' });
        return;
      }
      if (requestRecord.status !== 'Pending') {
        res.status(400).json({ error: 'This request has already been processed.' });
        return;
      }

      const { decision, scheduledWindow } = req.body || {};
      if (decision !== 'approve' && decision !== 'reject') {
        res.status(400).json({ error: 'Decision must be "approve" or "reject".' });
        return;
      }

      const donation = db.donations.find((d) => d.id === requestRecord.donationId);
      const ngoOrg = db.organisations.find((o) => o.id === requestRecord.orgId);
      const nowIso = new Date().toISOString();

      if (decision === 'reject') {
        requestRecord.status = 'Rejected';
        requestRecord.updatedAt = nowIso;
        if (donation && donation.status === 'Requested') {
          const otherPending = db.requests.some(
            (r) => r.donationId === donation.id && r.id !== requestRecord.id && r.status === 'Pending'
          );
          if (!otherPending) {
            donation.status = 'Available';
            donation.updatedAt = nowIso;
          }
        }
        saveDb(db);
        res.json({ request: requestRecord, donation });
        return;
      }

      // Approve -> Scheduled + create Volunteer Task
      requestRecord.status = 'Approved';
      requestRecord.updatedAt = nowIso;

      // Reject any competing pending requests for the same donation
      for (const r of db.requests) {
        if (r.donationId === requestRecord.donationId && r.id !== requestRecord.id && r.status === 'Pending') {
          r.status = 'Rejected';
          r.updatedAt = nowIso;
        }
      }

      let createdTask: VolunteerTask | null = null;
      if (donation) {
        donation.status = 'Scheduled';
        donation.updatedAt = nowIso;

        createdTask = {
          id: `tsk-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
          donationId: donation.id,
          donationTitle: donation.title,
          donationCategory: donation.category,
          quantitySummary: `${donation.quantityValue} ${donation.quantityUnit}`,
          requestId: requestRecord.id,
          donorId: donation.donorId,
          donorName: donation.donorName,
          ngoId: requestRecord.ngoId,
          orgName: requestRecord.orgName,
          pickupAddress: `${donation.location}, ${donation.city}`,
          dropoffAddress: ngoOrg ? `${ngoOrg.address}, ${ngoOrg.city}` : requestRecord.orgName,
          city: donation.city,
          status: 'Open',
          scheduledWindow: String(scheduledWindow || 'Flexible within pickup window'),
          notes: requestRecord.notes || 'Handle with care; verify item count at pickup.',
          createdAt: nowIso,
        };
        db.volunteerTasks.unshift(createdTask);

        logActivity(
          db,
          req.auth!.userId,
          donation.donorName,
          req.auth!.role,
          'Approved request & scheduled pickup',
          'donation',
          donation.title
        );
      }

      saveDb(db);
      res.json({ request: requestRecord, donation, task: createdTask });
    }
  );

  // Volunteer tasks
  app.get('/api/volunteer/tasks', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { role, userId } = req.auth!;
    let tasks = [...db.volunteerTasks];
    if (role === 'donor') {
      tasks = tasks.filter((t) => t.donorId === userId);
    } else if (role === 'ngo') {
      tasks = tasks.filter((t) => t.ngoId === userId);
    }
    tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ tasks });
  });

  app.post(
    '/api/volunteer/tasks/:id/accept',
    requireAuth,
    requireRole('volunteer'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const task = db.volunteerTasks.find((t) => t.id === req.params.id);
      if (!task) {
        res.status(404).json({ error: 'Pickup task not found.' });
        return;
      }
      if (task.status !== 'Open') {
        res.status(400).json({ error: 'Task has already been claimed.' });
        return;
      }

      const volunteer = db.users.find((u) => u.id === req.auth!.userId);
      if (!volunteer) {
        res.status(401).json({ error: 'Volunteer user not found.' });
        return;
      }

      const nowIso = new Date().toISOString();
      task.status = 'Accepted';
      task.volunteerId = volunteer.id;
      task.volunteerName = volunteer.name;
      task.acceptedAt = nowIso;

      logActivity(
        db,
        volunteer.id,
        volunteer.name,
        'volunteer',
        'Accepted pickup task',
        'task',
        task.donationTitle
      );
      saveDb(db);
      res.json({ task });
    }
  );

  app.patch(
    '/api/volunteer/tasks/:id/status',
    requireAuth,
    requireRole('volunteer', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const task = db.volunteerTasks.find((t) => t.id === req.params.id);
      if (!task) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }
      if (req.auth!.role !== 'admin' && task.volunteerId !== req.auth!.userId) {
        res.status(403).json({ error: 'Only the assigned volunteer can update this task.' });
        return;
      }

      const { nextStatus } = req.body || {};
      const nowIso = new Date().toISOString();
      const donation = db.donations.find((d) => d.id === task.donationId);

      if (nextStatus === 'Picked Up') {
        if (task.status !== 'Accepted') {
          res.status(400).json({ error: 'Task must be Accepted before marking Picked Up.' });
          return;
        }
        task.status = 'Picked Up';
        task.pickedUpAt = nowIso;
        if (donation) {
          donation.status = 'Picked Up';
          donation.updatedAt = nowIso;
        }
        logActivity(
          db,
          req.auth!.userId,
          task.volunteerName || 'Volunteer',
          req.auth!.role,
          'Picked up donation from donor',
          'donation',
          task.donationTitle
        );
      } else if (nextStatus === 'Delivered') {
        if (task.status !== 'Picked Up') {
          res.status(400).json({ error: 'Task must be Picked Up before marking Delivered.' });
          return;
        }
        task.status = 'Delivered';
        task.deliveredAt = nowIso;
        // Note: Donation status moves to 'Delivered' and counts as Completed strictly upon NGO confirmation!
        logActivity(
          db,
          req.auth!.userId,
          task.volunteerName || 'Volunteer',
          req.auth!.role,
          'Dropped off donation at NGO (awaiting receiver confirmation)',
          'donation',
          task.donationTitle
        );
      } else {
        res.status(400).json({ error: 'Invalid status transition.' });
        return;
      }

      saveDb(db);
      res.json({ task, donation });
    }
  );

  // NGO confirms receipt -> marks Donation Delivered & creates DeliveryRecord
  app.post(
    '/api/donations/:id/confirm-receipt',
    requireAuth,
    requireRole('ngo', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const donation = db.donations.find((d) => d.id === req.params.id);
      if (!donation) {
        res.status(404).json({ error: 'Donation not found.' });
        return;
      }

      const approvedReq = db.requests.find(
        (r) =>
          r.donationId === donation.id &&
          (r.status === 'Approved' || r.status === 'Fulfilled') &&
          (req.auth!.role === 'admin' || r.ngoId === req.auth!.userId)
      );

      if (!approvedReq) {
        res.status(403).json({
          error: 'Only the approved receiving NGO or an administrator can confirm receipt.',
        });
        return;
      }

      if (db.deliveryRecords.some((r) => r.donationId === donation.id)) {
        res.status(409).json({ error: 'Delivery receipt has already been confirmed.' });
        return;
      }

      const { conditionRating, quantityConfirmed, receiverNotes } = req.body || {};
      const nowIso = new Date().toISOString();

      const task = db.volunteerTasks.find((t) => t.donationId === donation.id);
      if (task && task.status !== 'Delivered') {
        task.status = 'Delivered';
        task.deliveredAt = task.deliveredAt || nowIso;
      }

      donation.status = 'Delivered';
      donation.updatedAt = nowIso;
      approvedReq.status = 'Fulfilled';
      approvedReq.updatedAt = nowIso;

      const record = {
        id: `del-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        donationId: donation.id,
        donationTitle: donation.title,
        taskId: task?.id,
        requestId: approvedReq.id,
        ngoId: approvedReq.ngoId,
        orgName: approvedReq.orgName,
        volunteerId: task?.volunteerId,
        volunteerName: task?.volunteerName,
        confirmedByNgoAt: nowIso,
        conditionRating: ['Excellent', 'Good', 'Acceptable'].includes(conditionRating)
          ? conditionRating
          : 'Good',
        quantityConfirmed:
          String(quantityConfirmed || `${donation.quantityValue} ${donation.quantityUnit}`).trim(),
        receiverNotes: String(receiverNotes || 'Received and inspected by NGO team.').trim(),
      };

      db.deliveryRecords.unshift(record);
      logActivity(
        db,
        req.auth!.userId,
        approvedReq.orgName,
        req.auth!.role,
        'Confirmed delivery receipt',
        'donation',
        donation.title
      );
      saveDb(db);

      res.json({ deliveryRecord: record, donation });
    }
  );

  // Delivery records (scoped)
  app.get('/api/deliveries', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { role, userId } = req.auth!;
    let list = [...db.deliveryRecords];
    if (role === 'ngo') {
      list = list.filter((d) => d.ngoId === userId);
    } else if (role === 'volunteer') {
      list = list.filter((d) => d.volunteerId === userId);
    }
    res.json({ deliveries: list });
  });

  // Moderation reports
  app.post('/api/reports', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.auth!.userId);
    const { targetType, targetId, targetTitle, reason } = req.body || {};
    if (!targetType || !targetId || !reason) {
      res.status(400).json({ error: 'Target and reason are required.' });
      return;
    }
    const report = {
      id: `rep-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      targetType,
      targetId: String(targetId),
      targetTitle: String(targetTitle || targetId),
      reporterId: req.auth!.userId,
      reporterName: user?.name || req.auth!.email,
      reason: String(reason).trim(),
      status: 'Open' as const,
      createdAt: new Date().toISOString(),
    };
    db.moderationReports.unshift(report);
    saveDb(db);
    res.status(201).json({ report });
  });

  // Contact form
  app.post('/api/contact', (req, res) => {
    const raw = req.body || {};
    const name = String(raw.name ?? '').trim();
    const email = String(raw.email ?? '').trim();
    const subject = String(raw.subject ?? '').trim();
    const roleInterest = String(raw.roleInterest ?? '').trim();
    const message = String(raw.message ?? '').trim();

    if (!name || !email || !subject || !roleInterest || !message) {
      res.status(400).json({
        error: 'Name, email, topic, participant type, and message are required.',
      });
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    const db = getDb();
    const entry = {
      id: `msg-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      name,
      email,
      subject,
      roleInterest,
      message,
      createdAt: new Date().toISOString(),
    };
    db.contactMessages.unshift(entry);
    saveDb(db);
    res.status(201).json({ ok: true, id: entry.id });
  });

  // Admin Console Routes
  app.get('/api/admin/overview', requireAuth, requireRole('admin'), (_req, res) => {
    const db = getDb();
    res.json({
      users: db.users.map(sanitizeUser),
      organisations: db.organisations,
      reports: db.moderationReports,
      contactMessages: db.contactMessages,
      deliveryRecords: db.deliveryRecords,
    });
  });

  app.patch(
    '/api/admin/organisations/:id/verify',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const org = db.organisations.find((o) => o.id === req.params.id);
      if (!org) {
        res.status(404).json({ error: 'Organisation not found.' });
        return;
      }
      const { verificationStatus } = req.body || {};
      if (!['verified', 'rejected', 'pending'].includes(verificationStatus)) {
        res.status(400).json({ error: 'Invalid verification status.' });
        return;
      }
      org.verificationStatus = verificationStatus;
      org.verifiedBy = req.auth!.userId;
      org.verifiedAt = new Date().toISOString();

      logActivity(
        db,
        req.auth!.userId,
        'Administrator',
        'admin',
        `Set NGO verification to ${verificationStatus}`,
        'organisation',
        org.name
      );
      saveDb(db);
      res.json({ organisation: org });
    }
  );

  app.patch(
    '/api/admin/users/:id/status',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const target = db.users.find((u) => u.id === req.params.id);
      if (!target) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      if (target.id === req.auth!.userId) {
        res.status(400).json({ error: 'You cannot suspend your own active admin account.' });
        return;
      }
      const { status } = req.body || {};
      if (status !== 'active' && status !== 'suspended') {
        res.status(400).json({ error: 'Status must be active or suspended.' });
        return;
      }
      target.status = status;
      logActivity(
        db,
        req.auth!.userId,
        'Administrator',
        'admin',
        `Set user status to ${status}`,
        'user',
        target.name
      );
      saveDb(db);
      res.json({ user: sanitizeUser(target) });
    }
  );

  app.patch(
    '/api/admin/donations/:id/moderate',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const donation = db.donations.find((d) => d.id === req.params.id);
      if (!donation) {
        res.status(404).json({ error: 'Donation not found.' });
        return;
      }
      const { flaggedForModeration, requiresHumanReview } = req.body || {};
      if (typeof flaggedForModeration === 'boolean') {
        donation.flaggedForModeration = flaggedForModeration;
      }
      if (typeof requiresHumanReview === 'boolean') {
        donation.safetyEligibility.requiresHumanReview = requiresHumanReview;
      }
      donation.updatedAt = new Date().toISOString();
      logActivity(
        db,
        req.auth!.userId,
        'Administrator',
        'admin',
        'Updated donation moderation review',
        'donation',
        donation.title
      );
      saveDb(db);
      res.json({ donation });
    }
  );

  app.patch(
    '/api/admin/reports/:id',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const db = getDb();
      const report = db.moderationReports.find((r) => r.id === req.params.id);
      if (!report) {
        res.status(404).json({ error: 'Report not found.' });
        return;
      }
      const { status, adminNotes } = req.body || {};
      if (['Open', 'Reviewed', 'Resolved'].includes(status)) {
        report.status = status;
      }
      if (adminNotes !== undefined) {
        report.adminNotes = String(adminNotes);
      }
      saveDb(db);
      res.json({ report });
    }
  );

  app.post('/api/admin/reset-demo', requireAuth, requireRole('admin'), (_req, res) => {
    resetDbToSeed();
    res.json({ ok: true });
  });

  // Gemini AI endpoints (server-side only)
  app.post('/api/ai/generate-description', requireAuth, async (req, res) => {
    try {
      const { title, category, subCategory, quantityValue, quantityUnit, city, notes } =
        req.body || {};
      if (!title || !category) {
        res.status(400).json({ error: 'Item title and category are required.' });
        return;
      }
      const result = await generateDonationDescription({
        title: String(title),
        category: category as DonationCategory,
        subCategory,
        quantityValue: quantityValue ? Number(quantityValue) : undefined,
        quantityUnit,
        city,
        notes,
      });
      res.json(result);
    } catch (error) {
      const message = extractReadableAiError(error, 'AI description generation failed.');
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/ai/categorize-image', requireAuth, async (req, res) => {
    try {
      const { dataUrl } = req.body || {};
      if (!dataUrl || typeof dataUrl !== 'string') {
        res.status(400).json({ error: 'Image dataUrl is required for categorization.' });
        return;
      }
      const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
      if (!match) {
        res.status(400).json({ error: 'Provide a valid JPEG, PNG, or WEBP image.' });
        return;
      }
      const result = await categorizeDonationImage({
        mimeType: match[1],
        base64Data: match[2],
      });
      res.json(result);
    } catch (error) {
      const message = extractReadableAiError(error, 'AI image categorization failed.');
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/ai/extract-details', requireAuth, async (req, res) => {
    try {
      const { text } = req.body || {};
      if (!text || String(text).trim().length < 5) {
        res.status(400).json({ error: 'Enter at least a short sentence describing your donation.' });
        return;
      }
      const result = await extractDonationDetailsFromText(String(text));
      res.json(result);
    } catch (error) {
      const message = extractReadableAiError(error, 'AI detail extraction failed.');
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/ai/match-ngos', requireAuth, async (req, res) => {
    try {
      const { donation, organisations, needs } = req.body || {};
      if (!donation || !donation.category) {
        res.status(400).json({ error: 'Donation details are required for NGO matching.' });
        return;
      }
      const db = getDb();
      const orgList: Organisation[] =
        Array.isArray(organisations) && organisations.length > 0 ? organisations : db.organisations;
      const needList: NgoNeed[] = Array.isArray(needs) ? needs : db.ngoNeeds;

      const suggestions = await matchNgosForDonation({
        donation: {
          title: String(donation.title || 'Surplus Donation'),
          category: donation.category as DonationCategory,
          quantityValue: Number(donation.quantityValue) || 1,
          quantityUnit: String(donation.quantityUnit || 'units'),
          city: String(donation.city || 'Bengaluru'),
          description: String(donation.description || ''),
        },
        organisations: orgList,
        needs: needList,
      });
      res.json({ suggestions });
    } catch (error) {
      const message = extractReadableAiError(error, 'NGO matching failed.');
      res.status(500).json({ error: message });
    }
  });

  // Vite dev middleware or production static build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FOOD RESCUE AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
