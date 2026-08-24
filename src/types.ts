export interface Species {
  id: string;
  name: string;
}

export interface SubSpecies {
  id: string;
  name: string;
  speciesId: string;
}

export interface Mutation {
  id: string;
  name: string;
  inheritance?: 'autosomal_recessive' | 'autosomal_dominant' | 'incomplete_dominant' | 'sex_linked_recessive';
}

export interface CustomStatus {
  id: string;
  name: string;
}

export type AppPageId = 
  | 'birds' 
  | 'cages' 
  | 'pairs' 
  | 'breeding' 
  | 'marketplace' 
  | 'financials' 
  | 'genetics' 
  | 'wiki' 
  | 'tasks' 
  | 'contacts' 
  | 'print' 
  | 'pedigree' 
  | 'stats' 
  | 'settings';

export interface ComingSoonPageConfig {
  enabled: boolean;
  title?: string;
  subtitle?: string;
  description?: string;
  estimatedRelease?: string;
  badgeText?: string;
  featuresList?: string[];
  allowAdminTesting?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AppComingSoonSettings {
  pages: Partial<Record<AppPageId, ComingSoonPageConfig>>;
  globalBanner?: {
    enabled: boolean;
    message: string;
  };
  updatedAt?: string;
  updatedBy?: string;
}

export interface UserSettings {
  id: string;
  species: Species[];
  subspecies: SubSpecies[];
  mutations: Mutation[];
  statuses?: CustomStatus[];
  uid: string;
  aviaryName?: string;
  currency?: string;
  language?: string;
  account_expiry_date?: string; // ISO date string
  themeColor?: string; // Hex color string
  textColor?: string; 
  backgroundColor?: string;
  cardColor?: string;
  maleColor?: string;
  femaleColor?: string;
  deleteColor?: string;
  secondaryColor?: string;
  useDefaultData?: boolean;
}

export interface SharedItem {
  id: string;
  type: 'bird' | 'pair' | 'cage';
  action: 'share' | 'transfer';
  data: string; // JSON stringified data
  createdAt: string;
  createdBy: string;
}

export interface BirdDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  fileType: string;
  createdAt: string;
}

export interface Bird {
  id: string;
  name: string;
  species: string;
  subSpecies?: string;
  sex: 'Male' | 'Female' | 'Unknown';
  birthDate?: string;
  ageYear?: string; // Simplified age/year (e.g., '2024 Hatch', '2 Years')
  cageId?: string;
  motherId?: string;
  fatherId?: string;
  mateId?: string;
  offspringIds?: string[];
  mutations?: string[];
  splitMutations?: string[];
  statuses?: string[];
  imageUrl?: string;
  imageUrls?: string[];
  ringNumber?: string;
  bandingStatus?: 'Closed Ring / Ringed' | 'Open Banded' | 'Non-Banded' | 'Split Ring';
  sexingMethod?: 'DNA Sexed' | 'Surgically Sexed' | 'Visual / Auto-Sexed' | 'Unsexed';
  vetChecked?: boolean;
  vetNotes?: string;
  deliveryOptions?: 'Collection Only' | 'Courier Can Be Arranged' | 'Delivery Available' | 'Collection or Courier';
  notes?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  estimatedValue?: number;
  boughtFromId?: string;
  uid: string;
  documents?: BirdDocument[];
  isGhost?: boolean;
  ghostId?: string;
}

export interface SellerProfile {
  id: string;
  uid: string;
  sellerName: string;
  aviaryName: string;
  town: string;
  provinceState?: string;
  country?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  bio?: string;
  status: 'pending' | 'approved' | 'rejected' | 'banned';
  rejectionReason?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rating?: number;
  reviewsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceListing {
  id: string;
  type: 'for_sale' | 'wanted';
  category: 'Bird' | 'Pair' | 'Accessories' | 'Other';
  title: string;
  description: string;
  species?: string;
  subSpecies?: string;
  mutations?: string[];
  splitMutations?: string[];
  sex?: 'Male' | 'Female' | 'Pair' | 'Unsexed' | 'Any';
  sexingMethod?: 'DNA Sexed' | 'Surgically Sexed' | 'Visual / Auto-Sexed' | 'Unsexed';
  bandingStatus?: 'Closed Ring / Ringed' | 'Open Banded' | 'Non-Banded' | 'Split Ring';
  ringNumber?: string;
  ageYear?: string;
  vetChecked?: boolean;
  price: number;
  priceMax?: number; // For wanted listings range
  currency: string;
  locationTown: string;
  provinceState?: string;
  country?: string;
  deliveryOption: 'Collection Only' | 'Courier Can Be Arranged' | 'Delivery Available' | 'Collection or Courier';
  sellerId: string; // uid
  sellerName: string;
  sellerAviary: string;
  sellerTown: string;
  sellerPhone?: string;
  sellerWhatsApp?: string;
  sellerEmail?: string;
  imageUrls?: string[];
  allowOffers?: boolean;
  birdId?: string; // If linked from inventory
  pairId?: string; // If linked from inventory
  status: 'pending_approval' | 'active' | 'sold' | 'rejected' | 'archived';
  rejectionReason?: string;
  soldToUserId?: string;
  soldToBuyerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceReview {
  id: string;
  listingId: string;
  listingTitle: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  rating: number; // 1 to 5
  comment: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  date: string;
  birdId?: string;
  pairId?: string;
  contactId?: string;
  description?: string;
  recurring?: 'None' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  nextDueDate?: string;
  recurringParentId?: string;
  uid: string;
}

export interface Contact {
  id: string;
  name: string;
  type: 'Buyer' | 'Seller' | 'Both';
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  uid: string;
}

export interface Cage {
  id: string;
  name: string;
  location?: string;
  type?: string;
  notes?: string;
  imageUrl?: string;
  imageUrls?: string[];
  uid: string;
  width?: number;
  height?: number;
  depth?: number;
  dimensionUnit?: string;
}

export interface Pair {
  id: string;
  maleId: string;
  femaleId: string;
  cageId?: string;
  startDate?: string;
  endDate?: string;
  status: 'Active' | 'Inactive';
  imageUrls?: string[];
  uid: string;
}

export interface Egg {
  id: string;
  laidDate?: string;
  status: 'Laid' | 'Fertile' | 'Infertile / Clear' | 'Dead In Shell' | 'Hatched' | 'Died' | 'Weaned';
  actualHatchDate?: string;
  notes?: string;
  birdId?: string; // If it becomes a bird
}

export interface BreedingRecord {
  id: string;
  pairId: string;
  startDate: string;
  endDate?: string;
  eggsLaid: number; // Keep for backward compatibility
  eggsHatched: number; // Keep for backward compatibility 
  chicksWeaned: number; // Keep for backward compatibility
  eggs?: Egg[];
  offspringIds?: string[];
  notes?: string;
  incubationDays?: number;
  ringingDays?: number;
  uid: string;
}

export interface SubTask {
  title: string;
  completed: boolean;
  birdIds: string[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'Pending' | 'Completed';
  priority?: 'Low' | 'Medium' | 'High';
  category?: string;
  dueDate?: string;
  reminderDate?: string;
  reminderLeadTime?: number;
  birdIds: string[];
  subTasks: SubTask[];
  uid: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string;
    providerInfo: {
      providerId: string;
      displayName: string;
      email: string;
      photoUrl: string;
    }[];
  }
}
