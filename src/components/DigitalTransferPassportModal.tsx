import React, { useState } from 'react';
import { QrCode, Share2, Copy, Check, ShieldCheck, Bird as BirdIcon, User, Download, ExternalLink, Sparkles, Send } from 'lucide-react';
import { Bird, Pair, Cage, BreedingRecord } from '../types';
import { Badge } from './ui';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { ensurePassportPayloadFitsFirestore } from '../lib/image-utils';

interface DigitalTransferPassportModalProps {
  bird?: Bird;
  pair?: Pair;
  male?: Bird;
  female?: Bird;
  allBirds: Bird[];
  cages: Cage[];
  records?: BreedingRecord[];
  currentUserId: string;
  onClose: () => void;
}

export function DigitalTransferPassportModal({
  bird,
  pair,
  male,
  female,
  allBirds,
  cages,
  records,
  currentUserId,
  onClose
}: DigitalTransferPassportModalProps) {
  const [includePedigree, setIncludePedigree] = useState(true);
  const [includeHealthNotes, setIncludeHealthNotes] = useState(true);
  const [includeBreedingHistory, setIncludeBreedingHistory] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [passportLink, setPassportLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isBirdTransfer = !!bird;
  const entityName = isBirdTransfer ? bird.name : `${male?.name || 'Sire'} × ${female?.name || 'Dam'}`;
  const species = isBirdTransfer ? bird.species : (male?.species || female?.species || '');

  // Calculate lineage depth
  const lineageCount = React.useMemo(() => {
    if (!isBirdTransfer || !bird) return 0;
    const visited = new Set<string>();
    const countAncestors = (id?: string) => {
      if (!id || visited.has(id)) return;
      visited.add(id);
      const b = allBirds.find(x => x.id === id);
      if (b) {
        countAncestors(b.motherId);
        countAncestors(b.fatherId);
      }
    };
    countAncestors(bird.motherId);
    countAncestors(bird.fatherId);
    return visited.size;
  }, [bird, allBirds, isBirdTransfer]);

  const handleGeneratePassport = async () => {
    setIsGenerating(true);
    try {
      if (isBirdTransfer && bird) {
        // Collect comprehensive pedigree package
        const visited = new Set<string>();
        const relatedBirds: any[] = [];

        if (includePedigree) {
          const collect = (id: string | null | undefined) => {
            if (!id || visited.has(id)) return;
            visited.add(id);
            const b = allBirds.find(x => x.id === id);
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
                imageUrls: b.imageUrls || (b.imageUrl ? [b.imageUrl] : []),
                ringNumber: b.ringNumber,
                birthDate: b.birthDate,
                isGhost: true,
              });
              collect(b.motherId);
              collect(b.fatherId);
            }
          };
          collect(bird.motherId);
          collect(bird.fatherId);
        }

        const mother = allBirds.find(b => b.id === bird.motherId);
        const father = allBirds.find(b => b.id === bird.fatherId);

        const passportPayload = {
          ...bird,
          originalId: bird.id,
          uid: undefined,
          cageId: undefined,
          mateId: undefined,
          motherName: mother?.name,
          fatherName: father?.name,
          notes: includeHealthNotes ? bird.notes : undefined,
          statuses: bird.statuses || [],
          purchasePrice: undefined, // Keep buyer/seller financials private
          estimatedValue: undefined,
          relatedBirds,
          transferTimestamp: new Date().toISOString(),
          passportVersion: '2.0-averian'
        };

        // Post to shared_items collection
        const { addDoc, collection } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        
        const docRef = await addDoc(collection(db, 'shared_items'), {
          type: 'bird',
          action: 'transfer',
          data: ensurePassportPayloadFitsFirestore(passportPayload),
          createdAt: new Date().toISOString(),
          createdBy: currentUserId
        });

        const url = `${window.location.origin}?transferId=${docRef.id}`;
        setPassportLink(url);
        toast.success("1-Click Digital Transfer Passport Created!");
      } else if (pair) {
        // Pair transfer packaging
        const pairRecords = (records || []).filter(r => r.pairId === pair.id);
        const cleanBird = (b?: Bird) => b ? {
          ...b,
          originalId: b.id,
          uid: undefined,
          cageId: undefined,
          mateId: undefined,
          purchasePrice: undefined,
          estimatedValue: undefined,
          notes: includeHealthNotes ? b.notes : undefined
        } : undefined;

        const passportPayload = {
          ...pair,
          uid: undefined,
          maleBird: cleanBird(male),
          femaleBird: cleanBird(female),
          breedingRecords: includeBreedingHistory ? pairRecords.map(r => ({ ...r, pairId: undefined, uid: undefined })) : [],
          transferTimestamp: new Date().toISOString(),
          passportVersion: '2.0-averian'
        };

        const { addDoc, collection } = await import('firebase/firestore');
        const { db } = await import('../firebase');

        const docRef = await addDoc(collection(db, 'shared_items'), {
          type: 'pair',
          action: 'transfer',
          data: ensurePassportPayloadFitsFirestore(passportPayload),
          createdAt: new Date().toISOString(),
          createdBy: currentUserId
        });

        const url = `${window.location.origin}?transferId=${docRef.id}`;
        setPassportLink(url);
        toast.success("Pair Digital Passport Ready!");
      }
    } catch (err: any) {
      console.error("Failed to generate passport link:", err);
      toast.error("Error creating digital passport: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (!passportLink) return;
    navigator.clipboard.writeText(passportLink);
    setCopied(true);
    toast.success("Passport transfer link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareNative = async () => {
    if (!passportLink) return;
    const shareData = {
      title: `The Averian Passport: ${entityName}`,
      text: `Official Digital Transfer Passport for ${entityName} (${species}). Click the link to securely import complete pedigree, mutations, and records into your Averian Aviary.`,
      url: passportLink
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="space-y-6 text-white pb-2">
      {/* Passport Header Card */}
      <div className="p-5 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-gold-500/30 rounded-3xl relative overflow-hidden shadow-2xl space-y-3">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <QrCode size={120} className="text-gold-500" />
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 bg-gold-500 text-black text-[9px] font-black uppercase tracking-widest rounded-full shadow-md">
            Digital Ownership Passport
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] font-black uppercase">
            Instant 1-Click Handshake
          </Badge>
        </div>

        <div>
          <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            <BirdIcon size={20} className="text-gold-500 shrink-0" />
            {entityName}
          </h3>
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
            {species} {isBirdTransfer && bird?.ringNumber && `• Ring: ${bird.ringNumber}`}
          </p>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed max-w-lg">
          Generate an authenticated, verified digital transfer certificate. When the buyer opens the link on their device, the bird’s complete pedigree ancestry, ring numbers, photos, and mutations import directly into their Averian account without retyping.
        </p>
      </div>

      {/* Package Options */}
      {!passportLink && (
        <div className="space-y-3">
          <label className="text-xs font-black uppercase tracking-widest text-zinc-300">
            Transfer Data Inclusions
          </label>
          <div className="space-y-2">
            <div 
              onClick={() => setIncludePedigree(!includePedigree)}
              className={cn(
                "p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between",
                includePedigree ? "bg-gold-500/10 border-gold-500/50" : "bg-zinc-900 border-zinc-800 text-zinc-500"
              )}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} className={includePedigree ? "text-gold-500" : "text-zinc-600"} />
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-white">Full Ancestry Tree & Pedigree ({lineageCount} ancestors)</p>
                  <p className="text-[10px] text-zinc-400">Restores generational lineage and ghost parent links in buyer's database.</p>
                </div>
              </div>
              <input type="checkbox" checked={includePedigree} readOnly className="accent-gold-500 w-4 h-4 rounded" />
            </div>

            <div 
              onClick={() => setIncludeHealthNotes(!includeHealthNotes)}
              className={cn(
                "p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between",
                includeHealthNotes ? "bg-gold-500/10 border-gold-500/50" : "bg-zinc-900 border-zinc-800 text-zinc-500"
              )}
            >
              <div className="flex items-center gap-3">
                <Sparkles size={18} className={includeHealthNotes ? "text-gold-500" : "text-zinc-600"} />
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-white">Observations & Genetics Notes</p>
                  <p className="text-[10px] text-zinc-400">Includes split mutation data, dietary notes, and behavior history.</p>
                </div>
              </div>
              <input type="checkbox" checked={includeHealthNotes} readOnly className="accent-gold-500 w-4 h-4 rounded" />
            </div>

            {!isBirdTransfer && (
              <div 
                onClick={() => setIncludeBreedingHistory(!includeBreedingHistory)}
                className={cn(
                  "p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between",
                  includeBreedingHistory ? "bg-gold-500/10 border-gold-500/50" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                )}
              >
                <div className="flex items-center gap-3">
                  <BirdIcon size={18} className={includeBreedingHistory ? "text-gold-500" : "text-zinc-600"} />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-white">Historical Clutch Performance</p>
                    <p className="text-[10px] text-zinc-400">Attaches verified egg counts, hatch rates, and previous season yield.</p>
                  </div>
                </div>
                <input type="checkbox" checked={includeBreedingHistory} readOnly className="accent-gold-500 w-4 h-4 rounded" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Generated Passport View */}
      {passportLink && (
        <div className="p-5 bg-zinc-900 border border-gold-500/40 rounded-3xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-gold-500">
              Verified Transfer Passport Ready
            </span>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] font-black uppercase">
              Active Link
            </Badge>
          </div>

          <div className="p-3 bg-black border border-zinc-800 rounded-2xl flex items-center justify-between gap-2 overflow-hidden">
            <span className="text-xs font-mono text-zinc-300 truncate select-all">{passportLink}</span>
            <button
              onClick={handleCopyLink}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors shrink-0"
              title="Copy link"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleShareNative}
              className="py-3 px-4 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-600 hover:to-amber-600 text-black rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20 transition-all cursor-pointer"
            >
              <Send size={15} />
              Send Passport to Buyer
            </button>

            <button
              onClick={handleCopyLink}
              className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-zinc-700 transition-all cursor-pointer"
            >
              <Copy size={15} />
              {copied ? 'Link Copied!' : 'Copy Direct URL'}
            </button>
          </div>
        </div>
      )}

      {/* Modal Actions */}
      <div className="sticky -bottom-6 -mx-6 -mb-6 p-4 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 flex items-center justify-between gap-3 z-20 mt-4 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest border border-zinc-800 transition-colors cursor-pointer"
        >
          Close
        </button>

        {!passportLink && (
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGeneratePassport}
            className="flex-1 py-3 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-600 hover:to-amber-600 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-gold-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles size={16} />
            {isGenerating ? "Encrypting Passport..." : "Create Digital Transfer Passport"}
          </button>
        )}
      </div>
    </div>
  );
}
