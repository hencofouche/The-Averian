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
  notes?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  estimatedValue?: number;
  uid: string;
}

export interface Transaction {
  id: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  date: string;
  birdId?: string;
  description?: string;
  uid: string;
}

export interface Cage {
  id: string;
  name: string;
  location?: string;
  type?: string;
  uid: string;
}

export interface Pair {
  id: string;
  maleId: string;
  femaleId: string;
  startDate?: string;
  endDate?: string;
  status: 'Active' | 'Inactive';
  uid: string;
}

export interface BreedingRecord {
  id: string;
  pairId: string;
  startDate: string;
  endDate?: string;
  eggsLaid: number;
  eggsHatched: number;
  chicksWeaned: number;
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
