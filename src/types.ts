export type UserRole = 'donor' | 'ngo' | 'volunteer' | 'admin';

export type DonationCategory =
  | 'Food'
  | 'Clothing & Warmth'
  | 'Education & Children'
  | 'Household & Daily Needs';

export type DonationStatus =
  | 'Available'
  | 'Requested'
  | 'Scheduled'
  | 'Picked Up'
  | 'Delivered';

export type FoodType =
  | 'prepared_meals'
  | 'packaged_food'
  | 'groceries'
  | 'fruits_vegetables';

export type StorageCondition = 'Hot' | 'Refrigerated' | 'Frozen' | 'Ambient';

export interface FoodDetails {
  foodType: FoodType;
  preparedAt?: string;
  expiresAt?: string;
  storageCondition: StorageCondition;
  allergens?: string;
  dietaryTags?: string[];
  packagingSealed: boolean;
}

export interface SafetyEligibility {
  eligible: boolean;
  requiresHumanReview: boolean;
  reasons: string[];
  disclaimer: string;
  checkedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  city: string;
  address: string;
  status: 'active' | 'suspended';
  isDemo?: boolean;
  createdAt: string;
}

export interface PublicUser extends User {}

export interface Organisation {
  id: string;
  userId: string;
  name: string;
  registrationNumber: string;
  type: 'NGO' | 'Orphanage' | 'Shelter' | 'Community Kitchen';
  city: string;
  address: string;
  contactPhone: string;
  capacityNote: string;
  documentsSummary: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  donorType: string;
  title: string;
  description: string;
  category: DonationCategory;
  subCategory: string;
  quantityValue: number;
  quantityUnit: string;
  location: string;
  city: string;
  availableFrom: string;
  availableUntil: string;
  imageUrl: string;
  status: DonationStatus;
  foodDetails?: FoodDetails;
  safetyEligibility: SafetyEligibility;
  flaggedForModeration?: boolean;
  aiMetadata?: {
    generatedDescription?: boolean;
    categorizedFromImage?: boolean;
    extractedFromText?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NgoNeed {
  id: string;
  ngoId: string;
  orgId: string;
  orgName: string;
  category: DonationCategory;
  title: string;
  quantityNeeded: number;
  unit: string;
  urgency: 'Normal' | 'High' | 'Urgent';
  city: string;
  notes: string;
  active: boolean;
  createdAt: string;
}

export interface DonationRequest {
  id: string;
  donationId: string;
  donationTitle: string;
  donationCategory: DonationCategory;
  donorId: string;
  donorName: string;
  ngoId: string;
  orgId: string;
  orgName: string;
  requestedQuantity: string;
  notes: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Fulfilled';
  createdAt: string;
  updatedAt: string;
}

export interface VolunteerTask {
  id: string;
  donationId: string;
  donationTitle: string;
  donationCategory: DonationCategory;
  quantitySummary: string;
  requestId: string;
  donorId: string;
  donorName: string;
  ngoId: string;
  orgName: string;
  pickupAddress: string;
  dropoffAddress: string;
  city: string;
  volunteerId?: string;
  volunteerName?: string;
  status: 'Open' | 'Accepted' | 'Picked Up' | 'Delivered';
  scheduledWindow: string;
  notes: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface DeliveryRecord {
  id: string;
  donationId: string;
  donationTitle: string;
  taskId?: string;
  requestId: string;
  ngoId: string;
  orgName: string;
  volunteerId?: string;
  volunteerName?: string;
  confirmedByNgoAt: string;
  conditionRating: 'Excellent' | 'Good' | 'Acceptable';
  quantityConfirmed: string;
  receiverNotes: string;
}

export interface ModerationReport {
  id: string;
  targetType: 'donation' | 'user' | 'organisation';
  targetId: string;
  targetTitle: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  status: 'Open' | 'Reviewed' | 'Resolved';
  adminNotes?: string;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  roleInterest: string;
  message: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetTitle: string;
  timestamp: string;
}

export interface SiteSettings {
  heroImageUrl: string;
  aboutImageUrl: string;
  updatedAt: string;
}

export interface PlatformStats {
  totalDonations: number;
  availableDonations: number;
  completedDonations: number;
  registeredNgos: number;
  totalOrganisations: number;
  pendingRequests: number;
  openTasks: number;
  activeVolunteers: number;
  categoryBreakdown: { category: DonationCategory; count: number }[];
  statusPipeline: { status: DonationStatus; count: number }[];
  recentActivities: ActivityLog[];
  backendStatus: {
    databaseEngine: string;
    geminiConfigured: boolean;
    supabaseConfigured: boolean;
    demoAccountsEnabled: boolean;
  };
}

export interface NgoMatchSuggestion {
  orgId: string;
  orgName: string;
  orgType: string;
  city: string;
  matchScore: number;
  matchedNeeds: string[];
  whySuitable: string;
  aiPowered: boolean;
}

export const DONATION_CATEGORIES: DonationCategory[] = [
  'Food',
  'Clothing & Warmth',
  'Education & Children',
  'Household & Daily Needs',
];

export const CATEGORY_SUBCATEGORIES: Record<DonationCategory, string[]> = {
  Food: ['Prepared Meals', 'Packaged Food', 'Groceries & Staples', 'Fruits & Vegetables'],
  'Clothing & Warmth': ['Clothes', 'Shoes', 'Blankets & Bedding', 'Winter Wear'],
  'Education & Children': ['Books', 'Notebooks & Paper', 'Stationery Kits', 'Toys & Games'],
  'Household & Daily Needs': ['Furniture', 'Kitchen Utensils', 'Hygiene Essentials', 'Storage & Supplies'],
};

export const DONATION_STATUS_ORDER: DonationStatus[] = [
  'Available',
  'Requested',
  'Scheduled',
  'Picked Up',
  'Delivered',
];
