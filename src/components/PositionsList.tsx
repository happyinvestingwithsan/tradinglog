"use client";

import React, { useState, useEffect } from "react";
import { OpenPosition } from "@/lib/tradeEngine";
import { Faders, CalendarBlank, Warning, ShieldCheck, Folder, TrendUp, TrendDown } from "@phosphor-icons/react";

interface PositionsListProps {
  positions: OpenPosition[];
  gttTriggers?: any[];
  kitePositions?: any[];
}

export default function PositionsList({ positions, gttTriggers = [], kitePositions = [] }: PositionsListProps) {
  // Store custom LTPs in local state to allow manual simulation of P&L if not connected to live data
  const [customLtps, setCustomLtps] = useState<Record<string, number>>({});

  // Sync live LTPs when positions update from Kite Connect API
  useEffect(() => {
    if (kitePositions && kitePositions.length > 0) {
      const newLtps: Record<string, number> = {};
      kitePositions.forEach((kp) => {
        if (kp.last_price > 0) {
          newLtps[kp.tradingsymbol] = kp.last_price;
        }
      });
      setCustomLtps((prev) => ({ ...prev, ...newLtps }));
    }
  }, [kitePositions]);

  const handleLtpChange = (symbol: string, val: string) => {
    const num = parseFloat(val);
    setCustomLtps((prev) => ({
      ...prev,
      [symbol]: isNaN(num) ? 0 : num,
    }));
  };

  // Extract underlying stock symbol (e.g. COLPAL from COLPAL26AUG2100PE)
  const getUnderlying = (symbol: string): string => {
    const match = symbol.match(/^[A-Z&]+/);
    return match ? match[0] : symbol;
  };

  if (positions.length === 0) {
    return (
      <div className="glass-panel rounded-[2rem] p-12 text-center border border-white/5">
        <p className="text-zinc-500 text-sm">No active open positions. All positions are fully realized.</p>
      </div>
    );
  }

  // Group positions by underlying stock symbol
  const groupedPositions = positions.reduce((acc, pos) => {
    const underlying = getUnderlying(pos.symbol);
    if (!acc[underlying]) {
      acc[underlying] = [];
    }
    acc[underlying].push(pos);
    return acc;
  }, {} as Record<string, typeof positions>);

  return (
    <div className="space-y-8">
      {/* List Header */}
      <div className="flex justify-between items-center px-2">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <span>Active Positions Ledger</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </h3>
        <span className="text-zinc-500 text-[11px] font-mono">
          {positions.length} Active Contracts Grouped by Asset
        </span>
      </div>

      {/* Render Grouped Underlying Cards */}
      <div className="space-y-8">
        {Object.entries(groupedPositions).map(([underlying, posList]) => {
          
          // Calculate aggregate stats for this underlying stock group
          let totalUnderlyingExposure = 0;
          let totalUnderlyingPnl = 0;

          posList.forEach((pos) => {
            const ltp = customLtps[pos.symbol] !== undefined ? customLtps[pos.symbol] : pos.entryPrice;
            totalUnderlyingExposure += pos.totalValue;
            
            const isShort = pos.type === "Short";
            const pnl = isShort 
              ? (pos.entryPrice - ltp) * pos.quantity 
              : (ltp - pos.entryPrice) * pos.quantity;
            totalUnderlyingPnl += pnl;
          });

          const isUnderlyingProfit = totalUnderlyingPnl >= 0;

          return (
            <div
              key={underlying}
              className="bg-zinc-900/20 border border-white/5 rounded-[2rem] p-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-white/10"
            >
              <div className="bg-zinc-950/80 rounded-[calc(2rem-0.375rem)] p-6 md:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] space-y-6">
                
                {/* Underlying Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Folder className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-white font-mono leading-none">
                        {underlying}
                      </h2>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-1 block">
                        Underlying Asset Group ({posList.length} options)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 sm:text-right">
                    <div>
                      <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-medium">Group Exposure</span>
                      <span className="text-xs font-mono text-zinc-400">
                        Rs. {totalUnderlyingExposure.toLocaleString("en-IN")}
                      </span>
                    </div>
                    
                    <div className="border-l border-white/5 pl-6">
                      <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-medium">Group Unrealized P&L</span>
                      <div className={`flex items-center gap-1.5 text-sm font-mono font-bold mt-0.5 ${
                        isUnderlyingProfit ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {isUnderlyingProfit ? (
                          <TrendUp className="w-4 h-4 text-emerald-400" weight="light" />
                        ) : (
                          <TrendDown className="w-4 h-4 text-rose-400" weight="light" />
                        )}
                        <span>
                          {isUnderlyingProfit ? "+" : ""}
                          {totalUnderlyingPnl.toLocaleString("en-IN", {
                            style: "currency",
                            currency: "INR",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Options list within this underlying group */}
                <div className="space-y-8 divide-y divide-white/5">
                  {posList.map((pos, pIdx) => {
                    const ltp = customLtps[pos.symbol] !== undefined ? customLtps[pos.symbol] : pos.entryPrice;
                    
                    const isShort = pos.type === "Short";
                    const optionPnl = isShort 
                      ? (pos.entryPrice - ltp) * pos.quantity 
                      : (ltp - pos.entryPrice) * pos.quantity;
                    const isOptionProfit = optionPnl >= 0;

                    // Match GTT triggers
                    const matchingGtts = gttTriggers.filter(
                      (g) => g.condition?.tradingsymbol === pos.symbol && g.status?.toLowerCase() === "active"
                    );

                    return (
                      <div key={pos.symbol} className={`pt-6 first:pt-0 grid grid-cols-1 lg:grid-cols-3 gap-6`}>
                        
                        {/* Option Contract info */}
                        <div className="lg:col-span-1 space-y-4">
                          <div>
                            <span className="font-mono text-white text-md font-bold tracking-tight block">
                              {pos.symbol}
                            </span>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                                isShort ? "bg-rose-950/40 text-rose-400 border border-rose-900/30" : "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30"
                              }`}>
                                {pos.type}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                Total Qty: {pos.quantity} units
                              </span>
                            </div>
                          </div>

                          {/* Quick Margin LTP Form */}
                          <div className="grid grid-cols-2 gap-4 bg-zinc-950/20 rounded-2xl p-4 border border-white/5">
                            <div>
                              <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-medium">Avg Price</span>
                              <span className="font-mono text-zinc-300 text-xs font-semibold mt-1 block">
                                Rs. {pos.entryPrice.toFixed(2)}
                              </span>
                            </div>
                            
                            <div className="border-l border-white/5 pl-4 flex flex-col justify-center">
                              <span className="text-[9px] text-zinc-500 uppercase tracking-widest flex items-center gap-1 font-medium">
                                <span>LTP</span>
                              </span>
                              <input
                                type="number"
                                step="0.05"
                                placeholder={pos.entryPrice.toFixed(2)}
                                className="font-mono text-white bg-transparent border-b border-white/10 hover:border-white/30 focus:border-emerald-500 focus:outline-none text-xs w-full mt-1 pb-0.5"
                                value={customLtps[pos.symbol] || ""}
                                onChange={(e) => handleLtpChange(pos.symbol, e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        {/* GTT Security checking */}
                        <div className="lg:col-span-1 space-y-2">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-semibold">Hedging & GTT Safety</span>
                          {(() => {
                            const totalGttQty = matchingGtts.reduce((sum, gtt) => {
                              const qty = gtt.orders?.reduce((oSum: number, o: any) => oSum + (o.quantity || 0), 0) || 0;
                              return sum + qty;
                            }, 0);

                            if (totalGttQty === 0) {
                              return (
                                <div className="bg-rose-950/20 border border-rose-900/30 rounded-2xl p-3 flex items-start gap-2.5">
                                  <Warning className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                  <div className="space-y-0.5">
                                    <p className="text-rose-400 text-[10px] font-semibold uppercase tracking-wider">Unsecured</p>
                                    <p className="text-zinc-500 text-[9px] leading-relaxed">
                                      No GTT triggers found. Position is unprotected against index swings.
                                    </p>
                                  </div>
                                </div>
                              );
                            }

                            const parsedTriggers = matchingGtts.map((gtt) => {
                              const isOco = gtt.type === "two-leg";
                              const trigger1 = gtt.condition.trigger_values[0];
                              const trigger2 = isOco ? gtt.condition.trigger_values[1] : null;
                              
                              let sl = 0;
                              let target = 0;
                              if (isOco && trigger2 !== null) {
                                  sl = Math.max(trigger1, trigger2);
                                  target = Math.min(trigger1, trigger2);
                              } else {
                                  if (trigger1 > ltp) sl = trigger1;
                                  else target = trigger1;
                              }
                              
                              const qty = gtt.orders?.reduce((oSum: number, o: any) => oSum + (o.quantity || 0), 0) || 0;
                              return { sl, target, qty };
                            });

                            const isPartial = totalGttQty < pos.quantity;

                            return (
                              <div className="space-y-2">
                                <div className={`rounded-2xl p-3 flex items-start gap-2.5 border ${
                                  isPartial 
                                    ? "bg-amber-950/15 border-amber-900/25 text-amber-400" 
                                    : "bg-emerald-950/10 border-emerald-900/20 text-emerald-400"
                                }`}>
                                  {isPartial ? (
                                    <Warning className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                  )}
                                  <div className="space-y-0.5">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider">
                                      {isPartial ? "Partially Secured" : "Fully Secured"}
                                    </p>
                                    <p className="text-zinc-400 text-[9px] leading-relaxed">
                                      {isPartial ? (
                                        <>
                                          Covers <strong className="text-amber-300 font-mono">{totalGttQty}</strong> of <strong className="text-white font-mono">{pos.quantity}</strong>. <strong className="text-rose-400 font-mono">{pos.quantity - totalGttQty}</strong> naked!
                                        </>
                                      ) : (
                                        <>
                                          GTT covers 100% of your position.
                                        </>
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="bg-zinc-950/40 rounded-xl p-2 border border-white/5 space-y-1">
                                  {parsedTriggers.map((t, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-[9px] text-zinc-500 font-mono">
                                      <span>Qty: {t.qty}</span>
                                      <span>
                                        {t.sl > 0 && `SL: Rs. ${t.sl.toFixed(1)}`}
                                        {t.sl > 0 && t.target > 0 && " | "}
                                        {t.target > 0 && `Tgt: Rs. ${t.target.toFixed(1)}`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Open Tranches from tradebook with chronological dates */}
                        <div className="lg:col-span-1 space-y-2">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-semibold flex items-center gap-1">
                            <CalendarBlank className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Chronological Open Tranches</span>
                          </span>
                          
                          <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 no-scrollbar">
                            {pos.lots.map((lot, idx) => {
                              // Calculate individual tranche P&L
                              const tranchePnl = isShort 
                                ? (lot.price - ltp) * lot.quantity 
                                : (ltp - lot.price) * lot.quantity;
                              const isTrancheProfit = tranchePnl >= 0;

                              return (
                                <div 
                                  key={idx} 
                                  className="bg-zinc-950/40 border border-white/5 rounded-xl p-2.5 flex justify-between items-center text-xs font-mono"
                                >
                                  <div>
                                    <div className="text-[10px] text-zinc-500">
                                      {new Date(lot.date).toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric"
                                      })}
                                    </div>
                                    <div className="text-zinc-300 font-medium mt-0.5">
                                      {lot.quantity} units <span className="text-[10px] text-zinc-500">@</span> Rs. {lot.price.toFixed(2)}
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <span className={`text-[10px] font-bold ${
                                      isTrancheProfit ? "text-emerald-500" : "text-rose-500"
                                    }`}>
                                      {isTrancheProfit ? "+" : ""}
                                      {tranchePnl.toLocaleString("en-IN", {
                                        maximumFractionDigits: 0
                                      })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
