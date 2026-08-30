import { Pair, Transaction, Bird, BreedingRecord, Egg } from '../types';

export interface PairRoiBreakdown {
  pairId: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  roiPercentage: number;
  
  // Specific Income Streams
  eggSalesIncome: number;
  chickSalesIncome: number;
  parentSalesIncome: number;
  otherIncome: number;

  // Specific Expense Streams
  parentAcquisitionCost: number;
  pairDirectExpenses: number;
  offspringExpenses: number;

  // Counts & Entities
  soldEggsCount: number;
  soldChicksCount: number;
  totalEggsLaid: number;
  totalChicksWeaned: number;
  totalOffspringCount: number;
  
  offspringBirds: Bird[];
  relevantTransactions: Transaction[];
}

/**
 * Accurately finds all offspring birds belonging to a breeding pair.
 */
export function getPairOffspring(pair: Pair, birds: Bird[], breedingRecords: BreedingRecord[] = []): Bird[] {
  const pairRecords = breedingRecords.filter(r => r.pairId === pair.id);
  const recordOffspringIds = new Set<string>();
  
  pairRecords.forEach(rec => {
    if (rec.offspringIds && Array.isArray(rec.offspringIds)) {
      rec.offspringIds.forEach(id => recordOffspringIds.add(id));
    }
    if (rec.eggs && Array.isArray(rec.eggs)) {
      rec.eggs.forEach(egg => {
        if (egg.birdId) recordOffspringIds.add(egg.birdId);
      });
    }
  });

  const matchingBirds = birds.filter(b => {
    // Direct link in breeding records
    if (recordOffspringIds.has(b.id)) return true;

    // Both parents match
    if (pair.maleId && pair.femaleId && b.fatherId === pair.maleId && b.motherId === pair.femaleId) {
      return true;
    }

    // Single parent match if only one parent exists in pair
    if (pair.maleId && !pair.femaleId && b.fatherId === pair.maleId) return true;
    if (pair.femaleId && !pair.maleId && b.motherId === pair.femaleId) return true;

    return false;
  });

  return matchingBirds;
}

/**
 * Calculates complete financial ROI for a breeding pair,
 * strictly aggregating egg sales, chick/offspring sales, parent costs, and pair expenses.
 */
export function calculatePairRoi(
  pair: Pair,
  transactions: Transaction[] = [],
  birds: Bird[] = [],
  breedingRecords: BreedingRecord[] = []
): PairRoiBreakdown {
  const offspringBirds = getPairOffspring(pair, birds, breedingRecords);
  const offspringBirdIds = new Set(offspringBirds.map(b => b.id));
  const pairRecords = breedingRecords.filter(r => r.pairId === pair.id);

  // Relevant transactions: direct pairId, parent birdIds, or offspring birdIds
  const relevantTransactions = transactions.filter(t => {
    if (t.pairId === pair.id) return true;
    if (t.birdId && (t.birdId === pair.maleId || t.birdId === pair.femaleId)) return true;
    if (t.birdId && offspringBirdIds.has(t.birdId)) return true;
    return false;
  });

  let eggSalesIncome = 0;
  let chickSalesIncome = 0;
  let parentSalesIncome = 0;
  let otherIncome = 0;
  let pairDirectExpenses = 0;
  let offspringExpenses = 0;
  let soldEggsCount = 0;
  let soldChicksCount = 0;

  // Process Transactions
  relevantTransactions.forEach(t => {
    const catLower = (t.category || '').toLowerCase();
    const descLower = (t.description || '').toLowerCase();

    if (t.type === 'Income') {
      const isEgg = catLower.includes('egg') || descLower.includes('egg');
      const isChick = (t.birdId && offspringBirdIds.has(t.birdId)) || catLower.includes('chick') || descLower.includes('chick') || (t.birdId && offspringBirdIds.has(t.birdId) && catLower.includes('sale'));
      const isParent = (t.birdId === pair.maleId || t.birdId === pair.femaleId) && catLower.includes('sale');

      if (isEgg) {
        eggSalesIncome += t.amount || 0;
        soldEggsCount += 1;
      } else if (isChick) {
        chickSalesIncome += t.amount || 0;
        soldChicksCount += 1;
      } else if (isParent) {
        parentSalesIncome += t.amount || 0;
      } else {
        // General pair revenue or unclassified sale
        if (catLower.includes('sale')) {
          chickSalesIncome += t.amount || 0;
        } else {
          otherIncome += t.amount || 0;
        }
      }
    } else {
      // Expense
      if (t.birdId && offspringBirdIds.has(t.birdId)) {
        offspringExpenses += t.amount || 0;
      } else {
        pairDirectExpenses += t.amount || 0;
      }
    }
  });

  // Check for any sold eggs in breeding records that might not have a standalone transaction yet
  pairRecords.forEach(rec => {
    if (rec.eggs && Array.isArray(rec.eggs)) {
      rec.eggs.forEach(egg => {
        if (egg.status === 'Sold' && egg.salePrice && egg.salePrice > 0) {
          // Check if already counted via transactionId
          const hasTransaction = egg.transactionId && relevantTransactions.some(t => t.id === egg.transactionId);
          if (!hasTransaction) {
            eggSalesIncome += egg.salePrice;
            soldEggsCount += 1;
          }
        }
      });
    }
  });

  // Calculate Parent Acquisition Cost from Birds database if not present in transactions
  let parentAcquisitionCost = 0;
  const maleBird = birds.find(b => b.id === pair.maleId);
  const femaleBird = birds.find(b => b.id === pair.femaleId);

  // Check if purchase transactions exist for parents to avoid double-counting
  const hasMalePurchaseTx = relevantTransactions.some(t => t.birdId === pair.maleId && t.type === 'Expense' && (t.category.toLowerCase().includes('buy') || t.category.toLowerCase().includes('purchase') || t.category.toLowerCase().includes('acquisition')));
  const hasFemalePurchaseTx = relevantTransactions.some(t => t.birdId === pair.femaleId && t.type === 'Expense' && (t.category.toLowerCase().includes('buy') || t.category.toLowerCase().includes('purchase') || t.category.toLowerCase().includes('acquisition')));

  if (!hasMalePurchaseTx && maleBird?.purchasePrice) {
    parentAcquisitionCost += maleBird.purchasePrice;
  }
  if (!hasFemalePurchaseTx && femaleBird?.purchasePrice) {
    parentAcquisitionCost += femaleBird.purchasePrice;
  }

  const totalIncome = eggSalesIncome + chickSalesIncome + parentSalesIncome + otherIncome;
  const totalExpenses = parentAcquisitionCost + pairDirectExpenses + offspringExpenses;
  const netProfit = totalIncome - totalExpenses;
  
  const roiPercentage = totalExpenses > 0 
    ? (netProfit / totalExpenses) * 100 
    : (totalIncome > 0 ? 100 : 0);

  // Aggregated breeding stats
  let totalEggsLaid = 0;
  let totalChicksWeaned = 0;
  pairRecords.forEach(r => {
    totalEggsLaid += (r.eggsLaid || (r.eggs ? r.eggs.length : 0));
    totalChicksWeaned += (r.chicksWeaned || 0);
  });

  return {
    pairId: pair.id,
    totalIncome,
    totalExpenses,
    netProfit,
    roiPercentage,
    eggSalesIncome,
    chickSalesIncome,
    parentSalesIncome,
    otherIncome,
    parentAcquisitionCost,
    pairDirectExpenses,
    offspringExpenses,
    soldEggsCount,
    soldChicksCount,
    totalEggsLaid,
    totalChicksWeaned,
    totalOffspringCount: offspringBirds.length,
    offspringBirds,
    relevantTransactions
  };
}
