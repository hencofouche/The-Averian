import React, { useState, useMemo } from 'react';
import { 
  Share2, Send, Copy, Check, QrCode, Eye, Type, Hash, Sliders, ListPlus, CheckSquare, Heart, Image as ImageIcon, Loader2 
} from 'lucide-react';
import { Bird, Cage, Pair, BreedingRecord, UserSettings, CustomBirdFieldDefinition } from '../types';
import { Button, Badge } from './ui';
import { db, auth } from '../firebase';
import { addDoc, collection } from 'firebase/firestore';
import { ensurePassportPayloadFitsFirestore } from '../lib/image-utils';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';

async function imageUriToFile(uri: string, filename: string): Promise<File | null> {
  if (!uri) return null;
  try {
    if (uri.startsWith('data:')) {
      const parts = uri.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const ext = mime.split('/')[1] || 'jpg';
      const cleanName = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
      return new File([u8arr], cleanName, { type: mime });
    } else {
      const response = await fetch(uri, { mode: 'cors' });
      const blob = await response.blob();
      const mime = blob.type || 'image/jpeg';
      const ext = mime.split('/')[1] || 'jpg';
      const cleanName = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
      return new File([blob], cleanName, { type: mime });
    }
  } catch (err) {
    console.warn('Could not convert image URI to File:', err);
    return null;
  }
}

export function ShareBirdModal({ 
  bird, 
  mother, 
  father, 
  mate, 
  offspring, 
  cages, 
  cageName, 
  userSettings, 
  onClose 
}: { 
  bird: Bird; 
  mother?: Bird; 
  father?: Bird; 
  mate?: Bird; 
  offspring?: Bird[]; 
  cages?: Cage[]; 
  cageName?: string; 
  userSettings?: UserSettings | null; 
  onClose: () => void; 
}) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isTransferMode, setIsTransferMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  const birdPhotoUrl = bird.imageUrl || (bird.imageUrls && bird.imageUrls[0]) || '';
  const [includePhoto, setIncludePhoto] = useState<boolean>(!!birdPhotoUrl);

  // Dynamic field selection for standard share
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    name: true,
    species: true,
    sex: true,
    cage: true,
    birthDate: true,
    mutations: true,
    splitMutations: true,
    statuses: true,
    mother: true,
    father: true,
    mate: true,
    offspring: true,
    notes: false,
    customFields: true,
  });

  const customFieldEntries = useMemo(() => {
    if (!bird.customFields) return [];
    return Object.entries(bird.customFields)
      .filter(([_, v]) => v !== undefined && v !== '' && v !== null)
      .map(([key, val]) => {
        const def = userSettings?.customBirdFields?.find(f => f.id === key || f.name.toLowerCase() === key.toLowerCase());
        return {
          key,
          name: def?.name || key,
          value: val,
          type: def?.type || (typeof val === 'number' ? 'number' : 'text')
        };
      });
  }, [bird.customFields, userSettings?.customBirdFields]);

  const toggleField = (field: string) => {
    setSelectedFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const shareText = useMemo(() => {
    const lines = [`Bird Passport: ${bird.name}`];
    if (selectedFields.species && bird.species) lines.push(`Species: ${bird.species}${bird.subSpecies ? ` (${bird.subSpecies})` : ''}`);
    if (selectedFields.sex && bird.sex) lines.push(`Sex: ${bird.sex}`);
    if (selectedFields.cage && cageName) lines.push(`Cage: ${cageName}`);
    if (selectedFields.birthDate && bird.birthDate) lines.push(`Birth Date: ${bird.birthDate}`);
    if (selectedFields.mutations && bird.mutations?.length) lines.push(`Mutations: ${bird.mutations.join(', ')}`);
    if (selectedFields.splitMutations && bird.splitMutations?.length) lines.push(`Split: ${bird.splitMutations.join(', ')}`);
    if (selectedFields.statuses && bird.statuses?.length) lines.push(`Status: ${bird.statuses.join(', ')}`);
    if (selectedFields.mother && mother) lines.push(`Mother: ${mother.name}`);
    if (selectedFields.father && father) lines.push(`Father: ${father.name}`);
    if (selectedFields.mate && mate) lines.push(`Mate: ${mate.name}`);
    if (selectedFields.offspring && offspring?.length) lines.push(`Offspring: ${offspring.map(o => o.name).join(', ')}`);
    if (selectedFields.notes && bird.notes) lines.push(`Notes: ${bird.notes}`);
    
    if (selectedFields.customFields && customFieldEntries.length > 0) {
      lines.push('--- Additional Information ---');
      customFieldEntries.forEach(item => {
        lines.push(`${item.name}: ${item.value}`);
      });
    }

    return lines.join('\n');
  }, [bird, mother, father, mate, offspring, cageName, selectedFields, customFieldEntries]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success('Bird information copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy text');
    }
  };

  const handleNativeShare = async () => {
    setIsSharing(true);
    try {
      const filesToShare: File[] = [];
      if (includePhoto && birdPhotoUrl) {
        const file = await imageUriToFile(birdPhotoUrl, `bird-${bird.name.replace(/[^a-zA-Z0-9]/g, '_')}`);
        if (file) filesToShare.push(file);
      }

      if (navigator.share) {
        const shareData: ShareData = {
          title: `Bird Passport: ${bird.name}`,
          text: shareText,
        };

        if (filesToShare.length > 0 && navigator.canShare && navigator.canShare({ files: filesToShare })) {
          shareData.files = filesToShare;
        }

        await navigator.share(shareData);
      } else {
        handleCopyText();
      }
    } catch (err) {
      if ((err as any).name !== 'AbortError') {
        console.error('Share error:', err);
        try {
          if (navigator.share) {
            await navigator.share({
              title: `Bird Passport: ${bird.name}`,
              text: shareText
            });
          } else {
            handleCopyText();
          }
        } catch (_) {
          toast.error('Share failed or was cancelled');
        }
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleCreateTransferLink = async () => {
    setIsGenerating(true);
    try {
      const cleanCustomFields: Record<string, string | number> = {};
      if (bird.customFields) {
        Object.entries(bird.customFields).forEach(([k, v]) => {
          if (v !== undefined && v !== '' && v !== null) cleanCustomFields[k] = v;
        });
      }

      const relevantFieldDefs: CustomBirdFieldDefinition[] = (userSettings?.customBirdFields || []).filter(
        def => cleanCustomFields[def.id] !== undefined || cleanCustomFields[def.name] !== undefined
      );

      const transferData = {
        ...bird,
        id: undefined,
        originalId: bird.id,
        uid: undefined,
        cageId: undefined,
        cageName: cageName || undefined,
        mateId: undefined,
        fatherName: father?.name || undefined,
        motherName: mother?.name || undefined,
        mateName: mate?.name || undefined,
        customFields: Object.keys(cleanCustomFields).length > 0 ? cleanCustomFields : undefined,
        customFieldDefinitions: relevantFieldDefs.length > 0 ? relevantFieldDefs : undefined,
        transferredAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'shared_items'), {
        type: 'bird',
        action: 'transfer',
        data: JSON.stringify(ensurePassportPayloadFitsFirestore(transferData)),
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid || ''
      });

      const transferUrl = `${window.location.origin}?transferId=${docRef.id}`;
      
      if (navigator.share) {
        await navigator.share({
          title: `Transfer Bird: ${bird.name}`,
          text: `Accept digital transfer for ${bird.name} into your aviary:`,
          url: transferUrl
        });
      } else {
        await navigator.clipboard.writeText(transferUrl);
        toast.success('Transfer link copied to clipboard!');
      }
      onClose();
    } catch (err) {
      console.error('Failed to create transfer link:', err);
      toast.error('Failed to generate transfer link');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-black-900 border border-black-800 rounded-xl">
        <button
          type="button"
          onClick={() => setIsTransferMode(false)}
          className={cn(
            "py-2 px-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2",
            !isTransferMode ? "bg-gold-500 text-black shadow-md" : "text-white/60 hover:text-white"
          )}
        >
          <Share2 size={14} />
          Standard Share
        </button>
        <button
          type="button"
          onClick={() => setIsTransferMode(true)}
          className={cn(
            "py-2 px-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2",
            isTransferMode ? "bg-gold-500 text-black shadow-md" : "text-white/60 hover:text-white"
          )}
        >
          <Send size={14} />
          Digital Transfer
        </button>
      </div>

      {!isTransferMode ? (
        <>
          {/* Quick Actions Bar - Top */}
          <div className="p-3 bg-gradient-to-r from-gold-500/10 via-amber-500/10 to-transparent border border-gold-500/30 rounded-2xl flex items-center justify-between gap-2 shadow-sm">
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-gold-400 block">Quick Action</span>
              <span className="text-xs font-bold text-white truncate block">{bird.name} ({bird.species || 'Bird'})</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleCopyText} 
                className="py-1.5 px-3 flex items-center gap-1.5 text-[10px] font-black uppercase"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button 
                type="button" 
                variant="primary" 
                onClick={handleNativeShare} 
                disabled={isSharing}
                className="py-1.5 px-3 flex items-center gap-1.5 text-[10px] font-black uppercase"
              >
                {isSharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                {isSharing ? 'Preparing...' : 'Share'}
              </Button>
            </div>
          </div>

          {/* Bird Photo Attachment Option */}
          {birdPhotoUrl && (
            <div className="p-3 bg-black-900 border border-gold-500/30 rounded-2xl flex items-center gap-3 shadow-md">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-gold-500/40 bg-black shrink-0 relative">
                <img 
                  src={birdPhotoUrl} 
                  alt={bird.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white truncate">{bird.name} Photo</span>
                  <Badge variant="warning" className="text-[9px] px-1.5 py-0.5 bg-gold-500/20 text-gold-400 border-gold-500/30">Photo Attached</Badge>
                </div>
                <label className="flex items-center gap-2 mt-1 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={includePhoto} 
                    onChange={(e) => setIncludePhoto(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-black-700 bg-black text-gold-500 focus:ring-0"
                  />
                  <span className="text-[11px] text-gold-400 font-medium">Attach photo when sharing</span>
                </label>
              </div>
            </div>
          )}

          {/* Field Selection Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Include Details in Share:
              </label>
              <button 
                type="button"
                onClick={() => {
                  const allSelected = Object.values(selectedFields).every(v => v);
                  const next: Record<string, boolean> = {};
                  Object.keys(selectedFields).forEach(k => next[k] = !allSelected);
                  setSelectedFields(next);
                }}
                className="text-[9px] font-bold text-gold-500 hover:underline uppercase"
              >
                Toggle All
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'name', label: 'Bird Name / ID' },
                { id: 'species', label: 'Species' },
                { id: 'sex', label: 'Sex' },
                { id: 'cage', label: 'Cage' },
                { id: 'birthDate', label: 'Birth Date' },
                { id: 'mutations', label: 'Mutations' },
                { id: 'splitMutations', label: 'Split Mutations' },
                { id: 'statuses', label: 'Statuses' },
                { id: 'mother', label: 'Mother' },
                { id: 'father', label: 'Father' },
                { id: 'mate', label: 'Mate' },
                { id: 'offspring', label: 'Offspring' },
                { id: 'notes', label: 'Notes' },
                ...(customFieldEntries.length > 0 ? [{ id: 'customFields', label: `Custom Fields (${customFieldEntries.length})` }] : [])
              ].map(f => (
                <label 
                  key={f.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none",
                    selectedFields[f.id] 
                      ? "bg-gold-500/10 border-gold-500/40 text-gold-400" 
                      : "bg-black-900/60 border-black-800 text-white/50 hover:border-black-700"
                  )}
                >
                  <input 
                    type="checkbox" 
                    checked={!!selectedFields[f.id]} 
                    onChange={() => toggleField(f.id)}
                    className="w-3.5 h-3.5 rounded border-black-700 bg-black text-gold-500 focus:ring-0"
                  />
                  <span className="truncate">{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Text Preview Box */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Formatted Preview:
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-[10px] font-bold text-gold-400 hover:text-gold-300 flex items-center gap-1 uppercase tracking-wider transition-colors"
              >
                {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
            </div>
            <div className="p-3 bg-black-950 border border-black-800 rounded-xl font-mono text-xs text-white/80 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar select-all">
              {shareText}
            </div>
          </div>

          {/* Sticky Bottom Action Buttons */}
          <div className="sticky -bottom-6 -mx-6 -mb-6 p-4 bg-black-950/95 backdrop-blur-md border-t border-black-800 flex gap-2 z-20 mt-4 shadow-2xl">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleCopyText} 
              className="flex-1 py-3 flex items-center justify-center gap-2 text-xs font-black uppercase"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy Text'}
            </Button>
            <Button 
              type="button" 
              variant="primary" 
              onClick={handleNativeShare} 
              className="flex-1 py-3 flex items-center justify-center gap-2 text-xs font-black uppercase"
            >
              <Share2 size={16} />
              Share Details
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Transfer Mode Explanation */}
          <div className="p-4 bg-gold-500/10 border border-gold-500/20 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-gold-400">
              <Send size={16} />
              <h4 className="text-xs font-black uppercase tracking-wider">Digital Transfer Link</h4>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Create a secure, one-click digital transfer link for <strong className="text-white">{bird.name}</strong>. The recipient can import this bird directly into their aviary database, including its complete mutation profiles and custom fields.
            </p>
          </div>

          {/* Included payload overview */}
          <div className="p-3 bg-black-900 border border-black-800 rounded-xl space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Included in Transfer:</p>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <Badge variant="neutral" className="bg-zinc-800 text-white">Full Identification</Badge>
              <Badge variant="neutral" className="bg-zinc-800 text-white">Pedigree Data</Badge>
              <Badge variant="neutral" className="bg-zinc-800 text-white">Mutations & Splits</Badge>
              {customFieldEntries.length > 0 && (
                <Badge variant="neutral" className="bg-gold-500/20 text-gold-400 border-gold-500/30">
                  {customFieldEntries.length} Custom Fields
                </Badge>
              )}
            </div>
          </div>

          {/* Sticky Transfer Action Button */}
          <div className="sticky -bottom-6 -mx-6 -mb-6 p-4 bg-black-950/95 backdrop-blur-md border-t border-black-800 z-20 mt-4 shadow-2xl">
            <Button 
              type="button" 
              variant="primary" 
              onClick={handleCreateTransferLink} 
              disabled={isGenerating}
              className="w-full py-3.5 flex items-center justify-center gap-2 text-xs font-black uppercase"
            >
              <Send size={16} />
              {isGenerating ? 'Generating Passport...' : 'Create & Share Transfer Link'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function SharePairModal({ 
  pair, 
  male, 
  female, 
  birds, 
  cages, 
  records, 
  userSettings, 
  onClose 
}: { 
  pair: Pair; 
  male?: Bird; 
  female?: Bird; 
  birds: Bird[]; 
  cages?: Cage[]; 
  records: BreedingRecord[]; 
  userSettings?: UserSettings | null; 
  onClose: () => void; 
}) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isTransferMode, setIsTransferMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const malePhotoUrl = male?.imageUrl || (male?.imageUrls && male.imageUrls[0]) || '';
  const femalePhotoUrl = female?.imageUrl || (female?.imageUrls && female.imageUrls[0]) || '';
  const [includeMalePhoto, setIncludeMalePhoto] = useState<boolean>(!!malePhotoUrl);
  const [includeFemalePhoto, setIncludeFemalePhoto] = useState<boolean>(!!femalePhotoUrl);
  
  // Field selection for standard share
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({
    pairName: true,
    status: true,
    startDate: true,
    maleInfo: true,
    femaleInfo: true,
    maleMutations: true,
    femaleMutations: true,
    maleParents: true,
    femaleParents: true,
    breedingRecords: true,
    customFields: true,
  });

  const cage = cages?.find(c => c.id === (male?.cageId || female?.cageId));

  const maleFather = birds.find(b => b.id === male?.fatherId);
  const maleMother = birds.find(b => b.id === male?.motherId);
  const femaleFather = birds.find(b => b.id === female?.fatherId);
  const femaleMother = birds.find(b => b.id === female?.motherId);

  const maleCustomEntries = useMemo(() => {
    if (!male?.customFields) return [];
    return Object.entries(male.customFields)
      .filter(([_, v]) => v !== undefined && v !== '' && v !== null)
      .map(([key, val]) => {
        const def = userSettings?.customBirdFields?.find(f => f.id === key || f.name.toLowerCase() === key.toLowerCase());
        return { key, name: def?.name || key, value: val, type: def?.type || (typeof val === 'number' ? 'number' : 'text') };
      });
  }, [male?.customFields, userSettings?.customBirdFields]);

  const femaleCustomEntries = useMemo(() => {
    if (!female?.customFields) return [];
    return Object.entries(female.customFields)
      .filter(([_, v]) => v !== undefined && v !== '' && v !== null)
      .map(([key, val]) => {
        const def = userSettings?.customBirdFields?.find(f => f.id === key || f.name.toLowerCase() === key.toLowerCase());
        return { key, name: def?.name || key, value: val, type: def?.type || (typeof val === 'number' ? 'number' : 'text') };
      });
  }, [female?.customFields, userSettings?.customBirdFields]);

  const toggleField = (field: string) => {
    setSelectedFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const shareText = useMemo(() => {
    const lines = [`Breeding Pair: ${male?.name || 'Unknown'} x ${female?.name || 'Unknown'}`];
    if (selectedFields.status) lines.push(`Status: ${pair.status}`);
    if (selectedFields.startDate && pair.startDate) lines.push(`Formed: ${pair.startDate}`);
    if (cage) lines.push(`Cage: ${cage.name}`);

    lines.push('\n--- Male (Cock) ---');
    lines.push(`Name: ${male?.name || 'Unknown'}`);
    if (male?.species) lines.push(`Species: ${male.species}${male.subSpecies ? ` (${male.subSpecies})` : ''}`);
    if (selectedFields.maleMutations && male?.mutations?.length) lines.push(`Mutations: ${male.mutations.join(', ')}`);
    if (selectedFields.maleMutations && male?.splitMutations?.length) lines.push(`Split: ${male.splitMutations.join(', ')}`);
    if (selectedFields.maleParents && maleFather) lines.push(`Sire (Father): ${maleFather.name}`);
    if (selectedFields.maleParents && maleMother) lines.push(`Dam (Mother): ${maleMother.name}`);
    if (selectedFields.customFields && maleCustomEntries.length > 0) {
      maleCustomEntries.forEach(item => lines.push(`${item.name}: ${item.value}`));
    }

    lines.push('\n--- Female (Hen) ---');
    lines.push(`Name: ${female?.name || 'Unknown'}`);
    if (female?.species) lines.push(`Species: ${female.species}${female.subSpecies ? ` (${female.subSpecies})` : ''}`);
    if (selectedFields.femaleMutations && female?.mutations?.length) lines.push(`Mutations: ${female.mutations.join(', ')}`);
    if (selectedFields.femaleMutations && female?.splitMutations?.length) lines.push(`Split: ${female.splitMutations.join(', ')}`);
    if (selectedFields.femaleParents && femaleFather) lines.push(`Sire (Father): ${femaleFather.name}`);
    if (selectedFields.femaleParents && femaleMother) lines.push(`Dam (Mother): ${femaleMother.name}`);
    if (selectedFields.customFields && femaleCustomEntries.length > 0) {
      femaleCustomEntries.forEach(item => lines.push(`${item.name}: ${item.value}`));
    }

    if (selectedFields.breedingRecords && records.length > 0) {
      lines.push(`\n--- Breeding History (${records.length} Clutches) ---`);
      records.forEach((r, idx) => {
        const stats: string[] = [];
        if (r.clutchSize) stats.push(`${r.clutchSize} Eggs`);
        if (r.fertileEggs) stats.push(`${r.fertileEggs} Fertile`);
        if (r.hatchedCount) stats.push(`${r.hatchedCount} Hatched`);
        if (r.bandedCount) stats.push(`${r.bandedCount} Ringed/Banded`);
        lines.push(`Clutch #${idx + 1} (${r.clutchDate || 'Unknown Date'}): ${stats.join(' | ') || r.status}`);
      });
    }

    return lines.join('\n');
  }, [pair, male, female, cage, maleFather, maleMother, femaleFather, femaleMother, records, selectedFields, maleCustomEntries, femaleCustomEntries]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success('Pair information copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy text');
    }
  };

  const handleNativeShare = async () => {
    setIsSharing(true);
    try {
      const filesToShare: File[] = [];
      if (includeMalePhoto && malePhotoUrl) {
        const file = await imageUriToFile(malePhotoUrl, `cock-${male?.name ? male.name.replace(/[^a-zA-Z0-9]/g, '_') : 'male'}`);
        if (file) filesToShare.push(file);
      }
      if (includeFemalePhoto && femalePhotoUrl) {
        const file = await imageUriToFile(femalePhotoUrl, `hen-${female?.name ? female.name.replace(/[^a-zA-Z0-9]/g, '_') : 'female'}`);
        if (file) filesToShare.push(file);
      }

      if (navigator.share) {
        const shareData: ShareData = {
          title: `Breeding Pair: ${male?.name || 'Sire'} x ${female?.name || 'Dam'}`,
          text: shareText,
        };

        if (filesToShare.length > 0 && navigator.canShare && navigator.canShare({ files: filesToShare })) {
          shareData.files = filesToShare;
        }

        await navigator.share(shareData);
      } else {
        handleCopyText();
      }
    } catch (err) {
      if ((err as any).name !== 'AbortError') {
        console.error('Share error:', err);
        try {
          if (navigator.share) {
            await navigator.share({
              title: `Breeding Pair: ${male?.name || 'Sire'} x ${female?.name || 'Dam'}`,
              text: shareText,
            });
          } else {
            handleCopyText();
          }
        } catch (_) {
          toast.error('Share failed or was cancelled');
        }
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleCreateTransferLink = async () => {
    setIsGenerating(true);
    try {
      const cleanBirdForTransfer = (b?: Bird, f?: Bird, m?: Bird) => b ? {
        name: b.name,
        species: b.species,
        subSpecies: b.subSpecies,
        sex: b.sex,
        birthDate: b.birthDate,
        mutations: b.mutations || [],
        splitMutations: b.splitMutations || [],
        statuses: b.statuses || [],
        imageUrl: b.imageUrl,
        imageUrls: b.imageUrls || (b.imageUrl ? [b.imageUrl] : []),
        fatherName: f?.name || undefined,
        motherName: m?.name || undefined,
        notes: b.notes,
        customFields: b.customFields || undefined,
      } : undefined;

      const relevantDefs = (userSettings?.customBirdFields || []).filter(def => 
        (male?.customFields && (male.customFields[def.id] !== undefined || male.customFields[def.name] !== undefined)) ||
        (female?.customFields && (female.customFields[def.id] !== undefined || female.customFields[def.name] !== undefined))
      );

      const transferData = {
        type: 'pair',
        status: pair.status,
        startDate: pair.startDate,
        endDate: pair.endDate,
        maleName: male?.name,
        maleSpecies: male?.species,
        maleBird: cleanBirdForTransfer(male, maleFather, maleMother),
        femaleName: female?.name,
        femaleSpecies: female?.species,
        femaleBird: cleanBirdForTransfer(female, femaleFather, femaleMother),
        breedingRecords: records.map(r => ({
          clutchDate: r.clutchDate,
          hatchDate: r.hatchDate,
          clutchSize: r.clutchSize,
          fertileEggs: r.fertileEggs,
          hatchedCount: r.hatchedCount,
          bandedCount: r.bandedCount,
          status: r.status,
          notes: r.notes
        })),
        customFieldDefinitions: relevantDefs.length > 0 ? relevantDefs : undefined,
        transferredAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'shared_items'), {
        type: 'pair',
        action: 'transfer',
        data: JSON.stringify(ensurePassportPayloadFitsFirestore(transferData)),
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid || ''
      });

      const transferUrl = `${window.location.origin}?transferId=${docRef.id}`;
      
      if (navigator.share) {
        await navigator.share({
          title: `Transfer Pair: ${male?.name} x ${female?.name}`,
          text: `Accept digital transfer for Pair ${male?.name} x ${female?.name} into your aviary:`,
          url: transferUrl
        });
      } else {
        await navigator.clipboard.writeText(transferUrl);
        toast.success('Transfer link copied to clipboard!');
      }
      onClose();
    } catch (err) {
      console.error('Failed to create pair transfer link:', err);
      toast.error('Failed to generate transfer link');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-black-900 border border-black-800 rounded-xl">
        <button
          type="button"
          onClick={() => setIsTransferMode(false)}
          className={cn(
            "py-2 px-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2",
            !isTransferMode ? "bg-gold-500 text-black shadow-md" : "text-white/60 hover:text-white"
          )}
        >
          <Share2 size={14} />
          Standard Share
        </button>
        <button
          type="button"
          onClick={() => setIsTransferMode(true)}
          className={cn(
            "py-2 px-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2",
            isTransferMode ? "bg-gold-500 text-black shadow-md" : "text-white/60 hover:text-white"
          )}
        >
          <Send size={14} />
          Digital Transfer
        </button>
      </div>

      {!isTransferMode ? (
        <>
          {/* Quick Actions Bar - Top */}
          <div className="p-3 bg-gradient-to-r from-gold-500/10 via-amber-500/10 to-transparent border border-gold-500/30 rounded-2xl flex items-center justify-between gap-2 shadow-sm">
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-gold-400 block">Quick Action</span>
              <span className="text-xs font-bold text-white truncate block">{male?.name || 'Sire'} x {female?.name || 'Dam'}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleCopyText} 
                className="py-1.5 px-3 flex items-center gap-1.5 text-[10px] font-black uppercase"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button 
                type="button" 
                variant="primary" 
                onClick={handleNativeShare} 
                disabled={isSharing}
                className="py-1.5 px-3 flex items-center gap-1.5 text-[10px] font-black uppercase"
              >
                {isSharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                {isSharing ? 'Preparing...' : 'Share'}
              </Button>
            </div>
          </div>

          {/* Pair Photos Attachment Option */}
          {(malePhotoUrl || femalePhotoUrl) && (
            <div className="p-3 bg-black-900 border border-gold-500/30 rounded-2xl space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-gold-400 flex items-center gap-1.5">
                  <ImageIcon size={13} />
                  Attach Photos to Share:
                </span>
                <Badge variant="warning" className="text-[9px] px-1.5 py-0.5 bg-gold-500/20 text-gold-400 border-gold-500/30">Images Included</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {malePhotoUrl && (
                  <div className="flex items-center gap-2.5 p-2 bg-black-950 border border-black-800 rounded-xl">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-gold-500/30 bg-black shrink-0">
                      <img src={malePhotoUrl} alt={male?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-white truncate block">Cock: {male?.name}</span>
                      <label className="flex items-center gap-1.5 mt-0.5 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={includeMalePhoto} 
                          onChange={(e) => setIncludeMalePhoto(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-black-700 bg-black text-gold-500 focus:ring-0"
                        />
                        <span className="text-[10px] text-gold-400 font-medium">Attach Photo</span>
                      </label>
                    </div>
                  </div>
                )}
                {femalePhotoUrl && (
                  <div className="flex items-center gap-2.5 p-2 bg-black-950 border border-black-800 rounded-xl">
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-gold-500/30 bg-black shrink-0">
                      <img src={femalePhotoUrl} alt={female?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-white truncate block">Hen: {female?.name}</span>
                      <label className="flex items-center gap-1.5 mt-0.5 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={includeFemalePhoto} 
                          onChange={(e) => setIncludeFemalePhoto(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-black-700 bg-black text-gold-500 focus:ring-0"
                        />
                        <span className="text-[10px] text-gold-400 font-medium">Attach Photo</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Field Selection Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Include Details in Share:
              </label>
              <button 
                type="button"
                onClick={() => {
                  const allSelected = Object.values(selectedFields).every(v => v);
                  const next: Record<string, boolean> = {};
                  Object.keys(selectedFields).forEach(k => next[k] = !allSelected);
                  setSelectedFields(next);
                }}
                className="text-[9px] font-bold text-gold-500 hover:underline uppercase"
              >
                Toggle All
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'pairName', label: 'Pair Identification' },
                { id: 'status', label: 'Pair Status' },
                { id: 'startDate', label: 'Formed Date' },
                { id: 'maleInfo', label: 'Male Details' },
                { id: 'maleMutations', label: 'Male Mutations' },
                { id: 'maleParents', label: 'Male Parents' },
                { id: 'femaleInfo', label: 'Female Details' },
                { id: 'femaleMutations', label: 'Female Mutations' },
                { id: 'femaleParents', label: 'Female Parents' },
                { id: 'breedingRecords', label: `Breeding History (${records.length})` },
                ...((maleCustomEntries.length > 0 || femaleCustomEntries.length > 0) ? [{ id: 'customFields', label: 'Custom Fields' }] : [])
              ].map(f => (
                <label 
                  key={f.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none",
                    selectedFields[f.id] 
                      ? "bg-gold-500/10 border-gold-500/40 text-gold-400" 
                      : "bg-black-900/60 border-black-800 text-white/50 hover:border-black-700"
                  )}
                >
                  <input 
                    type="checkbox" 
                    checked={!!selectedFields[f.id]} 
                    onChange={() => toggleField(f.id)}
                    className="w-3.5 h-3.5 rounded border-black-700 bg-black text-gold-500 focus:ring-0"
                  />
                  <span className="truncate">{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Formatted Text Preview Box */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Formatted Preview:
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-[10px] font-bold text-gold-400 hover:text-gold-300 flex items-center gap-1 uppercase tracking-wider transition-colors"
              >
                {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
            </div>
            <div className="p-3 bg-black-950 border border-black-800 rounded-xl font-mono text-xs text-white/80 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar select-all">
              {shareText}
            </div>
          </div>

          {/* Sticky Bottom Action Buttons */}
          <div className="sticky -bottom-6 -mx-6 -mb-6 p-4 bg-black-950/95 backdrop-blur-md border-t border-black-800 flex gap-2 z-20 mt-4 shadow-2xl">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleCopyText} 
              className="flex-1 py-3 flex items-center justify-center gap-2 text-xs font-black uppercase"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy Text'}
            </Button>
            <Button 
              type="button" 
              variant="primary" 
              onClick={handleNativeShare} 
              disabled={isSharing}
              className="flex-1 py-3 flex items-center justify-center gap-2 text-xs font-black uppercase"
            >
              {isSharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
              {isSharing ? 'Preparing Images...' : 'Share Details'}
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Pair Transfer Mode Explanation */}
          <div className="p-4 bg-gold-500/10 border border-gold-500/20 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-gold-400">
              <Send size={16} />
              <h4 className="text-xs font-black uppercase tracking-wider">Pair Digital Transfer Link</h4>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Create a complete digital transfer passport for this breeding pair (<strong className="text-white">{male?.name}</strong> & <strong className="text-white">{female?.name}</strong>). The recipient can import both birds, their pair bond, and their past clutch history in one click.
            </p>
          </div>

          {/* Included payload overview */}
          <div className="p-3 bg-black-900 border border-black-800 rounded-xl space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Included in Transfer:</p>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <Badge variant="neutral" className="bg-zinc-800 text-white">Male & Female Identification</Badge>
              <Badge variant="neutral" className="bg-zinc-800 text-white">Pedigree Data (Sire/Dam)</Badge>
              <Badge variant="neutral" className="bg-zinc-800 text-white">Mutations & Splits</Badge>
              <Badge variant="neutral" className="bg-zinc-800 text-white">{records.length} Breeding Records</Badge>
              {(maleCustomEntries.length > 0 || femaleCustomEntries.length > 0) && (
                <Badge variant="neutral" className="bg-gold-500/20 text-gold-400 border-gold-500/30">
                  Custom Bird Fields
                </Badge>
              )}
            </div>
          </div>

          {/* Sticky Transfer Action Button */}
          <div className="sticky -bottom-6 -mx-6 -mb-6 p-4 bg-black-950/95 backdrop-blur-md border-t border-black-800 z-20 mt-4 shadow-2xl">
            <Button 
              type="button" 
              variant="primary" 
              onClick={handleCreateTransferLink} 
              disabled={isGenerating}
              className="w-full py-3.5 flex items-center justify-center gap-2 text-xs font-black uppercase"
            >
              <Send size={16} />
              {isGenerating ? 'Generating Pair Passport...' : 'Create & Share Pair Transfer Link'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
