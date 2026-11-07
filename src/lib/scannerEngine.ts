import { ALL_WATCHLIST_STOCKS, FNO_ONLY_STOCKS, StockMeta } from './stockUniverse';

export type SetupStatus = 'ULTRA_PRIME' | 'PRIME' | 'WATCHLIST' | 'WAITING';

export interface ScannedStock {
  symbol: string;
  name: string;
  category: 'F40' | 'E40';
  capType: 'Large Cap' | 'Mid Cap';
  hasFno: boolean;
  price: number;
  high52: number;
  low52: number;
  prevClose: number;
  dropPct: number;
  dayPct: number;
  dropThreshold: number;
  
  // Tactical Option Execution Parameters
  atmStrike: number;
  estPremium: number;
  breakEven: number;
  safetyCushionPct: number;
  target30Decay: number;
  target50Decay: number;
  
  // Scoring & Status
  status: SetupStatus;
  statusLabel: string;
  rankScore: number;
}

export interface ScannerSummary {
  timestamp: number;
  totalScanned: number;
  ultraPrimeCount: number;
  primeCount: number;
  watchlistCount: number;
  topPick: ScannedStock | null;
  candidates: ScannedStock[];
}

export function evaluateStock(
  meta: StockMeta,
  marketData: {
    price: number;
    high52: number;
    low52: number;
    prevClose: number;
    dropPct: number;
    dayPct: number;
  }
): ScannedStock {
  const { price, high52, low52, prevClose, dropPct, dayPct } = marketData;
  const { symbol, name, category, capType, dropThreshold, strikeStep, hasFno } = meta;

  // 1. Calculate nearest ATM strike
  const atmStrike = Math.round(price / strikeStep) * strikeStep;

  // 2. Estimate monthly ATM Put premium (~2.5% for calm, up to 3.5% on red panic days)
  const volMultiplier = dayPct <= -2.0 ? 0.035 : dayPct < 0 ? 0.028 : 0.022;
  const estPremium = Math.round(price * volMultiplier * 10) / 10;

  // 3. Breakeven & safety margin
  const breakEven = Math.round((atmStrike - estPremium) * 10) / 10;
  const safetyCushionPct = Math.round(((price - breakEven) / price) * 100 * 10) / 10;

  // 4. Targets according to Profit Booking Matrix
  const target30Decay = Math.round(estPremium * 0.70 * 10) / 10; // 30% profit taken
  const target50Decay = Math.round(estPremium * 0.50 * 10) / 10; // 50% GTT exit target

  // 5. Determine Setup Status & Mentors Criteria
  const meetsDrop = dropPct >= dropThreshold;
  const isRedDay = dayPct < 0;
  const isPanicRed = dayPct <= -1.5;

  let status: SetupStatus = 'WAITING';
  let statusLabel = 'Waiting for Dip';
  let rankScore = 0;

  if (meetsDrop && isPanicRed) {
    status = 'ULTRA_PRIME';
    statusLabel = '🔥 Ultra Prime (Panic Dip)';
    rankScore = 100 + (dropPct - dropThreshold) * 2 + Math.abs(dayPct) * 10;
  } else if (meetsDrop && isRedDay) {
    status = 'PRIME';
    statusLabel = '⚡ Prime Candidate';
    rankScore = 80 + (dropPct - dropThreshold) * 1.5 + Math.abs(dayPct) * 5;
  } else if (meetsDrop && !isRedDay) {
    status = 'WATCHLIST';
    statusLabel = '👀 Wait for Red Candle';
    rankScore = 50 + (dropPct - dropThreshold);
  } else {
    status = 'WAITING';
    statusLabel = `Need ${dropThreshold}% (Current: ${dropPct}%)`;
    rankScore = (dropPct / dropThreshold) * 30;
  }

  // Bonus for FNO availability and Large Cap stability
  if (hasFno) rankScore += 20;
  if (category === 'F40') rankScore += 10;

  return {
    symbol,
    name,
    category,
    capType,
    hasFno,
    price,
    high52,
    low52,
    prevClose,
    dropPct,
    dayPct,
    dropThreshold,
    atmStrike,
    estPremium,
    breakEven,
    safetyCushionPct,
    target30Decay,
    target50Decay,
    status,
    statusLabel,
    rankScore: Math.round(rankScore),
  };
}

export function compileScannerResults(
  rawItems: Record<string, any>,
  timestamp: number,
  options: { onlyFno?: boolean } = { onlyFno: true }
): ScannerSummary {
  const stockList = options.onlyFno ? FNO_ONLY_STOCKS : ALL_WATCHLIST_STOCKS;
  const candidates: ScannedStock[] = [];

  for (const meta of stockList) {
    const raw = rawItems[meta.symbol];
    if (raw && raw.price > 0 && raw.high52 > 0) {
      candidates.push(evaluateStock(meta, raw));
    }
  }

  // Sort: highest rankScore first
  candidates.sort((a, b) => b.rankScore - a.rankScore);

  const ultraPrimeCount = candidates.filter(c => c.status === 'ULTRA_PRIME').length;
  const primeCount = candidates.filter(c => c.status === 'PRIME').length;
  const watchlistCount = candidates.filter(c => c.status === 'WATCHLIST').length;

  // The Top Pick is the highest scoring prime candidate
  const topPick = candidates.find(c => c.status === 'ULTRA_PRIME') 
               || candidates.find(c => c.status === 'PRIME') 
               || candidates.find(c => c.dropPct >= c.dropThreshold) 
               || candidates[0] 
               || null;

  return {
    timestamp,
    totalScanned: candidates.length,
    ultraPrimeCount,
    primeCount,
    watchlistCount,
    topPick,
    candidates,
  };
}
