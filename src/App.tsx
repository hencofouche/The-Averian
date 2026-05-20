import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { Toaster, toast } from 'sonner';
import { 
  Plus, Search, Bird as BirdIcon, Home, Heart, CheckSquare, 
  Info, Trash2, Edit2, LogOut, User, 
  Tag, Calendar, ChevronDown, ChevronUp, ChevronRight, X, GitBranch,
  Image as ImageIcon, Loader2, DollarSign, TrendingUp, TrendingDown,
  Activity, ArrowUpRight, ArrowDownRight, BarChart3, PieChart as PieChartIcon,
  Menu, Egg, LayoutGrid, Grid3x3, List as ListIcon, AlertTriangle, CreditCard, CheckCircle2, Bell, Cloud, Maximize2, Share2, Send, Printer, MoreHorizontal, Dna, Users, Palette, QrCode, Scan, FileText, ExternalLink, ArrowLeft, ArrowRightLeft, History as HistoryIcon
} from 'lucide-react';
import GeneticsCalculator from './components/GeneticsCalculator';
import { ContactsView } from './components/ContactsView';
import { QRCodeSVG } from 'qrcode.react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, Legend, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { 
  auth, db, storage, loginWithGoogle, logout, handleFirestoreError, testConnection
} from './firebase';
import { 
  onAuthStateChanged, User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, onSnapshot, query, where, addDoc, 
  updateDoc, deleteDoc, doc, getDocs, orderBy, setDoc, getDocFromServer, writeBatch, limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Bird, Cage, Pair, Task, Transaction, OperationType, BreedingRecord, UserSettings, Species, SubSpecies, Mutation, SharedItem, Contact, BirdDocument, Egg as EggType
} from './types';
import { cn, generateColorPalette } from './lib/utils';
import ColorWheel from '@uiw/react-color-wheel';
import { hexToHsva, hsvaToHex } from '@uiw/color-convert';
import { startOfDay, startOfWeek, startOfMonth, endOfMonth, endOfWeek, addDays, addMonths, isSameMonth, subDays, subWeeks, subMonths, isWithinInterval, parseISO } from 'date-fns';

// --- Helpers ---
const sanitizeData = (data: any) => {
  const sanitized: any = {};
  Object.keys(data).forEach(key => {
    if (key !== 'id' && data[key] !== undefined) {
      sanitized[key] = data[key];
    }
  });
  return sanitized;
};

const getCurrencySymbol = (currency?: string) => {
  switch (currency) {
    case 'ZAR': return 'R';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'USD': default: return '$';
  }
};

const generateGoogleCalendarUrl = (text: string, date: string, details: string = '') => {
  if (!date) return '';
  const startDate = new Date(date);
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 mins later
  
  const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
  
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(details)}`;
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
    danger: 'bg-zinc-900/80 text-white rounded-lg transition-all',
    ghost: 'bg-transparent text-black-50 hover:bg-black-900 hover:text-gold-500',
  };
  
  const customDangerStyle: React.CSSProperties = variant === 'danger' ? {
    backgroundColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)',
    color: 'var(--theme-delete-color, #ef4444)',
    borderColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 70%)',
    borderWidth: '1px'
  } : {};

  return (
    <button 
      className={cn('px-4 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 text-[clamp(10px,1.2vw,14px)] uppercase tracking-widest', variants[variant], className)} 
      style={customDangerStyle}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ className, id, name, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => { const generatedId = React.useId(); return ( <input id={id || generatedId} name={name || id || generatedId} className={cn('w-full px-4 py-3 bg-black border border-black-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all placeholder:text-white/30 text-sm font-medium', className)} {...props} /> ); };

const Select = ({ className, children, id, name, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => { const generatedId = React.useId(); return ( <select id={id || generatedId} name={name || id || generatedId} className={cn('w-full px-4 py-3 bg-black border border-black-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-all appearance-none text-sm font-medium', className)} {...props} > {children} </select> ); };

const Card = ({ children, className, ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-black-950 border border-black-700 rounded-2xl overflow-hidden shadow-2xl w-full', className)} {...props}>
    {children}
  </div>
);

const Textarea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      "flex min-h-[80px] w-full rounded-xl border border-black-700 bg-black px-3 py-2 text-sm text-white ring-offset-black placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
);

const Badge = ({ children, className, variant = 'neutral' }: { children: React.ReactNode, className?: string, variant?: 'neutral' | 'success' | 'warning' | 'info' | 'destructive' | 'female' | 'male' }) => {
  const variants = {
    neutral: 'bg-black text-white border border-black-700',
    success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    info: 'bg-secondary/20 text-secondary border border-secondary/30',
    destructive: 'bg-red-500/20 text-red-400 border border-red-500/30',
    female: 'bg-black text-white border border-black-700',
    male: 'bg-black text-white border border-black-700',
  };

  const customStyle: React.CSSProperties = {};
  
  if (variant === 'destructive') {
    return (
      <span 
        className={cn("px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-inner", className)}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)',
          color: 'var(--theme-delete-color, #ef4444)',
          borderColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 70%)'
        }}
      >
        {children}
      </span>
    );
  }

  if (variant === 'male') {
    customStyle.backgroundColor = 'color-mix(in srgb, var(--theme-male-color, #3b82f6), transparent 80%)';
    customStyle.color = 'var(--theme-male-color, #60a5fa)';
    customStyle.borderColor = 'color-mix(in srgb, var(--theme-male-color, #3b82f6), transparent 70%)';
  } else if (variant === 'female') {
    customStyle.backgroundColor = 'color-mix(in srgb, var(--theme-female-color, #e11d48), transparent 80%)';
    customStyle.color = 'var(--theme-female-color, #fb7185)';
    customStyle.borderColor = 'color-mix(in srgb, var(--theme-female-color, #e11d48), transparent 70%)';
  }

  return (
    <span 
      className={cn('px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest', variants[variant], className)}
      style={customStyle}
    >
      {children}
    </span>
  );
};

const PairCompactInfo = ({ pair, birds, cages, className, onClick }: { pair: Pair, birds: Bird[], cages: Cage[], className?: string, onClick?: () => void }) => {
  const male = birds.find(b => b.id === pair.maleId);
  const female = birds.find(b => b.id === pair.femaleId);
  const cageId = male?.cageId || female?.cageId;
  const cage = cages.find(c => c.id === cageId);

  const BirdMini = ({ bird, label, isMale }: { bird?: Bird, label: string, isMale: boolean }) => (
    <div className="flex items-center gap-2 min-w-0">
      <div 
        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 border"
        style={{
          backgroundColor: isMale ? 'color-mix(in srgb, var(--theme-male-color, #3b82f6), transparent 80%)' : 'color-mix(in srgb, var(--theme-female-color, #e11d48), transparent 80%)',
          color: isMale ? 'var(--theme-male-color, #60a5fa)' : 'var(--theme-female-color, #fb7185)',
          borderColor: isMale ? 'color-mix(in srgb, var(--theme-male-color, #3b82f6), transparent 70%)' : 'color-mix(in srgb, var(--theme-female-color, #e11d48), transparent 70%)'
        }}
      >
        {label}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-black text-white uppercase truncate shrink-0">{bird?.name || 'Unassigned'}</span>
          {bird && (
            <span className="text-[8px] font-bold text-white/80 uppercase truncate">
              {bird.species}{bird.subSpecies ? ` (${bird.subSpecies})` : ''}
            </span>
          )}
        </div>
        {bird && ((bird.mutations?.length || 0) > 0 || (bird.splitMutations?.length || 0) > 0 || (bird.statuses?.length || 0) > 0) && (
          <div className="flex flex-wrap gap-1 mt-0.5 opacity-60 scale-90 origin-left">
            {bird.mutations?.slice(0, 2).map(m => (
              <span key={m} className="text-[7px] px-1 bg-black/40 text-white/50 rounded-sm font-black uppercase border border-white/5">{m}</span>
            ))}
            {bird.splitMutations?.slice(0, 1).map(m => (
              <span key={m} className="text-[7px] px-1 bg-black/40 text-secondary/50 rounded-sm font-black uppercase italic border border-secondary/5">/{m}</span>
            ))}
            {bird.statuses?.slice(0, 2).map(s => (
              <span key={s} className="text-[7px] px-1 bg-blue-900/30 text-blue-300/80 rounded-sm font-black uppercase border border-blue-500/10 shadow-sm">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div 
      className={cn("flex flex-col gap-2 p-3 bg-zinc-900/60 rounded-xl border border-white/10 transition-all text-left w-full min-w-0", onClick && "cursor-pointer hover:bg-secondary/10 hover:border-secondary/30", className)}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1.5 mb-0.5">
        <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Breeding Pair</span>
        {cage && (
          <span className="text-[8px] font-bold text-secondary/80 uppercase flex items-center gap-1 shrink-0 bg-secondary/5 px-1.5 py-0.5 rounded-md border border-secondary/10 truncate">
            <Home size={8} className="shrink-0" /> {cage.name}
          </span>
        )}
      </div>
      <div className="space-y-2">
        <BirdMini bird={male} label="M" isMale={true} />
        <BirdMini bird={female} label="F" isMale={false} />
      </div>
    </div>
  );
};

const BirdCompactInfo = ({ bird, cages, className, onClick }: { bird: Bird, cages: Cage[], className?: string, onClick?: () => void }) => {
  const cage = cages.find(c => c.id === bird.cageId);
  return (
    <div 
      className={cn("flex flex-col gap-2 p-3 bg-zinc-900/60 rounded-xl border border-white/10 transition-all text-left w-full min-w-0", onClick && "cursor-pointer hover:bg-gold-500/10 hover:border-gold-500/30", className)}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1.5 mb-0.5">
        <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Bird Profile</span>
        {cage && (
          <span className="text-[8px] font-bold text-secondary/80 uppercase flex items-center gap-1 shrink-0 bg-secondary/5 px-1.5 py-0.5 rounded-md border border-secondary/10 truncate max-w-[120px]">
            <Home size={8} className="shrink-0" /> <span className="truncate">{cage.name}</span>
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2 min-w-0">
        <div 
          className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 border"
          style={{
            backgroundColor: bird.sex === 'Male' ? 'color-mix(in srgb, var(--theme-male-color, #3b82f6), transparent 80%)' : bird.sex === 'Female' ? 'color-mix(in srgb, var(--theme-female-color, #e11d48), transparent 80%)' : 'rgba(255,255,255,0.05)',
            color: bird.sex === 'Male' ? 'var(--theme-male-color, #60a5fa)' : bird.sex === 'Female' ? 'var(--theme-female-color, #fb7185)' : 'rgba(255,255,255,0.4)',
            borderColor: bird.sex === 'Male' ? 'color-mix(in srgb, var(--theme-male-color, #3b82f6), transparent 70%)' : bird.sex === 'Female' ? 'color-mix(in srgb, var(--theme-female-color, #e11d48), transparent 70%)' : 'rgba(255,255,255,0.1)'
          }}
        >
          {bird.sex === 'Male' ? 'M' : bird.sex === 'Female' ? 'F' : '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black text-white uppercase truncate shrink-0">{bird.name}</span>
            <span className="text-[8px] font-bold text-white/80 uppercase truncate">
              {bird.species}{bird.subSpecies ? ` (${bird.subSpecies})` : ''}
            </span>
          </div>
          {((bird.mutations?.length || 0) > 0 || (bird.splitMutations?.length || 0) > 0 || (bird.statuses?.length || 0) > 0) ? (
            <div className="flex flex-wrap gap-1 mt-0.5 opacity-60 scale-90 origin-left">
              {bird.mutations?.map(m => (
                <span key={m} className="text-[7px] px-1 bg-black/40 text-white/50 rounded-sm font-black uppercase border border-white/5">
                  {m}
                </span>
              ))}
              {bird.splitMutations?.map(m => (
                <span key={m} className="text-[7px] px-1 bg-black/40 text-secondary/50 rounded-sm font-black uppercase italic border border-secondary/5">
                  /{m}
                </span>
              ))}
              {bird.statuses?.map(s => (
                <span key={s} className="text-[7px] px-1 bg-blue-900/30 text-blue-300/80 rounded-sm font-black uppercase border border-blue-500/10 shadow-sm">
                  {s}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const PedigreeNode = ({ bird, roleLabel, generation, onBirdRef, cages, userSettings }: { bird?: Bird, roleLabel?: string, generation: number, onBirdRef: (name: string) => void, cages: Cage[], userSettings?: UserSettings }) => {
  const abbreviatedRole = roleLabel?.includes('Grandsire') ? 'GS' : 
                         roleLabel?.includes('Granddam') ? 'GD' : 
                         roleLabel?.[0];

  const cage = bird ? cages.find(c => c.id === bird.cageId) : null;

  return (
    <div className="flex flex-col items-center w-full min-w-0">
      <div className={cn(
        "relative z-10 transition-all duration-300 w-full",
        generation === 1 ? "max-w-[210px] sm:max-w-[310px]" : 
        generation === 2 ? "max-w-[170px] sm:max-w-[260px]" : 
        "max-w-[140px] sm:max-w-[220px]"
      )}>
        {roleLabel && (
          <p className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-secondary/90 bg-black px-1.5 py-0.5 rounded-full z-20 border border-secondary/30 whitespace-nowrap shadow-xl">
            <span className="sm:hidden">{abbreviatedRole}</span>
            <span className="hidden sm:inline">{roleLabel}</span>
          </p>
        )}
        {bird ? (
          <div 
            onClick={() => onBirdRef(bird.name)}
            className={cn(
              "flex flex-row bg-zinc-900 border border-white/10 rounded-lg sm:rounded-2xl cursor-pointer hover:border-secondary/50 transition-all shadow-2xl w-full group overflow-hidden h-full",
              generation === 1 ? "border-secondary/40 ring-4 ring-secondary/5" : ""
            )}
          >
            {bird.imageUrl ? (
              <div className="w-10 sm:w-20 shrink-0 relative border-r border-white/5">
                <img src={bird.imageUrl} alt={bird.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="w-10 sm:w-20 shrink-0 bg-zinc-800 flex items-center justify-center border-r border-white/5">
                <BirdIcon size={24} className="text-white/10" />
              </div>
            )}
            
            <div className="flex-1 p-2 sm:p-3 min-w-0 flex flex-col justify-center gap-0.5 sm:gap-1">
              <div className="flex items-center justify-between gap-1 min-w-0">
                 <span className={cn(
                   "font-black text-white uppercase truncate",
                   generation === 3 ? "text-[8px] sm:text-xs" : "text-[10px] sm:text-base"
                 )}>{bird.name}</span>
                 <Badge 
                  variant={bird.sex === 'Male' ? 'male' : bird.sex === 'Female' ? 'female' : 'neutral'} 
                  className="text-[5px] sm:text-[7px] py-0 px-1 shrink-0 uppercase font-black"
                >
                  {bird.sex?.[0] || '?'}
                </Badge>
              </div>

              <div className="text-left leading-tight">
                <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[6px] sm:text-[10px]">
                  <span className="text-secondary font-bold uppercase truncate">
                    {bird.species}{bird.subSpecies ? ` (${bird.subSpecies})` : ''}
                  </span>
                </div>
                
                {bird.mutations && bird.mutations.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {bird.mutations.map(m => (
                      <span key={m} className="text-[5px] sm:text-[8px] px-1 bg-secondary/10 text-secondary font-black uppercase italic rounded border border-secondary/10 truncate">{m}</span>
                    ))}
                  </div>
                )}

                {bird.splitMutations && bird.splitMutations.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {bird.splitMutations.map(m => (
                      <span key={m} className="text-[5px] sm:text-[8px] px-1 bg-sky-500/10 text-sky-400 font-black uppercase italic rounded border border-sky-500/10 truncate">/ {m}</span>
                    ))}
                  </div>
                )}
                
                <div className="flex flex-col gap-0.5 mt-1 pt-1 border-t border-white/5">
                  <div className="flex items-center justify-between gap-1 text-[5px] sm:text-[9px]">
                    <div className="flex items-center gap-0.5 truncate">
                      <div className={cn("w-1 h-1 rounded-full shrink-0", bird.statuses?.includes('Active') ? 'bg-emerald-500' : 'bg-zinc-500')} />
                      <span className="text-white/50 uppercase font-black tracking-tighter truncate">{bird.statuses?.[0] || 'ACTIVE'}</span>
                    </div>
                    {bird.birthDate && <span className="text-white/30 uppercase font-bold text-[4px] sm:text-[8px]">{bird.birthDate}</span>}
                  </div>
                  {cage && <span className="text-[5px] sm:text-[8px] text-white/20 italic truncate font-bold text-right leading-none">CAGE: {cage.name}</span>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-6 bg-black/20 border border-white/5 rounded-lg sm:rounded-2xl border-dashed text-center opacity-30 flex flex-col items-center justify-center min-h-[50px] sm:min-h-[100px]">
             <p className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-white/30 truncate px-2">UNKNOWN</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AncestryNode = ({ birdId, birds, cages, onBirdRef, userSettings, generation = 1, maxGenerations = 3, roleLabel }: { birdId?: string, birds: Bird[], cages: Cage[], onBirdRef: (name: string) => void, userSettings?: UserSettings, generation?: number, maxGenerations?: number, roleLabel?: string }) => {
  const bird = birds.find(b => b.id === birdId);
  if (!bird && generation > 1) return null; // Don't show empty grandparent slots if they don't exist
  if (generation > maxGenerations) return null;

  const hasParents = bird?.fatherId || bird?.motherId;

  return (
    <div className="flex flex-col items-center">
      {hasParents && generation < maxGenerations && (
        <div className="flex flex-col items-center w-full min-w-max">
          <div className="flex flex-row justify-center gap-4 sm:gap-16 w-full relative">
             <div className="flex flex-col items-center flex-1">
               <AncestryNode birdId={bird.fatherId} birds={birds} cages={cages} onBirdRef={onBirdRef} userSettings={userSettings} generation={generation + 1} maxGenerations={maxGenerations} roleLabel={generation === 1 ? 'Sire' : 'Grandsire'} />
             </div>
             <div className="flex flex-col items-center flex-1">
               <AncestryNode birdId={bird.motherId} birds={birds} cages={cages} onBirdRef={onBirdRef} userSettings={userSettings} generation={generation + 1} maxGenerations={maxGenerations} roleLabel={generation === 1 ? 'Dam' : 'Granddam'} />
             </div>
          </div>
          <div className="relative w-full h-6 sm:h-12 flex justify-center mt-2 sm:mt-4">
             <div className="absolute top-0 border-t border-white/20 print:border-black/20 pointer-events-none left-1/4 right-1/4"></div>
             <div className="w-[1px] h-full bg-white/20 print:bg-black/20 pointer-events-none"></div>
          </div>
        </div>
      )}
      <PedigreeNode bird={bird} roleLabel={roleLabel} generation={generation} onBirdRef={onBirdRef} cages={cages} userSettings={userSettings} />
    </div>
  );
};

const DescendantsTree = ({ birdId, birds, cages, onBirdRef, userSettings, generation = 1, maxGenerations = 4 }: { birdId?: string, birds: Bird[], cages: Cage[], onBirdRef: (name: string) => void, userSettings?: UserSettings, generation?: number, maxGenerations?: number }) => {
   const offspring = birds.filter(b => b.motherId === birdId || b.fatherId === birdId);

   if (generation > maxGenerations || offspring.length === 0) return null;

   return (
     <div className="flex flex-col items-center w-full min-w-max mt-2 sm:mt-4">
        <div className="w-[1px] h-6 sm:h-12 bg-white/20 print:bg-black/20 pointer-events-none"></div>
        <div className="relative w-full flex justify-center">
           {offspring.length > 1 && (
             <div className="absolute top-0 border-t border-white/20 print:border-black/20 pointer-events-none" 
                  style={{ 
                    left: `${100 / (offspring.length * 2)}%`, 
                    right: `${100 / (offspring.length * 2)}%` 
                  }}></div>
           )}
           <div className="flex flex-row gap-4 sm:gap-16 justify-center w-full">
              {offspring.map((off) => (
                 <div key={off.id} className="flex flex-col items-center flex-1 relative pt-4 sm:pt-8 min-w-max">
                   <div className="absolute top-0 w-[1px] h-4 sm:h-8 bg-white/20 print:bg-black/20 pointer-events-none"></div>
                   <PedigreeNode bird={off} roleLabel="Offspring" generation={2} onBirdRef={onBirdRef} cages={cages} userSettings={userSettings} />
                   <DescendantsTree birdId={off.id} birds={birds} cages={cages} onBirdRef={onBirdRef} userSettings={userSettings} generation={generation + 1} maxGenerations={maxGenerations} />
                 </div>
              ))}
           </div>
        </div>
     </div>
   );
};


export const SearchableSelect = ({ 
  label, 
  options, 
  value, 
  onChange, 
  onAdd, 
  placeholder = "Search or select...",
  disabled = false,
  multi = false,
  selectedValues = [],
  cages = [],
  birds = []
}: { 
  label: string, 
  options: { id: string, name: string, details?: string, subText?: string, bird?: Bird, pair?: Pair, cage?: Cage }[], 
  value?: string, 
  onChange: (val: string) => void, 
  onAdd?: (name: string) => void,
  placeholder?: string,
  disabled?: boolean,
  multi?: boolean,
  selectedValues?: string[],
  cages?: Cage[],
  birds?: Bird[]
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase()) ||
    (opt.details?.toLowerCase().includes(search.toLowerCase())) ||
    (opt.subText?.toLowerCase().includes(search.toLowerCase()))
  );

  const showAdd = onAdd && search && !options.some(opt => opt.name.toLowerCase() === search.toLowerCase());

  const renderOptionContent = (opt: typeof options[0]) => {
    if (opt.bird) {
      return <BirdCompactInfo bird={opt.bird} cages={cages} className="border-0 bg-transparent p-0" />;
    }

    if (opt.pair && birds) {
      return <PairCompactInfo pair={opt.pair} birds={birds} cages={cages} className="border-0 bg-transparent p-0" />;
    }

    if (opt.cage) {
      return (
        <div className="flex flex-col gap-0.5 py-1">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center">
              <Home size={10} />
            </div>
            <span className="font-bold text-white group-hover:text-secondary transition-colors uppercase text-xs">{opt.name}</span>
          </div>
          <span className="text-[10px] text-white/50 ml-7">{opt.details}</span>
        </div>
      );
    }
    
    if (opt.details || opt.subText) {
      return (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="font-bold text-white group-hover:text-gold-500 transition-colors">{opt.name}</span>
          {opt.details && <span className="text-[10px] text-white/50">{opt.details}</span>}
          {opt.subText && <span className="text-[9px] text-gold-500/50 italic">{opt.subText}</span>}
        </div>
      );
    }
    
    return <span>{opt.name}</span>;
  };

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
            ? (selectedValues.length ? selectedValues.map(v => options.find(o => o.id === v)?.name || v).join(', ') : placeholder)
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
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map(opt => (
                    <div 
                      key={opt.id}
                      className={cn(
                        "px-3 py-2 text-xs cursor-pointer hover:bg-zinc-700 transition-colors flex items-center justify-between group",
                        (multi ? selectedValues.includes(opt.id) : value === opt.id) && "text-gold-500 bg-zinc-700"
                      )}
                      onClick={() => {
                        onChange(opt.id);
                        if (!multi) setIsOpen(false);
                      }}
                    >
                      {renderOptionContent(opt)}
                      {(multi ? selectedValues.includes(opt.id) : value === opt.id) && <CheckSquare size={12} className="shrink-0 ml-2" />}
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
    <div className="min-h-[100dvh] flex flex-col">
      {(daysLeft <= 30) && (
        <div className="bg-gold-500 text-black-950 px-4 py-1.5 text-center text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 flex-shrink-0 sticky top-0 z-[60]">
          <AlertTriangle size={14} />
          {daysLeft === 0 ? "Last day" : `${daysLeft} days left`} in your {daysLeft <= 30 ? 'trial' : 'subscription'}
          <button onClick={handlePay} className="ml-4 underline hover:text-white transition-colors">Renew Now</button>
        </div>
      )}
      <div className="flex-grow">
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
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'birds' | 'cages' | 'pairs' | 'breeding' | 'financials' | 'tasks' | 'settings' | 'genetics' | 'contacts' | 'stats' | 'print' | 'pedigree' | 'subscription'>('birds');
  const [statsFilter, setStatsFilter] = useState<{ birdId?: string, pairId?: string } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'pairs' | 'contacts'>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid-large' | 'list'>('grid-large');
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  const [transferCageId, setTransferCageId] = useState('');
  const [transferImportBreeding, setTransferImportBreeding] = useState(true);
  const [transferImportPedigree, setTransferImportPedigree] = useState(true);

  const [birds, setBirds] = useState<Bird[]>([]);
  const [cages, setCages] = useState<Cage[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [breedingRecords, setBreedingRecords] = useState<BreedingRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  
  // Pagination counts
  const [birdsLimit, setBirdsLimit] = useState(100);
  const [cagesLimit, setCagesLimit] = useState(50);
  const [pairsLimit, setPairsLimit] = useState(50);
  const [breedingLimit, setBreedingLimit] = useState(50);
  const [transactionLimit, setTransactionLimit] = useState(50);
  const [contactsLimit, setContactsLimit] = useState(100);
  const [tasksLimit, setTasksLimit] = useState(50);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [navigationHistory, setNavigationHistory] = useState<{ tab: string, query: string, filter: any } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ title: string, message: string, onConfirm: () => Promise<void> | void } | null>(null);

  const [sharedItemView, setSharedItemView] = useState<SharedItem | null>(null);
  const [isSharedItemLoading, setIsSharedItemLoading] = useState(false);
  const [allSharedItems, setAllSharedItems] = useState<SharedItem[]>([]);

  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;
    setIsDeleting(true);
    try {
      const result = deleteConfirmation.onConfirm();
      if (result instanceof Promise) {
        await result;
      }
      setDeleteConfirmation(null);
    } catch (e: any) {
      toast.error("Failed to delete: " + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleScanResult = (text: string) => {
    try {
      const data = JSON.parse(text);
      if (data.t === 'b') {
        const bird = birds.find(b => b.id === data.id);
        if (bird) {
          setActiveTab('birds');
          setSearchQuery(bird.name);
        } else {
          toast.error("Bird not found in your collection.");
        }
      } else if (data.t === 'p') {
        const pair = pairs.find(p => p.id === data.id);
        if (pair) {
          setActiveTab('pairs');
          setSearchQuery(pair.id);
        } else {
          toast.error("Pair not found in your collection.");
        }
      } else if (data.t === 'c') {
        const cage = cages.find(c => c.id === data.id);
        if (cage) {
          setActiveTab('cages');
          setSearchQuery(cage.name);
        } else {
          toast.error("Cage not found in your collection.");
        }
      } else {
        toast.error("Invalid Averian QR code format.");
      }
    } catch(e) {
      toast.error("Invalid QR code.");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchSharedItem = async () => {
      const params = new URLSearchParams(window.location.search);
      const shareId = params.get('shareId');
      const transferId = params.get('transferId');
      const id = shareId || transferId;
      
      if (id) {
        setIsSharedItemLoading(true);
        try {
          const docSnap = await getDocFromServer(doc(db, 'shared_items', id));
          if (docSnap.exists()) {
            setSharedItemView({ id: docSnap.id, ...docSnap.data() } as SharedItem);
          } else {
            toast.error('Shared item not found or has expired.');
          }
        } catch (e) {
          console.error("Error fetching shared item:", e);
          toast.error('Failed to load shared item.');
        } finally {
          setIsSharedItemLoading(false);
        }
      }
    };
    fetchSharedItem();
  }, []);

  useEffect(() => {
    if (!user || !userSettings) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      // 1. Remove the parameter from the URL immediately to prevent re-triggers
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      // 2. Use a session storage flag to ensure it only happens once per session/load
      const hasRenewed = sessionStorage.getItem('has_renewed_payment');
      if (!hasRenewed) {
        sessionStorage.setItem('has_renewed_payment', 'true');
        handleRenew().catch(e => {
          console.error("Renewal failed:", e);
          toast.error("Failed to activate subscription. Please contact support.");
        });
      }
    }
  }, [user, !!userSettings]); // Only trigger when user/settings become available, not on every update

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Use limits to prevent "The Bleed" (excessive reads on large collections)
    const qBirds = query(collection(db, 'birds'), where('uid', '==', user.uid), limit(birdsLimit));
    const unsubBirds = onSnapshot(qBirds, (snapshot) => {
      setBirds(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Bird)));
      setIsSyncing(snapshot.metadata.hasPendingWrites);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'birds'));

    const qCages = query(collection(db, 'cages'), where('uid', '==', user.uid), limit(cagesLimit));
    const unsubCages = onSnapshot(qCages, (snapshot) => {
      setCages(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Cage)));
      setIsSyncing(snapshot.metadata.hasPendingWrites);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'cages'));

    const qPairs = query(collection(db, 'pairs'), where('uid', '==', user.uid), limit(pairsLimit));
    const unsubPairs = onSnapshot(qPairs, (snapshot) => {
      setPairs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Pair)));
      setIsSyncing(snapshot.metadata.hasPendingWrites);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pairs'));

    const qBreeding = query(
      collection(db, 'breedingRecords'), 
      where('uid', '==', user.uid), 
      limit(breedingLimit)
    );
    const unsubBreeding = onSnapshot(qBreeding, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BreedingRecord));
      records.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      setBreedingRecords(records);
      setIsSyncing(snapshot.metadata.hasPendingWrites);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'breedingRecords'));

    const qTasks = query(collection(db, 'tasks'), where('uid', '==', user.uid), limit(tasksLimit));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task)));
      setIsSyncing(snapshot.metadata.hasPendingWrites);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'tasks'));

    const qTransactions = query(
      collection(db, 'transactions'), 
      where('uid', '==', user.uid), 
      limit(transactionLimit)
    );
    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
      records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(records);
      setIsSyncing(snapshot.metadata.hasPendingWrites);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'transactions'));

    const qContacts = query(collection(db, 'contacts'), where('uid', '==', user.uid), orderBy('name', 'asc'), limit(contactsLimit));
    const unsubContacts = onSnapshot(qContacts, (snapshot) => {
      setContacts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Contact)));
      setIsSyncing(snapshot.metadata.hasPendingWrites);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'contacts'));

    const fixingSettings = new Set<string>();

    const docRef = doc(db, 'userSettings', user.uid);
    const unsubSettings = onSnapshot(docRef, (docSnap: any) => {
      setIsSyncing(docSnap.metadata.hasPendingWrites);
      
      if (docSnap.metadata.fromCache && !docSnap.exists()) {
        return;
      }

      if (docSnap.exists()) {
        const data = docSnap.data() as UserSettings;
        if (docSnap.metadata.hasPendingWrites) {
          setUserSettings({ id: docSnap.id, ...data });
          return;
        }

        // Only update if critical fields are missing to avoid loops
        if (!data.account_expiry_date) { 
          if (fixingSettings.has(user.uid)) return;
          fixingSettings.add(user.uid); 
          const trialExpiry = new Date(); 
          trialExpiry.setDate(trialExpiry.getDate() + 30); 
          const defaultStatuses = ['Sold', 'Deceased'];
          const existingStatusNames = (data.statuses || []).map(s => s.name);
          const missingDefaults = defaultStatuses.filter(name => !existingStatusNames.includes(name));
          
          const updatedStatuses = [
            ...(data.statuses || []),
            ...missingDefaults.map(name => ({ id: crypto.randomUUID(), name }))
          ];

          const updated = { 
            species: data.species || [], 
            subspecies: data.subspecies || [], 
            mutations: data.mutations || [], 
            uid: user.uid, 
            currency: data.currency || 'ZAR', 
            ...data, 
            statuses: updatedStatuses,
            account_expiry_date: trialExpiry.toISOString() 
          }; 
          setDoc(docRef, updated, { merge: true }).catch(e => console.error('Failed to fix settings', e)); 
          setUserSettings({ id: docSnap.id, ...updated }); 
        } else { 
          const expiry = new Date(data.account_expiry_date); 
          const maxExpiry = new Date(); 
          maxExpiry.setFullYear(maxExpiry.getFullYear() + 2); 
          if (expiry > maxExpiry) { 
            if (fixingSettings.has(user.uid + '_cap')) return;
            fixingSettings.add(user.uid + '_cap'); 
            const cappedExpiry = new Date(); 
            cappedExpiry.setFullYear(cappedExpiry.getFullYear() + 1); 
            const updated = { ...data, account_expiry_date: cappedExpiry.toISOString() }; 
            setDoc(docRef, updated, { merge: true }).catch(e => console.error('Failed to cap settings', e)); 
            setUserSettings({ id: docSnap.id, ...updated }); 
          } else {
            const defaultStatuses = ['Sold', 'Deceased'];
            const existingStatusNames = (data.statuses || []).map(s => s.name);
            const missingDefaults = defaultStatuses.filter(name => !existingStatusNames.includes(name));

            if (missingDefaults.length > 0) {
              const updatedStatuses = [
                ...(data.statuses || []),
                ...missingDefaults.map(name => ({ id: crypto.randomUUID(), name }))
              ];
              setUserSettings({ id: docSnap.id, ...data, statuses: updatedStatuses });
            } else {
              setUserSettings({ id: docSnap.id, ...data });
            }
          }
        }
      } else {
        if (docSnap.metadata.fromCache) return;
        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 30);
        const initialSettings: UserSettings = {
          id: user.uid,
          species: [],
          subspecies: [],
          mutations: [],
          statuses: [
            { id: crypto.randomUUID(), name: 'Sold' },
            { id: crypto.randomUUID(), name: 'Deceased' }
          ],
          uid: user.uid,
          currency: 'ZAR',
          account_expiry_date: trialExpiry.toISOString()
        };
        setDoc(docRef, initialSettings);
        setUserSettings(initialSettings);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'userSettings'));

    const qShared = query(collection(db, 'shared_items'), where('createdBy', '==', user.uid), limit(50));
    const unsubShared = onSnapshot(qShared, (snapshot) => {
      setAllSharedItems(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SharedItem)));
    }, (err) => console.error("Error fetching shared items:", err));

    return () => {
      unsubBirds();
      unsubCages();
      unsubPairs();
      unsubBreeding();
      unsubTasks();
      unsubTransactions();
      unsubContacts();
      unsubSettings();
      unsubShared();
    };
  }, [user, birdsLimit, cagesLimit, pairsLimit, breedingLimit, tasksLimit, transactionLimit, contactsLimit]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    switch (activeTab) {
      case 'birds':
        return birds.filter(b => {
          if (b.isGhost) return false;
          const cage = cages.find(c => c.id === b.cageId);
          const inPair = pairs.find(p => p.id.toLowerCase() === query && (p.maleId === b.id || p.femaleId === b.id));
          const cageLabel = cage ? cage.name : 'unassigned';
          const bornLabel = b.birthDate || 'unknown';
          
          return b.name.toLowerCase().includes(query) || 
                 b.id.toLowerCase().includes(query) ||
                 b.species.toLowerCase().includes(query) ||
                 b.subSpecies?.toLowerCase().includes(query) ||
                 (b.mutations || []).some(m => m.toLowerCase().includes(query)) ||
                 (b.splitMutations || []).some(m => m.toLowerCase().includes(query)) ||
                 (b.statuses || []).some(s => s.toLowerCase().includes(query)) ||
                 cageLabel.toLowerCase().includes(query) ||
                 (cage && cage.id.toLowerCase().includes(query)) ||
                 bornLabel.toLowerCase().includes(query) ||
                 !!inPair;
        }).sort((a, b) => {
          const cageA = cages.find(c => c.id === a.cageId)?.name || 'ZZZ';
          const cageB = cages.find(c => c.id === b.cageId)?.name || 'ZZZ';
          
          if (cageA !== cageB) return cageA.localeCompare(cageB, undefined, { numeric: true, sensitivity: 'base' });
          
          const sexOrder: Record<string, number> = { 'Male': 0, 'Female': 1, 'Unknown': 2 };
          const sexDiff = (sexOrder[a.sex] ?? 2) - (sexOrder[b.sex] ?? 2);
          if (sexDiff !== 0) return sexDiff;
          
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
      case 'cages':
        return cages
          .filter(c => {
            const lowName = c.name.toLowerCase();
            const lowLoc = (c.location || '').toLowerCase();

            // Always allow exact ID match
            if (c.id.toLowerCase() === query) return true;

            // For short queries (1 or 2 chars), be strict: only prefix matches for name/location
            if (query.length <= 2) {
              return lowName.startsWith(query) || lowLoc.startsWith(query);
            }

            // For longer queries, allow full content search
            if (lowName.includes(query) || lowLoc.includes(query)) return true;
            
            // Also check if any bird in this cage matches the query (only for 3+ chars)
            return birds.some(b => 
              b.cageId === c.id && (
                b.name.toLowerCase().includes(query) ||
                b.id.toLowerCase().includes(query) ||
                b.species.toLowerCase().includes(query) ||
                b.subSpecies?.toLowerCase().includes(query) ||
                (b.mutations || []).some(m => m.toLowerCase().includes(query)) ||
                (b.splitMutations || []).some(m => m.toLowerCase().includes(query))
              )
            );
          })
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      case 'pairs':
        return pairs.filter(p => {
          const male = birds.find(b => b.id === p.maleId);
          const female = birds.find(b => b.id === p.femaleId);
          
          if (!query) return true;
          if (p.id.toLowerCase() === query) return true;
          const cage = cages.find(c => c.id === p.cageId) || cages.find(c => c.id === male?.cageId) || cages.find(c => c.id === female?.cageId);
          const cageLabel = cage ? cage.name : 'unassigned';

          const birdMatches = (b: Bird) => 
            b.name.toLowerCase().includes(query) ||
            b.id.toLowerCase().includes(query) ||
            b.species.toLowerCase().includes(query) ||
            b.subSpecies?.toLowerCase().includes(query) ||
            (b.mutations || []).some(m => m.toLowerCase().includes(query)) ||
            (b.splitMutations || []).some(m => m.toLowerCase().includes(query)) ||
            (b.statuses || []).some(s => s.toLowerCase().includes(query));

          return (male && birdMatches(male)) || 
                 (female && birdMatches(female)) ||
                 cageLabel.toLowerCase().includes(query) ||
                 (cage && cage.id.toLowerCase().includes(query));
        });
      case 'breeding':
        return breedingRecords.filter(br => {
          if (!query) return true;
          const pair = pairs.find(p => p.id === br.pairId);
          const male = birds.find(b => b.id === pair?.maleId);
          const female = birds.find(b => b.id === pair?.femaleId);
          const cage = cages.find(c => c.id === pair?.cageId) || cages.find(c => c.id === male?.cageId) || cages.find(c => c.id === female?.cageId);
          
          const birdMatches = (b: Bird) => 
            b.name.toLowerCase().includes(query) ||
            b.id.toLowerCase().includes(query) ||
            b.species.toLowerCase().includes(query) ||
            b.subSpecies?.toLowerCase().includes(query) ||
            (b.mutations || []).some(m => m.toLowerCase().includes(query)) ||
            (b.splitMutations || []).some(m => m.toLowerCase().includes(query)) ||
            (b.statuses || []).some(s => s.toLowerCase().includes(query));

          return (male && birdMatches(male)) || 
                 (female && birdMatches(female)) ||
                 (cage && (cage.name.toLowerCase().includes(query) || cage.id.toLowerCase().includes(query))) ||
                 br.notes?.toLowerCase().includes(query) ||
                 br.id.toLowerCase().includes(query);
        });
      case 'financials':
        return transactions.filter(t => t.category.toLowerCase().includes(query) || t.description?.toLowerCase().includes(query));
      case 'tasks':
        return tasks.filter(t => t.title.toLowerCase().includes(query));
      case 'contacts':
        return contacts.filter(c => c.name.toLowerCase().includes(query));
      default:
        return [];
    }
  }, [activeTab, birds, cages, pairs, breedingRecords, tasks, transactions, contacts, searchQuery]);

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

  useEffect(() => {
    const root = document.documentElement;

    if (userSettings?.themeColor) {
      const palette = generateColorPalette(userSettings.themeColor);
      Object.entries(palette).forEach(([shade, color]) => {
        root.style.setProperty(`--theme-color-${shade}`, color);
      });
    } else {
      ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'].forEach(shade => {
        root.style.removeProperty(`--theme-color-${shade}`);
      });
    }

    if (userSettings?.textColor) {
      root.style.setProperty('--theme-text-color', userSettings.textColor);
    } else {
      root.style.removeProperty('--theme-text-color');
    }

    if (userSettings?.backgroundColor) {
      root.style.setProperty('--theme-bg-color', userSettings.backgroundColor);
    } else {
      root.style.removeProperty('--theme-bg-color');
    }

    if (userSettings?.cardColor) {
      root.style.setProperty('--theme-card-color', userSettings.cardColor);
    } else {
      root.style.removeProperty('--theme-card-color');
    }

    if (userSettings?.maleColor) {
      root.style.setProperty('--theme-male-color', userSettings.maleColor);
    } else {
      root.style.removeProperty('--theme-male-color');
    }

    if (userSettings?.femaleColor) {
      root.style.setProperty('--theme-female-color', userSettings.femaleColor);
    } else {
      root.style.removeProperty('--theme-female-color');
    }

    if (userSettings?.deleteColor) {
      root.style.setProperty('--theme-delete-color', userSettings.deleteColor);
    } else {
      root.style.removeProperty('--theme-delete-color');
    }

    if (userSettings?.secondaryColor) {
      root.style.setProperty('--theme-secondary-color', userSettings.secondaryColor);
    } else {
      root.style.removeProperty('--theme-secondary-color');
    }
  }, [userSettings?.themeColor, userSettings?.textColor, userSettings?.backgroundColor, userSettings?.cardColor, userSettings?.maleColor, userSettings?.femaleColor, userSettings?.deleteColor, userSettings?.secondaryColor]);

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

  const handleAddStatus = (name: string) => {
    if (!userSettings) return;
    const newStatus = { id: crypto.randomUUID(), name };
    handleUpdateSettings({
      ...userSettings,
      statuses: [...(userSettings.statuses || []), newStatus]
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
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-secondary text-black-950 mb-4 shadow-2xl shadow-secondary/20">
              <BirdIcon size={40} />
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-white">THE AV<span className="text-secondary">ERIAN</span></h1>
            <p className="text-black-50 font-medium">By The Averian</p>
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

  const handleNavigate = (tab: any, query: string = '', filter: { birdId?: string, pairId?: string } | null = null, isDirectNav: boolean = false) => {
    if (isDirectNav) {
      setNavigationHistory(null);
    } else {
      // Save current state to history if it's different
      const isPedigreeChange = tab === 'pedigree' && activeTab === 'pedigree' && searchQuery !== query;
      if (activeTab !== tab || isPedigreeChange || searchQuery !== query) {
        setNavigationHistory({ tab: activeTab, query: searchQuery, filter: statsFilter });
      }
    }
    setActiveTab(tab);
    setSearchQuery(query);
    setIsMobileMenuOpen(false);
    setStatsFilter(filter);
  };

  const handleGoBack = () => {
    if (navigationHistory) {
      const { tab, query, filter } = navigationHistory;
      setActiveTab(tab as any);
      setSearchQuery(query);
      setStatsFilter(filter);
      setNavigationHistory(null);
    } else {
      handleNavigate('birds', '', null, true);
    }
  };

  const handleBirdRef = (birdName: string) => {
    handleNavigate('birds', birdName);
  };

  if (sharedItemView) {
    const data = JSON.parse(sharedItemView.data);
    const isTransfer = sharedItemView.action === 'transfer';

    const handleImport = async () => {
      if (!user) {
        toast.error('Please log in to import birds to your aviary.');
        return;
      }
      if (sharedItemView.type === 'bird') {
        try {
          const birdData = { ...data };
          // Clean up sensitive/contextual fields
          delete birdData.id;
          delete birdData.mateId;
          delete birdData.cageId;
          delete birdData.fatherId;
          delete birdData.motherId;
          delete birdData.uid;
          
          const defaultData = { 
            ...birdData, 
            uid: user.uid,
            createdAt: new Date().toISOString()
          };

          const mainBirdDocRef = doc(collection(db, 'birds'));
          const mainBirdId = mainBirdDocRef.id;

          if (isTransfer) {
            if (transferCageId) defaultData.cageId = transferCageId;

            if (transferImportPedigree) {
              if (data.relatedBirds && Array.isArray(data.relatedBirds)) {
                try {
                  const batch = writeBatch(db);
                  const idMap = new Map<string, string>();
                  
                  if (data.originalId) {
                    idMap.set(data.originalId, mainBirdId);
                  }
                  
                  data.relatedBirds.forEach((rb: any) => {
                    const existing = birds.find(b => b.ghostId === rb.originalId);
                    idMap.set(rb.originalId, existing ? existing.id : doc(collection(db, 'birds')).id);
                  });

                  data.relatedBirds.forEach((rb: any) => {
                    const existing = birds.find(b => b.ghostId === rb.originalId);
                    if (!existing) {
                      const newBird = sanitizeData({
                        ...rb,
                        id: undefined,
                        originalId: undefined,
                        ghostId: rb.originalId,
                        motherId: rb.motherId ? idMap.get(rb.motherId) : undefined,
                        fatherId: rb.fatherId ? idMap.get(rb.fatherId) : undefined,
                        mateId: undefined,
                        uid: user.uid,
                        createdAt: new Date().toISOString()
                      });
                      batch.set(doc(db, 'birds', idMap.get(rb.originalId)!), newBird);
                    }
                  });
                  await batch.commit();

                  if (data.motherId) defaultData.motherId = idMap.get(data.motherId);
                  if (data.fatherId) defaultData.fatherId = idMap.get(data.fatherId);
                } catch (e) {
                  console.error("Failed to restore pedigree:", e);
                }
              } else {
                // Fallback for old shared items
                if (data.fatherName) {
                  const existingFather = birds.find(b => b.name === data.fatherName && b.sex === 'Male');
                  if (existingFather) {
                    defaultData.fatherId = existingFather.id;
                  } else {
                    try {
                      const ref = await addDoc(collection(db, 'birds'), { name: data.fatherName, species: data.species || '', sex: 'Male', uid: user?.uid, createdAt: new Date().toISOString() });
                      defaultData.fatherId = ref.id;
                    } catch (e) {
                      console.error("Failed to create father:", e);
                    }
                  }
                }
                if (data.motherName) {
                  const existingMother = birds.find(b => b.name === data.motherName && b.sex === 'Female');
                  if (existingMother) {
                    defaultData.motherId = existingMother.id;
                  } else {
                    try {
                      const ref = await addDoc(collection(db, 'birds'), { name: data.motherName, species: data.species || '', sex: 'Female', uid: user?.uid, createdAt: new Date().toISOString() });
                      defaultData.motherId = ref.id;
                    } catch (e) {
                       console.error("Failed to create mother:", e);
                    }
                  }
                }
              }
            }
          }

          // Actually save the bird
          await setDoc(doc(db, 'birds', mainBirdId), sanitizeData(defaultData));
          
          toast.success('Bird imported successfully!');
          setActiveTab('birds');
          setSharedItemView(null);
        } catch (e) {
          console.error("Error importing bird:", e);
          toast.error('Failed to import bird');
        }
      } else if (sharedItemView.type === 'pair') {
        try {
          let newMaleId = '';
          const maleData = data.maleBird || {
            name: data.maleName,
            species: data.maleSpecies || '',
            sex: 'Male'
          };
          if (maleData.name) {
            const existingMale = birds.find(b => b.name === maleData.name && b.sex === 'Male');
            if (existingMale) {
              newMaleId = existingMale.id;
            } else {
              const maleToSave = sanitizeData({
                ...maleData,
                cageId: transferCageId || '',
                uid: user?.uid,
                createdAt: new Date().toISOString()
              });
              const maleRef = await addDoc(collection(db, 'birds'), maleToSave);
              newMaleId = maleRef.id;
            }
          }
          
          let newFemaleId = '';
          const femaleData = data.femaleBird || {
            name: data.femaleName,
            species: data.femaleSpecies || '',
            sex: 'Female'
          };
          if (femaleData.name) {
            const existingFemale = birds.find(b => b.name === femaleData.name && b.sex === 'Female');
            if (existingFemale) {
              newFemaleId = existingFemale.id;
            } else {
              const femaleToSave = sanitizeData({
                ...femaleData,
                cageId: transferCageId || '',
                uid: user?.uid,
                createdAt: new Date().toISOString()
              });
              const femaleRef = await addDoc(collection(db, 'birds'), femaleToSave);
              newFemaleId = femaleRef.id;
            }
          }
          
          const pairRef = await addDoc(collection(db, 'pairs'), sanitizeData({
            maleId: newMaleId,
            femaleId: newFemaleId,
            status: data.status || 'Active',
            startDate: data.startDate || new Date().toISOString().split('T')[0],
            uid: user?.uid
          }));

          if (newMaleId && newFemaleId) {
            try {
              const batch = writeBatch(db);
              batch.update(doc(db, 'birds', newMaleId), { mateId: newFemaleId });
              batch.update(doc(db, 'birds', newFemaleId), { mateId: newMaleId });
              await batch.commit();
            } catch (e) {
              console.error("Failed to link mates:", e);
            }
          }

          if (isTransfer && transferImportBreeding && data.breedingRecords?.length > 0) {
            for (const record of data.breedingRecords) {
              await addDoc(collection(db, 'breedingRecords'), sanitizeData({
                ...record,
                id: undefined, // ensure we don't copy old IDs
                pairId: pairRef.id,
                uid: user?.uid
              }));
            }
          }

          toast.success('Pair imported successfully!');
          setActiveTab('pairs');
          setSharedItemView(null);
        } catch (e) {
          console.error("Error importing pair:", e);
          toast.error('Failed to import pair');
        }
      } else if (sharedItemView.type === 'cage') {
        try {
          const cageRef = await addDoc(collection(db, 'cages'), sanitizeData({
            name: data.name,
            location: data.location || '',
            type: data.type || 'Standard',
            uid: user?.uid,
            createdAt: new Date().toISOString()
          }));
          
          if (data.birds && data.birds.length > 0) {
            for (const b of data.birds) {
              await addDoc(collection(db, 'birds'), sanitizeData({
                ...b,
                id: undefined,
                cageId: cageRef.id,
                uid: user?.uid,
                createdAt: new Date().toISOString()
              }));
            }
          }
          toast.success('Cage and birds imported successfully!');
          setActiveTab('cages');
        } catch (e) {
          console.error("Error importing cage:", e);
          toast.error('Failed to import cage');
        }
      }
      
      setSharedItemView(null);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    };

    const handleCloseSharedView = () => {
      setSharedItemView(null);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    };

    const handleDeleteShared = async () => {
      if (!user || user.uid !== sharedItemView.createdBy) {
        toast.error('You do not have permission to delete this shared item.');
        return;
      }
      try {
        await deleteDoc(doc(db, 'shared_items', sharedItemView.id));
        toast.success('Shared item deleted successfully');
        setSharedItemView(null);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      } catch (e) {
        console.error("Error deleting shared item:", e);
        toast.error('Failed to delete shared item');
      }
    };

    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black uppercase tracking-widest text-white">
              {isTransfer ? `${sharedItemView.type} Transfer` : `Shared ${sharedItemView.type}`}
            </h1>
            <div className="flex items-center gap-2">
              {user && user.uid === sharedItemView.createdBy && (
                <button 
                  onClick={handleDeleteShared}
                  className="p-2 text-rose-500 hover:text-rose-400 bg-rose-500/10 rounded-xl transition-colors"
                  title="Delete Shared Document"
                >
                  <Trash2 size={20} />
                </button>
              )}
              <button onClick={handleCloseSharedView} className="p-2 text-black-200 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>
          
          <Card className="p-6 space-y-6">
            {sharedItemView.type === 'bird' && (
              <>
                {data.imageUrl && (
                  <div 
                    className="w-full aspect-square rounded-xl overflow-hidden bg-black-900 border border-black-800 cursor-pointer"
                    onClick={() => setViewingImage(data.imageUrl)}
                  >
                    <img src={data.imageUrl} alt={data.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                      {data.name}
                      <Badge variant={data.sex === 'Male' ? 'male' : data.sex === 'Female' ? 'female' : 'neutral'}>{data.sex}</Badge>
                    </h2>
                    <p className="text-gold-500 font-bold uppercase tracking-widest text-xs mt-1">
                      {data.species} {data.subSpecies ? `• ${data.subSpecies}` : ''}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm border-t border-black-800 pt-4">
                    {data.birthDate && (
                      <div className="space-y-1">
                        <p className="text-black-200 uppercase tracking-widest text-[10px] font-black">Born</p>
                        <p className="text-white font-medium">{data.birthDate}</p>
                      </div>
                    )}
                    {data.fatherName && (
                      <div className="space-y-1">
                        <p className="text-black-200 uppercase tracking-widest text-[10px] font-black">Father</p>
                        <p className="text-white font-medium">{data.fatherName}</p>
                      </div>
                    )}
                    {data.motherName && (
                      <div className="space-y-1">
                        <p className="text-black-200 uppercase tracking-widest text-[10px] font-black">Mother</p>
                        <p className="text-white font-medium">{data.motherName}</p>
                      </div>
                    )}
                    {data.mateName && (
                      <div className="space-y-1">
                        <p className="text-black-200 uppercase tracking-widest text-[10px] font-black">Mate</p>
                        <p className="text-white font-medium">{data.mateName}</p>
                      </div>
                    )}
                    {data.purchasePrice > 0 && (
                      <div className="space-y-1">
                        <p className="text-black-200 uppercase tracking-widest text-[10px] font-black">Price</p>
                        <p className="text-white font-medium">{data.purchasePrice}</p>
                      </div>
                    )}
                  </div>

                  {data.notes && (
                    <div className="space-y-1 border-t border-black-800 pt-4">
                      <p className="text-black-200 uppercase tracking-widest text-[10px] font-black">Notes</p>
                      <p className="text-white text-xs whitespace-pre-wrap">{data.notes}</p>
                    </div>
                  )}

                  {data.statuses?.length > 0 && (
                    <div className="space-y-2 border-t border-black-800 pt-4">
                      <p className="text-black-200 uppercase tracking-widest text-[10px] font-black">Status</p>
                      <div className="flex flex-wrap gap-2">
                        {data.statuses.map((s: string) => <Badge key={s} className="bg-zinc-800 border-white/5">{s}</Badge>)}
                      </div>
                    </div>
                  )}

                  {(data.mutations?.length > 0 || data.splitMutations?.length > 0) && (
                    <div className="space-y-2 border-t border-black-800 pt-4">
                      <p className="text-black-200 uppercase tracking-widest text-[10px] font-black">Mutations</p>
                      <div className="flex flex-wrap gap-2">
                        {data.mutations?.map((m: string) => <Badge key={m} className="bg-zinc-700">{m}</Badge>)}
                        {data.splitMutations?.map((m: string) => <Badge key={m} className="bg-zinc-700 text-gold-500 italic">Split {m}</Badge>)}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {sharedItemView.type === 'pair' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Heart size={24} className="text-rose-500 fill-rose-500" />
                  <h2 className="text-2xl font-black text-white">Breeding Pair</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-black-800 pt-4">
                  <div className="space-y-1">
                    <p className="text-gold-500 uppercase tracking-widest text-[10px] font-black">Male</p>
                    <p className="text-white font-bold">{data.maleName || 'Unknown'}</p>
                    {data.maleSpecies && <p className="text-black-200 text-xs">{data.maleSpecies}</p>}
                  </div>
                  <div className="space-y-1">
                    <p className="text-rose-500 uppercase tracking-widest text-[10px] font-black">Female</p>
                    <p className="text-white font-bold">{data.femaleName || 'Unknown'}</p>
                    {data.femaleSpecies && <p className="text-black-200 text-xs">{data.femaleSpecies}</p>}
                  </div>
                </div>
                <div className="border-t border-black-800 pt-4">
                  <p className="text-black-200 uppercase tracking-widest text-[10px] font-black">Started</p>
                  <p className="text-white font-medium">{data.startDate || 'Unknown'}</p>
                </div>
              </div>
            )}

            {sharedItemView.type === 'cage' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Home size={24} className="text-gold-500" />
                  <h2 className="text-2xl font-black text-white">{data.name}</h2>
                </div>
                {data.location && (
                  <p className="text-black-200 uppercase tracking-widest text-xs font-bold">{data.location}</p>
                )}
                {data.birds && data.birds.length > 0 && (
                  <div className="border-t border-black-800 pt-4 space-y-2">
                    <p className="text-black-200 uppercase tracking-widest text-[10px] font-black">Residents ({data.birds.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {data.birds.map((b: any, i: number) => (
                        <Badge key={i} variant={b.sex === 'Male' ? 'male' : b.sex === 'Female' ? 'female' : 'neutral'}>
                          {b.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {!isTransfer && (
            <Button onClick={handleImport} className="w-full py-4 text-lg">
              Add Bird to My Aviary
            </Button>
          )}

          {isTransfer && (
            <div className="space-y-4">
              <div className="bg-black border border-black-800 rounded-2xl p-4 space-y-4">
                <h3 className="text-sm font-black uppercase text-white tracking-widest">Cage Assignment (Optional)</h3>
                
                <div className="space-y-2">
                  <select 
                    value={transferCageId} 
                    onChange={e => setTransferCageId(e.target.value)}
                    className="w-full bg-zinc-900 border border-black-700 text-white rounded-xl p-3 outline-none focus:border-gold-500 transition-colors"
                  >
                    <option value="">No Cage Assigned</option>
                    {cages.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {sharedItemView.type === 'bird' && (data.fatherName || data.motherName) && (
                  <label className="flex items-center gap-3 cursor-pointer group select-none">
                    <input type="checkbox" className="hidden" checked={transferImportPedigree} onChange={e => setTransferImportPedigree(e.target.checked)} />
                    <div className={cn("w-5 h-5 rounded flex items-center justify-center border transition-colors", transferImportPedigree ? "bg-gold-500 border-gold-500 text-black" : "border-black-600 bg-zinc-900")}>
                      {transferImportPedigree && <CheckSquare size={14} />}
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-gold-500 transition-colors">Import Pedigree (Parents)</span>
                  </label>
                )}

                {sharedItemView.type === 'pair' && data.breedingRecords?.length > 0 && (
                  <label className="flex items-center gap-3 cursor-pointer group select-none">
                    <input type="checkbox" className="hidden" checked={transferImportBreeding} onChange={e => setTransferImportBreeding(e.target.checked)} />
                    <div className={cn("w-5 h-5 rounded flex items-center justify-center border transition-colors", transferImportBreeding ? "bg-gold-500 border-gold-500 text-black" : "border-black-600 bg-zinc-900")}>
                      {transferImportBreeding && <CheckSquare size={14} />}
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-gold-500 transition-colors">Import {data.breedingRecords.length} Breeding Records</span>
                  </label>
                )}
              </div>
              <Button onClick={handleImport} className="w-full py-4 text-lg">
                Add {sharedItemView.type === 'bird' ? 'Bird' : sharedItemView.type === 'pair' ? 'Pair' : 'Cage'} to My Aviary
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <SubscriptionGate settings={userSettings} onRenew={handleRenew}>
      <div className="bg-black text-white flex flex-col md:flex-row font-sans min-h-[100dvh]">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-black border-r border-white/5 p-5 flex flex-col transition-transform duration-300 ease-in-out xl:sticky xl:top-0 xl:h-screen xl:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between px-1 mb-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 w-8 h-8 flex items-center justify-center bg-secondary rounded-lg text-black-950 shadow-lg shadow-secondary/20">
              <BirdIcon size={18} />
            </div>
            <span className="font-black text-xl tracking-tighter text-white whitespace-nowrap">THE AV<span className="text-secondary">ERIAN</span></span>
          </div>
          <button className="xl:hidden text-white/40 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 flex flex-col justify-between pr-1 pb-4 overflow-hidden">
          <div className="space-y-1.5 flex flex-col">
            <NavItem active={activeTab === 'birds'} onClick={() => handleNavigate('birds', '', null, true)} icon={<BirdIcon size={18} />} label="Birds" count={birds.length} />
            <NavItem active={activeTab === 'cages'} onClick={() => handleNavigate('cages', '', null, true)} icon={<Home size={18} />} label="Cages" count={cages.length} />
            <NavItem active={activeTab === 'pairs'} onClick={() => handleNavigate('pairs', '', null, true)} icon={<Heart size={18} />} label="Pairs" count={pairs.filter(p => birds.some(b => b.id === p.maleId) || birds.some(b => b.id === p.femaleId)).length} />
            <NavItem active={activeTab === 'breeding'} onClick={() => handleNavigate('breeding', '', null, true)} icon={<Egg size={18} />} label="Breeding" count={breedingRecords.length} />
            <NavItem active={activeTab === 'financials'} onClick={() => handleNavigate('financials', '', null, true)} icon={<DollarSign size={18} />} label="Financials" count={transactions.length} />
            <NavItem active={activeTab === 'genetics'} onClick={() => handleNavigate('genetics', '', null, true)} icon={<Dna size={18} />} label="Genetics" count={0} />
          </div>
          
          <div className="space-y-1.5 mt-4 pt-4 border-t border-white/5 flex flex-col">
            <NavItem active={activeTab === 'tasks'} onClick={() => handleNavigate('tasks', '', null, true)} icon={<CheckSquare size={18} />} label="Tasks" count={tasks.length} />
            <NavItem active={activeTab === 'contacts'} onClick={() => handleNavigate('contacts', '', null, true)} icon={<Users size={18} />} label="Contacts" count={contacts.length} />
            <NavItem active={activeTab === 'print'} onClick={() => handleNavigate('print', '', null, true)} icon={<QrCode size={18} />} label="Print" count={0} />
            <NavItem active={activeTab === 'settings'} onClick={() => handleNavigate('settings', '', null, true)} icon={<Tag size={18} />} label="Settings" count={0} />
          </div>
        </nav>

        <div className="mt-auto pt-4 border-t border-white/5 space-y-3">
          {/* Combined Status and User Info */}
          <div className="space-y-1.5">
            <div 
              onClick={() => handleNavigate('subscription', '', null, true)}
              className="px-2 py-1.5 rounded-lg bg-zinc-900/50 border border-white/5 cursor-pointer hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", isSyncing ? "bg-secondary animate-pulse" : "bg-emerald-500")} />
                  <span className="text-[7px] font-black uppercase tracking-widest text-white/50">{isSyncing ? 'Syncing...' : 'Synced'}</span>
                </div>
              </div>
              {userSettings && (
                <p className="text-[8px] font-black text-white uppercase tracking-tighter truncate leading-none">
                  <span className="text-secondary">SUBSCRIPTION: </span>
                  {(() => {
                    const expiry = userSettings.account_expiry_date ? new Date(userSettings.account_expiry_date) : null;
                    if (!expiry || isNaN(expiry.getTime())) return 'TRIAL STATUS';
                    if (new Date() > expiry) return 'EXPIRED';
                    const diff = expiry.getTime() - new Date().getTime();
                    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
                    return `${days}D ACTIVE`;
                  })()}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900/30 rounded-lg border border-white/5 group">
              <div className="w-6 h-6 rounded-full bg-zinc-700 border border-white/10 flex items-center justify-center text-white overflow-hidden shrink-0">
                {user.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <User size={12} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-white/70 truncate uppercase font-bold tracking-tight">{user.email?.split('@')[0]}</p>
              </div>
              <button 
                onClick={logout} 
                className="p-1 text-white/30 transition-colors"
                style={{ '--hover-color': 'var(--theme-delete-color, #ef4444)' } as any}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--theme-delete-color, #ef4444)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              >
                <LogOut size={12} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col min-w-0 bg-black w-full">
        <header className={cn("shrink-0 bg-black/80 backdrop-blur-md border-b border-black-800 px-4 xl:px-6 py-4 flex flex-col xl:flex-row xl:items-center justify-between sticky top-0 z-10 gap-4", activeTab === 'pedigree' && "hidden")}>
          <div className="flex items-center justify-between w-full xl:w-auto">
            <div className="flex items-center gap-3">
              <button className="xl:hidden p-2 -ml-2 text-black-50 hover:text-white" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={24} />
              </button>
              <h2 className="text-xl font-black uppercase tracking-widest text-white">
                {activeTab === 'print' ? 'Print Center' : 
                 activeTab === 'tasks' ? 'Tasks & Reminders' : 
                 activeTab === 'genetics' ? 'Genetics Engine' : 
                 activeTab === 'stats' ? 'Entity Stats' :
                 activeTab}
              </h2>
            </div>
            {activeTab !== 'settings' && activeTab !== 'genetics' && activeTab !== 'stats' && activeTab !== 'print' && (
              <div className="flex gap-2 xl:hidden">
                <Button onClick={() => setIsScanModalOpen(true)} className="py-3 px-4 text-sm font-bold bg-zinc-800 text-white hover:bg-zinc-700 hover:text-gold-500">
                  <Scan size={18} />
                </Button>
                <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="py-3 px-4 text-sm font-bold">
                  <Plus size={18} />
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 w-full xl:w-auto mt-2 xl:mt-0">
            {navigationHistory && activeTab !== navigationHistory.tab && (
              <Button 
                onClick={handleGoBack}
                variant="secondary"
                className="shrink-0 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-gold-500/10 text-gold-500 border-gold-500/20 hover:bg-gold-500/20 px-3"
              >
                <ArrowLeft size={14} />
                Back to {navigationHistory.tab === 'birds' ? 'Flock' : navigationHistory.tab}
              </Button>
            )}
            {activeTab !== 'settings' && activeTab !== 'genetics' && activeTab !== 'stats' && activeTab !== 'print' && (
              <div className="relative flex-1 xl:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black-100" size={16} />
                <Input 
                  placeholder={`Search ${activeTab === 'tasks' ? 'tasks & reminders' : activeTab}...`} 
                  className="pl-11 pr-10 w-full text-sm font-medium"
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
            
            {activeTab === 'tasks' && (
              <div className="flex items-center bg-black-900 rounded-lg p-1 border border-black-800 shrink-0">
                <button 
                  onClick={() => setTaskViewMode('list')}
                  className={cn("p-1.5 rounded-md transition-colors", taskViewMode === 'list' ? "bg-zinc-700 text-secondary" : "text-black-100 hover:text-white")}
                >
                  <ListIcon size={16} />
                </button>
                <button 
                  onClick={() => setTaskViewMode('calendar')}
                  className={cn("p-1.5 rounded-md transition-colors", taskViewMode === 'calendar' ? "bg-zinc-700 text-secondary" : "text-black-100 hover:text-white")}
                >
                  <Calendar size={16} />
                </button>
              </div>
            )}
            
            {activeTab !== 'financials' && activeTab !== 'stats' && activeTab !== 'tasks' && activeTab !== 'settings' && activeTab !== 'genetics' && activeTab !== 'print' && (
              <div className="flex items-center bg-black-900 rounded-lg p-1 border border-black-800 shrink-0">
                <button 
                  onClick={() => setViewMode('grid-large')}
                  className={cn("p-1.5 rounded-md transition-colors", viewMode === 'grid-large' ? "bg-zinc-700 text-secondary" : "text-black-100 hover:text-white")}
                >
                  <LayoutGrid size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn("p-1.5 rounded-md transition-colors", viewMode === 'list' ? "bg-zinc-700 text-secondary" : "text-black-100 hover:text-white")}
                >
                  <ListIcon size={16} />
                </button>
              </div>
            )}
            
            {activeTab !== 'settings' && activeTab !== 'genetics' && activeTab !== 'stats' && activeTab !== 'print' && (
              <div className="hidden xl:flex gap-2">
                <Button onClick={() => setIsScanModalOpen(true)} className="py-3 px-4 text-sm font-bold uppercase tracking-widest bg-zinc-800 text-secondary border border-secondary/20 hover:bg-zinc-700">
                  <Scan size={18} />
                  <span className="ml-2">Scan</span>
                </Button>
                <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="py-3 px-5 text-sm font-bold uppercase tracking-widest text-black">
                  <Plus size={18} />
                  <span className="ml-2">
                    Add {
                      activeTab === 'breeding' ? 'Record' : 
                      activeTab === 'tasks' ? 'Task / Reminder' : 
                      activeTab === 'financials' ? 'Transaction' :
                      activeTab.slice(0, -1)
                    }
                  </span>
                </Button>
              </div>
            )}
          </div>
        </header>

        <div className={cn("custom-scrollbar", (activeTab === 'genetics' || activeTab === 'print' || activeTab === 'pedigree') ? "p-0" : "p-4 md:p-8")}>
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
                activeTab === 'tasks' ? "max-w-4xl mx-auto w-full grid-cols-1" : 
                activeTab === 'financials' || activeTab === 'stats' || activeTab === 'contacts' || activeTab === 'breeding' ? "grid-cols-1 w-full max-w-7xl mx-auto" :
                activeTab === 'genetics' || activeTab === 'print' || activeTab === 'pedigree' ? "grid-cols-1 w-full" :
                activeTab === 'settings' ? "grid-cols-1 max-w-7xl mx-auto w-full" :
                activeTab === 'pairs' && viewMode === 'grid-large' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full" : viewMode === 'grid-large' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 w-full" :
                "grid-cols-1 max-w-7xl mx-auto w-full"
              )}>
                {activeTab === 'birds' && (
                  <div className="col-span-full space-y-6 w-full">
                    <div className={cn(
                      "grid gap-4 w-full",
                      viewMode === 'grid-large' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : "grid-cols-1 max-w-7xl mx-auto"
                    )}>
                      {(filteredItems as Bird[]).length > 0 ? (
                        (filteredItems as Bird[]).map(bird => (
                          <BirdCard 
                            key={bird.id} 
                            bird={bird} 
                            cage={cages.find(c => c.id === bird.cageId)}
                            birds={birds}
                            cages={cages}
                            viewMode={viewMode}
                            currency={userSettings?.currency}
                            userSettings={userSettings}
                            onBirdRef={handleBirdRef}
                            onNavigate={handleNavigate}
                            onEdit={() => { setEditingItem(bird); setIsModalOpen(true); }}
                            onDelete={() => setDeleteConfirmation({ 
                              title: 'Delete Bird', 
                              message: `Are you sure you want to delete "${bird.name}"? This action cannot be undone.`,
                              onConfirm: async () => {
                                try { 
                                  const batch = writeBatch(db);
                                  batch.delete(doc(db, 'birds', bird.id));
                                  
                                  // Clean up associated pairs
                                  const birdPairs = pairs.filter(p => p.maleId === bird.id || p.femaleId === bird.id);
                                  birdPairs.forEach(p => {
                                    batch.delete(doc(db, 'pairs', p.id));
                                  });

                                  // Clear mate's record
                                  const mateId = bird.mateId || birds.find(b => b.mateId === bird.id)?.id;
                                  if (mateId && mateId !== bird.id) {
                                    batch.update(doc(db, 'birds', mateId), { mateId: '' });
                                  }

                                  await batch.commit();
                                  toast.success('Bird and associated pair data deleted');
                                }
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
                      )}
                    </div>
                    {birds.length >= birdsLimit && (
                      <div className="flex justify-center pt-4">
                        <Button 
                          variant="secondary" 
                          onClick={() => setBirdsLimit(prev => prev + 50)}
                        >
                          Load More Birds
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'cages' && (
                  <div className="col-span-full space-y-6">
                    <div className={cn(
                      "grid gap-4",
                      viewMode === 'grid-large' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : "grid-cols-1 max-w-4xl mx-auto"
                    )}>
                      {(filteredItems as Cage[]).length > 0 ? (
                        (filteredItems as Cage[]).map(cage => (
                          <CageCard 
                            key={cage.id} 
                            cage={cage} 
                            birds={birds.filter(b => b.cageId === cage.id)}
                            cages={cages}
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
                      )}
                    </div>
                    {cages.length >= cagesLimit && (
                      <div className="flex justify-center pt-4">
                        <Button 
                          variant="secondary" 
                          onClick={() => setCagesLimit(prev => prev + 30)}
                        >
                          Load More Cages
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'pairs' && (
                  <div className="col-span-full space-y-6">
                    <div className={cn(
                      "grid gap-4",
                      viewMode === 'grid-large' ? "grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto" : "grid-cols-1 max-w-4xl mx-auto"
                    )}>
                      {(filteredItems as Pair[]).length > 0 ? (
                        (filteredItems as Pair[]).map(pair => (
                          <PairCard key={pair.id} pair={pair} male={birds.find(b => b.id === pair.maleId)} female={birds.find(b => b.id === pair.femaleId)} cages={cages} birds={birds} records={breedingRecords} currency={userSettings?.currency} viewMode={viewMode} onBirdRef={handleBirdRef} onNavigate={handleNavigate} userSettings={userSettings}
                            onEdit={() => { setEditingItem(pair); setIsModalOpen(true); }}
                            onDelete={() => setDeleteConfirmation({ 
                              title: 'Delete Pair', 
                              message: 'Are you sure you want to delete this breeding pair? This action cannot be undone.',
                              onConfirm: async () => {
                                try { 
                                  const batch = writeBatch(db);
                                  batch.delete(doc(db, 'pairs', pair.id));
                                  if (pair.maleId) batch.update(doc(db, 'birds', pair.maleId), { mateId: '' });
                                  if (pair.femaleId) batch.update(doc(db, 'birds', pair.femaleId), { mateId: '' });
                                  await batch.commit();
                                  toast.success('Pair deleted and mate links removed');
                                }
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
                      )}
                    </div>
                    {pairs.length >= pairsLimit && (
                      <div className="flex justify-center pt-4">
                        <Button 
                          variant="secondary" 
                          onClick={() => setPairsLimit(prev => prev + 30)}
                        >
                          Load More Pairs
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'breeding' && (
                  <div className="space-y-6">
                    <div className={cn("grid gap-4 sm:gap-6 w-full", viewMode === 'grid-large' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
                      {(filteredItems as BreedingRecord[]).length > 0 ? (
                        (filteredItems as BreedingRecord[]).map(record => (
                          <BreedingRecordCard 
                            key={record.id} 
                            record={record} 
                            viewMode={viewMode}
                            pair={pairs.find(p => p.id === record.pairId)}
                            male={birds.find(b => b.id === pairs.find(p => p.id === record.pairId)?.maleId)}
                            female={birds.find(b => b.id === pairs.find(p => p.id === record.pairId)?.femaleId)}
                            birds={birds}
                            onEdit={() => { setEditingItem(record); setIsModalOpen(true); }}
                            onDelete={() => setDeleteConfirmation({ 
                              title: 'Delete Breeding Record', 
                              message: 'Are you sure you want to delete this breeding record? This action cannot be undone.',
                              onConfirm: async () => {
                                try { await deleteDoc(doc(db, 'breedingRecords', record.id)); }
                                catch (e) { handleFirestoreError(e, OperationType.DELETE, 'breedingRecords'); }
                              }
                            })}
                            onBirdRef={handleBirdRef}
                          />
                        ))
                      ) : (
                        <div className="col-span-full py-20 text-center bg-black-900/30 border border-dashed border-black-800 rounded-3xl">
                          <Egg size={48} className="mx-auto text-black-300 mb-4" />
                          <p className="text-black-100 font-black uppercase tracking-widest">No breeding records found</p>
                        </div>
                      )}
                    </div>
                    {breedingRecords.length >= breedingLimit && (
                      <div className="flex justify-center pt-4">
                        <Button 
                          variant="secondary" 
                          onClick={() => setBreedingLimit(prev => prev + 20)}
                        >
                          Load More Breeding Records
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'financials' && (
                  <div className="space-y-6">
                    <FinancialsView 
                      transactions={filteredItems as Transaction[]} 
                      birds={birds} 
                      contacts={contacts}
                      cages={cages}
                      currency={userSettings?.currency}
                      onBirdRef={handleBirdRef}
                      onEditTransaction={(t) => { setEditingItem(t); setIsModalOpen(true); }}
                      onDeleteTransaction={(id) => setDeleteConfirmation({
                        title: 'Delete Transaction',
                        message: 'Are you sure you want to delete this transaction? This action cannot be undone.',
                        onConfirm: async () => {
                          try { await deleteDoc(doc(db, 'transactions', id)); }
                          catch (e) { handleFirestoreError(e, OperationType.DELETE, 'transactions'); }
                        }
                      })}
                    />
                    {transactions.length >= transactionLimit && (
                      <div className="flex justify-center pt-4">
                        <Button 
                          variant="secondary" 
                          onClick={() => setTransactionLimit(prev => prev + 20)}
                        >
                          Load More Transactions
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'stats' && statsFilter && (
                  <EntityStatsView 
                    filter={statsFilter}
                    birds={birds}
                    pairs={pairs}
                    breedingRecords={breedingRecords}
                    transactions={transactions}
                    cages={cages}
                    contacts={contacts}
                    currency={userSettings?.currency}
                    onBirdRef={handleBirdRef}
                    onEditBreeding={(r) => { setEditingItem(r); setIsModalOpen(true); }}
                    onDeleteBreeding={(id) => setDeleteConfirmation({
                      title: 'Delete Breeding Record',
                      message: 'Are you sure you want to delete this breeding record? This action cannot be undone.',
                      onConfirm: async () => {
                        try { await deleteDoc(doc(db, 'breedingRecords', id)); }
                        catch (e) { handleFirestoreError(e, OperationType.DELETE, 'breedingRecords'); }
                      }
                    })}
                    onEditTransaction={(t) => { setEditingItem(t); setIsModalOpen(true); }}
                    onDeleteTransaction={(id) => setDeleteConfirmation({
                      title: 'Delete Transaction',
                      message: 'Are you sure you want to delete this transaction? This action cannot be undone.',
                      onConfirm: async () => {
                        try { await deleteDoc(doc(db, 'transactions', id)); }
                        catch (e) { handleFirestoreError(e, OperationType.DELETE, 'transactions'); }
                      }
                    })}
                  />
                )}

                {activeTab === 'genetics' && (
                  <GeneticsCalculator userMutations={userSettings?.mutations || []} />
                )}

                {activeTab === 'print' && (
                  <PrintView birds={birds} pairs={pairs} cages={cages} onBirdRef={handleBirdRef} />
                )}

                {activeTab === 'pedigree' && (
                  <PedigreeFullView 
                    birdId={searchQuery} 
                    birds={birds} 
                    cages={cages} 
                    onBirdRef={handleBirdRef} 
                    onBack={handleGoBack} 
                    userSettings={userSettings ?? undefined}
                  />
                )}

                {activeTab === 'tasks' && (
                  taskViewMode === 'calendar' ? (
                    <div className="bg-black-950 border border-black-800 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b border-black-800">
                        <h3 className="text-lg font-black text-white">{format(currentMonth, 'MMMM yyyy')}</h3>
                        <div className="flex gap-2">
                          <Button variant="secondary" className="px-3 py-1" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronDown className="rotate-90" size={16} /></Button>
                          <Button variant="secondary" className="px-3 py-1" onClick={() => setCurrentMonth(new Date())}>Today</Button>
                          <Button variant="secondary" className="px-3 py-1" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={16} /></Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 text-center border-b border-black-800 bg-black-900">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="py-2 text-[10px] font-black text-black-200 uppercase tracking-widest">{day}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7">
                        {(() => {
                          const monthStart = startOfMonth(currentMonth);
                          const monthEnd = endOfMonth(monthStart);
                          const startDate = startOfWeek(monthStart);
                          const endDate = endOfWeek(monthEnd);
                          const days = [];
                          let day = startDate;
                          while (day <= endDate) {
                            const cloneDay = day;
                            const formattedDate = format(cloneDay, 'yyyy-MM-dd');
                            const dayTasks = tasks.filter(t => t.dueDate === formattedDate);
                            days.push(
                              <div key={day.toString()} className={cn("p-1 sm:p-2 border-b border-r border-black-800 min-h-[80px] sm:min-h-[100px]", !isSameMonth(day, monthStart) ? "text-black-500 bg-black/50" : "bg-black-950")}>
                                <span className="text-xs font-bold">{format(day, 'd')}</span>
                                <div className="mt-1 space-y-1">
                                  {dayTasks.map(t => (
                                    <div key={t.id} className="text-[9px] bg-gold-500/20 text-gold-400 p-1 rounded truncate cursor-pointer hover:bg-gold-500/30 transition-colors" onClick={() => { setEditingItem(t); setIsModalOpen(true); }}>
                                      {t.title}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                            day = addDays(day, 1);
                          }
                          return days;
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid gap-4">
                        {(filteredItems as Task[]).length > 0 ? (
                          (filteredItems as Task[]).map(task => (
                            <TaskCard 
                              key={task.id} 
                              task={task} 
                              birds={birds}
                              cages={cages}
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
                        )}
                      </div>
                      {tasks.length >= tasksLimit && (
                        <div className="flex justify-center pt-4">
                          <Button 
                            variant="secondary" 
                            onClick={() => setTasksLimit(prev => prev + 30)}
                          >
                            Load More Tasks
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                )}

                {activeTab === 'contacts' && (
                  <div className="space-y-6">
                    <ContactsView 
                      contacts={contacts}
                      transactions={transactions}
                      viewMode={viewMode}
                      onEdit={(c) => { setEditingItem(c); setIsModalOpen(true); }}
                      onDelete={(id) => setDeleteConfirmation({
                        title: 'Delete Contact',
                        message: 'Are you sure you want to delete this contact? This action cannot be undone.',
                        onConfirm: async () => {
                          try { await deleteDoc(doc(db, 'contacts', id)); }
                          catch (e) { handleFirestoreError(e, OperationType.DELETE, 'contacts'); }
                        }
                      })}
                      symbol={getCurrencySymbol(userSettings?.currency)}
                    />
                    {contacts.length >= contactsLimit && (
                      <div className="flex justify-center pt-4">
                        <Button 
                          variant="secondary" 
                          onClick={() => setContactsLimit(prev => prev + 50)}
                        >
                          Load More Contacts
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'settings' && userSettings && (
                  <SettingsView 
                    settings={userSettings} 
                    onUpdate={handleUpdateSettings} 
                    allData={{ birds, cages, pairs, breedingRecords, tasks, transactions, contacts, userSettings }}
                    user={user}
                    isSyncing={isSyncing}
                    setDeleteConfirmation={setDeleteConfirmation}
                    allSharedItems={allSharedItems}
                    setAllSharedItems={setAllSharedItems}
                  />
                )}

                {activeTab === 'subscription' && userSettings && (
                  <SubscriptionView 
                    settings={userSettings} 
                    onRenew={handleRenew} 
                    onBack={handleGoBack}
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
        title={`${(editingItem && (editingItem as any).id) ? 'Edit' : 'Add'} ${
          activeTab === 'breeding' ? 'Breeding Record' :
          activeTab === 'financials' ? 'Transaction' :
          activeTab === 'tasks' ? 'Task / Reminder' : 
          activeTab.slice(0, -1)
        }`}
      >
        {activeTab === 'birds' && (
          <BirdForm 
            user={user} 
            initialData={editingItem} 
            cages={cages} 
            birds={birds} 
            pairs={pairs}
            contacts={contacts}
            userSettings={userSettings}
            onAddSpecies={handleAddSpecies}
            onAddSubSpecies={handleAddSubSpecies}
            onAddMutation={handleAddMutation}
            onAddStatus={handleAddStatus}
            onClose={() => setIsModalOpen(false)} 
          />
        )}
        {activeTab === 'cages' && <CageForm user={user} initialData={editingItem} cages={cages} onClose={() => setIsModalOpen(false)} />}
        {activeTab === 'pairs' && <PairForm user={user} initialData={editingItem} birds={birds} cages={cages} onClose={() => setIsModalOpen(false)} />}
        {activeTab === 'breeding' && <BreedingRecordForm user={user} initialData={editingItem} pairs={pairs} birds={birds} cages={cages} onClose={() => setIsModalOpen(false)} />}
        {activeTab === 'tasks' && <TaskForm user={user} initialData={editingItem} birds={birds} cages={cages} onClose={() => setIsModalOpen(false)} />}
        {activeTab === 'financials' && <TransactionForm user={user} initialData={editingItem} birds={birds} pairs={pairs} cages={cages} contacts={contacts} currency={userSettings?.currency} onClose={() => setIsModalOpen(false)} />}
        {activeTab === 'contacts' && <ContactForm user={user} initialData={editingItem} onClose={() => setIsModalOpen(false)} />}
      </Modal>

      <ScannerModal 
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onScan={handleScanResult}
      />

      <ConfirmModal 
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={handleConfirmDelete}
        title={deleteConfirmation?.title || 'Confirm Delete'}
        message={deleteConfirmation?.message || 'Are you sure you want to delete this item? This action cannot be undone.'}
        isDeleting={isDeleting}
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
    <button onClick={onClick} className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all group', active ? 'bg-secondary text-black-950 shadow-lg shadow-secondary/20' : 'text-black-50 hover:bg-black-900 hover:text-secondary')}>
      <span className={cn('transition-transform group-hover:scale-110', active ? 'text-black-950' : 'text-black-100 group-hover:text-secondary')}>
        {icon}
      </span>
      <span className="flex-1 text-left uppercase tracking-widest text-[10px] truncate">{label}</span>
      <span className={cn('text-[10px] px-2 py-0.5 rounded-lg font-black', active ? 'bg-black/20 text-black' : 'bg-zinc-800 text-white/50 group-hover:text-secondary')}>{count}</span>
    </button>
  );
}

function ShareBirdModal({ bird, mother, father, mate, offspring, cages, cageName, onClose }: { bird: Bird, mother?: Bird, father?: Bird, mate?: Bird, offspring: Bird[], cages: Cage[], cageName?: string, onClose: () => void }) {
  const [selectedFields, setSelectedFields] = useState<string[]>(['name', 'sex', 'species', 'mutations', 'splitMutations', 'cage', 'mate', 'offspring', 'parents', 'birthDate', 'image']);
  const [isTransferMode, setIsTransferMode] = useState(false);

  const fields = [
    { id: 'name', label: 'ID / Number' },
    { id: 'sex', label: 'Sex' },
    { id: 'species', label: 'Species & Sub-species' },
    { id: 'mutations', label: 'Mutations' },
    { id: 'splitMutations', label: 'Split Mutations' },
    { id: 'cage', label: 'Cage Number' },
    { id: 'mate', label: 'Current Mate' },
    { id: 'offspring', label: 'Offspring List' },
    { id: 'birthDate', label: 'Birth Date' },
    { id: 'parents', label: 'Parents (Names)' },
    { id: 'image', label: 'Bird Image' },
    { id: 'notes', label: 'Notes' },
  ];

  const formatBirdInfo = (targetBird: Bird, title: string, includeImage: boolean = false) => {
    let text = `📍 ${title}: ${targetBird.name}\n`;
    const indent = "   ";
    
    if (selectedFields.includes('sex')) text += `${indent}• Sex: ${targetBird.sex}\n`;
    if (selectedFields.includes('species')) {
      text += `${indent}• Species: ${targetBird.species}${targetBird.subSpecies ? ` (${targetBird.subSpecies})` : ''}\n`;
    }
    if (selectedFields.includes('mutations') && targetBird.mutations?.length) {
      text += `${indent}• Mutations: ${targetBird.mutations.join(', ')}\n`;
    }
    if (selectedFields.includes('splitMutations') && targetBird.splitMutations?.length) {
      text += `${indent}• Split: ${targetBird.splitMutations.join(', ')}\n`;
    }
    if (selectedFields.includes('birthDate') && targetBird.birthDate) {
      text += `${indent}• Born: ${targetBird.birthDate}\n`;
    }
    if (selectedFields.includes('cage')) {
      const birdCage = cages.find(c => c.id === targetBird.cageId);
      if (birdCage) text += `${indent}• Cage: ${birdCage.name}\n`;
      else if (targetBird.id === bird.id && cageName) text += `${indent}• Cage: ${cageName}\n`;
    }
    if (includeImage && selectedFields.includes('image') && targetBird.imageUrl && !targetBird.imageUrl.startsWith('data:')) {
      text += `${indent}• Image: ${targetBird.imageUrl}\n`;
    }
    return text + "\n";
  };

  const handleShare = async () => {
    let shareText = `🕊️ BIRD PROFILE: ${bird.name}\n`;
    shareText += `====================\n\n`;
    
    shareText += formatBirdInfo(bird, "MAIN DETAILS", true);
    
    if (selectedFields.includes('parents')) {
      if (father || mother) {
        shareText += `🧬 PARENTS\n`;
        if (father) shareText += formatBirdInfo(father, "Father");
        if (mother) shareText += formatBirdInfo(mother, "Mother");
      }
    }

    if (selectedFields.includes('mate') && mate) {
      shareText += `💝 CURRENT MATE\n`;
      shareText += formatBirdInfo(mate, "Mate");
    }

    if (selectedFields.includes('offspring') && offspring.length > 0) {
      shareText += `🐣 OFFSPRING (${offspring.length})\n`;
      offspring.forEach((o, i) => {
        shareText += formatBirdInfo(o, `Child #${i + 1}`);
      });
    }

    if (selectedFields.includes('notes') && bird.notes) {
      shareText += `📝 NOTES\n${bird.notes}\n\n`;
    }

    if (isTransferMode) {
      shareText += `\n--- Transfer Data ---\n`;
      const transferData = {
        ...bird,
        uid: undefined,
        cageId: undefined,
        motherId: undefined,
        fatherId: undefined,
        mateId: undefined,
        motherName: mother?.name,
        fatherName: father?.name,
        mateName: mate?.name,
      };
      
      try {
        const docRef = await addDoc(collection(db, 'shared_items'), {
          type: 'bird',
          action: 'transfer',
          data: JSON.stringify(transferData),
          createdAt: new Date().toISOString(),
          createdBy: auth.currentUser?.uid || ''
        });
        const transferUrl = `${window.location.origin}?transferId=${docRef.id}`;
        shareText += `\nImport Link: ${transferUrl}\n`;
      } catch (err) {
        console.error('Failed to create transfer link:', err);
      }
    }

    const shareData: any = {
      title: `Bird: ${bird.name}`,
      text: shareText
    };

    if (selectedFields.includes('image') && bird.imageUrl?.startsWith('data:')) {
      try {
        const res = await fetch(bird.imageUrl);
        const blob = await res.blob();
        const file = new File([blob], `${bird.name.replace(/[^a-zA-Z0-9]/g, '_')}.webp`, { type: 'image/webp' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }
      } catch (err) {
        console.error('Failed to prepare image for sharing:', err);
      }
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        onClose();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
          navigator.clipboard.writeText(shareText);
          toast.success('Bird info copied to clipboard');
        }
        onClose();
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Bird info copied to clipboard');
      onClose();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Select Data to Share</h3>
          <button 
            onClick={() => setIsTransferMode(!isTransferMode)}
            className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all",
              isTransferMode ? "bg-gold-500 border-gold-500 text-black" : "border-black-700 text-white/50"
            )}
          >
            {isTransferMode ? 'Transfer Mode ON' : 'Transfer Mode OFF'}
          </button>
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

      <Button onClick={handleShare} className="w-full py-4">
        <Send size={18} className="mr-2" />
        {isTransferMode ? 'Share & Transfer' : 'Share Bird Info'}
      </Button>
    </div>
  );
}

function SharePairModal({ pair, male, female, birds, records, onClose }: { pair: Pair, male?: Bird, female?: Bird, birds: Bird[], records: BreedingRecord[], onClose: () => void }) {
  const [selectedFields, setSelectedFields] = useState<string[]>(['male', 'female', 'breeding']);
  const [isTransferMode, setIsTransferMode] = useState(false);

  const fields = [
    { id: 'male', label: 'Male Bird Info' },
    { id: 'female', label: 'Female Bird Info' },
    { id: 'breeding', label: 'Breeding Records' }
  ];

  const handleShare = async () => {
    let shareText = `💞 PAIR PROFILE\n`;
    shareText += `====================\n\n`;
    
    if (selectedFields.includes('male') && male) {
      shareText += `♂️ MALE: ${male.name}\n   • Species: ${male.species}\n   • Mutations: ${male.mutations?.join(', ') || 'N/A'}\n\n`;
    }
    if (selectedFields.includes('female') && female) {
      shareText += `♀️ FEMALE: ${female.name}\n   • Species: ${female.species}\n   • Mutations: ${female.mutations?.join(', ') || 'N/A'}\n\n`;
    }

    const pairRecords = records.filter(r => r.pairId === pair.id);
    if (selectedFields.includes('breeding') && pairRecords.length > 0) {
      shareText += `🐣 BREEDING RECORDS (${pairRecords.length})\n`;
      pairRecords.forEach(r => {
        shareText += `   • ${r.startDate}: Laid: ${r.eggsLaid}, Hatched: ${r.eggsHatched}, Weaned: ${r.chicksWeaned}\n`;
      });
      shareText += `\n`;
    }

    if (isTransferMode) {
      shareText += `\n--- Transfer Data ---\n`;

      const maleFather = male ? birds.find(b => b.id === male.fatherId) : undefined;
      const maleMother = male ? birds.find(b => b.id === male.motherId) : undefined;
      const femaleFather = female ? birds.find(b => b.id === female.fatherId) : undefined;
      const femaleMother = female ? birds.find(b => b.id === female.motherId) : undefined;

      const cleanBirdForTransfer = (b?: Bird, f?: Bird, m?: Bird) => b ? {
        ...b, 
        uid: undefined, 
        cageId: undefined, 
        fatherId: undefined, 
        motherId: undefined, 
        mateId: undefined,
        fatherName: f?.name, 
        motherName: m?.name,
        notes: b.notes || '',
        statuses: b.statuses || [],
        purchasePrice: b.purchasePrice || 0,
        estimatedValue: b.estimatedValue || 0,
      } : undefined;

      const transferData = {
        ...pair,
        uid: undefined,
        maleBird: selectedFields.includes('male') ? cleanBirdForTransfer(male, maleFather, maleMother) : undefined,
        femaleBird: selectedFields.includes('female') ? cleanBirdForTransfer(female, femaleFather, femaleMother) : undefined,
        breedingRecords: selectedFields.includes('breeding') ? pairRecords.map(r => ({ ...r, pairId: undefined, uid: undefined })) : [],
      };
      
      try {
        const docRef = await addDoc(collection(db, 'shared_items'), {
          type: 'pair',
          action: 'transfer',
          data: JSON.stringify(transferData),
          createdAt: new Date().toISOString(),
          createdBy: auth.currentUser?.uid || ''
        });
        const transferUrl = `${window.location.origin}?transferId=${docRef.id}`;
        shareText += `\nImport Link: ${transferUrl}\n`;
      } catch (err) {
        console.error('Failed to create transfer link:', err);
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: `Pair Transfer`, text: shareText });
        onClose();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(shareText);
          toast.success('Pair info copied to clipboard');
        }
        onClose();
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Pair info copied to clipboard');
      onClose();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Select Data to Share</h3>
          <button 
            onClick={() => setIsTransferMode(!isTransferMode)}
            className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all",
              isTransferMode ? "bg-gold-500 border-gold-500 text-black" : "border-black-700 text-white/50"
            )}
          >
            {isTransferMode ? 'Transfer Mode ON' : 'Transfer Mode OFF'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-2">
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

      <Button onClick={handleShare} className="w-full py-4">
        <Send size={18} className="mr-2" />
        {isTransferMode ? 'Share & Transfer' : 'Share Pair Info'}
      </Button>
    </div>
  );
}

function PedigreeFullView({ birdId, birds, cages, onBirdRef, onBack, userSettings }: { birdId: string, birds: Bird[], cages: Cage[], onBirdRef: (name: string) => void, onBack: () => void, userSettings?: UserSettings }) {
  const bird = birds.find(b => b.id === birdId);
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(1200);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // Use scrollWidth to get the full natural width of the unscaled content
        const width = contentRef.current?.scrollWidth || entry.contentRect.width;
        if (width > 0) setContentWidth(width);
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  if (!bird) return <div className="p-4 sm:p-8 text-center text-white/50">Bird not found</div>;
  
  const offspring = birds.filter(b => b.fatherId === bird.id || b.motherId === bird.id);
  
  // Calculate scale based on real content width vs screen width
  const padding = window.innerWidth < 640 ? 20 : 64;
  const scaleValue = containerWidth > 0 ? (containerWidth - padding) / contentWidth : 1;
  const finalScale = Math.max(0.1, Math.min(2, scaleValue));

  return (
    <div className="flex-1 flex flex-col pt-safe px-safe min-h-screen bg-black overflow-hidden select-none">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          #pedigree-print-area { 
            background: white !important; 
            color: black !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #pedigree-print-area * { 
            color: black !important; 
            border-color: #ddd !important;
            -webkit-print-color-adjust: exact;
          }
          #pedigree-print-area .bg-black,
          #pedigree-print-area .bg-\\[\\#050505\\] { 
            background: white !important; 
          }
          #pedigree-print-area .bg-zinc-900 { 
            background: #f8f8f8 !important; 
            border: 1pt solid #ddd !important;
          }
          #pedigree-print-area .text-gold-500 { 
            color: #854d0e !important; 
            font-weight: 900 !important;
          }
          #pedigree-print-area .text-white { 
            color: black !important; 
          }
          #pedigree-print-area .border-white\\/5, 
          #pedigree-print-area .border-white\\/10 { 
            border-color: #eee !important; 
          }
          #pedigree-print-area .bg-emerald-500\\/10 { 
            background: #f0fdf4 !important; 
            border: 1pt solid #bbf7d0 !important;
          }
          /* Hide non-print elements */
          #pedigree-print-area .custom-scrollbar { overflow: visible !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="flex justify-between items-center p-4 sm:p-5 border-b border-white/5 shrink-0 bg-black/95 backdrop-blur-xl z-50 shadow-2xl">
         <div className="flex items-center gap-3">
            <button onClick={onBack} className="h-9 w-9 flex items-center justify-center bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white rounded-xl transition-all shadow-lg active:scale-95">
               <ArrowLeft size={18} />
            </button>
            <div>
               <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest text-white leading-none">FAMILY TREE</h2>
               <p className="text-gold-500 font-bold uppercase tracking-widest text-[9px] sm:text-xs mt-1 flex items-center gap-1.5 opacity-80">
                 <div className="w-1.5 h-1.5 rounded-full bg-gold-500" />
                 {bird.name}
               </p>
            </div>
         </div>
         <div className="flex items-center gap-2">
           <button onClick={() => window.print()} className="h-9 w-9 flex items-center justify-center bg-zinc-900 border border-white/5 hover:bg-gold-500 hover:text-black hover:border-gold-500 text-white rounded-xl transition-all shadow-lg active:scale-95">
              <Printer size={16} />
           </button>
         </div>
      </div>

      <div id="pedigree-print-area" className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar flex flex-col items-center print:p-0 print:bg-white print:text-black bg-[#050505] pt-12 sm:pt-20">
         <div className="w-full max-w-full pb-32 print:pb-0 flex flex-col items-center">
            {/* Dynamic Scaling Container */}
            <div ref={containerRef} className="w-full flex flex-col items-center overflow-visible px-4 sm:px-12">
               <div className="flex justify-center origin-top transition-transform duration-500 ease-out" style={{ 
                 transform: `scale(${finalScale})`,
                 width: contentWidth,
                 marginBottom: `calc(${contentWidth * 0.8}px * (1 - ${finalScale}) * -1)`
               }}>
                  <div ref={contentRef} className="w-max flex justify-center flex-col items-center">
                    <AncestryNode 
                       birdId={bird.id} 
                       birds={birds} 
                       cages={cages} 
                       onBirdRef={onBirdRef} 
                       userSettings={userSettings}
                       maxGenerations={4} 
                       roleLabel="Focus Bird" 
                    />
                    <DescendantsTree
                       birdId={bird.id}
                       birds={birds}
                       cages={cages}
                       onBirdRef={onBirdRef}
                       userSettings={userSettings}
                       maxGenerations={4}
                    />
                  </div>
               </div>
            </div>
         </div>
      </div>
      
      <style>{`
        @media print {
           body * {
              visibility: hidden;
           }
           .fixed, nav { display: none !important; }
           #pedigree-print-area, #pedigree-print-area * {
              visibility: visible !important;
           }
           #pedigree-print-area {
              position: static !important;
              width: 100% !important;
              background: white !important;
              color: black !important;
              padding: 0 !important;
              overflow: visible !important;
           }
           .print\\:bg-white { background: white !important; }
           .print\\:text-black { color: black !important; }
           ::-webkit-scrollbar { display: none; }
        }
      `}</style>
    </div>
  );
}

function BirdCard({ bird, cage, birds, cages, viewMode = 'grid-large', currency, onBirdRef, onNavigate, onEdit, onDelete, userSettings }: { bird: Bird, cage?: Cage, birds: Bird[], cages: Cage[], viewMode?: 'grid-large' | 'list', currency?: string, onBirdRef: (name: string) => void, onNavigate: (tab: string, query?: string, filter?: any) => void, onEdit: () => void, onDelete: () => void, userSettings?: UserSettings }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const symbol = getCurrencySymbol(currency);
  const offspring = birds.filter(b => b.motherId === bird.id || b.fatherId === bird.id || bird.offspringIds?.includes(b.id));
  const mother = birds.find(b => b.id === bird.motherId);
  const father = birds.find(b => b.id === bird.fatherId);
  const mate = birds.find(b => b.id === bird.mateId) || birds.find(b => b.mateId === bird.id);

  const effectiveViewMode = (viewMode === 'list' && isExpanded) ? 'grid-large' : viewMode;
  const imageUrl = bird.imageUrl || null;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShareModalOpen(true);
  };

  const handleTransfer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const visited = new Set<string>();
      const relatedBirds: any[] = [];
      const collect = (id: string | null | undefined) => {
        if (!id || visited.has(id)) return;
        visited.add(id);
        const b = birds.find(x => x.id === id);
        if (b && b.id !== bird.id) {
          relatedBirds.push({
            originalId: b.id,
            name: b.name,
            species: b.species,
            subSpecies: b.subSpecies,
            sex: b.sex,
            mutations: b.mutations,
            splitMutations: b.splitMutations,
            motherId: b.motherId,
            fatherId: b.fatherId,
            imageUrl: b.imageUrl,
            isGhost: true, // Marker for imported relative
          });
          collect(b.motherId);
          collect(b.fatherId);
          birds.filter(off => off.motherId === b.id || off.fatherId === b.id).forEach(o => collect(o.id));
        }
      };
      
      collect(bird.motherId);
      collect(bird.fatherId);
      offspring.forEach(o => collect(o.id));

      // For transfer, we include almost everything except uid, cageId
      const transferData = {
        ...bird,
        originalId: bird.id,
        uid: undefined,
        cageId: undefined,
        mateId: undefined,
        notes: bird.notes || '',
        statuses: bird.statuses || [],
        purchasePrice: bird.purchasePrice || 0,
        estimatedValue: bird.estimatedValue || 0,
        relatedBirds, // all collected relations
      };
      
      const docRef = await addDoc(collection(db, 'shared_items'), {
        type: 'bird',
        action: 'transfer',
        data: JSON.stringify(transferData),
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid || ''
      });
      
      const url = `${window.location.origin}?transferId=${docRef.id}`;
      
      if (navigator.share) {
        await navigator.share({
          title: `Transfer Bird: ${bird.name}`,
          text: `Here is the transfer info for ${bird.name}`,
          url: url
        });
      } else {
        navigator.clipboard.writeText(url);
        toast.success('Transfer link copied to clipboard');
      }
    } catch (err) {
      console.error('Transfer failed:', err);
      toast.error('Failed to generate transfer link');
    }
  };

  return (
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
              <Badge 
                variant={bird.sex === 'Male' ? 'male' : bird.sex === 'Female' ? 'female' : 'neutral'} 
                className="shrink-0"
              >
                {bird.sex}
              </Badge>
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
        
        {/* 3. Mutations / Split Mutations / Statuses */}
        {(bird.mutations?.length || 0) > 0 || (bird.splitMutations?.length || 0) > 0 || (bird.statuses?.length || 0) > 0 ? (
          <div className="flex flex-wrap gap-1">
            {bird.mutations?.map(m => <Badge key={m} className="bg-zinc-700 border-black-700 text-white text-[9px] px-1.5 py-0">{m}</Badge>)}
            {bird.splitMutations?.map(m => <Badge key={m} className="bg-zinc-700 border-black-700 text-gold-500 italic text-[9px] px-1.5 py-0">Split {m}</Badge>)}
            {bird.statuses?.map(s => <Badge key={s} className="bg-blue-900/40 border-blue-800 text-blue-200 text-[9px] px-1.5 py-0 shadow-sm">{s}</Badge>)}
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
              <button onClick={(e) => { e.stopPropagation(); onNavigate('birds', cage.name); }} className="text-white font-bold flex items-center gap-1.5 hover:text-secondary transition-colors">
                <Home size={10} className="text-secondary" /> {cage.name}
              </button>
            ) : (
              <p className="text-white font-bold flex items-center gap-1.5"><Home size={10} className="text-secondary" /> Unassigned</p>
            )}
          </div>
          <div className={cn(effectiveViewMode === 'list' ? "flex items-center gap-2" : "space-y-0.5")}>
            <p className="text-white uppercase tracking-widest font-black text-[8px]">Born{effectiveViewMode === 'list' ? ':' : ''}</p>
            <p className="text-white font-bold flex items-center gap-1.5"><Calendar size={10} className="text-secondary" /> {bird.birthDate || 'Unknown'}</p>
          </div>
          <div className={cn(effectiveViewMode === 'list' ? "flex items-center gap-2" : "space-y-0.5")}>
            <p className="text-white uppercase tracking-widest font-black text-[8px]">Value{effectiveViewMode === 'list' ? ':' : ''}</p>
            <p className="text-secondary font-bold flex items-center gap-1.5">{symbol}{bird.estimatedValue?.toFixed(2) || '0.00'}</p>
          </div>
          <div className={cn(effectiveViewMode === 'list' ? "flex items-center gap-2 flex-1" : "col-span-2 space-y-1.5 pt-1 w-full")}>
              <p className="text-white uppercase tracking-widest font-black text-[8px]">Mate{effectiveViewMode === 'list' ? ':' : ''}</p>
              {mate ? (
                <BirdCompactInfo bird={mate} cages={cages} onClick={() => onBirdRef(mate.name)} />
              ) : (
                <p className="text-white/30 italic text-[10px]">No mate assigned</p>
              )}
            </div>
        </div>
        <div className="pt-2 border-t border-black-800/50">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }} 
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all border border-black-700"
          >
            <MoreHorizontal size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Actions</span>
          </button>
          
          <AnimatePresence>
            {showActions && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onNavigate('stats', '', { birdId: bird.id }); }} 
                    className="flex-1 p-2 bg-secondary/10 border border-secondary/20 rounded-lg text-[10px] text-secondary font-black uppercase tracking-widest hover:bg-secondary/20 transition-colors flex items-center justify-center gap-2 min-w-[100px]"
                  >
                    <Egg size={12} className="text-secondary" />
                    Breeding
                  </button>
                  <button 
                    onClick={handleShare} 
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white hover:text-secondary rounded-lg transition-all border border-black-700 min-w-[100px]"
                  >
                    <Share2 size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Share</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowDocs(true); }} 
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white hover:text-secondary rounded-lg transition-all border border-black-700 min-w-[100px]"
                  >
                    <FileText size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Docs</span>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onNavigate('pedigree', bird.id); }} 
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-xl transition-all border border-secondary/20 group/btn min-w-[80px]"
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
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all group/btn min-w-[80px]"
                    style={{
                      backgroundColor: `color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 90%)`,
                      color: 'var(--theme-delete-color, #ef4444)',
                      borderColor: `color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)`,
                      borderWidth: '1px'
                    }}
                  >
                    <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Delete</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Share Bird"> 
          <ShareBirdModal bird={bird} mother={mother} father={father} mate={mate} offspring={offspring} cages={cages} cageName={cage?.name} onClose={() => setIsShareModalOpen(false)} /> 
        </Modal> 
        <Modal isOpen={showDocs} onClose={() => setShowDocs(false)} title={`Documents - ${bird.name}`}> 
          <BirdDocumentsModal bird={bird} onClose={() => setShowDocs(false)} /> 
        </Modal>
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black-800/50">
          {viewMode === 'list' && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white hover:text-gold-500 rounded-lg transition-all border border-black-700 shrink-0"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>

        {effectiveViewMode !== 'list' && bird.notes && (
          <div className="pt-3 border-t border-black-800/50 space-y-2">
            <p className="text-[11px] text-white leading-relaxed line-clamp-2 italic">"{bird.notes}"</p>
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
  );
}

function CageCard({ cage, birds, cages, viewMode = 'grid-large', onBirdRef, onNavigate, onEdit, onDelete }: { cage: Cage, birds: Bird[], cages: Cage[], viewMode?: 'grid-large' | 'list', onBirdRef: (name: string) => void, onNavigate: (tab: string, query?: string, filter?: any) => void, onEdit: () => void, onDelete: () => void }) {
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
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-white hover:text-secondary hover:bg-zinc-700 rounded-lg transition-colors">
                <Edit2 size={16} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                className="p-1.5 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 90%)',
                  color: 'var(--theme-delete-color, #ef4444)'
                }}
              >
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
        {cageBirds.length > 0 && (
          <div 
            className="mt-4 p-3 sm:p-4 bg-zinc-900/50 rounded-xl border border-black-700 cursor-pointer hover:border-gold-500/50 transition-all group/residents"
            onClick={(e) => { e.stopPropagation(); onNavigate('birds', cage.name); }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] text-white uppercase tracking-widest font-black group-hover/residents:text-gold-500 transition-colors">Residents ({cageBirds.length})</p>
              <div className="text-[8px] text-gold-500 flex items-center gap-1 uppercase tracking-widest font-black">
                View All <ChevronRight size={10} />
              </div>
            </div>
            <div className="flex flex-col gap-2 pointer-events-none">
              {cageBirds.map(b => (
                <BirdCompactInfo key={b.id} bird={b} cages={cages} />
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
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }} 
            className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-lg transition-all min-w-[70px]"
            style={{
              backgroundColor: `color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 90%)`,
              color: 'var(--theme-delete-color, #ef4444)',
              borderColor: `color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)`,
              borderWidth: '1px'
            }}
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

function PairCard({ pair, male, female, cages, birds, records, currency, onBirdRef, onNavigate, onEdit, onDelete, userSettings, viewMode = 'grid-large' }: { pair: Pair, male?: Bird, female?: Bird, cages: Cage[], birds: Bird[], records?: BreedingRecord[], currency?: string, onBirdRef: (name: string) => void, onNavigate: (tab: string, query?: string, filter?: any) => void, onEdit: () => void, onDelete: () => void, userSettings?: UserSettings, viewMode?: 'grid-large' | 'list' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const effectiveViewMode = (viewMode === 'list' && !isExpanded) ? 'list' : 'grid-large';
  const cage = cages.find(c => c.id === (male?.cageId || female?.cageId));

    const BirdInfo = ({ bird, sex }: { bird?: Bird, sex: 'Male' | 'Female' }) => {
      return (
        <div 
          className={cn(
            "flex-1 min-w-0 rounded-2xl border transition-all relative overflow-hidden flex flex-col bg-black/20",
            !bird && "opacity-50 grayscale"
          )}
          style={{
            borderColor: sex === 'Male' ? 'color-mix(in srgb, var(--theme-male-color, #3b82f6), transparent 80%)' : 'color-mix(in srgb, var(--theme-female-color, #e11d48), transparent 80%)'
          }}
        >
          {/* Bird Image */}
          <div className="h-24 sm:h-28 w-full relative bg-black/40 overflow-hidden">
            {bird?.imageUrl ? (
              <img 
                src={bird.imageUrl} 
                alt={bird.name} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/5">
                <BirdIcon size={32} />
              </div>
            )}
            <div className="absolute top-2 right-2">
              <Badge 
                variant={sex === 'Male' ? 'male' : 'female'} 
                className="text-[8px] px-1.5 py-0.5 shadow-lg backdrop-blur-md bg-black/40"
              >
                {sex}
              </Badge>
            </div>
          </div>

          <div className="p-2.5 space-y-1 flex-1 flex flex-col justify-between">
            {bird ? (
              <BirdCompactInfo bird={bird} cages={cages} className="border-0 bg-transparent p-0" />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">Unknown</span>
              </div>
            )}
          </div>
        </div>
      );
    };

  if (effectiveViewMode === 'list') {
    return (
      <Card 
        onClick={() => setIsExpanded(true)}
        className="group cursor-pointer transition-all duration-300 border-black-800 hover:border-gold-500/40 hover:bg-black-900/50 p-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="male" className="text-[8px] px-1 py-0 shrink-0">M</Badge>
              <span className="text-xs font-bold text-white truncate max-w-[120px]">{male?.name || 'Unknown'}</span>
              <span className="text-[9px] text-black-400 truncate uppercase tracking-widest">
                {male?.species}{male?.subSpecies ? ` • ${male.subSpecies}` : ''}
              </span>
              {male?.mutations && male.mutations.length > 0 && (
                <span className="text-[8px] px-1.5 py-0.5 bg-white/5 border border-white/5 rounded text-white/60 font-bold uppercase truncate">
                  {male.mutations.join(', ')}
                </span>
              )}
              {male?.splitMutations && male.splitMutations.length > 0 && (
                <span className="text-[8px] px-1.5 py-0.5 bg-white/5 border border-white/5 rounded text-white/60 font-bold uppercase truncate">
                  /{male.splitMutations.join(', ')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="female" className="text-[8px] px-1 py-0 shrink-0">F</Badge>
              <span className="text-xs font-bold text-white truncate max-w-[120px]">{female?.name || 'Unknown'}</span>
              <span className="text-[9px] text-black-400 truncate uppercase tracking-widest">
                {female?.species}{female?.subSpecies ? ` • ${female.subSpecies}` : ''}
              </span>
              {female?.mutations && female.mutations.length > 0 && (
                <span className="text-[8px] px-1.5 py-0.5 bg-white/5 border border-white/5 rounded text-white/60 font-bold uppercase truncate">
                  {female.mutations.join(', ')}
                </span>
              )}
              {female?.splitMutations && female.splitMutations.length > 0 && (
                <span className="text-[8px] px-1.5 py-0.5 bg-white/5 border border-white/5 rounded text-white/60 font-bold uppercase truncate">
                  /{female.splitMutations.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2 ml-3 shrink-0">
          <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-gold-500">
            <Home size={10} />
            <span className="max-w-[80px] truncate">{cage?.name || 'Unassigned'}</span>
          </div>
          <Badge variant={pair.status === 'Active' ? 'success' : 'neutral'} className="text-[8px] px-2 py-0.5">
            {pair.status}
          </Badge>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      onClick={() => viewMode === 'list' && setIsExpanded(false)}
      className={cn(
        "group transition-all duration-500 overflow-hidden border-black-800 hover:border-gold-500/40 shadow-2xl flex flex-col bg-zinc-900/40 backdrop-blur-sm h-full", 
        viewMode === 'list' ? "cursor-pointer" : "cursor-default"
      )}
    >
      {/* Cage Header - Always on top */}
      <div className="bg-black-950/80 px-4 py-2.5 border-b border-black-800 flex items-center justify-between relative z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-gold-500/10 rounded-lg border border-gold-500/20">
            <Home size={12} className="text-gold-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-gold-500/60 uppercase tracking-[0.2em] leading-none mb-0.5">Aviary Unit</span>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white truncate max-w-[120px] sm:max-w-[180px]">
              {cage?.name || 'Unassigned'}
            </span>
          </div>
        </div>
        <Badge variant={pair.status === 'Active' ? 'success' : 'neutral'} className="text-[8px] px-3 py-1 rounded-full border border-white/5 shadow-inner">
          {pair.status}
        </Badge>
      </div>

      <div className="p-3 sm:p-4 space-y-3 flex-1 flex flex-col">
        {/* Birds Section */}
        <div 
          onClick={(e) => { e.stopPropagation(); onNavigate('birds', pair.id); }}
          className="cursor-pointer flex gap-2 items-stretch relative flex-1"
        >
          <BirdInfo bird={male} sex="Male" />
          <div className="flex items-center justify-center relative z-10 -mx-1 sm:-mx-2">
             <div className="p-1.5 sm:p-2 bg-zinc-900 rounded-full border-2 border-zinc-800 shadow-xl group-hover:scale-110 transition-transform duration-500">
                <Heart 
                  size={14} 
                  className={cn(pair.status === 'Active' ? 'animate-pulse' : '')} 
                  style={{ 
                    color: pair.status === 'Active' ? (userSettings?.themeColor || 'var(--theme-accent-color, #d4af37)') : '#3f3f46',
                    fill: pair.status === 'Active' ? (userSettings?.themeColor || 'var(--theme-accent-color, #d4af37)') : 'transparent'
                  }}
                />
             </div>
          </div>
          <BirdInfo bird={female} sex="Female" />
        </div>

        {/* Footer Info & Actions */}
        <div className="space-y-3 shrink-0">
          <div className="flex items-center justify-between text-[8px] text-white/30 uppercase tracking-widest font-black pt-2 border-t border-black-800/30">
            <div className="flex items-center gap-1.5">
              <Calendar size={10} className="text-secondary/50" />
              <span>{pair.startDate || 'N/A'}</span>
            </div>
            {pair.endDate && (
              <span 
                className="font-bold opacity-60"
                style={{ color: 'var(--theme-delete-color, #ef4444)' }}
              >
                Ended: {pair.endDate}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <button 
              onClick={(e) => { e.stopPropagation(); onNavigate('stats', '', { pairId: pair.id }); }} 
              className="flex flex-col items-center justify-center py-2 bg-secondary/5 hover:bg-secondary/10 text-secondary rounded-xl border border-secondary/10 transition-all active:scale-95"
              title="Breeding"
            >
              <Egg size={14} />
              <span className="text-[7px] font-black uppercase mt-1">Breeding</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsShareModalOpen(true); }} 
              className="flex flex-col items-center justify-center py-2 bg-zinc-800/50 hover:bg-zinc-700 text-white/60 rounded-xl border border-white/5 transition-all active:scale-95"
              title="Share"
            >
              <Share2 size={14} />
              <span className="text-[7px] font-black uppercase mt-1">Share</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }} 
              className="flex flex-col items-center justify-center py-2 bg-zinc-800/50 hover:bg-zinc-700 text-white/60 rounded-xl border border-white/5 transition-all active:scale-95"
              title="Edit"
            >
              <Edit2 size={14} />
              <span className="text-[7px] font-black uppercase mt-1">Edit</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              className="flex flex-col items-center justify-center py-2 rounded-xl transition-all active:scale-95 border"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 95%)',
                color: 'var(--theme-delete-color, #ef4444)',
                borderColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)'
              }}
              title="Delete"
            >
              <Trash2 size={14} />
              <span className="text-[7px] font-black uppercase mt-1">Delete</span>
            </button>
          </div>
        </div>
      </div>
      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Share Pair"> 
        <SharePairModal pair={pair} male={male} female={female} birds={birds} records={records || []} onClose={() => setIsShareModalOpen(false)} /> 
      </Modal> 
    </Card>
  );
}

function FinancialsView({ 
  transactions, 
  birds, 
  contacts,
  cages,
  currency, 
  onBirdRef, 
  onEditTransaction, 
  onDeleteTransaction
}: { 
  transactions: Transaction[], 
  birds: Bird[], 
  contacts: Contact[],
  cages: Cage[],
  currency?: string, 
  onBirdRef: (name: string) => void, 
  onEditTransaction: (t: Transaction) => void, 
  onDeleteTransaction: (id: string) => void
}) {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const symbol = getCurrencySymbol(currency);

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
    
    return {
      totalIncome: income,
      totalExpenses: expenses,
      netProfit: income - expenses
    };
  }, [transactions]);

  const chartData = useMemo(() => {
    const now = new Date();
    let points: number;
    let formatStr: string;

    if (timeRange === 'daily') {
      points = 7;
      formatStr = 'EEE';
    } else if (timeRange === 'weekly') {
      points = 4;
      formatStr = 'MMM d';
    } else {
      points = 6;
      formatStr = 'MMM';
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest mr-2">Net Profit</p>
            <TrendingUp size={16} className="shrink-0" style={{ color: stats.netProfit >= 0 ? '#34d399' : 'var(--theme-delete-color, #ef4444)' }} />
          </div>
          <div>
            <p className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tighter break-all">{symbol}{stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-[8px] sm:text-[9px] text-white/50 mt-1 font-bold uppercase tracking-tighter">Overall Performance</p>
          </div>
        </Card>
        <Card className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest mr-2">Total Income</p>
            <ArrowUpRight size={16} className="text-emerald-400 shrink-0" />
          </div>
          <div>
            <p className="text-lg sm:text-xl md:text-2xl font-black text-emerald-500 tracking-tighter break-all">{symbol}{stats.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
        </Card>
        <Card className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest mr-2">Total Expenses</p>
            <ArrowDownRight size={16} className="shrink-0" style={{ color: 'var(--theme-delete-color, #ef4444)' }} />
          </div>
          <div>
            <p className="text-lg sm:text-xl md:text-2xl font-black tracking-tighter break-all" style={{ color: 'var(--theme-delete-color, #ef4444)' }}>{symbol}{stats.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
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
              <h3 className="font-black text-lg text-white tracking-tight uppercase">Financial Performance</h3>
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
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#525252', fontWeight: 'bold' }} tickFormatter={(v) => `${symbol}${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0a0a', borderRadius: '12px', border: '1px solid #1f1f1f', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                  labelStyle={{ color: '#d4af37', fontWeight: 'black', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }}
                  formatter={(value: any) => [`${symbol}${value}`, '']}
                />
                <Area type="monotone" dataKey="profit" stroke="#d4af37" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Transactions List */}
        <div className="flex flex-col space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-white uppercase tracking-widest text-sm">Recent Transactions</h3>
          </div>
          <div className="grid gap-3 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 350px)' }}>
            {transactions.map(t => (
              <TransactionCard 
                key={t.id} 
                transaction={t} 
                bird={birds.find(b => b.id === t.birdId)}
                contact={contacts.find(c => c.id === t.contactId)}
                cages={cages}
                onBirdRef={onBirdRef}
                onEdit={() => onEditTransaction(t)}
                onDelete={() => onDeleteTransaction(t.id)}
                viewMode="list"
                currency={currency}
              />
            ))}
            {transactions.length === 0 && (
              <div className="text-center py-12 bg-black/50 border border-dashed border-black-700 rounded-2xl">
                <Activity size={32} className="mx-auto text-white mb-2" />
                <p className="text-white text-sm font-bold uppercase tracking-widest">No transactions found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EntityStatsView({
  filter,
  birds,
  pairs,
  breedingRecords,
  transactions,
  cages,
  contacts,
  currency,
  onBirdRef,
  onEditBreeding,
  onDeleteBreeding,
  onEditTransaction,
  onDeleteTransaction
}: {
  filter: { birdId?: string, pairId?: string },
  birds: Bird[],
  pairs: Pair[],
  breedingRecords: BreedingRecord[],
  transactions: Transaction[],
  cages: Cage[],
  contacts: Contact[],
  currency?: string,
  onBirdRef: (name: string) => void,
  onEditBreeding: (r: BreedingRecord) => void,
  onDeleteBreeding: (id: string) => void,
  onEditTransaction: (t: Transaction) => void,
  onDeleteTransaction: (id: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'roi' | 'breeding'>('roi');
  const [searchQuery, setSearchQuery] = useState('');
  const symbol = getCurrencySymbol(currency);

  const entityName = useMemo(() => {
    if (filter.birdId) {
      return birds.find(b => b.id === filter.birdId)?.name || 'Unknown Bird';
    }
    if (filter.pairId) {
      const pair = pairs.find(p => p.id === filter.pairId);
      if (pair) {
        const male = birds.find(b => b.id === pair.maleId);
        const female = birds.find(b => b.id === pair.femaleId);
        return `${male?.name || 'Empty'} x ${female?.name || 'Empty'}`;
      }
      return 'Unknown Pair';
    }
    return 'Stats';
  }, [filter, birds, pairs]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (filter.birdId) {
      filtered = filtered.filter(t => t.birdId === filter.birdId);
    }
    if (filter.pairId) {
      filtered = filtered.filter(t => t.pairId === filter.pairId);
    }
    if (searchQuery) {
      filtered = filtered.filter(t => t.category.toLowerCase().includes(searchQuery.toLowerCase()) || t.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered;
  }, [transactions, filter, searchQuery]);

  const filteredBreedingRecords = useMemo(() => {
    let filtered = breedingRecords;
    if (filter.birdId) {
      filtered = filtered.filter(r => {
        const pair = pairs.find(p => p.id === r.pairId);
        return pair?.maleId === filter.birdId || pair?.femaleId === filter.birdId;
      });
    }
    if (filter.pairId) {
      filtered = filtered.filter(r => r.pairId === filter.pairId);
    }
    if (searchQuery) {
      filtered = filtered.filter(r => r.notes?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered;
  }, [breedingRecords, filter, pairs, searchQuery]);

  const stats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
    const expenses = filteredTransactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
    
    const relevantBirds = filter.birdId 
      ? birds.filter(b => b.id === filter.birdId) 
      : filter.pairId 
        ? birds.filter(b => {
            const pair = pairs.find(p => p.id === filter.pairId);
            return b.id === pair?.maleId || b.id === pair?.femaleId;
          })
        : birds;
    const birdValue = relevantBirds.reduce((acc, b) => acc + (b.estimatedValue || 0), 0);
    const birdCost = relevantBirds.reduce((acc, b) => acc + (b.purchasePrice || 0), 0);
    
    const totalEggs = filteredBreedingRecords.reduce((acc, r) => acc + (r.eggsLaid || 0), 0);
    const totalHatched = filteredBreedingRecords.reduce((acc, r) => acc + (r.eggsHatched || 0), 0);
    const totalWeaned = filteredBreedingRecords.reduce((acc, r) => acc + (r.chicksWeaned || 0), 0);
    
    return {
      totalIncome: income,
      totalExpenses: expenses,
      netProfit: income - expenses,
      totalBirdValue: birdValue,
      totalBirdCost: birdCost,
      inventoryValue: birdValue - birdCost,
      totalEggs,
      totalHatched,
      totalWeaned,
      hatchRate: totalEggs > 0 ? (totalHatched / totalEggs) * 100 : 0,
      weanRate: totalHatched > 0 ? (totalWeaned / totalHatched) * 100 : 0
    };
  }, [filteredTransactions, filteredBreedingRecords, birds, filter]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-1 sm:px-0">
      <div className="bg-gold-500/10 border border-gold-500/20 p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gold-500 rounded-lg text-black">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">
              Stats: {entityName}
            </h3>
            <p className="text-[10px] text-gold-500 font-bold uppercase tracking-widest">Showing breeding and financial ROI</p>
          </div>
        </div>
        <Button variant="secondary" className="px-4 py-2 text-[10px]" onClick={() => onBirdRef('')}>Close Stats</Button>
      </div>

      <div className="flex bg-zinc-900 p-1 rounded-2xl border border-black-700 w-fit mx-auto">
        {(['roi', 'breeding'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2.5 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest flex items-center gap-2",
              activeTab === tab ? "bg-gold-500 text-black-950 shadow-lg shadow-gold-500/20" : "text-white/50 hover:text-white"
            )}
          >
            {tab === 'roi' && <DollarSign size={14} />}
            {tab === 'breeding' && <Egg size={14} />}
            {tab === 'roi' ? 'ROI & Finances' : 'Breeding Stats'}
          </button>
        ))}
      </div>

      {activeTab === 'roi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-hidden">
            <Card className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between min-w-0">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest mr-2">Net Profit</p>
                <TrendingUp size={16} className={stats.netProfit >= 0 ? 'text-emerald-400 shrink-0' : 'text-rose-400 shrink-0'} />
              </div>
              <div className="min-w-0">
                <p className="text-lg xl:text-xl font-black text-white tracking-tighter break-all">{symbol}{stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="text-[8px] sm:text-[9px] text-white/50 mt-1 font-bold uppercase tracking-tighter">ROI Performance</p>
              </div>
            </Card>
            <Card className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between min-w-0">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest mr-2">Total Income</p>
                <ArrowUpRight size={16} className="text-emerald-400 shrink-0" />
              </div>
              <div className="min-w-0">
                <p className="text-lg xl:text-xl font-black text-emerald-500 tracking-tighter break-all">{symbol}{stats.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </Card>
            <Card className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between min-w-0">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest mr-2">Total Expenses</p>
                <ArrowDownRight size={16} className="text-rose-400 shrink-0" />
              </div>
              <div className="min-w-0">
                <p className="text-lg xl:text-xl font-black text-rose-500 tracking-tighter break-all">{symbol}{stats.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </Card>
            <Card className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between min-w-0">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest mr-2">Inventory Value</p>
                <Activity size={16} className="text-sky-400 shrink-0" />
              </div>
              <div className="min-w-0">
                <p className="text-lg xl:text-xl font-black text-sky-500 tracking-tighter break-all mb-1">{symbol}{stats.inventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="text-[7px] text-white/40 font-bold uppercase tracking-widest leading-tight">Est. {symbol}{stats.totalBirdValue.toFixed(0)} - Cost {symbol}{stats.totalBirdCost.toFixed(0)}</p>
              </div>
            </Card>
          </div>

          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white uppercase tracking-widest text-sm">Transactions</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                <Input 
                  placeholder="Search transactions..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 py-2 text-xs"
                />
              </div>
            </div>
            <div className="grid gap-3">
              {filteredTransactions.map(t => (
                <TransactionCard 
                  key={t.id} 
                  transaction={t} 
                  bird={birds.find(b => b.id === t.birdId)}
                  contact={contacts.find(c => c.id === t.contactId)}
                  cages={cages}
                  onBirdRef={onBirdRef}
                  onEdit={() => onEditTransaction(t)}
                  onDelete={() => onDeleteTransaction(t.id)}
                  viewMode="list"
                  currency={currency}
                />
              ))}
              {filteredTransactions.length === 0 && (
                <div className="text-center py-12 bg-black/50 border border-dashed border-black-700 rounded-2xl">
                  <Activity size={32} className="mx-auto text-white mb-2" />
                  <p className="text-white text-sm font-bold uppercase tracking-widest">No transactions found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'breeding' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest">Total Eggs</p>
                <Egg size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-white tracking-tight">{stats.totalEggs}</p>
              </div>
            </Card>
            <Card className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest">Total Hatched</p>
                <Egg size={16} className="text-sky-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-sky-400 tracking-tight">{stats.totalHatched}</p>
                <p className="text-[8px] sm:text-[9px] text-white/50 mt-1 font-bold uppercase tracking-tighter">{stats.hatchRate.toFixed(0)}% Hatch Rate</p>
              </div>
            </Card>
            <Card className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest">Total Weaned</p>
                <Egg size={16} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">{stats.totalWeaned}</p>
                <p className="text-[8px] sm:text-[9px] text-white/50 mt-1 font-bold uppercase tracking-tighter">{stats.weanRate.toFixed(0)}% Wean Rate</p>
              </div>
            </Card>
          </div>

          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white uppercase tracking-widest text-sm">Breeding Records</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                <Input 
                  placeholder="Search records..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 py-2 text-xs"
                />
              </div>
            </div>
            <div className="grid gap-3 min-w-0">
              {filteredBreedingRecords.map(r => (
                <BreedingRecordCard 
                  key={r.id}
                  record={r}
                  pair={pairs.find(p => p.id === r.pairId)}
                  male={birds.find(b => b.id === pairs.find(p => p.id === r.pairId)?.maleId)}
                  female={birds.find(b => b.id === pairs.find(p => p.id === r.pairId)?.femaleId)}
                  birds={birds}
                  onEdit={() => onEditBreeding(r)}
                  onDelete={() => onDeleteBreeding(r.id)}
                  onBirdRef={onBirdRef}
                  viewMode="list"
                />
              ))}
              {filteredBreedingRecords.length === 0 && (
                <div className="text-center py-12 bg-black/50 border border-dashed border-black-700 rounded-2xl">
                  <Activity size={32} className="mx-auto text-white mb-2" />
                  <p className="text-white text-sm font-bold uppercase tracking-widest">No breeding records found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionCard({ transaction, bird, contact, cages, currency, onBirdRef, onEdit, onDelete, viewMode = 'list' }: { transaction: Transaction, bird?: Bird, contact?: Contact, cages: Cage[], currency?: string, onBirdRef: (name: string) => void, onEdit: () => void, onDelete: () => void, viewMode?: 'grid-large' | 'list' }) {
  const symbol = getCurrencySymbol(currency);
  return (
    <Card className={cn(
      "p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 group border-black-800 hover:border-gold-500/50 transition-colors relative"
    )}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div 
          className={cn(
            "rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
            "w-10 h-10 sm:w-12 sm:h-12",
            transaction.type === 'Income' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : ""
          )}
          style={transaction.type === 'Expense' ? {
            backgroundColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 90%)',
            color: 'var(--theme-delete-color, #ef4444)',
            borderColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)',
            borderWidth: '1px'
          } : {}}
        >
          {transaction.type === 'Income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 sm:mb-1 flex-wrap">
            <p className="font-black text-white uppercase tracking-wider text-[10px] sm:text-xs truncate">{transaction.category}</p>
            {bird && (
              <div className="w-full mt-1">
                <BirdCompactInfo 
                  bird={bird} 
                  cages={cages} 
                  onClick={() => onBirdRef(bird.name)}
                />
              </div>
            )}
            {contact && (
              <Badge variant="warning" className="text-[7px] sm:text-[8px] bg-secondary/10 text-secondary border-secondary/20">{contact.name}</Badge>
            )}
          </div>
          <p className="text-[10px] sm:text-[11px] text-white truncate font-medium">{transaction.description || 'No description'}</p>
        </div>
        <div className={cn("shrink-0 text-right")}>
                <p 
                  className={cn("font-black tracking-tighter truncate", "text-base sm:text-lg")}
                  style={{ color: transaction.type === 'Income' ? '#10b981' : 'var(--theme-delete-color, #ef4444)' }}
                >
                  {transaction.type === 'Income' ? '+' : '-'}{symbol}{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
          <p className="text-[8px] sm:text-[9px] text-white font-bold uppercase tracking-widest">{transaction.date}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black-800/50">
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white hover:text-secondary rounded-lg transition-all border border-black-700 min-w-0">
          <Edit2 size={14} />
          <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Edit</span>
        </button>
        <button 
          onClick={onDelete} 
          className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg transition-all border min-w-0"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 90%)',
            color: 'var(--theme-delete-color, #ef4444)',
            borderColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)'
          }}
        >
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
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:border-zinc-700">
        {/* Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-gold-500/10 rounded-xl">
               <Egg size={20} className="text-gold-500" />
             </div>
             <div>
                <h3 className="font-black text-white text-base tracking-tight">Breeding Record</h3>
                <div className="flex items-center gap-2 text-[10px] font-medium text-white/50 uppercase tracking-widest">
                  <Calendar size={10} />
                  <span>{record.startDate} - {record.endDate || 'Ongoing'}</span>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 text-white/70 hover:text-secondary hover:bg-zinc-800 rounded-lg transition-colors">
                <Edit2 size={16} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                className="p-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 90%)',
                  color: 'var(--theme-delete-color, #ef4444)'
                }}
              >
                <Trash2 size={16} />
              </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
            {/* Parents */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <div>
                  <p className="text-[9px] text-white/40 uppercase tracking-widest font-black mb-1.5">Sire (Male)</p>
                  {male ? <BirdCompactInfo bird={male} cages={[]} onClick={() => onBirdRef(male.name)} /> : <div className="text-xs text-white/20 italic p-2 bg-black rounded-lg border border-white/5">N/A</div>}
               </div>
               <div>
                  <p className="text-[9px] text-white/40 uppercase tracking-widest font-black mb-1.5">Dam (Female)</p>
                  {female ? <BirdCompactInfo bird={female} cages={[]} onClick={() => onBirdRef(female.name)} /> : <div className="text-xs text-white/20 italic p-2 bg-black rounded-lg border border-white/5">N/A</div>}
               </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 bg-black p-3 rounded-xl border border-zinc-800">
               {[
                 { label: 'Eggs', value: record.eggsLaid },
                 { label: 'Hatch', value: record.eggsHatched },
                 { label: 'Wean', value: record.chicksWeaned }
               ].map(stat => (
                 <div key={stat.label} className="flex flex-col items-center">
                   <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">{stat.label}</span>
                   <span className="text-lg font-black text-white">{stat.value}</span>
                 </div>
               ))}
            </div>

            {/* Egg Log Button */}
            {record.eggs && record.eggs.length > 0 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-colors"
              >
                  <span className="text-xs font-bold text-white">Egg Log ({record.eggs.length})</span>
                  {isExpanded ? <ChevronUp size={16} className="text-white/50" /> : <ChevronDown size={16} className="text-white/50" />}
              </button>
            )}

            {/* Expanded Egg Log */}
            {isExpanded && record.eggs && record.eggs.length > 0 && (
              <div className="space-y-3 pt-2 animate-in slide-in-from-top-2">
                 {record.eggs.map((egg, index) => {
                   const expectedHatchDate = egg.laidDate ? format(addDays(parseISO(egg.laidDate), record.incubationDays || 21), 'yyyy-MM-dd') : null;
                   const ringingDate = egg.actualHatchDate ? format(addDays(parseISO(egg.actualHatchDate), record.ringingDays || 7), 'yyyy-MM-dd') : null;

                   return (
                     <div key={egg.id} className="p-3 bg-black rounded-xl border border-zinc-800 space-y-3">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="text-xs font-mono text-white/50">#{index + 1}</div>
                              <div className="flex flex-col">
                                <span className="text-[8px] text-white/30 uppercase font-black tracking-widest leading-none mb-1">Laid Date</span>
                                <span className="text-[11px] text-white font-bold">{egg.laidDate || 'Unknown'}</span>
                              </div>
                           </div>
                           <Badge 
                             variant={egg.status === 'Hatched' || egg.status === 'Weaned' ? 'success' : (egg.status === 'Laid' || egg.status === 'Fertile' ? 'info' : 'neutral')}
                             className="text-[8px] font-black py-0 px-1.5"
                           >
                             {egg.status}
                           </Badge>
                        </div>

                        {(egg.status === 'Laid' || egg.status === 'Fertile') && expectedHatchDate && (
                          <div className="flex items-center justify-between p-2 bg-gold-500/5 rounded-lg border border-gold-500/10">
                             <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <Egg size={10} className="text-secondary" />
                                  <span className="text-[8px] text-secondary uppercase font-black tracking-widest">Expected Hatch</span>
                                </div>
                                <span className="text-[11px] text-white font-mono ml-4">{expectedHatchDate}</span>
                             </div>
                             <a 
                               href={generateGoogleCalendarUrl(`Egg #${index + 1} Hatching`, expectedHatchDate, `Hatching reminder for Pair: ${male?.name || 'Empty'} x ${female?.name || 'Empty'}`)}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="p-1.5 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded-md transition-colors"
                               title="Add to Google Calendar"
                             >
                               <Bell size={12} />
                             </a>
                          </div>
                        )}

                        {egg.status === 'Hatched' && ringingDate && (
                          <div className="flex items-center justify-between p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                             <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <Activity size={10} className="text-emerald-400" />
                                  <span className="text-[8px] text-emerald-400 uppercase font-black tracking-widest">Ringing Reminder</span>
                                </div>
                                <span className="text-[11px] text-white font-mono ml-4">{ringingDate}</span>
                             </div>
                             <a 
                               href={generateGoogleCalendarUrl(`Egg #${index + 1} Ringing`, ringingDate, `Reminder to ring the bird from Pair: ${male?.name || 'Empty'} x ${female?.name || 'Empty'}`)}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-md transition-colors"
                               title="Add to Google Calendar"
                             >
                               <Bell size={12} />
                             </a>
                          </div>
                        )}
                     </div>
                   );
                 })}
              </div>
            )}
        </div>
    </div>
  );
}

function BreedingRecordForm({ user, initialData, pairs, birds, cages, onClose }: { user: FirebaseUser, initialData?: BreedingRecord, pairs: Pair[], birds: Bird[], cages: Cage[], onClose: () => void }) {
  const [formData, setFormData] = useState<Partial<BreedingRecord>>(initialData || { 
    pairId: '', 
    startDate: format(new Date(), 'yyyy-MM-dd'), 
    endDate: '', 
    eggsLaid: 0, 
    eggsHatched: 0, 
    chicksWeaned: 0, 
    offspringIds: [], 
    notes: '', 
    eggs: [],
    incubationDays: 21,
    ringingDays: 7
  });

  // Ensure incubationDays and ringingDays have defaults if not set in initialData
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        incubationDays: initialData.incubationDays ?? 21,
        ringingDays: initialData.ringingDays ?? 7
      }));
    }
  }, [initialData]);
  const [isSaving, setIsSaving] = useState(false);
  
  const handleAddEgg = () => {
    const currentEggs = formData.eggs || [];
    const laidDate = new Date().toISOString().split('T')[0];
    
    const newEggs = [...currentEggs, {
      id: Math.random().toString(36).substring(7),
      status: 'Laid' as const,
      laidDate: laidDate
    }];
    
    setFormData({
      ...formData,
      eggs: newEggs,
      eggsLaid: newEggs.length,
      eggsHatched: newEggs.filter(e => ['Hatched', 'Died', 'Weaned'].includes(e.status)).length,
      chicksWeaned: newEggs.filter(e => e.status === 'Weaned').length
    });
  };

  const updateEgg = (index: number, updates: Partial<EggType>) => {
    const newEggs = [...(formData.eggs || [])];
    newEggs[index] = { ...newEggs[index], ...updates };
    
    // Auto calculate eggs stats based on statuses if user modifies array
    let laid = formData.eggsLaid || 0;
    let hatched = formData.eggsHatched || 0;
    let weaned = formData.chicksWeaned || 0;
    
    // Check if we want to auto-sync. It might be better to just let user manually override or compute it.
    // For simplicity we will compute it if they add eggs.
    laid = newEggs.length;
    hatched = newEggs.filter(e => ['Hatched', 'Died', 'Weaned'].includes(e.status)).length;
    weaned = newEggs.filter(e => e.status === 'Weaned').length;

    setFormData({ ...formData, eggs: newEggs, eggsLaid: laid, eggsHatched: hatched, chicksWeaned: weaned });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pairId) {
      toast.error('Please select a pair.');
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    
    const processSave = async () => {
      try {
        const eggsArr = formData.eggs || [];
        const data = sanitizeData({ 
          ...formData, 
          ...(initialData?.id ? {} : { uid: user.uid }),
          eggsLaid: eggsArr.length,
          eggsHatched: eggsArr.filter(e => ['Hatched', 'Died', 'Weaned'].includes(e.status)).length,
          chicksWeaned: eggsArr.filter(e => e.status === 'Weaned').length
        });
        
        if (initialData?.id) { 
          await updateDoc(doc(db, 'breedingRecords', initialData.id), data); 
        } 
        else { 
          const docRef = doc(collection(db, 'breedingRecords'));
          await setDoc(docRef, data); 
        }
        toast.success(`Breeding record ${initialData ? 'updated' : 'added'}!`);
        setIsSaving(false);
        onClose();
      } catch (err) { 
        setIsSaving(false);
        handleFirestoreError(err, initialData ? OperationType.UPDATE : OperationType.CREATE, 'breedingRecords'); 
      }
    };

    processSave();
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
            ...pairs.filter(p => p.maleId || p.femaleId).map(p => {
              const male = birds.find(b => b.id === p.maleId);
              const female = birds.find(b => b.id === p.femaleId);
              return { 
                id: p.id, 
                name: `${male?.name || 'Empty'} × ${female?.name || 'Empty'}`,
                details: p.status,
                subText: `${male?.species || ''}${male?.subSpecies ? ` (${male.subSpecies})` : ''}`,
                pair: p
              };
            })
          ]}
          birds={birds}
          cages={cages}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Start Date</label>
          <Input type="date" required value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">End Date</label>
          <Input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Incubation (Days)</label>
          <Input 
            type="number" 
            min="1" 
            value={formData.incubationDays} 
            onChange={e => setFormData({ ...formData, incubationDays: parseInt(e.target.value) || 0 })} 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Ringing Age (Days)</label>
          <Input 
            type="number" 
            min="1" 
            value={formData.ringingDays} 
            onChange={e => setFormData({ ...formData, ringingDays: parseInt(e.target.value) || 0 })} 
          />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 pb-2 border-b border-black-800">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">Laid</label>
          <div className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl flex items-center text-white font-bold text-sm">{formData.eggs?.length || 0}</div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">Hatched</label>
          <div className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl flex items-center text-white font-bold text-sm">{formData.eggs?.filter(e => ['Hatched', 'Died', 'Weaned'].includes(e.status)).length || 0}</div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">Weaned</label>
          <div className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl flex items-center text-white font-bold text-sm">{formData.eggs?.filter(e => e.status === 'Weaned').length || 0}</div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Eggs & Offspring</label>
          <Button type="button" onClick={handleAddEgg} variant="secondary" className="h-6 text-xs px-3 bg-zinc-700 hover:bg-zinc-600 rounded">
            + Add Egg
          </Button>
        </div>
        
        {formData.eggs && formData.eggs.length > 0 && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {formData.eggs.map((egg, index) => ({ egg, originalIndex: index }))
              .sort((a, b) => new Date(b.egg.laidDate || 0).getTime() - new Date(a.egg.laidDate || 0).getTime())
              .map(({ egg, originalIndex: index }) => (
              <div key={egg.id} className="p-3 bg-black border border-black-700 rounded-xl space-y-2">
                <div className="flex justify-between items-center bg-black-900 -mx-3 -mt-3 p-2 rounded-t-xl border-b border-black-800">
                  <span className="text-xs font-black text-white">Egg {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <select 
                      value={egg.status} 
                      onChange={e => updateEgg(index, { status: e.target.value as any })} 
                      className="bg-black border border-black-700 text-xs font-bold uppercase tracking-widest rounded px-2 py-1 text-white focus:outline-none focus:border-gold-500"
                    >
                      <option value="Laid">Laid</option>
                      <option value="Fertile">Fertile</option>
                      <option value="Infertile / Clear">Infertile / Clear</option>
                      <option value="Dead In Shell">Dead In Shell</option>
                      <option value="Hatched">Hatched</option>
                      <option value="Died">Died</option>
                      <option value="Weaned">Weaned</option>
                    </select>
                    <button 
                      type="button" 
                      onClick={() => {
                        const newEggs = [...(formData.eggs || [])];
                        newEggs.splice(index, 1);
                        setFormData({ ...formData, eggs: newEggs, eggsLaid: newEggs.length });
                      }} 
                      className="text-white/30 transition-colors"
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--theme-delete-color, #ef4444)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Laid Date</label>
                    <Input 
                      type="date" 
                      value={egg.laidDate || ''} 
                      onChange={e => updateEgg(index, { laidDate: e.target.value })} 
                      className="h-8 text-xs font-mono" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Hatch Date</label>
                    <Input 
                      type="date" 
                      value={egg.actualHatchDate || ''} 
                      onChange={e => updateEgg(index, { actualHatchDate: e.target.value, status: e.target.value && egg.status === 'Laid' ? 'Hatched' : egg.status })} 
                      className="h-8 text-xs font-mono border-l-2 border-emerald-500/50" 
                    />
                  </div>
                </div>
                
                {(egg.status === 'Hatched' || egg.status === 'Died' || egg.status === 'Weaned') && (
                  <div className="pt-1">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Notes</label>
                      <Input 
                        placeholder="Info..." 
                        value={egg.notes || ''} 
                        onChange={e => updateEgg(index, { notes: e.target.value })} 
                        className="h-8 text-xs" 
                      />
                    </div>
                  </div>
                )}
                
                {egg.status === 'Weaned' && !egg.birdId && (
                  <div className="pt-2 mt-1 border-t border-black-800">
                     <Button type="button" variant="secondary" className="w-full h-8 text-[10px]" onClick={async () => {
                        const loadingToast = toast.loading('Promoting to Bird...');
                        try {
                           const parentPair = pairs.find(p => p.id === formData.pairId);
                           const mother = birds.find(b => b.id === parentPair?.femaleId);
                           const father = birds.find(b => b.id === parentPair?.maleId);
                           
                           const data: any = {
                              name: `Offspring (Egg ${index + 1})`,
                              species: mother?.species || father?.species || 'Unknown',
                              subSpecies: mother?.subSpecies || father?.subSpecies || '',
                              sex: 'Unknown',
                              birthDate: egg.actualHatchDate || new Date().toISOString().split('T')[0],
                              motherId: mother?.id || '',
                              fatherId: father?.id || '',
                              cageId: parentPair?.cageId || mother?.cageId || father?.cageId || '',
                              uid: user.uid,
                              notes: `Promoted from Egg ${index + 1} of Pair ${parentPair?.id || formData.pairId}`
                           };
                           
                           const docRef = doc(collection(db, 'birds'));
                           await setDoc(docRef, data);
                           
                           // Tag offspring
                           const currentOffs = formData.offspringIds || [];
                           updateEgg(index, { birdId: docRef.id });
                           setFormData({ ...formData, offspringIds: [...currentOffs, docRef.id] });
                           
                           toast.success('Successfully promoted to a new Bird profile!');
                        } catch (err) {
                           console.error(err);
                           toast.error('Failed to promote to bird.');
                        } finally {
                           toast.dismiss(loadingToast);
                        }
                     }}>
                        Promote to New Bird Profile
                     </Button>
                  </div>
                )}
                
                {egg.birdId && (
                  <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest text-center py-1 mt-1 bg-emerald-500/10 rounded">
                    Promoted to Bird
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <SearchableSelect 
          label="Tag Existing Offspring"
          options={birds.filter(b => !b.isGhost).map(b => {
            const cage = cages.find(c => c.id === b.cageId);
            const mutationsStr = b.mutations?.length ? `[${b.mutations.join(', ')}]` : '';
            return {
              id: b.id,
              name: b.name,
              details: cage?.name || 'Unassigned',
              subText: `${b.species} ${mutationsStr}`,
              bird: b
            };
          })}
          multi
          selectedValues={formData.offspringIds || []}
          cages={cages}
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
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Clutch Notes</label>
        <textarea name="breedingNotes" id="breedingNotes" className="w-full px-4 py-3 bg-black border border-black-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-white transition-all min-h-[80px] text-sm font-medium placeholder:text-white/30" placeholder="General breeding notes..."
          value={formData.notes} 
          onChange={e => setFormData({ ...formData, notes: e.target.value })} 
        />
      </div>

      <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest font-black" disabled={isSaving}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {(initialData && (initialData as any).id) ? 'Update' : 'Add'} Record
      </Button>
    </form>
  );
}

function TransactionForm({ user, initialData, birds, pairs, cages, contacts, currency, onClose }: { user: FirebaseUser, initialData?: Transaction, birds: Bird[], pairs: Pair[], cages: Cage[], contacts: Contact[], currency?: string, onClose: () => void }) {
  const symbol = getCurrencySymbol(currency);
  const [formData, setFormData] = useState<Partial<Transaction>>(initialData || {
    type: 'Expense',
    category: '',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    birdId: '',
    pairId: '',
    contactId: '',
    description: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    
    const processSave = async () => {
      try {
        const data = { 
          ...formData,
          ...(initialData?.id ? {} : { uid: user.uid })
        };
        if (initialData?.id) { 
          await updateDoc(doc(db, 'transactions', initialData.id), data); 
        } 
        else { 
          const docRef = doc(collection(db, 'transactions'));
          await setDoc(docRef, data); 
        }
        toast.success(`Transaction ${initialData ? 'updated' : 'added'}!`);
        setIsSaving(false);
        onClose();
      } catch (err) { 
        setIsSaving(false);
        handleFirestoreError(err, initialData ? OperationType.UPDATE : OperationType.CREATE, 'transactions'); 
      }
    };

    processSave();
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <SearchableSelect 
            label="Related Bird"
            value={formData.birdId || ''}
            onChange={(val) => setFormData({ ...formData, birdId: val })}
            options={[
              { id: '', name: 'None' },
              ...birds.filter(b => !b.isGhost).map(b => {
                const cage = cages.find(c => c.id === b.cageId);
                const mutationsStr = b.mutations?.length ? `[${b.mutations.join(', ')}]` : '';
                return {
                  id: b.id,
                  name: b.name,
                  details: cage?.name || 'Unassigned',
                  subText: `${b.species} ${mutationsStr}`,
                  bird: b
                };
              })
            ]}
          />
        </div>
        <div className="space-y-2">
          <SearchableSelect 
            label="Related Pair"
            value={formData.pairId || ''}
            onChange={(val) => setFormData({ ...formData, pairId: val })}
            options={[
              { id: '', name: 'None' },
              ...pairs.filter(p => p.maleId || p.femaleId).map(p => {
                const m = birds.find(b => b.id === p.maleId)?.name || 'Empty';
                const f = birds.find(b => b.id === p.femaleId)?.name || 'Empty';
                const species = birds.find(b => b.id === p.maleId)?.species || '';
                return { 
                  id: p.id, 
                  name: `${m} x ${f}`,
                  details: p.status,
                  subText: species
                };
              })
            ]}
          />
        </div>
        <div className="space-y-2">
          <SearchableSelect 
            label="Contact"
            value={formData.contactId || ''}
            onChange={(val) => setFormData({ ...formData, contactId: val })}
            options={[
              { id: '', name: 'None' },
              ...contacts.map(c => ({ id: c.id, name: c.name }))
            ]}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Description</label>
        <Textarea rows={3} placeholder="Additional details..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
      </div>
      <Button type="submit" className="w-full py-4 text-sm font-bold shadow-xl shadow-gold-500/20" disabled={isSaving}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {(initialData && (initialData as any).id) ? 'Update' : 'Add'} Transaction
      </Button>
    </form>
  );
}

function ContactForm({ user, initialData, onClose }: { user: FirebaseUser, initialData?: Contact, onClose: () => void }) {
  const [formData, setFormData] = useState<Partial<Contact>>(initialData || {
    name: '',
    type: 'Both',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    
    const processSave = async () => {
      try {
        const data = { 
          ...formData,
          ...(initialData?.id ? {} : { uid: user.uid })
        };
        if (initialData?.id) { 
          await updateDoc(doc(db, 'contacts', initialData.id), data); 
        } else { 
          const docRef = doc(collection(db, 'contacts'));
          await setDoc(docRef, data); 
        }
        toast.success(`Contact ${initialData ? 'updated' : 'added'}!`);
        setIsSaving(false);
        onClose();
      } catch (err) { 
        setIsSaving(false);
        handleFirestoreError(err, initialData ? OperationType.UPDATE : OperationType.CREATE, 'contacts'); 
      }
    };

    processSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Name</label>
        <Input required placeholder="Contact Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Type</label>
        <Select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
          <option value="Buyer" className="bg-black text-white">Buyer</option>
          <option value="Seller" className="bg-black text-white">Seller</option>
          <option value="Both" className="bg-black text-white">Both</option>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Email</label>
          <Input type="email" placeholder="Email Address" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Phone</label>
          <Input type="tel" placeholder="Phone Number" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Address</label>
        <Input placeholder="Physical Address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Notes</label>
        <Textarea rows={3} placeholder="Additional details..." value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
      </div>
      <Button type="submit" className="w-full py-4 text-sm font-bold shadow-xl shadow-gold-500/20" disabled={isSaving}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {(initialData && (initialData as any).id) ? 'Update' : 'Add'} Contact
      </Button>
    </form>
  );
}

const getGoogleCalendarUrl = (task: Task, birds: Bird[], cages: Cage[]) => {
  const isAllDay = !task.reminderDate && !!task.dueDate;
  const baseDate = task.reminderDate ? new Date(task.reminderDate) : (task.dueDate ? new Date(task.dueDate) : new Date());
  
  const formatDate = (date: Date, allday: boolean) => {
    const iso = date.toISOString();
    if (allday) return iso.split('T')[0].replace(/-/g, '');
    return iso.replace(/-|:|\.\d+/g, '');
  };

  const start = formatDate(baseDate, isAllDay);
  const duration = isAllDay ? 24 * 60 * 60 * 1000 : 15 * 60 * 1000; // Default to 15 min duration
  const end = formatDate(new Date(baseDate.getTime() + duration), isAllDay);
  
  const title = encodeURIComponent(task.title);
  let descriptionText = task.description || '';
  
  if (task.reminderLeadTime) {
    descriptionText += `\n\n🔔 REMINDER REQUESTED: ${task.reminderLeadTime} minutes before.`;
  }

  const taggedBirds = birds.filter(b => task.birdIds?.includes(b.id));
  if (taggedBirds.length > 0) {
    descriptionText += '\n\nTagged Birds:\n' + taggedBirds.map(b => {
      const cage = cages.find(c => c.id === b.cageId);
      let info = `- ${b.name} (${b.species})`;
      if (b.subSpecies) info += ` • ${b.subSpecies}`;
      if (cage) info += ` [Cage: ${cage.name}]`;
      if (b.mutations && b.mutations.length > 0) info += ` Mutations: ${b.mutations.join(', ')}`;
      return info;
    }).join('\n');
  }

  if (task.subTasks && task.subTasks.length > 0) {
    descriptionText += '\n\nSubtasks:\n' + task.subTasks.map(st => {
      let stLine = `${st.completed ? '✅' : '⭕'} ${st.title}`;
      const stBirds = birds.filter(b => st.birdIds?.includes(b.id));
      if (stBirds.length > 0) {
        stLine += ` (@${stBirds.map(b => b.name).join(', ')})`;
      }
      return stLine;
    }).join('\n');
  }
  descriptionText += '\n\n— Generated by Aviary Manager Pro —';
  const encodedDescription = encodeURIComponent(descriptionText);
  
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${encodedDescription}&dates=${start}/${end}`;
};

function TaskCard({ task, birds, cages, onBirdRef, onToggle, onEdit, onDelete, viewMode = 'grid-large' }: { task: Task, birds: Bird[], cages: Cage[], onBirdRef: (name: string) => void, onToggle: () => void, onEdit: () => void, onDelete: () => void, viewMode?: 'grid-large' | 'list' }) {
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
                <Badge 
                  variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'warning' : 'neutral'} 
                  className="text-[8px] uppercase tracking-widest font-black"
                >
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
            <a 
              href={getGoogleCalendarUrl(task, birds, cages)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all border border-blue-500/20"
            >
              <Calendar size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest">Add to Calendar</span>
            </a>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all border"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 90%)',
                color: 'var(--theme-delete-color, #ef4444)',
                borderColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)'
              }}
            >
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

        {effectiveViewMode !== 'list' && (task.description || (task.birdIds && task.birdIds.length > 0)) && (
          <div className="space-y-2 mt-2">
            {task.description && <p className="text-xs sm:text-sm text-white font-medium leading-relaxed line-clamp-2 sm:line-clamp-none">{task.description}</p>}
            
            {task.birdIds && task.birdIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
                {task.birdIds.map(id => {
                  const bird = birds.find(b => b.id === id);
                  if (!bird) return null;
                  return (
                    <BirdCompactInfo 
                      key={id} 
                      bird={bird} 
                      cages={cages} 
                      onClick={() => onBirdRef(bird.name)}
                      className="min-w-[120px]"
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

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
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {sub.birdIds.map(id => {
                          const bird = birds.find(b => b.id === id);
                          if (!bird) return null;
                          return (
                            <BirdCompactInfo 
                              key={id} 
                              bird={bird} 
                              cages={cages} 
                              onClick={() => onBirdRef(bird.name)}
                              className="w-auto min-w-[140px]"
                            />
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
            <a 
              href={getGoogleCalendarUrl(task, birds, cages)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all border border-blue-500/20 min-w-0"
            >
              <Calendar size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Add to Calendar</span>
            </a>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-lg transition-all border min-w-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 90%)',
                color: 'var(--theme-delete-color, #ef4444)',
                borderColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)'
              }}
            >
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

function SubscriptionView({ settings, onRenew, onBack }: { settings: UserSettings, onRenew: () => void, onBack: () => void }) {
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
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-3 bg-zinc-800 border border-black-700 rounded-xl text-white hover:bg-zinc-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-black uppercase tracking-widest text-gold-500">Subscription Center</h2>
      </div>
      
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

function ThemeColorPicker({ label, color, defaultColor, onChange }: { label: string, color: string | undefined, defaultColor: string, onChange: (color: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localColor, setLocalColor] = useState(color || defaultColor);

  useEffect(() => {
    if (!isOpen) {
      setLocalColor(color || defaultColor);
    }
  }, [color, defaultColor, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    
    let targetVar = '';
    if (label === 'Accent Color') targetVar = '--theme-color-500';
    else if (label === 'Text Color') targetVar = '--theme-text-color';
    else if (label === 'Background Color') targetVar = '--theme-bg-color';
    else if (label === 'Card Color') targetVar = '--theme-card-color';
    else if (label === 'Male Color') targetVar = '--theme-male-color';
    else if (label === 'Female Color') targetVar = '--theme-female-color';
    else if (label === 'Delete Color') targetVar = '--theme-delete-color';
    else if (label === 'Alt Accent Color') targetVar = '--theme-secondary-color';

    if (targetVar) {
      if (label === 'Accent Color') {
        const palette = generateColorPalette(localColor);
        Object.entries(palette).forEach(([shade, c]) => {
          document.documentElement.style.setProperty(`--theme-color-${shade}`, c);
        });
      } else {
        document.documentElement.style.setProperty(targetVar, localColor);
      }
    }
  }, [localColor, isOpen, label]);

  const handleClose = () => {
    let targetVar = '';
    if (label === 'Accent Color') targetVar = '--theme-color-500';
    else if (label === 'Text Color') targetVar = '--theme-text-color';
    else if (label === 'Background Color') targetVar = '--theme-bg-color';
    else if (label === 'Card Color') targetVar = '--theme-card-color';
    else if (label === 'Male Color') targetVar = '--theme-male-color';
    else if (label === 'Female Color') targetVar = '--theme-female-color';
    else if (label === 'Delete Color') targetVar = '--theme-delete-color';
    else if (label === 'Alt Accent Color') targetVar = '--theme-secondary-color';

    if (targetVar) {
      const origColor = color || defaultColor;
      if (label === 'Accent Color') {
        const palette = generateColorPalette(origColor);
        Object.entries(palette).forEach(([shade, c]) => {
          document.documentElement.style.setProperty(`--theme-color-${shade}`, c);
        });
      } else {
        document.documentElement.style.setProperty(targetVar, origColor);
      }
    }
    setIsOpen(false);
  };

  const handleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(localColor);
    setIsOpen(false);
  };

  const hsva = hexToHsva(localColor);

  return (
    <div className="flex flex-col gap-2 w-full">
      <div 
        className="flex items-center gap-3 bg-black-900 border border-black-800 rounded-2xl p-2 cursor-pointer touch-manipulation hover:bg-black-800 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div 
          className="w-10 h-10 rounded border border-black-800 flex-shrink-0 relative overflow-hidden" 
        >
          <div className="absolute inset-0" style={{ backgroundColor: color || defaultColor }} />
        </div>
        <div className="flex flex-col flex-1">
          <span className="text-sm font-bold text-white uppercase">{color || defaultColor}</span>
          <span className="text-[10px] text-black-400 font-bold uppercase tracking-widest">{label}</span>
        </div>
        {(color && color !== defaultColor) && (
          <button 
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="ml-auto text-[10px] bg-black-800 hover:bg-black-700 text-white px-2 py-1 rounded-lg transition-colors uppercase font-bold"
          >
            Reset
          </button>
        )}
      </div>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl" onClick={(e) => { e.stopPropagation(); handleClose(); }}>
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="w-full max-w-sm bg-black-950 border border-black-700 rounded-[2.5rem] overflow-hidden shadow-2xl relative"
                 onClick={(e) => e.stopPropagation()}
               >
                  <div className="p-6 border-b border-black-700 flex items-center justify-between">
                    <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                      <Palette size={20} style={{color: localColor}} />
                      Pick Color
                    </h3>
                    <button onClick={handleClose} className="p-2 hover:bg-black/20 rounded-xl text-white/50 hover:text-gold-500 transition-all">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="p-6 flex flex-col items-center gap-8">
                    <div className="touch-none select-none flex justify-center">
                      <ColorWheel
                        color={hsva}
                        onChange={(c) => {
                          const newHsva = { ...c.hsva, v: hsva.v };
                          setLocalColor(hsvaToHex(newHsva));
                        }}
                        width={240}
                        height={240}
                      />
                    </div>
                    
                    <div className="w-full space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-black text-black-200 uppercase tracking-widest">
                        <span>Brightness</span>
                        <span className="text-gold-500">{Math.round(hsva.v)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={hsva.v} 
                        onChange={(e) => {
                          const newHsva = { ...hsva, v: Number(e.target.value) };
                          setLocalColor(hsvaToHex(newHsva));
                        }} 
                        className="w-full h-2 bg-black-800 rounded-lg appearance-none cursor-pointer accent-gold-500"
                        style={{
                          WebkitAppearance: 'none',
                          background: `linear-gradient(to right, #000, ${hsvaToHex({...hsva, v: 100})})`
                        }}
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-black/40 border-t border-black-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-black-700" style={{backgroundColor: localColor}} />
                      <span className="font-mono text-sm tracking-widest text-white">{localColor}</span>
                    </div>
                    <Button onClick={handleDone} variant="primary" className="py-2 px-6 bg-[#24D408] hover:bg-[#1cae06] text-black">
                      DONE
                    </Button>
                  </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

// --- Settings View ---

function SettingsView({ settings, onUpdate, allData, user, isSyncing, setDeleteConfirmation, allSharedItems, setAllSharedItems }: { settings: UserSettings, onUpdate: (s: UserSettings) => void, allData: any, user: FirebaseUser | null, isSyncing: boolean, setDeleteConfirmation: (data: any) => void, allSharedItems: SharedItem[], setAllSharedItems: React.Dispatch<React.SetStateAction<SharedItem[]>> }) {
  const [activeSection, setActiveSection] = useState<'general' | 'species' | 'subspecies' | 'mutations' | 'statuses' | 'data' | null>('general');
  const [newSpecies, setNewSpecies] = useState('');
  const [newMutation, setNewMutation] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newSubSpecies, setNewSubSpecies] = useState('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState('');
  const [editingItem, setEditingItem] = useState<{ type: 'species' | 'subspecies' | 'mutation' | 'status', id: string, name: string } | null>(null);

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

  const addStatus = () => {
    if (!newStatus.trim()) return;
    onUpdate({ ...settings, statuses: [...(settings.statuses || []), { id: crypto.randomUUID(), name: newStatus.trim() }] });
    setNewStatus('');
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
    } else if (editingItem.type === 'status') {
      newSettings.statuses = newSettings.statuses?.map(s => s.id === editingItem.id ? { ...s, name: editingItem.name.trim() } : s) || [];
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

  const removeStatus = (id: string, name: string) => {
    setDeleteConfirmation({
      title: 'Delete Status',
      message: `Are you sure you want to delete status "${name}"?`,
      onConfirm: () => {
        onUpdate({ ...settings, statuses: settings.statuses?.filter(s => s.id !== id) || [] });
        toast.success('Status removed');
      }
    });
  };

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
          icon={Tag} 
          title="Statuses" 
          description="Manage Statuses" 
          active={activeSection === 'statuses'} 
          onClick={() => setActiveSection('statuses')} 
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <ThemeColorPicker 
                    label="Accent Color"
                    color={settings.themeColor} 
                    defaultColor="#d4af37"
                    onChange={(hex) => onUpdate({ ...settings, themeColor: hex })}
                  />
                  <ThemeColorPicker 
                    label="Text Color"
                    color={settings.textColor} 
                    defaultColor="#ffffff"
                    onChange={(hex) => onUpdate({ ...settings, textColor: hex })}
                  />
                  <ThemeColorPicker 
                    label="Background Color"
                    color={settings.backgroundColor} 
                    defaultColor="#000000"
                    onChange={(hex) => onUpdate({ ...settings, backgroundColor: hex })}
                  />
                  <ThemeColorPicker 
                    label="Card Color"
                    color={settings.cardColor} 
                    defaultColor="#0a0a0a"
                    onChange={(hex) => onUpdate({ ...settings, cardColor: hex })}
                  />
                  <ThemeColorPicker 
                    label="Male Color"
                    color={settings.maleColor} 
                    defaultColor="#3b82f6"
                    onChange={(hex) => onUpdate({ ...settings, maleColor: hex })}
                  />
                  <ThemeColorPicker 
                    label="Female Color"
                    color={settings.femaleColor} 
                    defaultColor="#e11d48"
                    onChange={(hex) => onUpdate({ ...settings, femaleColor: hex })}
                  />
                  <ThemeColorPicker 
                    label="Delete Color"
                    color={settings.deleteColor} 
                    defaultColor="#ef4444"
                    onChange={(hex) => onUpdate({ ...settings, deleteColor: hex })}
                  />
                  <ThemeColorPicker 
                    label="Alt Accent Color"
                    color={settings.secondaryColor} 
                    defaultColor="#d4af37"
                    onChange={(hex) => onUpdate({ ...settings, secondaryColor: hex })}
                  />
                </div>

                <div className="pt-4 border-t border-black-800">
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
                  <h3 className="text-lg font-black uppercase tracking-widest text-secondary">Manage Species</h3>
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
                          className="text-secondary hover:text-white p-2 bg-zinc-800 hover:bg-secondary rounded-xl transition-all border border-secondary/20"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => removeSpecies(s.id, s.name)} 
                          className="p-2 rounded-xl transition-all"
                          style={{
                            backgroundColor: `color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 90%)`,
                            color: 'var(--theme-delete-color, #ef4444)',
                            borderColor: `color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)`,
                            borderWidth: '1px'
                          }}
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
                                <button onClick={() => setEditingItem({ type: 'subspecies', id: ss.id, name: ss.name })} className="text-black-200 hover:text-secondary p-1.5 bg-zinc-800 rounded-lg transition-all"><Edit2 size={14} /></button>
                                <button 
                                  onClick={() => removeSubSpecies(ss.id, ss.name)} 
                                  className="p-1.5 rounded-lg transition-all"
                                  style={{
                                    backgroundColor: `color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 90%)`,
                                    color: 'var(--theme-delete-color, #ef4444)',
                                    borderColor: `color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)`,
                                    borderWidth: '1px'
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
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
                        <button onClick={() => setEditingItem({ type: 'mutation', id: m.id, name: m.name })} className="text-black-200 hover:text-secondary p-1.5 bg-zinc-800 rounded-lg transition-all"><Edit2 size={14} /></button>
                        <button 
                          onClick={() => removeMutation(m.id, m.name)} 
                          className="p-1.5 rounded-lg transition-all"
                          style={{
                            backgroundColor: `color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 90%)`,
                            color: 'var(--theme-delete-color, #ef4444)',
                            borderColor: `color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)`,
                            borderWidth: '1px'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'statuses' && (
            <motion.div 
              key="statuses"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase tracking-widest text-gold-500">Manage Statuses</h3>
                  <Badge variant="info">{settings.statuses?.length || 0} Total</Badge>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="New status name..." value={newStatus} onChange={e => setNewStatus(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStatus()} />
                  <Button onClick={addStatus} variant="secondary" className="px-4"><Plus size={18} /></Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {settings.statuses?.map(s => (
                    <div key={s.id} className="p-3 bg-black border border-black-700 rounded-xl flex items-center justify-between group">
                      <span className="text-sm font-bold text-white">{s.name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingItem({ type: 'status', id: s.id, name: s.name })} className="text-black-200 hover:text-secondary p-1.5 bg-zinc-800 rounded-lg transition-all"><Edit2 size={14} /></button>
                        <button 
                          onClick={() => removeStatus(s.id, s.name)} 
                          className="p-1.5 rounded-lg transition-all"
                          style={{
                            backgroundColor: `color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 90%)`,
                            color: 'var(--theme-delete-color, #ef4444)',
                            borderColor: `color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)`,
                            borderWidth: '1px'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
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

                <div className="space-y-4 pt-8 border-t border-black-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black uppercase tracking-widest text-gold-500">Shared Items History</h3>
                    <Badge variant="info" className="bg-black border-black-700">{allSharedItems.length} Records</Badge>
                  </div>
                  <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest leading-relaxed">
                    Access history of items you've shared or transferred. You can re-open their link to import them again.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {allSharedItems.length > 0 ? (
                      allSharedItems.map(item => {
                        let itemName = 'Unknown Item';
                        try {
                          const itemData = JSON.parse(item.data);
                          itemName = itemData.name || itemData.id || 'Unnamed';
                        } catch (e) {}

                        return (
                          <div key={item.id} className="p-4 bg-black border border-black-800 rounded-2xl flex items-center justify-between group hover:border-gold-500/30 transition-all">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "p-3 rounded-xl border shrink-0",
                                item.action === 'transfer' 
                                  ? "bg-gold-500/10 border-gold-500/20 text-gold-500" 
                                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              )}>
                                {item.action === 'transfer' ? <ArrowRightLeft size={20} /> : <Share2 size={20} />}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-black text-white uppercase tracking-widest truncate">{itemName}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-white/40">{item.type}</span>
                                  <span className="w-1 h-1 rounded-full bg-black-700" />
                                  <span className="text-[9px] font-black uppercase tracking-wider text-white/40">{new Date(item.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  const url = `${window.location.origin}?${item.action === 'transfer' ? 'transferId' : 'shareId'}=${item.id}`;
                                  window.open(url, '_blank');
                                }}
                                className="p-2.5 bg-zinc-800 text-white/50 hover:text-white rounded-xl transition-all border border-black-700 hover:border-black-600"
                                title="Open Link"
                              >
                                <ExternalLink size={16} />
                              </button>
                              <button 
                                onClick={() => {
                                  setDeleteConfirmation({
                                    title: 'Remove Shared Item',
                                    message: 'Are you sure you want to remove this shared record? The link will no longer work.',
                                    onConfirm: async () => {
                                      try {
                                        await deleteDoc(doc(db, 'shared_items', item.id));
                                        toast.success('Shared item removed.');
                                      } catch (err) {
                                        handleFirestoreError(err, OperationType.DELETE, 'shared_items');
                                      }
                                    }
                                  });
                                }}
                                className="p-2.5 bg-rose-500/5 text-rose-500/50 hover:text-rose-500 rounded-xl transition-all border border-rose-500/10 hover:border-rose-500/30"
                                title="Delete Record"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 border-2 border-dashed border-black-800 rounded-3xl flex flex-col items-center justify-center text-center px-6">
                        <div className="p-4 bg-black-900 rounded-full text-white/10 mb-4">
                          <HistoryIcon size={32} />
                        </div>
                        <p className="text-xs font-black text-white/30 uppercase tracking-widest">No shared items found</p>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-tighter mt-1 max-w-[200px]">Items you share or transfer will appear here for history.</p>
                      </div>
                    )}
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

function PrintView({ birds, pairs, cages, onBirdRef }: { birds: Bird[], pairs: Pair[], cages: Cage[], onBirdRef: (name: string) => void }) {
  const [printMode, setPrintMode] = useState<'list' | 'qr' | 'certificate'>('list');
  const [printLayout, setPrintLayout] = useState<'vertical' | 'horizontal'>('vertical');
  const [printEmpty, setPrintEmpty] = useState(false);
  const [qrType, setQrType] = useState<'bird' | 'pair' | 'cage'>('bird');
  const [qrSelections, setQrSelections] = useState<string[]>([]);
  
  // Custom QR scaling
  const [qrWidth, setQrWidth] = useState(50); // mm
  const [qrHeight, setQrHeight] = useState(50); // mm
  const [isThermal, setIsThermal] = useState(false);

  const sortedBirds = useMemo(() => {
    return [...birds].sort((a, b) => {
      const cageA = cages.find(c => c.id === a.cageId)?.name || 'ZZZ';
      const cageB = cages.find(c => c.id === b.cageId)?.name || 'ZZZ';
      if (cageA !== cageB) return cageA.localeCompare(cageB, undefined, { numeric: true, sensitivity: 'base' });
      const sexOrder: Record<string, number> = { 'Male': 0, 'Female': 1, 'Unknown': 2 };
      const sexDiff = (sexOrder[a.sex] ?? 2) - (sexOrder[b.sex] ?? 2);
      if (sexDiff !== 0) return sexDiff;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [birds, cages]);

  const sortedCages = useMemo(() => {
    return [...cages].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }, [cages]);

  const birdOptions = birds.filter(b => !b.isGhost).map(b => {
    const cage = cages.find(c => c.id === b.cageId);
    return { 
      id: b.id, 
      name: b.name, 
      details: `${b.species}${b.subSpecies ? ` • ${b.subSpecies}` : ''}${cage ? ` - Cage: ${cage.name}` : ''}`, 
      bird: b 
    };
  });

  const pairOptions = pairs.filter(p => p.maleId || p.femaleId).map(p => {
    const male = birds.find(b => b.id === p.maleId);
    const female = birds.find(b => b.id === p.femaleId);
    const mName = male?.name || 'Empty';
    const fName = female?.name || 'Empty';
    const cageId = male?.cageId || female?.cageId;
    const cage = cages.find(c => c.id === cageId);
    
    const maleInfo = male ? `${male.species}${male.subSpecies ? ` (${male.subSpecies})` : ''} ${male.mutations?.join(', ')}${male.splitMutations?.length ? ` / ${male.splitMutations.join(', ')}` : ''}` : 'Empty Male';
    const femaleInfo = female ? `${female.species}${female.subSpecies ? ` (${female.subSpecies})` : ''} ${female.mutations?.join(', ')}${female.splitMutations?.length ? ` / ${female.splitMutations.join(', ')}` : ''}` : 'Empty Female';

    return { 
      id: p.id, 
      name: `Pair: ${mName} x ${fName}`, 
      details: `M: ${maleInfo} | F: ${femaleInfo}${cage ? ` - Cage: ${cage.name}` : ''}`,
      pair: p
    };
  });

  const cageOptions = cages.map(c => ({ 
    id: c.id, 
    name: c.name, 
    details: c.location || 'No location',
    cage: c
  }));

  const handlePrint = () => {
    window.print();
  };

  const getQRData = (id: string) => {
     return JSON.stringify({ t: qrType === 'bird' ? 'b' : qrType === 'pair' ? 'p' : 'c', id });
  };

  const toggleSelection = (id: string) => setQrSelections(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);

  const currentOptions = qrType === 'bird' ? birdOptions : qrType === 'pair' ? pairOptions : cageOptions;

  return (
    <div className="w-full px-4 md:px-8 space-y-12 pb-24">
      <style>{`
        @media print {
          @page { 
            size: ${isThermal && printMode === 'qr' ? `${qrWidth}mm ${qrHeight}mm` : (printMode === 'certificate' || printMode === 'list') && printLayout === 'horizontal' ? 'A4 landscape' : 'A4 portrait'}; 
            margin: 0 !important;
          }
          body { -webkit-print-color-adjust: exact; background: #fff !important; margin: 0; padding: 0; }
          body * { visibility: hidden; }
          #print-area-portal, #print-area-portal * { visibility: visible !important; }
          #print-area-portal {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: ${isThermal && printMode === 'qr' ? `${qrWidth}mm` : '100%'} !important;
            min-height: 100vh !important;
            background: white !important; 
            color: black !important;
            margin: 0 !important;
            padding: ${printMode === 'list' || printMode === 'certificate' ? '8mm' : '0'} !important;
            z-index: 999999 !important;
            box-sizing: border-box !important;
          }
          #print-area-portal * { visibility: visible !important; color: black !important; border-color: #000 !important; }
          .no-print { display: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; table-layout: auto !important; font-size: 9pt !important; color: black !important; }
          th, td { border: 1px solid #000 !important; padding: 6px 4px !important; word-break: break-all !important; height: auto !important; color: black !important; }
          th { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; color: black !important; }
          .qr-print-container { 
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important;
            gap: ${isThermal ? '0' : '2mm'} !important;
            width: 100% !important;
            justify-content: flex-start !important;
            align-items: flex-start !important;
          }
          .qr-print-item {
            width: ${qrWidth}mm !important;
            height: ${qrHeight}mm !important;
            min-height: ${qrHeight}mm !important;
            border: ${isThermal ? 'none' : '2px solid black'} !important;
            display: flex !important;
            flex-direction: ${qrWidth > qrHeight ? 'row' : 'column'} !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 2mm !important;
            page-break-inside: avoid !important;
            page-break-after: ${isThermal ? 'always' : 'auto'} !important;
            background: white !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
      
      {/* Dynamic Header with Print Mode Switch */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-black-800">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Print Center</h1>
          <p className="text-black-100 text-xs font-bold uppercase tracking-widest mt-1">Configure your physical records & labels</p>
        </div>
        <div className="flex bg-black-900 border border-black-800 p-1 rounded-2xl w-full lg:w-[450px]">
          <button 
            className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", printMode === 'list' ? "bg-gold-500 text-black shadow-lg" : "text-black-100 hover:text-white")} 
            onClick={() => setPrintMode('list')}
          >
            Data Sheets
          </button>
          <button 
            className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", printMode === 'qr' ? "bg-gold-500 text-black shadow-lg" : "text-black-100 hover:text-white")} 
            onClick={() => setPrintMode('qr')}
          >
            QR Labels
          </button>
          <button 
            className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", printMode === 'certificate' ? "bg-gold-500 text-black shadow-lg" : "text-black-100 hover:text-white")} 
            onClick={() => setPrintMode('certificate')}
          >
            Certificates
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
        {/* Left Column: Configuration */}
        <div className="xl:col-span-5 space-y-8">
          <section className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gold-500 uppercase tracking-widest ml-1">Entity Selection Type</label>
              <div className="flex bg-black p-1.5 rounded-2xl border border-black-800 shadow-xl">
                <button onClick={() => { setQrType('bird'); setQrSelections([]); }} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest", qrType === 'bird' ? "bg-zinc-800 text-white border border-white/5" : "text-black-100 hover:text-white")}>Birds</button>
                <button onClick={() => { setQrType('pair'); setQrSelections([]); }} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest", qrType === 'pair' ? "bg-zinc-800 text-white border border-white/5" : "text-black-100 hover:text-white")}>Pairs</button>
                <button onClick={() => { setQrType('cage'); setQrSelections([]); }} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest", qrType === 'cage' ? "bg-zinc-800 text-white border border-white/5" : "text-black-100 hover:text-white")}>Cages</button>
              </div>
            </div>

            <SearchableSelect 
              label={`Bulk Select ${qrType}s`}
              options={currentOptions}
              multi
              selectedValues={qrSelections}
              onChange={(val) => toggleSelection(val)}
              placeholder={`Search ${qrType}s...`}
              cages={cages}
              birds={birds}
            />

            {(printMode === 'certificate' || printMode === 'list') && (
              <div className="p-4 bg-zinc-900/30 border border-black-800 rounded-2xl flex items-center justify-between">
                <span className="text-[10px] font-black text-gold-500 uppercase tracking-widest">Page Layout</span>
                <div className="flex bg-black p-1 rounded-lg border border-black-800">
                  <button onClick={() => setPrintLayout('vertical')} className={cn("px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all tracking-widest", printLayout === 'vertical' ? "bg-zinc-800 text-white border border-white/5" : "text-black-100 hover:text-white")}>Vertical</button>
                  <button onClick={() => setPrintLayout('horizontal')} className={cn("px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all tracking-widest", printLayout === 'horizontal' ? "bg-zinc-800 text-white border border-white/5" : "text-black-100 hover:text-white")}>Horizontal</button>
                </div>
              </div>
            )}

            {printMode === 'qr' && (
              <div className="space-y-4 p-4 bg-zinc-900/30 border border-black-800 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gold-500 uppercase tracking-widest">QR Dimensions (mm)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/50 uppercase font-black">Thermal Mode</span>
                    <button 
                      onClick={() => setIsThermal(!isThermal)}
                      className={cn("w-10 h-5 rounded-full transition-all relative border border-white/10", isThermal ? "bg-gold-500" : "bg-black-900")}
                    >
                      <div className={cn("absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all bg-white shadow-sm", isThermal ? "right-1" : "left-1")} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-bold text-white/40 uppercase">Width</label>
                    <div className="flex items-center bg-black border border-white/5 rounded-lg overflow-hidden">
                      <input 
                        type="number" 
                        value={qrWidth} 
                        onChange={(e) => setQrWidth(Number(e.target.value))}
                        className="w-full bg-transparent p-2 text-xs text-white font-mono focus:outline-none"
                      />
                      <span className="px-2 text-[8px] font-black text-white/20">MM</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-bold text-white/40 uppercase">Height</label>
                    <div className="flex items-center bg-black border border-white/5 rounded-lg overflow-hidden">
                      <input 
                        type="number" 
                        value={qrHeight} 
                        onChange={(e) => setQrHeight(Number(e.target.value))}
                        className="w-full bg-transparent p-2 text-xs text-white font-mono focus:outline-none"
                      />
                      <span className="px-2 text-[8px] font-black text-white/20">MM</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {printMode === 'list' && (
              <div className="p-4 bg-zinc-900/30 border border-black-800 rounded-2xl flex items-center justify-between group">
                <div className="space-y-0.5">
                  <p className="text-white font-black uppercase text-[10px] tracking-widest">Blank Template Mode</p>
                  <p className="text-black-300 text-[9px] uppercase font-bold tracking-tight">Print empty records for hand logs</p>
                </div>
                <button 
                  onClick={() => setPrintEmpty(!printEmpty)}
                  className={cn("w-12 h-6 rounded-full transition-all relative border border-white/10", printEmpty ? "bg-gold-500" : "bg-black-900")}
                >
                  <div className={cn("absolute top-1 w-4 h-4 rounded-full transition-all bg-white shadow-sm", printEmpty ? "right-1" : "left-1")} />
                </button>
              </div>
            )}
          </section>

          <Button onClick={handlePrint} disabled={!printEmpty && qrSelections.length === 0} className="w-full py-6 text-base font-black uppercase border-b-4 border-gold-600 shadow-gold-500/10 shadow-2xl h-auto">
            {printMode === 'qr' ? <QrCode size={20} /> : <Printer size={20} />}
            Generate {printEmpty ? 'Blank Template' : `${qrSelections.length} Records`}
          </Button>
        </div>

        {/* Right Column: Preview / Selection List */}
        <div className="xl:col-span-7 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <CheckSquare size={14} className="text-gold-500" />
              Active Selection ({qrSelections.length})
            </h4>
            {qrSelections.length > 0 && (
              <button 
                onClick={() => setQrSelections([])} 
                className="text-[10px] font-black uppercase tracking-widest hover:bg-opacity-10 px-3 py-1.5 rounded-lg transition-colors border"
                style={{
                  color: 'var(--theme-delete-color, #ef4444)',
                  backgroundColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 95%)',
                  borderColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)'
                }}
              >
                Clear All
              </button>
            )}
          </div>

          <div className="bg-black/20 border border-black-800 rounded-2xl min-h-[400px]">
            {qrSelections.length === 0 && !printEmpty ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Search size={48} className="mb-4 text-black-400" />
                <p className="text-xs font-black uppercase tracking-[0.2em]">Select items from the list to preview</p>
              </div>
            ) : printEmpty ? (
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-gold-500/10 border border-gold-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Printer size={32} className="text-gold-500" />
                </div>
                <div className="space-y-2">
                   <p className="text-lg font-black text-white uppercase tracking-widest underline decoration-gold-500 underline-offset-8">Observation Sheet</p>
                   <p className="text-[10px] text-black-100 font-bold uppercase max-w-sm mx-auto leading-relaxed">System will generate a high-fidelity blank table formatted for manual entry and pen-and-paper tracking.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 p-6">
                {qrSelections.map(id => {
                  const opt = currentOptions.find(o => o.id === id);
                  return (
                    <div key={id} className="relative group">
                      <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => toggleSelection(id)} 
                          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-lg backdrop-blur-sm border"
                          style={{
                            backgroundColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)',
                            color: 'var(--theme-delete-color, #ef4444)',
                            borderColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 70%)'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      {opt && 'bird' in opt && opt.bird ? (
                        <BirdCompactInfo bird={opt.bird as Bird} cages={cages} className="bg-zinc-900/40 border-black-700 hover:border-secondary/30 shadow-xl" />
                      ) : opt && 'pair' in opt && opt.pair ? (
                        <PairCompactInfo pair={opt.pair as Pair} birds={birds} cages={cages} className="bg-zinc-900/40 border-black-700 hover:border-gold-500/30 shadow-xl" />
                      ) : opt && 'cage' in opt && opt.cage ? (
                        <div className="flex flex-col gap-0.5 p-4 bg-zinc-900/40 rounded-2xl border border-black-700 hover:border-gold-500/30 transition-all shadow-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gold-500/10 text-gold-500 border border-gold-500/20 flex items-center justify-center">
                              <Home size={16} />
                            </div>
                            <span className="font-black text-white uppercase text-sm tracking-tight">{opt.name}</span>
                          </div>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1 ml-11">{opt.details}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-4 bg-zinc-900/40 rounded-2xl border border-black-700 hover:border-gold-500/30 transition-all group shadow-xl">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white font-black uppercase tracking-tight truncate">{opt?.name || id}</p>
                            {opt?.details && <p className="text-[9px] text-zinc-500 font-bold truncate mt-0.5">{opt.details}</p>}
                          </div>
                          <button 
                            onClick={() => toggleSelection(id)} 
                            className="ml-4 w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-lg"
                            style={{
                              backgroundColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 90%)',
                              color: 'var(--theme-delete-color, #ef4444)'
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Print Area */}
      {createPortal(
        <div id="print-area-portal" className="bg-white text-black p-10 font-sans fixed -left-[9999px] -top-[9999px] opacity-0 pointer-events-none print:static print:opacity-100">
          {printMode === 'certificate' ? (
            <div className={cn("flex", printLayout === 'horizontal' ? "flex-row flex-wrap gap-4" : "flex-col")}>
              {birds.filter(b => qrSelections.includes(b.id)).map(bird => (
                <div key={bird.id} className={cn(
                  "border-8 border-double border-gray-300 p-8 flex flex-col relative page-break-after-always",
                  printLayout === 'horizontal' ? "w-[27cm] h-[19cm] min-h-[19cm]" : "w-full min-h-[27cm]"
                )}>
                  <div className="absolute inset-0 bg-white opacity-50 pointer-events-none" />
                  <div className="relative z-10 flex flex-col h-full items-center text-center">
                    <h1 className="text-4xl font-serif font-bold uppercase tracking-widest text-gray-900 border-b-2 border-gray-400 pb-6 mb-8 w-full">Pedigree Certificate</h1>
                    
                    <div className="w-full flex justify-between items-start mb-12 text-left">
                      <div className="space-y-4">
                         <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Bird Name / Ring No.</p>
                            <p className="text-2xl font-black">{bird.name}</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Species</p>
                            <p className="text-lg font-bold">{bird.species} {bird.subSpecies}</p>
                         </div>
                      </div>
                      <div className="text-right space-y-4">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Hatch Date</p>
                            <p className="text-lg">{bird.birthDate || 'Unknown'}</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sex</p>
                            <p className="text-lg">{bird.sex}</p>
                         </div>
                      </div>
                    </div>

                    <div className="w-full space-y-4 text-left border-t border-b border-gray-300 py-6 mb-12">
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Mutations & Genetics</p>
                      <p className="text-xl">{bird.mutations?.join(' • ') || 'Normal / Wild Type'} {bird.splitMutations?.length ? ` split for ${bird.splitMutations.join(', ')}` : ''}</p>
                    </div>

                    <div className="flex-1 w-full flex flex-col justify-center">
                      <div className="grid grid-cols-3 gap-8 h-[12cm]">
                        {/* Selected Bird */}
                        <div className="col-span-1 border-r border-gray-300 flex flex-col justify-center pr-8 h-full">
                           <div className="p-4 border border-gray-400 rounded-lg bg-gray-50">
                             <p className="text-[10px] uppercase font-bold text-gray-500 mb-2">Subject</p>
                             <p className="font-black text-lg">{bird.name}</p>
                           </div>
                        </div>

                        {/* Parents */}
                        <div className="col-span-1 border-r border-gray-300 flex flex-col justify-around pr-8 h-full">
                           <div className="p-4 border border-gray-400 rounded-lg">
                             <p className="text-[10px] uppercase font-bold text-gray-500 mb-2">Sire (Father)</p>
                             <p className="font-bold">{birds.find(b => b.id === bird.fatherId)?.name || 'Unknown'}</p>
                           </div>
                           <div className="p-4 border border-gray-400 rounded-lg">
                             <p className="text-[10px] uppercase font-bold text-gray-500 mb-2">Dam (Mother)</p>
                             <p className="font-bold">{birds.find(b => b.id === bird.motherId)?.name || 'Unknown'}</p>
                           </div>
                        </div>

                        {/* Grandparents */}
                        <div className="col-span-1 flex flex-col justify-between h-full py-4">
                           <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 h-1/5 flex flex-col justify-center">
                             <p className="text-[9px] uppercase font-bold text-gray-500 mb-1">Paternal Grandsire</p>
                             <p className="text-sm font-bold">{birds.find(b => b.id === birds.find(f => f.id === bird.fatherId)?.fatherId)?.name || 'Unknown'}</p>
                           </div>
                           <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 h-1/5 flex flex-col justify-center">
                             <p className="text-[9px] uppercase font-bold text-gray-500 mb-1">Paternal Granddam</p>
                             <p className="text-sm font-bold">{birds.find(b => b.id === birds.find(f => f.id === bird.fatherId)?.motherId)?.name || 'Unknown'}</p>
                           </div>
                           <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 h-1/5 flex flex-col justify-center">
                             <p className="text-[9px] uppercase font-bold text-gray-500 mb-1">Maternal Grandsire</p>
                             <p className="text-sm font-bold">{birds.find(b => b.id === birds.find(m => m.id === bird.motherId)?.fatherId)?.name || 'Unknown'}</p>
                           </div>
                           <div className="p-3 border border-gray-300 rounded-lg bg-gray-50 h-1/5 flex flex-col justify-center">
                             <p className="text-[9px] uppercase font-bold text-gray-500 mb-1">Maternal Granddam</p>
                             <p className="text-sm font-bold">{birds.find(b => b.id === birds.find(m => m.id === bird.motherId)?.motherId)?.name || 'Unknown'}</p>
                           </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full mt-auto pt-8 border-t-2 border-gray-400 flex justify-between items-end text-left">
                       <div className="space-y-4">
                         <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Breeder Signature</p>
                         <div className="w-48 border-b border-gray-400 h-8"></div>
                       </div>
                       <div className="text-right">
                         <QRCodeSVG value={getQRData(bird.id)} size={64} level="M" />
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : printMode === 'list' ? (
            <>
              <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-8">
                <p className="text-sm font-bold text-gray-800 uppercase tracking-widest">Date Generated: {format(new Date(), 'PPPP')}</p>
              </div>
              {qrType === 'bird' && (
                <table className="w-full border-4 border-black">
                  <thead><tr className="bg-gray-100 border-b-4 border-black">
                    <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[5%]">Cage</th>
                    <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[5%]">Sex</th>
                    <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[18%]">ID / Ring</th>
                    <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[18%]">Species</th>
                    <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[18%]">Sub-Species</th>
                    <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[18%]">Mutation</th>
                    <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left w-[18%]">Split</th>
                  </tr></thead>
                  <tbody>
                    {printEmpty ? Array.from({ length: printLayout === 'horizontal' ? 14 : 20 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-400 h-[10mm]">
                        <td className="border-r-2 border-gray-400"></td>
                        <td className="border-r-2 border-gray-400"></td>
                        <td className="border-r-2 border-gray-400"></td>
                        <td className="border-r-2 border-gray-400"></td>
                        <td className="border-r-2 border-gray-400"></td>
                        <td className="border-r-2 border-gray-400"></td>
                        <td></td>
                      </tr>
                    )) : sortedBirds.filter(b => qrSelections.includes(b.id)).map(bird => {
                      const birdCage = cages.find(c => c.id === bird.cageId);
                      return (
                        <tr key={bird.id} className="border-b border-gray-400 h-[9.5mm]">
                          <td className="py-1 px-2 border-r-2 border-gray-400 text-[10px] font-black uppercase">{birdCage?.name || '-'}</td>
                          <td className="py-1 px-2 border-r-2 border-gray-400 text-[10px] font-black uppercase text-center">{bird.sex?.charAt(0) || '?'}</td>
                          <td className="py-1 px-2 border-r-2 border-gray-400 text-[10px] font-black uppercase italic">{bird.name}</td>
                          <td className="py-1 px-2 border-r-2 border-gray-400 text-[10px] font-bold uppercase">{bird.species || '-'}</td>
                          <td className="py-1 px-2 border-r-2 border-gray-400 text-[10px] font-bold uppercase">{bird.subSpecies || '-'}</td>
                          <td className="py-1 px-2 border-r-2 border-gray-400 text-[9px] font-bold uppercase leading-tight">{bird.mutations?.join(' • ') || 'Normal'}</td>
                          <td className="py-1 px-2 text-[9px] font-bold uppercase italic text-gray-500 leading-tight">{bird.splitMutations?.join(' • ') || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {qrType === 'pair' && (
                <table className="w-full border-4 border-black">
                  <thead><tr className="bg-gray-100 border-b-4 border-black">
                    <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[5%]">Cage</th>
                    <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[5%]">Sex</th>
                    <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[18%]">ID / Ring</th>
                    <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[18%]">Species</th>
                    <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[18%]">Sub-Species</th>
                    <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[18%]">Mutation</th>
                    <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left w-[18%]">Split</th>
                  </tr></thead>
                  <tbody>
                    {printEmpty ? Array.from({ length: printLayout === 'horizontal' ? 7 : 10 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-400 h-[20mm]">
                        <td className="border-r-2 border-gray-400 h-[10mm]"></td>
                        <td className="border-r-2 border-gray-400"></td>
                        <td className="border-r-2 border-gray-400"></td>
                        <td className="border-r-2 border-gray-400"></td>
                        <td className="border-r-2 border-gray-400"></td>
                        <td className="border-r-2 border-gray-400"></td>
                        <td></td>
                      </tr>
                    )) : pairs.filter(p => qrSelections.includes(p.id)).map(pair => {
                      const male = birds.find(b => b.id === pair.maleId);
                      const female = birds.find(b => b.id === pair.femaleId);
                      const mCage = cages.find(c => c.id === male?.cageId)?.name || '-';
                      const fCage = cages.find(c => c.id === female?.cageId)?.name || '-';
                      return (
                        <React.Fragment key={pair.id}>
                          <tr className="border-b border-gray-300 h-[9.5mm] bg-blue-50/10">
                            <td className="py-1 px-2 border-r-2 border-gray-400 text-[10px] font-black uppercase">{mCage}</td>
                            <td className="py-1 px-2 border-r-2 border-gray-400 text-[10px] font-black uppercase text-center text-blue-800">♂</td>
                            <td className="py-1 px-2 border-r-2 border-gray-400 text-[10px] font-black uppercase italic">{male?.name || 'M?'}</td>
                            <td className="py-1 px-2 border-r-2 border-gray-400 text-[10px] font-bold uppercase">{male?.species || '-'}</td>
                            <td className="py-1 px-2 border-r-2 border-gray-400 text-[10px] font-bold uppercase">{male?.subSpecies || '-'}</td>
                            <td className="py-1 px-2 border-r-2 border-gray-400 text-[9px] font-bold uppercase leading-tight">{male?.mutations?.join(' • ') || 'Normal'}</td>
                            <td className="py-1 px-2 text-[9px] font-bold uppercase italic text-gray-500 leading-tight">{male?.splitMutations?.join(' • ') || '-'}</td>
                          </tr>
                          <tr className="border-b-2 border-black h-[9.5mm] bg-pink-50/10">
                            <td className="py-1 px-2 border-r-2 border-gray-400 text-[10px] font-black uppercase">{fCage}</td>
                            <td className="py-1 px-2 border-r-2 border-gray-400 text-[10px] font-black uppercase text-center text-pink-800">♀</td>
                            <td className="py-1 px-2 border-r-2 border-gray-400 text-[10px] font-black uppercase italic">{female?.name || 'F?'}</td>
                            <td className="py-1 px-2 border-r-2 border-gray-400 text-[10px] font-bold uppercase">{female?.species || '-'}</td>
                            <td className="py-1 px-2 border-r-2 border-gray-400 text-[10px] font-bold uppercase">{female?.subSpecies || '-'}</td>
                            <td className="py-1 px-2 border-r-2 border-gray-400 text-[9px] font-bold uppercase leading-tight">{female?.mutations?.join(' • ') || 'Normal'}</td>
                            <td className="py-1 px-2 text-[9px] font-bold uppercase italic text-gray-500 leading-tight">{female?.splitMutations?.join(' • ') || '-'}</td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {qrType === 'cage' && (
                <table className="w-full border-4 border-black">
                  <thead><tr className="bg-gray-100 border-b-4 border-black">
                    {printEmpty ? (
                       <>
                         <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[11%]">Cage ID / Number</th>
                         <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[11%]">Location</th>
                         <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-4 border-black w-[11%]">Type</th>
                         <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[11%]">Cage ID / Number</th>
                         <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[11%]">Location</th>
                         <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-4 border-black w-[11%]">Type</th>
                         <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[11%]">Cage ID / Number</th>
                         <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black w-[11%]">Location</th>
                         <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left w-[11%]">Type</th>
                       </>
                    ) : (
                       <>
                         <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black">Cage ID / Number</th>
                         <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left border-r-2 border-black">Location</th>
                         <th className="py-4 px-3 text-[10px] font-black uppercase tracking-widest text-left">Type</th>
                       </>
                    )}
                  </tr></thead>
                  <tbody>
                    {printEmpty ? Array.from({ length: printLayout === 'horizontal' ? 14 : 20 }).map((_, i) => (
                      <tr key={`blank-${i}`} className="border-b border-gray-400 h-[10mm]">
                        <td className="border-r-2 border-gray-400"></td>
                        <td className="border-r-2 border-gray-400"></td>
                        <td className="border-r-4 border-black"></td>
                        <td className="border-r-2 border-gray-400"></td>
                        <td className="border-r-2 border-gray-400"></td>
                        <td className="border-r-4 border-black"></td>
                        <td className="border-r-2 border-gray-400"></td>
                        <td className="border-r-2 border-gray-400"></td>
                        <td></td>
                      </tr>
                    )) : sortedCages.filter(c => qrSelections.includes(c.id)).map(cage => (
                      <tr key={cage.id} className="border-b border-gray-400 h-[9.5mm]">
                        <td className="py-1 px-2 border-r-2 border-gray-400 text-[11px] font-black uppercase">{cage.name}</td>
                        <td className="py-1 px-2 border-r-2 border-gray-400 text-[11px] font-bold uppercase">{cage.location || '-'}</td>
                        <td className="py-1 px-2 text-[11px] font-bold uppercase text-gray-600">{cage.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <footer className="mt-12 text-center text-xs font-black uppercase tracking-widest text-gray-400 border-t pt-8">
                 Generated via The Averian Aviary Management System
              </footer>
            </>
          ) : (
            <div className="qr-print-container">
               {qrSelections.map(id => {
                 const bird = birds.find(b => b.id === id);
                 const pair = pairs.find(p => p.id === id);
                 const cage = cages.find(c => c.id === id);

                 return (
                    <div key={id} className={cn(
                      "qr-print-item bg-white p-[1.5mm] rounded border border-black/10"
                    )}>
                        <div className={cn(
                          "flex flex-col items-center justify-center shrink-0 overflow-hidden",
                          qrWidth > qrHeight ? "w-[40%] h-full pr-1" : "w-full h-[60%] pb-1"
                        )}>
                          <QRCodeSVG 
                            value={getQRData(id)} 
                            size={512} 
                            level="H" 
                            bgColor="#ffffff"
                            fgColor="#000000"
                            style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                        </div>
                        
                        <div className={cn(
                          "flex flex-col text-left overflow-hidden bg-white px-1 justify-center border-black/10",
                          qrWidth > qrHeight ? "flex-1 h-full border-l pl-2" : "w-full h-[40%] border-t pt-1.5"
                        )}>
                          {(qrType === 'bird' || qrType === 'pair') && (() => {
                            const cardBird = qrType === 'bird' ? bird : null;
                            const scale = Math.min(qrWidth, qrHeight) / 50;
                            const badgeFontSize = 4.5 * scale;
                            
                            if (qrType === 'pair' && pair) {
                              const pMale = birds.find(b => b.id === pair.maleId);
                              const pFemale = birds.find(b => b.id === pair.femaleId);
                              return (
                                <div className="flex flex-col h-full justify-center w-full px-1 space-y-1">
                                  {/* Male Info */}
                                  <div className="flex-1 flex flex-col min-w-0 border-b border-black/5 pb-0.5 justify-center">
                                    <p style={{ fontSize: `${7 * scale}pt` }} className="font-black uppercase text-black truncate leading-none">
                                      {pMale?.name || 'M?'} <span className="text-blue-600">({pMale?.sex?.charAt(0) || 'M'})</span>
                                    </p>
                                    <p style={{ fontSize: `${5.2 * scale}pt` }} className="font-bold text-gray-500 leading-tight uppercase truncate">
                                      {pMale?.species || '-'} {pMale?.subSpecies && `( ${pMale.subSpecies} )`}
                                    </p>
                                    <p style={{ fontSize: `${4.2 * scale}pt` }} className="font-black text-black/70 leading-tight uppercase tracking-tighter truncate">
                                      {pMale?.mutations?.join(', ') || 'Normal'} 
                                      {pMale?.splitMutations?.length ? ` ( Split ${pMale.splitMutations.join(', ')} )` : ''}
                                    </p>
                                  </div>

                                  {/* Female Info */}
                                  <div className="flex-1 flex flex-col min-w-0 pt-0.5 justify-center">
                                    <p style={{ fontSize: `${7 * scale}pt` }} className="font-black uppercase text-black truncate leading-none">
                                      {pFemale?.name || 'F?'} <span className="text-pink-600">({pFemale?.sex?.charAt(0) || 'F'})</span>
                                    </p>
                                    <p style={{ fontSize: `${5.2 * scale}pt` }} className="font-bold text-gray-500 leading-tight uppercase truncate">
                                      {pFemale?.species || '-'} {pFemale?.subSpecies && `( ${pFemale.subSpecies} )`}
                                    </p>
                                    <p style={{ fontSize: `${4.2 * scale}pt` }} className="font-black text-black/70 leading-tight uppercase tracking-tighter truncate">
                                      {pFemale?.mutations?.join(', ') || 'Normal'} 
                                      {pFemale?.splitMutations?.length ? ` ( Split ${pFemale.splitMutations.join(', ')} )` : ''}
                                    </p>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="flex flex-col h-full justify-center w-full px-1 space-y-0.5 text-center">
                                <p style={{ fontSize: `${10 * scale}pt` }} className="font-black uppercase text-black truncate leading-tight">
                                  {cardBird?.name || 'Bird'} <span className={cn(cardBird?.sex === 'Male' ? "text-blue-600" : cardBird?.sex === 'Female' ? "text-pink-600" : "text-gray-400")}>({cardBird?.sex || '?'})</span>
                                </p>
                                <p style={{ fontSize: `${7.5 * scale}pt` }} className="font-bold text-gray-500 leading-tight uppercase">
                                  {cardBird?.species || '-'} {cardBird?.subSpecies && `( ${cardBird.subSpecies} )`}
                                </p>
                                <p style={{ fontSize: `${6.5 * scale}pt` }} className="font-black text-black/80 leading-tight uppercase tracking-tight">
                                  {cardBird?.mutations?.join(', ') || 'Normal'}
                                  {cardBird?.splitMutations?.length ? ` ( Split ${cardBird.splitMutations.join(', ')} )` : ''}
                                </p>
                              </div>
                            );
                          })()}

                          {qrType === 'cage' && cage && (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-1">
                              <p style={{ fontSize: `${Math.max(8, 14 * (Math.min(qrWidth, qrHeight) / 50))}pt` }} className="font-black uppercase leading-none tracking-tighter text-black">{cage.name}</p>
                              <div className="flex flex-col items-center gap-0.5">
                                <p style={{ fontSize: `${Math.max(5, 7 * (Math.min(qrWidth, qrHeight) / 50))}pt` }} className="font-black text-gray-400 uppercase tracking-widest truncate">{cage.location || 'Aviary'}</p>
                                <p style={{ fontSize: `${Math.max(4, 6 * (Math.min(qrWidth, qrHeight) / 50))}pt` }} className="font-bold text-gray-300 uppercase italic tracking-tighter">{cage.type}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                 );
               })}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

function ScannerModal({ isOpen, onClose, onScan }: { isOpen: boolean, onClose: () => void, onScan: (result: string) => void }) {
  return (
    <div className={cn("fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl transition-all duration-300", isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>
      <motion.div className="w-full max-w-sm bg-black-950 border border-black-700 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
        <div className="p-6 border-b border-black-700 flex items-center justify-between">
          <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
             <QrCode size={20} className="text-gold-500" />
             Scan QR Label
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-black/20 rounded-xl text-white/50 hover:text-gold-500 transition-all">
             <X size={20} />
          </button>
        </div>
        <div className="p-6 bg-black relative flex items-center justify-center min-h-[300px]">
           {isOpen && (
             <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                    onScan(result[0].rawValue);
                    onClose();
                  }
                }}
                onError={(error) => {
                  console.error(error);
                }}
                components={{ finder: false }}
             />
           )}
           <div className="absolute inset-0 pointer-events-none border-[40px] border-black/80 z-10" />
           <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
             <div className="w-48 h-48 border-2 border-gold-500/50 rounded-xl" />
           </div>
        </div>
        <div className="p-6 bg-black-950 text-center">
           <p className="text-xs text-black-300 font-bold tracking-widest uppercase">Center the Averian QR code in the frame</p>
        </div>
      </motion.div>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-black-950 border border-black-700 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-black-700 flex items-center justify-between bg-black-950">
          <h3 className="text-xl font-black text-white uppercase tracking-widest">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-black/20 rounded-xl text-white/50 hover:text-gold-500 transition-all"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar bg-black-950 text-white">{children}</div>
      </motion.div>
    </div>
  );
}

function BirdDocumentsModal({ bird, onClose }: { bird: Bird, onClose: () => void }) {
  if (!bird.documents || bird.documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-white">
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 border border-black-700">
          <FileText size={32} className="text-zinc-600" />
        </div>
        <h3 className="text-white font-bold mb-1">No documents found</h3>
        <p className="text-white/40 text-xs">This bird has no attached DNA certificates, vet records or permits.</p>
        <Button onClick={onClose} variant="secondary" className="mt-6">Close</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {bird.documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between p-4 bg-black rounded-2xl border border-black-800 group hover:border-gold-500/50 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center border border-black-700">
                <FileText size={20} className="text-gold-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white leading-tight mb-1">{doc.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral" className="bg-zinc-800 text-gold-500 text-[8px] px-1.5 py-0">{doc.type}</Badge>
                  <span className="text-[10px] text-white/30">{format(new Date(doc.createdAt), 'MMM dd, yyyy')}</span>
                </div>
              </div>
            </div>
            <a 
              href={doc.url} 
              target="_blank" 
              rel="noreferrer" 
              className="px-4 py-2 bg-gold-500/10 hover:bg-gold-500 text-gold-500 hover:text-black rounded-xl transition-all border border-gold-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
            >
              <ExternalLink size={14} />
              View
            </a>
          </div>
        ))}
      </div>
      <Button onClick={onClose} variant="secondary" className="w-full py-4 text-xs">Close</Button>
    </div>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, isDeleting }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string, isDeleting?: boolean }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-black-950 border border-black-700 rounded-[2.5rem] overflow-hidden shadow-2xl"
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
            <Button variant="secondary" onClick={onClose} disabled={isDeleting} className="flex-1 py-4">Cancel</Button>
            <Button variant="danger" onClick={onConfirm} disabled={isDeleting} className="flex-1 py-4">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// --- Forms ---

function BirdForm({ user, initialData, cages, birds, pairs, contacts, userSettings, onAddSpecies, onAddSubSpecies, onAddMutation, onAddStatus, onClose }: { user: FirebaseUser, initialData?: Bird | null, cages: Cage[], birds: Bird[], pairs: Pair[], contacts: Contact[], userSettings: UserSettings | null, onAddSpecies: (n: string) => void, onAddSubSpecies: (n: string, sid: string) => void, onAddMutation: (n: string) => void, onAddStatus: (n: string) => void, onClose: () => void }) {
  const symbol = getCurrencySymbol(userSettings?.currency);
  const detectedMateId = (initialData && initialData.id) ? (initialData.mateId || birds.find(b => b.mateId === initialData.id)?.id || '') : '';
  const [formData, setFormData] = useState<Partial<Bird>>(initialData ? { ...initialData, mateId: detectedMateId } : { 
    name: '', 
    species: '', 
    subSpecies: '',
    sex: 'Unknown', 
    cageId: '', 
    birthDate: '', 
    purchaseDate: '',
    purchasePrice: 0,
    estimatedValue: 0,
    boughtFromId: '',
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
  const [addToExpenses, setAddToExpenses] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recordSale, setRecordSale] = useState(true);
  const [salePrice, setSalePrice] = useState(formData.estimatedValue || 0);
  const [buyerId, setBuyerId] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docType, setDocType] = useState('General');

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    try {
      const storageRef = ref(storage, `documents/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      const newDoc: BirdDocument = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        url,
        type: docType,
        fileType: file.type,
        createdAt: new Date().toISOString()
      };

      setFormData(prev => ({
        ...prev,
        documents: [...(prev.documents || []), newDoc]
      }));
      toast.success('Document uploaded');
    } catch (err) {
      toast.error('Failed to upload document');
      console.error(err);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const speciesOptions = userSettings?.species.map(s => ({ id: s.id, name: s.name })) || [];
  const selectedSpecies = userSettings?.species.find(s => s.name === formData.species);
  const subSpeciesOptions = userSettings?.subspecies
    .filter(ss => ss.speciesId === selectedSpecies?.id)
    .map(ss => ({ id: ss.id, name: ss.name })) || [];
  const mutationOptions = userSettings?.mutations.map(m => ({ id: m.id, name: m.name })) || [];
  const statusOptions = userSettings?.statuses?.map(s => ({ id: s.id, name: s.name })) || [];
  const isPreviouslySold = initialData?.statuses?.some(s => s === 'Sold');
  const isCurrentlySold = formData.statuses?.some(s => s === 'Sold');

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
    if (!formData.name?.trim()) {
      toast.error('Please enter a name or ID for the bird.');
      return;
    }
    if (isUploading || isSaving) return;
    setIsSaving(true);
    
    const processSave = async () => {
      try {
        // Sanitize data: remove undefined fields
        const data = sanitizeData(formData);

        if (!initialData?.id) {
          data.uid = user.uid;
        }
        const batch = writeBatch(db);
        
        // Sold / Deceased logic: remove from cage and mate
        const isDeceasedOrSold = formData.statuses?.some(s => s === 'Deceased' || s === 'Sold');
        if (isDeceasedOrSold) {
          data.cageId = '';
          data.mateId = '';
        }

        let birdRef;
        let birdId;
        
        if (initialData?.id) { 
          birdRef = doc(db, 'birds', initialData.id);
          birdId = initialData.id;

          // Handle Mate Changes
          const oldMateId = detectedMateId;
          const newMateId = formData.mateId;

          if (oldMateId && oldMateId !== newMateId) {
            // Remove mateId from old mate
            if (oldMateId !== birdId) {
              batch.update(doc(db, 'birds', oldMateId), { mateId: '' });
            }
            
            // Delete the old pair association
            const oldPair = pairs.find(p => (p.maleId === birdId && p.femaleId === oldMateId) || (p.maleId === oldMateId && p.femaleId === birdId));
            if (oldPair) {
              batch.delete(doc(db, 'pairs', oldPair.id));
            }
          }

          // If marking as deceased/sold, we need to clean up its current associations
          if (isDeceasedOrSold) {
             const currentMate = birds.find(b => b.id === initialData.mateId || (b.mateId === initialData.id && b.id !== initialData.id));
             if (currentMate && currentMate.id !== birdId) {
               batch.update(doc(db, 'birds', currentMate.id), { mateId: '' });
             }
             const activePair = pairs.find(p => p.status === 'Active' && (p.maleId === initialData.id || p.femaleId === initialData.id));
             if (activePair) {
               batch.delete(doc(db, 'pairs', activePair.id));
             }
          }
        } else { 
          birdRef = doc(collection(db, 'birds'));
          birdId = birdRef.id;
        }
        
        batch.set(birdRef, data, { merge: true });

        // Auto-pairing logic (skip if deceased/sold)
        if (formData.mateId && birdId && !isDeceasedOrSold) {
          const mateId = formData.mateId;
          const mateBird = birds.find(b => b.id === mateId);
          
          if (mateBird) {
            // Update mate's record to point back to this bird
            const mateRef = doc(db, 'birds', mateId);
            batch.update(mateRef, { mateId: birdId });

            // Create or update Pair document
            const existingPair = pairs.find(p => (p.maleId === birdId && p.femaleId === mateId) || (p.maleId === mateId && p.femaleId === birdId));

            // Determine roles based on available sex info, defaulting to current bird as male if both unknown
            const isMale = formData.sex === 'Male' || (formData.sex === 'Unknown' && mateBird.sex !== 'Male');
            
            const pairData = {
              maleId: isMale ? birdId : mateId,
              femaleId: isMale ? mateId : birdId,
              status: 'Active',
              startDate: format(new Date(), 'yyyy-MM-dd'),
              uid: user.uid
            };

            const pairRef = existingPair ? doc(db, 'pairs', existingPair.id) : doc(collection(db, 'pairs'));
            batch.set(pairRef, pairData, { merge: true });
          }
        }

        if (addToExpenses && formData.purchasePrice && formData.purchasePrice > 0) {
          const transRef = doc(collection(db, 'transactions'));
          batch.set(transRef, {
            type: 'Expense',
            category: 'Bird Purchase',
            amount: formData.purchasePrice,
            date: formData.purchaseDate || format(new Date(), 'yyyy-MM-dd'),
            description: `Purchase of bird: ${formData.name}`,
            birdId: birdId,
            contactId: formData.boughtFromId || '',
            uid: user.uid
          });
        }

        if (recordSale && isCurrentlySold && !isPreviouslySold && salePrice > 0) {
          const transRef = doc(collection(db, 'transactions'));
          batch.set(transRef, {
            type: 'Income',
            category: 'Bird Sale',
            amount: salePrice,
            date: format(new Date(), 'yyyy-MM-dd'),
            description: `Sale of bird: ${formData.name}`,
            birdId: birdId,
            contactId: buyerId || '',
            uid: user.uid
          });
        }
        
        // Await commit to ensure we catch errors before closing
        await batch.commit();
        
        toast.success(`Successfully ${initialData ? 'updated' : 'added'} bird!`);
        setIsSaving(false);
        onClose();
      } catch (err) { 
         setIsSaving(false);
         console.error("Save error:", err);
         handleFirestoreError(err, initialData ? OperationType.UPDATE : OperationType.CREATE, 'birds'); 
      }
    };

    processSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6 space-y-1">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Ring / Name</label>
          <Input 
            required
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
            placeholder="E.G. RING-123"
          />
        </div>
        <div className="col-span-3 space-y-1">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Sex</label>
          <Select value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value as any })}>
            <option value="Unknown" className="bg-black text-white">Unknown</option>
            <option value="Male" className="bg-black text-white">Male</option>
            <option value="Female" className="bg-black text-white">Female</option>
          </Select>
        </div>
        <div className="col-span-3">
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
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6">
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
        <div className="col-span-6">
          <SearchableSelect 
            label="Sub-Species"
            options={subSpeciesOptions}
            value={subSpeciesOptions.find(o => o.name === formData.subSpecies)?.id}
            onChange={(id) => {
              const name = subSpeciesOptions.find(o => o.id === id)?.name || '';
              setFormData({ ...formData, subSpecies: name });
            }}
            onAdd={(n) => selectedSpecies && onAddSubSpecies(n, selectedSpecies.id)}
            placeholder="Select Sub-Species"
            disabled={!formData.species}
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6">
          <SearchableSelect 
            label="Mutations"
            options={mutationOptions}
            multi
            selectedValues={formData.mutations?.map(m => mutationOptions.find(o => o.name === m)?.id || m) || []}
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
        </div>
        <div className="col-span-6">
          <SearchableSelect 
            label="Split Mutations"
            options={mutationOptions}
            multi
            selectedValues={formData.splitMutations?.map(m => mutationOptions.find(o => o.name === m)?.id || m) || []}
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
      </div>

      <div className="space-y-1">
        <SearchableSelect
          label="Statuses"
          options={statusOptions}
          multi
          selectedValues={formData.statuses?.map(s => statusOptions.find(o => o.name === s)?.id || s) || []}
          onChange={(id) => {
            const name = statusOptions.find(o => o.id === id)?.name || '';
            const current = formData.statuses || [];
            setFormData({
              ...formData,
              statuses: current.includes(name) ? current.filter(s => s !== name) : [...current, name]
            });
          }}
          onAdd={onAddStatus}
          placeholder="Select or add statuses"
        />
      </div>

      {isCurrentlySold && !isPreviouslySold && (
        <div className="p-4 bg-gold-500/10 border border-gold-500/20 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-gold-500">
            <DollarSign size={18} />
            <h4 className="text-xs font-black uppercase tracking-widest">Record Sale as Income?</h4>
          </div>
          <p className="text-[10px] text-white/60">This bird is marked as Sold. Would you like to record the transaction for profit tracking?</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Sale Price ({symbol})</label>
              <Input type="number" value={salePrice} onChange={e => setSalePrice(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Buyer</label>
              <Select value={buyerId} onChange={e => setBuyerId(e.target.value)}>
                <option value="" className="bg-black text-white">Unknown / None</option>
                {contacts.map(c => <option key={c.id} value={c.id} className="bg-black text-white">{c.name}</option>)}
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={recordSale} 
              onChange={e => setRecordSale(e.target.checked)}
              className="w-4 h-4 rounded border-black-700 bg-black text-gold-500 focus:ring-gold-500/20"
            />
            <span className="text-[10px] font-bold text-white/60 group-hover:text-white transition-colors">Record as Sales Income</span>
          </label>
        </div>
      )}
      
      <div className="space-y-1">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Image</label>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="bird-image-upload" name="bird-image-upload"
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
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Birth Date</label><Input type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} /></div>
        <div className="flex-1 opacity-0 pointer-events-none"></div>
      </div>
 
      <div className="grid grid-cols-2 gap-4">
        <SearchableSelect 
          label="Father"
          options={[
            { id: '', name: 'Unknown' }, 
            ...birds.filter(b => b.sex === 'Male' && b.id !== initialData?.id).map(b => {
              const cage = cages.find(c => c.id === b.cageId);
              const mutationsStr = b.mutations?.length ? `[${b.mutations.join(', ')}]` : '';
              return { 
                id: b.id, 
                name: b.isGhost ? `${b.name} (Pedigree Only)` : b.name,
                details: cage?.name || 'Unassigned',
                subText: mutationsStr,
                bird: b
              };
            })
          ]}
          value={formData.fatherId}
          onChange={(id) => setFormData({ ...formData, fatherId: id })}
          placeholder="Unknown"
          cages={cages}
        />
        <SearchableSelect 
          label="Mother"
          options={[
            { id: '', name: 'Unknown' }, 
            ...birds.filter(b => b.sex === 'Female' && b.id !== initialData?.id).map(b => {
              const cage = cages.find(c => c.id === b.cageId);
              const mutationsStr = b.mutations?.length ? `[${b.mutations.join(', ')}]` : '';
              return { 
                id: b.id, 
                name: b.isGhost ? `${b.name} (Pedigree Only)` : b.name,
                details: cage?.name || 'Unassigned',
                subText: mutationsStr,
                bird: b
              };
            })
          ]}
          value={formData.motherId}
          onChange={(id) => setFormData({ ...formData, motherId: id })}
          placeholder="Unknown"
          cages={cages}
        />
      </div>
 
      <div className="grid grid-cols-2 gap-4">
        <SearchableSelect 
          label="Mate"
          options={[
            { id: '', name: 'None' }, 
            ...birds.filter(b => b.id !== initialData?.id).map(b => {
              const cage = cages.find(c => c.id === b.cageId);
              const mutationsStr = b.mutations?.length ? `[${b.mutations.join(', ')}]` : '';
              return { 
                id: b.id, 
                name: b.isGhost ? `${b.name} (Pedigree Only)` : b.name,
                details: cage?.name || 'Unassigned',
                subText: mutationsStr,
                bird: b
              };
            })
          ]}
          value={formData.mateId}
          onChange={(id) => setFormData({ ...formData, mateId: id })}
          placeholder="None"
          cages={cages}
        />
        <SearchableSelect 
          label="Offspring"
          options={birds.filter(b => !b.isGhost && b.id !== initialData?.id).map(b => {
            const cage = cages.find(c => c.id === b.cageId);
            const mutationsStr = b.mutations?.length ? `[${b.mutations.join(', ')}]` : '';
            return { 
              id: b.id, 
              name: b.name,
              details: cage?.name || 'Unassigned',
              subText: mutationsStr,
              bird: b
            };
          })}
          multi
          selectedValues={formData.offspringIds || []}
          cages={cages}
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
        <SearchableSelect 
          label="Bought From"
          options={[{ id: '', name: 'None' }, ...contacts.map(c => ({ id: c.id, name: c.name }))]}
          value={formData.boughtFromId || ''}
          onChange={(id) => setFormData({ ...formData, boughtFromId: id })}
          placeholder="Select Contact"
        />
      </div>

      <div className="flex items-center gap-2">
        <input 
          type="checkbox" 
          id="add-to-expenses" 
          checked={addToExpenses} 
          onChange={(e) => setAddToExpenses(e.target.checked)}
          className="w-4 h-4 rounded border-black-700 bg-black text-gold-500 focus:ring-gold-500"
        />
        <label htmlFor="add-to-expenses" className="text-[10px] font-black text-white uppercase tracking-widest cursor-pointer">
          Add Purchase to Expenses
        </label>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Notes</label>
        <textarea name="birdNotes" id="birdNotes" className="w-full px-4 py-3 bg-black border border-black-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-white transition-all min-h-[100px] text-sm font-medium placeholder:text-white/30" placeholder="Additional notes..."
          value={formData.notes} 
          onChange={e => setFormData({ ...formData, notes: e.target.value })} 
        />
      </div>

      <div className="space-y-3 pt-2 border-t border-black-800">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Documents (DNA, Vet, Permits)</label>
        
        <div className="flex gap-2">
          <Select 
            value={docType} 
            onChange={e => setDocType(e.target.value)}
            className="flex-1"
          >
            <option value="General" className="bg-black text-white">General</option>
            <option value="DNA Sexing" className="bg-black text-white">DNA Sexing</option>
            <option value="Vet Check" className="bg-black text-white">Vet Check</option>
            <option value="Permit" className="bg-black text-white">Permit</option>
            <option value="Purchase Invoice" className="bg-black text-white">Invoice</option>
          </Select>
          
          <input type="file" onChange={handleDocUpload} className="hidden" id="bird-doc-upload" disabled={isUploadingDoc} />
          <label 
            htmlFor="bird-doc-upload"
            className={cn(
              "flex items-center justify-center gap-2 px-6 py-2 bg-zinc-800 border border-black-700 rounded-xl cursor-pointer hover:bg-zinc-700 transition-all text-xs font-black uppercase tracking-widest text-white hover:text-gold-500",
              isUploadingDoc && "opacity-50 cursor-not-allowed"
            )}
          >
            {isUploadingDoc ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Upload
          </label>
        </div>

        <div className="space-y-2">
          {formData.documents?.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-black rounded-xl border border-black-800 group">
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-gold-500" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white leading-tight">{doc.name}</span>
                  <span className="text-[9px] text-gold-500 font-black uppercase tracking-widest">{doc.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={doc.url} target="_blank" rel="noreferrer" className="p-2 hover:bg-zinc-800 rounded-lg text-white transition-colors">
                  <ExternalLink size={14} />
                </a>
                <button 
                  type="button" 
                  onClick={() => setFormData(prev => ({ ...prev, documents: prev.documents?.filter(d => d.id !== doc.id) }))}
                  className="p-2 rounded-lg text-white transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 90%)', e.currentTarget.style.color = 'var(--theme-delete-color, #ef4444)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '', e.currentTarget.style.color = 'white')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest font-black" disabled={isUploading || isSaving}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {(initialData && initialData.id) ? 'Update' : 'Add'} Bird
      </Button>
    </form>
  );
}

function CageForm({ user, initialData, cages, onClose }: { user: FirebaseUser, initialData?: Cage, cages: Cage[], onClose: () => void }) {
  const [formData, setFormData] = useState<Partial<Cage>>(initialData || { name: '', location: '', type: 'Standard', imageUrl: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [multiPrefix, setMultiPrefix] = useState('');
  const [multiStart, setMultiStart] = useState('1');
  const [multiEnd, setMultiEnd] = useState('10');

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
    setError(null);
    
    const processSave = async () => {
      try {
        if (isMultiMode && !initialData) {
          const start = parseInt(multiStart);
          const end = parseInt(multiEnd);
          if (isNaN(start) || isNaN(end) || start > end) {
            throw new Error('Invalid range');
          }
          if (end - start > 100) {
            throw new Error('Max 100 cages at once');
          }

          const batch = writeBatch(db);
          let duplicates = [];
          for (let i = start; i <= end; i++) {
            const cageName = `${multiPrefix}${i}`;
            if (cages.some(c => c.name.toLowerCase() === cageName.toLowerCase())) {
              duplicates.push(cageName);
              continue;
            }
            const docRef = doc(collection(db, 'cages'));
            batch.set(docRef, { ...formData, name: cageName, uid: user.uid });
          }
          
          if (duplicates.length > 0 && duplicates.length === (end - start + 1)) {
            throw new Error('All specified cages already exist');
          }

          await batch.commit();
        } else {
          if (cages.some(c => c.id !== initialData?.id && c.name.toLowerCase() === formData.name?.toLowerCase())) {
            throw new Error(`Cage "${formData.name}" already exists`);
          }

          const data = sanitizeData({ 
            ...formData,
            ...(initialData?.id ? {} : { uid: user.uid })
          });
          if (initialData?.id) { 
            await updateDoc(doc(db, 'cages', initialData.id), data); 
          } 
          else { 
            const docRef = doc(collection(db, 'cages'));
            await setDoc(docRef, data); 
          }
        }
        toast.success(isMultiMode && !initialData ? 'Bulk cages created!' : `Cage ${initialData ? 'updated' : 'added'}!`);
        setIsSaving(false);
        onClose();
      } catch (err) { 
        setError(err instanceof Error ? err.message : 'Action failed');
        setIsSaving(false);
        if (!(err instanceof Error && (err.message.includes('already exists') || err.message.includes('specified cages')))) {
           handleFirestoreError(err, initialData ? OperationType.UPDATE : OperationType.CREATE, 'cages');
        }
      }
    };

    processSave();
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!initialData && (
        <div className="flex bg-black-900 p-1 rounded-xl border border-black-800">
          <button type="button" onClick={() => setIsMultiMode(false)} className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", !isMultiMode ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20" : "text-black-100 hover:text-white")}>Single Cage</button>
          <button type="button" onClick={() => setIsMultiMode(true)} className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", isMultiMode ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20" : "text-black-100 hover:text-white")}>Bulk Create</button>
        </div>
      )}

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
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} id="cage-image-upload" name="cage-image-upload" />
          </label>
        </div>
      </div>
      {(uploadError || error) && <p className="text-rose-500 text-[10px] text-center font-bold uppercase tracking-widest">{uploadError || error}</p>}

      {isMultiMode && !initialData ? (
        <div className="space-y-4 bg-black/20 p-4 rounded-2xl border border-black-800 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Name Prefix (e.g. A)</label>
            <Input required value={multiPrefix} onChange={e => setMultiPrefix(e.target.value)} placeholder="Prefix" />
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Range Start</label>
              <Input type="number" required value={multiStart} onChange={e => setMultiStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Range End</label>
              <Input type="number" required value={multiEnd} onChange={e => setMultiEnd(e.target.value)} />
            </div>
          </div>
          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight text-center italic">Example: {multiPrefix || 'PREFIX'}{multiStart || '1'} TO {multiPrefix || 'PREFIX'}{multiEnd || '10'}</p>
        </div>
      ) : (
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Cage Name/Number</label><Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Location</label><Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Type</label><Select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}><option value="Standard" className="bg-black text-white">Standard</option><option value="Breeding" className="bg-black text-white">Breeding</option><option value="Flight" className="bg-black text-white">Flight</option><option value="Hospital" className="bg-black text-white">Hospital</option></Select></div>
      </div>
      <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest font-black" disabled={isUploading || isSaving}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {(initialData && (initialData as any).id) ? 'Update' : isMultiMode ? `Bulk Create (${Math.max(0, parseInt(multiEnd) - parseInt(multiStart) + 1 || 0)})` : 'Add'} Cage
      </Button>
    </form>
  );
}

function PairForm({ user, initialData, birds, cages, onClose }: { user: FirebaseUser, initialData?: Pair, birds: Bird[], cages: Cage[], onClose: () => void }) {
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
    
    const processSave = async () => {
      try {
        const batch = writeBatch(db);
        const data = sanitizeData({ 
          ...formData,
          ...(initialData?.id ? {} : { uid: user.uid })
        });
        
        if (initialData?.id) { 
          batch.update(doc(db, 'pairs', initialData.id), data); 
          // If mate changed, clear old ones
          if (initialData.maleId && initialData.maleId !== data.maleId) {
            batch.update(doc(db, 'birds', initialData.maleId), { mateId: '' });
          }
          if (initialData.femaleId && initialData.femaleId !== data.femaleId) {
            batch.update(doc(db, 'birds', initialData.femaleId), { mateId: '' });
          }
        } 
        else { 
          const docRef = doc(collection(db, 'pairs'));
          batch.set(docRef, data); 
        }

        // Link new mates
        if (data.maleId) {
          batch.update(doc(db, 'birds', data.maleId), { mateId: data.femaleId || '' });
        }
        if (data.femaleId) {
          batch.update(doc(db, 'birds', data.femaleId), { mateId: data.maleId || '' });
        }
        
        await batch.commit();

        toast.success(`Pair ${initialData ? 'updated' : 'added'}!`);
        setIsSaving(false);
        onClose();
      } catch (err) { 
        setIsSaving(false);
        handleFirestoreError(err, initialData ? OperationType.UPDATE : OperationType.CREATE, 'pairs'); 
      }
    };

    processSave();
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <SearchableSelect 
          label="Male / Bird 1"
          value={formData.maleId || ''}
          onChange={(val) => setFormData({ ...formData, maleId: val })}
          options={[
            { id: '', name: 'Select Bird 1' },
            ...birds.filter(b => b.sex === 'Male' || b.sex === 'Unknown').map(b => {
              const cage = cages.find(c => c.id === b.cageId);
              const mutationsStr = b.mutations?.length ? `[${b.mutations.join(', ')}]` : '';
              return { 
                id: b.id, 
                name: b.name,
                details: cage?.name || 'Unassigned',
                subText: mutationsStr,
                bird: b
              };
            })
          ]}
          cages={cages}
        />
        <SearchableSelect 
          label="Female / Bird 2"
          value={formData.femaleId || ''}
          onChange={(val) => setFormData({ ...formData, femaleId: val })}
          options={[
            { id: '', name: 'Select Bird 2' },
            ...birds.filter(b => b.sex === 'Female' || b.sex === 'Unknown').map(b => {
              const cage = cages.find(c => c.id === b.cageId);
              const mutationsStr = b.mutations?.length ? `[${b.mutations.join(', ')}]` : '';
              return { 
                id: b.id, 
                name: b.name,
                details: cage?.name || 'Unassigned',
                subText: mutationsStr,
                bird: b
              };
            })
          ]}
          cages={cages}
        />
      </div>
      <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Status</label><Select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}><option value="Active" className="bg-black text-white">Active</option><option value="Inactive" className="bg-black text-white">Inactive</option></Select></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Start Date</label><Input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">End Date</label><Input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} /></div>
      </div>
      <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest font-black" disabled={isSaving}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {(initialData && initialData.id) ? 'Update' : 'Add'} Pair
      </Button>
    </form>
  );
}

function TaskForm({ user, initialData, birds, cages, onClose }: { user: FirebaseUser, initialData?: Task, birds: Bird[], cages: Cage[], onClose: () => void }) {
  const [formData, setFormData] = useState<Partial<Task>>(initialData || { title: '', description: '', status: 'Pending', priority: 'Medium', category: 'General', dueDate: '', reminderDate: '', birdIds: [], subTasks: [] });
  const [newSubTask, setNewSubTask] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [birdSearch, setBirdSearch] = useState('');
  const [isBirdDropdownOpen, setIsBirdDropdownOpen] = useState(false);

  const filteredUnselectedBirds = birds.filter(b => {
    const cage = cages.find(c => c.id === b.cageId);
    const searchStr = `${b.name} ${b.species} ${b.subSpecies || ''} ${cage?.name || ''} ${b.mutations?.join(' ') || ''} ${b.splitMutations?.join(' ') || ''}`.toLowerCase();
    return !formData.birdIds?.includes(b.id) && searchStr.includes(birdSearch.toLowerCase());
  });

  const selectedBirdsData = birds.filter(b => formData.birdIds?.includes(b.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    
    const processSave = async () => {
      try {
        const data = sanitizeData({ 
          ...formData,
          ...(initialData?.id ? {} : { uid: user.uid })
        });
        if (initialData?.id) { 
          await updateDoc(doc(db, 'tasks', initialData.id), data);
          toast.success('Task updated');
        } else { 
          const docRef = doc(collection(db, 'tasks'));
          await setDoc(docRef, data);
          toast.success('Task created');
        }
        setIsSaving(false);
        onClose();
      } catch (err) { 
        setIsSaving(false);
        handleFirestoreError(err, initialData ? OperationType.UPDATE : OperationType.CREATE, 'tasks'); 
      }
    };

    processSave();
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
        <textarea name="taskDescription" id="taskDescription" className="w-full px-4 py-3 bg-black border border-black-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-white transition-all min-h-[80px] text-sm font-medium placeholder:text-white/30" placeholder="Task description..."
          value={formData.description} 
          onChange={e => setFormData({ ...formData, description: e.target.value })} 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Status</label><Select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}><option value="Pending" className="bg-black text-white">Pending</option><option value="Completed" className="bg-black text-white">Completed</option></Select></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Due Date</label><Input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Calendar & Reminder</label>
          <Input type="datetime-local" value={formData.reminderDate || ''} onChange={e => setFormData({ ...formData, reminderDate: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Reminder notification</label>
          <Select 
            value={formData.reminderLeadTime || 0} 
            onChange={e => setFormData({ ...formData, reminderLeadTime: parseInt(e.target.value) })}
          >
            <option value={0} className="bg-black text-white text-xs">At time of event</option>
            <option value={2} className="bg-black text-white text-xs">2 minutes before</option>
            <option value={5} className="bg-black text-white text-xs">5 minutes before</option>
            <option value={10} className="bg-black text-white text-xs">10 minutes before</option>
            <option value={15} className="bg-black text-white text-xs">15 minutes before</option>
            <option value={30} className="bg-black text-white text-xs">30 minutes before</option>
            <option value={60} className="bg-black text-white text-xs">1 hour before</option>
            <option value={1440} className="bg-black text-white text-xs">1 day before</option>
          </Select>
        </div>
      </div>
      <p className="text-[10px] text-white/50 ml-1">Sync with your Google Calendar for reliable mobile notifications.</p>
        
      {formData.title && (formData.reminderDate || formData.dueDate) && (
        <Button 
          type="button" 
          variant="secondary" 
          className="w-full mt-2 py-3 text-[10px] font-black uppercase tracking-widest border-gold-500/30 hover:border-gold-500 group" 
          onClick={() => window.open(getGoogleCalendarUrl(formData as Task, birds, cages), '_blank')}
        >
          <Calendar size={14} className="mr-2 text-gold-500 group-hover:scale-110 transition-transform" />
          Add to Google Calendar
        </Button>
      )}
      <div className="space-y-2 relative">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Tag Birds</label>
        
        {/* Selected Birds Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          {selectedBirdsData.map(b => (
            <div key={b.id} className="relative group">
              <BirdCompactInfo bird={b} cages={cages} className="bg-zinc-900 border-black-700" />
              <button 
                type="button" 
                onClick={() => toggleBirdTag(b.id)}
                className="absolute top-2 right-2 text-white/30 transition-colors z-10"
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--theme-delete-color, #ef4444)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {selectedBirdsData.length === 0 && (
            <span className="text-[10px] text-white/30 italic ml-1 leading-8 col-span-2">No birds tagged yet...</span>
          )}
        </div>

        <SearchableSelect 
          label=""
          placeholder="Tag more birds..."
          options={birds.filter(b => !b.isGhost).map(b => {
             const cage = cages.find(c => c.id === b.cageId);
             const mutationsStr = b.mutations?.length ? `[${b.mutations.join(', ')}]` : '';
             return {
               id: b.id,
               name: b.name,
               details: cage?.name || 'Unassigned',
               subText: `${b.species} ${mutationsStr}`,
               bird: b
             };
          })}
          multi
          selectedValues={formData.birdIds || []}
          onChange={(id) => toggleBirdTag(id)}
        />
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
              <button 
                type="button" 
                onClick={() => setFormData({ ...formData, subTasks: formData.subTasks?.filter((_, i) => i !== idx) })} 
                className="text-white transition-colors"
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--theme-delete-color, #ef4444)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest font-black" disabled={isSaving}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {(initialData && initialData.id) ? 'Update' : 'Add'} Task
      </Button>
    </form>
  );
}
