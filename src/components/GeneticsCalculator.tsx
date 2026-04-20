import React, { useState, useMemo } from 'react';
import { Dna, Plus, X } from 'lucide-react';
import { InheritanceType, MutationState, getAlleles, interpretGenotype } from '../lib/genetics';

interface ParentMutation {
  id: string;
  mutationName: string;
  inheritance: InheritanceType;
  state: MutationState;
}

export default function GeneticsCalculator({ userMutations }: { userMutations: { id: string, name: string }[] }) {
  const [dadMutations, setDadMutations] = useState<ParentMutation[]>([]);
  const [momMutations, setMomMutations] = useState<ParentMutation[]>([]);

  const mutationOptions = userMutations.map(m => ({ id: m.id, name: m.name }));

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
  options: { id: string; name: string }[];
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
        onChange={e => onChange({ ...mutation, mutationName: e.target.value })}
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
