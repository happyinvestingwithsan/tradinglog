export interface StockMeta {
  symbol: string;
  name: string;
  category: 'F40' | 'E40';
  capType: 'Large Cap' | 'Mid Cap';
  dropThreshold: number; // 20% for large caps, 30% for mid caps
  strikeStep: number;     // Typical ATM strike interval
  hasFno: boolean;
}

// 31 F&O Tradeable Large Caps from F40
export const F40_SYMBOLS: StockMeta[] = [
  { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 100, hasFno: true },
  { symbol: 'MARUTI', name: 'Maruti Suzuki', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 100, hasFno: true },
  { symbol: 'AXISBANK', name: 'Axis Bank', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 20, hasFno: true },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 10, hasFno: true },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 10, hasFno: true },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 20, hasFno: true },
  { symbol: 'SBIN', name: 'State Bank of India', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 10, hasFno: true },
  { symbol: 'LT', name: 'Larsen & Toubro', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 50, hasFno: true },
  { symbol: 'RELIANCE', name: 'Reliance Industries', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 20, hasFno: true },
  { symbol: 'TITAN', name: 'Titan Company', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 50, hasFno: true },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 20, hasFno: true },
  { symbol: 'ITC', name: 'ITC Ltd', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 5, hasFno: true },
  { symbol: 'NESTLEIND', name: 'Nestle India', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 50, hasFno: true },
  { symbol: 'PIDILITIND', name: 'Pidilite Industries', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 50, hasFno: true },
  { symbol: 'HCLTECH', name: 'HCL Technologies', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 20, hasFno: true },
  { symbol: 'INFY', name: 'Infosys', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 20, hasFno: true },
  { symbol: 'TCS', name: 'Tata Consultancy Services', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 50, hasFno: true },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 20, hasFno: true },
  { symbol: 'BAJAJHLDNG', name: 'Bajaj Holdings', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 100, hasFno: true },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 100, hasFno: true },
  { symbol: 'HDFCAMC', name: 'HDFC AMC', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 50, hasFno: true },
  { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 10, hasFno: true },
  { symbol: 'ASIANPAINT', name: 'Asian Paints', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 50, hasFno: true },
  { symbol: 'HAVELLS', name: 'Havells India', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 20, hasFno: true },
  { symbol: 'PAGEIND', name: 'Page Industries', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 500, hasFno: true },
  { symbol: 'VOLTAS', name: 'Voltas', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 20, hasFno: true },
  { symbol: 'COLPAL', name: 'Colgate-Palmolive', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 50, hasFno: true },
  { symbol: 'DABUR', name: 'Dabur India', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 10, hasFno: true },
  { symbol: 'MARICO', name: 'Marico', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 10, hasFno: true },
  { symbol: 'ICICIGI', name: 'ICICI Lombard General Ins', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 20, hasFno: true },
  { symbol: 'NAM-INDIA', name: 'Nippon Life India AMC', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 10, hasFno: true },
  // Non-FNO Cash stocks kept with hasFno: false for reference
  { symbol: 'PGHH', name: 'Procter & Gamble Hygiene', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 200, hasFno: false },
  { symbol: 'ICICIPRULI', name: 'ICICI Prudential Life', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 10, hasFno: false },
  { symbol: 'BERGEPAINT', name: 'Berger Paints', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 10, hasFno: false },
  { symbol: 'ABBOTINDIA', name: 'Abbott India', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 200, hasFno: false },
  { symbol: 'GLAXO', name: 'GlaxoSmithKline Pharma', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 50, hasFno: false },
  { symbol: 'BATAINDIA', name: 'Bata India', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 20, hasFno: false },
  { symbol: 'GILLETTE', name: 'Gillette India', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 100, hasFno: false },
  { symbol: 'PFIZER', name: 'Pfizer', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 50, hasFno: false },
  { symbol: 'SANOFI', name: 'Sanofi India', category: 'F40', capType: 'Large Cap', dropThreshold: 20, strikeStep: 50, hasFno: false },
];

// 24 F&O Tradeable Mid Caps from E40
export const E40_SYMBOLS: StockMeta[] = [
  { symbol: 'EICHERMOT', name: 'Eicher Motors', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 50, hasFno: true },
  { symbol: 'HYUNDAI', name: 'Hyundai Motor India', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 20, hasFno: true },
  { symbol: 'M&M', name: 'Mahindra & Mahindra', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 20, hasFno: true },
  { symbol: 'VBL', name: 'Varun Beverages', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 10, hasFno: true },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 100, hasFno: true },
  { symbol: 'DMART', name: 'Avenue Supermarts (DMart)', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 50, hasFno: true },
  { symbol: 'GODREJCP', name: 'Godrej Consumer Products', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 20, hasFno: true },
  { symbol: 'BSE', name: 'BSE Limited', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 50, hasFno: true },
  { symbol: 'JIOFIN', name: 'Jio Financial Services', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 5, hasFno: true },
  { symbol: 'ADANIPORTS', name: 'Adani Ports', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 20, hasFno: true },
  { symbol: 'CIPLA', name: 'Cipla', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 20, hasFno: true },
  { symbol: 'BOSCHLTD', name: 'Bosch', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 500, hasFno: true },
  { symbol: 'UNITDSPR', name: 'United Spirits (McDowell)', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 20, hasFno: true },
  { symbol: 'RADICO', name: 'Radico Khaitan', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 20, hasFno: true },
  { symbol: 'BLUESTARCO', name: 'Blue Star', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 20, hasFno: true },
  { symbol: 'DIXON', name: 'Dixon Technologies', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 100, hasFno: true },
  { symbol: 'MCX', name: 'Multi Commodity Exchange', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 50, hasFno: true },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 100, hasFno: true },
  { symbol: 'FORTIS', name: 'Fortis Healthcare', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 10, hasFno: true },
  { symbol: 'INDHOTEL', name: 'Indian Hotels', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 10, hasFno: true },
  { symbol: 'CDSL', name: 'Central Depository Services', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 20, hasFno: true },
  { symbol: 'ANGELONE', name: 'Angel One', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 50, hasFno: true },
  { symbol: 'CAMS', name: 'CAMS', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 50, hasFno: true },
  { symbol: 'TMPV', name: 'Tata Motors PV', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 10, hasFno: true },
  // Non-FNO Cash stocks kept with hasFno: false for reference
  { symbol: 'MRF', name: 'MRF', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 1000, hasFno: false },
  { symbol: 'UBL', name: 'United Breweries', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 20, hasFno: false },
  { symbol: 'BAJAJHFL', name: 'Bajaj Housing Finance', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 5, hasFno: false },
  { symbol: 'ITCHOTELS', name: 'ITC Hotels', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 5, hasFno: false },
  { symbol: 'JSWINFRA', name: 'JSW Infrastructure', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 5, hasFno: false },
  { symbol: 'ACC', name: 'ACC Limited', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 20, hasFno: false },
  { symbol: 'AWL', name: 'Adani Wilmar', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 5, hasFno: false },
  { symbol: 'HONAUT', name: 'Honeywell Automation', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 500, hasFno: false },
  { symbol: 'KAJARIACER', name: 'Kajaria Ceramics', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 20, hasFno: false },
  { symbol: 'RELAXO', name: 'Relaxo Footwears', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 10, hasFno: false },
  { symbol: 'MEDANTA', name: 'Global Health (Medanta)', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 20, hasFno: false },
  { symbol: 'QUESS', name: 'Quess Corp', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 10, hasFno: false },
  { symbol: 'TEAMLEASE', name: 'TeamLease Services', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 20, hasFno: false },
  { symbol: 'ASTRAZEN', name: 'AstraZeneca Pharma', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 100, hasFno: false },
  { symbol: 'ERIS', name: 'Eris Lifesciences', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 20, hasFno: false },
  { symbol: 'LALPATHLAB', name: 'Dr. Lal PathLabs', category: 'E40', capType: 'Mid Cap', dropThreshold: 30, strikeStep: 50, hasFno: false },
];

export const ALL_WATCHLIST_STOCKS: StockMeta[] = [...F40_SYMBOLS, ...E40_SYMBOLS];

// 100% F&O Tradeable Stocks only (31 Large Caps + 24 Mid Caps = 55 total, NO Small Caps)
export const FNO_ONLY_STOCKS: StockMeta[] = ALL_WATCHLIST_STOCKS.filter(s => s.hasFno);

export function findStockMeta(symbol: string): StockMeta | undefined {
  const clean = symbol.replace('NSE:', '').replace('.NS', '').trim();
  return ALL_WATCHLIST_STOCKS.find(s => s.symbol === clean);
}
