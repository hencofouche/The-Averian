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
}

export interface UserSettings {
  id: string;
  species: Species[];
  subspecies: SubSpecies[];
  mutations: Mutation[];
  uid: string;
  currency?: string;
  account_expiry_date?: string; // ISO date string
  themeColor?: string; // Hex color string
  textColor?: string; 
  backgroundColor?: string;
  cardColor?: string;
  maleColor?: string;
  femaleColor?: string;
  deleteColor?: string;
  secondaryColor?: string;
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
  cageId?: string;
  motherId?: string;
  fatherId?: string;
  mateId?: string;
  offspringIds?: string[];
  mutations?: string[];
  splitMutations?: string[];
  statuses?: string[];
  imageUrl?: string;
  ringNumber?: string;
  notes?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  estimatedValue?: number;
  boughtFromId?: string;
  uid: string;
  documents?: BirdDocument[];
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
  imageUrl?: string;
  uid: string;
}

export interface Pair {
  id: string;
  maleId: string;
  femaleId: string;
  cageId?: string;
  startDate?: string;
  endDate?: string;
  status: 'Active' | 'Inactive';
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
