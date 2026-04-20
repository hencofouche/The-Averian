export type InheritanceType = 'autosomal_recessive' | 'autosomal_dominant' | 'incomplete_dominant' | 'sex_linked_recessive';

export type MutationState = 'visual' | 'split' | 'sf' | 'df' | 'normal';

export interface Locus {
  id: string;
  name: string;
  type: InheritanceType;
}

export function getAlleles(type: InheritanceType, state: MutationState, isMale: boolean, symbol: string) {
  const W = `${symbol}+`; // Wildtype
  const M = `${symbol}`;  // Mutant

  if (type === 'autosomal_recessive') {
    if (state === 'visual') return [M, M];
    if (state === 'split') return [W, M];
    return [W, W];
  }
  
  if (type === 'autosomal_dominant' || type === 'incomplete_dominant') {
    if (state === 'df') return [M, M];
    if (state === 'sf' || state === 'visual') return [M, W];
    return [W, W];
  }
  
  if (type === 'sex_linked_recessive') {
    if (isMale) {
      if (state === 'visual') return [`Z^{${M}}`, `Z^{${M}}`];
      if (state === 'split') return [`Z^{${W}}`, `Z^{${M}}`];
      return [`Z^{${W}}`, `Z^{${W}}`];
    } else {
      if (state === 'visual') return [`Z^{${M}}`, 'W'];
      return [`Z^{${W}}`, 'W'];
    }
  }
  
  return [W, W];
}

export function interpretGenotype(type: InheritanceType, alleles: string[], name: string, symbol: string) {
  const M = symbol;
  
  if (type === 'autosomal_recessive') {
    const mutantCount = alleles.filter(a => a === M).length;
    if (mutantCount === 2) return { visual: name, split: null };
    if (mutantCount === 1) return { visual: null, split: name };
    return { visual: null, split: null };
  }
  
  if (type === 'autosomal_dominant' || type === 'incomplete_dominant') {
    const mutantCount = alleles.filter(a => a === M).length;
    if (mutantCount === 2) return { visual: `DF ${name}`, split: null };
    if (mutantCount === 1) return { visual: `SF ${name}`, split: null };
    return { visual: null, split: null };
  }
  
  if (type === 'sex_linked_recessive') {
    const isMale = !alleles.includes('W');
    const mutantCount = alleles.filter(a => a === `Z^{${M}}`).length;
    
    if (isMale) {
      if (mutantCount === 2) return { visual: name, split: null };
      if (mutantCount === 1) return { visual: null, split: name };
    } else {
      if (mutantCount === 1) return { visual: name, split: null };
    }
    return { visual: null, split: null };
  }
  
  return { visual: null, split: null };
}
