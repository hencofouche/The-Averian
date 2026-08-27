import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Shield, Calendar, Award, RefreshCw, Copy, 
  ArrowRight, Download, Upload, Check, AlertCircle, Clock, 
  Sliders, UserCheck, CheckCircle2, ChevronRight, Eye, 
  FileJson, Sparkles, Feather, Home, Heart, FileSpreadsheet, 
  DollarSign, CheckSquare, Layers, Lock, Unlock, Zap, X, Info,
  ShieldAlert, Mail, AlertTriangle, UserX, Trash2, HelpCircle
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
  query, where, addDoc, deleteDoc
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
  isBetaTester?: boolean;
  canTestComingSoon?: boolean;
  betaTesterGrantedBy?: string;
  betaTesterGrantedAt?: string;
  lastLoginAt?: string;
  createdAt?: string;
  isBanned?: boolean;
  banReason?: string;
  bannedAt?: string;
  bannedBy?: string;
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'testers' | 'registered' | 'unregistered' | 'active' | 'expired' | 'trial' | 'yearly' | 'lifetime' | 'banned' | 'admins'>('all');
  
  // Delete Modal State
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserWithDetails | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Subscription Modal State
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionUser, setSubscriptionUser] = useState<UserWithDetails | null>(null);
  const [subDurationType, setSubDurationType] = useState<'1year' | '6months' | '1month' | 'lifetime' | 'custom' | 'trial30'>('1year');
  const [customDate, setCustomDate] = useState(format(addYears(new Date(), 1), 'yyyy-MM-dd'));
  const [customPlanName, setCustomPlanName] = useState('Annual Breeder Pro');
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);

  // Ban / Suspend Modal State
  const [showBanModal, setShowBanModal] = useState(false);
  const [banTargetUser, setBanTargetUser] = useState<UserWithDetails | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [isBanning, setIsBanning] = useState(false);

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
        const email = data.email || '';
        usersMap.set(d.id, {
          uid: d.id,
          email: email,
          displayName: data.displayName || (email ? email.split('@')[0] : '') || 'Breeder',
          photoURL: data.photoURL,
          role: data.role === 'admin' ? 'admin' : 'user',
          aviaryName: data.aviaryName,
          currency: data.currency,
          account_expiry_date: data.account_expiry_date,
          subscriptionPlan: data.subscriptionPlan,
          subscriptionGrantedBy: data.subscriptionGrantedBy,
          subscribedAt: data.subscribedAt,
          isBetaTester: data.isBetaTester === true || data.canTestComingSoon === true,
          canTestComingSoon: data.canTestComingSoon === true || data.isBetaTester === true,
          betaTesterGrantedBy: data.betaTesterGrantedBy,
          betaTesterGrantedAt: data.betaTesterGrantedAt,
          lastLoginAt: data.lastLoginAt,
          createdAt: data.createdAt,
          isBanned: data.isBanned === true,
          banReason: data.banReason,
          bannedAt: data.bannedAt,
          bannedBy: data.bannedBy
        });
      });

      // 2. Fetch from 'userSettings' to capture all existing accounts
      const settingsSnap = await getDocs(collection(db, 'userSettings'));
      settingsSnap.forEach((d) => {
        const data = d.data() as UserSettings;
        const uid = data.uid || d.id;
        const existing = usersMap.get(uid);

        const isBanned = data.isBanned === true || (existing && existing.isBanned === true);
        const banReason = data.banReason || (existing ? existing.banReason : undefined);
        const bannedAt = data.bannedAt || (existing ? existing.bannedAt : undefined);
        const bannedBy = data.bannedBy || (existing ? existing.bannedBy : undefined);
        const email = existing?.email || data.email || '';
        const isBetaTester = data.isBetaTester === true || data.canTestComingSoon === true || (existing && existing.isBetaTester === true);
        const betaTesterGrantedBy = data.betaTesterGrantedBy || (existing ? existing.betaTesterGrantedBy : undefined);
        const betaTesterGrantedAt = data.betaTesterGrantedAt || (existing ? existing.betaTesterGrantedAt : undefined);

        if (existing) {
          // Calculate best expiry date between existing (users col) and data (userSettings col)
          let bestExpiry = existing.account_expiry_date;
          if (data.account_expiry_date) {
            if (!bestExpiry) {
              bestExpiry = data.account_expiry_date;
            } else {
              const exp1 = new Date(existing.account_expiry_date);
              const exp2 = new Date(data.account_expiry_date);
              if (exp2.getFullYear() > 2090 || exp2 > exp1) {
                bestExpiry = data.account_expiry_date;
              }
            }
          }

          const mergedSubPlan = (existing.subscriptionPlan === 'lifetime' || data.subscriptionPlan === 'lifetime') 
            ? 'lifetime' 
            : (existing.subscriptionPlan || data.subscriptionPlan);

          usersMap.set(uid, {
            ...existing,
            email: email,
            displayName: existing.displayName || data.displayName || (email ? email.split('@')[0] : '') || data.aviaryName || 'Breeder',
            aviaryName: existing.aviaryName || data.aviaryName,
            currency: existing.currency || data.currency,
            account_expiry_date: bestExpiry,
            subscriptionPlan: mergedSubPlan,
            subscriptionGrantedBy: data.subscriptionGrantedBy || existing.subscriptionGrantedBy,
            subscribedAt: data.subscribedAt || existing.subscribedAt,
            isBetaTester,
            canTestComingSoon: isBetaTester,
            betaTesterGrantedBy,
            betaTesterGrantedAt,
            role: (data.role === 'admin' || existing.role === 'admin') ? 'admin' : 'user',
            isBanned,
            banReason,
            bannedAt,
            bannedBy,
            settings: data
          });
        } else {
          usersMap.set(uid, {
            uid,
            email: email,
            displayName: data.displayName || (email ? email.split('@')[0] : '') || data.aviaryName || 'Breeder',
            role: data.role === 'admin' ? 'admin' : 'user',
            aviaryName: data.aviaryName,
            currency: data.currency,
            account_expiry_date: data.account_expiry_date,
            subscriptionPlan: data.subscriptionPlan,
            subscriptionGrantedBy: data.subscriptionGrantedBy,
            subscribedAt: data.subscribedAt,
            isBetaTester,
            canTestComingSoon: isBetaTester,
            betaTesterGrantedBy,
            betaTesterGrantedAt,
            isBanned,
            banReason,
            bannedAt,
            bannedBy,
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
          if (!u.email && (data.email || (data as any).contactEmail)) {
            u.email = data.email || (data as any).contactEmail;
          }
          if (!u.displayName && data.sellerName) u.displayName = data.sellerName;
          if (!u.aviaryName && data.aviaryName) u.aviaryName = data.aviaryName;
        }
      });

      const list = Array.from(usersMap.values());
      // Sort: Admins first, then Real Registered Google Accounts (alphabetically by email), then Legacy/Ghost docs
      list.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (b.role === 'admin' && a.role !== 'admin') return 1;
        if (a.isBanned && !b.isBanned) return -1;
        if (b.isBanned && !a.isBanned) return 1;
        
        const aHasEmail = Boolean(a.email && a.email.trim());
        const bHasEmail = Boolean(b.email && b.email.trim());
        if (aHasEmail && !bHasEmail) return -1;
        if (!aHasEmail && bHasEmail) return 1;

        const aKey = (a.email || a.displayName || a.uid).toLowerCase();
        const bKey = (b.email || b.displayName || b.uid).toLowerCase();
        return aKey.localeCompare(bKey);
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
    let registeredCount = 0;
    let unregisteredCount = 0;
    let activeSubCount = 0;
    let expiredCount = 0;
    let lifetimeCount = 0;
    let yearlyCount = 0;
    let adminCount = 0;
    let bannedCount = 0;
    let betaTesterCount = 0;
    const now = new Date();

    usersList.forEach(u => {
      if (u.role === 'admin') adminCount++;
      if (u.isBanned) bannedCount++;
      if (u.isBetaTester || u.canTestComingSoon) betaTesterCount++;
      if (u.email && u.email.trim()) {
        registeredCount++;
      } else {
        unregisteredCount++;
      }

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

    return { total, registeredCount, unregisteredCount, activeSubCount, expiredCount, lifetimeCount, yearlyCount, adminCount, bannedCount, betaTesterCount };
  }, [usersList]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    const queryStr = searchQuery.toLowerCase().trim();
    const now = new Date();

    return usersList.filter(u => {
      // Status filter
      if (statusFilter === 'testers' && !u.isBetaTester && !u.canTestComingSoon) return false;
      if (statusFilter === 'registered' && (!u.email || !u.email.trim())) return false;
      if (statusFilter === 'unregistered' && (u.email && u.email.trim().length > 0)) return false;
      if (statusFilter === 'admins' && u.role !== 'admin') return false;
      if (statusFilter === 'banned' && !u.isBanned) return false;
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

      // Search query (Email, Name, Aviary, UID)
      if (queryStr) {
        const inEmail = (u.email || '').toLowerCase().includes(queryStr);
        const inName = (u.displayName || '').toLowerCase().includes(queryStr);
        const inAviary = (u.aviaryName || '').toLowerCase().includes(queryStr);
        const inUid = (u.uid || '').toLowerCase().includes(queryStr);
        return inEmail || inName || inAviary || inUid;
      }

      return true;
    });
  }, [usersList, searchQuery, statusFilter]);

  // Handle Granting / Revoking Beta Tester Permissions
  const handleToggleBetaTester = async (targetUser: UserWithDetails, allow: boolean) => {
    setIsUpdatingSub(true);
    try {
      const nowIso = new Date().toISOString();
      const adminEmail = currentUser?.email || 'Admin';

      // Update userSettings and users docs in parallel
      const settingsRef = doc(db, 'userSettings', targetUser.uid);
      const userRef = doc(db, 'users', targetUser.uid);

      // If granting beta access and user has no valid future expiry date, also auto-grant lifetime subscription
      const updatePayload: any = {
        isBetaTester: allow,
        canTestComingSoon: allow,
        betaTesterGrantedBy: allow ? adminEmail : null,
        betaTesterGrantedAt: allow ? nowIso : null,
        updatedAt: nowIso
      };

      if (allow && (!targetUser.account_expiry_date || new Date(targetUser.account_expiry_date) < new Date())) {
        updatePayload.account_expiry_date = '2099-12-31T23:59:59.000Z';
        updatePayload.subscriptionPlan = 'lifetime';
      }

      const results = await Promise.allSettled([
        setDoc(settingsRef, updatePayload, { merge: true }),
        setDoc(userRef, updatePayload, { merge: true })
      ]);

      const allRejected = results.every(r => r.status === 'rejected');
      if (allRejected) {
        const firstErr = (results[0] as PromiseRejectedResult).reason;
        throw firstErr || new Error("Permission denied updating user documents.");
      }

      // Update local state
      setUsersList(prev => prev.map(u => {
        if (u.uid === targetUser.uid) {
          return {
            ...u,
            isBetaTester: allow,
            canTestComingSoon: allow,
            account_expiry_date: updatePayload.account_expiry_date || u.account_expiry_date,
            subscriptionPlan: updatePayload.subscriptionPlan || u.subscriptionPlan,
            betaTesterGrantedBy: allow ? adminEmail : undefined,
            betaTesterGrantedAt: allow ? nowIso : undefined
          };
        }
        return u;
      }));

      if (allow) {
        toast.success(`🎉 Early Access Beta Testing granted to ${targetUser.email || targetUser.displayName}!`);
      } else {
        toast.success(`Early Access Beta Testing revoked from ${targetUser.email || targetUser.displayName}.`);
      }
      if (onRefreshParentData) onRefreshParentData();
    } catch (err: any) {
      console.error("Failed to update beta tester status:", err);
      toast.error('Failed to update tester permission: ' + (err.message || 'Missing permissions'));
    } finally {
      setIsUpdatingSub(false);
    }
  };

  // Handle Ban / Unban Action
  const handleToggleBan = async (targetUser: UserWithDetails, ban: boolean, reason?: string) => {
    setIsBanning(true);
    try {
      const banPayload = ban ? {
        isBanned: true,
        banReason: reason?.trim() || 'Violation of terms of service or community guidelines.',
        bannedAt: new Date().toISOString(),
        bannedBy: currentUser?.email || 'Admin'
      } : {
        isBanned: false,
        banReason: null,
        bannedAt: null,
        bannedBy: null
      };

      // Update both collections for immediate effect
      const banResults = await Promise.allSettled([
        setDoc(doc(db, 'users', targetUser.uid), banPayload, { merge: true }),
        setDoc(doc(db, 'userSettings', targetUser.uid), banPayload, { merge: true })
      ]);

      const allBanRejected = banResults.every(r => r.status === 'rejected');
      if (allBanRejected) {
        const firstErr = (banResults[0] as PromiseRejectedResult).reason;
        throw firstErr || new Error("Permission denied toggling ban status.");
      }

      // Update local state
      setUsersList(prev => prev.map(u => {
        if (u.uid === targetUser.uid) {
          return {
            ...u,
            isBanned: ban,
            banReason: ban ? (reason?.trim() || 'Violation of terms') : undefined,
            bannedAt: ban ? new Date().toISOString() : undefined,
            bannedBy: ban ? (currentUser?.email || 'Admin') : undefined,
            settings: u.settings ? { ...u.settings, isBanned: ban, banReason: ban ? reason : undefined } : undefined
          };
        }
        return u;
      }));

      if (ban) {
        toast.success(`User ${targetUser.email} has been suspended/banned.`);
      } else {
        toast.success(`User ${targetUser.email} has been unbanned and restored.`);
      }

      setShowBanModal(false);
      setBanTargetUser(null);
      setBanReasonInput('');
      if (onRefreshParentData) onRefreshParentData();
    } catch (err: any) {
      console.error("Failed to update user ban status:", err);
      toast.error('Failed to update ban status: ' + err.message);
    } finally {
      setIsBanning(false);
    }
  };

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

      // Update userSettings and users docs in parallel
      const settingsRef = doc(db, 'userSettings', targetUser.uid);
      const userRef = doc(db, 'users', targetUser.uid);

      const subResults = await Promise.allSettled([
        setDoc(settingsRef, {
          account_expiry_date: isoExpiry,
          subscriptionPlan: type === 'lifetime' ? 'lifetime' : (type === '1year' ? 'yearly' : 'monthly'),
          subscribedAt: new Date().toISOString(),
          subscriptionGrantedBy: `Admin (${currentUser?.email || 'Admin'})`
        }, { merge: true }),
        setDoc(userRef, {
          account_expiry_date: isoExpiry,
          subscriptionPlan: type === 'lifetime' ? 'lifetime' : (type === '1year' ? 'yearly' : 'monthly'),
          subscriptionGrantedBy: `Admin (${currentUser?.email || 'Admin'})`,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      ]);

      const allSubRejected = subResults.every(r => r.status === 'rejected');
      if (allSubRejected) {
        const firstErr = (subResults[0] as PromiseRejectedResult).reason;
        throw firstErr || new Error("Permission denied updating subscription.");
      }

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
        `Subscription extended for ${targetUser.email || targetUser.displayName}! Valid until ${format(newExpiry, 'dd MMM yyyy')}`
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

  // Handle Permanent Record Deletion (Ghost / Orphan cleanup)
  const handleDeleteUserRecord = async () => {
    if (!deleteTargetUser) return;
    setIsDeletingUser(true);
    try {
      // Delete userSettings, users, and sellerProfiles
      await deleteDoc(doc(db, 'userSettings', deleteTargetUser.uid)).catch(() => {});
      await deleteDoc(doc(db, 'users', deleteTargetUser.uid)).catch(() => {});
      if (deleteTargetUser.sellerProfile?.id) {
        await deleteDoc(doc(db, 'sellerProfiles', deleteTargetUser.sellerProfile.id)).catch(() => {});
      }
      
      setUsersList(prev => prev.filter(u => u.uid !== deleteTargetUser.uid));
      toast.success(`Account / document record (${deleteTargetUser.email || deleteTargetUser.displayName || deleteTargetUser.uid}) permanently deleted.`);
      setShowDeleteModal(false);
      setDeleteTargetUser(null);
      if (onRefreshParentData) onRefreshParentData();
    } catch (err: any) {
      console.error("Failed to delete user record:", err);
      toast.error('Failed to delete document: ' + err.message);
    } finally {
      setIsDeletingUser(false);
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
          subscriptionPlan: u.subscriptionPlan,
          isBanned: u.isBanned,
          banReason: u.banReason
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
      toast.error('Source and destination accounts must be different');
      return;
    }

    const targetUserObj = usersList.find(u => u.uid === targetUserId.trim() || u.email.toLowerCase() === targetUserId.trim().toLowerCase());
    const finalTargetUid = targetUserObj ? targetUserObj.uid : targetUserId.trim();

    setIsMigrating(true);
    setMigrationProgress('Initializing migration...');
    setMigrationResult(null);

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
      const birdIdMap = new Map<string, string>();
      const cageIdMap = new Map<string, string>();
      const pairIdMap = new Map<string, string>();

      // 1. Cages
      if (migrationOptions.includeCages) {
        setMigrationProgress('Migrating aviary cages...');
        const cagesSnap = await getDocs(query(collection(db, 'cages'), where('uid', '==', sourceUser.uid)));
        for (const d of cagesSnap.docs) {
          const cData = d.data();
          const newDocRef = await addDoc(collection(db, 'cages'), {
            ...cData,
            uid: finalTargetUid,
            migratedFrom: sourceUser.uid,
            migratedAt: new Date().toISOString()
          });
          cageIdMap.set(d.id, newDocRef.id);
          counts.cages++;
        }
      }

      // 2. Birds
      if (migrationOptions.includeBirds) {
        setMigrationProgress('Migrating flock records & genetic profiles...');
        const birdsSnap = await getDocs(query(collection(db, 'birds'), where('uid', '==', sourceUser.uid)));
        for (const d of birdsSnap.docs) {
          const bData = d.data();
          const remappedCageId = bData.cageId && cageIdMap.has(bData.cageId) ? cageIdMap.get(bData.cageId) : bData.cageId;
          const newDocRef = await addDoc(collection(db, 'birds'), {
            ...bData,
            uid: finalTargetUid,
            cageId: remappedCageId || null,
            fatherId: null,
            motherId: null,
            mateId: null,
            migratedFrom: sourceUser.uid,
            migratedAt: new Date().toISOString()
          });
          birdIdMap.set(d.id, newDocRef.id);
          counts.birds++;
        }

        // Remap pedigree linkages
        if (migrationOptions.remapPedigrees && counts.birds > 0) {
          setMigrationProgress('Remapping pedigree trees and lineage relationships...');
          for (const d of birdsSnap.docs) {
            const bData = d.data();
            const newBirdId = birdIdMap.get(d.id);
            if (!newBirdId) continue;

            const remappedFather = bData.fatherId && birdIdMap.has(bData.fatherId) ? birdIdMap.get(bData.fatherId) : bData.fatherId || null;
            const remappedMother = bData.motherId && birdIdMap.has(bData.motherId) ? birdIdMap.get(bData.motherId) : bData.motherId || null;
            const remappedMate = bData.mateId && birdIdMap.has(bData.mateId) ? birdIdMap.get(bData.mateId) : bData.mateId || null;

            if (remappedFather || remappedMother || remappedMate) {
              await updateDoc(doc(db, 'birds', newBirdId), {
                fatherId: remappedFather,
                motherId: remappedMother,
                mateId: remappedMate
              });
            }
          }
        }
      }

      // 3. Pairs
      if (migrationOptions.includePairs) {
        setMigrationProgress('Migrating breeding pairs...');
        const pairsSnap = await getDocs(query(collection(db, 'pairs'), where('uid', '==', sourceUser.uid)));
        for (const d of pairsSnap.docs) {
          const pData = d.data();
          const remappedMale = pData.maleId && birdIdMap.has(pData.maleId) ? birdIdMap.get(pData.maleId) : pData.maleId;
          const remappedFemale = pData.femaleId && birdIdMap.has(pData.femaleId) ? birdIdMap.get(pData.femaleId) : pData.femaleId;
          const remappedCage = pData.cageId && cageIdMap.has(pData.cageId) ? cageIdMap.get(pData.cageId) : pData.cageId;

          const newDocRef = await addDoc(collection(db, 'pairs'), {
            ...pData,
            uid: finalTargetUid,
            maleId: remappedMale,
            femaleId: remappedFemale,
            cageId: remappedCage || null,
            migratedFrom: sourceUser.uid,
            migratedAt: new Date().toISOString()
          });
          pairIdMap.set(d.id, newDocRef.id);
          counts.pairs++;
        }
      }

      // 4. Breeding Records / Clutches
      if (migrationOptions.includeBreedingRecords) {
        setMigrationProgress('Migrating clutch histories and egg logs...');
        const clutchesSnap = await getDocs(query(collection(db, 'breedingRecords'), where('uid', '==', sourceUser.uid)));
        for (const d of clutchesSnap.docs) {
          const cData = d.data();
          const remappedPair = cData.pairId && pairIdMap.has(cData.pairId) ? pairIdMap.get(cData.pairId) : cData.pairId;
          const remappedCage = cData.cageId && cageIdMap.has(cData.cageId) ? cageIdMap.get(cData.cageId) : cData.cageId;

          await addDoc(collection(db, 'breedingRecords'), {
            ...cData,
            uid: finalTargetUid,
            pairId: remappedPair || null,
            cageId: remappedCage || null,
            migratedFrom: sourceUser.uid,
            migratedAt: new Date().toISOString()
          });
          counts.breedingRecords++;
        }
      }

      // 5. Financials
      if (migrationOptions.includeTransactions) {
        setMigrationProgress('Migrating transactions and ledger...');
        const transSnap = await getDocs(query(collection(db, 'transactions'), where('uid', '==', sourceUser.uid)));
        for (const d of transSnap.docs) {
          const tData = d.data();
          const remappedBird = tData.birdId && birdIdMap.has(tData.birdId) ? birdIdMap.get(tData.birdId) : tData.birdId;
          await addDoc(collection(db, 'transactions'), {
            ...tData,
            uid: finalTargetUid,
            birdId: remappedBird || null,
            migratedFrom: sourceUser.uid,
            migratedAt: new Date().toISOString()
          });
          counts.transactions++;
        }
      }

      // 6. Tasks
      if (migrationOptions.includeTasks) {
        setMigrationProgress('Migrating tasks...');
        const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('uid', '==', sourceUser.uid)));
        for (const d of tasksSnap.docs) {
          await addDoc(collection(db, 'tasks'), {
            ...d.data(),
            uid: finalTargetUid,
            migratedFrom: sourceUser.uid,
            migratedAt: new Date().toISOString()
          });
          counts.tasks++;
        }
      }

      // 7. Contacts
      if (migrationOptions.includeContacts) {
        setMigrationProgress('Migrating contact address book...');
        const contactsSnap = await getDocs(query(collection(db, 'contacts'), where('uid', '==', sourceUser.uid)));
        for (const d of contactsSnap.docs) {
          await addDoc(collection(db, 'contacts'), {
            ...d.data(),
            uid: finalTargetUid,
            migratedFrom: sourceUser.uid,
            migratedAt: new Date().toISOString()
          });
          counts.contacts++;
        }
      }

      // 8. Custom Species / Mutations / Settings
      if (migrationOptions.includeCustomSpeciesAndMutations && sourceUser.settings) {
        setMigrationProgress('Cloning custom species, mutations & subscription tier...');
        const s = sourceUser.settings;
        await setDoc(doc(db, 'userSettings', finalTargetUid), {
          species: s.species || [],
          subspecies: s.subspecies || [],
          mutations: s.mutations || [],
          account_expiry_date: s.account_expiry_date || null,
          subscriptionPlan: s.subscriptionPlan || 'standard',
          currency: s.currency || 'USD',
          language: s.language || 'en',
          migratedFrom: sourceUser.uid,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setMigrationResult({
        success: true,
        summary: `Successfully cloned aviary records from ${sourceUser.displayName} to target user ${finalTargetUid}!`,
        counts
      });
      toast.success(`Data cloning complete! Transferred ${counts.birds} birds and ${counts.cages} cages.`);
    } catch (err: any) {
      console.error("Migration failed:", err);
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
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
            <Users size={14} className="text-gold-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Total</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">{stats.total}</p>
        </Card>

        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Subs</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400">{stats.activeSubCount}</p>
        </Card>

        <Card className="p-3.5 bg-zinc-950/80 border-indigo-500/30 bg-indigo-950/10">
          <div className="flex items-center gap-1.5 text-indigo-300 mb-1">
            <Sparkles size={14} className="text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Testers</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-indigo-400">{stats.betaTesterCount}</p>
        </Card>

        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
            <Award size={14} className="text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Yearly</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-400">{stats.yearlyCount}</p>
        </Card>

        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
            <Sparkles size={14} className="text-indigo-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Lifetime</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-indigo-400">{stats.lifetimeCount}</p>
        </Card>

        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
            <Clock size={14} className="text-zinc-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Expired</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-zinc-400">{stats.expiredCount}</p>
        </Card>

        <Card className="p-3.5 bg-zinc-950/80 border-rose-900/30">
          <div className="flex items-center gap-1.5 text-rose-400 mb-1">
            <ShieldAlert size={14} className="text-rose-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Banned</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-500">{stats.bannedCount}</p>
        </Card>

        <Card className="p-3.5 bg-zinc-950/80 border-zinc-800">
          <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
            <Shield size={14} className="text-purple-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Admins</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-400">{stats.adminCount}</p>
        </Card>
      </div>

      {/* Control Bar: Search, Filters, Refresh */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 items-center gap-2.5 bg-zinc-900/90 border border-zinc-800 rounded-2xl px-3.5 py-2.5 shadow-inner">
          <Search size={18} className="text-gold-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by user email, name, UID, or aviary name..."
            className="w-full bg-transparent border-none text-sm text-white focus:outline-none placeholder:text-zinc-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-white p-1">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0",
              statusFilter === 'all' ? "bg-gold-500 text-black shadow-md" : "bg-zinc-900 text-zinc-400 hover:text-white"
            )}
          >
            All ({usersList.length})
          </button>
          <button
            onClick={() => setStatusFilter('testers')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 flex items-center gap-1",
              statusFilter === 'testers' ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" : "bg-zinc-900 text-zinc-400 hover:text-indigo-400"
            )}
          >
            <Sparkles size={12} />
            Beta Testers ({stats.betaTesterCount})
          </button>
          <button
            onClick={() => setStatusFilter('registered')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0",
              statusFilter === 'registered' ? "bg-emerald-500 text-black shadow-md" : "bg-zinc-900 text-zinc-400 hover:text-emerald-400"
            )}
          >
            Google Accounts ({stats.registeredCount})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0",
              statusFilter === 'active' ? "bg-emerald-600 text-white shadow-md" : "bg-zinc-900 text-zinc-400 hover:text-emerald-400"
            )}
          >
            Active ({stats.activeSubCount})
          </button>
          <button
            onClick={() => setStatusFilter('yearly')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0",
              statusFilter === 'yearly' ? "bg-amber-500 text-black shadow-md" : "bg-zinc-900 text-zinc-400 hover:text-amber-400"
            )}
          >
            Yearly
          </button>
          <button
            onClick={() => setStatusFilter('lifetime')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0",
              statusFilter === 'lifetime' ? "bg-indigo-500 text-white shadow-md" : "bg-zinc-900 text-zinc-400 hover:text-indigo-400"
            )}
          >
            Lifetime
          </button>
          <button
            onClick={() => setStatusFilter('expired')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0",
              statusFilter === 'expired' ? "bg-zinc-700 text-white shadow-md" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            )}
          >
            Expired ({stats.expiredCount})
          </button>
          {stats.unregisteredCount > 0 && (
            <button
              onClick={() => setStatusFilter('unregistered')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0",
                statusFilter === 'unregistered' ? "bg-amber-600 text-white shadow-md" : "bg-zinc-900 text-zinc-400 hover:text-amber-300"
              )}
            >
              Legacy / Ghost Docs ({stats.unregisteredCount})
            </button>
          )}
          <button
            onClick={() => setStatusFilter('banned')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0",
              statusFilter === 'banned' ? "bg-rose-600 text-white shadow-md" : "bg-zinc-900 text-zinc-400 hover:text-rose-400"
            )}
          >
            Banned ({stats.bannedCount})
          </button>
          <button
            onClick={() => setStatusFilter('admins')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0",
              statusFilter === 'admins' ? "bg-purple-500 text-white shadow-md" : "bg-zinc-900 text-zinc-400 hover:text-purple-400"
            )}
          >
            Admins
          </button>
          <Button
            variant="secondary"
            onClick={fetchAllUsers}
            disabled={isLoading}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl shrink-0"
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
            const isTester = u.isBetaTester === true || u.canTestComingSoon === true;
            const isLifetime = u.subscriptionPlan === 'lifetime' || 
                              u.role === 'admin' || 
                              isTester || 
                              (u.account_expiry_date && new Date(u.account_expiry_date).getFullYear() > 2090);
            const isExp = isLifetime ? false : (u.account_expiry_date ? isBefore(new Date(u.account_expiry_date), new Date()) : true);
            const expDate = u.account_expiry_date ? new Date(u.account_expiry_date) : null;

            return (
              <Card 
                key={u.uid}
                className={cn(
                  "p-4 sm:p-5 bg-zinc-950 border transition-all rounded-2xl space-y-3",
                  u.isBanned ? "border-rose-500/40 bg-rose-950/10 hover:border-rose-500" : (isTester ? "border-indigo-500/40 bg-indigo-950/5 hover:border-indigo-500/60" : "border-zinc-800/80 hover:border-zinc-700")
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* User Profile Info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 overflow-hidden shadow-md",
                      u.isBanned ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" : (isTester ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40" : "bg-zinc-900 border border-zinc-800 text-gold-400")
                    )}>
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        u.displayName.substring(0, 2).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      {/* Name and Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-white text-base truncate">
                          {u.displayName}
                        </span>

                        {isTester && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <Sparkles size={10} className="text-indigo-400" /> BETA TESTER
                          </span>
                        )}

                        {u.isBanned && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <ShieldAlert size={10} /> SUSPENDED / BANNED
                          </span>
                        )}

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

                        {u.email ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={10} /> GOOGLE ACCOUNT
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <HelpCircle size={10} /> LEGACY / UNLINKED DOC
                          </span>
                        )}
                      </div>

                      {/* Prominent Real Email Address & UID */}
                      <div className="flex items-center gap-2.5 text-xs flex-wrap">
                        {u.email ? (
                          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-lg text-gold-300 font-semibold">
                            <Mail size={12} className="text-gold-400" />
                            <span>{u.email}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(u.email);
                                toast.success('Email copied to clipboard!');
                              }}
                              className="ml-1 text-zinc-500 hover:text-white inline-block"
                              title="Copy user email"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-zinc-900/60 border border-dashed border-zinc-800 px-2.5 py-0.5 rounded-lg text-zinc-500 font-medium">
                            <Mail size={12} className="text-zinc-600" />
                            <span className="italic">No registered Google email</span>
                          </div>
                        )}

                        {u.aviaryName && (
                          <span className="text-zinc-400">
                            Aviary: <strong className="text-white">{u.aviaryName}</strong>
                          </span>
                        )}

                        <span className="text-zinc-500 font-mono text-[11px]">
                          UID: {u.uid.substring(0, 8)}...
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(u.uid);
                              toast.success('UID copied to clipboard!');
                            }}
                            className="ml-1 text-zinc-500 hover:text-white inline-block"
                            title="Copy full UID"
                          >
                            <Copy size={10} />
                          </button>
                        </span>
                      </div>

                      {/* If Banned: Show Reason */}
                      {u.isBanned && (
                        <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5 mt-1">
                          <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                          <span><strong>Ban Reason:</strong> {u.banReason || 'Administrative suspension'}</span>
                          {u.bannedAt && (
                            <span className="text-rose-400/80 ml-auto">({format(new Date(u.bannedAt), 'dd MMM yyyy')})</span>
                          )}
                        </div>
                      )}
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
                          <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 font-black text-xs">
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
                <div className="pt-2.5 border-t border-zinc-900 flex items-center justify-between gap-2 flex-wrap">
                  {/* Left: Quick Subscription Grants & Beta Tester Toggle */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Beta Tester Toggle Button */}
                    <Button
                      onClick={() => handleToggleBetaTester(u, !isTester)}
                      disabled={isUpdatingSub}
                      className={cn(
                        "text-xs font-bold rounded-xl px-3 py-1.5 border transition-all",
                        isTester 
                          ? "bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border-indigo-500/40"
                          : "bg-zinc-900 hover:bg-indigo-950/40 text-zinc-400 hover:text-indigo-300 border-zinc-800 hover:border-indigo-500/30"
                      )}
                      title={isTester ? "Revoke Early Access Beta Testing permissions" : "Grant access to test Coming Soon modules"}
                    >
                      <Sparkles size={13} className={cn("mr-1.5", isTester ? "text-indigo-400" : "text-zinc-500")} />
                      {isTester ? "Beta Tester: Active" : "Grant Beta Access"}
                    </Button>

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

                  {/* Right: Ban/Unban, Data Migration & Inspection */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Ban / Unban Button */}
                    {u.isBanned ? (
                      <Button
                        onClick={() => handleToggleBan(u, false)}
                        disabled={isBanning}
                        className="text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl px-3 py-1.5"
                      >
                        <Unlock size={13} className="mr-1.5 text-emerald-400" />
                        Unban Account
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          setBanTargetUser(u);
                          setBanReasonInput('');
                          setShowBanModal(true);
                        }}
                        disabled={isBanning || u.role === 'admin'}
                        className="text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-xl px-3 py-1.5"
                        title={u.role === 'admin' ? "Cannot ban administrators" : "Suspend user account"}
                      >
                        <Lock size={13} className="mr-1.5 text-rose-400" />
                        Ban / Suspend
                      </Button>
                    )}

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
                      Clone Data...
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleInspectUser(u)}
                      className="text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl px-3 py-1.5"
                    >
                      <Eye size={13} className="mr-1.5 text-zinc-400" />
                      Inspect
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleExportUserBackup(u)}
                      className="text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl px-2.5 py-1.5"
                      title="Download JSON Backup"
                    >
                      <Download size={13} />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setDeleteTargetUser(u);
                        setShowDeleteModal(true);
                      }}
                      className="text-xs font-bold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-xl px-2.5 py-1.5"
                      title="Permanently remove this user record/document"
                    >
                      <Trash2 size={13} className="mr-1 text-rose-400" />
                      Purge
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
                  <p className="text-xs text-gold-300 font-mono">{subscriptionUser.email}</p>
                </div>
              </div>
              <button onClick={() => setShowSubscriptionModal(false)} className="text-zinc-500 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">User Account:</span>
                <span className="font-bold text-white">{subscriptionUser.displayName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Target Email:</span>
                <span className="font-mono text-gold-400">{subscriptionUser.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Current Expiration:</span>
                <span className="text-zinc-300">
                  {subscriptionUser.account_expiry_date 
                    ? format(new Date(subscriptionUser.account_expiry_date), 'dd MMMM yyyy') 
                    : 'No active expiration'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Select Extension Duration</label>
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
                <label className="text-xs font-bold text-zinc-400">Or Set Custom Expiration Date</label>
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
                onClick={() => handleGrantSubscription(
                  subscriptionUser, 
                  subDurationType, 
                  subDurationType === 'custom' ? customDate : undefined,
                  customPlanName
                )}
                disabled={isUpdatingSub}
                className="text-xs font-bold bg-gold-500 text-black hover:bg-gold-400"
              >
                {isUpdatingSub ? 'Saving...' : 'Apply Subscription Extension'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BAN / SUSPEND CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showBanModal && banTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-950 border border-rose-500/40 rounded-3xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5 text-rose-400">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">
                    Suspend User Account
                  </h3>
                  <p className="text-xs text-rose-400 font-mono">{banTargetUser.email}</p>
                </div>
              </div>
              <button onClick={() => setShowBanModal(false)} className="text-zinc-500 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-1 text-rose-200">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-rose-400" />
                  Warning: Immediate Access Lockout
                </p>
                <p className="text-[11px] text-zinc-400">
                  Suspending this user will immediately block their access to their aviary records, pedigree charts, and marketplace features.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-zinc-300">Reason for Suspension (visible to user):</label>
                <Textarea
                  value={banReasonInput}
                  onChange={(e) => setBanReasonInput(e.target.value)}
                  placeholder="e.g. Inappropriate marketplace listings, fraudulent activity, violation of terms..."
                  className="bg-zinc-900 border-zinc-800 text-xs min-h-[80px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <Button variant="secondary" onClick={() => setShowBanModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                onClick={() => handleToggleBan(banTargetUser, true, banReasonInput)}
                disabled={isBanning}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
              >
                {isBanning ? 'Suspending...' : 'Confirm Ban & Lock Account'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DATA CLONING & MIGRATION MODAL */}
      {/* ========================================================================= */}
      {showMigrationModal && sourceUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center">
                  <Copy size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">
                    Clone / Transfer Aviary Data
                  </h3>
                  <p className="text-xs text-zinc-400">Source: {sourceUser.displayName} ({sourceUser.email})</p>
                </div>
              </div>
              <button onClick={() => setShowMigrationModal(false)} className="text-zinc-500 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-gold-500/10 border border-gold-500/20 rounded-2xl text-xs space-y-1.5">
              <p className="font-bold text-gold-300 flex items-center gap-1.5">
                <Info size={14} /> Full Aviary Database Replication
              </p>
              <p className="text-zinc-400">
                This tool deep-copies all flock birds, cages, breeding pairs, clutches, financial ledgers, and links to the destination user account with reconstructed pedigree IDs.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
                Destination Target User Account
              </label>
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="Paste destination User UID or type target email address..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold-500"
                />
                <p className="text-[11px] text-zinc-500">
                  Tip: You can select any user from the user directory or paste their exact UID.
                </p>
              </div>

              {/* Quick Select from Users List */}
              <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
                {usersList
                  .filter(u => u.uid !== sourceUser.uid)
                  .slice(0, 15)
                  .map(u => (
                    <button
                      key={u.uid}
                      type="button"
                      onClick={() => setTargetUserId(u.uid)}
                      className={cn(
                        "w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors",
                        targetUserId === u.uid ? "bg-gold-500/20 text-gold-300 font-bold" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      )}
                    >
                      <span className="truncate">{u.displayName} ({u.email})</span>
                      <span className="font-mono text-[10px] text-zinc-600 shrink-0 ml-2">{u.uid.substring(0, 6)}...</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-zinc-400 tracking-wider">
                Entities to Migrate
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl cursor-pointer hover:bg-zinc-900">
                  <input
                    type="checkbox"
                    checked={migrationOptions.includeBirds}
                    onChange={e => setMigrationOptions(prev => ({ ...prev, includeBirds: e.target.checked }))}
                    className="rounded accent-gold-500"
                  />
                  <Feather size={14} className="text-amber-400" />
                  <span className="text-zinc-200">Birds & Genetic Profiles</span>
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
                  <span className="text-zinc-200">Custom Species & Subscription Tier</span>
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
      {/* 4. INSPECT USER AVIARY DATA MODAL */}
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
                  <p className="text-xs text-gold-300 font-mono">{inspectUser.email} • UID: {inspectUser.uid}</p>
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

      {/* ========================================================================= */}
      {/* 5. PERMANENT DELETE / PURGE MODAL */}
      {/* ========================================================================= */}
      {showDeleteModal && deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-950 border border-rose-900/50 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">
                    Purge User Record
                  </h3>
                  <p className="text-xs text-rose-400 font-medium">Irreversible Document Removal</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTargetUser(null);
                }} 
                className="text-zinc-500 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
                <p className="font-bold text-white">Target Record:</p>
                <p className="text-gold-400 font-semibold">{deleteTargetUser.email || 'No Email Record'}</p>
                <p className="text-zinc-400">Name: {deleteTargetUser.displayName}</p>
                <p className="text-zinc-500 font-mono text-[11px]">UID: {deleteTargetUser.uid}</p>
              </div>

              <p className="text-rose-300 font-semibold flex items-start gap-1.5 bg-rose-950/30 border border-rose-900/40 p-2.5 rounded-xl">
                <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <span>
                  This will delete this user's profile and settings documents from Firestore. If this was an orphan/test doc, it will disappear immediately.
                </span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTargetUser(null);
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteUserRecord}
                disabled={isDeletingUser}
                className="text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
              >
                {isDeletingUser ? 'Deleting...' : 'Permanently Purge Record'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
