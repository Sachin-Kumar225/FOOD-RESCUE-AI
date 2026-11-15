import { apiRequest } from './api.ts';
import { evaluateFoodSafetyEligibilityClient } from './safety.ts';
import { isSupabaseConfigured, supabase } from './supabase.ts';
import {
  DONATION_CATEGORIES,
  DONATION_STATUS_ORDER,
  type ActivityLog,
  type ContactMessage,
  type DeliveryRecord,
  type Donation,
  type DonationCategory,
  type DonationRequest,
  type FoodDetails,
  type FoodType,
  type ModerationReport,
  type NgoMatchSuggestion,
  type NgoNeed,
  type Organisation,
  type PlatformStats,
  type SiteSettings,
  type StorageCondition,
  type User,
  type UserRole,
  type VolunteerTask,
} from '../types.ts';

// ---------------------------------------------------------------------------
// Row Mappers (PostgreSQL snake_case <-> TypeScript camelCase)
// ---------------------------------------------------------------------------

export function mapProfileRow(row: Record<string, any>): User {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    email: String(row.email || ''),
    role: (row.role || 'donor') as UserRole,
    phone: String(row.phone || ''),
    city: String(row.city || 'Bengaluru'),
    address: String(row.address || ''),
    status: (row.status || 'active') as 'active' | 'suspended',
    isDemo: false,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export function mapOrgRow(row: Record<string, any>): Organisation {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name || ''),
    registrationNumber: String(row.registration_number || ''),
    type: (row.type || 'NGO') as Organisation['type'],
    city: String(row.city || ''),
    address: String(row.address || ''),
    contactPhone: String(row.contact_phone || ''),
    capacityNote: String(row.capacity_note || ''),
    documentsSummary: String(row.documents_summary || ''),
    verificationStatus: (row.verification_status || 'pending') as Organisation['verificationStatus'],
    verifiedBy: row.verified_by ? String(row.verified_by) : undefined,
    verifiedAt: row.verified_at ? String(row.verified_at) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export function mapDonationRow(row: Record<string, any>): Donation {
  return {
    id: String(row.id),
    donorId: String(row.donor_id),
    donorName: String(row.donor_name || ''),
    donorType: String(row.donor_type || 'Verified Donor'),
    title: String(row.title || ''),
    description: String(row.description || ''),
    category: row.category as DonationCategory,
    subCategory: String(row.sub_category || 'General'),
    quantityValue: Number(row.quantity_value || 0),
    quantityUnit: String(row.quantity_unit || 'units'),
    location: String(row.location || ''),
    city: String(row.city || ''),
    availableFrom: String(row.available_from || row.created_at),
    availableUntil: String(row.available_until),
    imageUrl: String(row.image_url || ''),
    status: row.status as Donation['status'],
    foodDetails: (row.food_details || undefined) as FoodDetails | undefined,
    safetyEligibility: row.safety_eligibility as Donation['safetyEligibility'],
    flaggedForModeration: Boolean(row.flagged_for_moderation),
    aiMetadata: row.ai_metadata || undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  };
}

export function mapNeedRow(row: Record<string, any>): NgoNeed {
  return {
    id: String(row.id),
    ngoId: String(row.ngo_id),
    orgId: String(row.org_id),
    orgName: String(row.org_name || ''),
    category: row.category as DonationCategory,
    title: String(row.title || ''),
    quantityNeeded: Number(row.quantity_needed || 0),
    unit: String(row.unit || 'units'),
    urgency: (row.urgency || 'Normal') as NgoNeed['urgency'],
    city: String(row.city || ''),
    notes: String(row.notes || ''),
    active: Boolean(row.active ?? true),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export function mapRequestRow(row: Record<string, any>): DonationRequest {
  return {
    id: String(row.id),
    donationId: String(row.donation_id),
    donationTitle: String(row.donation_title || ''),
    donationCategory: row.donation_category as DonationCategory,
    donorId: String(row.donor_id),
    donorName: String(row.donor_name || ''),
    ngoId: String(row.ngo_id),
    orgId: String(row.org_id),
    orgName: String(row.org_name || ''),
    requestedQuantity: String(row.requested_quantity || ''),
    notes: String(row.notes || ''),
    status: row.status as DonationRequest['status'],
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  };
}

export function mapTaskRow(row: Record<string, any>): VolunteerTask {
  return {
    id: String(row.id),
    donationId: String(row.donation_id),
    donationTitle: String(row.donation_title || ''),
    donationCategory: row.donation_category as DonationCategory,
    quantitySummary: String(row.quantity_summary || ''),
    requestId: String(row.request_id),
    donorId: String(row.donor_id),
    donorName: String(row.donor_name || ''),
    ngoId: String(row.ngo_id),
    orgName: String(row.org_name || ''),
    pickupAddress: String(row.pickup_address || ''),
    dropoffAddress: String(row.dropoff_address || ''),
    city: String(row.city || ''),
    volunteerId: row.volunteer_id ? String(row.volunteer_id) : undefined,
    volunteerName: row.volunteer_name ? String(row.volunteer_name) : undefined,
    status: row.status as VolunteerTask['status'],
    scheduledWindow: String(row.scheduled_window || ''),
    notes: String(row.notes || ''),
    acceptedAt: row.accepted_at ? String(row.accepted_at) : undefined,
    pickedUpAt: row.picked_up_at ? String(row.picked_up_at) : undefined,
    deliveredAt: row.delivered_at ? String(row.delivered_at) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export function mapDeliveryRow(row: Record<string, any>): DeliveryRecord {
  return {
    id: String(row.id),
    donationId: String(row.donation_id),
    donationTitle: String(row.donation_title || ''),
    taskId: row.task_id ? String(row.task_id) : undefined,
    requestId: String(row.request_id),
    ngoId: String(row.ngo_id),
    orgName: String(row.org_name || ''),
    volunteerId: row.volunteer_id ? String(row.volunteer_id) : undefined,
    volunteerName: row.volunteer_name ? String(row.volunteer_name) : undefined,
    confirmedByNgoAt: String(row.confirmed_by_ngo_at || new Date().toISOString()),
    conditionRating: (row.condition_rating || 'Good') as DeliveryRecord['conditionRating'],
    quantityConfirmed: String(row.quantity_confirmed || ''),
    receiverNotes: String(row.receiver_notes || ''),
  };
}

export function mapReportRow(row: Record<string, any>): ModerationReport {
  return {
    id: String(row.id),
    targetType: row.target_type as ModerationReport['targetType'],
    targetId: String(row.target_id),
    targetTitle: String(row.target_title || ''),
    reporterId: String(row.reporter_id),
    reporterName: String(row.reporter_name || ''),
    reason: String(row.reason || ''),
    status: (row.status || 'Open') as ModerationReport['status'],
    adminNotes: row.admin_notes ? String(row.admin_notes) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export function mapContactRow(row: Record<string, any>): ContactMessage {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    email: String(row.email || ''),
    subject: String(row.subject || ''),
    roleInterest: String(row.role_interest || ''),
    message: String(row.message || ''),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export function mapActivityRow(row: Record<string, any>): ActivityLog {
  return {
    id: String(row.id),
    actorId: String(row.actor_id || ''),
    actorName: String(row.actor_name || ''),
    actorRole: (row.actor_role || 'donor') as UserRole,
    action: String(row.action || ''),
    targetType: String(row.target_type || ''),
    targetTitle: String(row.target_title || ''),
    timestamp: String(row.timestamp || new Date().toISOString()),
  };
}

function defaultImageForCategory(category: DonationCategory): string {
  switch (category) {
    case 'Food':
      return '/src/assets/images/donation_prepared_meals_1794669342712.jpg';
    case 'Clothing & Warmth':
    case 'Education & Children':
    case 'Household & Daily Needs':
      return '/src/assets/images/donation_essentials_kit_1794669344223.jpg';
    default:
      return '/src/assets/images/donation_fresh_produce_1794669343269.jpg';
  }
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string; contentType: string } {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) {
    throw new Error('Unsupported image format. Please use JPEG, PNG, or WEBP.');
  }
  const contentType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return {
    blob: new Blob([bytes], { type: contentType }),
    ext,
    contentType,
  };
}

async function logSupabaseActivity(
  actorId: string,
  actorName: string,
  actorRole: UserRole,
  action: string,
  targetType: string,
  targetTitle: string
) {
  if (!supabase) return;
  await supabase.from('activity_logs').insert({
    actor_id: actorId,
    actor_name: actorName,
    actor_role: actorRole,
    action,
    target_type: targetType,
    target_title: targetTitle,
  });
}

// ---------------------------------------------------------------------------
// Storage Upload (Supabase Storage `donation-images` bucket or Express fallback)
// ---------------------------------------------------------------------------

export async function uploadImageAsset(dataUrl: string, filename = 'photo.jpg'): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const { data: userRes, error: authErr } = await supabase.auth.getUser();
    if (authErr || !userRes.user) {
      throw new Error('Please sign in before uploading images to Supabase Storage.');
    }
    const { blob, ext, contentType } = dataUrlToBlob(dataUrl);
    const safeBase = filename.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 32) || 'photo';
    const objectPath = `${userRes.user.id}/${Date.now()}-${safeBase}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('donation-images')
      .upload(objectPath, blob, { contentType, upsert: false });

    if (uploadErr) {
      throw new Error(`Supabase Storage upload failed: ${uploadErr.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('donation-images')
      .getPublicUrl(objectPath);

    return publicUrlData.publicUrl;
  }

  const uploaded = await apiRequest<{ url: string }>('/api/upload', {
    method: 'POST',
    body: JSON.stringify({ dataUrl, filename }),
  });
  return uploaded.url;
}

// ---------------------------------------------------------------------------
// Global Reads (Stats, Donations, Site Settings)
// ---------------------------------------------------------------------------

export async function fetchGlobalStats(): Promise<PlatformStats> {
  if (isSupabaseConfigured && supabase) {
    const [
      donationsRes,
      orgsRes,
      reqsRes,
      tasksRes,
      deliveriesRes,
      logsRes,
      healthRes,
    ] = await Promise.all([
      supabase.from('donations').select('id, category, status'),
      supabase.from('organisations').select('id, verification_status'),
      supabase.from('donation_requests').select('id, status'),
      supabase.from('volunteer_tasks').select('id, status, volunteer_id'),
      supabase.from('delivery_records').select('donation_id'),
      supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(12),
      apiRequest<{ geminiConfigured: boolean }>('/api/health').catch(() => ({
        geminiConfigured: false,
      })),
    ]);

    const queryError =
      donationsRes.error ||
      orgsRes.error ||
      reqsRes.error ||
      tasksRes.error ||
      deliveriesRes.error ||
      logsRes.error;
    if (queryError) {
      throw new Error(queryError.message);
    }

    const donations = donationsRes.data || [];
    const orgs = orgsRes.data || [];
    const reqs = reqsRes.data || [];
    const tasks = tasksRes.data || [];
    const deliveries = deliveriesRes.data || [];
    const logs = (logsRes.data || []).map(mapActivityRow);

    const confirmedIds = new Set(deliveries.map((d) => String(d.donation_id)));
    const completedDonations = donations.filter(
      (d) => d.status === 'Delivered' && confirmedIds.has(String(d.id))
    ).length;
    const availableDonations = donations.filter((d) => d.status === 'Available').length;
    const registeredNgos = orgs.filter((o) => o.verification_status === 'verified').length;
    const pendingRequests = reqs.filter((r) => r.status === 'Pending').length;
    const openTasks = tasks.filter(
      (t) => t.status === 'Open' || t.status === 'Accepted' || t.status === 'Picked Up'
    ).length;
    const activeVolunteers = new Set(
      tasks.map((t) => t.volunteer_id).filter(Boolean)
    ).size;

    const categoryBreakdown = DONATION_CATEGORIES.map((category) => ({
      category,
      count: donations.filter((d) => d.category === category).length,
    }));

    const statusPipeline = DONATION_STATUS_ORDER.map((status) => ({
      status,
      count: donations.filter((d) => d.status === status).length,
    }));

    return {
      totalDonations: donations.length,
      availableDonations,
      completedDonations,
      registeredNgos,
      totalOrganisations: orgs.length,
      pendingRequests,
      openTasks,
      activeVolunteers,
      categoryBreakdown,
      statusPipeline,
      recentActivities: logs,
      backendStatus: {
        databaseEngine: 'Supabase PostgreSQL + RLS + Storage',
        geminiConfigured: Boolean(healthRes.geminiConfigured),
        supabaseConfigured: true,
        demoAccountsEnabled: false,
      },
    };
  }

  return apiRequest<PlatformStats>('/api/stats');
}

export async function fetchAllDonations(): Promise<Donation[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapDonationRow);
  }

  const res = await apiRequest<{ donations: Donation[] }>('/api/donations');
  return res.donations;
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (!error && data) {
      return {
        heroImageUrl: String(data.hero_image_url),
        aboutImageUrl: String(data.about_image_url),
        updatedAt: String(data.updated_at),
      };
    }
    return {
      heroImageUrl: '/src/assets/images/hero_food_rescue_1794669342092.jpg',
      aboutImageUrl: '/src/assets/images/about_community_hub_1794669343508.jpg',
      updatedAt: new Date().toISOString(),
    };
  }

  const res = await apiRequest<{ siteSettings: SiteSettings }>('/api/site-settings');
  return res.siteSettings;
}

export async function updateSiteSettings(patch: {
  heroImageUrl?: string;
  aboutImageUrl?: string;
}): Promise<SiteSettings> {
  if (isSupabaseConfigured && supabase) {
    const updateBody: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.heroImageUrl) updateBody.hero_image_url = patch.heroImageUrl;
    if (patch.aboutImageUrl) updateBody.about_image_url = patch.aboutImageUrl;

    const { data, error } = await supabase
      .from('site_settings')
      .update(updateBody)
      .eq('id', 1)
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    const { data: userRes } = await supabase.auth.getUser();
    if (userRes.user) {
      await logSupabaseActivity(
        userRes.user.id,
        'Administrator',
        'admin',
        'Updated site editorial photo',
        'site',
        patch.heroImageUrl ? 'Landing Hero Banner' : 'About Mission Banner'
      );
    }

    return {
      heroImageUrl: String(data.hero_image_url),
      aboutImageUrl: String(data.about_image_url),
      updatedAt: String(data.updated_at),
    };
  }

  const res = await apiRequest<{ siteSettings: SiteSettings }>('/api/site-settings', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  return res.siteSettings;
}

// ---------------------------------------------------------------------------
// Donations CRUD & Photo Updates
// ---------------------------------------------------------------------------

export interface DonationWritePayload {
  title: string;
  description: string;
  category: DonationCategory;
  subCategory: string;
  quantityValue: number;
  quantityUnit: string;
  city: string;
  location: string;
  availableUntil?: string;
  imageUrl?: string;
  foodDetails?: FoodDetails;
}

export async function saveDonationListing(
  editingId: string | null,
  payload: DonationWritePayload,
  actor: User
): Promise<Donation> {
  if (actor.role !== 'donor' && actor.role !== 'admin') {
    throw new Error('Only Donor or Administrator accounts can publish or edit donation listings.');
  }

  if (isSupabaseConfigured && supabase) {
    const untilIso =
      payload.availableUntil || new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const safety = evaluateFoodSafetyEligibilityClient(
      payload.category,
      payload.foodDetails,
      untilIso
    );

    if (!safety.eligible) {
      throw new Error(
        safety.reasons.join(' ') || 'Donation did not pass deterministic safety eligibility.'
      );
    }

    const nowIso = new Date().toISOString();
    if (editingId) {
      const { data, error } = await supabase
        .from('donations')
        .update({
          title: payload.title,
          description: payload.description,
          category: payload.category,
          sub_category: payload.subCategory,
          quantity_value: payload.quantityValue,
          quantity_unit: payload.quantityUnit,
          city: payload.city,
          location: payload.location,
          available_until: untilIso,
          image_url: payload.imageUrl || defaultImageForCategory(payload.category),
          food_details: payload.category === 'Food' ? payload.foodDetails || null : null,
          safety_eligibility: safety,
          updated_at: nowIso,
        })
        .eq('id', editingId)
        .select('*')
        .single();
      if (error) throw new Error(error.message);

      await logSupabaseActivity(
        actor.id,
        actor.name,
        actor.role,
        'Updated donation listing',
        'donation',
        payload.title
      );
      return mapDonationRow(data);
    }

    const { data, error } = await supabase
      .from('donations')
      .insert({
        donor_id: actor.id,
        donor_name: actor.name,
        donor_type: actor.role === 'admin' ? 'Platform Admin' : 'Verified Donor',
        title: payload.title,
        description: payload.description,
        category: payload.category,
        sub_category: payload.subCategory,
        quantity_value: payload.quantityValue,
        quantity_unit: payload.quantityUnit,
        city: payload.city,
        location: payload.location,
        available_from: nowIso,
        available_until: untilIso,
        image_url: payload.imageUrl || defaultImageForCategory(payload.category),
        status: 'Available',
        food_details: payload.category === 'Food' ? payload.foodDetails || null : null,
        safety_eligibility: safety,
        flagged_for_moderation: false,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    await logSupabaseActivity(
      actor.id,
      actor.name,
      actor.role,
      'Created donation listing',
      'donation',
      payload.title
    );
    return mapDonationRow(data);
  }

  if (editingId) {
    const res = await apiRequest<{ donation: Donation }>(`/api/donations/${editingId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.donation;
  }

  const res = await apiRequest<{ donation: Donation }>('/api/donations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.donation;
}

export async function updateDonationPhoto(
  donationId: string,
  imageUrl: string,
  actor?: User | null
): Promise<Donation> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('donations')
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq('id', donationId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);

    if (actor) {
      await logSupabaseActivity(
        actor.id,
        actor.name,
        actor.role,
        'Updated listing photo',
        'donation',
        String(data.title || donationId)
      );
    }
    return mapDonationRow(data);
  }

  const res = await apiRequest<{ donation: Donation }>(`/api/donations/${donationId}/photo`, {
    method: 'PATCH',
    body: JSON.stringify({ imageUrl }),
  });
  return res.donation;
}

export async function deleteDonationListing(donationId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('donations')
      .delete()
      .eq('id', donationId)
      .select('id');
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      throw new Error(
        'Listing could not be deleted (not found, already in transit/delivered, or permission denied).'
      );
    }
    return;
  }

  await apiRequest(`/api/donations/${donationId}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Dashboard Role Workspace Reads & Workflows
// ---------------------------------------------------------------------------

export async function fetchRoleWorkspaceData(): Promise<{
  requests: DonationRequest[];
  needs: NgoNeed[];
  tasks: VolunteerTask[];
}> {
  if (isSupabaseConfigured && supabase) {
    const [reqRes, needsRes, tasksRes] = await Promise.all([
      supabase.from('donation_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('ngo_needs').select('*').order('created_at', { ascending: false }),
      supabase.from('volunteer_tasks').select('*').order('created_at', { ascending: false }),
    ]);

    const workspaceErr = reqRes.error || needsRes.error || tasksRes.error;
    if (workspaceErr) {
      throw new Error(workspaceErr.message);
    }

    return {
      requests: (reqRes.data || []).map(mapRequestRow),
      needs: (needsRes.data || []).map(mapNeedRow),
      tasks: (tasksRes.data || []).map(mapTaskRow),
    };
  }

  const [reqRes, needsRes, tasksRes] = await Promise.all([
    apiRequest<{ requests: DonationRequest[] }>('/api/requests'),
    apiRequest<{ needs: NgoNeed[] }>('/api/ngo-needs'),
    apiRequest<{ tasks: VolunteerTask[] }>('/api/volunteer/tasks'),
  ]);
  return {
    requests: reqRes.requests,
    needs: needsRes.needs,
    tasks: tasksRes.tasks,
  };
}

export async function saveMyOrganisation(
  existingOrg: Organisation | null,
  user: User,
  payload: {
    name: string;
    type: Organisation['type'];
    registrationNumber: string;
    city: string;
    address: string;
    contactPhone?: string;
    capacityNote: string;
    documentsSummary?: string;
  }
): Promise<Organisation> {
  if (user.role !== 'ngo') {
    throw new Error('Only NGO / Receiver accounts can manage an organisation verification profile.');
  }

  if (isSupabaseConfigured && supabase) {
    if (existingOrg) {
      const { data, error } = await supabase
        .from('organisations')
        .update({
          name: payload.name.trim(),
          type: payload.type,
          registration_number: payload.registrationNumber.trim(),
          city: payload.city.trim(),
          address: payload.address.trim(),
          contact_phone: (payload.contactPhone ?? existingOrg.contactPhone ?? user.phone).trim(),
          capacity_note: payload.capacityNote.trim(),
          documents_summary: (
            payload.documentsSummary ??
            existingOrg.documentsSummary ??
            'Submitted for administrator review'
          ).trim(),
        })
        .eq('id', existingOrg.id)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return mapOrgRow(data);
    }

    const { data, error } = await supabase
      .from('organisations')
      .insert({
        user_id: user.id,
        name: payload.name.trim(),
        type: payload.type,
        registration_number: payload.registrationNumber.trim(),
        city: payload.city.trim(),
        address: payload.address.trim(),
        contact_phone: (payload.contactPhone || user.phone).trim(),
        capacity_note: payload.capacityNote.trim(),
        documents_summary: (
          payload.documentsSummary || 'Submitted for administrator review'
        ).trim(),
        verification_status: 'pending',
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapOrgRow(data);
  }

  const res = await apiRequest<{ organisation: Organisation }>('/api/ngo/my-organisation', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.organisation;
}

export async function createNgoNeedItem(
  organisation: Organisation,
  user: User,
  payload: {
    category: DonationCategory;
    title: string;
    quantityNeeded: number;
    unit: string;
    urgency: 'Normal' | 'High' | 'Urgent';
    notes: string;
  }
): Promise<NgoNeed> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('ngo_needs')
      .insert({
        ngo_id: user.id,
        org_id: organisation.id,
        org_name: organisation.name,
        category: payload.category,
        title: payload.title,
        quantity_needed: payload.quantityNeeded,
        unit: payload.unit,
        urgency: payload.urgency,
        city: organisation.city,
        notes: payload.notes,
        active: true,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapNeedRow(data);
  }

  const res = await apiRequest<{ need: NgoNeed }>('/api/ngo-needs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.need;
}

export async function deleteNgoNeedItem(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('ngo_needs').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  await apiRequest(`/api/ngo-needs/${id}`, { method: 'DELETE' });
}

export async function requestDonationItem(
  donation: Donation,
  notes: string
): Promise<void> {
  const requestedQuantity = `${donation.quantityValue} ${donation.quantityUnit}`;

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.rpc('request_donation', {
      p_donation_id: donation.id,
      p_requested_quantity: requestedQuantity,
      p_notes: notes,
    });
    if (error) throw new Error(error.message);
    return;
  }

  await apiRequest('/api/requests', {
    method: 'POST',
    body: JSON.stringify({
      donationId: donation.id,
      requestedQuantity,
      notes,
    }),
  });
}

export async function respondToDonationRequest(
  requestId: string,
  decision: 'approve' | 'reject',
  scheduledWindow = 'Same-day pickup window'
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.rpc('respond_to_donation_request', {
      p_request_id: requestId,
      p_decision: decision,
      p_scheduled_window: scheduledWindow,
    });
    if (error) throw new Error(error.message);
    return;
  }

  await apiRequest(`/api/requests/${requestId}/respond`, {
    method: 'PATCH',
    body: JSON.stringify({ decision, scheduledWindow }),
  });
}

export async function acceptVolunteerTaskItem(taskId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.rpc('accept_volunteer_task', {
      p_task_id: taskId,
    });
    if (error) throw new Error(error.message);
    return;
  }

  await apiRequest(`/api/volunteer/tasks/${taskId}/accept`, { method: 'POST' });
}

export async function updateVolunteerTaskItemStatus(
  taskId: string,
  nextStatus: 'Picked Up' | 'Delivered'
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.rpc('update_volunteer_task_status', {
      p_task_id: taskId,
      p_next_status: nextStatus,
    });
    if (error) throw new Error(error.message);
    return;
  }

  await apiRequest(`/api/volunteer/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ nextStatus }),
  });
}

export async function confirmDonationReceipt(
  donationId: string,
  payload: {
    conditionRating: 'Excellent' | 'Good' | 'Acceptable';
    quantityConfirmed: string;
    receiverNotes: string;
  }
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.rpc('confirm_delivery_receipt', {
      p_donation_id: donationId,
      p_condition_rating: payload.conditionRating,
      p_quantity_confirmed: payload.quantityConfirmed,
      p_receiver_notes: payload.receiverNotes,
    });
    if (error) throw new Error(error.message);
    return;
  }

  await apiRequest(`/api/donations/${donationId}/confirm-receipt`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Reports & Contact
// ---------------------------------------------------------------------------

export async function submitModerationReport(
  payload: {
    targetType: 'donation' | 'user' | 'organisation';
    targetId: string;
    targetTitle: string;
    reason: string;
  },
  reporter: User
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('moderation_reports').insert({
      target_type: payload.targetType,
      target_id: payload.targetId,
      target_title: payload.targetTitle,
      reporter_id: reporter.id,
      reporter_name: reporter.name,
      reason: payload.reason,
      status: 'Open',
    });
    if (error) throw new Error(error.message);
    return;
  }

  await apiRequest('/api/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitContactInquiry(payload: {
  name: string;
  email: string;
  subject: string;
  roleInterest: string;
  message: string;
}): Promise<void> {
  const name = String(payload.name ?? '').trim();
  const email = String(payload.email ?? '').trim();
  const subject = String(payload.subject ?? '').trim();
  const roleInterest = String(payload.roleInterest ?? '').trim();
  const message = String(payload.message ?? '').trim();

  if (!name || !email || !subject || !roleInterest || !message) {
    throw new Error('Name, email, topic, participant type, and message are all required.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please provide a valid email address.');
  }

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('contact_messages').insert({
      name,
      email,
      subject,
      role_interest: roleInterest,
      message,
    });
    if (error) throw new Error(error.message);
    return;
  }

  await apiRequest('/api/contact', {
    method: 'POST',
    body: JSON.stringify({ name, email, subject, roleInterest, message }),
  });
}

// ---------------------------------------------------------------------------
// Admin Console
// ---------------------------------------------------------------------------

export interface AdminOverviewData {
  users: User[];
  organisations: Organisation[];
  reports: ModerationReport[];
  contactMessages: ContactMessage[];
  deliveryRecords: DeliveryRecord[];
}

export async function fetchAdminOverviewData(): Promise<AdminOverviewData> {
  if (isSupabaseConfigured && supabase) {
    const [usersRes, orgsRes, reportsRes, msgsRes, deliveriesRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('organisations').select('*').order('created_at', { ascending: false }),
      supabase.from('moderation_reports').select('*').order('created_at', { ascending: false }),
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
      supabase.from('delivery_records').select('*').order('confirmed_by_ngo_at', { ascending: false }),
    ]);

    const firstError =
      usersRes.error ||
      orgsRes.error ||
      reportsRes.error ||
      msgsRes.error ||
      deliveriesRes.error;
    if (firstError) throw new Error(firstError.message);

    return {
      users: (usersRes.data || []).map(mapProfileRow),
      organisations: (orgsRes.data || []).map(mapOrgRow),
      reports: (reportsRes.data || []).map(mapReportRow),
      contactMessages: (msgsRes.data || []).map(mapContactRow),
      deliveryRecords: (deliveriesRes.data || []).map(mapDeliveryRow),
    };
  }

  return apiRequest<AdminOverviewData>('/api/admin/overview');
}

export async function verifyOrganisationAdmin(
  orgId: string,
  verificationStatus: 'verified' | 'rejected' | 'pending',
  adminId: string
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('organisations')
      .update({
        verification_status: verificationStatus,
        verified_by: verificationStatus === 'pending' ? null : adminId,
        verified_at: verificationStatus === 'pending' ? null : new Date().toISOString(),
      })
      .eq('id', orgId)
      .select('name')
      .single();
    if (error) throw new Error(error.message);

    await logSupabaseActivity(
      adminId,
      'Administrator',
      'admin',
      `Set NGO verification to ${verificationStatus}`,
      'organisation',
      String(data?.name || orgId)
    );
    return;
  }

  await apiRequest(`/api/admin/organisations/${orgId}/verify`, {
    method: 'PATCH',
    body: JSON.stringify({ verificationStatus }),
  });
}

export async function toggleUserStatusAdmin(
  userId: string,
  nextStatus: 'active' | 'suspended',
  adminId: string
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status: nextStatus })
      .eq('id', userId)
      .select('name')
      .single();
    if (error) throw new Error(error.message);

    await logSupabaseActivity(
      adminId,
      'Administrator',
      'admin',
      `Set user status to ${nextStatus}`,
      'user',
      String(data?.name || userId)
    );
    return;
  }

  await apiRequest(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: nextStatus }),
  });
}

export async function moderateDonationAdmin(
  donationId: string,
  patch: { flaggedForModeration?: boolean; requiresHumanReview?: boolean },
  adminId: string
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const updateBody: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof patch.flaggedForModeration === 'boolean') {
      updateBody.flagged_for_moderation = patch.flaggedForModeration;
    }
    if (typeof patch.requiresHumanReview === 'boolean') {
      const { data: existingRow, error: fetchErr } = await supabase
        .from('donations')
        .select('safety_eligibility')
        .eq('id', donationId)
        .single();
      if (fetchErr) throw new Error(fetchErr.message);
      updateBody.safety_eligibility = {
        ...(existingRow?.safety_eligibility || {}),
        requiresHumanReview: patch.requiresHumanReview,
      };
    }

    const { data, error } = await supabase
      .from('donations')
      .update(updateBody)
      .eq('id', donationId)
      .select('title')
      .single();
    if (error) throw new Error(error.message);

    await logSupabaseActivity(
      adminId,
      'Administrator',
      'admin',
      'Updated donation moderation review',
      'donation',
      String(data?.title || donationId)
    );
    return;
  }

  await apiRequest(`/api/admin/donations/${donationId}/moderate`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function resolveReportAdmin(
  reportId: string,
  options?: { status?: 'Reviewed' | 'Resolved'; adminNotes?: string; adminId?: string }
): Promise<void> {
  const nextStatus = options?.status || 'Resolved';
  const adminNotes =
    options?.adminNotes !== undefined && options.adminNotes.trim()
      ? options.adminNotes.trim()
      : nextStatus === 'Reviewed'
        ? 'Under review by admin desk.'
        : 'Resolved by admin desk.';

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('moderation_reports')
      .update({ status: nextStatus, admin_notes: adminNotes })
      .eq('id', reportId)
      .select('target_title')
      .single();
    if (error) throw new Error(error.message);

    if (options?.adminId) {
      await logSupabaseActivity(
        options.adminId,
        'Administrator',
        'admin',
        `Marked moderation report as ${nextStatus}`,
        'report',
        String(data?.target_title || reportId)
      );
    }
    return;
  }

  await apiRequest(`/api/admin/reports/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: nextStatus, adminNotes }),
  });
}

export async function resetDemoDataAdmin(): Promise<void> {
  await apiRequest('/api/admin/reset-demo', { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Server-Side Gemini AI Proxies
// ---------------------------------------------------------------------------

export async function aiCategorizeDonationPhoto(dataUrl: string) {
  return apiRequest<{
    category: DonationCategory;
    subCategory: string;
    suggestedTitle: string;
    suggestedUnit: string;
    confidenceNote: string;
  }>('/api/ai/categorize-image', {
    method: 'POST',
    body: JSON.stringify({ dataUrl }),
  });
}

export async function aiExtractDonationDetails(text: string) {
  return apiRequest<{
    title: string;
    category: DonationCategory;
    subCategory: string;
    quantityValue: number;
    quantityUnit: string;
    city: string;
    location: string;
    foodType?: FoodType;
    storageCondition?: StorageCondition;
    allergens?: string;
    packagingSealed?: boolean;
    extractionNotes: string;
  }>('/api/ai/extract-details', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function aiGenerateDonationDescription(payload: {
  title: string;
  category: DonationCategory;
  subCategory?: string;
  quantityValue?: number;
  quantityUnit?: string;
  city?: string;
  notes?: string;
}) {
  return apiRequest<{ description: string; aiPowered: boolean }>('/api/ai/generate-description', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchAiNgoMatches(donation: Donation): Promise<NgoMatchSuggestion[]> {
  let organisations: Organisation[] | undefined;
  let needs: NgoNeed[] | undefined;

  if (isSupabaseConfigured && supabase) {
    const [orgsRes, needsRes] = await Promise.all([
      supabase.from('organisations').select('*').eq('verification_status', 'verified'),
      supabase.from('ngo_needs').select('*').eq('active', true),
    ]);
    if (orgsRes.error) throw new Error(orgsRes.error.message);
    if (needsRes.error) throw new Error(needsRes.error.message);
    organisations = (orgsRes.data || []).map(mapOrgRow);
    needs = (needsRes.data || []).map(mapNeedRow);
  }

  const res = await apiRequest<{ suggestions: NgoMatchSuggestion[] }>('/api/ai/match-ngos', {
    method: 'POST',
    body: JSON.stringify({ donation, organisations, needs }),
  });
  return res.suggestions;
}
