import fs from 'node:fs';
import path from 'node:path';
import type {
  ActivityLog,
  ContactMessage,
  DeliveryRecord,
  Donation,
  DonationRequest,
  ModerationReport,
  NgoNeed,
  Organisation,
  User,
  VolunteerTask,
} from '../src/types.ts';
import { hashPassword } from './auth.ts';
import { evaluateFoodSafetyEligibility } from './safety.ts';

export interface StoredUser extends User {
  passwordHash: string;
}

export interface DatabaseSchema {
  users: StoredUser[];
  organisations: Organisation[];
  donations: Donation[];
  ngoNeeds: NgoNeed[];
  requests: DonationRequest[];
  volunteerTasks: VolunteerTask[];
  deliveryRecords: DeliveryRecord[];
  moderationReports: ModerationReport[];
  contactMessages: ContactMessage[];
  activityLogs: ActivityLog[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'food_rescue_db.json');

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function createSeedData(): DatabaseSchema {
  const demoPasswordHash = hashPassword('DemoPass@2026');

  const users: StoredUser[] = [
    {
      id: 'usr-donor-1',
      name: 'Greenleaf Bistro & Catering',
      email: 'donor@foodrescue.demo',
      passwordHash: demoPasswordHash,
      role: 'donor',
      phone: '+1-555-0142',
      city: 'Bengaluru',
      address: '42 Indiranagar 100ft Road, Bengaluru',
      status: 'active',
      isDemo: true,
      createdAt: hoursAgo(240),
    },
    {
      id: 'usr-donor-2',
      name: 'Harvest Market Cooperative',
      email: 'harvest@foodrescue.demo',
      passwordHash: demoPasswordHash,
      role: 'donor',
      phone: '+1-555-0168',
      city: 'Bengaluru',
      address: '18 Koramangala 4th Block, Bengaluru',
      status: 'active',
      isDemo: true,
      createdAt: hoursAgo(180),
    },
    {
      id: 'usr-ngo-1',
      name: 'Hope Haven Shelter Coordinator',
      email: 'ngo@foodrescue.demo',
      passwordHash: demoPasswordHash,
      role: 'ngo',
      phone: '+1-555-0194',
      city: 'Bengaluru',
      address: '77 Ulsoor Lake Road, Bengaluru',
      status: 'active',
      isDemo: true,
      createdAt: hoursAgo(320),
    },
    {
      id: 'usr-ngo-2',
      name: 'Little Steps Children Home',
      email: 'littlesteps@foodrescue.demo',
      passwordHash: demoPasswordHash,
      role: 'ngo',
      phone: '+1-555-0121',
      city: 'Bengaluru',
      address: '15 Jayanagar 3rd Block, Bengaluru',
      status: 'active',
      isDemo: true,
      createdAt: hoursAgo(280),
    },
    {
      id: 'usr-ngo-3',
      name: 'Sunrise Community Pantry',
      email: 'sunrise@foodrescue.demo',
      passwordHash: demoPasswordHash,
      role: 'ngo',
      phone: '+1-555-0177',
      city: 'Mysuru',
      address: '9 Gokulam Main Road, Mysuru',
      status: 'active',
      isDemo: true,
      createdAt: hoursAgo(72),
    },
    {
      id: 'usr-vol-1',
      name: 'Aarav Nair',
      email: 'volunteer@foodrescue.demo',
      passwordHash: demoPasswordHash,
      role: 'volunteer',
      phone: '+1-555-0183',
      city: 'Bengaluru',
      address: 'Domlur Layout, Bengaluru',
      status: 'active',
      isDemo: true,
      createdAt: hoursAgo(200),
    },
    {
      id: 'usr-admin-1',
      name: 'Maya Deshmukh',
      email: 'admin@foodrescue.demo',
      passwordHash: demoPasswordHash,
      role: 'admin',
      phone: '+1-555-0100',
      city: 'Bengaluru',
      address: 'Civic Operations Desk, Bengaluru',
      status: 'active',
      isDemo: true,
      createdAt: hoursAgo(400),
    },
  ];

  const organisations: Organisation[] = [
    {
      id: 'org-1',
      userId: 'usr-ngo-1',
      name: 'Hope Haven Shelter & Kitchen',
      registrationNumber: 'NGO-BLR-2021-409',
      type: 'Shelter',
      city: 'Bengaluru',
      address: '77 Ulsoor Lake Road, Bengaluru',
      contactPhone: '+1-555-0194',
      capacityNote: 'Serves 140 evening meals daily and houses 65 overnight residents.',
      documentsSummary: '80G Charitable Trust Certificate & Municipal Kitchen Permit',
      verificationStatus: 'verified',
      verifiedBy: 'usr-admin-1',
      verifiedAt: hoursAgo(300),
      createdAt: hoursAgo(320),
    },
    {
      id: 'org-2',
      userId: 'usr-ngo-2',
      name: 'Little Steps Children Home',
      registrationNumber: 'NGO-BLR-2019-118',
      type: 'Orphanage',
      city: 'Bengaluru',
      address: '15 Jayanagar 3rd Block, Bengaluru',
      contactPhone: '+1-555-0121',
      capacityNote: 'Supports 48 school-age children with daily nutrition, books, and clothing.',
      documentsSummary: 'Child Welfare Registration & Annual Audit Filing',
      verificationStatus: 'verified',
      verifiedBy: 'usr-admin-1',
      verifiedAt: hoursAgo(260),
      createdAt: hoursAgo(280),
    },
    {
      id: 'org-3',
      userId: 'usr-ngo-3',
      name: 'Sunrise Community Pantry',
      registrationNumber: 'NGO-MYS-2024-082',
      type: 'Community Kitchen',
      city: 'Mysuru',
      address: '9 Gokulam Main Road, Mysuru',
      contactPhone: '+1-555-0177',
      capacityNote: 'Weekend dry-ration and blanket outreach for 90 families.',
      documentsSummary: 'Society Registration Certificate (Pending Admin Review)',
      verificationStatus: 'pending',
      createdAt: hoursAgo(72),
    },
  ];

  const food1Details = {
    foodType: 'prepared_meals' as const,
    preparedAt: hoursAgo(1.5),
    expiresAt: hoursFromNow(5),
    storageCondition: 'Refrigerated' as const,
    allergens: 'Sesame, Soy',
    dietaryTags: ['Vegetarian', 'Freshly Prepared'],
    packagingSealed: true,
  };

  const food2Details = {
    foodType: 'fruits_vegetables' as const,
    expiresAt: hoursFromNow(48),
    storageCondition: 'Ambient' as const,
    allergens: 'None',
    dietaryTags: ['Vegan', 'Organic'],
    packagingSealed: true,
  };

  const food3Details = {
    foodType: 'packaged_food' as const,
    expiresAt: hoursFromNow(168),
    storageCondition: 'Ambient' as const,
    allergens: 'Wheat',
    dietaryTags: ['Vegetarian'],
    packagingSealed: true,
  };

  const donations: Donation[] = [
    {
      id: 'don-1',
      donorId: 'usr-donor-1',
      donorName: 'Greenleaf Bistro & Catering',
      donorType: 'Restaurant / Catering',
      title: '45 Sealed Vegetarian Quinoa & Roasted Veg Bowls',
      description:
        'Surplus corporate lunch trays prepared this morning in a commercial kitchen. Individually portioned in tamper-evident compostable bowls with artisan sourdough loaves.',
      category: 'Food',
      subCategory: 'Prepared Meals',
      quantityValue: 45,
      quantityUnit: 'meal bowls',
      location: '42 Indiranagar 100ft Road',
      city: 'Bengaluru',
      availableFrom: hoursAgo(1),
      availableUntil: hoursFromNow(4),
      imageUrl: '/src/assets/images/donation_prepared_meals_1794669342712.jpg',
      status: 'Available',
      foodDetails: food1Details,
      safetyEligibility: evaluateFoodSafetyEligibility('Food', food1Details, hoursFromNow(4)),
      createdAt: hoursAgo(1),
      updatedAt: hoursAgo(1),
    },
    {
      id: 'don-2',
      donorId: 'usr-donor-2',
      donorName: 'Harvest Market Cooperative',
      donorType: 'Grocery & Produce',
      title: '60 kg Fresh Apples, Kale, Carrots & Tomatoes',
      description:
        'Grade-A surplus farm harvest crates from morning market stock. Crisp apples, leafy kale, carrots, and vine tomatoes ready for shelter kitchens.',
      category: 'Food',
      subCategory: 'Fruits & Vegetables',
      quantityValue: 60,
      quantityUnit: 'kg',
      location: '18 Koramangala 4th Block',
      city: 'Bengaluru',
      availableFrom: hoursAgo(3),
      availableUntil: hoursFromNow(20),
      imageUrl: '/src/assets/images/donation_fresh_produce_1794669343269.jpg',
      status: 'Scheduled',
      foodDetails: food2Details,
      safetyEligibility: evaluateFoodSafetyEligibility('Food', food2Details, hoursFromNow(20)),
      createdAt: hoursAgo(4),
      updatedAt: hoursAgo(1.5),
    },
    {
      id: 'don-3',
      donorId: 'usr-donor-1',
      donorName: 'Greenleaf Bistro & Catering',
      donorType: 'Community Drive',
      title: '30 Wool Blankets, Storybooks & School Stationery Kits',
      description:
        'Clean, folded wool blankets paired with children’s illustrated storybooks, ruled notebooks, and colored pencil packs from our neighborhood collection drive.',
      category: 'Clothing & Warmth',
      subCategory: 'Blankets & Bedding',
      quantityValue: 30,
      quantityUnit: 'kits',
      location: '42 Indiranagar 100ft Road',
      city: 'Bengaluru',
      availableFrom: hoursAgo(6),
      availableUntil: hoursFromNow(72),
      imageUrl: '/src/assets/images/donation_essentials_kit_1794669344223.jpg',
      status: 'Available',
      safetyEligibility: evaluateFoodSafetyEligibility('Clothing & Warmth'),
      createdAt: hoursAgo(6),
      updatedAt: hoursAgo(6),
    },
    {
      id: 'don-4',
      donorId: 'usr-donor-2',
      donorName: 'Harvest Market Cooperative',
      donorType: 'Grocery & Produce',
      title: '80 Packs Whole-Grain Pasta & Lentil Dry Rations',
      description:
        'Factory-sealed pantry staples with 6+ months shelf life remaining. Ideal for community pantries and weekly family meal kits.',
      category: 'Food',
      subCategory: 'Packaged Food',
      quantityValue: 80,
      quantityUnit: 'packs',
      location: '18 Koramangala 4th Block',
      city: 'Bengaluru',
      availableFrom: hoursAgo(48),
      availableUntil: hoursFromNow(48),
      imageUrl: '/src/assets/images/about_community_hub_1794669343508.jpg',
      status: 'Delivered',
      foodDetails: food3Details,
      safetyEligibility: evaluateFoodSafetyEligibility('Food', food3Details, hoursFromNow(48)),
      createdAt: hoursAgo(48),
      updatedAt: hoursAgo(20),
    },
    {
      id: 'don-5',
      donorId: 'usr-donor-1',
      donorName: 'Greenleaf Bistro & Catering',
      donorType: 'Corporate Partner',
      title: '25 Children Storybooks & Geometry Notebook Sets',
      description:
        'Unused hardcover children’s books, ruled composition notebooks, and classroom stationery sets boxed and ready for school-age shelters.',
      category: 'Education & Children',
      subCategory: 'Books',
      quantityValue: 25,
      quantityUnit: 'sets',
      location: '42 Indiranagar 100ft Road',
      city: 'Bengaluru',
      availableFrom: hoursAgo(2),
      availableUntil: hoursFromNow(96),
      imageUrl: '/src/assets/images/donation_essentials_kit_1794669344223.jpg',
      status: 'Available',
      safetyEligibility: evaluateFoodSafetyEligibility('Education & Children'),
      createdAt: hoursAgo(2),
      updatedAt: hoursAgo(2),
    },
    {
      id: 'don-6',
      donorId: 'usr-donor-2',
      donorName: 'Harvest Market Cooperative',
      donorType: 'Partner Warehouse',
      title: '20 Stainless Steel Serving Trays & Hygiene Packs',
      description:
        'Unused kitchen serving utensils and sealed personal hygiene packs (soap, toothbrushes, towels) for shelter intake desks.',
      category: 'Household & Daily Needs',
      subCategory: 'Hygiene Essentials',
      quantityValue: 20,
      quantityUnit: 'packs',
      location: '18 Koramangala 4th Block',
      city: 'Bengaluru',
      availableFrom: hoursAgo(5),
      availableUntil: hoursFromNow(96),
      imageUrl: '/src/assets/images/about_community_hub_1794669343508.jpg',
      status: 'Requested',
      safetyEligibility: evaluateFoodSafetyEligibility('Household & Daily Needs'),
      createdAt: hoursAgo(5),
      updatedAt: hoursAgo(1),
    },
  ];

  const ngoNeeds: NgoNeed[] = [
    {
      id: 'need-1',
      ngoId: 'usr-ngo-1',
      orgId: 'org-1',
      orgName: 'Hope Haven Shelter & Kitchen',
      category: 'Food',
      title: 'Evening Prepared Vegetarian Meals or Fresh Produce',
      quantityNeeded: 50,
      unit: 'meals / kg',
      urgency: 'Urgent',
      city: 'Bengaluru',
      notes: 'Used for 7:00 PM community shelter dinner service.',
      active: true,
      createdAt: hoursAgo(18),
    },
    {
      id: 'need-2',
      ngoId: 'usr-ngo-2',
      orgId: 'org-2',
      orgName: 'Little Steps Children Home',
      category: 'Education & Children',
      title: 'Primary School Notebooks, Stationery & Storybooks',
      quantityNeeded: 30,
      unit: 'sets',
      urgency: 'High',
      city: 'Bengaluru',
      notes: 'Needed for incoming term homework clubs (ages 6–13).',
      active: true,
      createdAt: hoursAgo(30),
    },
    {
      id: 'need-3',
      ngoId: 'usr-ngo-1',
      orgId: 'org-1',
      orgName: 'Hope Haven Shelter & Kitchen',
      category: 'Clothing & Warmth',
      title: 'Clean Wool Blankets for Night Shelter Beds',
      quantityNeeded: 25,
      unit: 'blankets',
      urgency: 'High',
      city: 'Bengaluru',
      notes: 'Cooler evening temperatures require extra bedding.',
      active: true,
      createdAt: hoursAgo(40),
    },
    {
      id: 'need-4',
      ngoId: 'usr-ngo-2',
      orgId: 'org-2',
      orgName: 'Little Steps Children Home',
      category: 'Household & Daily Needs',
      title: 'Hygiene Essentials & Stainless Kitchen Utensils',
      quantityNeeded: 20,
      unit: 'packs',
      urgency: 'Normal',
      city: 'Bengaluru',
      notes: 'Daily dormitory care supplies.',
      active: true,
      createdAt: hoursAgo(50),
    },
  ];

  const requests: DonationRequest[] = [
    {
      id: 'req-1',
      donationId: 'don-2',
      donationTitle: '60 kg Fresh Apples, Kale, Carrots & Tomatoes',
      donationCategory: 'Food',
      donorId: 'usr-donor-2',
      donorName: 'Harvest Market Cooperative',
      ngoId: 'usr-ngo-1',
      orgId: 'org-1',
      orgName: 'Hope Haven Shelter & Kitchen',
      requestedQuantity: '60 kg',
      notes: 'Can receive before 5:00 PM for tonight’s dinner prep.',
      status: 'Approved',
      createdAt: hoursAgo(3),
      updatedAt: hoursAgo(2),
    },
    {
      id: 'req-2',
      donationId: 'don-6',
      donationTitle: '20 Stainless Steel Serving Trays & Hygiene Packs',
      donationCategory: 'Household & Daily Needs',
      donorId: 'usr-donor-2',
      donorName: 'Harvest Market Cooperative',
      ngoId: 'usr-ngo-2',
      orgId: 'org-2',
      orgName: 'Little Steps Children Home',
      requestedQuantity: '20 packs',
      notes: 'Fits our dormitory hygiene restock list.',
      status: 'Pending',
      createdAt: hoursAgo(1),
      updatedAt: hoursAgo(1),
    },
    {
      id: 'req-3',
      donationId: 'don-4',
      donationTitle: '80 Packs Whole-Grain Pasta & Lentil Dry Rations',
      donationCategory: 'Food',
      donorId: 'usr-donor-2',
      donorName: 'Harvest Market Cooperative',
      ngoId: 'usr-ngo-1',
      orgId: 'org-1',
      orgName: 'Hope Haven Shelter & Kitchen',
      requestedQuantity: '80 packs',
      notes: 'Weekly shelter pantry restock.',
      status: 'Fulfilled',
      createdAt: hoursAgo(44),
      updatedAt: hoursAgo(20),
    },
  ];

  const volunteerTasks: VolunteerTask[] = [
    {
      id: 'tsk-1',
      donationId: 'don-2',
      donationTitle: '60 kg Fresh Apples, Kale, Carrots & Tomatoes',
      donationCategory: 'Food',
      quantitySummary: '60 kg',
      requestId: 'req-1',
      donorId: 'usr-donor-2',
      donorName: 'Harvest Market Cooperative',
      ngoId: 'usr-ngo-1',
      orgName: 'Hope Haven Shelter & Kitchen',
      pickupAddress: '18 Koramangala 4th Block, Bengaluru',
      dropoffAddress: '77 Ulsoor Lake Road, Bengaluru',
      city: 'Bengaluru',
      status: 'Open',
      scheduledWindow: 'Today 2:00 PM – 5:00 PM',
      notes: '4 wooden crates; hatchback or van preferred.',
      createdAt: hoursAgo(2),
    },
    {
      id: 'tsk-2',
      donationId: 'don-4',
      donationTitle: '80 Packs Whole-Grain Pasta & Lentil Dry Rations',
      donationCategory: 'Food',
      quantitySummary: '80 packs',
      requestId: 'req-3',
      donorId: 'usr-donor-2',
      donorName: 'Harvest Market Cooperative',
      ngoId: 'usr-ngo-1',
      orgName: 'Hope Haven Shelter & Kitchen',
      pickupAddress: '18 Koramangala 4th Block, Bengaluru',
      dropoffAddress: '77 Ulsoor Lake Road, Bengaluru',
      city: 'Bengaluru',
      volunteerId: 'usr-vol-1',
      volunteerName: 'Aarav Nair',
      status: 'Delivered',
      scheduledWindow: 'Completed yesterday',
      notes: 'Handed over in sealed boxes.',
      acceptedAt: hoursAgo(26),
      pickedUpAt: hoursAgo(24),
      deliveredAt: hoursAgo(21),
      createdAt: hoursAgo(30),
    },
  ];

  const deliveryRecords: DeliveryRecord[] = [
    {
      id: 'del-1',
      donationId: 'don-4',
      donationTitle: '80 Packs Whole-Grain Pasta & Lentil Dry Rations',
      taskId: 'tsk-2',
      requestId: 'req-3',
      ngoId: 'usr-ngo-1',
      orgName: 'Hope Haven Shelter & Kitchen',
      volunteerId: 'usr-vol-1',
      volunteerName: 'Aarav Nair',
      confirmedByNgoAt: hoursAgo(20),
      conditionRating: 'Excellent',
      quantityConfirmed: '80 packs intact',
      receiverNotes: 'All seals checked and logged into shelter dry store.',
    },
  ];

  const moderationReports: ModerationReport[] = [
    {
      id: 'rep-1',
      targetType: 'organisation',
      targetId: 'org-3',
      targetTitle: 'Sunrise Community Pantry',
      reporterId: 'usr-admin-1',
      reporterName: 'System Onboarding Queue',
      reason: 'New NGO registration awaiting document verification by administrator.',
      status: 'Open',
      createdAt: hoursAgo(70),
    },
  ];

  const contactMessages: ContactMessage[] = [];

  const activityLogs: ActivityLog[] = [
    {
      id: 'act-1',
      actorId: 'usr-ngo-1',
      actorName: 'Hope Haven Shelter & Kitchen',
      actorRole: 'ngo',
      action: 'Confirmed delivery receipt',
      targetType: 'donation',
      targetTitle: '80 Packs Whole-Grain Pasta & Lentil Dry Rations',
      timestamp: hoursAgo(20),
    },
    {
      id: 'act-2',
      actorId: 'usr-donor-2',
      actorName: 'Harvest Market Cooperative',
      actorRole: 'donor',
      action: 'Approved NGO request & scheduled pickup',
      targetType: 'donation',
      targetTitle: '60 kg Fresh Apples, Kale, Carrots & Tomatoes',
      timestamp: hoursAgo(2),
    },
    {
      id: 'act-3',
      actorId: 'usr-ngo-2',
      actorName: 'Little Steps Children Home',
      actorRole: 'ngo',
      action: 'Requested essential items',
      targetType: 'donation',
      targetTitle: '20 Stainless Steel Serving Trays & Hygiene Packs',
      timestamp: hoursAgo(1),
    },
    {
      id: 'act-4',
      actorId: 'usr-donor-1',
      actorName: 'Greenleaf Bistro & Catering',
      actorRole: 'donor',
      action: 'Published new food surplus listing',
      targetType: 'donation',
      targetTitle: '45 Sealed Vegetarian Quinoa & Roasted Veg Bowls',
      timestamp: hoursAgo(1),
    },
  ];

  return {
    users,
    organisations,
    donations,
    ngoNeeds,
    requests,
    volunteerTasks,
    deliveryRecords,
    moderationReports,
    contactMessages,
    activityLogs,
  };
}

let dbCache: DatabaseSchema | null = null;

export function getDb(): DatabaseSchema {
  if (dbCache) return dbCache;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    dbCache = createSeedData();
    saveDb(dbCache);
    return dbCache;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    dbCache = JSON.parse(raw) as DatabaseSchema;
    return dbCache;
  } catch {
    dbCache = createSeedData();
    saveDb(dbCache);
    return dbCache;
  }
}

export function saveDb(nextDb: DatabaseSchema): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  dbCache = nextDb;
  const tmpPath = DB_FILE + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(nextDb, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_FILE);
}

export function resetDbToSeed(): DatabaseSchema {
  const seeded = createSeedData();
  saveDb(seeded);
  return seeded;
}

export function logActivity(
  db: DatabaseSchema,
  actorId: string,
  actorName: string,
  actorRole: ActivityLog['actorRole'],
  action: string,
  targetType: string,
  targetTitle: string
): void {
  db.activityLogs.unshift({
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actorId,
    actorName,
    actorRole,
    action,
    targetType,
    targetTitle,
    timestamp: new Date().toISOString(),
  });
  if (db.activityLogs.length > 100) {
    db.activityLogs = db.activityLogs.slice(0, 100);
  }
}

export function sanitizeUser(user: StoredUser): User {
  const { passwordHash: _removed, ...safe } = user;
  return safe;
}
