import React, { useState, useMemo } from 'react';
import { Egg as EggIcon, Calendar, Bell, CheckCircle2, AlertTriangle, Clock, Activity, Flame, ShieldAlert, Sparkles, ChevronRight, HelpCircle, ArrowRight, DollarSign, User, TrendingUp } from 'lucide-react';
import { format, addDays, parseISO, differenceInDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { Egg, BreedingRecord, Pair, Bird } from '../types';
import { Badge } from './ui';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { db, auth } from '../firebase';
import { doc, setDoc, collection, updateDoc } from 'firebase/firestore';

const generateGoogleCalendarUrl = (text: string, date: string, details: string = '') => {
  if (!date) return '';
  const startDate = new Date(date);
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 mins later
  
  const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
  
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(details)}`;
};

// Species incubation database (in days)
export const SPECIES_INCUBATION_DATA: Record<string, { incubation: number; candling: number; ring: number; wean: number }> = {
  'Gouldian Finch': { incubation: 14, candling: 5, ring: 6, wean: 35 },
  'Zebra Finch': { incubation: 13, candling: 5, ring: 6, wean: 28 },
  'Society Finch / Bengalese': { incubation: 14, candling: 5, ring: 6, wean: 30 },
  'Budgerigar': { incubation: 18, candling: 6, ring: 7, wean: 32 },
  'Cockatiel': { incubation: 19, candling: 7, ring: 8, wean: 42 },
  'Lovebird': { incubation: 22, candling: 7, ring: 9, wean: 45 },
  'Indian Ringneck': { incubation: 23, candling: 8, ring: 12, wean: 60 },
  'Canary': { incubation: 14, candling: 6, ring: 6, wean: 28 },
  'African Grey': { incubation: 28, candling: 10, ring: 14, wean: 80 },
  'Amazon Parrot': { incubation: 28, candling: 10, ring: 14, wean: 75 },
  'Conure': { incubation: 24, candling: 8, ring: 10, wean: 50 },
  'Eclectus': { incubation: 28, candling: 10, ring: 14, wean: 80 },
  'Macaw': { incubation: 26, candling: 9, ring: 14, wean: 90 },
  'Finch (General)': { incubation: 14, candling: 5, ring: 6, wean: 30 },
  'Parakeet / Parrot (General)': { incubation: 21, candling: 7, ring: 8, wean: 45 },
  'Default': { incubation: 21, candling: 7, ring: 8, wean: 45 },
};

export const getSpeciesIncubation = (speciesName?: string) => {
  if (!speciesName) return SPECIES_INCUBATION_DATA['Default'];
  const matched = Object.keys(SPECIES_INCUBATION_DATA).find(k => 
    speciesName.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(speciesName.toLowerCase())
  );
  return matched ? SPECIES_INCUBATION_DATA[matched] : SPECIES_INCUBATION_DATA['Default'];
};

export interface EggTimelineStage {
  day: number;
  label: string;
  date: string;
  isPast: boolean;
  isCurrent: boolean;
  statusType: 'laid' | 'candling' | 'lockdown' | 'hatch' | 'ring' | 'wean';
  description: string;
}

export function computeEggTimeline(egg: Egg, incubationDays: number = 21, ringingDays: number = 7, speciesName?: string) {
  if (!egg.laidDate) return null;
  const laidDateObj = parseISO(egg.laidDate);
  const now = startOfDay(new Date());
  const speciesDefaults = getSpeciesIncubation(speciesName);
  
  const actualIncubation = incubationDays || speciesDefaults.incubation;
  const actualRing = ringingDays || speciesDefaults.ring;
  const candlingDay = speciesDefaults.candling;
  const lockdownDay = Math.max(actualIncubation - 3, candlingDay + 1);

  const candlingDate = addDays(laidDateObj, candlingDay);
  const lockdownDate = addDays(laidDateObj, lockdownDay);
  const hatchDate = addDays(laidDateObj, actualIncubation);
  
  const daysSinceLaid = differenceInDays(now, laidDateObj);
  const daysUntilHatch = differenceInDays(hatchDate, now);

  const stages: EggTimelineStage[] = [
    {
      day: 0,
      label: 'Laid',
      date: format(laidDateObj, 'yyyy-MM-dd'),
      isPast: daysSinceLaid >= 0,
      isCurrent: daysSinceLaid >= 0 && daysSinceLaid < candlingDay,
      statusType: 'laid',
      description: 'Egg laid and placed under incubation/brood.'
    },
    {
      day: candlingDay,
      label: `Candling Window (Day ${candlingDay})`,
      date: format(candlingDate, 'yyyy-MM-dd'),
      isPast: daysSinceLaid >= candlingDay,
      isCurrent: daysSinceLaid >= candlingDay && daysSinceLaid < lockdownDay,
      statusType: 'candling',
      description: 'Check for spiderweb vein network and heartbeat.'
    },
    {
      day: lockdownDay,
      label: `Lockdown / Pip (Day ${lockdownDay})`,
      date: format(lockdownDate, 'yyyy-MM-dd'),
      isPast: daysSinceLaid >= lockdownDay,
      isCurrent: daysSinceLaid >= lockdownDay && daysSinceLaid <= actualIncubation,
      statusType: 'lockdown',
      description: 'Egg drawdown & internal pipping. Maintain high humidity, avoid turning.'
    },
    {
      day: actualIncubation,
      label: `Expected Hatch (Day ${actualIncubation})`,
      date: format(hatchDate, 'yyyy-MM-dd'),
      isPast: daysSinceLaid > actualIncubation,
      isCurrent: daysSinceLaid === actualIncubation,
      statusType: 'hatch',
      description: 'Chick pushes out of the shell.'
    }
  ];

  // If already hatched, add ringing stage
  if (egg.actualHatchDate) {
    const actualHatchDateObj = parseISO(egg.actualHatchDate);
    const ringDate = addDays(actualHatchDateObj, actualRing);
    const daysSinceHatch = differenceInDays(now, actualHatchDateObj);
    stages.push({
      day: actualIncubation + actualRing,
      label: `Ringing / Banding (${actualRing}d post-hatch)`,
      date: format(ringDate, 'yyyy-MM-dd'),
      isPast: daysSinceHatch >= actualRing,
      isCurrent: daysSinceHatch >= actualRing - 1 && daysSinceHatch <= actualRing + 1,
      statusType: 'ring',
      description: 'Fit leg band before joint grows too large.'
    });
  }

  // Progress percentage
  let progressPct = Math.min(100, Math.max(0, (daysSinceLaid / actualIncubation) * 100));
  if (egg.status === 'Hatched' || egg.status === 'Weaned') progressPct = 100;

  return {
    laidDateObj,
    candlingDate,
    hatchDate,
    daysSinceLaid,
    daysUntilHatch,
    actualIncubation,
    actualRing,
    candlingDay,
    stages,
    progressPct
  };
}

interface SmartCandlingModalProps {
  egg: Egg;
  eggIndex: number;
  record: BreedingRecord;
  pair?: Pair;
  male?: Bird;
  female?: Bird;
  onUpdateEgg: (updates: Partial<Egg>) => void;
  onClose: () => void;
  onAddLocalTask?: (title: string, date: string, description?: string) => void;
}

export function SmartCandlingModal({
  egg,
  eggIndex,
  record,
  pair,
  male,
  female,
  onUpdateEgg,
  onClose,
  onAddLocalTask
}: SmartCandlingModalProps) {
  const species = female?.species || male?.species || '';
  const timeline = computeEggTimeline(egg, record.incubationDays, record.ringingDays, species);
  const [selectedStatus, setSelectedStatus] = useState(egg.status);
  const [candlingNotes, setCandlingNotes] = useState(egg.notes || '');
  const [actualHatch, setActualHatch] = useState(egg.actualHatchDate || '');
  const [salePrice, setSalePrice] = useState<number | string>(egg.salePrice ?? '');
  const [saleDate, setSaleDate] = useState<string>(egg.saleDate || format(new Date(), 'yyyy-MM-dd'));
  const [buyerName, setBuyerName] = useState<string>(egg.buyerName || '');
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  const handleSave = async () => {
    setIsProcessingSale(true);
    try {
      let transactionId = egg.transactionId;
      const numSalePrice = typeof salePrice === 'number' ? salePrice : parseFloat(salePrice) || 0;

      // If status is 'Sold' and salePrice > 0, create or update the financial transaction
      if (selectedStatus === 'Sold' && numSalePrice > 0) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const pairName = `${male?.name || 'Sire'} × ${female?.name || 'Dam'}`;
          const transData = {
            type: 'Income' as const,
            category: 'Egg Sale',
            amount: numSalePrice,
            date: saleDate || format(new Date(), 'yyyy-MM-dd'),
            description: `Egg #${eggIndex + 1} sold from Pair: ${pairName}${buyerName ? ` (Buyer: ${buyerName})` : ''}`,
            pairId: pair?.id || record.pairId,
            uid: currentUser.uid
          };

          if (transactionId) {
            try {
              await updateDoc(doc(db, 'transactions', transactionId), transData);
            } catch {
              const newDocRef = doc(collection(db, 'transactions'));
              await setDoc(newDocRef, transData);
              transactionId = newDocRef.id;
            }
          } else {
            const newDocRef = doc(collection(db, 'transactions'));
            await setDoc(newDocRef, transData);
            transactionId = newDocRef.id;
          }
        }
      }

      onUpdateEgg({
        status: selectedStatus,
        notes: candlingNotes,
        actualHatchDate: actualHatch || undefined,
        salePrice: selectedStatus === 'Sold' ? numSalePrice : undefined,
        saleDate: selectedStatus === 'Sold' ? saleDate : undefined,
        buyerName: selectedStatus === 'Sold' ? buyerName : undefined,
        transactionId: selectedStatus === 'Sold' ? transactionId : undefined
      });

      if (selectedStatus === 'Sold') {
        toast.success(`Egg #${eggIndex + 1} marked as Sold! Added to Pair ROI & Accounting.`);
      } else {
        toast.success(`Egg #${eggIndex + 1} status updated to ${selectedStatus}!`);
      }
      onClose();
    } catch (err) {
      console.error('Error saving egg status/sale:', err);
      toast.error('Failed to update egg record');
    } finally {
      setIsProcessingSale(false);
    }
  };

  const getStatusColor = (status: Egg['status']) => {
    switch (status) {
      case 'Sold': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Fertile': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'Hatched': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Weaned': return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
      case 'Infertile / Clear': return 'text-zinc-400 bg-zinc-800 border-zinc-700';
      case 'Dead In Shell': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'Died': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default: return 'text-gold-400 bg-gold-500/10 border-gold-500/30';
    }
  };

  return (
    <div className="space-y-6 text-white max-h-[85vh] overflow-y-auto custom-scrollbar p-1">
      {/* Header Info */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-500 shadow-inner">
            <Flame size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black uppercase tracking-wider">Egg #{eggIndex + 1} Candling & Countdown</h3>
              <Badge className={cn("text-[9px] font-black uppercase px-2 py-0.5", getStatusColor(selectedStatus))}>
                {selectedStatus}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              Pair: <span className="text-white font-bold">{male?.name || 'Sire'}</span> × <span className="text-white font-bold">{female?.name || 'Dam'}</span> {species && `(${species})`}
            </p>
          </div>
        </div>
      </div>

      {/* Incubation Countdown Card */}
      {timeline && (
        <div className="p-5 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-gold-500/20 rounded-2xl relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gold-500" />
              <span className="text-xs font-black uppercase tracking-widest text-gold-500">Live Incubation Progress</span>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-400">
              Day {Math.max(0, timeline.daysSinceLaid)} of {timeline.actualIncubation}d
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-700">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 via-gold-500 to-emerald-500 rounded-full transition-all duration-700 shadow-lg shadow-gold-500/20"
                style={{ width: `${timeline.progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              <span>Laid: {egg.laidDate}</span>
              <span className={cn(timeline.daysUntilHatch <= 0 ? "text-emerald-400 font-black" : "text-amber-400")}>
                {timeline.daysUntilHatch > 0 ? `${timeline.daysUntilHatch} days until hatch` : timeline.daysUntilHatch === 0 ? 'Hatching Today!' : `Overdue by ${Math.abs(timeline.daysUntilHatch)}d`}
              </span>
              <span>Hatch: {format(timeline.hatchDate, 'yyyy-MM-dd')}</span>
            </div>
          </div>

          {/* Key Milestones */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <div className={cn(
              "p-3 rounded-xl border text-left transition-all",
              timeline.daysSinceLaid >= timeline.candlingDay ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-zinc-900 border-zinc-800 text-zinc-400"
            )}>
              <div className="flex items-center gap-1.5 mb-1">
                <Flame size={12} className="text-amber-400" />
                <span className="text-[9px] font-black uppercase tracking-wider">Candling Window</span>
              </div>
              <p className="text-xs font-bold text-white">{format(timeline.candlingDate, 'MMM dd, yyyy')}</p>
              <p className="text-[9px] text-zinc-400 mt-0.5">Day {timeline.candlingDay} (Veins visible)</p>
            </div>

            <div className={cn(
              "p-3 rounded-xl border text-left transition-all",
              timeline.daysSinceLaid >= (timeline.actualIncubation - 3) ? "bg-purple-500/10 border-purple-500/30 text-purple-300" : "bg-zinc-900 border-zinc-800 text-zinc-400"
            )}>
              <div className="flex items-center gap-1.5 mb-1">
                <ShieldAlert size={12} className="text-purple-400" />
                <span className="text-[9px] font-black uppercase tracking-wider">Lockdown / Pipping</span>
              </div>
              <p className="text-xs font-bold text-white">{format(addDays(timeline.laidDateObj, timeline.actualIncubation - 3), 'MMM dd, yyyy')}</p>
              <p className="text-[9px] text-zinc-400 mt-0.5">Day {timeline.actualIncubation - 3} (Air cell drawdown)</p>
            </div>

            <div className={cn(
              "p-3 rounded-xl border text-left transition-all",
              timeline.daysSinceLaid >= timeline.actualIncubation ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-zinc-900 border-zinc-800 text-zinc-400"
            )}>
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles size={12} className="text-emerald-400" />
                <span className="text-[9px] font-black uppercase tracking-wider">Expected Hatch</span>
              </div>
              <p className="text-xs font-bold text-white">{format(timeline.hatchDate, 'MMM dd, yyyy')}</p>
              <p className="text-[9px] text-zinc-400 mt-0.5">Day {timeline.actualIncubation} incubation</p>
            </div>
          </div>

          {/* Quick Google Calendar Sync Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                const eventTitle = `Expected Hatch: Egg #${eggIndex + 1} (${male?.name || 'Sire'} × ${female?.name || 'Dam'})`;
                const eventDate = format(timeline.hatchDate, 'yyyy-MM-dd');
                const eventDesc = `Target hatching date for Egg #${eggIndex + 1} of Pair ${male?.name || 'Sire'} × ${female?.name || 'Dam'}.`;
                
                const url = generateGoogleCalendarUrl(eventTitle, eventDate, eventDesc);
                if (url) {
                  window.open(url, '_blank', 'noopener,noreferrer');
                  toast.success('Opening Google Calendar & automatically adding task locally!');
                }
                
                // Add local task
                onAddLocalTask?.(eventTitle, eventDate, eventDesc);
              }}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-secondary border border-secondary/20 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Calendar size={12} />
              Add Hatch Reminder to Calendar
            </button>
          </div>
        </div>
      )}

      {/* Interactive Candling Diagnosis Guide & Status Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-widest text-zinc-300">
            Egg Candling Diagnosis & Status
          </label>
          <span className="text-[10px] text-zinc-500 font-bold uppercase">Select diagnosis</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[
            {
              id: 'Fertile',
              label: 'Fertile (Active Veins)',
              badge: 'Healthy',
              badgeStyle: 'bg-emerald-500/20 text-emerald-400',
              desc: 'Vibrant spiderweb blood network, dark embryo eye spot, visible pulsing heartbeat.'
            },
            {
              id: 'Sold',
              label: 'Sold to Breeder / Buyer',
              badge: 'Sold (+ROI)',
              badgeStyle: 'bg-emerald-500/20 text-emerald-400 font-black',
              desc: 'Egg has been sold directly. Sale price is credited to this Pair\'s ROI and financial ledger.'
            },
            {
              id: 'Infertile / Clear',
              label: 'Infertile / Clear',
              badge: 'No Embryo',
              badgeStyle: 'bg-zinc-800 text-zinc-400',
              desc: 'Uniform yellow/orange glow with free-floating yolk. No veins by Day 5-7.'
            },
            {
              id: 'Dead In Shell',
              label: 'Dead In Shell (DIS) / Blood Ring',
              badge: 'Failed',
              badgeStyle: 'bg-rose-500/20 text-rose-400',
              desc: 'Defined circular red ring, detached dark mass, or cessation of movement/veins.'
            },
            {
              id: 'Hatched',
              label: 'Hatched Successfully',
              badge: 'Chamber Pipped',
              badgeStyle: 'bg-sky-500/20 text-sky-400',
              desc: 'Chick has breached the shell and is breathing external air.'
            },
            {
              id: 'Laid',
              label: 'Fresh / Incomplete Candling',
              badge: 'Incubating',
              badgeStyle: 'bg-amber-500/20 text-amber-400',
              desc: 'Awaiting primary candling inspection window.'
            },
            {
              id: 'Weaned',
              label: 'Weaned & Self-Feeding',
              badge: 'Juvenile',
              badgeStyle: 'bg-indigo-500/20 text-indigo-400',
              desc: 'Ready for ringing or independent flight transition.'
            }
          ].map(diag => {
            const isSelected = selectedStatus === diag.id;
            return (
              <div
                key={diag.id}
                onClick={() => setSelectedStatus(diag.id as any)}
                className={cn(
                  "p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2 text-left",
                  isSelected
                    ? "bg-gold-500/15 border-gold-500 shadow-md ring-1 ring-gold-500/30"
                    : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs font-black uppercase tracking-wider", isSelected ? "text-gold-400" : "text-white")}>
                    {diag.label}
                  </span>
                  <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-md", diag.badgeStyle)}>
                    {diag.badge}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                  {diag.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hatch Date Input if Hatched */}
      {(selectedStatus === 'Hatched' || selectedStatus === 'Weaned') && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
            <CheckCircle2 size={14} />
            Actual Hatch Date
          </label>
          <input
            type="date"
            value={actualHatch}
            onChange={e => setActualHatch(e.target.value)}
            className="w-full px-3 py-2 bg-black border border-emerald-500/30 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
          />
          {actualHatch && record.ringingDays && (
            <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wide">
              🔔 Ringing / Banding Target Date: {format(addDays(parseISO(actualHatch), record.ringingDays), 'MMMM dd, yyyy')} ({record.ringingDays} days post-hatch)
            </p>
          )}
        </div>
      )}

      {/* Egg Sale Details Input if Sold */}
      {selectedStatus === 'Sold' && (
        <div className="p-4 bg-gradient-to-br from-emerald-500/15 via-emerald-950/40 to-black border border-emerald-500/30 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" />
              <label className="text-xs font-black uppercase tracking-widest text-emerald-400">
                Egg Sale & Pair ROI Attribution
              </label>
            </div>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold uppercase px-2 py-0.5 rounded-md border border-emerald-500/30">
              Auto-adds to Pair ROI
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Sale Price</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={salePrice}
                  onChange={e => setSalePrice(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-black border border-emerald-500/40 rounded-xl text-white text-xs font-mono font-bold focus:outline-none focus:border-emerald-400"
                />
                <DollarSign size={13} className="absolute left-2 top-2.5 text-emerald-400" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Sale Date</label>
              <input
                type="date"
                value={saleDate}
                onChange={e => setSaleDate(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-emerald-500/40 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Buyer Name / Contact (Optional)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. John Doe, Local Aviary Buyer..."
                value={buyerName}
                onChange={e => setBuyerName(e.target.value)}
                className="w-full pl-7 pr-3 py-2 bg-black border border-zinc-800 rounded-xl text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-emerald-400"
              />
              <User size={13} className="absolute left-2 top-2.5 text-zinc-500" />
            </div>
          </div>

          <p className="text-[10px] text-emerald-300/80 font-medium leading-normal">
            💡 Saving will record an Income transaction of category <strong className="text-white">Egg Sale</strong> linked directly to Pair <strong className="text-white">{male?.name || 'Sire'} × {female?.name || 'Dam'}</strong>.
          </p>
        </div>
      )}

      {/* Notes Field */}
      <div className="space-y-1.5">
        <label className="text-xs font-black uppercase tracking-widest text-zinc-300">
          Candling Observations / Shell Quality Notes
        </label>
        <textarea
          rows={2}
          value={candlingNotes}
          onChange={e => setCandlingNotes(e.target.value)}
          placeholder="e.g., Heavy air sac pip observed, thick shell, faint heartbeat, incubator humidity calibrated..."
          className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold-500"
        />
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-3 pt-3 border-t border-zinc-800">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest border border-zinc-800 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-2 py-3 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-600 hover:to-amber-600 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-gold-500/20 cursor-pointer"
        >
          Save Candling Status
        </button>
      </div>
    </div>
  );
}
