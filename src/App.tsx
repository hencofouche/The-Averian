import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { Toaster, toast } from 'sonner';
import { 
  Plus, Search, Bird as BirdIcon, Home, Heart, CheckSquare, 
  Info, Trash2, Edit2, LogOut, User, 
  Tag, Calendar, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, X, GitBranch,
  Image as ImageIcon, Loader2, DollarSign, TrendingUp, TrendingDown,
  Activity, ArrowUpRight, ArrowDownRight, BarChart3, PieChart as PieChartIcon,
  Menu, Egg, LayoutGrid, Grid3x3, List as ListIcon, AlertTriangle, CreditCard, CheckCircle2, Bell, Cloud, Maximize2, Share2, Send, Printer, MoreHorizontal, Dna, Users, Palette, QrCode, Scan, FileText, ExternalLink, ArrowLeft, ArrowRightLeft, History as HistoryIcon, RefreshCw, UploadCloud, Eye,
  Mail, MessageCircle, Video, Shield, Wifi, WifiOff, Flame, ShoppingBag, Store, BookOpen, Sparkles, FileSpreadsheet
} from 'lucide-react';
import GeneticsCalculatorOriginal from './components/GeneticsCalculator';
const GeneticsCalculator = React.memo(GeneticsCalculatorOriginal);
import { ContactsView as ContactsViewOriginal } from './components/ContactsView';
const ContactsView = React.memo(ContactsViewOriginal);
import { AdminDiagnosticsView } from './components/AdminDiagnosticsView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { MarketplaceView } from './components/MarketplaceView';
import { WikiView } from './components/WikiView';
import { SmartCandlingModal, computeEggTimeline, getSpeciesIncubation, SPECIES_INCUBATION_DATA } from './components/SmartCandlingModal';
import { DigitalTransferPassportModal } from './components/DigitalTransferPassportModal';
import { ComingSoonView } from './components/ComingSoonView';
import { AdminPageTestingBanner } from './components/AdminPageTestingBanner';
import { AdminComingSoonModal } from './components/AdminComingSoonModal';
// Google Workspace native integrations removed to prevent trust-violating security warnings
import { 
  SellerProfile, MarketplaceListing, MarketplaceReview, 
  AppPageId, AppComingSoonSettings, ComingSoonPageConfig 
} from './types';
import { QRCodeSVG } from 'qrcode.react';
import { SubscriptionGate } from "./components/SubscriptionGate";
import { Button, Input, Select, Card, Textarea, BirdCompactInfo, Badge } from "./components/ui";
import { Scanner } from '@yudiel/react-qr-scanner';
import { motion, AnimatePresence } from 'motion/react';
import { generateBirdListPDF, generateCageListPDF, generatePairListPDF, generateCertificatePDF, generateQRListPDF } from './lib/pdf-engine';
import { defaultSpecies, defaultMutations } from './lib/default-data';
import { getTranslatedLabel, LANGUAGE_NAMES, setActiveLanguage, t as tGlobal } from './lib/translations';
import { InstallAppButton } from './components/InstallAppButton';
import { InstallPromptBanner } from './components/InstallPromptBanner';
import { BannedUserScreen } from './components/BannedUserScreen';
import { useIncubationNotifications } from './hooks/useIncubationNotifications';
import { IncubationAlertsModal } from './components/IncubationAlertsModal';

function ImageGallery({ imageUrls, initialIndex, onClose }: { imageUrls: string[], initialIndex: number, onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // min swipe distance in pixels
  const minSwipeDistance = 50;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev + 1) % imageUrls.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageUrls.length, onClose]);

  const nextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % imageUrls.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      nextImage();
    } else if (isRightSwipe) {
      prevImage();
    }
  };

  if (!imageUrls || imageUrls.length === 0) return null;

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 sm:p-8 cursor-zoom-out select-none"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative max-w-5xl w-full max-h-full flex items-center justify-center group"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageUrls[currentIndex]} 
          alt={`Gallery view ${currentIndex + 1}`} 
          className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl cursor-default"
          referrerPolicy="no-referrer"
        />
        
        {imageUrls.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 bg-black/70 hover:bg-gold-500 hover:text-black text-gold-500 rounded-full backdrop-blur-md transition-all border border-gold-500/30 shadow-[0_0_15px_rgba(212,175,55,0.2)] active:scale-90 z-20"
              aria-label="Previous image"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 bg-black/70 hover:bg-gold-500 hover:text-black text-gold-500 rounded-full backdrop-blur-md transition-all border border-gold-500/30 shadow-[0_0_15px_rgba(212,175,55,0.2)] active:scale-90 z-20"
              aria-label="Next image"
            >
              <ChevronRight size={24} />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-y-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 text-white rounded-full backdrop-blur-md text-xs font-bold tracking-widest z-20">
              {currentIndex + 1} / {imageUrls.length}
            </div>
          </>
        )}

        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 sm:top-4 sm:right-4 p-3 bg-black/50 hover:bg-gold-500 hover:text-black text-white rounded-full backdrop-blur-md transition-all z-20"
          aria-label="Close gallery"
        >
          <X size={24} />
        </button>
      </motion.div>
    </div>
  );
}

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, Legend, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { 
  auth, db, storage, loginWithGoogle, logout, handleFirestoreError, testConnection, setFirestoreNetworkState
} from './firebase';
import { 
  onAuthStateChanged, User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, onSnapshot, query, where, addDoc, 
  updateDoc, deleteDoc, doc, getDocs, orderBy, setDoc, getDocFromServer, writeBatch, limit
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { 
  Bird, Cage, Pair, Task, Transaction, OperationType, BreedingRecord, UserSettings, Species, SubSpecies, Mutation, SharedItem, Contact, BirdDocument, Egg as EggType
} from './types';
import { cn, generateColorPalette } from './lib/utils';
import ColorWheel from '@uiw/react-color-wheel';
import { hexToHsva, hsvaToHex } from '@uiw/color-convert';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfMonth, endOfWeek, addDays, addMonths, isSameMonth, subDays, subWeeks, subMonths, subYears, isWithinInterval, parseISO } from 'date-fns';

// --- Helpers ---
const isSubscriptionExpired = (settings: UserSettings | null | undefined): boolean => {
  if (!settings) return false;
  if (!settings.account_expiry_date) return true;
  const expiryDate = new Date(settings.account_expiry_date);
  if (isNaN(expiryDate.getTime())) return true;
  return new Date() > expiryDate;
};

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
    case 'AUD': return 'A$';
    case 'CAD': return 'C$';
    case 'CHF': return 'CHF';
    case 'JPY': return '¥';
    case 'CNY': return '¥';
    case 'INR': return '₹';
    case 'PHP': return '₱';
    case 'RUB': return '₽';
    case 'BRL': return 'R$';
    case 'MXN': return 'Mex$';
    case 'SAR': return 'SR';
    case 'AED': return 'AED';
    case 'ILS': return '₪';
    case 'NZD': return 'NZ$';
    case 'SGD': return 'S$';
    case 'TRY': return '₺';
    case 'PLN': return 'zł';
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


import { compressAndUploadImage, deleteStorageFileIfApplicable } from "./lib/image-utils";

// --- UI Components ---


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

const PedigreeNode = ({ bird, roleLabel, generation, onBirdRef, cages, userSettings }: { bird?: Bird, roleLabel?: string, generation: number, onBirdRef: (name: string) => void, cages: Cage[], userSettings?: UserSettings }) => {
  const t = (text: string) => getTranslatedLabel(text, userSettings?.language || 'en');
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
            <span className="hidden sm:inline">{t(roleLabel)}</span>
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
                      <span className="text-white/50 uppercase font-black tracking-tighter truncate">{bird.statuses?.[0] ? t(bird.statuses[0]) : t('ACTIVE')}</span>
                    </div>
                    {bird.birthDate && <span className="text-white/30 uppercase font-bold text-[4px] sm:text-[8px]">{bird.birthDate}</span>}
                  </div>
                  {cage && <span className="text-[5px] sm:text-[8px] text-white/20 italic truncate font-bold text-right leading-none">{t('Cage')}: {cage.name}</span>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-6 bg-black/20 border border-white/5 rounded-lg sm:rounded-2xl border-dashed text-center opacity-30 flex flex-col items-center justify-center min-h-[50px] sm:min-h-[100px]">
              <p className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-white/30 truncate px-2">{t('UNKNOWN')}</p>
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


// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'birds' | 'cages' | 'pairs' | 'breeding' | 'financials' | 'tasks' | 'settings' | 'genetics' | 'contacts' | 'stats' | 'print' | 'pedigree' | 'subscription' | 'admin' | 'marketplace' | 'wiki'>('birds');
  const [statsFilter, setStatsFilter] = useState<{ birdId?: string, pairId?: string } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'pairs' | 'contacts'>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isExtrasMenuOpen, setIsExtrasMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid-large' | 'list'>('grid-large');
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [galleryData, setGalleryData] = useState<{ urls: string[], index: number } | null>(null);

  // Offline and Network state management
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isForcedOffline, setIsForcedOffline] = useState(false);
  const [isSyncing, setIsSyncingReal] = useState(false);
  const syncTimeoutRef = React.useRef<any>(null);

  const setIsSyncing = (val: boolean) => {
    setIsSyncingReal(val);
    if (val) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        setIsSyncingReal(false);
      }, 5000); // 5 seconds timeout to prevent permanent stuck sync indicators
    } else {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, []);
  
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
  const [wikiSpecies, setWikiSpecies] = useState<any[]>([]);
  const [wikiMutations, setWikiMutations] = useState<any[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [walkthroughStep, setWalkthroughStep] = useState<number | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [quickAddDialog, setQuickAddDialog] = useState<{
    type: 'mutation' | 'species' | 'subspecies';
    name: string;
    speciesId?: string;
    inheritance?: 'autosomal_recessive' | 'autosomal_dominant' | 'incomplete_dominant' | 'sex_linked_recessive' | '';
  } | null>(null);

  // Pagination limits
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

  // Marketplace states
  const [sellerProfiles, setSellerProfiles] = useState<SellerProfile[]>([]);
  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>([]);
  const [marketplaceReviews, setMarketplaceReviews] = useState<MarketplaceReview[]>([]);

  // Coming Soon & Feature Flag states
  const [comingSoonSettings, setComingSoonSettings] = useState<AppComingSoonSettings>(() => {
    try {
      const cached = localStorage.getItem('averian_coming_soon_config');
      return cached ? JSON.parse(cached) : { pages: {} };
    } catch {
      return { pages: {} };
    }
  });
  const [isAdminPreviewMode, setIsAdminPreviewMode] = useState(false);
  const [comingSoonConfigModal, setComingSoonConfigModal] = useState<{
    isOpen: boolean;
    pageId: AppPageId;
    pageName: string;
  } | null>(null);

  // Incubation Push Notifications
  const [isIncubationModalOpen, setIsIncubationModalOpen] = useState(false);
  const {
    permission: notifPermission,
    isSupported: isNotifSupported,
    isGranted: isNotifGranted,
    reminders: incubationReminders,
    enableNotifications,
    isRequesting: isRequestingNotifs
  } = useIncubationNotifications(breedingRecords, birds);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!isForcedOffline) {
        setFirestoreNetworkState(true);
        toast.success('Internet reconnected! Cloud sync active.');
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast('Operating in 100% Offline Mode. All edits are saved locally.', { icon: '📡' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isForcedOffline]);

  const handleToggleForceOffline = async (forced: boolean) => {
    setIsForcedOffline(forced);
    await setFirestoreNetworkState(!forced);
    if (forced) {
      toast('Forced Offline Mode enabled (0 Network usage).', { icon: '🚫' });
    } else {
      toast.success('Cloud synchronization re-enabled.');
    }
  };

  const t = (text: string) => getTranslatedLabel(text, userSettings?.language || 'en');

  // Check if current user is Admin (teamotakuempire@gmail.com or clashfouche@gmail.com)
  const isAdmin = useMemo(() => {
    const email = user?.email?.toLowerCase().trim();
    return email === 'teamotakuempire@gmail.com' || email === 'clashfouche@gmail.com';
  }, [user?.email]);

  const [hasRedirectedAdmin, setHasRedirectedAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasRedirectedAdmin(false);
    }
  }, [user]);

  // Auto-switch to admin tab or reset to birds tab for non-admins
  useEffect(() => {
    if (user) {
      if (isAdmin) {
        if (!hasRedirectedAdmin) {
          setActiveTab('admin');
          setHasRedirectedAdmin(true);
        }
      } else if (activeTab === 'admin') {
        setActiveTab('birds');
      }
    }
  }, [isAdmin, user, activeTab, hasRedirectedAdmin]);

  useEffect(() => {
    setActiveLanguage(userSettings?.language || 'en');
  }, [userSettings?.language]);
  
  const effectiveSettings = useMemo(() => {
    if (!userSettings) return null;
    const effective = { ...userSettings };
    
    const mergedSpeciesMap = new Map((userSettings.species || []).map(s => [s.name.toLowerCase(), s]));
    const mergedSubspeciesMap = new Map((userSettings.subspecies || []).map(s => [s.name.toLowerCase(), s]));
    const mergedMutationsMap = new Map((userSettings.mutations || []).map(m => [m.name.toLowerCase(), m]));

    // 1. Merge default data if enabled
    if (userSettings.useDefaultData !== false) {
      defaultSpecies.forEach(ds => {
        if (!mergedSpeciesMap.has(ds.name.toLowerCase())) {
          mergedSpeciesMap.set(ds.name.toLowerCase(), { id: ds.id, name: ds.name });
        }
        ds.subspecies.forEach(dss => {
          if (!mergedSubspeciesMap.has(dss.name.toLowerCase())) {
            mergedSubspeciesMap.set(dss.name.toLowerCase(), { id: dss.id, name: dss.name, speciesId: mergedSpeciesMap.get(ds.name.toLowerCase())!.id });
          }
        });
      });
      defaultMutations.forEach(dm => {
        if (!mergedMutationsMap.has(dm.name.toLowerCase())) {
          mergedMutationsMap.set(dm.name.toLowerCase(), { id: dm.id, name: dm.name, inheritance: dm.inheritance });
        }
      });
    }

    // 2. Merge dynamic Wiki data from Firestore so it automatically populates globally
    wikiSpecies.forEach(ws => {
      const lowerName = ws.name.toLowerCase();
      if (!mergedSpeciesMap.has(lowerName)) {
        mergedSpeciesMap.set(lowerName, { id: ws.id, name: ws.name });
      }
      const resolvedSpeciesId = mergedSpeciesMap.get(lowerName)!.id;
      if (ws.subspecies && Array.isArray(ws.subspecies)) {
        ws.subspecies.forEach((sub: any) => {
          const subLower = sub.name.toLowerCase();
          if (!mergedSubspeciesMap.has(subLower)) {
            mergedSubspeciesMap.set(subLower, { 
              id: sub.id || `sub_${ws.id}_${sub.name.replace(/\s+/g, '_')}`, 
              name: sub.name, 
              speciesId: resolvedSpeciesId 
            });
          }
        });
      }
    });

    wikiMutations.forEach(wm => {
      const lowerName = wm.name.toLowerCase();
      if (!mergedMutationsMap.has(lowerName)) {
        mergedMutationsMap.set(lowerName, { 
          id: wm.id, 
          name: wm.name, 
          inheritance: wm.inheritance
        });
      }
    });

    effective.species = Array.from(mergedSpeciesMap.values());
    effective.subspecies = Array.from(mergedSubspeciesMap.values());
    effective.mutations = Array.from(mergedMutationsMap.values());

    return effective;
  }, [userSettings, wikiSpecies, wikiMutations]);
  
  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;
    if (isSubscriptionExpired(userSettings)) {
      toast.error("Your subscription has expired! Please renew to add or edit entries.");
      setDeleteConfirmation(null);
      return;
    }
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
    if (user && !loading) {
      const isCompleted = localStorage.getItem('averian_welcome_completed');
      if (!isCompleted) {
        setWalkthroughStep(1);
      }

      // Sync user profile immediately whenever user logs in or is present
      const userDocRef = doc(db, 'users', user.uid);
      const userSettingsDocRef = doc(db, 'userSettings', user.uid);
      const userProfileData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Breeder',
        photoURL: user.photoURL || '',
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setDoc(userDocRef, userProfileData, { merge: true }).catch(err => {
        console.warn("Could not sync user profile:", err);
      });

      setDoc(userSettingsDocRef, {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Breeder'
      }, { merge: true }).catch(err => {
        console.warn("Could not sync userSettings email:", err);
      });
    }
  }, [user, loading]);

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

    // Marketplace collections (cross-user)
    const qSellers = query(collection(db, 'sellerProfiles'), limit(100));
    const unsubSellers = onSnapshot(qSellers, (snapshot) => {
      setSellerProfiles(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SellerProfile)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sellerProfiles'));

    const qListings = query(collection(db, 'marketplaceListings'), limit(150));
    const unsubListings = onSnapshot(qListings, (snapshot) => {
      setMarketplaceListings(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MarketplaceListing)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'marketplaceListings'));

    const qReviews = query(collection(db, 'marketplaceReviews'), limit(100));
    const unsubReviews = onSnapshot(qReviews, (snapshot) => {
      setMarketplaceReviews(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MarketplaceReview)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'marketplaceReviews'));

    const qWikiSpecies = query(collection(db, 'wikiSpecies'), limit(100));
    const unsubWikiSpecies = onSnapshot(qWikiSpecies, (snapshot) => {
      setWikiSpecies(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (err) => console.error("Error fetching wikiSpecies:", err));

    const qWikiMutations = query(collection(db, 'wikiMutations'), limit(200));
    const unsubWikiMutations = onSnapshot(qWikiMutations, (snapshot) => {
      setWikiMutations(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (err) => console.error("Error fetching wikiMutations:", err));

    // Coming Soon / Feature Flags config subscription
    const unsubComingSoon = onSnapshot(doc(db, 'appConfig', 'comingSoon'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppComingSoonSettings;
        setComingSoonSettings(data);
        try {
          localStorage.setItem('averian_coming_soon_config', JSON.stringify(data));
        } catch (e) {
          console.warn('Failed to cache coming soon config', e);
        }
      }
    }, (err) => {
      console.warn("Coming soon config sync (offline fallback):", err);
    });

    const fixingSettings = new Set<string>();

    const docRef = doc(db, 'userSettings', user.uid);
    const unsubSettings = onSnapshot(docRef, (docSnap: any) => {
      setIsSyncing(docSnap.metadata.hasPendingWrites);
      
      if (docSnap.metadata.fromCache && !docSnap.exists()) {
        // In offline mode with no cached settings document yet, initialize a local fallback so the user isn't blocked on the loading spinner
        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 30);
        const fallbackSettings: UserSettings = {
          id: user.uid,
          species: [],
          subspecies: [],
          mutations: [],
          statuses: [
            { id: 'sold-default', name: 'Sold' },
            { id: 'deceased-default', name: 'Deceased' }
          ],
          uid: user.uid,
          currency: 'ZAR',
          account_expiry_date: trialExpiry.toISOString()
        };
        setUserSettings(fallbackSettings);
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
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Breeder',
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
      unsubSellers();
      unsubListings();
      unsubReviews();
      unsubWikiSpecies();
      unsubWikiMutations();
      unsubComingSoon();
    };
  }, [user, birdsLimit, cagesLimit, pairsLimit, breedingLimit, tasksLimit, transactionLimit, contactsLimit]);

  const handleUpdateComingSoonPageConfig = async (pageId: AppPageId, config: ComingSoonPageConfig) => {
    const updatedPages = {
      ...(comingSoonSettings?.pages || {}),
      [pageId]: {
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'admin'
      }
    };
    const updatedSettings: AppComingSoonSettings = {
      ...comingSoonSettings,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.email || 'admin'
    };

    // Optimistically update local state & localStorage
    setComingSoonSettings(updatedSettings);
    try {
      localStorage.setItem('averian_coming_soon_config', JSON.stringify(updatedSettings));
    } catch (e) {}

    // Persist to Firestore
    try {
      await setDoc(doc(db, 'appConfig', 'comingSoon'), updatedSettings, { merge: true });
    } catch (err: any) {
      console.error('Failed to update coming soon config in Firestore:', err);
      toast.error('Failed to save configuration: ' + err.message);
      throw err;
    }
  };

  useEffect(() => {
    if (!user) return;
    const processRecurring = async () => {
      try {
        const qRecurring = query(
          collection(db, 'transactions'),
          where('uid', '==', user.uid),
          where('recurring', 'in', ['Daily', 'Weekly', 'Monthly', 'Yearly'])
        );
        const snapshot = await getDocs(qRecurring);
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');

        const batchReq = writeBatch(db);
        let hasChanges = false;

        snapshot.docs.forEach(docSnap => {
          const t = { ...docSnap.data(), id: docSnap.id } as Transaction;
          if (t.nextDueDate && t.nextDueDate <= todayStr) {
            let nextD = parseISO(t.nextDueDate);
            let cycles = 0;
            // Generate up to today
            while (format(nextD, 'yyyy-MM-dd') <= todayStr && cycles < 300) {
              const newTransData = {
                ...t,
                date: format(nextD, 'yyyy-MM-dd'),
                recurring: 'None',
                recurringParentId: t.id
              };
              // @ts-ignore
              delete newTransData.id;
              delete newTransData.nextDueDate;
              
              const newDocRef = doc(collection(db, 'transactions'));
              batchReq.set(newDocRef, newTransData);
              hasChanges = true;

              if (t.recurring === 'Daily') nextD = addDays(nextD, 1);
              else if (t.recurring === 'Weekly') nextD = addDays(nextD, 7);
              else if (t.recurring === 'Monthly') nextD = addMonths(nextD, 1);
              else if (t.recurring === 'Yearly') nextD = addMonths(nextD, 12);
              else break;
              cycles++;
            }
            
            if (cycles > 0) {
              const parentRef = doc(db, 'transactions', t.id);
              batchReq.update(parentRef, { nextDueDate: format(nextD, 'yyyy-MM-dd') });
            }
          }
        });

        if (hasChanges) {
          await batchReq.commit();
        }
      } catch (err) {
        console.error("Failed to process recurring transactions:", err);
      }
    };
    
    // Slight delay to avoid blocking initial render
    const timeoutId = setTimeout(() => {
      processRecurring();
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [user]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    switch (activeTab) {
      case 'birds':
        return birds.filter(b => {
          const isExplicitMatch = query && (b.name.toLowerCase() === query || b.id.toLowerCase() === query);
          if (b.isGhost && !isExplicitMatch) return false;
          
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
        }).sort((a, b) => {
          const maleA = birds.find(x => x.id === a.maleId);
          const femaleA = birds.find(x => x.id === a.femaleId);
          const cageA = cages.find(c => c.id === a.cageId) || cages.find(c => c.id === maleA?.cageId) || cages.find(c => c.id === femaleA?.cageId);
          const cageNameA = cageA ? cageA.name : 'ZZZ';

          const maleB = birds.find(x => x.id === b.maleId);
          const femaleB = birds.find(x => x.id === b.femaleId);
          const cageB = cages.find(c => c.id === b.cageId) || cages.find(c => c.id === maleB?.cageId) || cages.find(c => c.id === femaleB?.cageId);
          const cageNameB = cageB ? cageB.name : 'ZZZ';

          if (cageNameA !== cageNameB) {
            return cageNameA.localeCompare(cageNameB, undefined, { numeric: true, sensitivity: 'base' });
          }
          const labelA = `${maleA?.name || ''} x ${femaleA?.name || ''}`;
          const labelB = `${maleB?.name || ''} x ${femaleB?.name || ''}`;
          return labelA.localeCompare(labelB, undefined, { numeric: true, sensitivity: 'base' });
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
    setQuickAddDialog({
      type: 'species',
      name,
    });
  };

  const handleAddSubSpecies = (name: string, speciesId?: string) => {
    setQuickAddDialog({
      type: 'subspecies',
      name,
      speciesId: speciesId || '',
    });
  };

  const handleAddMutation = (name: string) => {
    setQuickAddDialog({
      type: 'mutation',
      name,
      inheritance: '',
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

  const handleEditTransaction = React.useCallback((t: Transaction) => {
    setEditingItem(t);
    setIsModalOpen(true);
  }, []);

  const handleDeleteTransaction = React.useCallback((id: string) => {
    setDeleteConfirmation({
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction? This action cannot be undone.',
      onConfirm: async () => {
        try { await deleteDoc(doc(db, 'transactions', id)); }
        catch (e) { handleFirestoreError(e, OperationType.DELETE, 'transactions'); }
      }
    });
  }, [handleFirestoreError]);

  const handleEditBreeding = React.useCallback((r: BreedingRecord) => {
    setEditingItem(r);
    setIsModalOpen(true);
  }, []);

  const handleDeleteBreeding = React.useCallback((id: string) => {
    setDeleteConfirmation({
      title: 'Delete Breeding Record',
      message: 'Are you sure you want to delete this breeding record? This action cannot be undone.',
      onConfirm: async () => {
        try { await deleteDoc(doc(db, 'breedingRecords', id)); }
        catch (e) { handleFirestoreError(e, OperationType.DELETE, 'breedingRecords'); }
      }
    });
  }, [handleFirestoreError]);

  const handleNavigate = React.useCallback((tab: any, query: string = '', filter: { birdId?: string, pairId?: string } | null = null, isDirectNav: boolean = false) => {
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
  }, [activeTab, searchQuery, statsFilter]);

  const handleGoBack = React.useCallback(() => {
    if (navigationHistory) {
      const { tab, query, filter } = navigationHistory;
      setActiveTab(tab as any);
      setSearchQuery(query);
      setStatsFilter(filter);
      setNavigationHistory(null);
    } else {
      handleNavigate('birds', '', null, true);
    }
  }, [navigationHistory, handleNavigate]);

  const handleBirdRef = React.useCallback((birdName: string) => {
    handleNavigate('birds', birdName);
  }, [handleNavigate]);

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

  // Account Suspension / Ban Guard
  if (!isAdmin && (userSettings?.isBanned === true || (user as any)?.isBanned === true)) {
    return (
      <BannedUserScreen
        user={user}
        userSettings={userSettings}
        onLogout={logout}
      />
    );
  }

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

    const handleDeleteShared = () => {
      if (!user || user.uid !== sharedItemView.createdBy) {
        toast.error('You do not have permission to delete this shared item.');
        return;
      }
      setDeleteConfirmation({
        title: 'Delete Shared Link',
        message: 'Are you sure you want to delete this shared link? Others will no longer be able to import it.',
        onConfirm: async () => {
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
        }
      });
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
                    onClick={() => {
                        const urls = data.imageUrls || (data.imageUrl ? [data.imageUrl] : []);
                        if (urls.length > 0) setGalleryData({ urls, index: 0 });
                    }}
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
                    {[...cages].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

  const isCurrentTabComingSoon = activeTab !== 'admin' && activeTab !== 'subscription' && Boolean(comingSoonSettings?.pages?.[activeTab as AppPageId]?.enabled);
  const showComingSoonSplash = isCurrentTabComingSoon && (!isAdmin || isAdminPreviewMode);

  const getActivePageName = (tab: string) => {
    switch (tab) {
      case 'birds': return t('Birds');
      case 'cages': return t('Cages');
      case 'pairs': return t('Pairs');
      case 'breeding': return t('Breeding');
      case 'marketplace': return t('Classifieds & Marketplace');
      case 'financials': return t('Financials');
      case 'genetics': return t('Genetics Engine');
      case 'wiki': return t('Wiki & Guides');
      case 'tasks': return t('Tasks');
      case 'contacts': return t('Contacts & Support');
      case 'print': return t('Print Center');
      case 'pedigree': return t('Pedigree Tree');
      case 'stats': return t('Aviary Analytics');
      case 'settings': return t('Settings');
      case 'admin': return 'Averian Admin Portal';
      default: return tab.toUpperCase();
    }
  };

  const getActivePageIcon = (tab: string) => {
    switch (tab) {
      case 'birds': return <BirdIcon size={24} />;
      case 'cages': return <Home size={24} />;
      case 'pairs': return <Heart size={24} />;
      case 'breeding': return <Egg size={24} />;
      case 'marketplace': return <ShoppingBag size={24} />;
      case 'financials': return <DollarSign size={24} />;
      case 'genetics': return <Dna size={24} />;
      case 'wiki': return <BookOpen size={24} />;
      case 'tasks': return <CheckSquare size={24} />;
      case 'contacts': return <Users size={24} />;
      case 'print': return <QrCode size={24} />;
      case 'pedigree': return <FileText size={24} />;
      case 'stats': return <BarChart3 size={24} />;
      case 'settings': return <Tag size={24} />;
      default: return <Sparkles size={24} />;
    }
  };

  return (
    <SubscriptionGate settings={userSettings} onRenew={handleRenew}>
      <div className="bg-black text-white flex flex-col md:flex-row font-sans min-h-[100dvh]">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/80 z-[65] xl:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[70] w-64 bg-black border-r border-white/5 p-5 flex flex-col overflow-y-auto custom-scrollbar transition-transform duration-300 ease-in-out xl:sticky xl:top-0 xl:h-screen xl:translate-x-0 xl:z-40",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between px-1 mb-8 shrink-0">
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

        <nav className="flex flex-col relative mb-6">
          {!isExtrasMenuOpen ? (
            <div className="flex flex-col">
              <div className="space-y-1 flex flex-col">
                <NavItem active={activeTab === 'birds'} onClick={() => handleNavigate('birds', '', null, true)} icon={<BirdIcon size={18} />} label={t("Birds")} count={birds.length} isComingSoon={Boolean(comingSoonSettings?.pages?.birds?.enabled)} isAdmin={isAdmin} />
                <NavItem active={activeTab === 'cages'} onClick={() => handleNavigate('cages', '', null, true)} icon={<Home size={18} />} label={t("Cages")} count={cages.length} isComingSoon={Boolean(comingSoonSettings?.pages?.cages?.enabled)} isAdmin={isAdmin} />
                <NavItem active={activeTab === 'pairs'} onClick={() => handleNavigate('pairs', '', null, true)} icon={<Heart size={18} />} label={t("Pairs")} count={pairs.filter(p => birds.some(b => b.id === p.maleId) || birds.some(b => b.id === p.femaleId)).length} isComingSoon={Boolean(comingSoonSettings?.pages?.pairs?.enabled)} isAdmin={isAdmin} />
                <NavItem active={activeTab === 'breeding'} onClick={() => handleNavigate('breeding', '', null, true)} icon={<Egg size={18} />} label={t("Breeding")} count={breedingRecords.length} isComingSoon={Boolean(comingSoonSettings?.pages?.breeding?.enabled)} isAdmin={isAdmin} />
                <NavItem active={activeTab === 'marketplace'} onClick={() => handleNavigate('marketplace', '', null, true)} icon={<ShoppingBag size={18} />} label={t("Classifieds")} count={marketplaceListings.filter(l => l.status === 'active').length} isComingSoon={Boolean(comingSoonSettings?.pages?.marketplace?.enabled)} isAdmin={isAdmin} />
              </div>
              
              <div className="space-y-1 mt-2 pt-2 border-t border-white/5 flex flex-col shrink-0">
                <div className="px-1 mb-2">
                  <InstallAppButton variant="sidebar" />
                </div>
                <button 
                  onClick={() => setIsExtrasMenuOpen(true)}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-zinc-400 group-hover:text-white group-hover:bg-white/10 transition-colors">
                      <LayoutGrid size={18} />
                    </div>
                    <span className="text-sm font-semibold">More / Extras</span>
                  </div>
                  <ChevronRight size={16} className="text-zinc-500 group-hover:text-white" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col animate-in slide-in-from-right-4 duration-300">
              <button 
                onClick={() => setIsExtrasMenuOpen(false)}
                className="w-full flex items-center gap-2 p-2 mb-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold sticky top-0 bg-black z-10 border border-transparent hover:border-white/10"
              >
                <ChevronLeft size={18} className="text-zinc-500" />
                Back to Main Menu
              </button>

              <div className="space-y-1 flex flex-col">
                <NavItem active={activeTab === 'financials'} onClick={() => handleNavigate('financials', '', null, true)} icon={<DollarSign size={18} />} label={t("Financials")} count={transactions.length} isComingSoon={Boolean(comingSoonSettings?.pages?.financials?.enabled)} isAdmin={isAdmin} />
                <NavItem active={activeTab === 'genetics'} onClick={() => handleNavigate('genetics', '', null, true)} icon={<Dna size={18} />} label={t("Genetics")} count={0} isComingSoon={Boolean(comingSoonSettings?.pages?.genetics?.enabled)} isAdmin={isAdmin} />
                <NavItem active={activeTab === 'wiki'} onClick={() => handleNavigate('wiki', '', null, true)} icon={<BookOpen size={18} />} label={t("Wiki & Guides")} count={0} isComingSoon={Boolean(comingSoonSettings?.pages?.wiki?.enabled)} isAdmin={isAdmin} />
                <NavItem active={activeTab === 'tasks'} onClick={() => handleNavigate('tasks', '', null, true)} icon={<CheckSquare size={18} />} label={t("Tasks")} count={tasks.length} isComingSoon={Boolean(comingSoonSettings?.pages?.tasks?.enabled)} isAdmin={isAdmin} />
                <NavItem active={activeTab === 'contacts'} onClick={() => handleNavigate('contacts', '', null, true)} icon={<Users size={18} />} label={t("Contacts & Support")} count={contacts.length} isComingSoon={Boolean(comingSoonSettings?.pages?.contacts?.enabled)} isAdmin={isAdmin} />
                <NavItem active={activeTab === 'print'} onClick={() => handleNavigate('print', '', null, true)} icon={<QrCode size={18} />} label={t("Print")} count={0} isComingSoon={Boolean(comingSoonSettings?.pages?.print?.enabled)} isAdmin={isAdmin} />
                <NavItem active={activeTab === 'settings'} onClick={() => handleNavigate('settings', '', null, true)} icon={<Tag size={18} />} label={t("Settings")} count={0} isComingSoon={Boolean(comingSoonSettings?.pages?.settings?.enabled)} isAdmin={isAdmin} />
                {isAdmin && (
                  <NavItem 
                    active={activeTab === 'admin'} 
                    onClick={() => handleNavigate('admin', '', null, true)} 
                    icon={<Shield size={18} className={activeTab === 'admin' ? "text-amber-400" : "text-amber-400/70"} />} 
                    label="Admin Portal" 
                    count={sellerProfiles.filter(s => s.status === 'pending').length + marketplaceListings.filter(l => l.status === 'pending_approval').length} 
                  />
                )}
              </div>
            </div>
          )}
        </nav>

        <div className="pt-4 border-t border-white/5 space-y-3">
          <div className="px-1">
            <button 
              onClick={() => setWalkthroughStep(1)}
              className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg border border-gold-500/10 bg-gold-500/5 hover:bg-gold-500/10 hover:border-gold-500/20 text-[8px] text-zinc-400 hover:text-gold-500 transition-all uppercase tracking-wider font-extrabold cursor-pointer"
            >
              👑 <span className="tracking-widest">Help & Guide Tour</span>
            </button>
          </div>

          {/* Combined Status and User Info */}
          <div className="space-y-1.5 font-bold">
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
                <div className="flex items-center gap-1.5">
                  <p className="text-[9px] text-white/70 truncate uppercase font-bold tracking-tight">{user.email?.split('@')[0]}</p>
                  {isAdmin && (
                    <span className="text-[7px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded">
                      ADMIN
                    </span>
                  )}
                </div>
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
      <main className="flex-grow flex flex-col min-w-0 bg-black w-full overflow-x-hidden relative">
        <header className={cn("shrink-0 bg-black/80 backdrop-blur-md border-b border-black-800 px-4 xl:px-6 py-4 flex flex-col xl:flex-row xl:items-center justify-between sticky top-0 z-10 gap-4", activeTab === 'pedigree' && "hidden")}>
          <div className="flex items-center justify-between w-full xl:w-auto">
            <div className="flex items-center gap-3">
              <button className="xl:hidden p-2 -ml-2 text-black-50 hover:text-white" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={24} />
              </button>
              <h2 className="text-xl font-black uppercase tracking-widest text-white">
                {activeTab === 'print' ? t('Print Center') : 
                 activeTab === 'tasks' ? t('Tasks') : 
                 activeTab === 'genetics' ? t('Genetics Engine') : 
                 activeTab === 'settings' ? t('Settings') :
                 activeTab === 'birds' ? t('Birds') :
                 activeTab === 'cages' ? t('Cages') :
                 activeTab === 'pairs' ? t('Pairs') :
                 activeTab === 'breeding' ? t('Breeding') :
                 activeTab === 'financials' ? t('Financials') :
                 activeTab === 'contacts' ? t('Contacts & Support') :
                 activeTab === 'marketplace' ? t('Classifieds & Marketplace') :
                 activeTab === 'admin' ? 'Averian Admin Portal' :
                 activeTab === 'wiki' ? 'Wiki & Guides' :
                 activeTab}
              </h2>
            </div>
            {activeTab !== 'settings' && activeTab !== 'genetics' && activeTab !== 'stats' && activeTab !== 'print' && activeTab !== 'admin' && activeTab !== 'marketplace' && activeTab !== 'wiki' && !showComingSoonSplash && (
              <div className="flex items-center gap-1.5 xl:hidden">
                <button
                  onClick={() => setIsIncubationModalOpen(true)}
                  className={cn(
                    "p-2.5 rounded-xl border text-sm font-bold transition-all relative",
                    incubationReminders.filter(r => r.urgency === 'urgent' || r.urgency === 'today').length > 0
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white"
                  )}
                  title="Incubation Alerts"
                >
                  <Bell size={16} />
                  {incubationReminders.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-black text-[9px] font-black rounded-full flex items-center justify-center">
                      {incubationReminders.length}
                    </span>
                  )}
                </button>
                <InstallAppButton variant="header-mobile" />
                <Button onClick={() => setIsScanModalOpen(true)} className="py-2.5 px-3 text-sm font-bold bg-zinc-800 text-white hover:bg-zinc-700 hover:text-gold-500">
                  <Scan size={16} />
                </Button>
                <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="py-2.5 px-3 text-sm font-bold">
                  <Plus size={16} />
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
                Back to {navigationHistory.tab === 'birds' ? t('Birds') : t(navigationHistory.tab.charAt(0).toUpperCase() + navigationHistory.tab.slice(1))}
              </Button>
            )}
            {activeTab !== 'settings' && activeTab !== 'genetics' && activeTab !== 'stats' && activeTab !== 'print' && activeTab !== 'admin' && activeTab !== 'marketplace' && activeTab !== 'wiki' && !showComingSoonSplash && (
              <div className="relative flex-1 xl:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black-100" size={16} />
                <Input 
                  placeholder={`${t('Search')} ${t(activeTab.charAt(0).toUpperCase() + activeTab.slice(1))}...`} 
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
            
            {activeTab === 'tasks' && !showComingSoonSplash && (
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
            
            {activeTab !== 'financials' && activeTab !== 'stats' && activeTab !== 'tasks' && activeTab !== 'settings' && activeTab !== 'genetics' && activeTab !== 'print' && activeTab !== 'wiki' && activeTab !== 'admin' && !showComingSoonSplash && (
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
            
            {activeTab !== 'settings' && activeTab !== 'genetics' && activeTab !== 'stats' && activeTab !== 'print' && activeTab !== 'admin' && activeTab !== 'marketplace' && activeTab !== 'wiki' && !showComingSoonSplash && (
              <div className="hidden xl:flex gap-2 items-center">
                <button
                  onClick={() => setIsIncubationModalOpen(true)}
                  className={cn(
                    "py-3 px-4 rounded-xl border text-sm font-bold flex items-center gap-2 transition-all relative cursor-pointer",
                    incubationReminders.filter(r => r.urgency === 'urgent' || r.urgency === 'today').length > 0
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700"
                  )}
                  title="Incubation Alerts & Egg Milestones"
                >
                  <Bell size={17} className={incubationReminders.some(r => r.urgency === 'today' || r.urgency === 'urgent') ? "animate-bounce" : ""} />
                  <span>Incubation Alerts</span>
                  {incubationReminders.length > 0 && (
                    <span className="bg-amber-500 text-black text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {incubationReminders.length}
                    </span>
                  )}
                </button>
                <InstallAppButton variant="header" />
                <Button onClick={() => setIsScanModalOpen(true)} className="py-3 px-4 text-sm font-bold uppercase tracking-widest bg-zinc-800 text-secondary border border-secondary/20 hover:bg-zinc-700">
                  <Scan size={18} />
                  <span className="ml-2">Scan</span>
                </Button>
                <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="py-3 px-5 text-sm font-bold uppercase tracking-widest text-black">
                  <Plus size={18} />
                  <span className="ml-2">
                    {
                      activeTab === 'birds' ? t('Add Bird') : 
                      activeTab === 'cages' ? t('Add New') : 
                      activeTab === 'pairs' ? t('Add Pair') : 
                      activeTab === 'breeding' ? t('Add Record') : 
                      activeTab === 'tasks' ? t('Add Task') : 
                      activeTab === 'financials' ? t('Add Transaction') :
                      activeTab === 'contacts' ? t('Add New') :
                      t('Add New')
                    }
                  </span>
                </Button>
              </div>
            )}
          </div>
        </header>

        <InstallPromptBanner />

        {(!isOnline || isForcedOffline) && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-200 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <WifiOff size={15} className="text-amber-400 shrink-0" />
              <span>
                <strong className="text-amber-300">100% Offline Mode Active:</strong> All changes are safely saved locally to IndexedDB and will sync automatically when back online.
              </span>
            </div>
            {isForcedOffline && (
              <button 
                onClick={() => handleToggleForceOffline(false)}
                className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1 rounded border border-amber-500/30 cursor-pointer transition-colors"
              >
                Reconnect Online
              </button>
            )}
          </div>
        )}

        {isOnline && !isForcedOffline && isSyncing && (
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-2 flex items-center justify-between gap-3 text-xs text-blue-200 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <RefreshCw size={14} className="text-blue-400 animate-spin shrink-0" />
              <span>
                <strong className="text-blue-300">Syncing to Cloud:</strong> Uploading your local offline changes to the database...
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded">
              In Progress
            </span>
          </div>
        )}

        <div className={cn("custom-scrollbar", (activeTab === 'genetics' || activeTab === 'print' || activeTab === 'pedigree' || activeTab === 'marketplace' || showComingSoonSplash) ? "p-0" : "p-4 md:p-8")}>
          {isCurrentTabComingSoon && isAdmin && !isAdminPreviewMode && (
            <AdminPageTestingBanner
              pageId={activeTab as AppPageId}
              pageName={getActivePageName(activeTab)}
              config={comingSoonSettings?.pages?.[activeTab as AppPageId]}
              onPreviewAsUser={() => setIsAdminPreviewMode(true)}
              onLaunchLive={() => handleUpdateComingSoonPageConfig(activeTab as AppPageId, { ...(comingSoonSettings?.pages?.[activeTab as AppPageId] || {}), enabled: false })}
              onOpenConfigModal={() => setComingSoonConfigModal({
                isOpen: true,
                pageId: activeTab as AppPageId,
                pageName: getActivePageName(activeTab)
              })}
            />
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (showComingSoonSplash ? '-coming-soon' : '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {showComingSoonSplash ? (
                <ComingSoonView
                  pageId={activeTab as AppPageId}
                  pageName={getActivePageName(activeTab)}
                  icon={getActivePageIcon(activeTab)}
                  config={comingSoonSettings?.pages?.[activeTab as AppPageId]}
                  onNavigateHome={() => handleNavigate('birds', '', null, true)}
                  isAdmin={isAdmin}
                  isAdminPreviewMode={isAdmin && isAdminPreviewMode}
                  onExitAdminPreview={() => setIsAdminPreviewMode(false)}
                  onTogglePageComingSoon={(pId, enabled) => handleUpdateComingSoonPageConfig(pId, { ...(comingSoonSettings?.pages?.[pId] || {}), enabled })}
                />
              ) : (
                <div className={cn(
                  "grid gap-4",
                  activeTab === 'tasks' ? "max-w-4xl mx-auto w-full grid-cols-1" : 
                  activeTab === 'financials' || activeTab === 'stats' || activeTab === 'contacts' || activeTab === 'breeding' || activeTab === 'admin' || activeTab === 'wiki' ? "grid-cols-1 w-full max-w-7xl mx-auto" :
                  activeTab === 'genetics' || activeTab === 'print' || activeTab === 'pedigree' || activeTab === 'marketplace' ? "grid-cols-1 w-full" :
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
                            userSettings={effectiveSettings}
                            onBirdRef={handleBirdRef}
                            onNavigate={handleNavigate}
                            onEdit={() => { setEditingItem(bird); setIsModalOpen(true); }}
                            user={user}
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
                                  
                                  // Clean up images from storage
                                  if (bird.imageUrls && bird.imageUrls.length > 0) {
                                    for (const url of bird.imageUrls) {
                                      await deleteStorageFileIfApplicable(url);
                                    }
                                  } else if (bird.imageUrl) {
                                    await deleteStorageFileIfApplicable(bird.imageUrl);
                                  }
                                  // Clean up documents
                                  if (bird.documents && bird.documents.length > 0) {
                                    for (const doc of bird.documents) {
                                      await deleteStorageFileIfApplicable(doc.url);
                                    }
                                  }
                                  
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
                          <p className="text-black-100 font-black uppercase tracking-widest">{t('No birds found')}</p>
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
                                try { 
                                  await deleteDoc(doc(db, 'cages', cage.id)); 
                                  if (cage.imageUrls && cage.imageUrls.length > 0) {
                                    for (const url of cage.imageUrls) {
                                      await deleteStorageFileIfApplicable(url);
                                    }
                                  } else if (cage.imageUrl) {
                                    await deleteStorageFileIfApplicable(cage.imageUrl);
                                  }
                                }
                                catch (e) { handleFirestoreError(e, OperationType.DELETE, 'cages'); }
                              }
                            })}
                          />
                        ))
                      ) : (
                        <div className="col-span-full py-20 text-center bg-black-900/30 border border-dashed border-black-800 rounded-3xl">
                          <Home size={48} className="mx-auto text-black-300 mb-4" />
                          <p className="text-black-100 font-black uppercase tracking-widest">{t('No cages found')}</p>
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
                          <PairCard key={pair.id} pair={pair} male={birds.find(b => b.id === pair.maleId)} female={birds.find(b => b.id === pair.femaleId)} cages={cages} birds={birds} records={breedingRecords} currency={userSettings?.currency} viewMode={viewMode} onBirdRef={handleBirdRef} onNavigate={handleNavigate} userSettings={effectiveSettings}
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
                                  
                                  if (pair.imageUrls && pair.imageUrls.length > 0) {
                                    for (const url of pair.imageUrls) {
                                      await deleteStorageFileIfApplicable(url);
                                    }
                                  }
                                  
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
                          <p className="text-black-100 font-black uppercase tracking-widest">{t('No pairs found')}</p>
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
                          <p className="text-black-100 font-black uppercase tracking-widest">{t('No breeding records found')}</p>
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
                      pairs={pairs}
                      contacts={contacts}
                      cages={cages}
                      currency={userSettings?.currency}
                      onBirdRef={handleBirdRef}
                      onEditTransaction={handleEditTransaction}
                      onDeleteTransaction={handleDeleteTransaction}
                      userSettings={effectiveSettings ?? undefined}
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
                    onEditBreeding={handleEditBreeding}
                    onDeleteBreeding={handleDeleteBreeding}
                    onEditTransaction={handleEditTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                  />
                )}

                {activeTab === 'genetics' && (
                  <GeneticsCalculator userMutations={effectiveSettings?.mutations || []} birds={birds} pairs={pairs} cages={cages} />
                )}

                {activeTab === 'print' && (
                  <PrintView 
                    birds={birds} 
                    pairs={pairs} 
                    cages={cages} 
                    breedingRecords={breedingRecords} 
                    tasks={tasks} 
                    transactions={transactions} 
                    contacts={contacts} 
                    onBirdRef={handleBirdRef} 
                    userSettings={effectiveSettings ?? undefined} 
                  />
                )}

                {activeTab === 'pedigree' && (
                  <PedigreeFullView 
                    birdId={searchQuery} 
                    birds={birds} 
                    cages={cages} 
                    onBirdRef={handleBirdRef} 
                    onBack={handleGoBack} 
                    userSettings={effectiveSettings ?? undefined}
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
                                if (isSubscriptionExpired(userSettings)) {
                                  toast.error("Your subscription has expired! Please renew to add or edit entries.");
                                  return;
                                }
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
                            <p className="text-black-100 font-black uppercase tracking-widest">{t('No tasks found')}</p>
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
                      user={user}
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

                {activeTab === 'marketplace' && (
                  <MarketplaceView 
                    user={user}
                    userSettings={effectiveSettings}
                    birds={birds}
                    pairs={pairs}
                    cages={cages}
                    isAdmin={isAdmin}
                    sellerProfiles={sellerProfiles}
                    listings={marketplaceListings}
                    reviews={marketplaceReviews}
                    onNavigateToBird={(birdId) => handleNavigate('birds', birdId, null, true)}
                  />
                )}

                {activeTab === 'wiki' && (
                  <WikiView 
                    user={user}
                    isAdmin={isAdmin}
                    userSettings={effectiveSettings}
                    wikiSpecies={wikiSpecies}
                    wikiMutations={wikiMutations}
                  />
                )}

                {activeTab === 'admin' && isAdmin && (
                  <AdminDashboardView 
                    user={user}
                    userSettings={effectiveSettings}
                    birds={birds}
                    cages={cages}
                    pairs={pairs}
                    breedingRecords={breedingRecords}
                    transactions={transactions}
                    tasks={tasks}
                    contacts={contacts}
                    sellerProfiles={sellerProfiles}
                    marketplaceListings={marketplaceListings}
                    marketplaceReviews={marketplaceReviews}
                    isOnline={isOnline}
                    isForcedOffline={isForcedOffline}
                    onToggleForceOffline={handleToggleForceOffline}
                    comingSoonSettings={comingSoonSettings}
                    onUpdateComingSoonPageConfig={handleUpdateComingSoonPageConfig}
                    onNavigateToTab={(tab) => handleNavigate(tab, '', null, true)}
                  />
                )}
              </div>
            )}
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
            userSettings={effectiveSettings}
            onAddSpecies={handleAddSpecies}
            onAddSubSpecies={handleAddSubSpecies}
            onAddMutation={handleAddMutation}
            onAddStatus={handleAddStatus}
            onClose={() => setIsModalOpen(false)} 
          />
        )}
        {activeTab === 'cages' && <CageForm user={user} initialData={editingItem} cages={cages} onClose={() => setIsModalOpen(false)} userSettings={effectiveSettings ?? undefined} />}
        {activeTab === 'pairs' && <PairForm user={user} initialData={editingItem} birds={birds} cages={cages} onClose={() => setIsModalOpen(false)} userSettings={effectiveSettings ?? undefined} />}
        {activeTab === 'breeding' && <BreedingRecordForm user={user} initialData={editingItem} pairs={pairs} birds={birds} cages={cages} onClose={() => setIsModalOpen(false)} userSettings={effectiveSettings ?? undefined} />}
        {activeTab === 'tasks' && <TaskForm user={user} initialData={editingItem} birds={birds} cages={cages} onClose={() => setIsModalOpen(false)} userSettings={effectiveSettings ?? undefined} />}
        {activeTab === 'financials' && <TransactionForm user={user} initialData={editingItem} birds={birds} pairs={pairs} cages={cages} contacts={contacts} currency={userSettings?.currency} onClose={() => setIsModalOpen(false)} userSettings={effectiveSettings ?? undefined} />}
        {activeTab === 'contacts' && <ContactForm user={user} initialData={editingItem} onClose={() => setIsModalOpen(false)} userSettings={effectiveSettings ?? undefined} />}
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
        {quickAddDialog && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-black border border-gold-500/30 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden"
              style={{ backgroundColor: 'var(--theme-card-color, #121212)' }}
            >
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-gold-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <h4 className="text-sm font-black uppercase tracking-widest text-gold-500 mb-4 flex items-center gap-2">
                <span>✨ Quick Add {quickAddDialog.type === 'subspecies' ? 'Sub-Species' : quickAddDialog.type === 'species' ? 'Species' : 'Mutation'}</span>
              </h4>

              <div className="space-y-4">
                {/* Name input */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-black-200 uppercase tracking-widest ml-1">Name</label>
                  <Input 
                    value={quickAddDialog.name} 
                    onChange={e => setQuickAddDialog({ ...quickAddDialog, name: e.target.value })}
                    placeholder={`Enter ${quickAddDialog.type} name...`}
                    onKeyDown={async e => {
                      if (e.key === 'Enter') {
                        document.getElementById('quick-add-submit-btn')?.click();
                      }
                    }}
                    autoFocus
                  />
                </div>

                {/* Mutation inheritance select dropdown */}
                {quickAddDialog.type === 'mutation' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-black-200 uppercase tracking-widest ml-1">Inheritance</label>
                    <Select 
                      value={quickAddDialog.inheritance || ''} 
                      onChange={e => setQuickAddDialog({ ...quickAddDialog, inheritance: e.target.value as any })}
                    >
                      <option value="" className="bg-black text-white">None (Select in Calculator)</option>
                      <option value="autosomal_recessive" className="bg-black text-white">Recessive</option>
                      <option value="autosomal_dominant" className="bg-black text-white">Dominant</option>
                      <option value="incomplete_dominant" className="bg-black text-white">Incomplete Dominant</option>
                      <option value="sex_linked_recessive" className="bg-black text-white">Sex-linked Recessive</option>
                    </Select>
                  </div>
                )}

                {/* Subspecies parent species select dropdown */}
                {quickAddDialog.type === 'subspecies' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-black-200 uppercase tracking-widest ml-1">Parent Species</label>
                    <Select 
                      value={quickAddDialog.speciesId || ''} 
                      onChange={e => setQuickAddDialog({ ...quickAddDialog, speciesId: e.target.value })}
                    >
                      <option value="" className="bg-black text-white">Select Parent Species</option>
                      {/* Show both default and custom species! */}
                      {(() => {
                        const list = [...(userSettings?.species || [])];
                        if (userSettings?.useDefaultData !== false) {
                          defaultSpecies.forEach(ds => {
                            if (!list.some(s => s.name.toLowerCase() === ds.name.toLowerCase() || s.id === ds.id)) {
                              list.push({ id: ds.id, name: ds.name });
                            }
                          });
                        }
                        return list.map(s => <option key={s.id} value={s.id} className="bg-black text-white">{s.name}</option>);
                      })()}
                    </Select>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button onClick={() => setQuickAddDialog(null)} variant="ghost" className="flex-1 uppercase font-bold text-[10px] tracking-widest">
                    Cancel
                  </Button>
                  <Button 
                    id="quick-add-submit-btn"
                    onClick={async () => {
                      if (isSubscriptionExpired(userSettings)) {
                        toast.error("Your subscription has expired! Please renew to add or edit entries.");
                        setQuickAddDialog(null);
                        return;
                      }
                      if (!quickAddDialog.name.trim()) {
                        toast.error("Name is required.");
                        return;
                      }
                      if (quickAddDialog.type === 'subspecies' && !quickAddDialog.speciesId) {
                        toast.error("Parent Species is required.");
                        return;
                      }

                      if (!userSettings) return;

                      let updatedSettings = { ...userSettings };
                      
                      if (quickAddDialog.type === 'mutation') {
                        const newMut: Mutation = {
                          id: crypto.randomUUID(),
                          name: quickAddDialog.name.trim(),
                          inheritance: quickAddDialog.inheritance || undefined
                        };
                        updatedSettings.mutations = [...(userSettings.mutations || []), newMut];
                        toast.success(`Added mutation "${quickAddDialog.name}"`);
                      } else if (quickAddDialog.type === 'species') {
                        const newSpec: Species = {
                          id: crypto.randomUUID(),
                          name: quickAddDialog.name.trim()
                        };
                        updatedSettings.species = [...(userSettings.species || []), newSpec];
                        toast.success(`Added species "${quickAddDialog.name}"`);
                      } else if (quickAddDialog.type === 'subspecies') {
                        const newSub: SubSpecies = {
                          id: crypto.randomUUID(),
                          name: quickAddDialog.name.trim(),
                          speciesId: quickAddDialog.speciesId!
                        };
                        updatedSettings.subspecies = [...(userSettings.subspecies || []), newSub];
                        toast.success(`Added sub-species "${quickAddDialog.name}"`);
                      }

                      await handleUpdateSettings(updatedSettings);
                      setQuickAddDialog(null);
                    }} 
                    className="flex-1 uppercase bg-gold-500 hover:bg-gold-600 text-black font-black text-[10px] tracking-widest"
                  >
                    Save & Add
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {galleryData && (
          <ImageGallery 
            imageUrls={galleryData.urls} 
            initialIndex={galleryData.index} 
            onClose={() => setGalleryData(null)} 
          />
        )}

        <AnimatePresence>
          {walkthroughStep !== null && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            >
            {walkthroughStep === 1 && (
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="w-full max-w-lg bg-zinc-950 border border-gold-500/20 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col items-center text-center gap-5"
              >
                {/* Gold Glow Aura */}
                <div className="absolute -top-12 -left-12 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-500/5 border border-gold-500/30 flex items-center justify-center text-gold-500 shadow-lg shadow-gold-500/10">
                  <span className="text-3xl animate-bounce">👑</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">Welcome to The Averian</h3>
                  <p className="text-xs font-bold text-gold-500/80 uppercase tracking-widest">Premium Avian Husbandry Platform</p>
                </div>

                <p className="text-xs text-zinc-400 font-medium leading-relaxed max-w-sm">
                  We are thrilled to accompany you on your breeding journey. Before storing your critical aviary logs and records, please accept our standard Terms of Use & Breeder Disclaimer below to protect both parties:
                </p>

                {/* Terms Scrollable Text Box */}
                <div className="w-full text-left bg-black/60 border border-zinc-800 p-4 rounded-xl max-h-36 overflow-y-auto text-zinc-400 text-[10px] space-y-2 select-text font-mono">
                  <p className="text-white font-extrabold uppercase text-[11px] tracking-wide mb-1">TERMS OF USE & BREEDER DISCLAIMER</p>
                  <p>1. <strong>Provided "As-Is":</strong> The Averian application, including its genetics calculators, financial estimators, and aviary tools, is provided to users strictly "as-is". No guarantees are made concerning its merchantability or fitness for breeding outcomes.</p>
                  <p>2. <strong>Limitation of Liability:</strong> In no event shall the developers, founders, or affiliates of The Averian be liable for any direct, indirect, incidental, or consequential damages. This includes, but is not limited to: loss of livestock (birds, eggs, offspring), medical or veterinary costs, aviary financial losses, user entry errors, or inaccurate genetics predictions.</p>
                  <p>3. <strong>Genetics Calculator Guidance:</strong> All computed mutation outcomes, inheritance models, and pairing percentages are mathematically expected probabilities. Nature is variable and actual outcomes can differ.</p>
                  <p>4. <strong>Data Management:</strong> The user is solely responsible for maintaining accurate breeding records.</p>
                </div>

                {/* Acceptance Checkbox */}
                <label className="flex items-start gap-2.5 text-left w-full mt-1 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4.5 h-4.5 accent-gold-500 rounded border-zinc-800 bg-zinc-900 cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-zinc-300 group-hover:text-white transition-colors">
                    I accept and agree to the Terms of Use, Privacy Policy, and Veterinary Disclaimer.
                  </span>
                </label>

                <div className="w-full space-y-2 pt-2">
                  <button
                    onClick={() => {
                      if (!acceptedTerms) {
                        toast.error("Please accept the Terms of Use and Disclaimer to continue.");
                        return;
                      }
                      setWalkthroughStep(2);
                    }}
                    disabled={!acceptedTerms}
                    className={`w-full py-3.5 bg-gold-500 hover:bg-gold-600 active:scale-[0.98] text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg shadow-gold-500/20 cursor-pointer flex items-center justify-center gap-2 ${!acceptedTerms ? 'opacity-40 cursor-not-allowed filter grayscale' : ''}`}
                  >
                    Accept & Continue
                  </button>
                  <button
                    onClick={() => {
                      toast.info("Terms must be accepted to use The Averian. You can review this anytime.");
                    }}
                    className="w-full py-1.5 text-zinc-600 hover:text-zinc-500 font-bold uppercase text-[9px] tracking-widest transition-colors cursor-pointer"
                  >
                    Why do I need to agree?
                  </button>
                </div>
              </motion.div>
            )}

            {walkthroughStep === 2 && (
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="w-full max-w-lg bg-zinc-950 border border-gold-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-[0_0_60px_rgba(212,175,55,0.25)] flex flex-col gap-6 text-center items-center"
              >
                {/* Visual Aura */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-gold-500/5 border border-gold-500/40 flex items-center justify-center text-gold-400 shadow-xl">
                  <CreditCard size={32} className="animate-pulse" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">Your 1-Month Free Trial Is Active!</h3>
                  <p className="text-[10px] font-black text-gold-500 uppercase tracking-widest">Premium Yearly Membership Trial</p>
                </div>

                <div className="space-y-4 max-w-md text-zinc-300">
                  <p className="text-xs sm:text-sm font-medium leading-relaxed">
                    You will be given a <strong className="text-gold-400">1-Month Free Trial</strong> to fully experience our first-class breeder management tools. Afterward, you will need to buy a yearly membership to continue tracking records.
                  </p>

                  <div className="p-4 bg-gold-500/5 rounded-2xl border border-gold-500/20 text-xs text-gold-200/90 leading-relaxed font-bold italic shadow-inner">
                    "This helps us deliver the best world class support and up-to-date features and store your information securely and encrypted for your eyes only online."
                  </div>
                </div>

                {/* HIGHLIGHTED YEARLY MEMBERSHIP BUTTON */}
                <div className="w-full pt-1">
                  <button
                    onClick={() => {
                      setActiveTab('subscription');
                      setWalkthroughStep(3);
                      toast.success("Navigated to subscription area! Let's preview your plan details.");
                    }}
                    className="w-full py-4.5 bg-gradient-to-r from-amber-500 via-gold-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-[0_0_30px_rgba(212,175,55,0.4)] border-2 border-white/20 active:scale-95 cursor-pointer relative group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      👑 HIGHLIGHTED MEMBERSHIP PLAN 👑
                    </span>
                  </button>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1.5 animate-pulse">Click directly to explore secure payment & subscription setups</p>
                </div>

                <div className="w-full flex justify-between gap-3 border-t border-white/5 pt-4">
                  <button
                    onClick={() => setWalkthroughStep(1)}
                    className="px-4 py-2 text-zinc-400 hover:text-white font-black uppercase text-[10px] tracking-widest transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setWalkthroughStep(3)}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest rounded-lg border border-white/10 transition-all cursor-pointer"
                  >
                    Next: Support Guide
                  </button>
                </div>
              </motion.div>
            )}

            {walkthroughStep === 3 && (
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="w-full max-w-lg bg-zinc-950 border border-gold-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.2)] flex flex-col gap-6"
              >
                {/* Crimson & Gold Aura */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                  <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-500 shrink-0">
                    <Info size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight">Need Help & Support?</h3>
                    <p className="text-[10px] font-bold text-gold-500/80 uppercase tracking-wider">Official Service Desk Contacts</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                    We have pinned this support card under the <strong className="text-white">Contacts & Support</strong> tab where you can access these 24/7 details:
                  </p>

                  <div className="space-y-2 pt-1">
                    {/* WhatsApp Support Item */}
                    <a
                      href="https://wa.me/27739586177"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between p-3 bg-black/40 border border-white/5 hover:border-emerald-500/30 rounded-2xl transition-all hover:bg-zinc-900/60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                          <MessageCircle size={16} />
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] font-black uppercase text-white/90">WhatsApp Support</p>
                          <p className="text-[9px] text-zinc-500 font-bold">+27 73 958 6177</p>
                        </div>
                      </div>
                      <span className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black px-2 py-1 rounded-md transition-all">Chat Live</span>
                    </a>

                    {/* Email Support Item */}
                    <a
                      href="mailto:theaveriansupport@gmail.com"
                      className="group flex items-center justify-between p-3 bg-black/40 border border-white/5 hover:border-gold-500/30 rounded-2xl transition-all hover:bg-zinc-900/60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gold-500/10 rounded-xl text-gold-500 group-hover:bg-gold-500 group-hover:text-black transition-all">
                          <Mail size={16} />
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] font-black uppercase text-white/90">Email Support</p>
                          <p className="text-[9px] text-zinc-500 font-bold">theaveriansupport@gmail.com</p>
                        </div>
                      </div>
                      <span className="text-[8px] font-black uppercase bg-gold-500/10 text-gold-500 group-hover:bg-gold-500 group-hover:text-black px-2 py-1 rounded-md transition-all">Send Mail</span>
                    </a>

                    {/* YouTube Video Playlist Support Item */}
                    <a
                      href="https://www.youtube.com/playlist?list=PLtNEv-kj7DgU1j1o2HybU4Ge4NzMiSVMu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between p-3 bg-black/40 border border-white/5 hover:border-rose-500/30 rounded-2xl transition-all hover:bg-zinc-900/60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500 group-hover:bg-rose-500 group-hover:text-black transition-all">
                          <Video size={16} />
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] font-black uppercase text-white/90">Video Tutorials</p>
                          <p className="text-[9px] text-zinc-500 font-bold">Watch Playlist on YouTube</p>
                        </div>
                      </div>
                      <span className="text-[8px] font-black uppercase bg-rose-500/10 text-rose-500 group-hover:bg-rose-500 group-hover:text-black px-2 py-1 rounded-md transition-all">Watch Playlist</span>
                    </a>
                  </div>
                </div>

                <div className="flex justify-between gap-3 pt-2">
                  <button
                    onClick={() => setWalkthroughStep(2)}
                    className="px-4 py-2 text-zinc-400 hover:text-white font-black uppercase text-[10px] tracking-widest transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem('averian_welcome_completed', 'true');
                      setWalkthroughStep(null);
                      toast.success("Ready! Welcome to your premium breeder suite.");
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-600 hover:to-amber-600 text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg shadow-gold-500/20 text-center cursor-pointer flex-1"
                  >
                    Finish & Start Breeding
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {comingSoonConfigModal && (
        <AdminComingSoonModal
          isOpen={comingSoonConfigModal.isOpen}
          pageId={comingSoonConfigModal.pageId}
          pageName={comingSoonConfigModal.pageName}
          initialConfig={comingSoonSettings?.pages?.[comingSoonConfigModal.pageId]}
          onClose={() => setComingSoonConfigModal(null)}
          onSave={async (pId, newCfg) => {
            await handleUpdateComingSoonPageConfig(pId, newCfg);
            toast.success(`Updated Coming Soon settings for "${comingSoonConfigModal.pageName}"`);
          }}
        />
      )}

      <IncubationAlertsModal
        isOpen={isIncubationModalOpen}
        onClose={() => setIsIncubationModalOpen(false)}
        reminders={incubationReminders}
        isPermissionGranted={isNotifGranted}
        isPermissionSupported={isNotifSupported}
        onRequestPermission={enableNotifications}
        isRequesting={isRequestingNotifs}
        onNavigateToBreeding={() => setActiveTab('breeding')}
      />



      <Toaster theme="dark" position="top-center" richColors />
      </div>
    </SubscriptionGate>
  );
}

// --- Sub-components ---

function NavItem({ 
  active, 
  onClick, 
  icon, 
  label, 
  count, 
  isComingSoon, 
  isAdmin 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string; 
  count: number;
  isComingSoon?: boolean;
  isAdmin?: boolean;
}) {
  return (
    <button onClick={onClick} className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all group relative', active ? 'bg-secondary text-black-950 shadow-lg shadow-secondary/20' : 'text-black-50 hover:bg-black-900 hover:text-secondary')}>
      <span className={cn('transition-transform group-hover:scale-110 shrink-0', active ? 'text-black-950' : 'text-black-100 group-hover:text-secondary')}>
        {icon}
      </span>
      <span className="flex-1 text-left uppercase tracking-widest text-[10px] truncate">{label}</span>
      {isComingSoon ? (
        <span className={cn(
          'text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0',
          isAdmin 
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        )}>
          {isAdmin ? '🚧 SOON' : 'SOON'}
        </span>
      ) : (
        <span className={cn('text-[10px] px-2 py-0.5 rounded-lg font-black', active ? 'bg-black/20 text-black' : 'bg-zinc-800 text-white/50 group-hover:text-secondary')}>{count}</span>
      )}
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
  const t = (text: string) => getTranslatedLabel(text, userSettings?.language || 'en');
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
               <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest text-white leading-none">{t('Family Tree')}</h2>
               <p className="text-gold-500 font-bold uppercase tracking-widest text-[9px] sm:text-xs mt-1 flex items-center gap-1.5 opacity-80">
                 <div className="w-1.5 h-1.5 rounded-full bg-gold-500" />
                 {bird.name}
               </p>
            </div>
         </div>
         <div className="flex items-center gap-2">
           <button onClick={() => bird && generateCertificatePDF([bird], birds)} className="h-9 w-9 flex items-center justify-center bg-zinc-900 border border-white/5 hover:bg-gold-500 hover:text-black hover:border-gold-500 text-white rounded-xl transition-all shadow-lg active:scale-95">
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

function BirdCard({ bird, cage, birds, cages, viewMode = 'grid-large', currency, onBirdRef, onNavigate, onEdit, onDelete, userSettings, user }: { bird: Bird, cage?: Cage, birds: Bird[], cages: Cage[], viewMode?: 'grid-large' | 'list', currency?: string, onBirdRef: (name: string) => void, onNavigate: (tab: string, query?: string, filter?: any) => void, onEdit: () => void, onDelete: () => void, userSettings?: UserSettings, user: FirebaseUser | null }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const symbol = getCurrencySymbol(currency);
  const offspring = birds.filter(b => b.motherId === bird.id || b.fatherId === bird.id || bird.offspringIds?.includes(b.id));

  const mother = birds.find(b => b.id === bird.motherId);
  const father = birds.find(b => b.id === bird.fatherId);
  const mate = birds.find(b => b.id === bird.mateId) || birds.find(b => b.mateId === bird.id);

  const effectiveViewMode = (viewMode === 'list' && isExpanded) ? 'grid-large' : viewMode;
  const imageUrls = bird.imageUrls?.length ? bird.imageUrls : (bird.imageUrl ? [bird.imageUrl] : []);
  const coverImage = imageUrls[0] || null;

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
      {coverImage && effectiveViewMode !== 'list' && (
        <div 
          className={cn("w-full overflow-hidden bg-black aspect-[4/3] cursor-pointer relative")}
          onClick={(e) => { e.stopPropagation(); setShowGallery(true); }}
        >
          <img 
            src={coverImage} 
            alt={bird.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black-950 via-transparent to-transparent opacity-60" />
          {imageUrls.length > 1 && (
            <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg flex items-center gap-1.5 text-white/90">
              <ImageIcon size={12} />
              <span className="text-[10px] font-black">{imageUrls.length}</span>
            </div>
          )}
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
                {tGlobal(bird.sex)}
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
            {bird.splitMutations?.map(m => <Badge key={m} className="bg-zinc-700 border-black-700 text-gold-500 italic text-[9px] px-1.5 py-0">{tGlobal('Split')} {m}</Badge>)}
            {bird.statuses?.map(s => <Badge key={s} className="bg-blue-900/40 border-blue-800 text-blue-200 text-[9px] px-1.5 py-0 shadow-sm">{tGlobal(s)}</Badge>)}
          </div>
        ) : null}

        {/* 4. Other Info (Cage, Born, Mate) */}
        <div className={cn(
          "text-[10px] sm:text-[11px] border-t border-black-800/50 pt-2", 
          effectiveViewMode === 'list' ? "flex flex-wrap items-center gap-x-6 gap-y-2" : "grid grid-cols-2 gap-3"
        )}>
          <div className={cn(effectiveViewMode === 'list' ? "flex items-center gap-2" : "space-y-0.5")}>
            <p className="text-white uppercase tracking-widest font-black text-[8px]">{tGlobal('Cage')}{effectiveViewMode === 'list' ? ':' : ''}</p>
            {cage ? (
              <button onClick={(e) => { e.stopPropagation(); onNavigate('birds', cage.name); }} className="text-white font-bold flex items-center gap-1.5 hover:text-secondary transition-colors">
                <Home size={10} className="text-secondary" /> {cage.name}
              </button>
            ) : (
              <p className="text-white font-bold flex items-center gap-1.5"><Home size={10} className="text-secondary" /> {tGlobal('Unassigned')}</p>
            )}
          </div>
          <div className={cn(effectiveViewMode === 'list' ? "flex items-center gap-2" : "space-y-0.5")}>
            <p className="text-white uppercase tracking-widest font-black text-[8px]">{tGlobal('Born')}{effectiveViewMode === 'list' ? ':' : ''}</p>
            <p className="text-white font-bold flex items-center gap-1.5"><Calendar size={10} className="text-secondary" /> {bird.birthDate || tGlobal('Unknown')}</p>
          </div>
          <div className={cn(effectiveViewMode === 'list' ? "flex items-center gap-2" : "space-y-0.5")}>
            <p className="text-white uppercase tracking-widest font-black text-[8px]">{tGlobal('Value')}{effectiveViewMode === 'list' ? ':' : ''}</p>
            <p className="text-secondary font-bold flex items-center gap-1.5">{symbol}{(bird.estimatedValue || bird.purchasePrice || 0).toFixed(2)}</p>
          </div>
          <div className={cn(effectiveViewMode === 'list' ? "flex items-center gap-2 flex-1" : "col-span-2 space-y-1.5 pt-1 w-full")}>
              <p className="text-white uppercase tracking-widest font-black text-[8px]">{tGlobal('Mate')}{effectiveViewMode === 'list' ? ':' : ''}</p>
              {mate ? (
                <BirdCompactInfo bird={mate} cages={cages} onClick={() => onBirdRef(mate.name)} />
              ) : (
                <p className="text-white/30 italic text-[10px]">{tGlobal('No mate assigned')}</p>
              )}
            </div>
        </div>
        <div className="pt-2 border-t border-black-800/50">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }} 
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all border border-black-700"
          >
            <MoreHorizontal size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">{tGlobal('Actions')}</span>
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
                    className="flex-1 p-2 bg-secondary/10 border border-secondary/20 rounded-lg text-[10px] text-secondary font-black uppercase tracking-widest hover:bg-secondary/20 transition-colors flex items-center justify-center gap-2 min-w-[90px]"
                  >
                    <Egg size={12} className="text-secondary" />
                    {tGlobal('Breeding')}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsPassportOpen(true); }} 
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 rounded-lg transition-all border border-gold-500/30 min-w-[90px]"
                    title="1-Click Digital Transfer Passport"
                  >
                    <Send size={13} className="text-gold-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Passport</span>
                  </button>
                  <button 
                    onClick={handleShare} 
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white hover:text-secondary rounded-lg transition-all border border-black-700 min-w-[70px]"
                  >
                    <Share2 size={13} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{tGlobal('Share')}</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowDocs(true); }} 
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white hover:text-secondary rounded-lg transition-all border border-black-700 min-w-[70px]"
                  >
                    <FileText size={13} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{tGlobal('Docs')}</span>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onNavigate('pedigree', bird.id); }} 
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-xl transition-all border border-secondary/20 group/btn min-w-[80px]"
                  >
                    <GitBranch size={16} className="group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{tGlobal('Pedigree')}</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all border border-black-700 group/btn min-w-[80px]"
                  >
                    <Edit2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{tGlobal('Edit')}</span>
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
                    <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{tGlobal('Delete')}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Share Bird"> 
          <ShareBirdModal bird={bird} mother={mother} father={father} mate={mate} offspring={offspring} cages={cages} cageName={cage?.name} onClose={() => setIsShareModalOpen(false)} /> 
        </Modal> 
        <Modal isOpen={isPassportOpen} onClose={() => setIsPassportOpen(false)} title={`Digital Transfer Passport`}>
          <DigitalTransferPassportModal
            bird={bird}
            allBirds={birds}
            cages={cages}
            currentUserId={user.uid}
            onClose={() => setIsPassportOpen(false)}
          />
        </Modal>
        <Modal isOpen={showDocs} onClose={() => setShowDocs(false)} title={`Documents - ${bird.name}`}> 
          <BirdDocumentsModal bird={bird} onClose={() => setShowDocs(false)} user={user} /> 
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
        {showGallery && imageUrls.length > 0 && (
          <ImageGallery 
            imageUrls={imageUrls} 
            initialIndex={0} 
            onClose={() => setShowGallery(false)} 
          />
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
          {cage.width && cage.height && cage.depth && (
            <div className={cn(effectiveViewMode === 'list' ? "flex items-center gap-2" : "col-span-2 space-y-1 border-t border-black-800/40 pt-2")}>
              <p className="text-white uppercase tracking-widest font-black text-[9px]">Dimensions{effectiveViewMode === 'list' ? ':' : ''}</p>
              <p className="text-white font-bold">
                {cage.width}W × {cage.height}H × {cage.depth}D ({cage.dimensionUnit || 'cm'})
              </p>
            </div>
          )}
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
  const [isPassportOpen, setIsPassportOpen] = useState(false);
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

          <div className="grid grid-cols-5 gap-1.5">
            <button 
              onClick={(e) => { e.stopPropagation(); onNavigate('stats', '', { pairId: pair.id }); }} 
              className="flex flex-col items-center justify-center py-2 bg-secondary/5 hover:bg-secondary/10 text-secondary rounded-xl border border-secondary/10 transition-all active:scale-95"
              title="Breeding"
            >
              <Egg size={13} />
              <span className="text-[7px] font-black uppercase mt-1">Breeding</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsPassportOpen(true); }} 
              className="flex flex-col items-center justify-center py-2 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 rounded-xl border border-gold-500/30 transition-all active:scale-95"
              title="1-Click Digital Transfer Passport"
            >
              <Send size={13} />
              <span className="text-[7px] font-black uppercase mt-1">Passport</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsShareModalOpen(true); }} 
              className="flex flex-col items-center justify-center py-2 bg-zinc-800/50 hover:bg-zinc-700 text-white/60 rounded-xl border border-white/5 transition-all active:scale-95"
              title="Share"
            >
              <Share2 size={13} />
              <span className="text-[7px] font-black uppercase mt-1">Share</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }} 
              className="flex flex-col items-center justify-center py-2 bg-zinc-800/50 hover:bg-zinc-700 text-white/60 rounded-xl border border-white/5 transition-all active:scale-95"
              title="Edit"
            >
              <Edit2 size={13} />
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
              <Trash2 size={13} />
              <span className="text-[7px] font-black uppercase mt-1">Delete</span>
            </button>
          </div>
        </div>
      </div>
      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Share Pair"> 
        <SharePairModal pair={pair} male={male} female={female} birds={birds} records={records || []} onClose={() => setIsShareModalOpen(false)} /> 
      </Modal> 
      <Modal isOpen={isPassportOpen} onClose={() => setIsPassportOpen(false)} title={`Digital Transfer Passport - Pair`}>
        <DigitalTransferPassportModal
          pair={pair}
          male={male}
          female={female}
          allBirds={birds}
          cages={cages}
          records={records || []}
          currentUserId={pair.uid || ''}
          onClose={() => setIsPassportOpen(false)}
        />
      </Modal> 
    </Card>
  );
}

function FinancialsView({ 
  transactions, 
  birds, 
  pairs,
  contacts,
  cages,
  currency, 
  onBirdRef, 
  onEditTransaction, 
  onDeleteTransaction,
  userSettings
}: { 
  transactions: Transaction[], 
  birds: Bird[], 
  pairs: Pair[],
  contacts: Contact[],
  cages: Cage[],
  currency?: string, 
  onBirdRef: (name: string) => void, 
  onEditTransaction: (t: Transaction) => void, 
  onDeleteTransaction: (id: string) => void,
  userSettings?: UserSettings
}) {
  const symbol = getCurrencySymbol(currency);
  const t = (text: string) => getTranslatedLabel(text, userSettings?.language || 'en');
  const [clickedTotal, setClickedTotal] = useState<'profit' | 'income' | 'expense' | 'stock' | null>(null);

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
    
    // Active stock: living birds (not sold, not deceased, not ghost)
    const activeBirds = birds.filter(b => !b.isGhost && !b.statuses?.some(s => s === 'Sold' || s === 'Deceased'));
    const totalStockValue = activeBirds.reduce((acc, b) => acc + (b.estimatedValue || b.purchasePrice || 0), 0);
    const totalStockCost = activeBirds.reduce((acc, b) => acc + (b.purchasePrice || 0), 0);
    
    // Date tracking span
    const dates = transactions.map(t => new Date(t.date).getTime()).filter(t => !isNaN(t));
    const nowStamp = Date.now();
    const minDateMs = dates.length ? Math.min(...dates) : nowStamp - (1000 * 60 * 60 * 24 * 30);
    const daysSpan = Math.max(1, (nowStamp - minDateMs) / (1000 * 60 * 60 * 24));

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netProfit: income - expenses,
      totalStockValue,
      totalStockCost,
      activeBirdsCount: activeBirds.length,
      daysSpan
    };
  }, [transactions, birds]);

  const getModalContent = () => {
    if (!clickedTotal) return null;

    let modalTitle = '';
    let overallVal = 0;
    let description = '';
    let showStockDetails = false;

    if (clickedTotal === 'profit') {
      modalTitle = t('Net Profit Breakdown');
      overallVal = stats.netProfit;
      description = t('Net Profit reflects total cash income minus total expenses recorded in your transactions.');
    } else if (clickedTotal === 'income') {
      modalTitle = t('Total Income Breakdown');
      overallVal = stats.totalIncome;
      description = t('Total Income is the sum of all sales, client rewards, and related revenues.');
    } else if (clickedTotal === 'expense') {
      modalTitle = t('Total Expenses Breakdown');
      overallVal = stats.totalExpenses;
      description = t('Total Expenses represents feed cost, equipment purchases, and bird acquisitions.');
    } else if (clickedTotal === 'stock') {
      modalTitle = t('Total Stock Value Breakdown');
      overallVal = stats.totalStockValue;
      description = t('Stock Value represents the asset valuation of your active, living breeding stock.');
      showStockDetails = true;
    }

    const daily = overallVal / stats.daysSpan;
    const weekly = daily * 7;
    const monthly = daily * 30.4375;
    const yearly = daily * 365;

    return (
      <div className="space-y-6">
        <p className="text-xs text-white/60 leading-relaxed font-semibold bg-white/5 p-4 rounded-2xl border border-white/10">{description}</p>
        
        {/* Highlight Card */}
        <div className="p-6 bg-gradient-to-br from-gold-500/10 via-transparent to-transparent border border-gold-500/20 rounded-2xl text-center space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-gold-500">
            {clickedTotal === 'stock' ? t('Current Stock Value') : t('Total Accumulation')}
          </p>
          <p className="text-3xl font-black text-white tracking-tighter">{symbol}{overallVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          {clickedTotal !== 'stock' && (
            <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest leading-none mt-2">
              {t('Parsed over')} {stats.daysSpan.toFixed(0)} {t('days of activity')}
            </p>
          )}
        </div>

        {/* Breakdown Grid / Spans */}
        {clickedTotal !== 'stock' && (
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Periodic Projections & Averages')}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-zinc-900 border border-black-800 rounded-xl space-y-1">
                <p className="text-[9px] text-white/50 font-black uppercase tracking-widest">{t('Daily Average')}</p>
                <p className="text-lg font-black text-white">{symbol}{daily.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-4 bg-zinc-900 border border-black-800 rounded-xl space-y-1">
                <p className="text-[9px] text-white/50 font-black uppercase tracking-widest">{t('Weekly Average')}</p>
                <p className="text-lg font-black text-white">{symbol}{weekly.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-4 bg-zinc-900 border border-black-800 rounded-xl space-y-1">
                <p className="text-[9px] text-white/50 font-black uppercase tracking-widest">{t('Monthly Average')}</p>
                <p className="text-lg font-black text-white">{symbol}{monthly.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="p-4 bg-zinc-900 border border-black-800 rounded-xl space-y-1">
                <p className="text-[9px] text-white/50 font-black uppercase tracking-widest">{t('Yearly Projection')}</p>
                <p className="text-lg font-black text-white">{symbol}{yearly.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        )}

        {/* Extra Stock Specific Stats */}
        {showStockDetails && (
          <div className="p-4 bg-zinc-900 border border-black-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-black-800 pb-2">
              <h4 className="text-[10px] font-black text-gold-500 uppercase tracking-widest">{t('Active Inventory Metrics')}</h4>
              <Badge className="bg-gold-500 text-black px-2 py-0.5 font-bold text-[9px] rounded-lg">{stats.activeBirdsCount} {t('Birds in Stock')}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-xs font-semibold text-white/90">
              <div className="flex items-center justify-between sm:col-span-1">
                <span className="text-white/40 font-bold uppercase text-[9px] tracking-widest">{t('Average Bird Value')}:</span>
                <span className="font-extrabold">{symbol}{(stats.totalStockValue / Math.max(1, stats.activeBirdsCount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between sm:col-span-1">
                <span className="text-white/40 font-bold uppercase text-[9px] tracking-widest">{t('Total Asset Cost')}:</span>
                <span className="font-extrabold">{symbol}{stats.totalStockCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between col-span-full border-t border-black-800/50 pt-2">
                <span className="text-white/40 font-bold uppercase text-[9px] tracking-widest">{t('Net Unrealized Appreciation')}:</span>
                <span className="font-extrabold text-emerald-400">+{symbol}{Math.max(0, stats.totalStockValue - stats.totalStockCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between col-span-full">
                <span className="text-white/40 font-bold uppercase text-[9px] tracking-widest">{t('Value Growth %')}:</span>
                <span className="font-extrabold text-emerald-400">
                  {stats.totalStockCost > 0 ? ((stats.totalStockValue - stats.totalStockCost) / stats.totalStockCost * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>
          </div>
        )}

        <Button onClick={() => setClickedTotal(null)} className="w-full py-4 text-xs font-bold font-mono tracking-widest uppercase">
          {t('Close Detail View')}
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
        {/* Net Profit Card */}
        <Card 
          onClick={() => setClickedTotal('profit')}
          className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between min-w-0 cursor-pointer hover:border-gold-500 hover:scale-[1.02] active:scale-[0.98] transition-all group duration-300"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest mr-2">{t('Net Profit')}</p>
            <TrendingUp size={16} className="shrink-0 transition-transform group-hover:scale-110" style={{ color: stats.netProfit >= 0 ? '#34d399' : 'var(--theme-delete-color, #ef4444)' }} />
          </div>
          <div>
            <p className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tighter break-all">{symbol}{stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-[8px] sm:text-[9px] text-white/50 mt-1 font-bold uppercase tracking-tighter">{t('Averages & ROI Breakdown')}</p>
          </div>
        </Card>

        {/* Total Income Card */}
        <Card 
          onClick={() => setClickedTotal('income')}
          className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between min-w-0 cursor-pointer hover:border-emerald-500 hover:scale-[1.02] active:scale-[0.98] transition-all group duration-300"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest mr-2">{t('Total Income')}</p>
            <ArrowUpRight size={16} className="text-emerald-400 shrink-0 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </div>
          <div>
            <p className="text-lg sm:text-xl md:text-2xl font-black text-emerald-500 tracking-tighter break-all">{symbol}{stats.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-[8px] sm:text-[9px] text-white/50 mt-1 font-bold uppercase tracking-tighter">{t('View Period Averages')}</p>
          </div>
        </Card>

        {/* Total Expenses Card */}
        <Card 
          onClick={() => setClickedTotal('expense')}
          className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between min-w-0 cursor-pointer hover:border-red-500 hover:scale-[1.02] active:scale-[0.98] transition-all group duration-300"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest mr-2">{t('Total Expenses')}</p>
            <ArrowDownRight size={16} className="shrink-0 transition-transform group-hover:translate-x-1 group-hover:translate-y-1" style={{ color: 'var(--theme-delete-color, #ef4444)' }} />
          </div>
          <div>
            <p className="text-lg sm:text-xl md:text-2xl font-black tracking-tighter break-all" style={{ color: 'var(--theme-delete-color, #ef4444)' }}>{symbol}{stats.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-[8px] sm:text-[9px] text-white/50 mt-1 font-bold uppercase tracking-tighter">{t('View Period Averages')}</p>
          </div>
        </Card>

        {/* Total Stock Value Card */}
        <Card 
          onClick={() => setClickedTotal('stock')}
          className="p-4 sm:p-5 bg-zinc-800 border-black-700 flex flex-col justify-between min-w-0 cursor-pointer hover:border-sky-500 hover:scale-[1.02] active:scale-[0.98] transition-all group duration-300"
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest mr-2">{t('Total Stock Value')}</p>
            <BirdIcon size={16} className="text-sky-400 shrink-0 transition-transform group-hover:scale-110" />
          </div>
          <div>
            <p className="text-lg sm:text-xl md:text-2xl font-black text-sky-400 tracking-tighter break-all">{symbol}{stats.totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-[8px] sm:text-[9px] text-white/50 mt-1 font-bold uppercase tracking-tighter">{t('Active Valuation Details')}</p>
          </div>
        </Card>
      </div>

      {/* Breakdown Details Modal */}
      <Modal 
        isOpen={clickedTotal !== null} 
        onClose={() => setClickedTotal(null)} 
        title={clickedTotal === 'profit' ? t('Net Profit Breakdown') : clickedTotal === 'income' ? t('Total Income Breakdown') : clickedTotal === 'expense' ? t('Total Expenses Breakdown') : t('Total Stock Value Breakdown')}
      >
        {getModalContent()}
      </Modal>

      {/* Transactions List */}
      <div className="flex flex-col space-y-4 w-full">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-white uppercase tracking-widest text-sm">{t('Recent Transactions')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
          {transactions.map(t => (
            <TransactionCard 
              key={t.id} 
              transaction={t} 
              bird={birds.find(b => b.id === t.birdId)}
              pair={pairs.find(p => p.id === t.pairId)}
              contact={contacts.find(c => c.id === t.contactId)}
              cages={cages}
              birds={birds}
              onBirdRef={onBirdRef}
              onEdit={() => onEditTransaction(t)}
              onDelete={() => onDeleteTransaction(t.id)}
              viewMode="list"
              currency={currency}
            />
          ))}
          {transactions.length === 0 && (
            <div className="col-span-full text-center py-12 bg-black/50 border border-dashed border-black-700 rounded-2xl">
              <Activity size={32} className="mx-auto text-white mb-2" />
              <p className="text-white text-sm font-bold uppercase tracking-widest">{t('No transactions found')}</p>
            </div>
          )}
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
    const birdValue = relevantBirds.reduce((acc, b) => acc + (b.estimatedValue || b.purchasePrice || 0), 0);
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
      inventoryValue: birdValue,
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
                <p className="text-[7px] text-white/40 font-bold uppercase tracking-widest leading-tight">{tGlobal('Purchase Price')}: {symbol}{stats.totalBirdCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
              {filteredTransactions.map(t => (
                <TransactionCard 
                  key={t.id} 
                  transaction={t} 
                  bird={birds.find(b => b.id === t.birdId)}
                  pair={pairs.find(p => p.id === t.pairId)}
                  contact={contacts.find(c => c.id === t.contactId)}
                  cages={cages}
                  birds={birds}
                  onBirdRef={onBirdRef}
                  onEdit={() => onEditTransaction(t)}
                  onDelete={() => onDeleteTransaction(t.id)}
                  viewMode="list"
                  currency={currency}
                />
              ))}
              {filteredTransactions.length === 0 && (
                <div className="col-span-full text-center py-12 bg-black/50 border border-dashed border-black-700 rounded-2xl">
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

function TransactionCard({ transaction, bird, pair, contact, cages, birds, currency, onBirdRef, onEdit, onDelete, viewMode = 'list' }: { transaction: Transaction, bird?: Bird, pair?: Pair, contact?: Contact, cages: Cage[], birds?: Bird[], currency?: string, onBirdRef: (name: string) => void, onEdit: () => void, onDelete: () => void, viewMode?: 'grid-large' | 'list' }) {
  const [showDetails, setShowDetails] = useState(false);
  const symbol = getCurrencySymbol(currency);

  const catInfo = useMemo(() => {
    const cat = transaction.category.toLowerCase();
    if (cat.includes('sale') || cat.includes('sold') || cat.includes('revenue')) {
      return { icon: '💰', label: 'Bird Sale', style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' };
    } else if (cat.includes('feed') || cat.includes('seed') || cat.includes('food') || cat.includes('nutrition')) {
      return { icon: '🌾', label: 'Feed & Nutrition', style: 'bg-amber-500/10 text-amber-400 border-amber-505/25' };
    } else if (cat.includes('vet') || cat.includes('med') || cat.includes('health') || cat.includes('treatment')) {
      return { icon: '🏥', label: 'Veterinary / Medical', style: 'bg-rose-500/10 text-rose-400 border-rose-500/25' };
    } else if (cat.includes('test') || cat.includes('dna') || cat.includes('sexing')) {
      return { icon: '🧬', label: 'DNA & Sexing', style: 'bg-teal-500/10 text-teal-400 border-teal-505/25' };
    } else if (cat.includes('cage') || cat.includes('equipment') || cat.includes('nest') || cat.includes('ring') || cat.includes('toy')) {
      return { icon: '⚙️', label: 'Equipment & Cages', style: 'bg-sky-500/10 text-sky-400 border-sky-505/25' };
    } else if (cat.includes('buy') || cat.includes('purchase') || cat.includes('acquisition') || cat.includes('import')) {
      return { icon: '🕊️', label: 'Acquisition', style: 'bg-indigo-500/10 text-indigo-400 border-indigo-505/25' };
    } else {
      return transaction.type === 'Income'
        ? { icon: '📈', label: 'Other Income', style: 'bg-emerald-500/10 text-emerald-400 border-emerald-505/25' }
        : { icon: '📉', label: 'Other Expense', style: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    }
  }, [transaction.category, transaction.type]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Card 
        onClick={() => setShowDetails(true)}
        className="p-4 flex flex-col gap-3 sm:gap-4 group border-zinc-800 hover:border-gold-500/50 bg-zinc-900 hover:bg-zinc-950/40 transition-all cursor-pointer relative"
      >
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border text-lg shadow-inner",
              catInfo.style
            )}>
              <span>{catInfo.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-white uppercase tracking-wider text-[10px] sm:text-xs truncate">{catInfo.label}</span>
                <Badge variant="neutral" className="bg-zinc-950 border border-zinc-850 text-white/50 text-[8px] uppercase tracking-widest">{transaction.category}</Badge>
                {transaction.recurring && transaction.recurring !== 'None' && (
                  <Badge variant="info" className="text-[7px] sm:text-[8px] bg-sky-500/10 text-sky-400 border-sky-500/20 flex items-center gap-0.5">
                    <RefreshCw size={8} className="animate-spin-slow" />
                    {transaction.recurring}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-white/70 truncate font-semibold mt-1 uppercase max-w-xs">{transaction.description || 'No Description Attached'}</p>
            </div>
          </div>

          <div className="text-left xs:text-right shrink-0 mt-1 xs:mt-0">
            <p 
              className="font-black tracking-tighter truncate text-sm sm:text-base md:text-lg leading-none"
              style={{ color: transaction.type === 'Income' ? '#10b981' : 'var(--theme-delete-color, #ef4444)' }}
            >
              {transaction.type === 'Income' ? '+' : '-'}{symbol}{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[8px] sm:text-[9px] text-white/40 font-bold uppercase tracking-widest mt-1">{format(new Date(transaction.date), 'MMM dd, yyyy')}</p>
          </div>
        </div>

        {/* Display linked entities compactly inside card for neat visuals */}
        {(bird || pair || contact) && (
          <div className="flex flex-col gap-1 pt-2 border-t border-zinc-850 min-w-0">
            {bird && (
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 truncate" onClick={e => e.stopPropagation()}>
                <span className="text-[9px] uppercase font-bold text-zinc-500 whitespace-nowrap">Linked Bird:</span>
                <span onClick={() => onBirdRef(bird.name)} className="text-gold-500 font-black hover:underline cursor-pointer truncate">{bird.name}</span>
                <span className="text-[8px] px-1 bg-zinc-950 border border-zinc-800 rounded text-zinc-400 uppercase tracking-tight">{bird.ringNumber}</span>
              </div>
            )}
            {pair && birds && (
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 truncate">
                <Heart size={10} className="text-rose-500 shrink-0 animate-pulse" />
                <span className="text-[9px] uppercase font-bold text-zinc-500 whitespace-nowrap">Breeding Pair:</span>
                <span className="text-white/80 font-bold truncate">
                  {birds.find(b => b.id === pair.maleId)?.name || 'Male'} × {birds.find(b => b.id === pair.femaleId)?.name || 'Female'}
                </span>
              </div>
            )}
            {contact && (
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 truncate">
                <User size={10} className="text-secondary shrink-0" />
                <span className="text-[9px] uppercase font-bold text-zinc-500 whitespace-nowrap">Contact Partner:</span>
                <span className="text-white font-bold">{contact.name}</span>
                <Badge variant="warning" className="text-[7px] bg-secondary/15 text-secondary">{contact.type}</Badge>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-850/60" onClick={e => e.stopPropagation()}>
          <button 
            type="button"
            onClick={() => setShowDetails(true)} 
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-all border border-zinc-750 text-[9px] font-black uppercase tracking-widest"
          >
            <Eye size={12} />
            <span>Details</span>
          </button>
          <button 
            type="button"
            onClick={onEdit} 
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white hover:text-secondary rounded-lg transition-all border border-zinc-750 text-[9px] font-black uppercase tracking-widest"
          >
            <Edit2 size={12} />
            <span>Edit</span>
          </button>
          <button 
            type="button"
            onClick={onDelete} 
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all border text-[9px] font-black uppercase tracking-widest"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 90%)',
              color: 'var(--theme-delete-color, #ef4444)',
              borderColor: 'color-mix(in srgb, var(--theme-delete-color, #ef4444), transparent 80%)'
            }}
          >
            <Trash2 size={12} />
            <span>Delete</span>
          </button>
        </div>
      </Card>

      {/* Transaction Detail Ledger / Receipt Overlay */}
      {showDetails && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gold-500 block leading-none mb-1">Accounting Ledger</span>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Transaction Detail</h4>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white/50 hover:text-white rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Receipt Content */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-white">
              <div className="p-5 bg-zinc-900 border border-zinc-850 rounded-[2rem] text-center space-y-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: transaction.type === 'Income' ? '#10b981' : 'var(--theme-delete-color, #ef4444)' }} />
                
                <div className={cn(
                  "w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl border shadow-lg mt-1",
                  catInfo.style
                )}>
                  {catInfo.icon}
                </div>

                <div>
                  <h5 className="text-[10px] font-black uppercase text-white/40 tracking-widest">{transaction.category}</h5>
                  <h3 
                    className="text-2xl sm:text-3xl font-black tracking-tight mt-1"
                    style={{ color: transaction.type === 'Income' ? '#10b981' : 'var(--theme-delete-color, #ef4444)' }}
                  >
                    {transaction.type === 'Income' ? '+' : '-'}{symbol}{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h3>
                  <Badge variant="neutral" className="bg-black/40 text-zinc-400 border-zinc-800 text-[8px] uppercase tracking-widest mt-2">{transaction.type}</Badge>
                </div>
              </div>

              {/* Ledger Breakdown Fields */}
              <div className="space-y-3 text-xs uppercase font-bold tracking-wider">
                <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                  <span className="text-white/40 text-[10px]">Reference ID</span>
                  <span className="font-mono text-zinc-300 text-[10px]">{transaction.id}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                  <span className="text-white/40 text-[10px]">Posting Date</span>
                  <span className="text-white">{format(new Date(transaction.date), 'MMMM dd, yyyy')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                  <span className="text-white/40 text-[10px]">Recurring Cycle</span>
                  <Badge variant="info" className="text-[8px] bg-sky-500/15 text-sky-400 border border-sky-500/25">
                    {transaction.recurring || 'None'}
                  </Badge>
                </div>

                {transaction.description && (
                  <div className="py-2 space-y-1">
                    <span className="text-white/40 text-[10px] block">Ledger Specification / Comment</span>
                    <div className="p-3 bg-black border border-zinc-850 rounded-xl text-[11px] text-zinc-300 leading-normal capitalize font-normal">
                      {transaction.description}
                    </div>
                  </div>
                )}

                {/* Linked Objects */}
                {(bird || pair || contact) && (
                  <div className="py-3 mt-2 border-t border-zinc-900 space-y-3">
                    <span className="text-white/40 text-[10px] block font-black text-gold-500 uppercase tracking-widest mb-1">Linked Registry Entity</span>
                    
                    {bird && (
                      <div className="flex items-center gap-3 p-3 bg-black rounded-xl border border-zinc-850">
                        <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 shrink-0">
                          <BirdIcon size={16} className="text-gold-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p onClick={() => { setShowDetails(false); onBirdRef(bird.name); }} className="text-xs font-black text-white leading-tight uppercase hover:underline cursor-pointer truncate">{bird.name}</p>
                          <p className="text-[10px] text-white/40 mt-0.5 truncate font-bold font-mono">RING: {bird.ringNumber}</p>
                        </div>
                      </div>
                    )}

                    {pair && birds && (
                      <div className="flex items-center gap-3 p-3 bg-black rounded-xl border border-zinc-850">
                        <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 shrink-0">
                          <Heart size={16} className="text-rose-500" />
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-xs font-black text-white leading-tight uppercase truncate">
                            Pair Breeding Registry
                          </p>
                          <p className="text-[10px] text-white/50 mt-0.5 font-bold truncate">
                            {birds.find(b => b.id === pair.maleId)?.name || 'Male'} × {birds.find(b => b.id === pair.femaleId)?.name || 'Female'}
                          </p>
                        </div>
                      </div>
                    )}

                    {contact && (
                      <div className="flex items-center gap-3 p-3 bg-black rounded-xl border border-zinc-850">
                        <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 shrink-0">
                          <User size={16} className="text-secondary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-white leading-tight uppercase truncate">{contact.name}</p>
                          <p className="text-[10px] text-white/40 mt-0.5 truncate font-normal normal-case">{contact.email || contact.phone || 'No direct info address'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions Footer inside Dialogue */}
            <div className="p-5 border-t border-zinc-800 bg-zinc-950 flex gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5"
              >
                <Printer size={12} /> Print Spec
              </button>
              <button
                type="button"
                onClick={() => { setShowDetails(false); onEdit(); }}
                className="flex-1 px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5"
              >
                <Edit2 size={12} /> Edit
              </button>
              <button
                type="button"
                onClick={() => { setShowDetails(false); onDelete(); }}
                className="px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 text-red-400 rounded-xl flex items-center justify-center"
              >
                <Trash2 size={14} />
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

function BreedingRecordCard({ record, pair, male, female, birds, onEdit, onDelete, onBirdRef, viewMode = 'grid-large' }: { record: BreedingRecord, pair?: Pair, male?: Bird, female?: Bird, birds: Bird[], onEdit: () => void, onDelete: () => void, onBirdRef: (name: string) => void, viewMode?: 'grid-large' | 'list' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCandlingEgg, setActiveCandlingEgg] = useState<{ egg: EggType; index: number } | null>(null);
  const effectiveViewMode = (viewMode === 'list' && isExpanded) ? 'grid-large' : viewMode;

  const species = female?.species || male?.species || '';
  const speciesPresets = getSpeciesIncubation(species);

  // Auto update egg in firestore
  const handleUpdateCandledEgg = async (updates: Partial<EggType>) => {
    if (!activeCandlingEgg) return;
    const currentEggs = record.eggs || [];
    const newEggs = [...currentEggs];
    newEggs[activeCandlingEgg.index] = { ...newEggs[activeCandlingEgg.index], ...updates };

    const laid = newEggs.length;
    const hatched = newEggs.filter(e => ['Hatched', 'Died', 'Weaned'].includes(e.status)).length;
    const weaned = newEggs.filter(e => e.status === 'Weaned').length;

    try {
      await updateDoc(doc(db, 'breedingRecords', record.id), {
        eggs: newEggs,
        eggsLaid: laid,
        eggsHatched: hatched,
        chicksWeaned: weaned
      });
    } catch (err) {
      console.error('Failed to update candled egg:', err);
    }
  };

  const addLocalTaskAutomatically = async (title: string, date: string, description: string = '') => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error('Log in to save tasks to your Aviary Chores automatically!');
      return;
    }
    try {
      const docRef = doc(collection(db, 'tasks'));
      await setDoc(docRef, {
        title,
        description,
        status: 'Pending',
        priority: 'Medium',
        category: 'Incubation',
        dueDate: date,
        birdIds: [],
        subTasks: [],
        uid: currentUser.uid,
        createdAt: new Date().toISOString()
      });
      toast.success('Task successfully created in your Aviary Chores!');
    } catch (err) {
      console.error('Failed to auto-add local task:', err);
      toast.error('Failed to save task locally');
    }
  };

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
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Egg Log ({record.eggs.length})</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gold-500/10 text-gold-400 border border-gold-500/20">
                      Smart Candling Enabled
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-white/50" /> : <ChevronDown size={16} className="text-white/50" />}
              </button>
            )}

            {/* Expanded Egg Log */}
            {isExpanded && record.eggs && record.eggs.length > 0 && (
              <div className="space-y-3 pt-2 animate-in slide-in-from-top-2">
                 {record.eggs.map((egg, index) => {
                   const timeline = computeEggTimeline(egg, record.incubationDays, record.ringingDays, species);
                   const expectedHatchDate = egg.laidDate ? format(addDays(parseISO(egg.laidDate), record.incubationDays || 21), 'yyyy-MM-dd') : null;
                   const ringingDate = egg.actualHatchDate ? format(addDays(parseISO(egg.actualHatchDate), record.ringingDays || 7), 'yyyy-MM-dd') : null;

                   return (
                     <div key={egg.id} className="p-3.5 bg-black rounded-xl border border-zinc-800 space-y-3">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="text-xs font-mono text-white/50 font-bold">#{index + 1}</div>
                              <div className="flex flex-col">
                                <span className="text-[8px] text-white/30 uppercase font-black tracking-widest leading-none mb-1">Laid Date</span>
                                <span className="text-[11px] text-white font-bold">{egg.laidDate || 'Unknown'}</span>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <button
                               onClick={() => setActiveCandlingEgg({ egg, index })}
                               className="px-2.5 py-1 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 border border-gold-500/30 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                             >
                               <Flame size={10} />
                               Candle / Status
                             </button>
                             <Badge 
                               variant={egg.status === 'Hatched' || egg.status === 'Weaned' ? 'success' : (egg.status === 'Laid' || egg.status === 'Fertile' ? 'info' : 'neutral')}
                               className="text-[8px] font-black py-0.5 px-2"
                             >
                               {egg.status}
                             </Badge>
                           </div>
                        </div>

                        {/* Live Incubation Stage Indicator */}
                        {timeline && (egg.status === 'Laid' || egg.status === 'Fertile') && (
                          <div className="space-y-1.5 p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-zinc-400 font-bold uppercase tracking-wider">
                                Incubation: Day {Math.max(0, timeline.daysSinceLaid)} / {timeline.actualIncubation}d
                              </span>
                              <span className={cn("font-black uppercase tracking-wider", timeline.daysUntilHatch <= 0 ? "text-emerald-400" : "text-amber-400")}>
                                {timeline.daysUntilHatch > 0 ? `${timeline.daysUntilHatch}d to hatch` : timeline.daysUntilHatch === 0 ? 'Hatching Today!' : 'Overdue'}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${timeline.progressPct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {(egg.status === 'Laid' || egg.status === 'Fertile') && expectedHatchDate && (
                          <div className="flex items-center justify-between p-2 bg-gold-500/5 rounded-lg border border-gold-500/10">
                             <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <Egg size={10} className="text-secondary" />
                                  <span className="text-[8px] text-secondary uppercase font-black tracking-widest">Expected Hatch</span>
                                </div>
                                <span className="text-[11px] text-white font-mono ml-4">{expectedHatchDate}</span>
                             </div>
                             <button 
                               type="button"
                               onClick={() => {
                                 const eventTitle = `Expected Hatch: Egg #${index + 1} (${male?.name || 'Sire'} × ${female?.name || 'Dam'})`;
                                 const eventDate = expectedHatchDate;
                                 const eventDesc = `Expected hatching of Egg #${index + 1} under Pair: ${male?.name || 'Sire'} x ${female?.name || 'Dam'}`;
                                 const url = generateGoogleCalendarUrl(eventTitle, eventDate, eventDesc);
                                 if (url) {
                                   window.open(url, '_blank', 'noopener,noreferrer');
                                   toast.success('Opening Google Calendar & automatically adding task locally!');
                                 }
                                 addLocalTaskAutomatically(eventTitle, eventDate, eventDesc);
                               }}
                               className="p-1.5 bg-secondary/10 text-secondary hover:bg-secondary/20 rounded-md transition-colors cursor-pointer"
                               title="Add Hatch Reminder & Task"
                             >
                               <Bell size={12} />
                             </button>
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
                             <button 
                               type="button"
                               onClick={() => {
                                 const eventTitle = `Ringing Reminder: Egg #${index + 1} (${male?.name || 'Sire'} × ${female?.name || 'Dam'})`;
                                 const eventDate = ringingDate;
                                 const eventDesc = `Ringing reminder for chick #${index + 1} of Pair: ${male?.name || 'Sire'} x ${female?.name || 'Dam'}`;
                                 const url = generateGoogleCalendarUrl(eventTitle, eventDate, eventDesc);
                                 if (url) {
                                   window.open(url, '_blank', 'noopener,noreferrer');
                                   toast.success('Opening Google Calendar & automatically adding task locally!');
                                 }
                                 addLocalTaskAutomatically(eventTitle, eventDate, eventDesc);
                               }}
                               className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-md transition-colors cursor-pointer"
                               title="Add Ringing Reminder & Task"
                             >
                               <Bell size={12} />
                             </button>
                          </div>
                        )}
                     </div>
                   );
                 })}
              </div>
            )}
        </div>

        {/* Smart Candling Modal */}
        {activeCandlingEgg && (
          <Modal
            isOpen={!!activeCandlingEgg}
            onClose={() => setActiveCandlingEgg(null)}
            title={`Smart Candling & Countdown`}
          >
            <SmartCandlingModal
              egg={activeCandlingEgg.egg}
              eggIndex={activeCandlingEgg.index}
              record={record}
              pair={pair}
              male={male}
              female={female}
              onUpdateEgg={handleUpdateCandledEgg}
              onClose={() => setActiveCandlingEgg(null)}
              onAddLocalTask={addLocalTaskAutomatically}
            />
          </Modal>
        )}
    </div>
  );
}

function BreedingRecordForm({ user, initialData, pairs, birds, cages, onClose, userSettings }: { user: FirebaseUser, initialData?: BreedingRecord, pairs: Pair[], birds: Bird[], cages: Cage[], onClose: () => void, userSettings?: UserSettings }) {
  const t = (text: string) => getTranslatedLabel(text, userSettings?.language || 'en');
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
    if (isSubscriptionExpired(userSettings)) return;
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
    if (isSubscriptionExpired(userSettings)) return;
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
    if (isSubscriptionExpired(userSettings)) {
      toast.error("Your subscription has expired! Please renew to add or edit entries.");
      return;
    }
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

  const isExpired = isSubscriptionExpired(userSettings);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isExpired && (
        <div className="bg-rose-500/20 text-rose-300 border border-rose-500/30 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center shadow-inner">
          ⚠️ Subscription Expired — Entry is in Read-Only Mode
        </div>
      )}
      <fieldset disabled={isExpired} className="space-y-4">
        <div className="space-y-1">
          <SearchableSelect 
            label={t('Pair')}
          value={formData.pairId || ''}
          onChange={(val) => {
            const selectedPair = pairs.find(p => p.id === val);
            const female = birds.find(b => b.id === selectedPair?.femaleId);
            const male = birds.find(b => b.id === selectedPair?.maleId);
            const speciesName = female?.species || male?.species || '';
            const presets = getSpeciesIncubation(speciesName);
            setFormData({ 
              ...formData, 
              pairId: val,
              incubationDays: formData.incubationDays || presets.incubation,
              ringingDays: formData.ringingDays || presets.ring
            });
          }}
          options={[
            { id: '', name: t('Select Pair') },
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
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Start Date')}</label>
          <Input type="date" required value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('End Date')}</label>
          <Input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Incubation (Days)')}</label>
          <Input 
            type="number" 
            min="1" 
            value={formData.incubationDays} 
            onChange={e => setFormData({ ...formData, incubationDays: parseInt(e.target.value) || 0 })} 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Ringing Age (Days)')}</label>
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
          <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">{t('Laid')}</label>
          <div className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl flex items-center text-white font-bold text-sm">{formData.eggs?.length || 0}</div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">{t('Hatched')}</label>
          <div className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl flex items-center text-white font-bold text-sm">{formData.eggs?.filter(e => ['Hatched', 'Died', 'Weaned'].includes(e.status)).length || 0}</div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">{t('Weaned')}</label>
          <div className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl flex items-center text-white font-bold text-sm">{formData.eggs?.filter(e => e.status === 'Weaned').length || 0}</div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Eggs & Offspring')}</label>
          <Button type="button" onClick={handleAddEgg} variant="secondary" className="h-6 text-xs px-3 bg-zinc-700 hover:bg-zinc-600 rounded">
            + {t('Add Egg')}
          </Button>
        </div>
        
        {formData.eggs && formData.eggs.length > 0 && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {formData.eggs.map((egg, index) => ({ egg, originalIndex: index }))
              .sort((a, b) => new Date(b.egg.laidDate || 0).getTime() - new Date(a.egg.laidDate || 0).getTime())
              .map(({ egg, originalIndex: index }) => (
              <div key={egg.id} className="p-3 bg-black border border-black-700 rounded-xl space-y-2">
                <div className="flex justify-between items-center bg-black-900 -mx-3 -mt-3 p-2 rounded-t-xl border-b border-black-800">
                  <span className="text-xs font-black text-white">{t('Egg')} {index + 1}</span>
                  <div className="flex items-center gap-2">
                    <select 
                      value={egg.status} 
                      onChange={e => updateEgg(index, { status: e.target.value as any })} 
                      className="bg-black border border-black-700 text-xs font-bold uppercase tracking-widest rounded px-2 py-1 text-white focus:outline-none focus:border-gold-500"
                    >
                      <option value="Laid">{t('Laid')}</option>
                      <option value="Fertile">{t('Fertile')}</option>
                      <option value="Infertile / Clear">{t('Infertile / Clear')}</option>
                      <option value="Dead In Shell">{t('Dead In Shell')}</option>
                      <option value="Hatched">{t('Hatched')}</option>
                      <option value="Died">{t('Died')}</option>
                      <option value="Weaned">{t('Weaned')}</option>
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
                    <label className="text-[9px] font-bold text-white/50 uppercase tracking-widest">{t('Laid Date')}</label>
                    <Input 
                      type="date" 
                      value={egg.laidDate || ''} 
                      onChange={e => updateEgg(index, { laidDate: e.target.value })} 
                      className="h-8 text-xs font-mono" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/50 uppercase tracking-widest">{t('Hatch Date')}</label>
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
                      <label className="text-[9px] font-bold text-white/50 uppercase tracking-widest">{t('Notes')}</label>
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
                        {t('Promote to New Bird Profile')}
                     </Button>
                  </div>
                )}
                
                {egg.birdId && (
                  <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest text-center py-1 mt-1 bg-emerald-500/10 rounded">
                    {t('Promoted to Bird')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <SearchableSelect 
          label={t('Tag Existing Offspring')}
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
          placeholder={t('Select Offspring')}
        />
      </div>
      
      <div className="space-y-1">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Clutch Notes')}</label>
        <textarea name="breedingNotes" id="breedingNotes" className="w-full px-4 py-3 bg-black border border-black-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-white transition-all min-h-[80px] text-sm font-medium placeholder:text-white/30" placeholder={t('General breeding notes...')}
          value={formData.notes} 
          onChange={e => setFormData({ ...formData, notes: e.target.value })} 
        />
      </div>
      </fieldset>

      <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest font-black" disabled={isSaving || isExpired}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {(initialData && (initialData as any).id) ? t('Update Record') : t('Add Record')}
      </Button>
    </form>
  );
}

function TransactionForm({ user, initialData, birds, pairs, cages, contacts, currency, onClose, userSettings }: { user: FirebaseUser, initialData?: Transaction, birds: Bird[], pairs: Pair[], cages: Cage[], contacts: Contact[], currency?: string, onClose: () => void, userSettings?: UserSettings }) {
  const t = (text: string) => getTranslatedLabel(text, userSettings?.language || 'en');
  const symbol = getCurrencySymbol(currency);
  const [formData, setFormData] = useState<Partial<Transaction>>(initialData || {
    type: 'Expense',
    category: '',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    birdId: '',
    pairId: '',
    contactId: '',
    description: '',
    recurring: 'None'
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubscriptionExpired(userSettings)) {
      toast.error("Your subscription has expired! Please renew to add or edit entries.");
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    
    const processSave = async () => {
      try {
        const data = { 
          ...formData,
          ...(initialData?.id ? {} : { uid: user.uid })
        };
        // Setup initial nextDueDate if becoming recurring
        if (data.recurring && data.recurring !== 'None' && !data.nextDueDate) {
          const basedate = parseISO(data.date || format(new Date(), 'yyyy-MM-dd'));
          let nextD = basedate;
          if (data.recurring === 'Daily') nextD = addDays(basedate, 1);
          if (data.recurring === 'Weekly') nextD = addDays(basedate, 7);
          if (data.recurring === 'Monthly') nextD = addMonths(basedate, 1);
          if (data.recurring === 'Yearly') nextD = addMonths(basedate, 12);
          data.nextDueDate = format(nextD, 'yyyy-MM-dd');
        } else if (data.recurring === 'None') {
          delete data.nextDueDate;
        }

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
  const isExpired = isSubscriptionExpired(userSettings);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isExpired && (
        <div className="bg-rose-500/20 text-rose-300 border border-rose-500/30 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center shadow-inner">
          ⚠️ Subscription Expired — Entry is in Read-Only Mode
        </div>
      )}
      <fieldset disabled={isExpired} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Type')}</label>
          <Select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
            <option value="Income" className="bg-black text-white">{t('Income')}</option>
            <option value="Expense" className="bg-black text-white">{t('Expense')}</option>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Amount')} ({symbol})</label>
          <Input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Category')}</label>
          <Input required placeholder={t('e.g. Seed, Sale, Vet')} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Date')}</label>
          <Input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Recurring Schedule')}</label>
          <Select value={formData.recurring || 'None'} onChange={e => setFormData({ ...formData, recurring: e.target.value as any })}>
            <option value="None" className="bg-black text-white">{t('None (One-time)')}</option>
            <option value="Daily" className="bg-black text-white">{t('Daily')}</option>
            <option value="Weekly" className="bg-black text-white">{t('Weekly')}</option>
            <option value="Monthly" className="bg-black text-white">{t('Monthly')}</option>
            <option value="Yearly" className="bg-black text-white">{t('Yearly')}</option>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <SearchableSelect 
            label={t('Related Bird')}
            value={formData.birdId || ''}
            onChange={(val) => setFormData({ ...formData, birdId: val })}
            options={[
              { id: '', name: t('None') },
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
            label={t('Related Pair')}
            value={formData.pairId || ''}
            onChange={(val) => setFormData({ ...formData, pairId: val })}
            options={[
              { id: '', name: t('None') },
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
            label={t('Contact')}
            value={formData.contactId || ''}
            onChange={(val) => setFormData({ ...formData, contactId: val })}
            options={[
              { id: '', name: t('None') },
              ...contacts.map(c => ({ id: c.id, name: c.name }))
            ]}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Description')}</label>
        <Textarea rows={3} placeholder={t('Additional details...')} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
      </div>
      </fieldset>
      <Button type="submit" className="w-full py-4 text-sm font-bold shadow-xl shadow-gold-500/20" disabled={isSaving || isExpired}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {(initialData && (initialData as any).id) ? t('Update Transaction') : t('Add Transaction')}
      </Button>
    </form>
  );
}

function ContactForm({ user, initialData, onClose, userSettings }: { user: FirebaseUser, initialData?: Contact, onClose: () => void, userSettings?: UserSettings }) {
  const t = (text: string) => getTranslatedLabel(text, userSettings?.language || 'en');
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
    if (isSubscriptionExpired(userSettings)) {
      toast.error("Your subscription has expired! Please renew to add or edit entries.");
      return;
    }
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

  const isExpired = isSubscriptionExpired(userSettings);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isExpired && (
        <div className="bg-rose-500/20 text-rose-300 border border-rose-500/30 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center shadow-inner">
          ⚠️ Subscription Expired — Entry is in Read-Only Mode
        </div>
      )}
      <fieldset disabled={isExpired} className="space-y-6">
        <div className="space-y-2">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Name')}</label>
        <Input required placeholder={t('Contact Name')} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Type')}</label>
        <Select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}>
          <option value="Buyer" className="bg-black text-white">{t('Buyer')}</option>
          <option value="Seller" className="bg-black text-white">{t('Seller')}</option>
          <option value="Both" className="bg-black text-white">{t('Both')}</option>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Email')}</label>
          <Input type="email" placeholder={t('Email Address')} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Phone')}</label>
          <Input type="tel" placeholder={t('Phone Number')} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Address')}</label>
        <Input placeholder={t('Physical Address')} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Notes')}</label>
        <Textarea rows={3} placeholder={t('Additional details...')} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
      </div>
      </fieldset>
      <Button type="submit" className="w-full py-4 text-sm font-bold shadow-xl shadow-gold-500/20" disabled={isSaving || isExpired}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {(initialData && (initialData as any).id) ? t('Update Contact') : t('Add Contact')}
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
  const [newMutationInheritance, setNewMutationInheritance] = useState<'autosomal_recessive' | 'autosomal_dominant' | 'incomplete_dominant' | 'sex_linked_recessive' | ''>('');
  const [newStatus, setNewStatus] = useState('');
  const [newSubSpecies, setNewSubSpecies] = useState('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState('');
  const [editingItem, setEditingItem] = useState<{ type: 'species' | 'subspecies' | 'mutation' | 'status', id: string, name: string, inheritance?: 'autosomal_recessive' | 'autosomal_dominant' | 'incomplete_dominant' | 'sex_linked_recessive' } | null>(null);

  const availableSpecies = useMemo(() => {
    const list = [...(settings.species || [])];
    if (settings.useDefaultData !== false) {
      defaultSpecies.forEach(ds => {
        if (!list.some(s => s.name.toLowerCase() === ds.name.toLowerCase() || s.id === ds.id)) {
          list.push({ id: ds.id, name: ds.name });
        }
      });
    }
    return list;
  }, [settings.species, settings.useDefaultData]);

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
    onUpdate({ 
      ...settings, 
      mutations: [
        ...(settings.mutations || []), 
        { 
          id: crypto.randomUUID(), 
          name: newMutation.trim(), 
          inheritance: newMutationInheritance || undefined 
        }
      ] 
    });
    setNewMutation('');
    setNewMutationInheritance('');
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
      newSettings.mutations = newSettings.mutations.map(m => m.id === editingItem.id ? { ...m, name: editingItem.name.trim(), inheritance: editingItem.inheritance } : m);
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
      message: `Are you sure you want to delete "${name}"? It will be removed from all associated birds.`,
      onConfirm: async () => {
        if (!user) return;
        try {
          const batch = writeBatch(db);
          
          // Filter out of settings
          const nextMutations = settings.mutations.filter(m => m.id !== id);
          batch.update(doc(db, 'userSettings', user.uid), {
            mutations: nextMutations
          });

          // Remove from birds
          const affectedBirds = (allData.birds || []).filter((b: any) => 
            b.mutations?.includes(name) || b.splitMutations?.includes(name)
          );

          affectedBirds.forEach((b: any) => {
            batch.update(doc(db, 'birds', b.id), {
              mutations: b.mutations?.filter((m: string) => m !== name) || [],
              splitMutations: b.splitMutations?.filter((m: string) => m !== name) || []
            });
          });

          await batch.commit();
          onUpdate({ ...settings, mutations: nextMutations });
          toast.success('Mutation removed from settings and all associated birds');
        } catch (e) {
          console.error("Failed to delete mutation: ", e);
          toast.error("Failed to remove mutation from birds or settings");
        }
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
                      <option value="ZAR">South African Rand (R)</option>
                      <option value="USD">US Dollar ($)</option>
                      <option value="EUR">Euro (€)</option>
                      <option value="GBP">British Pound (£)</option>
                      <option value="AUD">Australian Dollar (A$)</option>
                      <option value="CAD">Canadian Dollar (C$)</option>
                      <option value="CHF">Swiss Franc (CHF)</option>
                      <option value="JPY">Japanese Yen (¥)</option>
                      <option value="CNY">Chinese Yuan (¥)</option>
                      <option value="INR">Indian Rupee (₹)</option>
                      <option value="PHP">Philippine Peso (₱)</option>
                      <option value="RUB">Russian Ruble (₽)</option>
                      <option value="BRL">Brazilian Real (R$)</option>
                      <option value="MXN">Mexican Peso (Mex$)</option>
                      <option value="SAR">Saudi Riyal (SR)</option>
                      <option value="AED">UAE Dirham (AED)</option>
                      <option value="ILS">Israeli Shekel (₪)</option>
                      <option value="NZD">New Zealand Dollar (NZ$)</option>
                      <option value="SGD">Singapore Dollar (S$)</option>
                      <option value="TRY">Turkish Lira (₺)</option>
                      <option value="PLN">Polish Złoty (zł)</option>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-black-100 uppercase tracking-widest ml-1">Language</label>
                    <Select 
                      value={settings.language || 'en'} 
                      onChange={e => onUpdate({ ...settings, language: e.target.value })}
                    >
                      {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                      ))}
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

                <div className="pt-4 border-t border-black-800 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-black-100 uppercase tracking-widest ml-1">Device & App Installation</label>
                    <InstallAppButton variant="settings" showAlwaysInSettings />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-black-100 uppercase tracking-widest ml-1">Data Settings</label>
                    <label className="flex items-center gap-2 px-3 py-3 bg-black border border-black-700 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={settings.useDefaultData !== false} 
                        onChange={e => onUpdate({ ...settings, useDefaultData: e.target.checked })} 
                        className="rounded bg-black border-black-700 w-4 h-4 text-gold-500 focus:ring-gold-500/20"
                      />
                      <span className="text-sm font-bold text-white">Enable Default Master Data (Species, Mutations)</span>
                    </label>
                    <p className="text-xs text-black-200 ml-1">Provides a base set of standard species & mutations automatically. Includes genetic rules for the calculator if applicable.</p>
                  </div>
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
                      {availableSpecies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                  {availableSpecies.map(s => {
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
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Input placeholder="New mutation name..." value={newMutation} onChange={e => setNewMutation(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMutation()} />
                  </div>
                  <div className="w-full sm:w-64">
                    <Select value={newMutationInheritance} onChange={e => setNewMutationInheritance(e.target.value as any)}>
                      <option value="" className="bg-black text-white">None (Select in Calculator)</option>
                      <option value="autosomal_recessive" className="bg-black text-white">Recessive</option>
                      <option value="autosomal_dominant" className="bg-black text-white">Dominant</option>
                      <option value="incomplete_dominant" className="bg-black text-white">Incomplete Dominant</option>
                      <option value="sex_linked_recessive" className="bg-black text-white">Sex-linked Recessive</option>
                    </Select>
                  </div>
                  <Button onClick={addMutation} variant="secondary" className="px-4 shrink-0"><Plus size={18} /></Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {settings.mutations?.map(m => (
                    <div key={m.id} className="p-3 bg-black border border-black-700 rounded-xl flex items-center justify-between group">
                      <span className="text-sm font-bold text-white">{m.name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingItem({ type: 'mutation', id: m.id, name: m.name, inheritance: m.inheritance })} className="text-black-200 hover:text-secondary p-1.5 bg-zinc-800 rounded-lg transition-all"><Edit2 size={14} /></button>
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
                {editingItem.type === 'mutation' && (
                  <div>
                    <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1 mb-1 block">Inheritance</label>
                    <Select value={editingItem.inheritance || ''} onChange={e => setEditingItem({ ...editingItem, inheritance: e.target.value as any })}>
                      <option value="" className="bg-black text-white">None (Select in Calculator)</option>
                      <option value="autosomal_recessive" className="bg-black text-white">Recessive</option>
                      <option value="autosomal_dominant" className="bg-black text-white">Dominant</option>
                      <option value="incomplete_dominant" className="bg-black text-white">Incomplete Dominant</option>
                      <option value="sex_linked_recessive" className="bg-black text-white">Sex-linked Recessive</option>
                    </Select>
                  </div>
                )}
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

function PrintView({ 
  birds, 
  pairs, 
  cages, 
  breedingRecords = [], 
  tasks = [], 
  transactions = [], 
  contacts = [], 
  onBirdRef, 
  userSettings 
}: { 
  birds: Bird[]; 
  pairs: Pair[]; 
  cages: Cage[]; 
  breedingRecords?: BreedingRecord[]; 
  tasks?: Task[]; 
  transactions?: Transaction[]; 
  contacts?: Contact[]; 
  onBirdRef: (name: string) => void; 
  userSettings?: UserSettings; 
}) {
  const t = (text: string) => getTranslatedLabel(text, userSettings?.language || 'en');
  const [printMode, setPrintMode] = useState<'list' | 'qr' | 'certificate'>('list');
  const [printLayout, setPrintLayout] = useState<'vertical' | 'horizontal'>('vertical');
  const [printEmpty, setPrintEmpty] = useState(false);
  const [qrType, setQrType] = useState<'bird' | 'pair' | 'cage'>('bird');
  const [qrSelections, setQrSelections] = useState<string[]>([]);
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [lastExportedSheet, setLastExportedSheet] = useState<{ id: string; url: string; title: string } | null>(null);
  
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

  const birdOptions = useMemo(() => {
    return birds.filter(b => !b.isGhost).map(b => {
      const cage = cages.find(c => c.id === b.cageId);
      return { 
        id: b.id, 
        name: b.name, 
        details: `${b.species}${b.subSpecies ? ` • ${b.subSpecies}` : ''}${cage ? ` - Cage: ${cage.name}` : ''}`, 
        bird: b,
        cageName: cage?.name || ''
      };
    }).sort((a, b) => {
      if (a.cageName !== b.cageName) {
        if (!a.cageName) return 1;
        if (!b.cageName) return -1;
        return a.cageName.localeCompare(b.cageName, undefined, { numeric: true, sensitivity: 'base' });
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [birds, cages]);

  const pairOptions = useMemo(() => {
    return pairs.filter(p => p.maleId || p.femaleId).map(p => {
      const male = birds.find(b => b.id === p.maleId);
      const female = birds.find(b => b.id === p.femaleId);
      const mName = male?.name || 'Empty';
      const fName = female?.name || 'Empty';
      const cageId = p.cageId || male?.cageId || female?.cageId;
      const cage = cages.find(c => c.id === cageId);
      
      const maleInfo = male ? `${male.species}${male.subSpecies ? ` (${male.subSpecies})` : ''} ${male.mutations?.join(', ')}${male.splitMutations?.length ? ` / ${male.splitMutations.join(', ')}` : ''}` : 'Empty Male';
      const femaleInfo = female ? `${female.species}${female.subSpecies ? ` (${female.subSpecies})` : ''} ${female.mutations?.join(', ')}${female.splitMutations?.length ? ` / ${female.splitMutations.join(', ')}` : ''}` : 'Empty Female';

      return { 
        id: p.id, 
        name: `Pair: ${mName} x ${fName}`, 
        details: `M: ${maleInfo} | F: ${femaleInfo}${cage ? ` - Cage: ${cage.name}` : ''}`,
        pair: p,
        cageName: cage?.name || ''
      };
    }).sort((a, b) => {
      if (a.cageName !== b.cageName) {
        if (!a.cageName) return 1;
        if (!b.cageName) return -1;
        return a.cageName.localeCompare(b.cageName, undefined, { numeric: true, sensitivity: 'base' });
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [pairs, birds, cages]);

  const cageOptions = useMemo(() => {
    return cages.map(c => ({ 
      id: c.id, 
      name: c.name, 
      details: c.location || 'No location',
      cage: c
    })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }, [cages]);

  const handlePrint = () => {
    if (printMode === 'list') {
      if (qrType === 'bird') {
        generateBirdListPDF(sortedBirds.filter(b => printEmpty || qrSelections.includes(b.id)), cages, printLayout, printEmpty);
      } else if (qrType === 'cage') {
        generateCageListPDF(sortedCages.filter(c => printEmpty || qrSelections.includes(c.id)), printLayout, printEmpty);
      } else if (qrType === 'pair') {
        generatePairListPDF(pairs.filter(p => printEmpty || qrSelections.includes(p.id)), birds, cages, printLayout, printEmpty);
      }
    } else if (printMode === 'certificate') {
      const selected = birds.filter(b => qrSelections.includes(b.id));
      if (selected.length > 0) {
        generateCertificatePDF(selected, birds);
      }
    } else {
      const selectedItems = currentOptions
        .filter(o => qrSelections.includes(o.id))
        .map(o => (o as any).bird || (o as any).pair || (o as any).cage);
      
      if (selectedItems.length > 0) {
        generateQRListPDF(selectedItems, qrType, qrWidth, qrHeight, isThermal, birds);
      }
    }
  };



  const getQRData = (id: string) => {
     return JSON.stringify({ t: qrType === 'bird' ? 'b' : qrType === 'pair' ? 'p' : 'c', id });
  };

  const toggleSelection = (id: string) => setQrSelections(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);

  const currentOptions = qrType === 'bird' ? birdOptions : qrType === 'pair' ? pairOptions : cageOptions;

  return (
    <div className="w-full px-4 md:px-8 space-y-12 pb-24">
      {/* Configuration Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-black-800">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">{t('Print Center')}</h1>
          <p className="text-black-100 text-xs font-bold uppercase tracking-widest mt-1">{t('Configure your physical records & labels')}</p>
        </div>
        <div className="flex bg-black-900 border border-black-800 p-1 rounded-2xl w-full lg:w-[450px]">
          <button 
            className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", printMode === 'list' ? "bg-gold-500 text-black shadow-lg" : "text-black-100 hover:text-white")} 
            onClick={() => setPrintMode('list')}
          >
            {t('Data Sheets')}
          </button>
          <button 
            className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", printMode === 'qr' ? "bg-gold-500 text-black shadow-lg" : "text-black-100 hover:text-white")} 
            onClick={() => setPrintMode('qr')}
          >
            {t('QR Labels')}
          </button>
          <button 
            className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", printMode === 'certificate' ? "bg-gold-500 text-black shadow-lg" : "text-black-100 hover:text-white")} 
            onClick={() => setPrintMode('certificate')}
          >
            {t('Certificates')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
        {/* Left Column: Configuration */}
        <div className="xl:col-span-5 space-y-8">
          <section className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gold-500 uppercase tracking-widest ml-1">{t('Entity Selection Type')}</label>
              <div className="flex bg-black p-1.5 rounded-2xl border border-black-800 shadow-xl">
                <button onClick={() => { setQrType('bird'); setQrSelections([]); }} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest", qrType === 'bird' ? "bg-zinc-800 text-white border border-white/5" : "text-black-100 hover:text-white")}>{t('Birds')}</button>
                <button onClick={() => { setQrType('pair'); setQrSelections([]); }} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest", qrType === 'pair' ? "bg-zinc-800 text-white border border-white/5" : "text-black-100 hover:text-white")}>{t('Pairs')}</button>
                <button onClick={() => { setQrType('cage'); setQrSelections([]); }} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest", qrType === 'cage' ? "bg-zinc-800 text-white border border-white/5" : "text-black-100 hover:text-white")}>{t('Cages')}</button>
              </div>
            </div>

            <SearchableSelect 
              label={t(qrType === 'bird' ? 'Bulk Select Birds' : qrType === 'pair' ? 'Bulk Select Pairs' : 'Bulk Select Cages')}
              options={currentOptions}
              multi
              selectedValues={qrSelections}
              onChange={(val) => toggleSelection(val)}
              placeholder={t(qrType === 'bird' ? 'Search Birds...' : qrType === 'pair' ? 'Search Pairs...' : 'Search Cages...')}
              cages={cages}
              birds={birds}
            />

            {(printMode === 'certificate' || printMode === 'list') && (
              <div className="p-4 bg-zinc-900/30 border border-black-800 rounded-2xl flex items-center justify-between">
                <span className="text-[10px] font-black text-gold-500 uppercase tracking-widest">{t('Page Layout')}</span>
                <div className="flex bg-black p-1 rounded-lg border border-black-800">
                  <button onClick={() => setPrintLayout('vertical')} className={cn("px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all tracking-widest", printLayout === 'vertical' ? "bg-zinc-800 text-white border border-white/5" : "text-black-100 hover:text-white")}>{t('Vertical')}</button>
                  <button onClick={() => setPrintLayout('horizontal')} className={cn("px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all tracking-widest", printLayout === 'horizontal' ? "bg-zinc-800 text-white border border-white/5" : "text-black-100 hover:text-white")}>{t('Horizontal')}</button>
                </div>
              </div>
            )}

            {printMode === 'qr' && (
              <div className="space-y-4 p-4 bg-zinc-900/30 border border-black-800 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gold-500 uppercase tracking-widest">{t('QR Dimensions (mm)')}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/50 uppercase font-black">{t('Thermal Mode')}</span>
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
                    <label className="text-[8px] font-bold text-white/40 uppercase">{t('Width')}</label>
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
                    <label className="text-[8px] font-bold text-white/40 uppercase">{t('Height')}</label>
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
                  <p className="text-white font-black uppercase text-[10px] tracking-widest">{t('Blank Template Mode')}</p>
                  <p className="text-black-300 text-[9px] uppercase font-bold tracking-tight">{t('Print empty records for hand logs')}</p>
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

          <div className="space-y-3">
            <Button onClick={handlePrint} disabled={!printEmpty && qrSelections.length === 0} className="w-full py-5 text-sm font-black uppercase border-b-4 border-gold-600 shadow-gold-500/10 shadow-2xl h-auto">
              {printMode === 'qr' ? <QrCode size={20} /> : <Printer size={20} />}
              {printEmpty ? t('Generate Blank Template') : `${t('Generate')} ${qrSelections.length} ${t('PDF Records')}`}
            </Button>


          </div>
        </div>

        {/* Right Column: Preview / Selection List */}
        <div className="xl:col-span-7 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <CheckSquare size={14} className="text-gold-500" />
              {t('Active Selection')} ({qrSelections.length})
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
                {t('Clear All')}
              </button>
            )}
          </div>

          <div className="bg-black/20 border border-black-800 rounded-2xl min-h-[400px]">
            {qrSelections.length === 0 && !printEmpty ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Search size={48} className="mb-4 text-black-400" />
                <p className="text-xs font-black uppercase tracking-[0.2em]">{t('Select items from the list to preview')}</p>
              </div>
            ) : printEmpty ? (
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-gold-500/10 border border-gold-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Printer size={32} className="text-gold-500" />
                </div>
                <div className="space-y-2">
                   <p className="text-lg font-black text-white uppercase tracking-widest underline decoration-gold-500 underline-offset-8">{t('Observation Sheet')}</p>
                   <p className="text-[10px] text-black-100 font-bold uppercase max-w-sm mx-auto leading-relaxed">{t('System will generate a high-fidelity blank table formatted for manual entry and pen-and-paper tracking.')}</p>
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

function BirdDocumentsModal({ bird, onClose, user }: { bird: Bird, onClose: () => void, user: FirebaseUser | null }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [uploadType, setUploadType] = useState('DNA Sexing');
  const [isUploading, setIsUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<BirdDocument | null>(null);
  const [zoom, setZoom] = useState(1);

  const documents = bird.documents || [];

  // Filter logic
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || doc.type === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, selectedCategory]);

  // Statistics counters
  const stats = useMemo(() => {
    return {
      total: documents.length,
      dna: documents.filter(d => d.type === 'DNA Sexing').length,
      vet: documents.filter(d => d.type === 'Vet Record').length,
      permit: documents.filter(d => d.type === 'Permit').length,
      pedigree: documents.filter(d => d.type === 'Pedigree').length,
      general: documents.filter(d => d.type === 'General').length,
    };
  }, [documents]);

  const handleUploadClick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `documents/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      const newDoc: BirdDocument = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        url,
        type: uploadType,
        fileType: file.type || (file.name.match(/\.(jpg|jpeg|png|gif)$/i) ? 'image/jpeg' : 'application/pdf'),
        createdAt: new Date().toISOString()
      };

      const updatedDocs = [...documents, newDoc];

      await updateDoc(doc(db, 'birds', bird.id), {
        documents: updatedDocs
      });

      toast.success('Document added to Vault successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!user) return;
    try {
      const docToDelete = documents.find(d => d.id === docId);
      const updatedDocs = documents.filter(d => d.id !== docId);

      await updateDoc(doc(db, 'birds', bird.id), {
        documents: updatedDocs
      });
      
      if (docToDelete && docToDelete.url) {
        await deleteStorageFileIfApplicable(docToDelete.url);
      }

      toast.success('Document deleted from Vault');
      if (previewDoc?.id === docId) {
        setPreviewDoc(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete document');
    }
  };

  // Check if a file type is previewable as an image
  const isImage = (doc: BirdDocument) => {
    return doc.fileType.startsWith('image/') || doc.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  };

  return (
    <div className="space-y-6">
      {/* Vault Statistics */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <div className="p-2 sm:p-3 bg-zinc-900 border border-zinc-805/50 rounded-2xl text-center">
          <p className="text-[9px] font-black uppercase text-gold-500 tracking-wider">Total</p>
          <p className="text-sm sm:text-base font-black text-white mt-1">{stats.total}</p>
        </div>
        <div className="p-2 sm:p-3 bg-zinc-900 border border-zinc-805/50 rounded-2xl text-center">
          <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">DNA 🧬</p>
          <p className="text-sm sm:text-base font-black text-white mt-1">{stats.dna}</p>
        </div>
        <div className="p-2 sm:p-3 bg-zinc-900 border border-zinc-805/50 rounded-2xl text-center">
          <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Vet 🏥</p>
          <p className="text-sm sm:text-base font-black text-white mt-1">{stats.vet}</p>
        </div>
        <div className="p-2 sm:p-3 bg-zinc-900 border border-zinc-805/50 rounded-2xl text-center">
          <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Permit 📄</p>
          <p className="text-sm sm:text-base font-black text-white mt-1">{stats.permit}</p>
        </div>
        <div className="p-2 sm:p-3 bg-zinc-900 border border-zinc-805/50 rounded-2xl text-center">
          <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Pedigree 🌳</p>
          <p className="text-sm sm:text-base font-black text-white mt-1">{stats.pedigree}</p>
        </div>
        <div className="p-2 sm:p-3 bg-zinc-900 border border-zinc-805/50 rounded-2xl text-center">
          <p className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Other 📁</p>
          <p className="text-sm sm:text-base font-black text-white mt-1">{stats.general}</p>
        </div>
      </div>

      {/* Document Upload Area */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-[2rem] space-y-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-gold-500 flex items-center gap-2">
          <UploadCloud size={14} /> Add Document / DNA Certificate to Vault
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-white/50 block mb-1.5">Document Type</label>
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {['DNA Sexing', 'Vet Record', 'Permit', 'Pedigree', 'General'].map(type => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setUploadType(type)}
                  className={cn(
                    "px-2.5 py-1.5 text-[9px] font-bold rounded-lg border uppercase tracking-wider transition-all truncate",
                    uploadType === type ? "bg-gold-500 border-gold-400 text-black font-black" : "bg-black border-zinc-800 text-white/70 hover:bg-zinc-850"
                  )}
                >
                  {type === 'DNA Sexing' ? '🧬 DNA' :
                   type === 'Vet Record' ? '🏥 Vet' :
                   type === 'Permit' ? '📄 Permit' :
                   type === 'Pedigree' ? '🌳 Link' : '📁 Other'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-end">
            <label className="text-[10px] font-black uppercase tracking-wider text-white/50 block mb-1.5">Attach File</label>
            <div className="relative">
              <input
                type="file"
                onChange={handleUploadClick}
                disabled={isUploading}
                accept="image/*,application/pdf"
                className="hidden"
                id="doc-file-upload"
              />
              <label
                htmlFor="doc-file-upload"
                className={cn(
                  "flex items-center justify-center gap-3 px-4 py-3 bg-black border border-dashed border-zinc-700 hover:border-gold-500 rounded-xl cursor-pointer transition-all uppercase tracking-widest text-[10px] font-black text-white mb-0",
                  isUploading && "opacity-50 pointer-events-none"
                )}
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-gold-500" />
                    Uploading document...
                  </>
                ) : (
                  <>
                    <Plus size={14} className="text-gold-500" />
                    Select & Upload Document
                  </>
                )}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* High-Speed Search and Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <Input
              placeholder="Search documents by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 py-2.5 text-xs bg-zinc-900 border-zinc-800 text-white placeholder-white/30 rounded-xl"
            />
          </div>
          <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl overflow-x-auto shrink-0 scrollbar-none">
            {['All', 'DNA Sexing', 'Vet Record', 'Permit', 'Pedigree', 'General'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 text-[9px] font-black rounded-lg uppercase tracking-wider transition-all whitespace-nowrap",
                  selectedCategory === cat ? "bg-zinc-800 text-gold-500 border border-zinc-700 shadow-sm" : "text-white/60 hover:text-white"
                )}
              >
                {cat === 'All' ? '📂 All' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Documents Grid / Vault Container */}
      <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            onClick={() => setPreviewDoc(doc)}
            className="flex items-center justify-between p-3.5 bg-black rounded-2xl border border-zinc-850 group hover:border-gold-500/50 hover:bg-zinc-950/20 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 shrink-0">
                {isImage(doc) ? (
                  <ImageIcon size={18} className="text-gold-500" />
                ) : (
                  <FileText size={18} className="text-gold-500" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-white leading-tight block truncate group-hover:text-gold-500 transition-colors uppercase tracking-wide">{doc.name}</span>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="neutral" className="bg-zinc-850 text-gold-500 text-[8px] px-1.5 py-0 border border-zinc-800 uppercase tracking-widest">{doc.type}</Badge>
                  <span className="text-[9px] text-white/30 font-bold uppercase">{format(new Date(doc.createdAt), 'MMM dd, yyyy')}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setPreviewDoc(doc)}
                className="p-2 bg-zinc-900 hover:bg-gold-500 hover:text-black text-white/70 rounded-xl transition-all border border-zinc-800/80"
                title="Preview document"
              >
                <Eye size={14} />
              </button>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-zinc-900 hover:bg-gold-500 hover:text-black text-white/70 rounded-xl transition-all border border-zinc-800/80"
                title="Open original link"
              >
                <ExternalLink size={14} />
              </a>
              <button
                onClick={() => handleDelete(doc.id)}
                className="p-2 bg-red-500/10 border border-red-500/10 hover:bg-red-500/20 hover:border-red-500/30 text-red-400 rounded-xl transition-all"
                title="Delete from Vault"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {filteredDocs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-zinc-800 rounded-2xl bg-black">
            <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-3">
              <FileText size={22} className="text-white/25" />
            </div>
            <h5 className="text-white text-xs font-black uppercase tracking-widest leading-none mb-1">No Vault Items Found</h5>
            <p className="text-white/40 text-[10px] uppercase font-bold sm:inline-block">Search or filter criteria did not yield results.</p>
          </div>
        )}
      </div>

      {/* Interactive State-Of-The-Art Lightbox Previewer Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
          <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div className="min-w-0 pr-4">
                <span className="text-xs font-black uppercase tracking-widest text-gold-500 leading-none mb-1 block">Vault Document Preview</span>
                <h4 className="text-sm font-black text-white uppercase tracking-wide truncate">{previewDoc.name}</h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-white/75 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto bg-black flex flex-col items-center justify-center text-white min-h-[300px] max-h-[60vh] relative">
              {isImage(previewDoc) ? (
                <div className="relative w-full h-full flex items-center justify-center overflow-auto max-h-[50vh] p-4">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    referrerPolicy="no-referrer"
                    style={{ transform: `scale(${zoom})` }}
                    className="max-w-full max-h-[45vh] rounded-lg shadow-xl border border-zinc-800/50 object-contain transition-transform duration-200"
                  />
                </div>
              ) : (
                <div className="text-center py-12 max-w-md">
                  <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center mb-4 mx-auto border border-zinc-800 shadow-inner">
                    <FileText size={32} className="text-gold-500" />
                  </div>
                  <h5 className="text-sm font-black uppercase tracking-wider text-white">Full-Screen File (PDF/Doc)</h5>
                  <p className="text-white/40 text-xs mt-2 uppercase font-bold tracking-tight">PDFs and other web documents cannot be previewed natively as images in secure frames.</p>
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex items-center gap-2 px-5 py-3 bg-gold-500 hover:bg-gold-400 text-black font-black uppercase tracking-widest text-[10px] rounded-xl transition-all"
                  >
                    <ExternalLink size={14} /> Open Original Document
                  </a>
                </div>
              )}

              {/* Zoom Controls for Image Viewer */}
              {isImage(previewDoc) && (
                <div className="absolute bottom-4 left-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center bg-zinc-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-zinc-800 shadow-xl gap-2 mt-2">
                  <button
                    onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
                    className="p-1 hover:text-gold-500 text-white/50 transition-all font-black"
                  >
                    Zoom -
                  </button>
                  <span className="text-[10px] font-black uppercase text-gold-500 px-1">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
                    className="p-1 hover:text-gold-500 text-white/50 transition-all font-black"
                  >
                    Zoom +
                  </button>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 text-left">
                <p className="text-[8px] font-black uppercase text-white/30 tracking-wider">Vault Registry Details</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="neutral" className="bg-zinc-900 text-gold-500 text-[8px] px-1.5 py-0.5 border border-zinc-800">{previewDoc.type}</Badge>
                  <span className="text-[9px] font-bold text-white/50 uppercase">Uploaded on {format(new Date(previewDoc.createdAt), 'MMMM dd, yyyy')}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                >
                  <ExternalLink size={12} /> External
                </a>
                <button
                  onClick={() => handleDelete(previewDoc.id)}
                  className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Close Button */}
      <Button onClick={onClose} variant="secondary" className="w-full py-4 text-xs font-black uppercase tracking-widest">Close Vault</Button>
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
  const t = (text: string) => tGlobal(text, userSettings?.language || 'en');
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
    imageUrl: '',
    imageUrls: []
  });
  const [addToExpenses, setAddToExpenses] = useState(!initialData?.id);
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const url = await compressAndUploadImage(file, `birds/${user.uid}`);
        if (url) {
          urls.push(url);
        }
      }
      if (urls.length > 0) {
        setFormData(prev => {
          const existing = prev.imageUrls || [];
          const merged = [...existing, ...urls];
          return { ...prev, imageUrl: merged[0], imageUrls: merged };
        });
      }
    } catch (err) {
      console.error('Bird image processing error:', err);
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubscriptionExpired(userSettings)) {
      toast.error("Your subscription has expired! Please renew to add or edit entries.");
      return;
    }
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

  const isExpired = isSubscriptionExpired(userSettings);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isExpired && (
        <div className="bg-rose-500/20 text-rose-300 border border-rose-500/30 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center shadow-inner">
          ⚠️ Subscription Expired — Entry is in Read-Only Mode
        </div>
      )}
      <fieldset disabled={isExpired} className="space-y-4">
        <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6 space-y-1">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Ring / Name')}</label>
          <Input 
            required
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
            placeholder="E.G. RING-123"
          />
        </div>
        <div className="col-span-3 space-y-1">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Sex')}</label>
          <Select value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value as any })}>
            <option value="Unknown" className="bg-black text-white">{t('Unknown')}</option>
            <option value="Male" className="bg-black text-white">{t('Male')}</option>
            <option value="Female" className="bg-black text-white">{t('Female')}</option>
          </Select>
        </div>
        <div className="col-span-3">
          <SearchableSelect 
            label={t('Cage')}
            value={formData.cageId || ''}
            onChange={(val) => setFormData({ ...formData, cageId: val })}
            options={[
              { id: '', name: t('Unassigned') },
              ...[...cages].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })).map(c => ({ id: c.id, name: c.name }))
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6">
          <SearchableSelect 
            label={t('Species')}
            options={speciesOptions}
            value={selectedSpecies?.id}
            onChange={(id) => {
              const name = speciesOptions.find(o => o.id === id)?.name || '';
              setFormData({ ...formData, species: name, subSpecies: '' });
            }}
            onAdd={onAddSpecies}
            placeholder={t('Select Species')}
          />
        </div>
        <div className="col-span-6">
          <SearchableSelect 
            label={t('Sub-Species')}
            options={subSpeciesOptions}
            value={subSpeciesOptions.find(o => o.name === formData.subSpecies)?.id}
            onChange={(id) => {
              const name = subSpeciesOptions.find(o => o.id === id)?.name || '';
              setFormData({ ...formData, subSpecies: name });
            }}
            onAdd={(n) => selectedSpecies && onAddSubSpecies(n, selectedSpecies.id)}
            placeholder={t('Select Sub-Species')}
            disabled={!formData.species}
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6">
          <SearchableSelect 
            label={t('Mutations')}
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
            placeholder={t('Select Mutations')}
          />
        </div>
        <div className="col-span-6">
          <SearchableSelect 
            label={t('Split Mutations')}
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
            placeholder={t('Select Split Mutations')}
          />
        </div>
      </div>

      <div className="space-y-1">
        <SearchableSelect
          label={t('Statuses')}
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
          placeholder={t('Select or add statuses')}
        />
      </div>

      {isCurrentlySold && !isPreviouslySold && (
        <div className="p-4 bg-gold-500/10 border border-gold-500/20 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-gold-500">
            <DollarSign size={18} />
            <h4 className="text-xs font-black uppercase tracking-widest">{t('Record Sale as Income?')}</h4>
          </div>
          <p className="text-[10px] text-white/60">{t('This bird is marked as Sold. Would you like to record the transaction for profit tracking?')}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">{t('Sale Price')} ({symbol})</label>
              <Input type="number" value={salePrice} onChange={e => setSalePrice(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">{t('Buyer')}</label>
              <Select value={buyerId} onChange={e => setBuyerId(e.target.value)}>
                <option value="" className="bg-black text-white">{t('Unknown / None')}</option>
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
            <span className="text-[10px] font-bold text-white/60 group-hover:text-white transition-colors">{t('Record as Sales Income')}</span>
          </label>
        </div>
      )}
      
      <div className="space-y-1">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Images')}</label>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" id="bird-image-upload" name="bird-image-upload"
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
              {t('Upload Image(s)')}
            </label>
          </div>
        </div>

        {(formData.imageUrls?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {formData.imageUrls?.map((url, idx) => (
              <div key={idx} className="relative w-12 h-12 rounded-2xl bg-black overflow-hidden border border-black-700 group">
                <img 
                  src={url} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const existing = formData.imageUrls || [];
                    const filtered = existing.filter((_, i) => i !== idx);
                    setFormData(prev => {
                       const merged = filtered;
                       return { ...prev, imageUrls: merged, imageUrl: merged[0] || '' };
                    });
                  }}
                  className="absolute inset-0 bg-black/80 items-center justify-center hidden group-hover:flex transition-all text-red-500 cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {uploadError && <p className="text-[10px] text-red-500 mt-1 font-bold">{uploadError}</p>}
      </div>
 
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Birth Date')}</label><Input type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} /></div>
        <div className="flex-1 opacity-0 pointer-events-none"></div>
      </div>
 
      <div className="grid grid-cols-2 gap-4">
        <SearchableSelect 
          label={t('Father')}
          options={[
            { id: '', name: t('Unknown') }, 
            ...birds.filter(b => b.sex === 'Male' && b.id !== initialData?.id).map(b => {
              const cage = cages.find(c => c.id === b.cageId);
              const mutationsStr = b.mutations?.length ? `[${b.mutations.join(', ')}]` : '';
              return { 
                id: b.id, 
                name: b.isGhost ? `${b.name} (Pedigree Only)` : b.name,
                details: cage?.name || t('Unassigned'),
                subText: mutationsStr,
                bird: b,
                cageName: cage?.name || ''
              };
            }).sort((a, b) => {
              if (a.cageName !== b.cageName) {
                if (!a.cageName) return 1;
                if (!b.cageName) return -1;
                return a.cageName.localeCompare(b.cageName, undefined, { numeric: true, sensitivity: 'base' });
              }
              return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            })
          ]}
          value={formData.fatherId}
          onChange={(id) => setFormData({ ...formData, fatherId: id })}
          placeholder={t('Unknown')}
          cages={cages}
        />
        <SearchableSelect 
          label={t('Mother')}
          options={[
            { id: '', name: t('Unknown') }, 
            ...birds.filter(b => b.sex === 'Female' && b.id !== initialData?.id).map(b => {
              const cage = cages.find(c => c.id === b.cageId);
              const mutationsStr = b.mutations?.length ? `[${b.mutations.join(', ')}]` : '';
              return { 
                id: b.id, 
                name: b.isGhost ? `${b.name} (Pedigree Only)` : b.name,
                details: cage?.name || t('Unassigned'),
                subText: mutationsStr,
                bird: b,
                cageName: cage?.name || ''
              };
            }).sort((a, b) => {
              if (a.cageName !== b.cageName) {
                if (!a.cageName) return 1;
                if (!b.cageName) return -1;
                return a.cageName.localeCompare(b.cageName, undefined, { numeric: true, sensitivity: 'base' });
              }
              return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            })
          ]}
          value={formData.motherId}
          onChange={(id) => setFormData({ ...formData, motherId: id })}
          placeholder={t('Unknown')}
          cages={cages}
        />
      </div>
 
      <div className="grid grid-cols-2 gap-4">
        <SearchableSelect 
          label={t('Mate')}
          options={[
            { id: '', name: t('None') }, 
            ...birds.filter(b => b.id !== initialData?.id).map(b => {
              const cage = cages.find(c => c.id === b.cageId);
              const mutationsStr = b.mutations?.length ? `[${b.mutations.join(', ')}]` : '';
              return { 
                id: b.id, 
                name: b.isGhost ? `${b.name} (Pedigree Only)` : b.name,
                details: cage?.name || t('Unassigned'),
                subText: mutationsStr,
                bird: b,
                cageName: cage?.name || ''
              };
            }).sort((a, b) => {
              if (a.cageName !== b.cageName) {
                if (!a.cageName) return 1;
                if (!b.cageName) return -1;
                return a.cageName.localeCompare(b.cageName, undefined, { numeric: true, sensitivity: 'base' });
              }
              return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            })
          ]}
          value={formData.mateId}
          onChange={(id) => setFormData({ ...formData, mateId: id })}
          placeholder={t('None')}
          cages={cages}
        />
        <SearchableSelect 
          label={t('Offspring')}
          options={birds.filter(b => !b.isGhost && b.id !== initialData?.id).map(b => {
            const cage = cages.find(c => c.id === b.cageId);
            const mutationsStr = b.mutations?.length ? `[${b.mutations.join(', ')}]` : '';
            return { 
              id: b.id, 
              name: b.name,
              details: cage?.name || t('Unassigned'),
              subText: mutationsStr,
              bird: b,
              cageName: cage?.name || ''
            };
          }).sort((a, b) => {
            if (a.cageName !== b.cageName) {
              if (!a.cageName) return 1;
              if (!b.cageName) return -1;
              return a.cageName.localeCompare(b.cageName, undefined, { numeric: true, sensitivity: 'base' });
            }
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
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
          placeholder={t('Select Offspring')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-black-100 uppercase tracking-widest ml-1">{t('Purchase Date')}</label>
          <Input type="date" value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-black-100 uppercase tracking-widest ml-1">{t('Purchase Price')} ({symbol})</label>
          <Input type="number" min="0" step="0.01" value={formData.purchasePrice} onChange={e => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-black-100 uppercase tracking-widest ml-1">{t('Est. Value')} ({symbol})</label>
          <Input type="number" min="0" step="0.01" value={formData.estimatedValue} onChange={e => setFormData({ ...formData, estimatedValue: parseFloat(e.target.value) || 0 })} />
        </div>
        <SearchableSelect 
          label={t('Bought From')}
          options={[{ id: '', name: t('None') }, ...contacts.map(c => ({ id: c.id, name: c.name }))]}
          value={formData.boughtFromId || ''}
          onChange={(id) => setFormData({ ...formData, boughtFromId: id })}
          placeholder={t('Bought From')}
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
          {t('Add Purchase to Expenses')}
        </label>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Notes')}</label>
        <textarea name="birdNotes" id="birdNotes" className="w-full px-4 py-3 bg-black border border-black-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-white transition-all min-h-[100px] text-sm font-medium placeholder:text-white/30" placeholder={t('Additional notes...')}
          value={formData.notes} 
          onChange={e => setFormData({ ...formData, notes: e.target.value })} 
        />
      </div>

      <div className="space-y-3 pt-2 border-t border-black-800">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Documents (DNA, Vet, Permits)')}</label>
        
        <div className="flex gap-2">
          <Select 
            value={docType} 
            onChange={e => setDocType(e.target.value)}
            className="flex-1"
          >
            <option value="General" className="bg-black text-white">{t('General')}</option>
            <option value="DNA Sexing" className="bg-black text-white">{t('DNA Sexing')}</option>
            <option value="Vet Check" className="bg-black text-white">{t('Vet Check')}</option>
            <option value="Permit" className="bg-black text-white">{t('Permit')}</option>
            <option value="Purchase Invoice" className="bg-black text-white">{t('Invoice')}</option>
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
            {t('Upload')}
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
      </fieldset>
      <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest font-black" disabled={isUploading || isSaving || isExpired}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {(initialData && initialData.id) ? 'Update' : 'Add'} Bird
      </Button>
    </form>
  );
}

function CageForm({ user, initialData, cages, onClose, userSettings }: { user: FirebaseUser, initialData?: Cage, cages: Cage[], onClose: () => void, userSettings?: UserSettings }) {
  const t = (text: string) => getTranslatedLabel(text, userSettings?.language || 'en');
  const [formData, setFormData] = useState<Partial<Cage>>(initialData || { name: '', location: '', type: 'Standard', imageUrl: '', imageUrls: [] });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [multiPrefix, setMultiPrefix] = useState('');
  const [multiStart, setMultiStart] = useState('1');
  const [multiEnd, setMultiEnd] = useState('10');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const url = await compressAndUploadImage(file, `cages/${user.uid}`);
        if (url) {
          urls.push(url);
        }
      }
      if (urls.length > 0) {
        setFormData(prev => {
          const existing = prev.imageUrls || [];
          const merged = [...existing, ...urls];
          return { ...prev, imageUrl: merged[0], imageUrls: merged };
        });
      }
    } catch (err) {
      console.error('Cage image processing error:', err);
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubscriptionExpired(userSettings)) {
      toast.error("Your subscription has expired! Please renew to add or edit entries.");
      return;
    }
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
  const isExpired = isSubscriptionExpired(userSettings);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isExpired && (
        <div className="bg-rose-500/20 text-rose-300 border border-rose-500/30 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center shadow-inner">
          ⚠️ Subscription Expired — Entry is in Read-Only Mode
        </div>
      )}
      <fieldset disabled={isExpired} className="space-y-4">
        {!initialData && (
        <div className="flex bg-black-900 p-1 rounded-xl border border-black-800">
          <button type="button" onClick={() => setIsMultiMode(false)} className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", !isMultiMode ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20" : "text-black-100 hover:text-white")}>{t('Single Cage')}</button>
          <button type="button" onClick={() => setIsMultiMode(true)} className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", isMultiMode ? "bg-gold-500 text-black shadow-lg shadow-gold-500/20" : "text-black-100 hover:text-white")}>{t('Bulk Create')}</button>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Images')}</label>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" id="cage-image-upload" name="cage-image-upload"
              disabled={isUploading}
            />
            <label 
              htmlFor="cage-image-upload"
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 bg-black border border-black-700 rounded-2xl cursor-pointer hover:bg-zinc-700 transition-all text-xs font-black uppercase tracking-widest text-white hover:text-gold-500",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              {t('Upload Image(s)')}
            </label>
          </div>
        </div>

        {(formData.imageUrls?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {formData.imageUrls?.map((url, idx) => (
              <div key={idx} className="relative w-12 h-12 rounded-2xl bg-black overflow-hidden border border-black-700 group">
                <img 
                  src={url} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const existing = formData.imageUrls || [];
                    const filtered = existing.filter((_, i) => i !== idx);
                    setFormData(prev => {
                       const merged = filtered;
                       return { ...prev, imageUrls: merged, imageUrl: merged[0] || '' };
                    });
                  }}
                  className="absolute inset-0 bg-black/80 items-center justify-center hidden group-hover:flex transition-all text-red-500 cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {(uploadError || error) && <p className="text-rose-500 text-[10px] text-center font-bold uppercase tracking-widest">{uploadError || error}</p>}

      {isMultiMode && !initialData ? (
        <div className="space-y-4 bg-black/20 p-4 rounded-2xl border border-black-800 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Name Prefix (e.g. A)')}</label>
            <Input required value={multiPrefix} onChange={e => setMultiPrefix(e.target.value)} placeholder={t('Prefix')} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Range Start')}</label>
              <Input type="number" required value={multiStart} onChange={e => setMultiStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Range End')}</label>
              <Input type="number" required value={multiEnd} onChange={e => setMultiEnd(e.target.value)} />
            </div>
          </div>
          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight text-center italic">Example: {multiPrefix || 'PREFIX'}{multiStart || '1'} TO {multiPrefix || 'PREFIX'}{multiEnd || '10'}</p>
        </div>
      ) : (
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Cage Name/Number')}</label><Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Location')}</label><Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Type')}</label><Select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}><option value="Standard" className="bg-black text-white">{t('Standard')}</option><option value="Breeding" className="bg-black text-white">{t('Breeding')}</option><option value="Flight" className="bg-black text-white">{t('Flight')}</option><option value="Hospital" className="bg-black text-white">{t('Hospital')}</option></Select></div>
      </div>

      <div className="grid grid-cols-4 gap-2 border-t border-black-800/40 pt-4 mt-2">
        <div className="col-span-4">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Dimensions (Optional)')}</label>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">{t('Width')}</label>
          <Input 
            type="number" 
            placeholder="W" 
            value={formData.width || ''} 
            onChange={e => setFormData({ ...formData, width: parseFloat(e.target.value) || undefined })} 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">{t('Height')}</label>
          <Input 
            type="number" 
            placeholder="H" 
            value={formData.height || ''} 
            onChange={e => setFormData({ ...formData, height: parseFloat(e.target.value) || undefined })} 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">{t('Depth')}</label>
          <Input 
            type="number" 
            placeholder="D" 
            value={formData.depth || ''} 
            onChange={e => setFormData({ ...formData, depth: parseFloat(e.target.value) || undefined })} 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">{t('Unit')}</label>
          <Select 
            value={formData.dimensionUnit || 'cm'} 
            onChange={e => setFormData({ ...formData, dimensionUnit: e.target.value })}
          >
            <option value="cm" className="bg-black text-white">cm</option>
            <option value="inches" className="bg-black text-white">inches</option>
            <option value="meters" className="bg-black text-white">m</option>
          </Select>
        </div>
      </div>
      </fieldset>
      <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest font-black" disabled={isUploading || isSaving || isExpired}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {(initialData && (initialData as any).id) ? t('Update Cage') : isMultiMode ? `${t('Bulk Create')} (${Math.max(0, parseInt(multiEnd) - parseInt(multiStart) + 1 || 0)})` : t('Add Cage')}
      </Button>
    </form>
  );
}

function PairForm({ user, initialData, birds, cages, onClose, userSettings }: { user: FirebaseUser, initialData?: Pair, birds: Bird[], cages: Cage[], onClose: () => void, userSettings?: UserSettings }) {
  const t = (text: string) => getTranslatedLabel(text, userSettings?.language || 'en');
  const [formData, setFormData] = useState<Partial<Pair>>(initialData || { maleId: '', femaleId: '', status: 'Active', startDate: '', endDate: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const url = await compressAndUploadImage(file, `pairs/${user.uid}`);
        if (url) {
          urls.push(url);
        }
      }
      if (urls.length > 0) {
        setFormData(prev => {
          const existing = prev.imageUrls || [];
          const merged = [...existing, ...urls];
          return { ...prev, imageUrls: merged };
        });
      }
    } catch (err) {
      console.error('Pair image processing error:', err);
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubscriptionExpired(userSettings)) {
      toast.error("Your subscription has expired! Please renew to add or edit entries.");
      return;
    }
    if (!formData.maleId || !formData.femaleId) {
      toast.error('Please select both a male and a female bird.');
      return;
    }
    if (isSaving || isUploading) return;
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
  const isExpired = isSubscriptionExpired(userSettings);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isExpired && (
        <div className="bg-rose-500/20 text-rose-300 border border-rose-500/30 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center shadow-inner">
          ⚠️ Subscription Expired — Entry is in Read-Only Mode
        </div>
      )}
      <fieldset disabled={isExpired} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
        <SearchableSelect 
          label={t('Male / Bird 1')}
          value={formData.maleId || ''}
          onChange={(val) => setFormData({ ...formData, maleId: val })}
          options={[
            { id: '', name: t('Select Bird 1') },
            ...birds.filter(b => b.sex === 'Male' || b.sex === 'Unknown').map(b => {
              const cage = cages.find(c => c.id === b.cageId);
              const mutationsStr = b.mutations?.length ? `[${b.mutations.join(', ')}]` : '';
              return { 
                id: b.id, 
                name: b.name,
                details: cage?.name || 'Unassigned',
                subText: mutationsStr,
                bird: b,
                cageName: cage?.name || ''
              };
            }).sort((a, b) => {
              if (a.cageName !== b.cageName) {
                if (!a.cageName) return 1;
                if (!b.cageName) return -1;
                return a.cageName.localeCompare(b.cageName, undefined, { numeric: true, sensitivity: 'base' });
              }
              return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            })
          ]}
          cages={cages}
        />
        <SearchableSelect 
          label={t('Female / Bird 2')}
          value={formData.femaleId || ''}
          onChange={(val) => setFormData({ ...formData, femaleId: val })}
          options={[
            { id: '', name: t('Select Bird 2') },
            ...birds.filter(b => b.sex === 'Female' || b.sex === 'Unknown').map(b => {
              const cage = cages.find(c => c.id === b.cageId);
              const mutationsStr = b.mutations?.length ? `[${b.mutations.join(', ')}]` : '';
              return { 
                id: b.id, 
                name: b.name,
                details: cage?.name || 'Unassigned',
                subText: mutationsStr,
                bird: b,
                cageName: cage?.name || ''
              };
            }).sort((a, b) => {
              if (a.cageName !== b.cageName) {
                if (!a.cageName) return 1;
                if (!b.cageName) return -1;
                return a.cageName.localeCompare(b.cageName, undefined, { numeric: true, sensitivity: 'base' });
              }
              return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            })
          ]}
          cages={cages}
        />
      </div>
      <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Status')}</label><Select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}><option value="Active" className="bg-black text-white">{t('Active')}</option><option value="Inactive" className="bg-black text-white">{t('Inactive')}</option></Select></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Start Date')}</label><Input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('End Date')}</label><Input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} /></div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Images')}</label>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" id="pair-image-upload" name="pair-image-upload"
              disabled={isUploading}
            />
            <label 
              htmlFor="pair-image-upload"
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-3 bg-black border border-black-700 rounded-2xl cursor-pointer hover:bg-zinc-700 transition-all text-xs font-black uppercase tracking-widest text-white hover:text-gold-500",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              {t('Upload Image(s)')}
            </label>
          </div>
        </div>

        {(formData.imageUrls?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {formData.imageUrls?.map((url, idx) => (
              <div key={idx} className="relative w-12 h-12 rounded-2xl bg-black overflow-hidden border border-black-700 group">
                <img 
                  src={url} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const existing = formData.imageUrls || [];
                    const filtered = existing.filter((_, i) => i !== idx);
                    setFormData(prev => ({ ...prev, imageUrls: filtered }));
                  }}
                  className="absolute inset-0 bg-black/80 items-center justify-center hidden group-hover:flex transition-all text-red-500 cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      </fieldset>
      {uploadError && <p className="text-[10px] text-red-500 mt-1 font-bold">{uploadError}</p>}

      <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest font-black" disabled={isSaving || isUploading || isExpired}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {(initialData && initialData.id) ? t('Update Pair') : t('Add Pair')}
      </Button>
    </form>
  );
}

function TaskForm({ user, initialData, birds, cages, onClose, userSettings }: { user: FirebaseUser, initialData?: Task, birds: Bird[], cages: Cage[], onClose: () => void, userSettings?: UserSettings }) {
  const t = (text: string) => getTranslatedLabel(text, userSettings?.language || 'en');
  const [formData, setFormData] = useState<Partial<Task>>(initialData || { title: '', description: '', status: 'Pending', priority: 'Medium', category: 'General', dueDate: '', reminderDate: '', birdIds: [], subTasks: [] });
  const [newSubTask, setNewSubTask] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [birdSearch, setBirdSearch] = useState('');
  const [isBirdDropdownOpen, setIsBirdDropdownOpen] = useState(false);
  const [syncToGoogleCalendar, setSyncToGoogleCalendar] = useState(true);

  const filteredUnselectedBirds = birds.filter(b => {
    const cage = cages.find(c => c.id === b.cageId);
    const searchStr = `${b.name} ${b.species} ${b.subSpecies || ''} ${cage?.name || ''} ${b.mutations?.join(' ') || ''} ${b.splitMutations?.join(' ') || ''}`.toLowerCase();
    return !formData.birdIds?.includes(b.id) && searchStr.includes(birdSearch.toLowerCase());
  });

  const selectedBirdsData = birds.filter(b => formData.birdIds?.includes(b.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubscriptionExpired(userSettings)) {
      toast.error("Your subscription has expired! Please renew to add or edit entries.");
      return;
    }
    if (isSaving) return;

    if (syncToGoogleCalendar && formData.title && (formData.reminderDate || formData.dueDate)) {
      try {
        const url = getGoogleCalendarUrl(formData as Task, birds, cages);
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      } catch (err) {
        console.error('Failed to open Google Calendar:', err);
      }
    }

    setIsSaving(true);
    
    const processSave = async () => {
      try {
        const data = sanitizeData({ 
          ...formData,
          ...(initialData?.id ? {} : { uid: user.uid })
        });
        if (initialData?.id) { 
          await updateDoc(doc(db, 'tasks', initialData.id), data);
          toast.success(t('Task updated'));
        } else { 
          const docRef = doc(collection(db, 'tasks'));
          await setDoc(docRef, data);
          toast.success(t('Task created'));
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
    if (isSubscriptionExpired(userSettings)) return;
    const current = formData.birdIds || [];
    setFormData({ ...formData, birdIds: current.includes(birdId) ? current.filter(id => id !== birdId) : [...current, birdId] });
  };
  const isExpired = isSubscriptionExpired(userSettings);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isExpired && (
        <div className="bg-rose-500/20 text-rose-300 border border-rose-500/30 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center shadow-inner">
          ⚠️ Subscription Expired — Entry is in Read-Only Mode
        </div>
      )}
      <fieldset disabled={isExpired} className="space-y-4">
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Title')}</label><Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Category')}</label><Input required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} /></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Priority')}</label><Select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as any })}><option value="Low" className="bg-black text-white">{t('Low')}</option><option value="Medium" className="bg-black text-white">{t('Medium')}</option><option value="High" className="bg-black text-white">{t('High')}</option></Select></div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Description')}</label>
        <textarea name="taskDescription" id="taskDescription" className="w-full px-4 py-3 bg-black border border-black-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-white transition-all min-h-[80px] text-sm font-medium placeholder:text-white/30" placeholder={t('Task description...')}
          value={formData.description} 
          onChange={e => setFormData({ ...formData, description: e.target.value })} 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Status')}</label><Select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}><option value="Pending" className="bg-black text-white">{t('Pending')}</option><option value="Completed" className="bg-black text-white">{t('Completed')}</option></Select></div>
        <div className="space-y-1"><label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Due Date')}</label><Input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Calendar & Reminder')}</label>
          <Input type="datetime-local" value={formData.reminderDate || ''} onChange={e => setFormData({ ...formData, reminderDate: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Reminder notification')}</label>
          <Select 
            value={formData.reminderLeadTime || 0} 
            onChange={e => setFormData({ ...formData, reminderLeadTime: parseInt(e.target.value) })}
          >
            <option value={0} className="bg-black text-white text-xs">{t('At time of event')}</option>
            <option value={2} className="bg-black text-white text-xs">{t('2 minutes before')}</option>
            <option value={5} className="bg-black text-white text-xs">{t('5 minutes before')}</option>
            <option value={10} className="bg-black text-white text-xs">{t('10 minutes before')}</option>
            <option value={15} className="bg-black text-white text-xs">{t('15 minutes before')}</option>
            <option value={30} className="bg-black text-white text-xs">{t('30 minutes before')}</option>
            <option value={60} className="bg-black text-white text-xs">{t('1 hour before')}</option>
            <option value={1440} className="bg-black text-white text-xs">{t('1 day before')}</option>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2.5 px-1.5 py-1">
        <input 
          type="checkbox" 
          id="syncToGoogleCalendar"
          checked={syncToGoogleCalendar}
          onChange={(e) => setSyncToGoogleCalendar(e.target.checked)}
          className="w-4 h-4 rounded border-zinc-800 bg-black text-gold-500 focus:ring-gold-500/20 cursor-pointer"
        />
        <div className="flex flex-col">
          <label htmlFor="syncToGoogleCalendar" className="text-[11px] font-bold text-white/95 select-none cursor-pointer">
            {t('Add to Google Calendar on save')}
          </label>
          <span className="text-[9px] text-white/40">{t('Opens calendar automatically to schedule mobile notifications.')}</span>
        </div>
      </div>
      <div className="space-y-2 relative">
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Tag Birds')}</label>
        
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
            <span className="text-[10px] text-white/30 italic ml-1 leading-8 col-span-2">{t('No birds tagged yet...')}</span>
          )}
        </div>

        <SearchableSelect 
          label=""
          placeholder={t('Tag more birds...')}
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
        <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1">{t('Subtasks')}</label>
        <div className="flex gap-2">
          <Input placeholder={t('Add subtask...')} value={newSubTask} onChange={e => setNewSubTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubTask())} />
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
      </fieldset>
      <Button type="submit" className="w-full py-4 text-sm uppercase tracking-widest font-black" disabled={isSaving || isExpired}>
        {isSaving ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
        {(initialData && initialData.id) ? t('Update Task') : t('Add Task')}
      </Button>
    </form>
  );
}
