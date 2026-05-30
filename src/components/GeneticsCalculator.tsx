import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dna, Plus, X, RefreshCw, ChevronDown, CheckSquare, Home } from 'lucide-react';
import { InheritanceType, MutationState, getAlleles, interpretGenotype } from '../lib/genetics';
import { Bird, Pair, Cage } from '../types';
import { cn } from '../lib/utils';

interface ParentMutation {
  id: string;
  mutationName: string;
  inheritance: InheritanceType;
  state: MutationState;
}

interface SearchableSelectOption {
  id: string;
  name: string;
  details?: string;
  subText?: string;
  bird?: Bird;
  pair?: Pair;
  cage?: Cage;
}

const LocalPairCompactInfo = ({ pair, birds, cages, className, onClick }: { pair: Pair, birds: Bird[], cages: Cage[], className?: string, onClick?: () => void }) => {
  const male = birds.find(b => b.id === pair.maleId);
  const female = birds.find(b => b.id === pair.femaleId);
  const cageId = male?.cageId || female?.cageId || pair.cageId;
  const cage = cages.find(c => c.id === cageId);

  const BirdMini = ({ bird, label, isMale }: { bird?: Bird, label: string, isMale: boolean }) => (
    <div className="flex items-center gap-2 min-w-0">
      <div 
        className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 border animate-pulse-subtle"
        style={{
          backgroundColor: isMale ? 'rgba(59, 130, 246, 0.15)' : 'rgba(225, 29, 72, 0.15)',
          color: isMale ? '#60a5fa' : '#fb7185',
          borderColor: isMale ? 'rgba(59, 130, 246, 0.3)' : 'rgba(225, 29, 72, 0.3)'
        }}
      >
        {label}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-black text-white uppercase truncate shrink-0">{bird?.name || 'Unassigned'}</span>
          {bird && (
            <span className="text-[8px] font-bold text-white/50 uppercase truncate">
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
              <span key={m} className="text-[7px] px-1 bg-black/40 text-amber-500/50 rounded-sm font-black uppercase italic border border-amber-500/5">/{m}</span>
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
      className={cn("flex flex-col gap-2 p-3 bg-zinc-900/60 rounded-xl border border-white/10 transition-all text-left w-full min-w-0", onClick && "cursor-pointer hover:bg-zinc-800/80 hover:border-gold-500/30", className)}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1.5 mb-0.5">
        <span className="text-[9px] font-black text-gold-500 uppercase tracking-widest">Breeding Pair</span>
        {cage && (
          <span className="text-[8px] font-bold text-white/80 uppercase flex items-center gap-1 shrink-0 bg-white/5 px-1.5 py-0.5 rounded-md border border-white/10 truncate">
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

const LocalBirdCompactInfo = ({ bird, cages, className, onClick }: { bird: Bird, cages: Cage[], className?: string, onClick?: () => void }) => {
  const cage = cages.find(c => c.id === bird.cageId);
  return (
    <div 
      className={cn("flex flex-col gap-2 p-3 bg-zinc-900/60 rounded-xl border border-white/10 transition-all text-left w-full min-w-0", onClick && "cursor-pointer hover:bg-zinc-800/80 hover:border-gold-500/30", className)}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1.5 mb-0.5">
        <span className="text-[9px] font-black text-gold-500 uppercase tracking-widest">Bird Profile</span>
        {cage && (
          <span className="text-[8px] font-bold text-white/80 uppercase flex items-center gap-1 shrink-0 bg-white/5 px-1.5 py-0.5 rounded-md border border-white/10 truncate max-w-[120px]">
            <Home size={8} className="shrink-0 animate-pulse-subtle" /> <span className="truncate">{cage.name}</span>
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2 min-w-0">
        <div 
          className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 border"
          style={{
            backgroundColor: bird.sex === 'Male' ? 'rgba(59, 130, 246, 0.15)' : bird.sex === 'Female' ? 'rgba(225, 29, 72, 0.15)' : 'rgba(255,255,255,0.05)',
            color: bird.sex === 'Male' ? '#60a5fa' : bird.sex === 'Female' ? '#fb7185' : 'rgba(255,255,255,0.4)',
            borderColor: bird.sex === 'Male' ? 'rgba(59, 130, 246, 0.3)' : bird.sex === 'Female' ? 'rgba(225, 29, 72, 0.3)' : 'rgba(255,255,255,0.1)'
          }}
        >
          {bird.sex === 'Male' ? 'M' : bird.sex === 'Female' ? 'F' : '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black text-white uppercase truncate shrink-0">{bird.name}</span>
            <span className="text-[8px] font-bold text-white/50 uppercase truncate">
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
                <span key={m} className="text-[7px] px-1 bg-black/40 text-amber-500/50 rounded-sm font-black uppercase italic border border-amber-500/5">
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

const LocalSearchableSelect = ({
  label,
  options,
  value,
  onChange,
  placeholder = "Search or select...",
  disabled = false,
  cages = [],
  birds = []
}: {
  label: string;
  options: SearchableSelectOption[];
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  cages?: Cage[];
  birds?: Bird[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const filteredOptions = options.filter(opt => {
    // Treat placeholder special
    if (opt.id === '') return true;
    return opt.name.toLowerCase().includes(search.toLowerCase()) ||
          (opt.details?.toLowerCase().includes(search.toLowerCase())) ||
          (opt.subText?.toLowerCase().includes(search.toLowerCase()));
  });

  const selectedOption = options.find(o => o.id === value);

  const renderOptionContent = (opt: SearchableSelectOption) => {
    if (opt.id === '') {
      return <span className="text-zinc-500 font-bold">{opt.name}</span>;
    }

    if (opt.bird) {
      return <LocalBirdCompactInfo bird={opt.bird} cages={cages} className="border-0 bg-transparent p-0" />;
    }

    if (opt.pair && birds) {
      return <LocalPairCompactInfo pair={opt.pair} birds={birds} cages={cages} className="border-0 bg-transparent p-0" />;
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
      
      {/* Main trigger button */}
      <div 
        className={cn(
          "w-full px-4 py-3 bg-black border border-black-700 text-white rounded-2xl cursor-pointer flex items-center justify-between transition-all text-sm font-medium hover:border-zinc-500",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="truncate flex-1 text-left">
          {selectedOption && selectedOption.id !== '' ? (
            selectedOption.bird ? (
              <LocalBirdCompactInfo bird={selectedOption.bird} cages={cages} className="border-0 bg-transparent p-0" />
            ) : selectedOption.pair ? (
              <LocalPairCompactInfo pair={selectedOption.pair} birds={birds} cages={cages} className="border-0 bg-transparent p-0" />
            ) : (
              <span>{selectedOption.name}</span>
            )
          ) : (
            <span className="text-zinc-500 italic">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={14} className={cn("transition-transform shrink-0 ml-2 text-zinc-500", isOpen && "rotate-180")} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-[101] w-full mt-1 bg-black border border-black-700 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-2 border-b border-black-800">
                <input 
                  autoFocus
                  placeholder="Search..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-black-700 text-white rounded-xl focus:outline-none focus:border-gold-500 text-xs font-medium placeholder:text-white/30"
                />
              </div>
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map(opt => (
                    <div 
                      key={opt.id}
                      className={cn(
                        "px-3 py-2 text-xs cursor-pointer hover:bg-zinc-800 transition-colors flex items-center justify-between group border-b border-zinc-900/40 last:border-b-0",
                        value === opt.id && "text-gold-500 bg-zinc-800"
                      )}
                      onClick={() => {
                        onChange(opt.id);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        {renderOptionContent(opt)}
                      </div>
                      {value === opt.id && <CheckSquare size={12} className="shrink-0 ml-2 text-gold-500" />}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                    No results found
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

export default function GeneticsCalculator({ 
  userMutations,
  birds = [],
  pairs = [],
  cages = []
}: { 
  userMutations: { id: string, name: string, inheritance?: string }[];
  birds?: Bird[];
  pairs?: Pair[];
  cages?: Cage[];
}) {
  const [dadMutations, setDadMutations] = useState<ParentMutation[]>([]);
  const [momMutations, setMomMutations] = useState<ParentMutation[]>([]);

  const [selectedPairId, setSelectedPairId] = useState<string>('');
  const [selectedDadId, setSelectedDadId] = useState<string>('');
  const [selectedMomId, setSelectedMomId] = useState<string>('');

  const sortedPairsList = useMemo(() => {
    return [...pairs].filter(p => p.maleId || p.femaleId).map(p => {
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
        name: `${mName} x ${fName}`, 
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

  const sortedDadsList = useMemo(() => {
    return [...birds]
      .filter(b => !b.isGhost && (b.sex === 'Male' || b.sex === 'Unknown'))
      .map(b => {
        const cage = cages.find(c => c.id === b.cageId);
        return { 
          id: b.id, 
          name: b.name, 
          details: `${b.species}${b.subSpecies ? ` • ${b.subSpecies}` : ''}${cage ? ` - Cage: ${cage.name}` : ''}`, 
          bird: b,
          cageName: cage?.name || ''
        };
      })
      .sort((a, b) => {
        if (a.cageName !== b.cageName) {
          if (!a.cageName) return 1;
          if (!b.cageName) return -1;
          return a.cageName.localeCompare(b.cageName, undefined, { numeric: true, sensitivity: 'base' });
        }
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [birds, cages]);

  const sortedMomsList = useMemo(() => {
    return [...birds]
      .filter(b => !b.isGhost && (b.sex === 'Female' || b.sex === 'Unknown'))
      .map(b => {
        const cage = cages.find(c => c.id === b.cageId);
        return { 
          id: b.id, 
          name: b.name, 
          details: `${b.species}${b.subSpecies ? ` • ${b.subSpecies}` : ''}${cage ? ` - Cage: ${cage.name}` : ''}`, 
          bird: b,
          cageName: cage?.name || ''
        };
      })
      .sort((a, b) => {
        if (a.cageName !== b.cageName) {
          if (!a.cageName) return 1;
          if (!b.cageName) return -1;
          return a.cageName.localeCompare(b.cageName, undefined, { numeric: true, sensitivity: 'base' });
        }
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [birds, cages]);

  const mutationOptions = userMutations.map(m => ({ id: m.id, name: m.name, inheritance: m.inheritance }));

  const loadBirdMutations = (bird: Bird, isMale: boolean) => {
    const visualMuts = bird.mutations || [];
    const splitMuts = bird.splitMutations || [];
    const loaded: ParentMutation[] = [];

    visualMuts.forEach(mutName => {
      const userMut = userMutations.find(m => m.name.toLowerCase() === mutName.toLowerCase());
      const inheritance = (userMut?.inheritance as InheritanceType) || 'autosomal_recessive';
      const state = (inheritance === 'autosomal_dominant' || inheritance === 'incomplete_dominant') ? 'sf' : 'visual';
      loaded.push({
        id: 'visual_' + mutName + '_' + Math.random().toString(36).substring(7),
        mutationName: mutName,
        inheritance,
        state
      });
    });

    splitMuts.forEach(mutName => {
      const userMut = userMutations.find(m => m.name.toLowerCase() === mutName.toLowerCase());
      const inheritance = (userMut?.inheritance as InheritanceType) || 'autosomal_recessive';
      const state = 'split';
      loaded.push({
        id: 'split_' + mutName + '_' + Math.random().toString(36).substring(7),
        mutationName: mutName,
        inheritance,
        state
      });
    });

    return loaded;
  };

  const loadPair = (pairId: string) => {
    setSelectedPairId(pairId);
    if (!pairId) {
      setSelectedDadId('');
      setSelectedMomId('');
      setDadMutations([]);
      setMomMutations([]);
      return;
    }
    const pair = pairs.find(p => p.id === pairId);
    if (!pair) return;

    const male = birds.find(b => b.id === pair.maleId);
    const female = birds.find(b => b.id === pair.femaleId);

    if (male) {
      setSelectedDadId(male.id);
      setDadMutations(loadBirdMutations(male, true));
    } else {
      setSelectedDadId('');
      setDadMutations([]);
    }

    if (female) {
      setSelectedMomId(female.id);
      setMomMutations(loadBirdMutations(female, false));
    } else {
      setSelectedMomId('');
      setMomMutations([]);
    }
  };

  const loadDad = (birdId: string) => {
    setSelectedDadId(birdId);
    setSelectedPairId(''); // Clear pair selection if changing individual
    if (!birdId) {
      setDadMutations([]);
      return;
    }
    const bird = birds.find(b => b.id === birdId);
    if (bird) {
      setDadMutations(loadBirdMutations(bird, true));
    } else {
      setDadMutations([]);
    }
  };

  const loadMom = (birdId: string) => {
    setSelectedMomId(birdId);
    setSelectedPairId(''); // Clear pair selection if changing individual
    if (!birdId) {
      setMomMutations([]);
      return;
    }
    const bird = birds.find(b => b.id === birdId);
    if (bird) {
      setMomMutations(loadBirdMutations(bird, false));
    } else {
      setMomMutations([]);
    }
  };

  const clearSelection = () => {
    setSelectedPairId('');
    setSelectedDadId('');
    setSelectedMomId('');
    setDadMutations([]);
    setMomMutations([]);
  };

  const addMutation = (isMale: boolean) => {
    const newMut: ParentMutation = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      mutationName: '',
      inheritance: 'autosomal_recessive',
      state: 'visual'
    };
    if (isMale) {
      setDadMutations([...dadMutations, newMut]);
    } else {
      setMomMutations([...momMutations, newMut]);
    }
  };

  const updateMutation = (isMale: boolean, updated: ParentMutation) => {
    if (isMale) {
      setDadMutations(dadMutations.map(m => m.id === updated.id ? updated : m));
    } else {
      setMomMutations(momMutations.map(m => m.id === updated.id ? updated : m));
    }
  };

  const removeMutation = (isMale: boolean, id: string) => {
    if (isMale) {
      setDadMutations(dadMutations.filter(m => m.id !== id));
    } else {
      setMomMutations(momMutations.filter(m => m.id !== id));
    }
  };

  // --- Calculation Engine ---
  const results = useMemo(() => {
    const activeMutations = Array.from(new Set([
      ...dadMutations.map(m => m.mutationName),
      ...momMutations.map(m => m.mutationName)
    ])).filter(Boolean);

    if (activeMutations.length === 0) return null;

    const lociCrosses = activeMutations.map(mutName => {
      const dadMut = dadMutations.find(m => m.mutationName === mutName);
      const momMut = momMutations.find(m => m.mutationName === mutName);
      
      // Use dad's inheritance if available, else mom's
      const type = dadMut?.inheritance || momMut?.inheritance || 'autosomal_recessive';
      const symbol = mutName.charAt(0).toUpperCase();

      const dadState = dadMut?.state || 'normal';
      const momState = momMut?.state || 'normal';

      const dadAlleles = getAlleles(type, dadState, true, symbol);
      const momAlleles = getAlleles(type, momState, false, symbol);

      const offspring = [
        [dadAlleles[0], momAlleles[0]],
        [dadAlleles[0], momAlleles[1]],
        [dadAlleles[1], momAlleles[0]],
        [dadAlleles[1], momAlleles[1]],
      ];

      return { id: mutName, name: mutName, type, symbol, offspring };
    });

    // Cartesian product
    let combinedOffspring: { allelesByLocus: Record<string, string[]> }[] = [{ allelesByLocus: {} }];

    for (const cross of lociCrosses) {
      const nextCombined: typeof combinedOffspring = [];
      for (const existing of combinedOffspring) {
        for (const locusOffspring of cross.offspring) {
          nextCombined.push({
            allelesByLocus: {
              ...existing.allelesByLocus,
              [cross.id]: locusOffspring
            }
          });
        }
      }
      combinedOffspring = nextCombined;
    }

    // Grouping
    const maleResults: Record<string, { count: number, visuals: string[], splits: string[], genotypeStr: string }> = {};
    const femaleResults: Record<string, { count: number, visuals: string[], splits: string[], genotypeStr: string }> = {};

    let totalMales = 0;
    let totalFemales = 0;

    for (const offspring of combinedOffspring) {
      const visuals: string[] = [];
      const splits: string[] = [];
      const genotypeParts: string[] = [];
      
      let isMale = true;

      for (const locus of lociCrosses) {
        const alleles = offspring.allelesByLocus[locus.id];
        
        if (locus.type === 'sex_linked_recessive' && alleles.includes('W')) {
          isMale = false;
        }

        const interpretation = interpretGenotype(locus.type, alleles, locus.name, locus.symbol);
        if (interpretation.visual) visuals.push(interpretation.visual);
        if (interpretation.split) splits.push(interpretation.split);
        
        genotypeParts.push(alleles.join(''));
      }
      
      const key = [...visuals].sort().join(', ') + '|' + [...splits].sort().join(', ');
      const resultObj = {
        visuals: visuals.length > 0 ? visuals : ['Normal'],
        splits,
        genotypeStr: genotypeParts.join(' ; ')
      };

      if (isMale) {
        totalMales++;
        if (!maleResults[key]) maleResults[key] = { count: 0, ...resultObj };
        maleResults[key].count++;
      } else {
        totalFemales++;
        if (!femaleResults[key]) femaleResults[key] = { count: 0, ...resultObj };
        femaleResults[key].count++;
      }
    }

    const hasSexLinked = lociCrosses.some(l => l.type === 'sex_linked_recessive');
    
    if (!hasSexLinked) {
      return {
        type: 'unsexed',
        total: totalMales,
        results: Object.values(maleResults).map(r => ({ ...r, percentage: (r.count / totalMales) * 100 })).sort((a, b) => b.percentage - a.percentage)
      };
    }

    return {
      type: 'sexed',
      totalMales,
      totalFemales,
      males: Object.values(maleResults).map(r => ({ ...r, percentage: (r.count / totalMales) * 100 })).sort((a, b) => b.percentage - a.percentage),
      females: Object.values(femaleResults).map(r => ({ ...r, percentage: (r.count / totalFemales) * 100 })).sort((a, b) => b.percentage - a.percentage)
    };

  }, [dadMutations, momMutations]);

  return (
    <div className="bg-black text-white pb-12">
      
      {/* Top Panel: Configuration */}
      <div className="border-b border-black-800 bg-black-950 p-3 sm:p-4">
        <div className="max-w-5xl mx-auto">
          
          {/* Quick Load from Flock */}
          <div className="bg-zinc-900 border border-black-800 rounded-2xl p-4 mb-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-black text-xs sm:text-sm uppercase tracking-wider text-gold-500">Quick-Load Parental Data</h4>
                <p className="text-[10px] sm:text-xs text-black-200">Select an existing pair or individual birds to calculate their breeding genetics instantly.</p>
              </div>
              {(selectedPairId || selectedDadId || selectedMomId) && (
                <button 
                  onClick={clearSelection}
                  className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 bg-red-900/15 border border-red-900/30 px-3 py-1.5 rounded-xl transition-all"
                >
                  <RefreshCw size={13} /> Reset / Clear Board
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              {/* Load Breeding Pair */}
              <LocalSearchableSelect
                label="Load From Breeding Pair"
                placeholder="-- Choose Parental Pair --"
                value={selectedPairId}
                onChange={loadPair}
                options={[
                  { id: '', name: '-- Choose Parental Pair --' },
                  ...sortedPairsList
                ]}
                birds={birds}
                cages={cages}
              />

              {/* Load Dad */}
              <LocalSearchableSelect
                label="Select Dad (Male)"
                placeholder="-- Choose Male Bird --"
                value={selectedDadId}
                onChange={loadDad}
                options={[
                  { id: '', name: '-- Choose Male Bird --' },
                  ...sortedDadsList
                ]}
                birds={birds}
                cages={cages}
              />

              {/* Load Mom */}
              <LocalSearchableSelect
                label="Select Mom (Female)"
                placeholder="-- Choose Female Bird --"
                value={selectedMomId}
                onChange={loadMom}
                options={[
                  { id: '', name: '-- Choose Female Bird --' },
                  ...sortedMomsList
                ]}
                birds={birds}
                cages={cages}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            
            {/* Male (Dad) */}
            <div className="bg-zinc-900/50 border border-blue-900/30 rounded-2xl p-3 sm:p-4 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-blue-400 uppercase tracking-widest text-xs sm:text-sm">Male (Dad)</h3>
                <button 
                  onClick={() => addMutation(true)}
                  className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-900/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={12} className="sm:w-3.5 sm:h-3.5" /> Add Mutation
                </button>
              </div>
              
              <div className="space-y-2">
                {dadMutations.length === 0 && (
                  <div className="text-center py-4 text-black-200 text-xs sm:text-sm border border-dashed border-black-800 rounded-xl">
                    No mutations added.
                  </div>
                )}
                {dadMutations.map(mut => (
                  <MutationRow 
                    key={mut.id} 
                    mutation={mut} 
                    onChange={(m) => updateMutation(true, m)}
                    onRemove={() => removeMutation(true, mut.id)}
                    isMale={true}
                    options={mutationOptions}
                  />
                ))}
              </div>
            </div>

            {/* Female (Mom) */}
            <div className="bg-zinc-900/50 border border-pink-900/30 rounded-2xl p-3 sm:p-4 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-pink-400 uppercase tracking-widest text-xs sm:text-sm">Female (Mom)</h3>
                <button 
                  onClick={() => addMutation(false)}
                  className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-pink-400 hover:text-pink-300 bg-pink-900/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={12} className="sm:w-3.5 sm:h-3.5" /> Add Mutation
                </button>
              </div>
              
              <div className="space-y-2">
                {momMutations.length === 0 && (
                  <div className="text-center py-4 text-black-200 text-xs sm:text-sm border border-dashed border-black-800 rounded-xl">
                    No mutations added.
                  </div>
                )}
                {momMutations.map(mut => (
                  <MutationRow 
                    key={mut.id} 
                    mutation={mut} 
                    onChange={(m) => updateMutation(false, m)}
                    onRemove={() => removeMutation(false, mut.id)}
                    isMale={false}
                    options={mutationOptions}
                  />
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Bottom Panel: Results */}
      <div className="bg-black p-3 sm:p-4">
        <div className="max-w-5xl mx-auto">
          
          {!results ? (
            <div className="flex flex-col items-center justify-center py-10 text-black-200 border-2 border-dashed border-black-800 rounded-2xl">
              <Dna size={32} className="mb-3 opacity-20 sm:w-12 sm:h-12" />
              <p className="font-medium text-xs sm:text-sm">Add mutations to the parents to calculate results.</p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {results.type === 'unsexed' ? (
                <div className="bg-zinc-900/50 border border-black-800 rounded-2xl p-3 sm:p-4">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-white mb-3">All Offspring</h3>
                  <div className="space-y-2">
                    {results.results.map((res, i) => (
                      <ResultRow key={i} result={res} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-zinc-900/50 border border-blue-900/30 rounded-2xl p-3 sm:p-4">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2">
                      Male Offspring
                    </h3>
                    <div className="space-y-2">
                      {results.males?.map((res, i) => (
                        <ResultRow key={i} result={res} />
                      ))}
                      {results.males?.length === 0 && <p className="text-black-200 text-xs sm:text-sm">No male offspring possible.</p>}
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900/50 border border-pink-900/30 rounded-2xl p-3 sm:p-4">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-pink-400 mb-3 flex items-center gap-2">
                      Female Offspring
                    </h3>
                    <div className="space-y-2">
                      {results.females?.map((res, i) => (
                        <ResultRow key={i} result={res} />
                      ))}
                      {results.females?.length === 0 && <p className="text-black-200 text-xs sm:text-sm">No female offspring possible.</p>}
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function MutationRow({
  mutation,
  onChange,
  onRemove,
  isMale,
  options
}: {
  mutation: ParentMutation;
  onChange: (m: ParentMutation) => void;
  onRemove: () => void;
  isMale: boolean;
  options: { id: string; name: string; inheritance?: string }[];
}) {
  const handleInheritanceChange = (newInheritance: InheritanceType) => {
    let newState = mutation.state;
    if (newInheritance === 'autosomal_dominant' || newInheritance === 'incomplete_dominant') {
      if (newState === 'visual' || newState === 'split') newState = 'sf';
    } else {
      if (newState === 'sf' || newState === 'df') newState = 'visual';
      if (!isMale && newInheritance === 'sex_linked_recessive' && newState === 'split') newState = 'visual';
    }
    onChange({ ...mutation, inheritance: newInheritance, state: newState });
  };

  return (
    <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,3fr)_minmax(0,2fr)_auto] items-center gap-1 sm:gap-2 bg-black-900 p-1 sm:p-2 rounded-lg border border-black-800 w-full">
      <select 
        className="w-full min-w-0 bg-black border border-black-700 text-white text-[11px] sm:text-sm rounded-md px-1 sm:px-2 py-1.5 sm:py-2 outline-none focus:border-gold-500 truncate appearance-none sm:appearance-auto"
        value={mutation.mutationName}
        onChange={e => {
          const selectedName = e.target.value;
          const userMut = options.find(o => o.name === selectedName);
          const newInheritance = (userMut?.inheritance as InheritanceType) || mutation.inheritance;
          let newState = mutation.state;
          if (newInheritance === 'autosomal_dominant' || newInheritance === 'incomplete_dominant') {
            if (newState === 'visual' || newState === 'split') newState = 'sf';
          } else {
            if (newState === 'sf' || newState === 'df') newState = 'visual';
            if (!isMale && newInheritance === 'sex_linked_recessive' && newState === 'split') newState = 'visual';
          }
          onChange({ ...mutation, mutationName: selectedName, inheritance: newInheritance, state: newState });
        }}
      >
        <option value="" disabled>Mutation</option>
        {options.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
      </select>

      <select 
        className="w-full min-w-0 bg-black border border-black-700 text-white text-[11px] sm:text-sm rounded-md px-1 sm:px-2 py-1.5 sm:py-2 outline-none focus:border-gold-500 truncate appearance-none sm:appearance-auto"
        value={mutation.inheritance}
        onChange={e => handleInheritanceChange(e.target.value as InheritanceType)}
      >
        <option value="autosomal_recessive">Recessive</option>
        <option value="autosomal_dominant">Dominant</option>
        <option value="incomplete_dominant">Inc. Dom</option>
        <option value="sex_linked_recessive">Sex-Linked</option>
      </select>

      <select 
        className="w-full min-w-0 bg-black border border-black-700 text-white text-[11px] sm:text-sm rounded-md px-1 sm:px-2 py-1.5 sm:py-2 outline-none focus:border-gold-500 truncate appearance-none sm:appearance-auto"
        value={mutation.state}
        onChange={e => onChange({ ...mutation, state: e.target.value as MutationState })}
      >
        {(mutation.inheritance === 'autosomal_recessive' || mutation.inheritance === 'sex_linked_recessive') && (
          <option value="visual">Visual</option>
        )}
        {(mutation.inheritance === 'autosomal_recessive' || (mutation.inheritance === 'sex_linked_recessive' && isMale)) && (
          <option value="split">Split</option>
        )}
        {(mutation.inheritance === 'autosomal_dominant' || mutation.inheritance === 'incomplete_dominant') && (
          <>
            <option value="sf">SF</option>
            <option value="df">DF</option>
          </>
        )}
      </select>

      <button onClick={onRemove} className="shrink-0 p-1.5 sm:p-2 text-black-200 hover:text-red-500 bg-black rounded-md border border-black-700 transition-colors flex items-center justify-center">
        <X size={14} className="sm:w-4 sm:h-4" />
      </button>
    </div>
  );
}

function ResultRow({ result }: { result: any }) {
  return (
    <div className="bg-black border border-black-800 rounded-xl p-2 sm:p-3 flex flex-row items-center gap-2 sm:gap-3">
      <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-black-900 border border-black-800 shrink-0">
        <span className="text-sm sm:text-base font-black text-gold-500">{result.percentage.toFixed(1)}%</span>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 mb-0.5">
          <span className="text-sm sm:text-base font-bold text-white truncate">
            {result.visuals.join(' + ')}
          </span>
          {result.splits.length > 0 && (
            <span className="text-[10px] sm:text-xs text-black-100 truncate">
              / {result.splits.join(', ')}
            </span>
          )}
        </div>
        <div className="text-[10px] sm:text-xs font-mono text-black-200 truncate">
          Genotype: {result.genotypeStr}
        </div>
      </div>
    </div>
  );
}
