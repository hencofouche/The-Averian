import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import { format } from 'date-fns';
import { Toaster, toast } from 'sonner';
import { 
  Plus, Search, Bird as BirdIcon, Home, Heart, CheckSquare, 
  Info, Trash2, Edit2, LogOut, User, 
  Tag, Calendar, ChevronDown, ChevronUp, ChevronRight, X, GitBranch,
  Image as ImageIcon, Loader2, DollarSign, TrendingUp, TrendingDown,
  Activity, ArrowUpRight, ArrowDownRight, BarChart3, PieChart as PieChartIcon,
  Menu, Egg, LayoutGrid, Grid3x3, List as ListIcon, AlertTriangle, CreditCard, CheckCircle2, Bell, Cloud, Maximize2, Share2, Send, Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, Legend, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { 
  auth, db, loginWithGoogle, logout, handleFirestoreError, testConnection
} from './firebase';
import { 
  onAuthStateChanged, User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, onSnapshot, query, where, addDoc, 
  updateDoc, deleteDoc, doc, getDocs, orderBy, setDoc, getDocFromServer
} from 'firebase/firestore';
import { 
  Bird, Cage, Pair, Task, Transaction, OperationType, BreedingRecord, UserSettings, Species, SubSpecies, Mutation, SharedItem
} from './types';
import { cn } from './lib/utils';
import { startOfDay, startOfWeek, startOfMonth, subDays, subWeeks, subMonths, isWithinInterval, parseISO } from 'date-fns';

// --- Helpers ---
const getCurrencySymbol = (currency?: string) => {
  switch (currency) {
    case 'ZAR': return 'R';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'USD': default: return '$';
  }
};

const compressAndUploadImage = async (file: File, path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to blob with quality adjustment to meet 1.5MB limit
        let quality = 0.8;
        let blob: Blob | null = null;
        let mimeType = 'image/webp';
        
        const getBlob = (q: number, type: string): Promise<Blob | null> => 
          new Promise(res => canvas.toBlob(b => res(b), type, q));

        blob = await getBlob(quality, mimeType);
        
        // Fallback to jpeg if webp fails or is not supported
        if (!blob) {
          mimeType = 'image/jpeg';
          blob = await getBlob(quality, mimeType);
        }
        
        // If still too large, reduce quality (though 1MB is the Firestore limit, base64 adds overhead)
        while (blob && blob.size > 0.7 * 1024 * 1024 && quality > 0.1) {
          quality -= 0.1;
          blob = await getBlob(quality, mimeType);
        }

        if (!blob) {
          reject(new Error('Failed to compress image'));
          return;
        }

        // Convert blob to base64 string for Firestore storage (bypasses Storage CORS and works offline)
        const reader2 = new FileReader();
        reader2.readAsDataURL(blob);
        reader2.onloadend = () => {
          const base64data = reader2.result as string;
          resolve(base64data);
        };
        reader2.onerror = () => reject(new Error('Failed to convert image to base64'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

// --- UI Components ---

const Button = ({ 
  children, className, variant = 'primary', ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) => {
  const variants = {
    primary: 'bg-gold-500 text-black-950 hover:bg-gold-600 shadow-lg shadow-gold-500/20',
    secondary: 'bg-zinc-800 text-gold-500 hover:bg-zinc-700 border border-gold-500/30',
    danger: 'bg-red-950/30 text-red-500 hover:bg-red-900/40 border border-red-500/30',
    ghost: 'bg-transparent text-black-50 hover:bg-black-900 hover:text-gold-500',
  };
  return (
    <button 
      className={cn('px-4 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 text-[clamp(10px,1.2vw,14px)] uppercase tracking-widest', variants[variant], className)} 
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    className={cn('w-full px-4 py-3 bg-black border border-black-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all placeholder:text-white/30 text-sm font-medium', className)} 
    {...props} 
  />
);

const Select = ({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select 
    className={cn('w-full px-4 py-3 bg-black border border-black-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all appearance-none text-sm font-medium', className)} 
    {...props}
  >
    {children}
  </select>
);

const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-zinc-800 border border-black-700 rounded-2xl overflow-hidden shadow-2xl', className)} {...props}>
    {children}
  </div>
);

const Badge = ({ children, className, variant = 'neutral' }: { children: React.ReactNode, className?: string, variant?: 'neutral' | 'success' | 'warning' | 'info' | 'destructive' }) => {
  const variants = {
    neutral: 'bg-black text-white border border-black-700',
    success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    info: 'bg-gold-500/20 text-gold-400 border border-gold-500/30',
    destructive: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  };
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest', variants[variant], className)}>
      {children}
    </span>
  );
};

const SearchableSelect = ({ 
  label, 
  options, 
  value, 
  onChange, 
  onAdd, 
  placeholder = "Search or select...",
  disabled = false,
  multi = false,
  selectedValues = []
}: { 
  label: string, 
  options: { id: string, name: string }[], 
  value?: string, 
  onChange: (val: string) => void, 
  onAdd?: (name: string) => void,
  placeholder?: string,
  disabled?: boolean,
  multi?: boolean,
  selectedValues?: string[]
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const showAdd = onAdd && search && !options.some(opt => opt.name.toLowerCase() === search.toLowerCase());

  return (
    <div className="relative space-y-1">
      <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{label}</label>
      <div 
        className={cn(
          "w-full px-4 py-3 bg-black border border-black-700 text-white rounded-2xl cursor-pointer flex items-center justify-between transition-all text-sm font-medium",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={cn("truncate", !value && !selectedValues.length && "text-black-100")}>
          {multi 
            ? (selectedValues.length ? selectedValues.join(', ') : placeholder)
            : (options.find(o => o.id === value)?.name || placeholder)
          }
        </span>
        <ChevronDown size={14} className={cn("transition-transform", isOpen && "rotate-180")} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-20 w-full mt-1 bg-black border border-black-700 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-2 border-b border-black-800">
                <Input 
                  autoFocus
                  placeholder="Search..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map(opt => (
                    <div 
                      key={opt.id}
                      className={cn(
                        "px-3 py-2 text-xs cursor-pointer hover:bg-zinc-700 transition-colors flex items-center justify-between",
                        (multi ? selectedValues.includes(opt.name) : value === opt.id) && "text-gold-500 bg-zinc-700"
                      )}
                      onClick={() => {
                        onChange(opt.id);
                        if (!multi) setIsOpen(false);
                      }}
                    >
                      {opt.name}
                      {(multi ? selectedValues.includes(opt.name) : value === opt.id) && <CheckSquare size={12} />}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-[10px] text-black-100 uppercase tracking-widest font-bold">
                    No results found
                  </div>
                )}
                {showAdd && (
                  <div 
                    className="p-2 border-t border-black-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdd(search);
                      setSearch('');
                    }}
                  >
                    <Button variant="secondary" className="w-full py-1.5 text-[10px] h-auto">
                      <Plus size={12} />
                      Add "{search}"
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Subscription Gate ---

function SubscriptionGate({ settings, onRenew, children }: { settings: UserSettings | null, onRenew: () => void, children: React.ReactNode }) {
  if (!settings) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="text-gold-500 animate-spin" size={40} />
          <p className="text-black-100 font-black uppercase tracking-widest text-[10px]">Loading Account...</p>
        </div>
      </div>
    );
  }

  const expiryDate = settings.account_expiry_date ? new Date(settings.account_expiry_date) : null;
  const now = new Date();
  
  const isValidDate = expiryDate && !isNaN(expiryDate.getTime());
  // If we have settings but no valid date, it's a data error. 
  // We'll treat it as expired to be safe and encourage renewal/fix.
  const isExpired = !isValidDate || now > expiryDate;
  
  const diffTime = isValidDate ? expiryDate.getTime() - now.getTime() : 0;
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const handlePay = async () => {
    try {
      // Use window.location.origin to ensure we pass the correct current domain to the server
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: window.location.origin })
      });
      const data = await response.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        toast.error("Payment failed: " + (data.error || "Unknown error"));
      }
    } catch (error: any) {
      toast.error("Payment failed: " + error.message);
    }
  };

  if (isExpired) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-black-900 border border-gold-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl shadow-gold-500/10">
          <div className="w-20 h-20 bg-gold-500/10 rounded-full flex items-center justify-center mx-auto border border-gold-500/20">
            <CreditCard className="text-gold-500" size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-widest text-white">Subscription Expired</h2>
            <p className="text-black-50 font-bold uppercase tracking-tighter text-xs">Your trial or subscription has ended. Please renew to continue managing your aviary.</p>
          </div>
          <div className="py-4 border-y border-black-800 space-y-1">
            <p className="text-3xl font-black text-gold-500">R450.00</p>
            <p className="text-[10px] font-black text-black-100 uppercase tracking-widest">Per Year</p>
          </div>
          <Button onClick={handlePay} className="w-full py-6 text-lg">Renew Now</Button>
          <p className="text-[9px] font-bold text-black-200 uppercase tracking-widest">Secure payment powered by Yoco</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {(daysLeft <= 30) && (
        <div className="bg-gold-500 text-black-950 px-4 py-1.5 text-center text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 flex-shrink-0">
          <AlertTriangle size={14} />
          {daysLeft === 0 ? "Last day" : `${daysLeft} days left`} in your {daysLeft <= 30 ? 'trial' : 'subscription'}
          <button onClick={handlePay} className="ml-4 underline hover:text-white transition-colors">Renew Now</button>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'birds' | 'cages' | 'pairs' | 'breeding' | 'tasks' | 'financials' | 'settings' | 'subscription'>('birds');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid-large' | 'list'>('grid-large');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  const [birds, setBirds] = useState<Bird[]>([]);
  const [cages, setCages] = useState<Cage[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ title: string, message: string, onConfirm: () => Promise<void> | void } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleConfirmDelete = () => {
    if (!deleteConfirmation) return;
    const result = deleteConfirmation.onConfirm();
    if (result instanceof Promise) {
      result.catch((e: any) => {
        toast.error("Failed to delete: " + e.message);
      });
    }
    setDeleteConfirmation(null);
  };

  useEffect(() => {
    if (!user || tasks.length === 0) return;

    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const now = new Date();
      tasks.forEach(task => {
        if (task.status !== 'Completed' && task.reminderDate) {
          const reminderTime = new Date(task.reminderDate);
          const diff = now.getTime() - reminderTime.getTime();
          // Notify if the reminder time has passed within the last 60 seconds
          if (diff >= 0 && diff < 60000) {
            const notifiedKey = `notified_${task.id}_${task.reminderDate}`;
            if (!localStorage.getItem(notifiedKey)) {
              localStorage.setItem(notifiedKey, 'true');
              if ('Notification' in window && Notification.permission === 'granted') {
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                  navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification('The Averian Reminder', {
                      body: task.title,
                      icon: '/pwa-192.png'
                    });
                  });
                } else {
                  new Notification('The Averian Reminder', {
                    body: task.title,
                    icon: '/pwa-192.png'
                  });
                }
              } else {
                toast.info(`Reminder: ${task.title}`);
              }
            }
          }
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [user, tasks]);

  useEffect(() => {
    if (!user || !('serviceWorker' in navigator)) return;

    const subscribeToPush = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Get existing subscription
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          // Subscribe
          const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BJqzp7rkr1obW1Tr2C7_Jm-7H_pS1ybLDsgJBeQewq46Ws2HpXF1jF_g1h9sthZw7KmmtnjziqdIXfiyB7wGLno';
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicKey
          });
        }

        // Send to server
        await fetch('/api/save-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription,
            userId: user.uid
          })
        });
      } catch (error) {
        console.error('Failed to subscribe to push notifications:', error);
      }
    };

    if (Notification.permission === 'granted') {
      subscribeToPush();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const qBirds = query(collection(db, 'birds'), where('uid', '==', user.uid));
    const unsubBirds = onSnapshot(qBirds, (snapshot) => {
      setBirds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bird)));
      setIsSyncing(snapshot.metadata.hasPendingWrites);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'birds'));

    const qCages = query(collection(db, 'cages'), where('uid', '==', user.uid));
    const unsubCages = onSnapshot(qCages, (snapshot) => {
      setCages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cage)));
      setIsSyncing(snapshot.metadata.hasPendingWrites);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'cages'));

    const qPairs = query(collection(db, 'pairs'), where('uid', '==', user.uid));
    const unsubPairs = onSnapshot(qPairs, (snapshot) => {
      setPairs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pair)));
      setIsSyncing(snapshot.metadata.hasPendingWrites);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pairs'));

    const qBreeding = query(collection(db, 'breedingRecords'), where('uid', '==', user.uid));
    const unsubBreeding = onSnapshot(qBreeding, (snapshot) => {
      setBreedingRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BreedingRecord)));
      setIsSyncing(snapshot.metadata.hasPendingWrites);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'breedingRecords'));

    const qTasks = query(collection(db, 'tasks'), where('uid', '==', user.uid));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
      setIsSyncing(snapshot.metadata.hasPendingWrites);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'tasks'));

    const qTransactions = query(collection(db, 'transactions'), where('uid', '==', user.uid), orderBy('date', 'desc'));
    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      setIsSyncing(snapshot.metadata.hasPendingWrites);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions'));

    const docRef = doc(db, 'userSettings', user.uid);
    const unsubSettings = onSnapshot(docRef, (docSnap: any) => {
      setIsSyncing(docSnap.metadata.hasPendingWrites);
      
      // If the snapshot is from cache and empty, don't overwrite server data with a trial yet.
      // Wait for the server response.
      if (docSnap.metadata.fromCache && !docSnap.exists()) {
        console.log("UserSettings not in cache, waiting for server...");
        return;
      }

      if (docSnap.exists()) {
        const data = docSnap.data() as UserSettings;
        
        // If we have pending writes, it means we just updated something locally.
        // We should trust our local state for now to avoid flickering or overwriting with stale data.
        if (docSnap.metadata.hasPendingWrites) {
          setUserSettings({ id: docSnap.id, ...data });
          return;
        }

        // If expiry date is missing for some reason, fix it with a trial
        if (!data.account_expiry_date) {
          const trialExpiry = new Date();
          trialExpiry.setDate(trialExpiry.getDate() + 30);
          const updated = { ...data, account_expiry_date: trialExpiry.toISOString() };
          updateDoc(docRef, { account_expiry_date: updated.account_expiry_date });
          setUserSettings({ id: docSnap.id, ...updated });
        } else {
          // Cap the expiry at 365 days from now if it's excessively high (due to the loop error)
          const expiry = new Date(data.account_expiry_date);
          const now = new Date();
          const maxExpiry = new Date();
          maxExpiry.setFullYear(maxExpiry.getFullYear() + 1);
          maxExpiry.setDate(maxExpiry.getDate() + 30); // 30 day buffer

          if (expiry > maxExpiry) {
            console.log("Subscription expiry excessively high, capping at 1 year.");
            const cappedExpiry = new Date();
            cappedExpiry.setFullYear(cappedExpiry.getFullYear() + 1);
            updateDoc(docRef, { account_expiry_date: cappedExpiry.toISOString() });
            setUserSettings({ id: docSnap.id, ...data, account_expiry_date: cappedExpiry.toISOString() });
          } else {
            setUserSettings({ id: docSnap.id, ...data });
          }
        }
      } else {
        // Only create initial settings if we are sure it doesn't exist on server
        // and we are not just waiting for the server response.
        if (docSnap.metadata.fromCache) return;

        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 30);
        const initialSettings: UserSettings = {
          id: user.uid,
          species: [],
          subspecies: [],
          mutations: [],
          uid: user.uid,
          currency: 'ZAR',
          account_expiry_date: trialExpiry.toISOString()
        };
        setDoc(docRef, initialSettings);
        setUserSettings(initialSettings);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'userSettings'));

    return () => {
      unsubBirds();
      unsubCages();
      unsubPairs();
      unsubBreeding();
      unsubTasks();
      unsubTransactions();
      unsubSettings();
    };
  }, [user]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    switch (activeTab) {
      case 'birds':
        return birds.filter(b => {
          const cage = cages.find(c => c.id === b.cageId);
          const inPair = pairs.find(p => p.id.toLowerCase() === query && (p.maleId === b.id || p.femaleId === b.id));
          return b.name.toLowerCase().includes(query) || 
                 b.species.toLowerCase().includes(query) ||
                 (cage && cage.name.toLowerCase().includes(query)) ||
                 !!inPair;
        }).sort((a, b) => {
          const cageA = cages.find(c => c.id === a.cageId)?.name || 'ZZZ';
          const cageB = cages.find(c => c.id === b.cageId)?.name || 'ZZZ';
          
          if (cageA !== cageB) return cageA.localeCompare(cageB);
          
          const sexOrder: Record<string, number> = { 'Male': 0, 'Female': 1, 'Unknown': 2 };
          const sexDiff = (sexOrder[a.sex] ?? 2) - (sexOrder[b.sex] ?? 2);
          if (sexDiff !== 0) return sexDiff;
          
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
      case 'cages':
        return cages
          .filter(c => c.name.toLowerCase().includes(query))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      case 'pairs':
        return pairs.filter(p => {
          const male = birds.find(b => b.id === p.maleId);
          const female = birds.find(b => b.id === p.femaleId);
          if (!male && !female) return false;
          if (!query) return true;
          return (male?.name.toLowerCase().includes(query) || female?.name.toLowerCase().includes(query));
        });
      case 'breeding':
        return breedingRecords.filter(br => {
          if (!query) return true;
          const pair = pairs.find(p => p.id === br.pairId);
          const male = birds.find(b => b.id === pair?.maleId);
          const female = birds.find(b => b.id === pair?.femaleId);
          return male?.name.toLowerCase().includes(query) || female?.name.toLowerCase().includes(query) || br.notes?.toLowerCase().includes(query);
        });
      case 'tasks':
        return tasks.filter(t => t.title.toLowerCase().includes(query));
      case 'financials':
        return transactions.filter(t => t.category.toLowerCase().includes(query) || t.description?.toLowerCase().includes(query));
      default:
        return [];
    }
  }, [activeTab, birds, cages, pairs, tasks, searchQuery]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error('Login error:', error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleUpdateSettings = async (newSettings: UserSettings) => {
    if (!user) return;
    try {
      // Use setDoc with merge: true to avoid overwriting fields we don't intend to change
      // and to ensure the document is created if it doesn't exist.
      const { id, ...data } = newSettings;
      await setDoc(doc(db, 'userSettings', user.uid), data, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'userSettings');
    }
  };

  const handleAddSpecies = (name: string) => {
    if (!userSettings) return;
    const newSpecies: Species = { id: crypto.randomUUID(), name };
    handleUpdateSettings({
      ...userSettings,
      species: [...userSettings.species, newSpecies]
    });
  };

  const handleAddSubSpecies = (name: string, speciesId: string) => {
    if (!userSettings) return;
    const newSubSpecies: SubSpecies = { id: crypto.randomUUID(), name, speciesId };
    handleUpdateSettings({
      ...userSettings,
      subspecies: [...userSettings.subspecies, newSubSpecies]
    });
  };

  const handleAddMutation = (name: string) => {
    if (!userSettings) return;
    const newMutation: Mutation = { id: crypto.randomUUID(), name };
    handleUpdateSettings({
      ...userSettings,
      mutations: [...userSettings.mutations, newMutation]
    });
  };

  const handleRenew = async () => {
    if (!user || !userSettings) return;
    
    try {
      // Fetch latest from server to avoid race conditions
      const docSnap = await getDocFromServer(doc(db, 'userSettings', user.uid));
      const currentData = docSnap.exists() ? docSnap.data() as UserSettings : userSettings;
      
      const currentExpiry = currentData.account_expiry_date ? new Date(currentData.account_expiry_date) : new Date();
      const now = new Date();
      
      // Prevent topping up if they already have more than 45 days left
      const diffTime = currentExpiry.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysLeft > 45) {
        console.log("Subscription already active for more than 45 days, skipping auto-renewal.");
        return;
      }

      const baseDate = currentExpiry > now ? currentExpiry : now;
      baseDate.setFullYear(baseDate.getFullYear() + 1);
      
      await updateDoc(doc(db, 'userSettings', user.uid), {
        account_expiry_date: baseDate.toISOString()
      });
      toast.success("Subscription activated for 1 year!");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'userSettings');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
        <div className="w-full max-w-md text-center space-y-8">
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gold-500 text-black-950 mb-4 shadow-2xl shadow-gold-500/20">
              <BirdIcon size={40} />
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-white">THE AV<span className="text-gold-500">ERIAN</span></h1>
            <p className="text-black-50 font-medium">Professional bird breeding management</p>
          </div>
          <Button 
            onClick={handleLogin} 
            disabled={isLoggingIn}
            className="w-full py-4 text-lg font-bold"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Signing in...
              </>
            ) : (
              'Sign in with Google'
            )}
          </Button>
        </div>
      </div>
    );
  }

  const handleNavigate = (tab: any, query: string = '') => {
    setActiveTab(tab);
    setSearchQuery(query);
    setIsMobileMenuOpen(false);
  };

  const handleBirdRef = (birdName: string) => {
    handleNavigate('birds', birdName);
  };


  return (
    <SubscriptionGate settings={userSettings} onRenew={handleRenew}>
      <div className="min-h-screen bg-black text-white flex font-sans overflow-hidden">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-black border-r border-black-800 p-4 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between px-2 mb-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold-500 rounded-xl text-black-950 shadow-lg shadow-gold-500/20">
              <BirdIcon size={24} />
            </div>
            <span className="font-black text-2xl tracking-tighter text-white">THE AV<span className="text-gold-500">ERIAN</span></span>
          </div>
          <button className="md:hidden text-black-50 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem active={activeTab === 'birds'} onClick={() => handleNavigate('birds')} icon={<BirdIcon size={18} />} label="Birds" count={birds.length} />
          <NavItem active={activeTab === 'cages'} onClick={() => handleNavigate('cages')} icon={<Home size={18} />} label="Cages" count={cages.length} />
          <NavItem active={activeTab === 'pairs'} onClick={() => handleNavigate('pairs')} icon={<Heart size={18} />} label="Pairs" count={pairs.filter(p => birds.some(b => b.id === p.maleId) || birds.some(b => b.id === p.femaleId)).length} />
          <NavItem active={activeTab === 'breeding'} onClick={() => handleNavigate('breeding')} icon={<Egg size={18} />} label="Breeding" count={breedingRecords.length} />
          <NavItem active={activeTab === 'tasks'} onClick={() => handleNavigate('tasks')} icon={<CheckSquare size={18} />} label="Tasks & Reminders" count={tasks.length} />
          <NavItem active={activeTab === 'financials'} onClick={() => handleNavigate('financials')} icon={<DollarSign size={18} />} label="Financials" count={transactions.length} />
          <NavItem active={false} onClick={() => setIsPrintModalOpen(true)} icon={<Printer size={18} />} label="Print List" count={0} />
          <NavItem active={activeTab === 'subscription'} onClick={() => handleNavigate('subscription')} icon={<CreditCard size={18} />} label="Subscription" count={0} />
          <NavItem active={activeTab === 'settings'} onClick={() => handleNavigate('settings')} icon={<Tag size={18} />} label="Settings" count={0} />
        </nav>

        <div className="mt-auto pt-6 border-t border-black-800 shrink-0">
          <div className="px-2 mb-4 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-black-200">Cloud Sync</span>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black uppercase tracking-widest text-black-100">{isSyncing ? 'Syncing...' : 'Synced'}</span>
              <div className={cn("w-1.5 h-1.5 rounded-full", isSyncing ? "bg-gold-500 animate-pulse" : "bg-emerald-500")} />
            </div>
          </div>
          {userSettings && (
            <div className="px-2 mb-4">
              <div className={cn(
                "p-3 rounded-2xl border flex flex-col gap-1",
                (userSettings.account_expiry_date && new Date(userSettings.account_expiry_date) < new Date())
                  ? "bg-red-500/10 border-red-500/20"
                  : "bg-gold-500/10 border-gold-500/20"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-black-100">Status</span>
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full animate-pulse",
                    (userSettings.account_expiry_date && new Date(userSettings.account_expiry_date) < new Date())
                      ? "bg-red-500"
                      : "bg-emerald-500"
                  )} />
                </div>
                <p className="text-[11px] font-black text-white uppercase tracking-tighter">
                  {(() => {
                    const expiry = userSettings.account_expiry_date ? new Date(userSettings.account_expiry_date) : null;
                    if (!expiry || isNaN(expiry.getTime())) return 'No Subscription';
                    if (new Date() > expiry) return 'Expired';
                    const diff = expiry.getTime() - new Date().getTime();
                    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
                    return days === 0 ? 'Last Day' : `${days} Days Left`;
                  })()}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 px-2 mb-6">
            <div className="w-10 h-10 rounded-full bg-zinc-700 border border-black-700 flex items-center justify-center text-white overflow-hidden shadow-inner shrink-0">
              {user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : <User size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
              <p className="text-[10px] text-black-100 truncate uppercase tracking-widest">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={logout} className="w-full justify-start text-black-100 hover:text-red-500 hover:bg-red-500/10">
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-black">
        <header className="shrink-0 bg-black/80 backdrop-blur-md border-b border-black-800 px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 z-10 gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <button className="md:hidden p-2 -ml-2 text-black-50 hover:text-white" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={24} />
              </button>
              <h2 className="text-xl font-black uppercase tracking-widest text-white">{activeTab === 'tasks' ? 'Tasks & Reminders' : activeTab}</h2>
            </div>
            {activeTab !== 'settings' && activeTab !== 'subscription' && (
              <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="sm:hidden py-3 px-4 text-sm font-bold">
                <Plus size={18} />
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            {activeTab !== 'settings' && activeTab !== 'subscription' && (
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black-100" size={16} />
                <Input 
                  placeholder={`Search ${activeTab === 'tasks' ? 'tasks & reminders' : activeTab}...`} 
                  className="pl-11 pr-10 w-full text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-black-100 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
            
            {activeTab !== 'financials' && activeTab !== 'tasks' && activeTab !== 'settings' && activeTab !== 'subscription' && (
              <div className="flex items-center bg-black-900 rounded-lg p-1 border border-black-800 shrink-0">
                <button 
                  onClick={() => setViewMode('grid-large')}
                  className={cn("p-1.5 rounded-md transition-colors", viewMode === 'grid-large' ? "bg-zinc-700 text-gold-500" : "text-black-100 hover:text-white")}
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn("p-1.5 rounded-md transition-colors", viewMode === 'list' ? "bg-zinc-700 text-gold-500" : "text-black-100 hover:text-white")}
                >
                  <ListIcon size={16} />
                </button>
              </div>
            )}
            
            {activeTab !== 'settings' && activeTab !== 'subscription' && (
              <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="hidden sm:flex py-3 px-5 text-sm font-bold uppercase tracking-widest">
                <Plus size={18} />
                <span className="ml-2">Add {activeTab === 'breeding' ? 'Record' : activeTab === 'tasks' ? 'Task / Reminder' : activeTab.slice(0, -1)}</span>
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className={cn(
                "grid gap-4",
                activeTab === 'tasks' ? "max-w-3xl mx-auto grid-cols-1" : 
                activeTab === 'financials' ? "grid-cols-1" :
                activeTab === 'settings' || activeTab === 'subscription' ? "grid-cols-1 max-w-7xl mx-auto w-full" :
                viewMode === 'grid-large' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" :
                "grid-cols-1 max-w-4xl mx-auto"
              )}>
                {activeTab === 'birds' && (
                  (filteredItems as Bird[]).length > 0 ? (
                    (filteredItems as Bird[]).map(bird => (
                      <BirdCard 
                        key={bird.id} 
                        bird={bird} 
                        cage={cages.find(c => c.id === bird.cageId)}
                        birds={birds}
                        viewMode={viewMode}
                        currency={userSettings?.currency}
                        onBirdRef={handleBirdRef}
                        onNavigate={handleNavigate}
                        onEdit={() => { setEditingItem(bird); setIsModalOpen(true); }}
                        onDelete={() => setDeleteConfirmation({ 
                          title: 'Delete Bird', 
                          message: `Are you sure you want to delete "${bird.name}"? This action cannot be undone.`,
                          onConfirm: async () => {
                            try { await deleteDoc(doc(db, 'birds', bird.id)); }
                            catch (e) { handleFirestoreError(e, OperationType.DELETE, 'birds'); }
                          }
                        })}
                      />
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center bg-black-900/30 border border-dashed border-black-800 rounded-3xl">
                      <BirdIcon size={48} className="mx-auto text-black-300 mb-4" />
                      <p className="text-black-100 font-black uppercase tracking-widest">No birds found</p>
                    </div>
                  )
                )}

                {activeTab === 'cages' && (
                  (filteredItems as Cage[]).length > 0 ? (
                    (filteredItems as Cage[]).map(cage => (
                      <CageCard 
                        key={cage.id} 
                        cage={cage} 
                        birds={birds.filter(b => b.cageId === cage.id)}
                        viewMode={viewMode}
                        onBirdRef={handleBirdRef}
                        onNavigate={handleNavigate}
                        onEdit={() => { setEditingItem(cage); setIsModalOpen(true); }}
                        onDelete={() => setDeleteConfirmation({ 
                          title: 'Delete Cage', 
                          message: `Are you sure you want to delete "${cage.name}"? This action cannot be undone.`,
                          onConfirm: async () => {
                            try { await deleteDoc(doc(db, 'cages', cage.id)); }
                            catch (e) { handleFirestoreError(e, OperationType.DELETE, 'cages'); }
                          }
                        })}
                      />
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center bg-black-900/30 border border-dashed border-black-800 rounded-3xl">
                      <Home size={48} className="mx-auto text-black-300 mb-4" />
                      <p className="text-black-100 font-black uppercase tracking-widest">No cages found</p>
                    </div>
                  )
                )}

                {activeTab === 'pairs' && (
                  (filteredItems as Pair[]).length > 0 ? (
                    (filteredItems as Pair[]).map(pair => (
                      <PairCard 
                        key={pair.id} 
                        pair={pair} 
                        male={birds.find(b => b.id === pair.maleId)}
                        female={birds.find(b => b.id === pair.femaleId)}
                        cages={cages}
                        viewMode={viewMode}
                        onBirdRef={handleBirdRef}
                        onNavigate={handleNavigate}
                        onEdit={() => { setEditingItem(pair); setIsModalOpen(true); }}
                        onDelete={() => setDeleteConfirmation({ 
                          title: 'Delete Pair', 
                          message: 'Are you sure you want to delete this breeding pair? This action cannot be undone.',
                          onConfirm: async () => {
                            try { await deleteDoc(doc(db, 'pairs', pair.id)); }
                            catch (e) { handleFirestoreError(e, OperationType.DELETE, 'pairs'); }
                          }
                        })}
                      />
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center bg-black-900/30 border border-dashed border-black-800 rounded-3xl">
                      <Heart size={48} className="mx-auto text-black-300 mb-4" />
                      <p className="text-black-100 font-black uppercase tracking-widest">No pairs found</p>
                    </div>
                  )
                )}

                {activeTab === 'breeding' && (
                  (filteredItems as BreedingRecord[]).length > 0 ? (
                    (filteredItems as BreedingRecord[]).map(record => (
                      <BreedingRecordCard 
                        key={record.id} 
                        record={record} 
                        pair={pairs.find(p => p.id === record.pairId)}
                        male={birds.find(b => b.id === pairs.find(p => p.id === record.pairId)?.maleId)}
                        female={birds.find(b => b.id === pairs.find(p => p.id === record.pairId)?.femaleId)}
                        birds={birds}
                        viewMode={viewMode}
                        onBirdRef={handleBirdRef}
                        onEdit={() => { setEditingItem(record); setIsModalOpen(true); }}
                        onDelete={() => setDeleteConfirmation({ 
                          title: 'Delete Breeding Record', 
                          message: 'Are you sure you want to delete this breeding record? This action cannot be undone.',
                          onConfirm: async () => {
                            try { await deleteDoc(doc(db, 'breedingRecords', record.id)); }
                            catch (e) { handleFirestoreError(e, OperationType.DELETE, 'breedingRecords'); }
                          }
                        })}
                      />
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center bg-black-900/30 border border-dashed border-black-800 rounded-3xl">
                      <Egg size={48} className="mx-auto text-black-300 mb-4" />
                      <p className="text-black-100 font-black uppercase tracking-widest">No breeding records found</p>
                    </div>
                  )
                )}

                {activeTab === 'tasks' && (
                  (filteredItems as Task[]).length > 0 ? (
                    (filteredItems as Task[]).map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        birds={birds}
                        viewMode={viewMode}
                        onBirdRef={handleBirdRef}
                        onToggle={async () => {
                          try {
                            await updateDoc(doc(db, 'tasks', task.id), { 
                              status: task.status === 'Completed' ? 'Pending' : 'Completed' 
                            });
                          } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'tasks'); }
                        }}
                        onEdit={() => { setEditingItem(task); setIsModalOpen(true); }}
                        onDelete={() => setDeleteConfirmation({ 
                          title: 'Delete Task', 
                          message: `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
                          onConfirm: async () => {
                            try { await deleteDoc(doc(db, 'tasks', task.id)); }
                            catch (e) { handleFirestoreError(e, OperationType.DELETE, 'tasks'); }
                          }
                        })}
                      />
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center bg-black-900/30 border border-dashed border-black-800 rounded-3xl">
                      <CheckSquare size={48} className="mx-auto text-black-300 mb-4" />
                      <p className="text-black-100 font-black uppercase tracking-widest">No tasks found</p>
                    </div>
                  )
                )}

                {activeTab === 'financials' && (
                  <FinancialsView 
                    transactions={transactions} 
                    filteredTransactions={filteredItems as Transaction[]}
                    birds={birds}
                    currency={userSettings?.currency}
                    onBirdRef={handleBirdRef}
                    onEdit={(t) => { setEditingItem(t); setIsModalOpen(true); }}
                    onDelete={(id) => setDeleteConfirmation({ 
                      title: 'Delete Transaction', 
                      message: 'Are you sure you want to delete this transaction? This action cannot be undone.',
                      onConfirm: async () => {
                        try { await deleteDoc(doc(db, 'transactions', id)); }
                        catch (e) { handleFirestoreError(e, OperationType.DELETE, 'transactions'); }
                      }
                    })}
                  />
                )}

                {activeTab === 'settings' && userSettings && (
                  <SettingsView 
                    settings={userSettings} 
                    onUpdate={handleUpdateSettings} 
                    allData={{ birds, cages, pairs, breedingRecords, tasks, transactions, userSettings }}
                    user={user}
                    isSyncing={isSyncing}
                    setDeleteConfirmation={setDeleteConfirmation}
                  />
                )}

                {activeTab === 'subscription' && userSettings && (
                  <SubscriptionView 
                    settings={userSettings} 
                    onRenew={handleRenew} 
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        title={`${editingItem ? 'Edit' : 'Add'} ${activeTab === 'breeding' ? 'Record' : activeTab === 'tasks' ? 'Task / Reminder' : activeTab.slice(0, -1)}`}
      >
        {activeTab === 'birds' && (
          <BirdForm 
            user={user} 
            initialData={editingItem} 
            cages={cages} 
            birds={birds} 
            pairs={pairs}
            userSettings={userSettings}
            onAddSpecies={handleAddSpecies}
            onAddSubSpecies={handleAddSubSpecies}
            onAddMutation={handleAddMutation}
            onClose={() => setIsModalOpen(false)} 
          />
        )}
        {activeTab === 'cages' && <CageForm user={user} initialData={editingItem} onClose={() => setIsModalOpen(false)} />}
        {activeTab === 'pairs' && <PairForm user={user} initialData={editingItem} birds={birds} onClose={() => setIsModalOpen(false)} />}
        {activeTab === 'breeding' && <BreedingRecordForm user={user} initialData={editingItem} pairs={pairs} birds={birds} onClose={() => setIsModalOpen(false)} />}
        {activeTab === 'tasks' && <TaskForm user={user} initialData={editingItem} birds={birds} onClose={() => setIsModalOpen(false)} />}
        {activeTab === 'financials' && <TransactionForm user={user} initialData={editingItem} birds={birds} currency={userSettings?.currency} onClose={() => setIsModalOpen(false)} />}
      </Modal>

      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Print List"
      >
        <PrintListModal birds={birds} cages={cages} onClose={() => setIsPrintModalOpen(false)} />
      </Modal>

      <ConfirmModal 
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={handleConfirmDelete}
        title={deleteConfirmation?.title || 'Confirm Delete'}
        message={deleteConfirmation?.message || 'Are you sure you want to delete this item? This action cannot be undone.'}
      />

      <AnimatePresence>
        {viewingImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setViewingImage(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] w-full"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setViewingImage(null)}
                className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white bg-black/50 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
              <img src={viewingImage} alt="Enlarged view" className="w-full h-full object-contain rounded-xl" referrerPolicy="no-referrer" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toaster theme="dark" position="top-center" richColors />
      </div>
    </SubscriptionGate>
  );
}

// --- Sub-components ---

function NavItem({ active, onClick, icon, label, count }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, count: number }) {
  return (
    <button onClick={onClick} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all group', active ? 'bg-gold-500 text-black-950 shadow-lg shadow-gold-500/20' : 'text-black-50 hover:bg-black-900 hover:text-gold-500')}>
      <span className={cn('transition-transform group-hover:scale-110', active ? 'text-black-950' : 'text-black-100 group-hover:text-gold-500')}>
        {icon}
      </span>
      <span className="flex-1 text-left uppercase tracking-widest text-[11px]">{label}</span>
      <span className={cn('text-[10px] px-2 py-0.5 rounded-lg font-black', active ? 'bg-black/20 text-black' : 'bg-zinc-800 text-white/50 group-hover:text-gold-500')}>{count}</span>
    </button>
  );
}

function ShareBirdModal({ bird, mother, father, mate, birds, onClose }: { bird: Bird, mother?: Bird, father?: Bird, mate?: Bird, birds: Bird[], onClose: () => void }) {
  const [selectedFields, setSelectedFields] = useState<string[]>(['name', 'sex', 'species', 'mutations', 'image']);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const shareCardRef = React.useRef<HTMLDivElement>(null);

  const fields = [
    { id: 'name', label: 'Name / Ring Number' },
    { id: 'sex', label: 'Sex' },
    { id: 'species', label: 'Species & Sub-species' },
    { id: 'mutations', label: 'Mutations' },
    { id: 'birthDate', label: 'Birth Date' },
    { id: 'parents', label: 'Parents (Names)' },
    { id: 'offspring', label: 'Offspring (Count)' },
    { id: 'purchasePrice', label: 'Purchase Price' },
    { id: 'estimatedValue', label: 'Estimated Value' },
    { id: 'image', label: 'Bird Image' },
    { id: 'notes', label: 'Notes' },
  ];

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    setIsGeneratingImage(true);
    try {
      // Generate share text
      let shareText = `🐦 Bird Details: ${bird.name}\n\n`;
      if (selectedFields.includes('sex')) shareText += `Sex: ${bird.sex}\n`;
      if (selectedFields.includes('species')) {
        shareText += `Species: ${bird.species}${bird.subSpecies ? ` (${bird.subSpecies})` : ''}\n`;
      }
      if (selectedFields.includes('mutations') && bird.mutations?.length) {
        shareText += `Mutations: ${bird.mutations.join(', ')}\n`;
      }
      if (selectedFields.includes('birthDate') && bird.birthDate) {
        shareText += `Born: ${bird.birthDate}\n`;
      }
      if (selectedFields.includes('parents')) {
        if (father) shareText += `Father: ${father.name}\n`;
        if (mother) shareText += `Mother: ${mother.name}\n`;
      }
      if (selectedFields.includes('offspring')) {
        const offspringCount = birds.filter(b => b.motherId === bird.id || b.fatherId === bird.id).length;
        shareText += `Offspring: ${offspringCount}\n`;
      }
      if (selectedFields.includes('purchasePrice') && bird.purchasePrice) {
        shareText += `Purchase Price: ${bird.purchasePrice}\n`;
      }
      if (selectedFields.includes('estimatedValue') && bird.estimatedValue) {
        shareText += `Estimated Value: ${bird.estimatedValue}\n`;
      }
      if (selectedFields.includes('notes') && bird.notes) {
        shareText += `Notes: ${bird.notes}\n`;
      }

      const dataUrl = await toPng(shareCardRef.current, {
        backgroundColor: '#000000',
        pixelRatio: 2,
        style: {
          // Force hex colors for common properties to avoid oklab/oklch parsing issues
          color: '#ffffff',
          backgroundColor: '#000000',
        }
      });
      
      const blob = await (await fetch(dataUrl)).blob();
      if (!blob) throw new Error('Failed to generate image');

      const file = new File([blob], `bird-${bird.name.replace(/\s+/g, '-')}.png`, { type: 'image/png' });

      // Native Share (Image + Text)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Bird: ${bird.name}`,
          text: shareText,
        });
        toast.success('Shared successfully!');
      } else {
        // Fallback: Download + Clipboard
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bird-${bird.name.replace(/\s+/g, '-')}.png`;
        link.click();
        URL.revokeObjectURL(url);
        
        await navigator.clipboard.writeText(shareText);
        toast.success('Image downloaded & info copied to clipboard!');
      }
      onClose();
    } catch (err) {
      console.error('Failed to share:', err);
      toast.error('Failed to generate shareable content');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden Card for Image Generation */}
      <div className="fixed -left-[9999px] top-0">
        <div 
          ref={shareCardRef}
          className="w-[400px] bg-black p-8 border-4 border-gold-500 rounded-[2.5rem] space-y-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gold-500 rounded-2xl text-black">
              <BirdIcon size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">The Averian</h2>
              <p className="text-[10px] font-black text-gold-500 uppercase tracking-[0.3em]">Official Bird Record</p>
            </div>
          </div>

          {bird.imageUrl && selectedFields.includes('image') && (
            <div className="w-full aspect-square rounded-3xl overflow-hidden border-2 border-black-800">
              <img src={bird.imageUrl} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
            </div>
          )}

          <div className="space-y-4">
            <div>
              <h3 className="text-3xl font-black text-white flex items-center gap-3">
                {bird.name}
                <span className={cn(
                  "text-xs px-3 py-1 rounded-full uppercase tracking-widest",
                  bird.sex === 'Male' ? "bg-blue-500/20 text-blue-400" : bird.sex === 'Female' ? "bg-rose-500/20 text-rose-400" : "bg-zinc-800 text-zinc-400"
                )}>
                  {bird.sex}
                </span>
              </h3>
              <p className="text-gold-500 font-bold uppercase tracking-widest text-sm mt-1">
                {bird.species} {bird.subSpecies ? `• ${bird.subSpecies}` : ''}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-6 pt-4 border-t border-black-800">
              {selectedFields.includes('birthDate') && bird.birthDate && (
                <div>
                  <p className="text-black-200 uppercase tracking-widest text-[8px] font-black">Born</p>
                  <p className="text-white text-sm font-bold">{bird.birthDate}</p>
                </div>
              )}
              {selectedFields.includes('parents') && (father || mother) && (
                <div>
                  <p className="text-black-200 uppercase tracking-widest text-[8px] font-black">Lineage</p>
                  <p className="text-white text-xs font-bold truncate">F: {father?.name || '?'}</p>
                  <p className="text-white text-xs font-bold truncate">M: {mother?.name || '?'}</p>
                </div>
              )}
              {selectedFields.includes('mutations') && bird.mutations?.length && (
                <div className="col-span-2">
                  <p className="text-black-200 uppercase tracking-widest text-[8px] font-black">Mutations</p>
                  <p className="text-white text-xs font-bold">{bird.mutations.join(', ')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-black-800 flex justify-between items-end">
            <div className="text-[8px] text-black-400 uppercase tracking-widest font-black">
              Verified Aviary Record<br />
              {new Date().toLocaleDateString()}
            </div>
            <div className="w-12 h-12 bg-white p-1 rounded-lg">
              {/* Mock QR Code placeholder */}
              <div className="w-full h-full bg-black rounded-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Select Data to Share</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {fields.map(field => (
            <div 
              key={field.id}
              onClick={() => setSelectedFields(prev => prev.includes(field.id) ? prev.filter(f => f !== field.id) : [...prev, field.id])}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                selectedFields.includes(field.id) ? "bg-gold-500/10 border-gold-500/50" : "bg-zinc-900/50 border-black-800 hover:border-black-600"
              )}
            >
              <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", selectedFields.includes(field.id) ? "bg-gold-500 border-gold-500 text-black" : "border-black-600")}>
                {selectedFields.includes(field.id) && <CheckSquare size={12} />}
              </div>
              <span className="text-xs font-bold text-white">{field.label}</span>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleShare} disabled={isGeneratingImage} className="w-full py-4 text-sm uppercase tracking-widest font-black">
        {isGeneratingImage ? <Loader2 className="animate-spin mr-2" size={18} /> : <Share2 size={18} className="mr-2" />}
        {isGeneratingImage ? 'Generating...' : 'Generate & Share'}
      </Button>
    </div>
  );
}

function BirdCard({ bird, cage, birds, viewMode = 'grid-large', currency, onBirdRef, onNavigate, onEdit, onDelete }: { bird: Bird, cage?: Cage, birds: Bird[], viewMode?: 'grid-large' | 'list', currency?: string, onBirdRef: (name: string) => void, onNavigate: (tab: string, query?: string) => void, onEdit: () => void, onDelete: () => void }) {
  const [showTree, setShowTree] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const symbol = getCurrencySymbol(currency);
  const offspring = birds.filter(b => b.motherId === bird.id || b.fatherId === bird.id || bird.offspringIds?.includes(b.id));
  const mother = birds.find(b => b.id === bird.motherId);
  const father = birds.find(b => b.id === bird.fatherId);
  const mate = birds.find(b => b.id === bird.mateId);

  const effectiveViewMode = (viewMode === 'list' && isExpanded) ? 'grid-large' : viewMode;
  const imageUrl = bird.imageUrl || null;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShareModalOpen(true);
  };

  return (
    <>
      <Card 
        onClick={() => viewMode === 'list' && setIsExpanded(!isExpanded)}
        className={cn(
          "group relative transition-all duration-300 overflow-hidden", 
          effectiveViewMode === 'list' ? "flex flex-row items-center p-4 gap-4 cursor-pointer hover:bg-black-900/50" : "cursor-default"
        )}
      >
      {imageUrl && effectiveViewMode !== 'list' && (
        <div 
          className={cn("w-full overflow-hidden bg-black aspect-[4/3] cursor-pointer relative")}
          onClick={(e) => { e.stopPropagation(); setFullscreenImage(true); }}
        >
          <img 
            src={imageUrl} 
            alt={bird.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black-950 via-transparent to-transparent opacity-60" />
          <div className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 size={16} className="text-white" />
          </div>
        </div>
      )}
      <div className={cn("space-y-3 relative w-full", effectiveViewMode === 'list' ? "flex-1 flex flex-col" : "p-4 sm:p-5")}>
        {/* 1. ID (Name) + Sex */}
        <div className={cn("flex items-start justify-between gap-2", effectiveViewMode === 'list' ? "w-full" : "relative")}>
          <div className="space-y-1 min-w-0 flex-1">
            <h3 className={cn("font-black text-white flex items-center gap-2 tracking-tight text-lg")}>
              <span className="truncate">{bird.name}</span>
              <Badge variant={bird.sex === 'Male' ? 'info' : bird.sex === 'Female' ? 'warning' : 'neutral'} className="shrink-0">{bird.sex}</Badge>
            </h3>
            
            {/* 2. Species & Sub-species */}
            <p className="text-[9px] sm:text-[10px] text-gold-500 font-black uppercase tracking-widest truncate">
              {bird.species}
              {bird.subSpecies && <span className="text-white mx-1">•</span>}
              {bird.subSpecies && <span className="text-white">{bird.subSpecies}</span>}
            </p>
          </div>

          {effectiveViewMode === 'list' && (
            <div className="flex items-center gap-3">
              <ChevronRight size={20} className={cn("text-black-200 transition-transform", isExpanded && "rotate-90")} />
            </div>
          )}
        </div>
        
        {/* 3. Mutations / Split Mutations */}
        {(bird.mutations?.length || 0) > 0 || (bird.splitMutations?.length || 0) > 0 ? (
          <div className="flex flex-wrap gap-1">
            {bird.mutations?.map(m => <Badge key={m} className="bg-zinc-700 border-black-700 text-white text-[9px] px-1.5 py-0">{m}</Badge>)}
            {bird.splitMutations?.map(m => <Badge key={m} className="bg-zinc-700 border-black-700 text-gold-500 italic text-[9px] px-1.5 py-0">Split {m}</Badge>)}
          </div>
        ) : null}

        {/* 4. Other Info (Cage, Born, Mate) */}
        <div className={cn(
          "text-[10px] sm:text-[11px] border-t border-black-800/50 pt-2", 
          effectiveViewMode === 'list' ? "flex flex-wrap items-center gap-x-6 gap-y-2" : "grid grid-cols-2 gap-3"
        )}>
          <div className={cn(effectiveViewMode === 'list' ? "flex items-center gap-2" : "space-y-0.5")}>
            <p className="text-white uppercase tracking-widest font-black text-[8px]">Cage{effectiveViewMode === 'list' ? ':' : ''}</p>
            {cage ? (
              <button onClick={(e) => { e.stopPropagation(); onNavigate('birds', cage.name); }} className="text-white font-bold flex items-center gap-1.5 hover:text-gold-500 transition-colors">
                <Home size={10} className="text-gold-500" /> {cage.name}
              </button>
            ) : (
              <p className="text-white font-bold flex items-center gap-1.5"><Home size={10} className="text-gold-500" /> Unassigned</p>
            )}
          </div>
          <div className={cn(effectiveViewMode === 'list' ? "flex items-center gap-2" : "space-y-0.5")}>
            <p className="text-white uppercase tracking-widest font-black text-[8px]">Born{effectiveViewMode === 'list' ? ':' : ''}</p>
            <p className="text-white font-bold flex items-center gap-1.5"><Calendar size={10} className="text-gold-500" /> {bird.birthDate || 'Unknown'}</p>
          </div>
          <div className={cn(effectiveViewMode === 'list' ? "flex items-center gap-2" : "space-y-0.5")}>
            <p className="text-white uppercase tracking-widest font-black text-[8px]">Value{effectiveViewMode === 'list' ? ':' : ''}</p>
            <p className="text-emerald-500 font-bold flex items-center gap-1.5">{symbol}{bird.estimatedValue?.toFixed(2) || '0.00'}</p>
          </div>
          {mate && (
            <div className={cn(effectiveViewMode === 'list' ? "flex items-center gap-2" : "col-span-2 pt-1")}>
              <p className="text-white uppercase tracking-widest font-black text-[8px]">Mate{effectiveViewMode === 'list' ? ':' : ''}</p>
              <button onClick={(e) => { e.stopPropagation(); onBirdRef(mate.name); }} className="text-rose-500 font-bold flex items-center gap-1.5 hover:text-rose-400 transition-colors">
                <Heart size={10} className="fill-rose-500" /> {mate.name}
              </button>
            </div>
          )}
        </div>

        {/* 5. Breeding History Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onNavigate('breeding', bird.name); }}
          className="w-full p-2 bg-gold-500/10 border border-gold-500/20 rounded-lg text-[10px] text-gold-500 font-black uppercase tracking-widest hover:bg-gold-500/20 transition-colors flex items-center justify-center gap-2"
        >
          <Egg size={12} className="text-gold-500" />
          Breeding History
        </button>

        {/* 5.5 Share Button */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black-800/50">
          <button 
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white hover:text-gold-500 rounded-lg transition-all border border-black-700 min-w-[80px]"
          >
            <Share2 size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest">Share Bird</span>
          </button>
        </div>

        <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Share Bird">
          <ShareBirdModal bird={bird} mother={mother} father={father} mate={mate} birds={birds} onClose={() => setIsShareModalOpen(false)} />
        </Modal>

        {/* 6. Action Buttons - Always Last, Under everything, Next to each other */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black-800/50">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowTree(!showTree); }} 
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gold-500/10 hover:bg-gold-500/20 text-gold-500 rounded-xl transition-all border border-gold-500/20 group/btn min-w-[80px]"
          >
            <GitBranch size={16} className="group-hover/btn:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Pedigree</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }} 
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all border border-black-700 group/btn min-w-[80px]"
          >
            <Edit2 size={16} className="group-hover/btn:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Edit</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }} 
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20 group/btn min-w-[80px]"
          >
            <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Delete</span>
          </button>
          {viewMode === 'list' && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white hover:text-gold-500 rounded-lg transition-all border border-black-700 shrink-0"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>

        {effectiveViewMode !== 'list' && showTree && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-4 border-t border-black-800 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[9px] text-white uppercase tracking-widest font-black">Father</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); father && onBirdRef(father.name); }}
                  className="text-[11px] text-white font-bold hover:text-gold-500 transition-colors text-left flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-info" />
                  {father?.name || 'Unknown'}
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] text-white uppercase tracking-widest font-black">Mother</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); mother && onBirdRef(mother.name); }}
                  className="text-[11px] text-white font-bold hover:text-gold-500 transition-colors text-left flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                  {mother?.name || 'Unknown'}
                </button>
              </div>
            </div>
            {offspring.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] text-white uppercase tracking-widest font-black">Offspring ({offspring.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {offspring.map(o => (
                    <button 
                      key={o.id} 
                      onClick={(e) => { e.stopPropagation(); onBirdRef(o.name); }}
                      className="text-[10px] bg-zinc-700 px-2 py-1 rounded-lg border border-black-700 text-white hover:text-gold-500 hover:border-gold-500/50 transition-all font-bold"
                    >
                      {o.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {effectiveViewMode !== 'list' && (bird.notes || (bird.statuses && bird.statuses.length > 0)) && (
          <div className="pt-3 border-t border-black-800/50 space-y-2">
            {bird.statuses && bird.statuses.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {bird.statuses.map(status => (
                  <span key={status} className="px-1.5 py-0.5 rounded-sm bg-zinc-700 text-gold-500 text-[9px] font-bold uppercase tracking-wider border border-black-700">
                    {status}
                  </span>
                ))}
              </div>
            )}
            {bird.notes && <p className="text-[11px] text-white leading-relaxed line-clamp-2 italic">"{bird.notes}"</p>}
          </div>
        )}
      </div>

      <AnimatePresence>
        {fullscreenImage && imageUrl && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 sm:p-8 cursor-zoom-out"
            onClick={(e) => { e.stopPropagation(); setFullscreenImage(false); }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-5xl w-full max-h-full flex items-center justify-center"
            >
              <img 
                src={imageUrl} 
                alt={bird.name} 
                className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={(e) => { e.stopPropagation(); setFullscreenImage(false); }}
                className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all"
              >
                <X size={24} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Card>
    </>
  );
}

function CageCard({ cage, birds, viewMode = 'grid-large', onBirdRef, onNavigate, onEdit, onDelete }: { cage: Cage, birds: Bird[], viewMode?: 'grid-large' | 'list', onBirdRef: (name: string) => void, onNavigate: (tab: string, query?: string) => void, onEdit: () => void, onDelete: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const effectiveViewMode = (viewMode === 'list' && isExpanded) ? 'grid-large' : viewMode;
  const cageBirds = birds.filter(b => b.cageId === cage.id);

  return (
    <Card 
      onClick={() => viewMode === 'list' && setIsExpanded(!isExpanded)}
      className={cn(
        "group transition-all duration-300 overflow-hidden", 
        effectiveViewMode === 'list' ? "flex flex-row items-center p-4 gap-4 cursor-pointer hover:bg-black-900/50" : "cursor-default"
      )}
    >
      <div className={cn("space-y-4 relative w-full", effectiveViewMode === 'list' ? "flex-1 flex flex-col space-y-3" : "p-4 sm:p-5")}>
        <div className={cn("flex items-start justify-between gap-2", effectiveViewMode === 'list' ? "w-full" : "relative")}>
          <div className="space-y-1 min-w-0 flex-1">
            <h3 
              className={cn("font-black text-white flex items-center gap-2 tracking-tight cursor-pointer hover:text-gold-500 transition-colors", "text-lg")}
              onClick={() => onNavigate('birds', cage.name)}
            >
              <Home size={18} className="text-gold-500 shrink-0" />
              <span className="truncate">{cage.name}</span>
            </h3>
            {cage.location && <p className="text-[9px] sm:text-[10px] text-white uppercase tracking-widest font-bold truncate">{cage.location}</p>}
          </div>
          
          {effectiveViewMode !== 'list' && (
            <div className={cn(
              "flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            )}>
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-white hover:text-gold-500 hover:bg-zinc-700 rounded-lg transition-colors">
                <Edit2 size={16} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-white hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        <div className={cn(
          "text-[10px] sm:text-[11px]", 
          effectiveViewMode === 'list' ? "flex items-center gap-6 pt-2 border-t border-black-800/50" : "grid grid-cols-2 gap-3 sm:gap-4 border-t border-black-800 pt-3 sm:pt-4"
        )}>
          <div className={cn(effectiveViewMode === 'list' ? "flex items-center gap-2" : "space-y-1")}>
            <p className="text-white uppercase tracking-widest font-black text-[9px]">Birds{effectiveViewMode === 'list' ? ':' : ''}</p>
            <p className="text-white font-bold">{cageBirds.length} Residents</p>
          </div>
          <div className={cn(effectiveViewMode === 'list' ? "flex items-center gap-2" : "space-y-1")}>
            <p className="text-white uppercase tracking-widest font-black text-[9px]">Type{effectiveViewMode === 'list' ? ':' : ''}</p>
            <p className="text-white font-bold">{cage.type || 'Standard'}</p>
          </div>
        </div>

        {/* Residents List */}
        {effectiveViewMode !== 'list' && cageBirds.length > 0 && (
          <div 
            className="mt-4 p-4 bg-zinc-900/50 rounded-xl border border-black-700 cursor-pointer hover:border-gold-500/50 transition-all group/residents"
            onClick={(e) => { e.stopPropagation(); onNavigate('birds', cage.name); }}
          >
            <p className="text-[9px] text-white uppercase tracking-widest font-black mb-3 group-hover/residents:text-gold-500 transition-colors">Residents ({cageBirds.length})</p>
            <div className="flex flex-wrap gap-1.5 pointer-events-none">
              {cageBirds.map(b => (
                <div 
                  key={b.id} 
                  className="text-[10px] bg-zinc-800 px-2 py-1 rounded-lg border border-black-700 text-white font-bold"
                >
                  {b.name}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black-800/50">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white hover:text-gold-500 rounded-lg transition-all border border-black-700 min-w-[70px]"
          >
            <Edit2 size={14} className="shrink-0" />
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest truncate">Edit</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all border border-red-500/20 min-w-[70px]"
          >
            <Trash2 size={14} className="shrink-0" />
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest truncate">Delete</span>
          </button>
          {viewMode === 'list' && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white hover:text-gold-500 rounded-lg transition-all border border-black-700 shrink-0"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

// --- Components ---
const BirdInfo = ({ bird, sex }: { bird?: Bird, sex: 'Male' | 'Female' }) => (
  <div className={cn(
    "flex-1 min-w-0 p-4 rounded-3xl border transition-all relative overflow-hidden",
    sex === 'Male' ? "bg-info-500/5 border-info-500/20" : "bg-rose-500/5 border-rose-500/20",
    !bird && "opacity-50 grayscale"
  )}>
    {/* Background Sex Icon */}
    <div className="absolute -right-2 -bottom-2 opacity-10 pointer-events-none">
      {sex === 'Male' ? <Activity size={60} /> : <Heart size={60} />}
    </div>

    <div className="relative z-10 space-y-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-base sm:text-lg font-black text-white truncate uppercase tracking-tight leading-none">
            {bird ? bird.name : 'Unknown'}
          </h4>
          <Badge 
            variant={sex === 'Male' ? 'info' : 'warning'} 
            className="text-[10px] uppercase tracking-widest font-black px-2.5 py-1 shadow-lg"
          >
            {sex}
          </Badge>
        </div>
        <p className="text-[11px] font-black text-gold-500 uppercase tracking-[0.2em]">
          {bird?.species || 'Ringneck'}
        </p>
      </div>
      
      {bird && bird.mutations && bird.mutations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {bird.mutations.map((m, i) => (
            <span key={i} className="text-[9px] px-2 py-1 bg-black/60 border border-white/10 rounded-lg text-white font-black uppercase tracking-tighter shadow-sm">
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
);

const SettingRow = ({ icon: Icon, title, description, active, onClick }: { icon: any, title: string, description: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full p-4 rounded-2xl border transition-all flex items-center gap-4 text-left",
      active 
        ? "bg-gold-500/10 border-gold-500/50 shadow-lg shadow-gold-500/5" 
        : "bg-black-900 border-black-800 hover:border-black-700"
    )}
  >
    <div className={cn("p-3 rounded-xl", active ? "bg-gold-500 text-black" : "bg-zinc-800 text-gold-500")}>
      <Icon size={20} />
    </div>
    <div className="flex-1">
      <h4 className={cn("font-black uppercase tracking-widest text-sm", active ? "text-gold-500" : "text-white")}>{title}</h4>
      <p className="text-[10px] font-bold text-white/50 uppercase tracking-tighter mt-0.5">{description}</p>
    </div>
    <ChevronRight size={20} className={cn("transition-transform", active ? "rotate-90 text-gold-500" : "text-black-200")} />
  </button>
);

function PairCard({ pair, male, female, cages, onBirdRef, onNavigate, onEdit, onDelete, viewMode = 'grid-large' }: { pair: Pair, male?: Bird, female?: Bird, cages: Cage[], onBirdRef: (name: string) => void, onNavigate: (tab: string, query?: string) => void, onEdit: () => void, onDelete: () => void, viewMode?: 'grid-large' | 'list' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const effectiveViewMode = (viewMode === 'list' && isExpanded) ? 'grid-large' : viewMode;
  const cage = cages.find(c => c.id === (male?.cageId || female?.cageId));

  return (
    <Card 
      onClick={() => viewMode === 'list' && setIsExpanded(!isExpanded)}
      className={cn(
        "group transition-all duration-300 overflow-hidden border-black-800 hover:border-gold-500/40 shadow-xl", 
        effectiveViewMode === 'list' ? "flex flex-row items-center p-4 gap-4 cursor-pointer hover:bg-black-900/50" : "cursor-default"
      )}
    >
      <div className={cn("space-y-4 relative w-full", effectiveViewMode === 'list' ? "flex-1 flex flex-col space-y-3" : "p-4 sm:p-6")}>
        {/* Cage Info at Top */}
        <div className="flex items-center justify-between bg-black-900/80 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 px-4 sm:px-6 py-4 border-b border-black-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold-500/10 rounded-xl border border-gold-500/20">
              <Home size={16} className="text-gold-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-gold-500 uppercase tracking-widest leading-none mb-1">Location / Cage</span>
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-white">
                {cage?.name || 'Unassigned'}
              </span>
            </div>
          </div>
          <Badge variant={pair.status === 'Active' ? 'success' : 'neutral'} className="text-[10px] uppercase tracking-widest font-black px-4 py-1 rounded-full shadow-lg border border-white/5">{pair.status}</Badge>
        </div>

        <div 
          onClick={(e) => { e.stopPropagation(); onNavigate('birds', pair.id); }}
          className={cn(
            "cursor-pointer group/members py-2",
            effectiveViewMode === 'list' ? "flex-1" : ""
          )}
        >
          <div className="flex flex-col sm:flex-row gap-4 items-stretch">
            <BirdInfo bird={male} sex="Male" />
            <div className="hidden sm:flex items-center justify-center -mx-2 relative z-20">
              <div className="p-2 bg-zinc-900 rounded-full border-4 border-zinc-800 shadow-xl">
                <Heart size={24} className={cn(pair.status === 'Active' ? 'text-rose-500 fill-rose-500 animate-pulse' : 'text-black-700')} />
              </div>
            </div>
            <BirdInfo bird={female} sex="Female" />
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-white/40 uppercase tracking-widest font-black pt-2 border-t border-black-800/30">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gold-500" />
            <span>Pairing Date: {pair.startDate || 'N/A'}</span>
          </div>
          {pair.endDate && (
            <div className="flex items-center gap-2">
              <span className="text-rose-500">Ended: {pair.endDate}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onNavigate('breeding', male?.name || female?.name || ''); }}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gold-500/10 hover:bg-gold-500/20 text-gold-500 rounded-2xl transition-all border border-gold-500/20 group/btn"
          >
            <Egg size={16} className="group-hover/btn:scale-110 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap">Breeding</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }} 
            className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl transition-all border border-black-700 group/btn"
          >
            <Edit2 size={16} className="group-hover/btn:scale-110 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap">Edit</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }} 
            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all border border-red-500/20 group/btn"
          >
            <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap">Delete</span>
          </button>
        </div>
      </div>
    </Card>
  );
}

function FinancialsView({ transactions, filteredTransactions, birds, currency, onBirdRef, onEdit, onDelete }: { transactions: Transaction[], filteredTransactions: Transaction[], birds: Bird[], currency?: string, onBirdRef: (name: string) => void, onEdit: (t: Transaction) => void, onDelete: (id: string) => void }) {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const symbol = getCurrencySymbol(currency);

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
    const birdValue = birds.reduce((acc, b) => acc + (b.estimatedValue || 0), 0);
    const birdCost = birds.reduce((acc, b) => acc + (b.purchasePrice || 0), 0);
    
    return {
      totalIncome: income,
      totalExpenses: expenses,
      netProfit: income - expenses,
      totalBirdValue: birdValue,
      totalBirdCost: birdCost,
      inventoryValue: birdValue - birdCost
    };
  }, [transactions, birds]);

  const chartData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let formatStr: string;
    let points: number;

    if (timeRange === 'daily') {
      startDate = subDays(now, 7);
      formatStr = 'EEE';
      points = 7;
    } else if (timeRange === 'weekly') {
      startDate = subWeeks(now, 4);
      formatStr = 'MMM d';
      points = 4;
    } else {
      startDate = subMonths(now, 6);
      formatStr = 'MMM';
      points = 6;
    }

    const data: any[] = [];
    for (let i = 0; i < points; i++) {
      let d: Date;
      let endD: Date;
      if (timeRange === 'daily') {
        d = startOfDay(subDays(now, points - 1 - i));
        endD = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      } else if (timeRange === 'weekly') {
        d = startOfWeek(subWeeks(now, points - 1 - i));
        endD = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else {
        d = startOfMonth(subMonths(now, points - 1 - i));
        endD = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      }

      const periodTransactions = transactions.filter(t => {
        const tDate = parseISO(t.date);
        return tDate >= d && tDate < endD;
      });

      const income = periodTransactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
      const expense = periodTransactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);

      data.push({
        name: format(d, formatStr),
        income,
        expense,
        profit: income - expense
      });
    }
    return data;
  }, [transactions, timeRange]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest">Net Profit</p>
            <TrendingUp size={16} className={stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-white tracking-tight">{symbol}{stats.netProfit.toFixed(2)}</p>
            <p className="text-[8px] sm:text-[9px] text-white/50 mt-1 font-bold uppercase tracking-tighter">Total income minus expenses</p>
          </div>
        </Card>
        <Card className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest">Inventory Value</p>
            <Activity size={16} className="text-gold-500" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-white tracking-tight">{symbol}{stats.totalBirdValue.toFixed(2)}</p>
            <p className="text-[8px] sm:text-[9px] text-white mt-1 font-bold uppercase tracking-tighter">Est. value of all birds</p>
          </div>
        </Card>
        <Card className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest">Total Income</p>
            <ArrowUpRight size={16} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-emerald-500 tracking-tight">{symbol}{stats.totalIncome.toFixed(2)}</p>
          </div>
        </Card>
        <Card className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest">Total Expenses</p>
            <ArrowDownRight size={16} className="text-rose-500" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-rose-500 tracking-tight">{symbol}{stats.totalExpenses.toFixed(2)}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts */}
        <Card className="p-6 bg-zinc-800 border-black-700 lg:col-span-2 flex flex-col">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gold-500/10 rounded-lg">
                <BarChart3 size={20} className="text-gold-500" />
              </div>
              <h3 className="font-black text-lg text-white tracking-tight uppercase">Performance</h3>
            </div>
            <div className="flex bg-black p-1 rounded-xl border border-black-700">
              {(['daily', 'weekly', 'monthly'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    "px-4 py-1.5 text-[10px] font-black rounded-lg transition-all capitalize tracking-widest",
                    timeRange === range ? "bg-gold-500 text-black-950 shadow-lg shadow-gold-500/20" : "text-white hover:text-white"
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f1f" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#525252', fontWeight: 'bold' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#525252', fontWeight: 'bold' }} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', borderRadius: '12px', border: '1px solid #1f1f1f', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                  labelStyle={{ color: '#d4af37', fontWeight: 'black', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }}
                />
                <Area type="monotone" dataKey="profit" stroke="#d4af37" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Transactions List */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-white uppercase tracking-widest text-sm">Recent Transactions</h3>
          </div>
          <div className="grid gap-3 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 350px)' }}>
            {filteredTransactions.map(t => (
              <TransactionCard 
                key={t.id} 
                transaction={t} 
                bird={birds.find(b => b.id === t.birdId)}
                onBirdRef={onBirdRef}
                onEdit={() => onEdit(t)}
                onDelete={() => onDelete(t.id)}
                viewMode="list"
              />
            ))}
            {filteredTransactions.length === 0 && (
              <div className="text-center py-12 bg-black/50 border border-dashed border-black-700 rounded-2xl">
                <DollarSign size={32} className="mx-auto text-white mb-2" />
                <p className="text-white text-sm font-bold uppercase tracking-widest">No transactions found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionCard({ transaction, bird, currency, onBirdRef, onEdit, onDelete, viewMode = 'list' }: { transaction: Transaction, bird?: Bird, currency?: string, onBirdRef: (name: string) => void, onEdit: () => void, onDelete: () => void, viewMode?: 'grid-large' | 'list' }) {
  const symbol = getCurrencySymbol(currency);
  return (
    <Card className={cn(
      "p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 group border-black-800 hover:border-gold-500/50 transition-colors relative"
    )}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={cn(
          "rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
          "w-10 h-10 sm:w-12 sm:h-12",
          transaction.type === 'Income' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
        )}>
          {transaction.type === 'Income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 sm:mb-1 flex-wrap">
            <p className="font-black text-white uppercase tracking-wider text-[10px] sm:text-xs truncate">{transaction.category}</p>
            {bird && (
              <button onClick={() => onBirdRef(bird.name)} className="transition-transform hover:scale-105 shrink-0">
                <Badge variant="info" className="text-[7px] sm:text-[8px] hover:bg-sky-500/20 cursor-pointer">{bird.name}</Badge>
              </button>
            )}
          </div>
          <p className="text-[10px] sm:text-[11px] text-white truncate font-medium">{transaction.description || 'No description'}</p>
        </div>
        <div className={cn("shrink-0 text-right")}>
          <p className={cn("font-black tracking-tighter", "text-base sm:text-lg", transaction.type === 'Income' ? "text-emerald-500" : "text-rose-500")}>
            {transaction.type === 'Income' ? '+' : '-'}{symbol}{transaction.amount.toFixed(2)}
          </p>
          <p className="text-[8px] sm:text-[9px] text-white font-bold uppercase tracking-widest">{transaction.date}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black-800/50">
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white hover:text-gold-500 rounded-lg transition-all border border-black-700 min-w-0">
          <Edit2 size={14} />
          <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Edit</span>
        </button>
        <button onClick={onDelete} className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all border border-red-500/20 min-w-0">
          <Trash2 size={14} />
          <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Delete</span>
        </button>
      </div>
    </Card>
  );
}

function BreedingRecordCard({ record, pair, male, female, birds, onEdit, onDelete, onBirdRef, viewMode = 'grid-large' }: { record: BreedingRecord, pair?: Pair, male?: Bird, female?: Bird, birds: Bird[], onEdit: () => void, onDelete: () => void, onBirdRef: (name: string) => void, viewMode?: 'grid-large' | 'list' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const effectiveViewMode = (viewMode === 'list' && isExpanded) ? 'grid-large' : viewMode;

  return (
    <Card 
      onClick={() => viewMode === 'list' && setIsExpanded(!isExpanded)}
      className={cn(
        "group transition-all duration-300 overflow-hidden", 
        effectiveViewMode === 'list' ? "flex flex-row items-center p-4 gap-4 cursor-pointer hover:bg-black-900/50" : "cursor-default"
      )}
    >
      <div className={cn("space-y-4 relative w-full", effectiveViewMode === 'list' ? "flex-1 flex flex-col space-y-3" : "p-4 sm:p-5")}>
        <div className={cn("flex items-start justify-between gap-2", effectiveViewMode === 'list' ? "w-full" : "relative")}>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Egg size={18} className="text-gold-500 shrink-0" />
              <h3 className={cn("font-black text-white tracking-tight truncate", "text-lg")}>Breeding Record</h3>
            </div>
            <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-medium text-white uppercase tracking-widest">
              <Calendar size={12} className="shrink-0" />
              <span className="truncate">{record.startDate} {record.endDate ? `- ${record.endDate}` : '(Ongoing)'}</span>
            </div>
          </div>
          
          {effectiveViewMode !== 'list' && (
            <div className={cn(
              "flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            )}>
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-white hover:text-gold-500 hover:bg-zinc-700 rounded-lg transition-colors">
                <Edit2 size={16} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-white hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        <div className={cn(
          "flex items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 bg-black rounded-xl border border-black-700",
          effectiveViewMode === 'list' ? "flex-1 py-2" : ""
        )}>
          <div className="flex items-center gap-2 min-w-0 flex-1 px-2">
            <p className="text-[8px] sm:text-[9px] text-white uppercase tracking-widest font-black shrink-0">Pair:</p>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white truncate">
              {male ? (
                <button onClick={(e) => { e.stopPropagation(); onBirdRef(male.name); }} className="hover:text-gold-500 transition-colors">{male.name}</button>
              ) : 'Unknown'}
              <span className="text-white">×</span>
              {female ? (
                <button onClick={(e) => { e.stopPropagation(); onBirdRef(female.name); }} className="hover:text-gold-500 transition-colors">{female.name}</button>
              ) : 'Unknown'}
            </div>
          </div>
          <div className="h-6 sm:h-8 w-px bg-zinc-700 shrink-0" />
          <div className="flex items-center gap-4 px-2">
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-white uppercase font-black">Eggs</span>
              <span className="text-xs font-black text-white">{record.eggsLaid}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-white uppercase font-black">Hatch</span>
              <span className="text-xs font-black text-white">{record.eggsHatched}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-white uppercase font-black">Wean</span>
              <span className="text-xs font-black text-white">{record.chicksWeaned}</span>
            </div>
          </div>
        </div>

        {effectiveViewMode !== 'list' && (
          <div className="space-y-4 mb-4">
            {record.offspringIds && record.offspringIds.length > 0 && (
              <div className="p-4 bg-black rounded-2xl border border-black-700">
                <div className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Tagged Offspring</div>
                <div className="flex flex-wrap gap-2">
                  {record.offspringIds.map(id => {
                    const offspring = birds.find(b => b.id === id);
                    return offspring ? (
                      <button key={id} onClick={(e) => { e.stopPropagation(); onBirdRef(offspring.name); }} className="transition-transform hover:scale-105">
                        <Badge variant="info" className="text-[10px] hover:bg-sky-500/20 cursor-pointer">{offspring.name}</Badge>
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {record.notes && (
              <div className="p-4 bg-black rounded-2xl border border-black-700">
                <div className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Notes</div>
                <p className="text-sm text-white leading-relaxed">{record.notes}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black-800/50">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white hover:text-gold-500 rounded-lg transition-all border border-black-700 min-w-0">
            <Edit2 size={14} className="shrink-0" />
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest truncate hidden sm:inline">Edit</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all border border-red-500/20 min-w-0">
            <Trash2 size={14} className="shrink-0" />
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest truncate hidden sm:inline">Delete</span>
          </button>
          {viewMode === 'list' && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white hover:text-gold-500 rounded-lg transition-all border border-black-700 shrink-0"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

function BreedingRecordForm({ user, initialData, pairs, birds, onClose }: { user: FirebaseUser, initialData?: BreedingRecord, pairs: Pair[], birds: Bird[], onClose: () => void }) {
  const [formData, setFormData] = useState<Partial<BreedingRecord>>(initialData || { pairId: '', startDate: '', endDate: '', eggsLaid: 0, eggsHatched: 0, chicksWeaned: 0, offspringIds: [], notes: '' });
  const [isSaving, setIsSaving] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pairId) {
      toast.error('Please select a pair.');
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    
    const savePromise = async () => {
      try {
        const data = { ...formData, uid: user.uid };
        if (initialData?.id) { await updateDoc(doc(db, 'breedingRecords', initialData.id), data); } 
        else { 
          const docRef = doc(collection(db, 'breedingRecords'));
          await setDoc(docRef, data); 
        }
      } catch (err) { handleFirestoreError(err, initialData ? OperationType.UPDATE : OperationType.CREATE, 'breedingRecords'); }
    };

    savePromise();
    onClose();
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <SearchableSelect 
          label="Pair"
          value={formData.pairId || ''}
          onChange={(val) => setFormData({ ...formData, pairId: val })}
          options={[
            { id: '', name: 'Select Pair' },
            ...pairs.map(p => {
              const male = birds.find(b => b.id === p.maleId);
              const female = birds.find(b => b.id === p.femaleId);
              return { id: p.id, name: `${male?.name || 'Unknown'} × ${female?.name || 'Unknown'}` };
            })
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Start Date</label><Input type="date" required value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">End Date</label><Input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Eggs Laid</label><Input type="number" min="0" required value={formData.eggsLaid} onChange={e => setFormData({ ...formData, eggsLaid: parseInt(e.target.value) || 0 })} /></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Hatched</label><Input type="number" min="0" required value={formData.eggsHatched} onChange={e => setFormData({ ...formData, eggsHatched: parseInt(e.target.value) || 0 })} /></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Weaned</label><Input type="number" min="0" required value={formData.chicksWeaned} onChange={e => setFormData({ ...formData, chicksWeaned: parseInt(e.target.value) || 0 })} /></div>
      </div>
      <div className="space-y-1">
        <SearchableSelect 
          label="Tag Offspring"
          options={birds.map(b => ({ id: b.id, name: b.name }))}
          multi
          selectedValues={formData.offspringIds?.map(id => birds.find(b => b.id === id)?.name || id) || []}
          onChange={(id) => {
            const current = formData.offspringIds || [];
            setFormData({ 
              ...formData, 
              offspringIds: current.includes(id) ? current.filter(m => m !== id) : [...current, id] 
            });
          }}
          placeholder="Select Offspring"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Notes</label>
        <textarea 
          className="w-full px-4 py-3 bg-black border border-black-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-white transition-all min-h-[80px] text-sm font-medium placeholder:text-white/30" 
          placeholder="Breeding notes..."
          value={formData.notes} 
          onChange={e => setFormData({ ...formData, notes: e.target.value })} 
        />
      </div>
      <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest font-black" disabled={isSaving}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {initialData ? 'Update' : 'Add'} Record
      </Button>
    </form>
  );
}

function TransactionForm({ user, initialData, birds, currency, onClose }: { user: FirebaseUser, initialData?: Transaction, birds: Bird[], currency?: string, onClose: () => void }) {
  const symbol = getCurrencySymbol(currency);
  const [formData, setFormData] = useState<Partial<Transaction>>(initialData || {
    type: 'Expense',
    category: '',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    birdId: '',
    description: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    
    const savePromise = async () => {
      try {
        const data = { ...formData, uid: user.uid };
        if (initialData?.id) { await updateDoc(doc(db, 'transactions', initialData.id), data); } 
        else { 
          const docRef = doc(collection(db, 'transactions'));
          await setDoc(docRef, data); 
        }
      } catch (err) { handleFirestoreError(err, initialData ? OperationType.UPDATE : OperationType.CREATE, 'transactions'); }
    };

    savePromise();
    onClose();
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Type</label>
          <Select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
            <option value="Income" className="bg-black text-white">Income</option>
            <option value="Expense" className="bg-black text-white">Expense</option>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Amount ({symbol})</label>
          <Input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Category</label>
          <Input required placeholder="e.g. Seed, Sale, Vet" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Date</label>
          <Input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <SearchableSelect 
          label="Related Bird (Optional)"
          value={formData.birdId || ''}
          onChange={(val) => setFormData({ ...formData, birdId: val })}
          options={[
            { id: '', name: 'None' },
            ...birds.map(b => ({ id: b.id, name: b.name }))
          ]}
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Description</label>
        <textarea 
          className="w-full px-4 py-3 bg-black border border-black-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-white transition-all min-h-[100px] text-sm font-medium placeholder:text-white/30" 
          placeholder="Enter transaction details..."
          value={formData.description} 
          onChange={e => setFormData({ ...formData, description: e.target.value })} 
        />
      </div>
      <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest font-black" disabled={isSaving}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {initialData ? 'Update' : 'Add'} Transaction
      </Button>
    </form>
  );
}

function TaskCard({ task, birds, onBirdRef, onToggle, onEdit, onDelete, viewMode = 'grid-large' }: { task: Task, birds: Bird[], onBirdRef: (name: string) => void, onToggle: () => void, onEdit: () => void, onDelete: () => void, viewMode?: 'grid-large' | 'list' }) {
  const [expanded, setExpanded] = useState(false);
  const effectiveViewMode = (viewMode === 'list' && expanded) ? 'grid-large' : viewMode;
  const completedSubtasks = task.subTasks.filter(s => s.completed).length;

  return (
    <Card 
      onClick={() => viewMode === 'list' && setExpanded(!expanded)}
      className={cn(
        'transition-all group border-black-800 hover:border-gold-500/30 relative overflow-hidden', 
        task.status === 'Completed' && 'opacity-60',
        effectiveViewMode === 'list' ? "flex flex-row items-center p-4 gap-4 cursor-pointer hover:bg-black-900/50" : "cursor-default"
      )}
    >
      <div className={cn("space-y-4 relative w-full", effectiveViewMode === 'list' ? "flex-1 flex flex-col space-y-3" : "p-4 sm:p-5")}>
        <div className={cn("flex items-start gap-3 sm:gap-4", effectiveViewMode === 'list' ? "w-full items-center" : "")}>
          <button 
            onClick={(e) => { e.stopPropagation(); onToggle(); }} 
            className={cn(
              'w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 shrink-0', 
              task.status === 'Completed' 
                ? 'bg-gold-500 border-gold-500 text-black-950 shadow-lg shadow-gold-500/20' 
                : 'border-black-700 hover:border-gold-500/50'
            )}
          >
            {task.status === 'Completed' && <CheckSquare size={14} className="fill-current" />}
          </button>
          
          <div className={cn("flex-1 min-w-0", effectiveViewMode === 'list' ? "flex items-center justify-between gap-4" : "space-y-1")}>
            <div className="min-w-0 flex-1">
              <h3 className={cn('font-black tracking-tight transition-all truncate', 
                "text-base sm:text-lg",
                task.status === 'Completed' ? 'text-black-100 line-through' : 'text-white'
              )}>
                {task.title}
              </h3>
              {task.dueDate && (
                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-widest truncate">
                  <Calendar size={12} className="text-gold-500 shrink-0" />
                  {task.dueDate}
                </div>
              )}
              {task.reminderDate && (
                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-white uppercase tracking-widest truncate mt-0.5">
                  <Bell size={12} className="text-gold-500 shrink-0" />
                  {new Date(task.reminderDate).toLocaleString()}
                </div>
              )}
            </div>

            {effectiveViewMode === 'list' && (
              <div className="flex items-center gap-4 shrink-0">
                <Badge variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'warning' : 'neutral'} className="text-[8px] uppercase tracking-widest font-black">
                  {task.priority}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {effectiveViewMode === 'list' && (
          <div className="flex items-center gap-2 pt-2 border-t border-black-800/50">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white hover:text-gold-500 rounded-lg transition-all border border-black-700">
              <Edit2 size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest">Edit</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all border border-red-500/20">
              <Trash2 size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest">Delete</span>
            </button>
          </div>
        )}
            
        {effectiveViewMode !== 'list' && (
          <div className="flex items-center gap-2 pt-2 border-t border-black-800">
            <Badge variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'warning' : 'neutral'} className="text-[8px] uppercase tracking-widest font-black">
              {task.priority}
            </Badge>
            <span className="text-[10px] text-white font-bold uppercase tracking-widest">{task.category}</span>
          </div>
        )}

        {effectiveViewMode !== 'list' && task.description && <p className="text-xs sm:text-sm text-white font-medium leading-relaxed line-clamp-2 sm:line-clamp-none mt-2">{task.description}</p>}

        {effectiveViewMode !== 'list' && task.subTasks.length > 0 && (
          <div className="pt-3 sm:pt-4 border-t border-black-800">
            <button 
              onClick={() => setExpanded(!expanded)} 
              className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 hover:text-gold-500 transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Subtasks ({completedSubtasks}/{task.subTasks.length})
            </button>
            
            <div className="w-full h-1 bg-black rounded-full overflow-hidden mt-3">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(completedSubtasks / task.subTasks.length) * 100}%` }}
                className="h-full bg-gold-500 shadow-lg shadow-gold-500/20"
              />
            </div>

            <AnimatePresence>
              {expanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }} 
                  className="overflow-hidden space-y-2 mt-4 pl-3 border-l-2 border-black-800"
                >
                  {task.subTasks.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-black rounded-2xl border border-black-700">
                      <div className={cn('w-2 h-2 rounded-full shrink-0', sub.completed ? 'bg-gold-500 shadow-sm shadow-gold-500/50' : 'bg-zinc-700')} />
                      <span className={cn('text-xs font-bold flex-1', sub.completed ? 'text-black-200 line-through' : 'text-black-50')}>
                        {sub.title}
                      </span>
                      <div className="flex gap-1.5">
                        {sub.birdIds.map(id => {
                          const bird = birds.find(b => b.id === id);
                          return (
                            <button 
                              key={id} 
                              onClick={() => bird && onBirdRef(bird.name)}
                              className="text-[8px] font-black uppercase tracking-tighter text-black-100 hover:text-gold-500"
                            >
                              @{bird?.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {effectiveViewMode !== 'list' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black-800/50">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white hover:text-gold-500 rounded-lg transition-all border border-black-700 min-w-0">
              <Edit2 size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Edit</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all border border-red-500/20 min-w-0">
              <Trash2 size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Delete</span>
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

// --- Subscription View ---

function SubscriptionView({ settings, onRenew }: { settings: UserSettings, onRenew: () => void }) {
  const expiryDate = settings.account_expiry_date ? new Date(settings.account_expiry_date) : null;
  const now = new Date();
  const isValidDate = expiryDate && !isNaN(expiryDate.getTime());
  const isExpired = !isValidDate || now > expiryDate;
  const diffTime = isValidDate ? expiryDate.getTime() - now.getTime() : 0;
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const statusText = isExpired 
    ? 'Your access has expired. Renew to regain full access.' 
    : daysLeft === 0 
      ? 'Today is your last day of access. Renew now to avoid interruption.'
      : `You have ${daysLeft} days remaining.`;

  const handlePay = async () => {
    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: window.location.origin })
      });
      const data = await response.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        toast.error("Payment failed: " + (data.error || "Unknown error"));
      }
    } catch (error: any) {
      toast.error("Payment failed: " + error.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <h2 className="text-2xl font-black uppercase tracking-widest text-gold-500 mb-6">Subscription Status</h2>
      
      <Card className="p-6 sm:p-8 bg-black-900 border-black-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className={cn("w-16 h-16 rounded-full flex items-center justify-center shrink-0 border", isExpired ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500")}>
            {isExpired ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-widest">
              {isExpired ? 'Expired' : daysLeft <= 30 ? 'Trial Active' : 'Active Subscription'}
            </h3>
            <p className="text-black-50 font-medium mt-1">
              {statusText}
            </p>
            {expiryDate && (
              <p className="text-[10px] text-black-100 font-bold uppercase tracking-widest mt-2">
                Valid until: {format(expiryDate, 'PPP')}
              </p>
            )}
          </div>
        </div>
        
        <div className="w-full md:w-auto flex flex-col gap-2">
          <Button 
            onClick={handlePay} 
            disabled={!isExpired && daysLeft > 30}
            className="w-full md:w-48 py-4 text-sm"
          >
            {isExpired ? 'Renew Now (R450)' : 'Extend 1 Year (R450)'}
          </Button>
          {!isExpired && daysLeft > 30 && (
            <p className="text-[8px] text-center text-gold-500/50 font-bold uppercase tracking-widest">
              Available when &lt; 30 days left
            </p>
          )}
          <p className="text-[8px] text-center text-black-200 font-bold uppercase tracking-widest">Powered by Yoco</p>
        </div>
      </Card>
    </div>
  );
}

// --- Settings View ---

function SettingsView({ settings, onUpdate, allData, user, isSyncing, setDeleteConfirmation }: { settings: UserSettings, onUpdate: (s: UserSettings) => void, allData: any, user: FirebaseUser | null, isSyncing: boolean, setDeleteConfirmation: (data: any) => void }) {
  const [activeSection, setActiveSection] = useState<'general' | 'species' | 'subspecies' | 'mutations' | 'data' | null>('general');
  const [newSpecies, setNewSpecies] = useState('');
  const [newMutation, setNewMutation] = useState('');
  const [newSubSpecies, setNewSubSpecies] = useState('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState('');
  const [editingItem, setEditingItem] = useState<{ type: 'species' | 'subspecies' | 'mutation', id: string, name: string } | null>(null);

  const downloadBackup = () => {
    const data = JSON.stringify(allData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aviary_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addSpecies = () => {
    if (!newSpecies.trim()) return;
    onUpdate({ ...settings, species: [...(settings.species || []), { id: crypto.randomUUID(), name: newSpecies.trim() }] });
    setNewSpecies('');
  };

  const addMutation = () => {
    if (!newMutation.trim()) return;
    onUpdate({ ...settings, mutations: [...(settings.mutations || []), { id: crypto.randomUUID(), name: newMutation.trim() }] });
    setNewMutation('');
  };

  const addSubSpecies = () => {
    if (!newSubSpecies.trim() || !selectedSpeciesId) return;
    onUpdate({ ...settings, subspecies: [...(settings.subspecies || []), { id: crypto.randomUUID(), name: newSubSpecies.trim(), speciesId: selectedSpeciesId }] });
    setNewSubSpecies('');
  };

  const handleEdit = () => {
    if (!editingItem || !editingItem.name.trim()) return;
    const newSettings = { ...settings };
    if (editingItem.type === 'species') {
      newSettings.species = newSettings.species.map(s => s.id === editingItem.id ? { ...s, name: editingItem.name.trim() } : s);
    } else if (editingItem.type === 'subspecies') {
      newSettings.subspecies = newSettings.subspecies.map(ss => ss.id === editingItem.id ? { ...ss, name: editingItem.name.trim() } : ss);
    } else if (editingItem.type === 'mutation') {
      newSettings.mutations = newSettings.mutations.map(m => m.id === editingItem.id ? { ...m, name: editingItem.name.trim() } : m);
    }
    onUpdate(newSettings);
    setEditingItem(null);
  };

  const removeSpecies = (id: string, name: string) => {
    setDeleteConfirmation({
      title: 'Delete Species',
      message: `Are you sure you want to delete "${name}"? All associated sub-species will also be removed.`,
      onConfirm: () => {
        onUpdate({ 
          ...settings, 
          species: settings.species.filter(s => s.id !== id),
          subspecies: settings.subspecies.filter(ss => ss.speciesId !== id)
        });
        toast.success('Species removed');
      }
    });
  };

  const removeSubSpecies = (id: string, name: string) => {
    setDeleteConfirmation({
      title: 'Delete Sub-species',
      message: `Are you sure you want to delete "${name}"?`,
      onConfirm: () => {
        onUpdate({ ...settings, subspecies: settings.subspecies.filter(ss => ss.id !== id) });
        toast.success('Sub-species removed');
      }
    });
  };

  const removeMutation = (id: string, name: string) => {
    setDeleteConfirmation({
      title: 'Delete Mutation',
      message: `Are you sure you want to delete "${name}"?`,
      onConfirm: () => {
        onUpdate({ ...settings, mutations: settings.mutations.filter(m => m.id !== id) });
        toast.success('Mutation removed');
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 min-h-[600px] flex flex-col lg:flex-row gap-8">
      {/* Sidebar / Categories */}
      <div className="w-full lg:w-80 space-y-3 flex-shrink-0">
        <SettingRow 
          icon={User} 
          title="General" 
          description="Language & Currency" 
          active={activeSection === 'general'} 
          onClick={() => setActiveSection('general')} 
        />
        <SettingRow 
          icon={BirdIcon} 
          title="Species" 
          description="Manage Bird Species" 
          active={activeSection === 'species'} 
          onClick={() => setActiveSection('species')} 
        />
        <SettingRow 
          icon={GitBranch} 
          title="Sub-Species" 
          description="Manage Sub-Species" 
          active={activeSection === 'subspecies'} 
          onClick={() => setActiveSection('subspecies')} 
        />
        <SettingRow 
          icon={Tag} 
          title="Mutations" 
          description="Manage Mutations" 
          active={activeSection === 'mutations'} 
          onClick={() => setActiveSection('mutations')} 
        />
        <SettingRow 
          icon={Activity} 
          title="Data Management" 
          description="Backup & Export" 
          active={activeSection === 'data'} 
          onClick={() => setActiveSection('data')} 
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-black-900/50 border border-black-800 rounded-3xl p-6 lg:p-8 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeSection === 'general' && (
            <motion.div 
              key="general"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <h3 className="text-lg font-black uppercase tracking-widest text-gold-500">General Settings</h3>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-black-100 uppercase tracking-widest ml-1">Currency</label>
                  <Select 
                    value={settings.currency || 'ZAR'} 
                    onChange={e => onUpdate({ ...settings, currency: e.target.value })}
                  >
                    <option value="ZAR">Rand (R)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">Euro (€)</option>
                    <option value="GBP">Pound (£)</option>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'species' && (
            <motion.div 
              key="species"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase tracking-widest text-gold-500">Manage Species</h3>
                  <Badge variant="info">{settings.species?.length || 0} Total</Badge>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="New species name..." value={newSpecies} onChange={e => setNewSpecies(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSpecies()} />
                  <Button onClick={addSpecies} variant="secondary" className="px-4"><Plus size={18} /></Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {settings.species?.map(s => (
                    <div key={s.id} className="p-3 bg-black border border-black-700 rounded-xl flex items-center justify-between group">
                      <span className="text-sm font-bold text-white">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setEditingItem({ type: 'species', id: s.id, name: s.name })} 
                          className="text-gold-500 hover:text-white p-2 bg-zinc-800 hover:bg-gold-500 rounded-xl transition-all border border-gold-500/20"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => removeSpecies(s.id, s.name)} 
                          className="text-red-500 hover:text-white p-2 bg-red-500/10 hover:bg-red-500 rounded-xl transition-all border border-red-500/20"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'subspecies' && (
            <motion.div 
              key="subspecies"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <h3 className="text-lg font-black uppercase tracking-widest text-gold-500">Manage Sub-Species</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-black-100 uppercase tracking-widest ml-1">Parent Species</label>
                    <Select value={selectedSpeciesId} onChange={e => setSelectedSpeciesId(e.target.value)}>
                      <option value="">Select Parent Species</option>
                      {settings.species?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-black-100 uppercase tracking-widest ml-1">Sub-Species Name</label>
                    <div className="flex gap-2">
                      <Input placeholder="New sub-species name..." value={newSubSpecies} onChange={e => setNewSubSpecies(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubSpecies()} />
                      <Button onClick={addSubSpecies} variant="secondary" className="px-4" disabled={!selectedSpeciesId}><Plus size={18} /></Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 mt-6">
                  {settings.species?.map(s => {
                    const subs = settings.subspecies?.filter(ss => ss.speciesId === s.id) || [];
                    if (subs.length === 0) return null;
                    return (
                      <div key={s.id} className="space-y-2">
                        <p className="text-[10px] font-black text-black-100 uppercase tracking-widest ml-1">{s.name} Sub-species</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                          {subs.map(ss => (
                            <div key={ss.id} className="p-3 bg-black border border-black-700 rounded-xl flex items-center justify-between group">
                              <span className="text-sm font-bold text-white">{ss.name}</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => setEditingItem({ type: 'subspecies', id: ss.id, name: ss.name })} className="text-black-200 hover:text-gold-500 p-1.5 bg-zinc-800 rounded-lg transition-all"><Edit2 size={14} /></button>
                                <button onClick={() => removeSubSpecies(ss.id, ss.name)} className="text-black-200 hover:text-red-500 p-1.5 bg-zinc-800 rounded-lg transition-all"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'mutations' && (
            <motion.div 
              key="mutations"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase tracking-widest text-gold-500">Manage Mutations</h3>
                  <Badge variant="info">{settings.mutations?.length || 0} Total</Badge>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="New mutation name..." value={newMutation} onChange={e => setNewMutation(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMutation()} />
                  <Button onClick={addMutation} variant="secondary" className="px-4"><Plus size={18} /></Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {settings.mutations?.map(m => (
                    <div key={m.id} className="p-3 bg-black border border-black-700 rounded-xl flex items-center justify-between group">
                      <span className="text-sm font-bold text-white">{m.name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingItem({ type: 'mutation', id: m.id, name: m.name })} className="text-black-200 hover:text-gold-500 p-1.5 bg-zinc-800 rounded-lg transition-all"><Edit2 size={14} /></button>
                        <button onClick={() => removeMutation(m.id, m.name)} className="text-black-200 hover:text-red-500 p-1.5 bg-zinc-800 rounded-lg transition-all"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          {activeSection === 'data' && (
            <motion.div 
              key="data"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <h3 className="text-lg font-black uppercase tracking-widest text-gold-500">Data Management</h3>
                <div className="p-6 bg-black border border-black-700 rounded-3xl space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gold-500/10 rounded-2xl text-gold-500">
                      <ImageIcon size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-white">Manual Backup</h4>
                      <p className="text-[10px] font-bold text-white/50 uppercase tracking-tighter mt-0.5">Download all your records as a JSON file</p>
                    </div>
                  </div>
                  <Button onClick={downloadBackup} className="w-full py-4">Download Backup Now</Button>
                </div>

                <div className="bg-black-900 border border-black-800 rounded-3xl p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gold-500/10 rounded-2xl text-gold-500">
                      <Cloud size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-black uppercase tracking-widest text-white">Cloud Sync</h4>
                      <p className="text-[10px] font-bold text-white/50 uppercase tracking-tighter mt-0.5">
                        {isSyncing ? 'Syncing changes...' : 'All data backed up online'}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      onClick={() => window.location.reload()}
                      className="text-[10px] font-black uppercase tracking-widest text-gold-500"
                    >
                      Refresh
                    </Button>
                  </div>
                  
                  <div className="pt-4 border-t border-black-800 space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-white/50">User ID</span>
                      <span className="text-white font-mono">{user?.uid.slice(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-white/50">Birds</span>
                      <span className="text-white">{allData.birds.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-white/50">Cages</span>
                      <span className="text-white">{allData.cages.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black-900 border border-black-800 p-6 rounded-3xl w-full max-w-md shadow-2xl"
            >
              <h4 className="text-lg font-black uppercase tracking-widest text-gold-500 mb-4">Edit {editingItem.type}</h4>
              <div className="space-y-4">
                <Input 
                  value={editingItem.name} 
                  onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleEdit()}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button onClick={() => setEditingItem(null)} variant="ghost" className="flex-1">Cancel</Button>
                  <Button onClick={handleEdit} className="flex-1">Save Changes</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PrintListModal({ birds, cages, onClose }: { birds: Bird[], cages: Cage[], onClose: () => void }) {
  const [selectedBirds, setSelectedBirds] = useState<string[]>([]);
  const [selectedCages, setSelectedCages] = useState<string[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [printEmpty, setPrintEmpty] = useState(false);
  const [printMode, setPrintMode] = useState<'birds' | 'cages'>('birds');

  const sortedBirds = useMemo(() => {
    return [...birds].sort((a, b) => {
      const cageA = cages.find(c => c.id === a.cageId)?.name || 'ZZZ';
      const cageB = cages.find(c => c.id === b.cageId)?.name || 'ZZZ';
      if (cageA !== cageB) return cageA.localeCompare(cageB);
      const sexOrder: Record<string, number> = { 'Male': 0, 'Female': 1, 'Unknown': 2 };
      return (sexOrder[a.sex] ?? 2) - (sexOrder[b.sex] ?? 2);
    });
  }, [birds, cages]);

  const filteredBirds = sortedBirds.filter(bird => {
    const cageName = cages.find(c => c.id === bird.cageId)?.name || 'No Cage';
    const searchLower = searchQuery.toLowerCase();
    return (
      bird.name.toLowerCase().includes(searchLower) ||
      cageName.toLowerCase().includes(searchLower) ||
      bird.species.toLowerCase().includes(searchLower) ||
      (bird.mutations || []).some(m => m.toLowerCase().includes(searchLower))
    );
  });

  const filteredCages = cages.filter(cage => {
    const searchLower = searchQuery.toLowerCase();
    return (
      cage.name.toLowerCase().includes(searchLower) ||
      cage.type.toLowerCase().includes(searchLower) ||
      (cage.location || '').toLowerCase().includes(searchLower)
    );
  });

  const handlePrint = () => {
    setIsPrinting(true);
    // Increased timeout to ensure portal is fully rendered before print dialog
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      onClose();
    }, 1500);
  };

  const toggleAllBirds = () => {
    if (selectedBirds.length === filteredBirds.length) {
      setSelectedBirds([]);
    } else {
      setSelectedBirds(filteredBirds.map(b => b.id));
    }
  };

  const toggleAllCages = () => {
    if (selectedCages.length === filteredCages.length) {
      setSelectedCages([]);
    } else {
      setSelectedCages(filteredCages.map(c => c.id));
    }
  };

  const toggleBird = (id: string) => {
    setSelectedBirds(prev => prev.includes(id) ? prev.filter(bId => bId !== id) : [...prev, id]);
  };

  const toggleCage = (id: string) => {
    setSelectedCages(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
  };

  const itemsToPrint = printMode === 'birds' 
    ? (printEmpty ? Array.from({ length: 20 }) : sortedBirds.filter(b => selectedBirds.includes(b.id)))
    : (printEmpty ? Array.from({ length: 10 }) : cages.filter(c => selectedCages.includes(c.id)));

  const pageSize = printMode === 'birds' ? 20 : 10;
  const pages = [];
  for (let i = 0; i < itemsToPrint.length; i += pageSize) {
    pages.push(itemsToPrint.slice(i, i + pageSize));
  }
  if (pages.length === 0 && printEmpty) pages.push([]);

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
            visibility: hidden;
          }
          .print-only {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            z-index: 99999 !important;
          }
          .print-page {
            page-break-after: always !important;
            min-height: 280mm !important;
            display: flex !important;
            flex-direction: column !important;
            padding: 15mm !important;
            background: white !important;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            border: 2px solid black !important;
            margin-bottom: 20px !important;
          }
          th, td {
            border: 1.5px solid black !important;
            padding: 10px !important;
            font-size: 12px !important;
            height: ${printMode === 'birds' ? '48px' : '95px'} !important;
            vertical-align: top !important;
            color: black !important;
            overflow: hidden !important;
            word-wrap: break-word !important;
          }
          th {
            background-color: #f0f0f0 !important;
            font-weight: 900 !important;
            text-transform: uppercase !important;
            -webkit-print-color-adjust: exact;
            height: 40px !important;
            vertical-align: middle !important;
            text-align: left !important;
          }
          .col-cage { width: 15%; }
          .col-id { width: 25%; }
          .col-sex { width: 10%; }
          .col-species { width: 25%; }
          .col-notes { width: 25%; }
          
          .col-cage-name { width: 20%; }
          .col-cage-type { width: 20%; }
          .col-cage-loc { width: 20%; }
          .col-cage-notes { width: 40%; }
        }
      `}</style>
      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex bg-black-900/50 p-1 rounded-xl border border-black-800">
            <button 
              onClick={() => setPrintMode('birds')}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                printMode === 'birds' ? "bg-gold-500 text-black" : "text-black-400 hover:text-white"
              )}
            >
              Birds (20/pg)
            </button>
            <button 
              onClick={() => setPrintMode('cages')}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                printMode === 'cages' ? "bg-gold-500 text-black" : "text-black-400 hover:text-white"
              )}
            >
              Cages (10/pg)
            </button>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black-400" size={16} />
              <input
                type="text"
                placeholder={`Search ${printMode}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black-900/50 border border-black-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setPrintEmpty(!printEmpty)} 
                variant="secondary" 
                className="py-2 px-4 text-[10px] whitespace-nowrap"
              >
                Mode: {printEmpty ? 'Empty List' : 'Selection'}
              </Button>
              {!printEmpty && (
                <Button 
                  onClick={printMode === 'birds' ? toggleAllBirds : toggleAllCages} 
                  variant="secondary" 
                  className="py-2 px-4 text-[10px] whitespace-nowrap"
                >
                  {(printMode === 'birds' ? selectedBirds.length === filteredBirds.length : selectedCages.length === filteredCages.length) ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {!printEmpty && (
          <div className="max-h-[50vh] overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {printMode === 'birds' ? (
              filteredBirds.map(bird => {
                const cage = cages.find(c => c.id === bird.cageId);
                const isSelected = selectedBirds.includes(bird.id);
                return (
                  <div 
                    key={bird.id} 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                      isSelected ? "bg-gold-500/10 border-gold-500/50" : "bg-zinc-900/50 border-black-800 hover:border-black-600"
                    )} 
                    onClick={() => toggleBird(bird.id)}
                  >
                    <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors", isSelected ? "bg-gold-500 border-gold-500 text-black" : "border-black-600")}>
                      {isSelected && <CheckSquare size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-white truncate">{bird.name}</p>
                        <Badge variant={bird.sex === 'Male' ? 'info' : bird.sex === 'Female' ? 'warning' : 'neutral'} className="text-[8px] px-1 py-0">{bird.sex}</Badge>
                      </div>
                      <p className="text-[10px] text-black-200 uppercase tracking-widest truncate">
                        {cage?.name || 'No Cage'} • {bird.species}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              filteredCages.map(cage => {
                const isSelected = selectedCages.includes(cage.id);
                return (
                  <div 
                    key={cage.id} 
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                      isSelected ? "bg-gold-500/10 border-gold-500/50" : "bg-zinc-900/50 border-black-800 hover:border-black-600"
                    )} 
                    onClick={() => toggleCage(cage.id)}
                  >
                    <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors", isSelected ? "bg-gold-500 border-gold-500 text-black" : "border-black-600")}>
                      {isSelected && <CheckSquare size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{cage.name}</p>
                      <p className="text-[10px] text-black-200 uppercase tracking-widest truncate">
                        {cage.type} • {cage.location || 'No Location'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {printEmpty && (
          <div className="p-4 bg-zinc-900/50 border border-black-800 rounded-xl text-center space-y-2">
            <Printer size={32} className="mx-auto text-gold-500/50" />
            <p className="text-sm text-white font-medium">Empty List Mode ({printMode === 'birds' ? '20' : '10'} lines)</p>
            <p className="text-xs text-black-400">This will print a blank table for manual notes.</p>
          </div>
        )}

        <Button 
          onClick={handlePrint} 
          disabled={!printEmpty && (printMode === 'birds' ? selectedBirds.length === 0 : selectedCages.length === 0)} 
          className="w-full py-4 mt-4"
        >
          <Printer size={18} className="mr-2" />
          Confirm & Print
        </Button>
      </div>

      {isPrinting && createPortal(
        <div className="print-only">
          {pages.map((pageItems, pageIdx) => (
            <div key={pageIdx} className="print-page">
              <div className="flex justify-between items-end border-b-4 border-black pb-4 mb-6">
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-tighter mb-1">Aviary Records</h1>
                  <p className="text-xs font-black text-gray-600 uppercase tracking-[0.3em]">
                    {printMode === 'birds' ? 'Bird Inventory Log' : 'Cage Management Log'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-800 uppercase tracking-widest mb-1">Date: {new Date().toLocaleDateString()}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Total {printMode === 'birds' ? 'Birds' : 'Cages'}: {itemsToPrint.length} • Page {pageIdx + 1} of {pages.length}
                  </p>
                </div>
              </div>

              <div className="flex-1">
                <table className="w-full">
                  <thead>
                    {printMode === 'birds' ? (
                      <tr>
                        <th className="col-cage">Cage</th>
                        <th className="col-id">Bird ID / Ring</th>
                        <th className="col-sex">Sex</th>
                        <th className="col-species">Species / Mutation</th>
                        <th className="col-notes">Notes</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="col-cage-name">Cage Name</th>
                        <th className="col-cage-type">Type</th>
                        <th className="col-cage-loc">Location</th>
                        <th className="col-cage-notes">Notes / Occupants</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {pageItems.map((item: any, i: number) => {
                      if (printEmpty) {
                        return (
                          <tr key={i}>
                            {printMode === 'birds' ? (
                              <>
                                <td className="col-cage"></td>
                                <td className="col-id"></td>
                                <td className="col-sex"></td>
                                <td className="col-species"></td>
                                <td className="col-notes"></td>
                              </>
                            ) : (
                              <>
                                <td className="col-cage-name"></td>
                                <td className="col-cage-type"></td>
                                <td className="col-cage-loc"></td>
                                <td className="col-cage-notes"></td>
                              </>
                            )}
                          </tr>
                        );
                      }
                      
                      if (printMode === 'birds') {
                        const bird = item as Bird;
                        const cage = cages.find(c => c.id === bird.cageId);
                        return (
                          <tr key={bird.id}>
                            <td className="font-black uppercase truncate">{cage?.name || '-'}</td>
                            <td className="font-bold truncate">{bird.name}</td>
                            <td className="font-black uppercase">{bird.sex}</td>
                            <td className="truncate">{bird.species} {bird.mutations?.join(', ')}</td>
                            <td></td>
                          </tr>
                        );
                      } else {
                        const cage = item as Cage;
                        return (
                          <tr key={cage.id}>
                            <td className="font-black uppercase truncate">{cage.name}</td>
                            <td className="truncate">{cage.type}</td>
                            <td className="truncate">{cage.location || '-'}</td>
                            <td></td>
                          </tr>
                        );
                      }
                    })}
                    {/* Fill remaining space */}
                    {pageItems.length < pageSize && Array.from({ length: pageSize - pageItems.length }).map((_, i) => (
                      <tr key={`empty-${i}`}>
                        {printMode === 'birds' ? (
                          <>
                            <td></td><td></td><td></td><td></td><td></td>
                          </>
                        ) : (
                          <>
                            <td></td><td></td><td></td><td></td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200 text-[9px] text-gray-400 flex justify-between uppercase tracking-[0.2em] font-black">
                <span>Generated by Aviary Manager Pro</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-zinc-800 border border-black-700 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-black-700 flex items-center justify-between bg-zinc-800">
          <h3 className="text-xl font-black text-white uppercase tracking-widest">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-black/20 rounded-xl text-white/50 hover:text-gold-500 transition-all"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar bg-zinc-800 text-white">{children}</div>
      </motion.div>
    </div>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-zinc-800 border border-black-700 rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4 text-red-500">
            <div className="p-3 bg-red-500/10 rounded-2xl">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-widest">{title}</h3>
          </div>
          <p className="text-white/70 text-sm font-medium leading-relaxed">{message}</p>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1 py-4">Cancel</Button>
            <Button variant="danger" onClick={onConfirm} className="flex-1 py-4">Delete</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// --- Forms ---

function BirdForm({ user, initialData, cages, birds, pairs, userSettings, onAddSpecies, onAddSubSpecies, onAddMutation, onClose }: { user: FirebaseUser, initialData?: Bird | null, cages: Cage[], birds: Bird[], pairs: Pair[], userSettings: UserSettings | null, onAddSpecies: (n: string) => void, onAddSubSpecies: (n: string, sid: string) => void, onAddMutation: (n: string) => void, onClose: () => void }) {
  const symbol = getCurrencySymbol(userSettings?.currency);
  const [formData, setFormData] = useState<Partial<Bird>>(initialData || { 
    name: '', 
    species: '', 
    subSpecies: '',
    sex: 'Unknown', 
    cageId: '', 
    birthDate: '', 
    purchaseDate: '',
    purchasePrice: 0,
    estimatedValue: 0,
    notes: '', 
    motherId: '', 
    fatherId: '', 
    mateId: '',
    offspringIds: [],
    mutations: [],
    splitMutations: [],
    statuses: [],
    imageUrl: '' 
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');

  const speciesOptions = userSettings?.species.map(s => ({ id: s.id, name: s.name })) || [];
  const selectedSpecies = userSettings?.species.find(s => s.name === formData.species);
  const subSpeciesOptions = userSettings?.subspecies
    .filter(ss => ss.speciesId === selectedSpecies?.id)
    .map(ss => ({ id: ss.id, name: ss.name })) || [];
  const mutationOptions = userSettings?.mutations.map(m => ({ id: m.id, name: m.name })) || [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const downloadURL = await compressAndUploadImage(file, `birds/${user.uid}`);
      setFormData(prev => ({ ...prev, imageUrl: downloadURL }));
      setIsUploading(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading || isSaving) return;
    setIsSaving(true);
    
    const savePromise = async () => {
      try {
        const data = { ...formData, uid: user.uid };
        let birdId = initialData?.id;
        
        if (birdId) { 
          await updateDoc(doc(db, 'birds', birdId), data); 
        } else { 
          const docRef = doc(collection(db, 'birds'));
          birdId = docRef.id;
          await setDoc(docRef, data);
        }

        // Auto-pairing logic
        if (formData.mateId && birdId) {
          const mateId = formData.mateId;
          
          // Update mate's record to point back to this bird
          await updateDoc(doc(db, 'birds', mateId), { mateId: birdId });

          // Create or update Pair document
          const existingPair = pairs.find(p => (p.maleId === birdId && p.femaleId === mateId) || (p.maleId === mateId && p.femaleId === birdId));

          const pairData = {
            maleId: formData.sex === 'Male' ? birdId : mateId,
            femaleId: formData.sex === 'Female' ? birdId : mateId,
            status: 'Active',
            startDate: format(new Date(), 'yyyy-MM-dd'),
            uid: user.uid
          };

          if (existingPair) {
            await updateDoc(doc(db, 'pairs', existingPair.id), pairData as any);
          } else {
            await addDoc(collection(db, 'pairs'), pairData);
          }
        }
      } catch (err) { 
        handleFirestoreError(err, initialData ? OperationType.UPDATE : OperationType.CREATE, 'birds'); 
      }
    };

    savePromise();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Name/ID</label><Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
        <SearchableSelect 
          label="Species"
          options={speciesOptions}
          value={selectedSpecies?.id}
          onChange={(id) => {
            const name = speciesOptions.find(o => o.id === id)?.name || '';
            setFormData({ ...formData, species: name, subSpecies: '' });
          }}
          onAdd={onAddSpecies}
          placeholder="Select Species"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SearchableSelect 
          label="Sub-Species"
          options={subSpeciesOptions}
          value={subSpeciesOptions.find(o => o.name === formData.subSpecies)?.id}
          onChange={(id) => {
            const name = subSpeciesOptions.find(o => o.id === id)?.name || '';
            setFormData({ ...formData, subSpecies: name });
          }}
          onAdd={(name) => selectedSpecies && onAddSubSpecies(name, selectedSpecies.id)}
          placeholder={formData.species ? "Select Sub-Species" : "Select Species First"}
          disabled={!formData.species}
        />
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Sex</label><Select value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value as any })}><option value="Unknown" className="bg-black text-white">Unknown</option><option value="Male" className="bg-black text-white">Male</option><option value="Female" className="bg-black text-white">Female</option></Select></div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <SearchableSelect 
          label="Mutations"
          options={mutationOptions}
          multi
          selectedValues={formData.mutations || []}
          onChange={(id) => {
            const name = mutationOptions.find(o => o.id === id)?.name || '';
            const current = formData.mutations || [];
            setFormData({ 
              ...formData, 
              mutations: current.includes(name) ? current.filter(m => m !== name) : [...current, name] 
            });
          }}
          onAdd={onAddMutation}
          placeholder="Select Mutations"
        />
        <SearchableSelect 
          label="Split Mutations"
          options={mutationOptions}
          multi
          selectedValues={formData.splitMutations || []}
          onChange={(id) => {
            const name = mutationOptions.find(o => o.id === id)?.name || '';
            const current = formData.splitMutations || [];
            setFormData({ 
              ...formData, 
              splitMutations: current.includes(name) ? current.filter(m => m !== name) : [...current, name] 
            });
          }}
          onAdd={onAddMutation}
          placeholder="Select Split Mutations"
        />
      </div>
      
      <div className="space-y-1">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Image</label>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="hidden"
              id="bird-image-upload"
              disabled={isUploading}
            />
            <label 
              htmlFor="bird-image-upload"
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 bg-black border border-black-700 rounded-2xl cursor-pointer hover:bg-zinc-700 transition-all text-xs font-black uppercase tracking-widest text-white hover:text-gold-500",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              {formData.imageUrl ? 'Change Image' : 'Upload Image'}
            </label>
          </div>
          {formData.imageUrl && (
            <div className="w-12 h-12 rounded-2xl bg-black overflow-hidden border border-black-700">
              <img 
                src={formData.imageUrl} 
                alt="Preview" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>
        {uploadError && <p className="text-[10px] text-red-500 mt-1 font-bold">{uploadError}</p>}
      </div>
 
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <SearchableSelect 
            label="Cage"
            value={formData.cageId || ''}
            onChange={(val) => setFormData({ ...formData, cageId: val })}
            options={[
              { id: '', name: 'Unassigned' },
              ...cages.map(c => ({ id: c.id, name: c.name }))
            ]}
          />
        </div>
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Birth Date</label><Input type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} /></div>
      </div>
 
      <div className="grid grid-cols-2 gap-4">
        <SearchableSelect 
          label="Father"
          options={[{ id: '', name: 'Unknown' }, ...birds.filter(b => b.sex === 'Male' && b.id !== initialData?.id).map(b => {
            const cage = cages.find(c => c.id === b.cageId);
            return { id: b.id, name: cage ? `${b.name} (${cage.name})` : b.name };
          })]}
          value={formData.fatherId}
          onChange={(id) => setFormData({ ...formData, fatherId: id })}
          placeholder="Unknown"
        />
        <SearchableSelect 
          label="Mother"
          options={[{ id: '', name: 'Unknown' }, ...birds.filter(b => b.sex === 'Female' && b.id !== initialData?.id).map(b => {
            const cage = cages.find(c => c.id === b.cageId);
            return { id: b.id, name: cage ? `${b.name} (${cage.name})` : b.name };
          })]}
          value={formData.motherId}
          onChange={(id) => setFormData({ ...formData, motherId: id })}
          placeholder="Unknown"
        />
      </div>
 
      <div className="grid grid-cols-2 gap-4">
        <SearchableSelect 
          label="Mate"
          options={[{ id: '', name: 'None' }, ...birds.filter(b => b.id !== initialData?.id && (formData.sex === 'Unknown' || b.sex !== formData.sex)).map(b => {
            const cage = cages.find(c => c.id === b.cageId);
            return { id: b.id, name: cage ? `${b.name} (${cage.name})` : b.name };
          })]}
          value={formData.mateId}
          onChange={(id) => setFormData({ ...formData, mateId: id })}
          placeholder="None"
        />
        <SearchableSelect 
          label="Offspring"
          options={birds.filter(b => b.id !== initialData?.id).map(b => {
            const cage = cages.find(c => c.id === b.cageId);
            return { id: b.id, name: cage ? `${b.name} (${cage.name})` : b.name };
          })}
          multi
          selectedValues={formData.offspringIds?.map(id => {
            const b = birds.find(b => b.id === id);
            if (!b) return id;
            const cage = cages.find(c => c.id === b.cageId);
            return cage ? `${b.name} (${cage.name})` : b.name;
          }) || []}
          onChange={(id) => {
            const current = formData.offspringIds || [];
            setFormData({ 
              ...formData, 
              offspringIds: current.includes(id) ? current.filter(m => m !== id) : [...current, id] 
            });
          }}
          placeholder="Select Offspring"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-black-100 uppercase tracking-widest ml-1">Purchase Date</label>
          <Input type="date" value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-black-100 uppercase tracking-widest ml-1">Purchase Price ({symbol})</label>
          <Input type="number" min="0" step="0.01" value={formData.purchasePrice} onChange={e => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-black-100 uppercase tracking-widest ml-1">Est. Value ({symbol})</label>
          <Input type="number" min="0" step="0.01" value={formData.estimatedValue} onChange={e => setFormData({ ...formData, estimatedValue: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-black-100 uppercase tracking-widest ml-1">Custom Statuses</label>
          <div className="flex gap-2">
            <Input 
              placeholder="Add status (e.g., Sold, Sick)..." 
              value={newStatus} 
              onChange={e => setNewStatus(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (newStatus.trim()) {
                    setFormData({ ...formData, statuses: [...(formData.statuses || []), newStatus.trim()] });
                    setNewStatus('');
                  }
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {formData.statuses?.map((s, i) => (
              <Badge key={i} className="flex items-center gap-1 bg-zinc-700 border-black-700 text-gold-500">
                {s}
                <button type="button" onClick={() => setFormData({ ...formData, statuses: formData.statuses?.filter((_, idx) => idx !== i) })} className="hover:text-white"><X size={10} /></button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Notes</label>
        <textarea 
          className="w-full px-4 py-3 bg-black border border-black-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-white transition-all min-h-[100px] text-sm font-medium placeholder:text-white/30" 
          placeholder="Additional notes..."
          value={formData.notes} 
          onChange={e => setFormData({ ...formData, notes: e.target.value })} 
        />
      </div>
      <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest font-black" disabled={isUploading || isSaving}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {initialData ? 'Update' : 'Add'} Bird
      </Button>
    </form>
  );
}

function CageForm({ user, initialData, onClose }: { user: FirebaseUser, initialData?: Cage, onClose: () => void }) {
  const [formData, setFormData] = useState<Partial<Cage>>(initialData || { name: '', location: '', type: 'Standard', imageUrl: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const downloadURL = await compressAndUploadImage(file, `cages/${user.uid}`);
      setFormData(prev => ({ ...prev, imageUrl: downloadURL }));
      setIsUploading(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading || isSaving) return;
    setIsSaving(true);
    
    const savePromise = async () => {
      try {
        const data = { ...formData, uid: user.uid };
        if (initialData?.id) { await updateDoc(doc(db, 'cages', initialData.id), data); } 
        else { 
          const docRef = doc(collection(db, 'cages'));
          await setDoc(docRef, data); 
        }
      } catch (err) { handleFirestoreError(err, initialData ? OperationType.UPDATE : OperationType.CREATE, 'cages'); }
    };

    savePromise();
    onClose();
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-center">
        <div className="relative group">
          <div className="w-24 h-24 rounded-3xl bg-black border border-black-700 flex items-center justify-center overflow-hidden">
            {formData.imageUrl ? (
              <img src={formData.imageUrl} alt="Cage" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <ImageIcon className="text-black-700" size={32} />
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="text-gold-500 animate-spin" size={24} />
              </div>
            )}
          </div>
          <label className="absolute -bottom-2 -right-2 p-2 bg-gold-500 text-black-950 rounded-xl cursor-pointer shadow-lg hover:bg-gold-600 transition-colors">
            <Plus size={16} />
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>
        </div>
      </div>
      {uploadError && <p className="text-rose-500 text-[10px] text-center font-bold uppercase tracking-widest">{uploadError}</p>}

      <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Cage Name/Number</label><Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Location</label><Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Type</label><Select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}><option value="Standard" className="bg-black text-white">Standard</option><option value="Breeding" className="bg-black text-white">Breeding</option><option value="Flight" className="bg-black text-white">Flight</option><option value="Hospital" className="bg-black text-white">Hospital</option></Select></div>
      </div>
      <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest font-black" disabled={isUploading || isSaving}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {initialData ? 'Update' : 'Add'} Cage
      </Button>
    </form>
  );
}

function PairForm({ user, initialData, birds, onClose }: { user: FirebaseUser, initialData?: Pair, birds: Bird[], onClose: () => void }) {
  const [formData, setFormData] = useState<Partial<Pair>>(initialData || { maleId: '', femaleId: '', status: 'Active', startDate: '', endDate: '' });
  const [isSaving, setIsSaving] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.maleId || !formData.femaleId) {
      toast.error('Please select both a male and a female bird.');
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    
    const savePromise = async () => {
      try {
        const data = { ...formData, uid: user.uid };
        if (initialData?.id) { await updateDoc(doc(db, 'pairs', initialData.id), data); } 
        else { 
          const docRef = doc(collection(db, 'pairs'));
          await setDoc(docRef, data); 
        }
      } catch (err) { handleFirestoreError(err, initialData ? OperationType.UPDATE : OperationType.CREATE, 'pairs'); }
    };

    savePromise();
    onClose();
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <SearchableSelect 
          label="Male"
          value={formData.maleId || ''}
          onChange={(val) => setFormData({ ...formData, maleId: val })}
          options={[
            { id: '', name: 'Select Male' },
            ...birds.filter(b => b.sex === 'Male').map(b => ({ id: b.id, name: b.name }))
          ]}
        />
        <SearchableSelect 
          label="Female"
          value={formData.femaleId || ''}
          onChange={(val) => setFormData({ ...formData, femaleId: val })}
          options={[
            { id: '', name: 'Select Female' },
            ...birds.filter(b => b.sex === 'Female').map(b => ({ id: b.id, name: b.name }))
          ]}
        />
      </div>
      <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Status</label><Select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}><option value="Active" className="bg-black text-white">Active</option><option value="Inactive" className="bg-black text-white">Inactive</option></Select></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Start Date</label><Input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">End Date</label><Input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} /></div>
      </div>
      <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest font-black" disabled={isSaving}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {initialData ? 'Update' : 'Add'} Pair
      </Button>
    </form>
  );
}

function TaskForm({ user, initialData, birds, onClose }: { user: FirebaseUser, initialData?: Task, birds: Bird[], onClose: () => void }) {
  const [formData, setFormData] = useState<Partial<Task>>(initialData || { title: '', description: '', status: 'Pending', priority: 'Medium', category: 'General', dueDate: '', reminderDate: '', birdIds: [], subTasks: [] });
  const [newSubTask, setNewSubTask] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    
    const savePromise = async () => {
      try {
        const data = { ...formData, uid: user.uid };
        if (initialData?.id) { await updateDoc(doc(db, 'tasks', initialData.id), data); } 
        else { 
          const docRef = doc(collection(db, 'tasks'));
          await setDoc(docRef, data); 
        }
      } catch (err) { handleFirestoreError(err, initialData ? OperationType.UPDATE : OperationType.CREATE, 'tasks'); }
    };

    savePromise();
    onClose();
  };
  const addSubTask = () => {
    if (!newSubTask.trim()) return;
    setFormData({ ...formData, subTasks: [...(formData.subTasks || []), { title: newSubTask, completed: false, birdIds: [] }] });
    setNewSubTask('');
  };
  const toggleBirdTag = (birdId: string) => {
    const current = formData.birdIds || [];
    setFormData({ ...formData, birdIds: current.includes(birdId) ? current.filter(id => id !== birdId) : [...current, birdId] });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Title</label><Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Category</label><Input required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Priority</label><Select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as any })}><option value="Low" className="bg-black text-white">Low</option><option value="Medium" className="bg-black text-white">Medium</option><option value="High" className="bg-black text-white">High</option></Select></div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Description</label>
        <textarea 
          className="w-full px-4 py-3 bg-black border border-black-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-white transition-all min-h-[80px] text-sm font-medium placeholder:text-white/30" 
          placeholder="Task description..."
          value={formData.description} 
          onChange={e => setFormData({ ...formData, description: e.target.value })} 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Status</label><Select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}><option value="Pending" className="bg-black text-white">Pending</option><option value="Completed" className="bg-black text-white">Completed</option></Select></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Due Date</label><Input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} /></div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Reminder (Push Notification)</label>
        <Input type="datetime-local" value={formData.reminderDate || ''} onChange={e => setFormData({ ...formData, reminderDate: e.target.value })} />
        <p className="text-[10px] text-white ml-1">You will receive a notification when the app is open or running in the background.</p>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Tag Birds</label>
        <div className="flex flex-wrap gap-2 p-3 border border-black-700 rounded-2xl bg-black min-h-[50px] items-center">
          {birds.length === 0 ? (
            <span className="text-xs text-white italic px-2">No birds available to tag</span>
          ) : (
            birds.map(b => (
              <button 
                key={b.id} 
                type="button" 
                onClick={() => toggleBirdTag(b.id)} 
                className={cn(
                  'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all', 
                  formData.birdIds?.includes(b.id) 
                    ? 'bg-gold-500 text-black-950 shadow-lg shadow-gold-500/20' 
                    : 'bg-zinc-700 text-white border border-black-700 hover:border-gold-500/50'
                )}
              >
                {b.name}
              </button>
            ))
          )}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Subtasks</label>
        <div className="flex gap-2">
          <Input placeholder="Add subtask..." value={newSubTask} onChange={e => setNewSubTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubTask())} />
          <Button type="button" onClick={addSubTask} variant="secondary" className="px-3"><Plus size={16} /></Button>
        </div>
        <div className="space-y-2">
          {formData.subTasks?.map((sub, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-black rounded-2xl border border-black-700">
              <span className="text-xs font-bold text-white">{sub.title}</span>
              <button type="button" onClick={() => setFormData({ ...formData, subTasks: formData.subTasks?.filter((_, i) => i !== idx) })} className="text-white hover:text-red-500 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest font-black" disabled={isSaving}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {initialData ? 'Update' : 'Add'} Task
      </Button>
    </form>
  );
}
