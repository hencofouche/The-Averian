import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Shield, Calendar, Award, RefreshCw, Copy, 
  ArrowRight, Download, Upload, Check, AlertCircle, Clock, 
  Sliders, UserCheck, CheckCircle2, ChevronRight, Eye, 
  FileJson, Sparkles, Feather, Home, Heart, FileSpreadsheet, 
  DollarSign, CheckSquare, Layers, Lock, Unlock, Zap, X, Info
} from 'lucide-react';
import { 
  UserSettings, AppUserAccount, Bird, Cage, Pair, BreedingRecord, 
  Transaction, Task, Contact, SellerProfile, DataMigrationOptions 
} from '../types';
import { Button, Card, Badge, Input, Select, Textarea } from './ui';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { 
  collection, getDocs, doc, setDoc, updateDoc, writeBatch, 
  query, where, addDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { format, addDays, addMonths, addYears, isAfter, isBefore } from 'date-fns';

interface AdminUserManagementPanelProps {
  currentUser: any;
  onRefreshParentData?: () => void;
}

interface UserWithDetails {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'user';
  aviaryName?: string;
  currency?: string;
  account_expiry_date?: string;
  subscriptionPlan?: string;
  subscriptionGrantedBy?: string;
  subscribedAt?: string;
  lastLoginAt?: string;
  createdAt?: string;
  birdCount?: number;
  cageCount?: number;
  pairCount?: number;
  settings?: UserSettings;
  sellerProfile?: SellerProfile;
}

export function AdminUserManagementPanel({
  currentUser,
  onRefreshParentData
}: AdminUserManagementPanelProps) {
  const [usersList, setUsersList] = useState<UserWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'trial' | 'yearly' | 'lifetime' | 'admins'>('all');
  
  // Selection for action
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  
  // Subscription Modal State
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionUser, setSubscriptionUser] = useState<UserWithDetails | null>(null);
  const [subDurationType, setSubDurationType] = useState<'1year' | '6months' | '1month' | 'lifetime' | 'custom' | 'trial30'>('1year');
  const [customDate, setCustomDate] = useState(format(addYears(new Date(), 1), 'yyyy-MM-dd'));
  const [customPlanName, setCustomPlanName] = useState('Annual Breeder Pro');
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);

  // Data Migration Modal State
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [sourceUser, setSourceUser] = useState<UserWithDetails | null>(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [migrationOptions, setMigrationOptions] = useState<DataMigrationOptions>({
    includeBirds: true,
    includeCages: true,
    includePairs: true,
    includeBreedingRecords: true,
    includeTransactions: true,
    includeTasks: true,
    includeContacts: true,
    includeCustomSpeciesAndMutations: true,
    includeSellerProfile: true,
    remapPedigrees: true,
    actionType: 'copy'
  });
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<string>('');
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    summary: string;
    counts?: Record<string, number>;
  } | null>(null);

  // Inspector Modal State
  const [inspectUser, setInspectUser] = useState<UserWithDetails | null>(null);
  const [inspectData, setInspectData] = useState<{
    birds: Bird[];
    cages: Cage[];
    pairs: Pair[];
    breedingRecords: BreedingRecord[];
    transactions: Transaction[];
    tasks: Task[];
    contacts: Contact[];
  } | null>(null);
  const [isLoadingInspect, setIsLoadingInspect] = useState(false);

  // Load all users from Firestore
  const fetchAllUsers = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch from 'users' collection
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersMap = new Map<string, UserWithDetails>();

      usersSnap.forEach((d) => {
        const data = d.data();
        usersMap.set(d.id, {
          uid: d.id,
          email: data.email || 'No email',
          displayName: data.displayName || data.email?.split('@')[0] || 'Breeder',
          photoURL: data.photoURL,
          role: data.role === 'admin' ? 'admin' : 'user',
          aviaryName: data.aviaryName,
          currency: data.currency,
          account_expiry_date: data.account_expiry_date,
          subscriptionPlan: data.subscriptionPlan,
          subscriptionGrantedBy: data.subscriptionGrantedBy,
          subscribedAt: data.subscribedAt,
          lastLoginAt: data.lastLoginAt,
          createdAt: data.createdAt
        });
      });

      // 2. Fetch from 'userSettings' to capture all existing accounts
      const settingsSnap = await getDocs(collection(db, 'userSettings'));
      settingsSnap.forEach((d) => {
        const data = d.data() as UserSettings;
        const uid = data.uid || d.id;
        const existing = usersMap.get(uid);

        if (existing) {
          usersMap.set(uid, {
            ...existing,
            aviaryName: existing.aviaryName || data.aviaryName,
            currency: existing.currency || data.currency,
            account_expiry_date: data.account_expiry_date || existing.account_expiry_date,
            subscriptionPlan: data.subscriptionPlan || existing.subscriptionPlan,
            subscriptionGrantedBy: data.subscriptionGrantedBy || existing.subscriptionGrantedBy,
            subscribedAt: data.subscribedAt || existing.subscribedAt,
            role: (data.role === 'admin' || existing.role === 'admin') ? 'admin' : 'user',
            settings: data
          });
        } else {
          usersMap.set(uid, {
            uid,
            email: data.email || `user_${uid.substring(0, 6)}@app.user`,
            displayName: data.displayName || data.aviaryName || 'Breeder',
            role: data.role === 'admin' ? 'admin' : 'user',
            aviaryName: data.aviaryName,
            currency: data.currency,
            account_expiry_date: data.account_expiry_date,
            subscriptionPlan: data.subscriptionPlan,
            subscriptionGrantedBy: data.subscriptionGrantedBy,
            subscribedAt: data.subscribedAt,
            settings: data
          });
        }
      });

      // 3. Fetch from 'sellerProfiles'
      const sellersSnap = await getDocs(collection(db, 'sellerProfiles'));
      sellersSnap.forEach((d) => {
        const data = d.data() as SellerProfile;
        if (data.uid && usersMap.has(data.uid)) {
          const u = usersMap.get(data.uid)!;
          u.sellerProfile = { id: d.id, ...data };
          if (!u.displayName && data.sellerName) u.displayName = data.sellerName;
          if (!u.aviaryName && data.aviaryName) u.aviaryName = data.aviaryName;
        }
      });

      const list = Array.from(usersMap.values());
      // Sort by last login / creation / name
      list.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (b.role === 'admin' && a.role !== 'admin') return 1;
        return a.displayName.localeCompare(b.displayName);
      });

      setUsersList(list);
    } catch (err: any) {
      console.error("Error fetching users list:", err);
      toast.error('Failed to load user accounts: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  // Quick stats
  const stats = useMemo(() => {
    const total = usersList.length;
    let activeSubCount = 0;
    let expiredCount = 0;
    let lifetimeCount = 0;
    let yearlyCount = 0;
    let adminCount = 0;
    const now = new Date();

    usersList.forEach(u => {
      if (u.role === 'admin') adminCount++;
      if (u.subscriptionPlan === 'lifetime' || (u.account_expiry_date && new Date(u.account_expiry_date).getFullYear() > 2090)) {
        lifetimeCount++;
        activeSubCount++;
      } else if (u.account_expiry_date) {
        const exp = new Date(u.account_expiry_date);
        if (isAfter(exp, now)) {
          activeSubCount++;
          if (u.subscriptionPlan === 'yearly' || u.subscriptionPlan === 'annual') {
            yearlyCount++;
          }
        } else {
          expiredCount++;
        }
      } else {
        expiredCount++;
      }
    });

    return { total, activeSubCount, expiredCount, lifetimeCount, yearlyCount, adminCount };
  }, [usersList]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    const queryStr = searchQuery.toLowerCase().trim();
    const now = new Date();

    return usersList.filter(u => {
      // Status filter
      if (statusFilter === 'admins' && u.role !== 'admin') return false;
      if (statusFilter === 'lifetime') {
        const isLife = u.subscriptionPlan === 'lifetime' || (u.account_expiry_date && new Date(u.account_expiry_date).getFullYear() > 2090);
        if (!isLife) return false;
      }
      if (statusFilter === 'yearly' && u.subscriptionPlan !== 'yearly' && u.subscriptionPlan !== 'annual') return false;
      if (statusFilter === 'active') {
        if (!u.account_expiry_date) return false;
        if (!isAfter(new Date(u.account_expiry_date), now)) return false;
      }
      if (statusFilter === 'expired') {
        if (u.account_expiry_date && isAfter(new Date(u.account_expiry_date), now)) return false;
      }
      if (statusFilter === 'trial') {
        if (u.subscriptionPlan !== 'trial') return false;
      }

      // Search query
      if (queryStr) {
        const inEmail = u.email.toLowerCase().includes(queryStr);
        const inName = u.displayName.toLowerCase().includes(queryStr);
        const inAviary = (u.aviaryName || '').toLowerCase().includes(queryStr);
        const inUid = u.uid.toLowerCase().includes(queryStr);
        return inEmail || inName || inAviary || inUid;
      }

      return true;
    });
  }, [usersList, searchQuery, statusFilter]);

  // Handle Granting / Extending Subscription
  const handleGrantSubscription = async (
    targetUser: UserWithDetails,
    type: '1year' | '6months' | '1month' | 'lifetime' | 'custom' | 'trial30',
    customExpiry?: string,
    planTitle?: string
  ) => {
    setIsUpdatingSub(true);
    try {
      const now = new Date();
      let currentExpiry = targetUser.account_expiry_date ? new Date(targetUser.account_expiry_date) : now;
      let baseDate = isAfter(currentExpiry, now) ? currentExpiry : now;
      let newExpiry: Date;
      let planName = planTitle || 'Annual Breeder Subscription';

      if (type === '1year') {
        newExpiry = addYears(baseDate, 1);
        planName = 'Annual Breeder Pro (Yearly)';
      } else if (type === '6months') {
        newExpiry = addMonths(baseDate, 6);
        planName = '6-Month Breeder Access';
      } else if (type === '1month') {
        newExpiry = addMonths(baseDate, 1);
        planName = 'Monthly Breeder Pass';
      } else if (type === 'lifetime') {
        newExpiry = new Date('2099-12-31T23:59:59.000Z');
        planName = 'Lifetime VIP Access';
      } else if (type === 'trial30') {
        newExpiry = addDays(now, 30);
        planName = '30-Day Free Trial';
      } else {
        newExpiry = customExpiry ? new Date(customExpiry) : addYears(now, 1);
      }

      const isoExpiry = newExpiry.toISOString();

      // Update userSettings doc
      const settingsRef = doc(db, 'userSettings', targetUser.uid);
      await setDoc(settingsRef, {
        account_expiry_date: isoExpiry,
        subscriptionPlan: type === 'lifetime' ? 'lifetime' : (type === '1year' ? 'yearly' : 'monthly'),
        subscribedAt: new Date().toISOString(),
        subscriptionGrantedBy: `Admin (${currentUser?.email || 'Admin'})`
      }, { merge: true });

      // Update users doc
      const userRef = doc(db, 'users', targetUser.uid);
      await setDoc(userRef, {
        account_expiry_date: isoExpiry,
        subscriptionPlan: type === 'lifetime' ? 'lifetime' : (type === '1year' ? 'yearly' : 'monthly'),
        subscriptionGrantedBy: `Admin (${currentUser?.email || 'Admin'})`,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Update local state
      setUsersList(prev => prev.map(u => {
        if (u.uid === targetUser.uid) {
          return {
            ...u,
            account_expiry_date: isoExpiry,
            subscriptionPlan: type === 'lifetime' ? 'lifetime' : (type === '1year' ? 'yearly' : 'monthly'),
            subscriptionGrantedBy: `Admin (${currentUser?.email || 'Admin'})`
          };
        }
        return u;
      }));

      toast.success(
        `Subscription updated for ${targetUser.displayName || targetUser.email}! Valid until ${format(newExpiry, 'dd MMM yyyy')}`
      );
      setShowSubscriptionModal(false);
      if (onRefreshParentData) onRefreshParentData();
    } catch (err: any) {
      console.error("Failed to grant subscription:", err);
      toast.error('Failed to update subscription: ' + err.message);
    } finally {
      setIsUpdatingSub(false);
    }
  };

  // Inspect User Data
  const handleInspectUser = async (u: UserWithDetails) => {
    setInspectUser(u);
    setIsLoadingInspect(true);
    try {
      const [birdsSnap, cagesSnap, pairsSnap, clutchesSnap, transSnap, tasksSnap, contactsSnap] = await Promise.all([
        getDocs(query(collection(db, 'birds'), where('uid', '==', u.uid))),
        getDocs(query(collection(db, 'cages'), where('uid', '==', u.uid))),
        getDocs(query(collection(db, 'pairs'), where('uid', '==', u.uid))),
        getDocs(query(collection(db, 'breedingRecords'), where('uid', '==', u.uid))),
        getDocs(query(collection(db, 'transactions'), where('uid', '==', u.uid))),
        getDocs(query(collection(db, 'tasks'), where('uid', '==', u.uid))),
        getDocs(query(collection(db, 'contacts'), where('uid', '==', u.uid)))
      ]);

      setInspectData({
        birds: birdsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Bird)),
        cages: cagesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Cage)),
        pairs: pairsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Pair)),
        breedingRecords: clutchesSnap.docs.map(d => ({ id: d.id, ...d.data() } as BreedingRecord)),
        transactions: transSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)),
        tasks: tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task)),
        contacts: contactsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Contact))
      });
    } catch (err: any) {
      console.error("Failed to inspect user data:", err);
      toast.error('Failed to load user records: ' + err.message);
    } finally {
      setIsLoadingInspect(false);
    }
  };

  // Export JSON Backup of user
  const handleExportUserBackup = async (u: UserWithDetails) => {
    const toastId = toast.loading(`Preparing complete database export for ${u.displayName}...`);
    try {
      const [birdsSnap, cagesSnap, pairsSnap, clutchesSnap, transSnap, tasksSnap, contactsSnap, settingsSnap] = await Promise.all([
        getDocs(query(collection(db, 'birds'), where('uid', '==', u.uid))),
        getDocs(query(collection(db, 'cages'), where('uid', '==', u.uid))),
        getDocs(query(collection(db, 'pairs'), where('uid', '==', u.uid))),
        getDocs(query(collection(db, 'breedingRecords'), where('uid', '==', u.uid))),
        getDocs(query(collection(db, 'transactions'), where('uid', '==', u.uid))),
        getDocs(query(collection(db, 'tasks'), where('uid', '==', u.uid))),
        getDocs(query(collection(db, 'contacts'), where('uid', '==', u.uid))),
        getDocs(query(collection(db, 'userSettings'), where('uid', '==', u.uid)))
      ]);

      const backupObject = {
        meta: {
          exportedAt: new Date().toISOString(),
          exportedBy: currentUser?.email || 'Admin',
          sourceUid: u.uid,
          sourceEmail: u.email,
          sourceName: u.displayName,
          version: '1.0.0'
        },
        userAccount: {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          account_expiry_date: u.account_expiry_date,
          subscriptionPlan: u.subscriptionPlan
        },
        userSettings: settingsSnap.docs.map(d => d.data())[0] || u.settings || null,
        birds: birdsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        cages: cagesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        pairs: pairsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        breedingRecords: clutchesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        transactions: transSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        tasks: tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        contacts: contactsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `averian_backup_${(u.displayName || u.uid).replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success(`Exported complete database for ${u.displayName}`, { id: toastId });
    } catch (err: any) {
      toast.error('Backup export failed: ' + err.message, { id: toastId });
    }
  };

  // Perform Account Data Migration / Cloning
  const handleExecuteMigration = async () => {
    if (!sourceUser) {
      toast.error('Please select a source account');
      return;
    }
    if (!targetUserId.trim()) {
      toast.error('Please specify the destination Target User ID / Account');
      return;
    }
    if (targetUserId.trim() === sourceUser.uid) {
      toast.error('Source and target accounts must be different!');
      return;
    }

    setIsMigrating(true);
    setMigrationProgress('Initializing migration engine...');
    const counts: Record<string, number> = {
      birds: 0,
      cages: 0,
      pairs: 0,
      breedingRecords: 0,
      transactions: 0,
      tasks: 0,
      contacts: 0
    };

    try {
      const targetUserObj = usersList.find(u => u.uid === targetUserId.trim());
      const targetEmail = targetUserObj?.email || targetUserId;

      // 1. Remapping ID dictionaries
      const cageIdMap = new Map<string, string>();
      const birdIdMap = new Map<string, string>();
      const pairIdMap = new Map<string, string>();

      // 2. Fetch all source records
      setMigrationProgress('Reading source account database...');
      const [birdsSnap, cagesSnap, pairsSnap, clutchesSnap, transSnap, tasksSnap, contactsSnap, settingsSnap, sellerSnap] = await Promise.all([
        getDocs(query(collection(db, 'birds'), where('uid', '==', sourceUser.uid))),
        getDocs(query(collection(db, 'cages'), where('uid', '==', sourceUser.uid))),
        getDocs(query(collection(db, 'pairs'), where('uid', '==', sourceUser.uid))),
        getDocs(query(collection(db, 'breedingRecords'), where('uid', '==', sourceUser.uid))),
        getDocs(query(collection(db, 'transactions'), where('uid', '==', sourceUser.uid))),
        getDocs(query(collection(db, 'tasks'), where('uid', '==', sourceUser.uid))),
        getDocs(query(collection(db, 'contacts'), where('uid', '==', sourceUser.uid))),
        getDocs(query(collection(db, 'userSettings'), where('uid', '==', sourceUser.uid))),
        getDocs(query(collection(db, 'sellerProfiles'), where('uid', '==', sourceUser.uid)))
      ]);

      // 3. Migrate Cages
      if (migrationOptions.includeCages && !cagesSnap.empty) {
        setMigrationProgress(`Migrating ${cagesSnap.size} cages...`);
        for (const cDoc of cagesSnap.docs) {
          const data = cDoc.data() as Cage;
          const newCageRef = doc(collection(db, 'cages'));
          cageIdMap.set(cDoc.id, newCageRef.id);
          await setDoc(newCageRef, {
            ...data,
            id: newCageRef.id,
            uid: targetUserId.trim(),
            migratedFrom: sourceUser.uid,
            migratedAt: new Date().toISOString()
          });
          counts.cages++;
        }
      }

      // 4. Pre-generate new Bird IDs for pedigree remapping
      const sourceBirdDocs = birdsSnap.docs;
      for (const bDoc of sourceBirdDocs) {
        const newBirdRef = doc(collection(db, 'birds'));
        birdIdMap.set(bDoc.id, newBirdRef.id);
      }

      // 5. Migrate Birds
      if (migrationOptions.includeBirds && sourceBirdDocs.length > 0) {
        setMigrationProgress(`Migrating ${sourceBirdDocs.length} birds & remapping pedigrees...`);
        for (const bDoc of sourceBirdDocs) {
          const data = bDoc.data() as Bird;
          const newBirdId = birdIdMap.get(bDoc.id)!;
          const newBirdRef = doc(db, 'birds', newBirdId);

          // Remap parent IDs if requested
          let motherId = data.motherId;
          let fatherId = data.fatherId;
          let mateId = data.mateId;
          let cageId = data.cageId;
          let offspringIds = data.offspringIds || [];

          if (migrationOptions.remapPedigrees) {
            if (motherId && birdIdMap.has(motherId)) motherId = birdIdMap.get(motherId);
            if (fatherId && birdIdMap.has(fatherId)) fatherId = birdIdMap.get(fatherId);
            if (mateId && birdIdMap.has(mateId)) mateId = birdIdMap.get(mateId);
            if (cageId && cageIdMap.has(cageId)) cageId = cageIdMap.get(cageId);
            offspringIds = offspringIds.map(oId => birdIdMap.get(oId) || oId);
          }

          await setDoc(newBirdRef, {
            ...data,
            id: newBirdId,
            uid: targetUserId.trim(),
            motherId: motherId || '',
            fatherId: fatherId || '',
            mateId: mateId || '',
            cageId: cageId || '',
            offspringIds,
            migratedFrom: sourceUser.uid,
            migratedAt: new Date().toISOString()
          });
          counts.birds++;
        }
      }

      // 6. Migrate Pairs & Breeding Clutches
      if (migrationOptions.includePairs && !pairsSnap.empty) {
        setMigrationProgress(`Migrating ${pairsSnap.size} breeding pairs...`);
        for (const pDoc of pairsSnap.docs) {
          const data = pDoc.data() as Pair;
          const newPairRef = doc(collection(db, 'pairs'));
          pairIdMap.set(pDoc.id, newPairRef.id);

          const maleId = (migrationOptions.remapPedigrees && birdIdMap.has(data.maleId))
            ? birdIdMap.get(data.maleId)!
            : data.maleId;
          const femaleId = (migrationOptions.remapPedigrees && birdIdMap.has(data.femaleId))
            ? birdIdMap.get(data.femaleId)!
            : data.femaleId;
          const cageId = (migrationOptions.remapPedigrees && data.cageId && cageIdMap.has(data.cageId))
            ? cageIdMap.get(data.cageId)!
            : (data.cageId || '');

          await setDoc(newPairRef, {
            ...data,
            id: newPairRef.id,
            uid: targetUserId.trim(),
            maleId,
            femaleId,
            cageId,
            migratedFrom: sourceUser.uid,
            migratedAt: new Date().toISOString()
          });
          counts.pairs++;
        }
      }

      if (migrationOptions.includeBreedingRecords && !clutchesSnap.empty) {
        setMigrationProgress(`Migrating ${clutchesSnap.size} clutch records...`);
        for (const clDoc of clutchesSnap.docs) {
          const data = clDoc.data() as BreedingRecord;
          const newClutchRef = doc(collection(db, 'breedingRecords'));
          const pairId = (migrationOptions.remapPedigrees && pairIdMap.has(data.pairId))
            ? pairIdMap.get(data.pairId)!
            : data.pairId;
          const offspringIds = (data.offspringIds || []).map(oId => birdIdMap.get(oId) || oId);

          await setDoc(newClutchRef, {
            ...data,
            id: newClutchRef.id,
            uid: targetUserId.trim(),
            pairId,
            offspringIds,
            migratedFrom: sourceUser.uid,
            migratedAt: new Date().toISOString()
          });
          counts.breedingRecords++;
        }
      }

      // 7. Migrate Financial Transactions
      if (migrationOptions.includeTransactions && !transSnap.empty) {
        setMigrationProgress(`Migrating ${transSnap.size} financial records...`);
        for (const tDoc of transSnap.docs) {
          const data = tDoc.data() as Transaction;
          const newTransRef = doc(collection(db, 'transactions'));
          const birdId = (data.birdId && birdIdMap.has(data.birdId)) ? birdIdMap.get(data.birdId) : data.birdId;

          await setDoc(newTransRef, {
            ...data,
            id: newTransRef.id,
            uid: targetUserId.trim(),
            birdId: birdId || '',
            migratedFrom: sourceUser.uid,
            migratedAt: new Date().toISOString()
          });
          counts.transactions++;
        }
      }

      // 8. Migrate Tasks
      if (migrationOptions.includeTasks && !tasksSnap.empty) {
        setMigrationProgress(`Migrating ${tasksSnap.size} aviary tasks...`);
        for (const tkDoc of tasksSnap.docs) {
          const data = tkDoc.data() as Task;
          const newTkRef = doc(collection(db, 'tasks'));
          const birdIds = (data.birdIds || []).map(bId => birdIdMap.get(bId) || bId);

          await setDoc(newTkRef, {
            ...data,
            id: newTkRef.id,
            uid: targetUserId.trim(),
            birdIds,
            migratedFrom: sourceUser.uid,
            migratedAt: new Date().toISOString()
          });
          counts.tasks++;
        }
      }

      // 9. Migrate Contacts
      if (migrationOptions.includeContacts && !contactsSnap.empty) {
        setMigrationProgress(`Migrating ${contactsSnap.size} contacts...`);
        for (const ctDoc of contactsSnap.docs) {
          const data = ctDoc.data() as Contact;
          const newCtRef = doc(collection(db, 'contacts'));
          await setDoc(newCtRef, {
            ...data,
            id: newCtRef.id,
            uid: targetUserId.trim(),
            migratedFrom: sourceUser.uid,
            migratedAt: new Date().toISOString()
          });
          counts.contacts++;
        }
      }

      // 10. Copy Taxonomy & Settings & Subscriptions
      if (migrationOptions.includeCustomSpeciesAndMutations && !settingsSnap.empty) {
        setMigrationProgress('Syncing taxonomy, mutations, and subscription status...');
        const srcSettings = settingsSnap.docs[0].data() as UserSettings;
        const targetSettingsRef = doc(db, 'userSettings', targetUserId.trim());

        await setDoc(targetSettingsRef, {
          species: srcSettings.species || [],
          subspecies: srcSettings.subspecies || [],
          mutations: srcSettings.mutations || [],
          statuses: srcSettings.statuses || [],
          aviaryName: srcSettings.aviaryName || '',
          currency: srcSettings.currency || 'ZAR',
          account_expiry_date: srcSettings.account_expiry_date || sourceUser.account_expiry_date || '',
          subscriptionPlan: srcSettings.subscriptionPlan || sourceUser.subscriptionPlan || 'yearly',
          subscriptionGrantedBy: `Migrated from ${sourceUser.email} by Admin`,
          uid: targetUserId.trim()
        }, { merge: true });

        // Also update users table for target
        await setDoc(doc(db, 'users', targetUserId.trim()), {
          account_expiry_date: srcSettings.account_expiry_date || sourceUser.account_expiry_date || '',
          subscriptionPlan: srcSettings.subscriptionPlan || sourceUser.subscriptionPlan || 'yearly',
          subscriptionGrantedBy: `Migrated from ${sourceUser.email} by Admin`,
          aviaryName: srcSettings.aviaryName || '',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // 11. Copy Seller Profile
      if (migrationOptions.includeSellerProfile && !sellerSnap.empty) {
        const srcSeller = sellerSnap.docs[0].data() as SellerProfile;
        const targetSellerRef = doc(db, 'sellerProfiles', targetUserId.trim());
        await setDoc(targetSellerRef, {
          ...srcSeller,
          id: targetUserId.trim(),
          uid: targetUserId.trim(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setMigrationResult({
        success: true,
        summary: `Successfully cloned data from ${sourceUser.displayName || sourceUser.email} to ${targetEmail}!`,
        counts
      });
      toast.success(`Data migration to ${targetEmail} completed successfully!`);
      fetchAllUsers();
    } catch (err: any) {
      console.error("Migration error:", err);
      toast.error('Migration failed: ' + err.message);
      setMigrationResult({
        success: false,
        summary: 'Migration failed: ' + err.message
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <Users size={16} className="text-gold-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Users</span>
          </div>
          <p className="text-2xl font-black text-white">{stats.total}</p>
        </Card>

        <Card className="p-4 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Subs</span>
          </div>
          <p className="text-2xl font-black text-emerald-400">{stats.activeSubCount}</p>
        </Card>

        <Card className="p-4 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <Award size={16} className="text-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Yearly Plans</span>
          </div>
          <p className="text-2xl font-black text-amber-400">{stats.yearlyCount}</p>
        </Card>

        <Card className="p-4 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <Sparkles size={16} className="text-indigo-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Lifetime</span>
          </div>
          <p className="text-2xl font-black text-indigo-400">{stats.lifetimeCount}</p>
        </Card>

        <Card className="p-4 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <Clock size={16} className="text-rose-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Expired</span>
          </div>
          <p className="text-2xl font-black text-rose-400">{stats.expiredCount}</p>
        </Card>

        <Card className="p-4 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <Shield size={16} className="text-purple-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Admins</span>
          </div>
          <p className="text-2xl font-black text-purple-400">{stats.adminCount}</p>
        </Card>
      </div>

      {/* Control Bar: Search, Filters, Refresh */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-2xl px-3 py-2">
          <Search size={18} className="text-zinc-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, UID, aviary..."
            className="w-full bg-transparent border-none text-sm text-white focus:outline-none placeholder:text-zinc-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-white p-1">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
              statusFilter === 'all' ? "bg-gold-500 text-black shadow-md" : "bg-zinc-900 text-zinc-400 hover:text-white"
            )}
          >
            All ({usersList.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
              statusFilter === 'active' ? "bg-emerald-500 text-black shadow-md" : "bg-zinc-900 text-zinc-400 hover:text-emerald-400"
            )}
          >
            Active ({stats.activeSubCount})
          </button>
          <button
            onClick={() => setStatusFilter('yearly')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
              statusFilter === 'yearly' ? "bg-amber-500 text-black shadow-md" : "bg-zinc-900 text-zinc-400 hover:text-amber-400"
            )}
          >
            Yearly
          </button>
          <button
            onClick={() => setStatusFilter('lifetime')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
              statusFilter === 'lifetime' ? "bg-indigo-500 text-white shadow-md" : "bg-zinc-900 text-zinc-400 hover:text-indigo-400"
            )}
          >
            Lifetime
          </button>
          <button
            onClick={() => setStatusFilter('expired')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
              statusFilter === 'expired' ? "bg-rose-500 text-white shadow-md" : "bg-zinc-900 text-zinc-400 hover:text-rose-400"
            )}
          >
            Expired ({stats.expiredCount})
          </button>
          <button
            onClick={() => setStatusFilter('admins')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
              statusFilter === 'admins' ? "bg-purple-500 text-white shadow-md" : "bg-zinc-900 text-zinc-400 hover:text-purple-400"
            )}
          >
            Admins
          </button>
          <Button
            variant="secondary"
            onClick={fetchAllUsers}
            disabled={isLoading}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl"
            title="Refresh Users"
          >
            <RefreshCw size={16} className={cn(isLoading && "animate-spin text-gold-400")} />
          </Button>
        </div>
      </div>

      {/* Users Table / Directory */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-400 space-y-3 bg-zinc-950 border border-zinc-800 rounded-3xl">
            <RefreshCw size={32} className="animate-spin text-gold-400 mx-auto" />
            <p className="text-sm font-semibold">Loading user accounts & subscription data...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 bg-zinc-950 border border-zinc-800 rounded-3xl space-y-2">
            <Users size={36} className="mx-auto text-zinc-600" />
            <p className="text-sm font-medium">No user accounts found matching your query.</p>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isLifetime = u.subscriptionPlan === 'lifetime' || (u.account_expiry_date && new Date(u.account_expiry_date).getFullYear() > 2090);
            const isExp = u.account_expiry_date ? isBefore(new Date(u.account_expiry_date), new Date()) && !isLifetime : true;
            const expDate = u.account_expiry_date ? new Date(u.account_expiry_date) : null;

            return (
              <Card 
                key={u.uid}
                className="p-4 sm:p-5 bg-zinc-950 border-zinc-800/80 hover:border-zinc-700 transition-all rounded-2xl space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* User Profile Info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-gold-400 font-black text-sm shrink-0 overflow-hidden shadow-md">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        u.displayName.substring(0, 2).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-white text-base truncate">
                          {u.displayName}
                        </span>
                        {u.role === 'admin' && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Shield size={10} /> ADMIN
                          </span>
                        )}
                        {u.sellerProfile?.status === 'approved' && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-gold-500/20 text-gold-400 border border-gold-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <UserCheck size={10} /> VERIFIED SELLER
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                        <span>{u.email}</span>
                        {u.aviaryName && (
                          <span className="text-zinc-500">• Aviary: <strong className="text-zinc-300">{u.aviaryName}</strong></span>
                        )}
                        <span className="text-zinc-600 font-mono text-[11px]">
                          UID: {u.uid.substring(0, 10)}...
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(u.uid);
                              toast.success('UID copied to clipboard!');
                            }}
                            className="ml-1 text-zinc-500 hover:text-white inline-block"
                            title="Copy full UID"
                          >
                            <Copy size={11} />
                          </button>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subscription Badge & Expiry */}
                  <div className="flex items-center gap-3 flex-wrap lg:justify-end">
                    <div className="text-left lg:text-right space-y-0.5">
                      <div className="flex items-center lg:justify-end gap-1.5">
                        {isLifetime ? (
                          <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 font-black text-xs">
                            <Sparkles size={12} className="mr-1" /> Lifetime Access
                          </Badge>
                        ) : isExp ? (
                          <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 font-black text-xs">
                            <Clock size={12} className="mr-1" /> Expired
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-black text-xs">
                            <CheckCircle2 size={12} className="mr-1" /> Active
                          </Badge>
                        )}
                        <span className="text-xs font-bold text-zinc-300">
                          {u.subscriptionPlan ? u.subscriptionPlan.toUpperCase() : 'STANDARD'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        {isLifetime 
                          ? 'No expiration date' 
                          : expDate 
                            ? `Expires: ${format(expDate, 'dd MMM yyyy')}`
                            : 'No active plan'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Action Toolbar */}
                <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-2 flex-wrap">
                  {/* Left: Quick Subscription Grants */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      onClick={() => handleGrantSubscription(u, '1year')}
                      disabled={isUpdatingSub}
                      className="text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl px-3 py-1.5"
                    >
                      <Award size={13} className="mr-1.5 text-amber-400" />
                      +1 Year Sub
                    </Button>
                    <Button
                      onClick={() => handleGrantSubscription(u, '6months')}
                      disabled={isUpdatingSub}
                      className="text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl px-3 py-1.5"
                    >
                      +6 Months
                    </Button>
                    <Button
                      onClick={() => handleGrantSubscription(u, 'lifetime')}
                      disabled={isUpdatingSub}
                      className="text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl px-3 py-1.5"
                    >
                      <Sparkles size={13} className="mr-1.5 text-indigo-400" />
                      Lifetime
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSubscriptionUser(u);
                        setShowSubscriptionModal(true);
                      }}
                      className="text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl px-3 py-1.5"
                    >
                      <Sliders size={13} className="mr-1.5" />
                      Custom...
                    </Button>
                  </div>

                  {/* Right: Data Migration & Inspection */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      onClick={() => {
                        setSourceUser(u);
                        setTargetUserId('');
                        setMigrationResult(null);
                        setShowMigrationModal(true);
                      }}
                      className="text-xs font-bold bg-gold-500/15 hover:bg-gold-500/25 text-gold-300 border border-gold-500/30 rounded-xl px-3 py-1.5"
                    >
                      <Copy size={13} className="mr-1.5 text-gold-400" />
                      Clone / Transfer Data...
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleInspectUser(u)}
                      className="text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl px-3 py-1.5"
                    >
                      <Eye size={13} className="mr-1.5 text-zinc-400" />
                      Inspect Records
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleExportUserBackup(u)}
                      className="text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl px-2.5 py-1.5"
                      title="Download JSON Backup"
                    >
                      <Download size={13} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. CUSTOM SUBSCRIPTION MODAL */}
      {/* ========================================================================= */}
      {showSubscriptionModal && subscriptionUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">
                    Manage Subscription
                  </h3>
                  <p className="text-xs text-zinc-400">{subscriptionUser.displayName} ({subscriptionUser.email})</p>
                </div>
              </div>
              <button onClick={() => setShowSubscriptionModal(false)} className="text-zinc-500 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Select Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSubDurationType('1year')}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all",
                      subDurationType === '1year' ? "bg-amber-500/20 border-amber-500 text-amber-300" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                    )}
                  >
                    <p className="text-xs font-black">+1 Year (Annual)</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">365 days extension</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubDurationType('6months')}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all",
                      subDurationType === '6months' ? "bg-amber-500/20 border-amber-500 text-amber-300" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                    )}
                  >
                    <p className="text-xs font-black">+6 Months</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Half-year breeder plan</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubDurationType('1month')}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all",
                      subDurationType === '1month' ? "bg-amber-500/20 border-amber-500 text-amber-300" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                    )}
                  >
                    <p className="text-xs font-black">+1 Month</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">30 days extension</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubDurationType('lifetime')}
                    className={cn(
                      "p-3 rounded-2xl border text-left transition-all",
                      subDurationType === 'lifetime' ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                    )}
                  >
                    <p className="text-xs font-black">Lifetime VIP</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Never expires (2099)</p>
                  </button>
                </div>
              </div>

              {/* Custom Date Input if selected */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Custom Specific Expiry Date</label>
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setSubDurationType('custom');
                  }}
                  className="bg-zinc-900 border-zinc-800 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Plan Label / Tier Name</label>
                <Input
                  type="text"
                  value={customPlanName}
                  onChange={(e) => setCustomPlanName(e.target.value)}
                  placeholder="e.g. Annual Breeder Pro, VIP Sponsor..."
                  className="bg-zinc-900 border-zinc-800 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <Button variant="secondary" onClick={() => setShowSubscriptionModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                onClick={() => handleGrantSubscription(subscriptionUser, subDurationType, customDate, customPlanName)}
                disabled={isUpdatingSub}
                className="text-xs font-bold bg-amber-500 text-black hover:bg-amber-400"
              >
                {isUpdatingSub ? 'Saving...' : 'Apply Subscription'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DATA MIGRATION & ACCOUNT CLONING MODAL */}
      {/* ========================================================================= */}
      {showMigrationModal && sourceUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center">
                  <Copy size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">
                    Copy / Migrate User Data & Tier
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Duplicate aviary records and subscription from one account to another
                  </p>
                </div>
              </div>
              <button onClick={() => setShowMigrationModal(false)} className="text-zinc-500 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            {/* Source & Destination Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/80">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-gold-400 tracking-wider">Source Account (Origin)</span>
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-white truncate">{sourceUser.displayName}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{sourceUser.email}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">UID: {sourceUser.uid.substring(0, 14)}...</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Destination Account (Target) *</span>
                <Select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs w-full"
                >
                  <option value="">-- Select Target Account --</option>
                  {usersList
                    .filter(u => u.uid !== sourceUser.uid)
                    .map(u => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName} ({u.email})
                      </option>
                    ))}
                </Select>
                <p className="text-[10px] text-zinc-500">Or paste target UID manually:</p>
                <Input
                  type="text"
                  placeholder="Paste target UID directly if not in list..."
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs h-8"
                />
              </div>
            </div>

            {/* Checklist of what to copy */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-zinc-400 tracking-wider">Data to Clone & Remap</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl cursor-pointer hover:bg-zinc-900">
                  <input
                    type="checkbox"
                    checked={migrationOptions.includeBirds}
                    onChange={e => setMigrationOptions(prev => ({ ...prev, includeBirds: e.target.checked }))}
                    className="rounded accent-gold-500"
                  />
                  <Feather size={14} className="text-gold-400" />
                  <span className="text-zinc-200">Birds & Specifications</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl cursor-pointer hover:bg-zinc-900">
                  <input
                    type="checkbox"
                    checked={migrationOptions.remapPedigrees}
                    onChange={e => setMigrationOptions(prev => ({ ...prev, remapPedigrees: e.target.checked }))}
                    className="rounded accent-gold-500"
                  />
                  <Layers size={14} className="text-indigo-400" />
                  <span className="text-zinc-200">Pedigree Trees & Bloodline Links</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl cursor-pointer hover:bg-zinc-900">
                  <input
                    type="checkbox"
                    checked={migrationOptions.includeCages}
                    onChange={e => setMigrationOptions(prev => ({ ...prev, includeCages: e.target.checked }))}
                    className="rounded accent-gold-500"
                  />
                  <Home size={14} className="text-blue-400" />
                  <span className="text-zinc-200">Cages & Aviary Enclosures</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl cursor-pointer hover:bg-zinc-900">
                  <input
                    type="checkbox"
                    checked={migrationOptions.includePairs}
                    onChange={e => setMigrationOptions(prev => ({ ...prev, includePairs: e.target.checked }))}
                    className="rounded accent-gold-500"
                  />
                  <Heart size={14} className="text-rose-400" />
                  <span className="text-zinc-200">Mating Pairs & Breeding Records</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl cursor-pointer hover:bg-zinc-900">
                  <input
                    type="checkbox"
                    checked={migrationOptions.includeTransactions}
                    onChange={e => setMigrationOptions(prev => ({ ...prev, includeTransactions: e.target.checked }))}
                    className="rounded accent-gold-500"
                  />
                  <DollarSign size={14} className="text-emerald-400" />
                  <span className="text-zinc-200">Financial Records & Ledger</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl cursor-pointer hover:bg-zinc-900">
                  <input
                    type="checkbox"
                    checked={migrationOptions.includeCustomSpeciesAndMutations}
                    onChange={e => setMigrationOptions(prev => ({ ...prev, includeCustomSpeciesAndMutations: e.target.checked }))}
                    className="rounded accent-gold-500"
                  />
                  <Award size={14} className="text-amber-400" />
                  <span className="text-zinc-200">Custom Species, Mutations & Subscription Tier</span>
                </label>
              </div>
            </div>

            {/* Migration progress or result */}
            {isMigrating && (
              <div className="p-4 bg-gold-500/10 border border-gold-500/30 rounded-2xl space-y-2 text-center">
                <RefreshCw size={24} className="animate-spin text-gold-400 mx-auto" />
                <p className="text-xs font-bold text-gold-300">{migrationProgress}</p>
              </div>
            )}

            {migrationResult && (
              <div className={cn(
                "p-4 rounded-2xl border space-y-2",
                migrationResult.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              )}>
                <p className="text-xs font-bold">{migrationResult.summary}</p>
                {migrationResult.counts && (
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-zinc-300">
                    <span className="bg-zinc-900 px-2 py-0.5 rounded">Birds: {migrationResult.counts.birds}</span>
                    <span className="bg-zinc-900 px-2 py-0.5 rounded">Cages: {migrationResult.counts.cages}</span>
                    <span className="bg-zinc-900 px-2 py-0.5 rounded">Pairs: {migrationResult.counts.pairs}</span>
                    <span className="bg-zinc-900 px-2 py-0.5 rounded">Clutches: {migrationResult.counts.breedingRecords}</span>
                    <span className="bg-zinc-900 px-2 py-0.5 rounded">Transactions: {migrationResult.counts.transactions}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <Button variant="secondary" onClick={() => setShowMigrationModal(false)} className="text-xs">
                Close
              </Button>
              <Button
                onClick={handleExecuteMigration}
                disabled={isMigrating || !targetUserId}
                className="text-xs font-bold bg-gold-500 text-black hover:bg-gold-400"
              >
                {isMigrating ? 'Migrating Records...' : 'Start Data Cloning'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. INSPECT USER AVIARY DATA MODAL */}
      {/* ========================================================================= */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Eye size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">
                    Aviary Explorer: {inspectUser.displayName}
                  </h3>
                  <p className="text-xs text-zinc-400">{inspectUser.email} • UID: {inspectUser.uid}</p>
                </div>
              </div>
              <button onClick={() => setInspectUser(null)} className="text-zinc-500 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            {isLoadingInspect ? (
              <div className="p-12 text-center text-zinc-400 space-y-3">
                <RefreshCw size={28} className="animate-spin text-gold-400 mx-auto" />
                <p className="text-xs">Fetching aviary documents from Firestore...</p>
              </div>
            ) : inspectData ? (
              <div className="space-y-4">
                {/* Summary counts */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
                    <p className="text-xl font-black text-white">{inspectData.birds.length}</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Birds</p>
                  </div>
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
                    <p className="text-xl font-black text-white">{inspectData.cages.length}</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Cages</p>
                  </div>
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
                    <p className="text-xl font-black text-white">{inspectData.pairs.length}</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Pairs</p>
                  </div>
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
                    <p className="text-xl font-black text-white">{inspectData.breedingRecords.length}</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Clutches</p>
                  </div>
                </div>

                {/* Sample birds list */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
                    Birds Preview (showing up to 10)
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {inspectData.birds.slice(0, 10).map((b) => (
                      <div key={b.id} className="p-2.5 bg-zinc-900/80 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-white">{b.name} ({b.species})</p>
                          <p className="text-[11px] text-zinc-400">Sex: {b.sex} • Ring: {b.ringNumber || 'None'}</p>
                        </div>
                        {b.mutations && b.mutations.length > 0 && (
                          <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                            {b.mutations.join(', ')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end pt-3 border-t border-zinc-800">
              <Button variant="secondary" onClick={() => setInspectUser(null)} className="text-xs">
                Close Explorer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
