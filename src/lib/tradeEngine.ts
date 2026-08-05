export interface RawTrade {
  symbol: string;
  tradeDate: string;
  tradeType: 'buy' | 'sell';
  quantity: number;
  price: number;
  tradeId?: string;
  orderId?: string;
  executionTime: string;
  expiryDate?: string;
}

export interface RealizedTrade {
  symbol: string;
  buyDate: Date;
  sellDate: Date;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  pnl: number;
  type: 'Long' | 'Short';
  durationDays: number;
}

export interface OpenPositionLot {
  quantity: number;
  price: number;
  date: Date;
}

export interface OpenPosition {
  symbol: string;
  type: 'Long' | 'Short';
  quantity: number;
  entryPrice: number;
  totalValue: number;
  lots: OpenPositionLot[];
}

export interface TradeSummary {
  totalRealizedPnl: number;
  winRatio: number;
  totalTrades: number;
  winTradesCount: number;
  lossTradesCount: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
}

export function runFifoMatching(rawTrades: RawTrade[]): {
  realizedTrades: RealizedTrade[];
  openPositions: OpenPosition[];
  summary: TradeSummary;
} {
  // 1. Parse and sort trades chronologically by execution time
  const sortedTrades = [...rawTrades]
    .map(t => ({
      ...t,
      parsedTime: new Date(t.executionTime || t.tradeDate),
    }))
    .sort((a, b) => a.parsedTime.getTime() - b.parsedTime.getTime());

  const realizedTrades: RealizedTrade[] = [];
  const openQueues: Record<string, { price: number; qty: number; date: Date; type: 'buy' | 'sell' }[]> = {};

  for (const trade of sortedTrades) {
    const symbol = trade.symbol;
    const type = trade.tradeType.toLowerCase() as 'buy' | 'sell';
    const qty = Number(trade.quantity);
    const price = Number(trade.price);
    const date = trade.parsedTime;

    if (!openQueues[symbol]) {
      openQueues[symbol] = [];
    }

    const queue = openQueues[symbol];

    if (queue.length === 0) {
      queue.push({ price, qty, date, type });
    } else {
      const existingType = queue[0].type;
      if (existingType === type) {
        queue.push({ price, qty, date, type });
      } else {
        // We have a trade of the opposite type - Match and close
        let remainingQty = qty;
        while (remainingQty > 0 && queue.length > 0) {
          const oldest = queue[0];
          const matchQty = Math.min(remainingQty, oldest.qty);

          let pnl = 0;
          let buyPrice = 0;
          let sellPrice = 0;
          let buyDate = new Date();
          let sellDate = new Date();

          if (existingType === 'buy') {
            // We bought first, now we are selling (Long)
            buyPrice = oldest.price;
            sellPrice = price;
            buyDate = oldest.date;
            sellDate = date;
            pnl = (sellPrice - buyPrice) * matchQty;
          } else {
            // We sold first, now we are buying (Short)
            buyPrice = price;
            sellPrice = oldest.price;
            buyDate = date;
            sellDate = oldest.date;
            pnl = (sellPrice - buyPrice) * matchQty; // P&L for short = (Sell Price - Buy Price) * Qty
          }

          realizedTrades.push({
            symbol,
            buyDate,
            sellDate,
            quantity: matchQty,
            buyPrice,
            sellPrice,
            pnl,
            type: existingType === 'sell' ? 'Short' : 'Long',
            durationDays: Math.max(0, Math.round((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24))),
          });

          oldest.qty -= matchQty;
          remainingQty -= matchQty;

          if (oldest.qty === 0) {
            queue.shift();
          }
        }

        if (remainingQty > 0) {
          queue.push({ price, qty: remainingQty, date, type });
        }
      }
    }
  }

  // 2. Compile open positions
  const openPositions: OpenPosition[] = [];
  for (const symbol in openQueues) {
    const queue = openQueues[symbol];
    if (queue.length > 0) {
      const totalQty = queue.reduce((sum, item) => sum + item.qty, 0);
      const totalVal = queue.reduce((sum, item) => sum + item.qty * item.price, 0);
      const avgPrice = totalVal / totalQty;
      const type = queue[0].type === 'sell' ? 'Short' : 'Long';

      openPositions.push({
        symbol,
        type,
        quantity: totalQty,
        entryPrice: avgPrice,
        totalValue: totalVal,
        lots: queue.map(item => ({
          quantity: item.qty,
          price: item.price,
          date: item.date,
        })),
      });
    }
  }

  // 3. Calculate statistics summary
  const totalRealizedPnl = realizedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalTrades = realizedTrades.length;
  const winTrades = realizedTrades.filter(t => t.pnl > 0);
  const lossTrades = realizedTrades.filter(t => t.pnl < 0);
  const winTradesCount = winTrades.length;
  const lossTradesCount = lossTrades.length;
  
  const winRatio = totalTrades > 0 ? winTradesCount / totalTrades : 0;
  
  const totalWinPnl = winTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalLossPnl = lossTrades.reduce((sum, t) => sum + t.pnl, 0);
  
  const avgWin = winTradesCount > 0 ? totalWinPnl / winTradesCount : 0;
  const avgLoss = lossTradesCount > 0 ? totalLossPnl / lossTradesCount : 0;
  const profitFactor = Math.abs(totalLossPnl) > 0 ? totalWinPnl / Math.abs(totalLossPnl) : 1;

  const summary: TradeSummary = {
    totalRealizedPnl,
    winRatio,
    totalTrades,
    winTradesCount,
    lossTradesCount,
    avgWin,
    avgLoss,
    profitFactor,
  };

  return {
    realizedTrades,
    openPositions,
    summary,
  };
}
