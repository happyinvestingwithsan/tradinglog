"use client";

import React, { useState, useEffect } from "react";
import { OpenPosition } from "@/lib/tradeEngine";
import { Faders, CalendarBlank, Warning, ShieldCheck, Folder, TrendUp, TrendDown } from "@phosphor-icons/react";

interface PositionsListProps {
  positions: OpenPosition[];
  gttTriggers?: any[];
  kitePositions?: any[];
  onRefresh?: () => void;
}

export default function PositionsList({ 
  positions, 
  gttTriggers = [], 
  kitePositions = [],
  onRefresh
}: PositionsListProps) {
  // Store custom LTPs in local state to allow manual simulation of P&L if not connected to live data
  const [customLtps, setCustomLtps] = useState<Record<string, number>>({});

  // Form states for placing active GTTs
  const [activeGttFormSymbol, setActiveGttFormSymbol] = useState<string | null>(null);
  const [gttTxType, setGttTxType] = useState<"BUY" | "SELL">("BUY");
  const [gttTriggerType, setGttTriggerType] = useState<"single" | "two-leg">("single");
  const [gttQty, setGttQty] = useState<number>(0);
  const [isPlacingGtt, setIsPlacingGtt] = useState<boolean>(false);
  const [gttError, setGttError] = useState<string | null>(null);

  // Single Leg trigger inputs
  const [singleTriggerPrice, setSingleTriggerPrice] = useState<string>("");
  const [singleTriggerPercent, setSingleTriggerPercent] = useState<string>("");
  const [singleOrderPrice, setSingleOrderPrice] = useState<string>("");
  const [singleOrderType, setSingleOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");

  // OCO Stop-loss leg inputs
  const [slTriggerPrice, setSlTriggerPrice] = useState<string>("");
  const [slTriggerPercent, setSlTriggerPercent] = useState<string>("");
  const [slOrderPrice, setSlOrderPrice] = useState<string>("");
  const [slOrderType, setSlOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");

  // OCO Target leg inputs
  const [tgtTriggerPrice, setTgtTriggerPrice] = useState<string>("");
  const [tgtTriggerPercent, setTgtTriggerPercent] = useState<string>("");
  const [tgtOrderPrice, setTgtOrderPrice] = useState<string>("");
  const [tgtOrderType, setTgtOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");

  const [trailingEnabled, setTrailingEnabled] = useState<boolean>(false);

  const roundToTick = (val: number): number => {
    return Math.round(val / 0.05) * 0.05;
  };

  const updatePercentFromPrice = (priceVal: string, ltp: number, setPercent: (val: string) => void) => {
    const num = parseFloat(priceVal);
    if (!isNaN(num) && ltp > 0) {
      const pct = ((num - ltp) / ltp) * 100;
      setPercent(pct.toFixed(2));
    } else {
      setPercent("");
    }
  };

  const updatePriceFromPercent = (
    percentVal: string, 
    ltp: number, 
    setPrice: (val: string) => void, 
    setOrderPrice?: (val: string) => void
  ) => {
    const pct = parseFloat(percentVal);
    if (!isNaN(pct) && ltp > 0) {
      const price = roundToTick(ltp * (1 + pct / 100));
      setPrice(price.toFixed(2));
      if (setOrderPrice) {
        setOrderPrice(price.toFixed(2));
      }
    } else {
      setPrice("");
      if (setOrderPrice) {
        setOrderPrice("");
      }
    }
  };

  const handleSinglePriceChange = (val: string, ltp: number) => {
    setSingleTriggerPrice(val);
    updatePercentFromPrice(val, ltp, setSingleTriggerPercent);
  };

  const handleSinglePercentChange = (val: string, ltp: number) => {
    setSingleTriggerPercent(val);
    updatePriceFromPercent(val, ltp, setSingleTriggerPrice, setSingleOrderPrice);
  };

  const handleSlPriceChange = (val: string, ltp: number) => {
    setSlTriggerPrice(val);
    updatePercentFromPrice(val, ltp, setSlTriggerPercent);
  };

  const handleSlPercentChange = (val: string, ltp: number) => {
    setSlTriggerPercent(val);
    updatePriceFromPercent(val, ltp, setSlTriggerPrice, setSlOrderPrice);
  };

  const handleTgtPriceChange = (val: string, ltp: number) => {
    setTgtTriggerPrice(val);
    updatePercentFromPrice(val, ltp, setTgtTriggerPercent);
  };

  const handleTgtPercentChange = (val: string, ltp: number) => {
    setTgtTriggerPercent(val);
    updatePriceFromPercent(val, ltp, setTgtTriggerPrice, setTgtOrderPrice);
  };

  const openGttForm = (symbol: string, defaultQty: number, currentLtp: number, positionType: "Long" | "Short") => {
    setActiveGttFormSymbol(symbol);
    setGttQty(defaultQty);
    setGttTriggerType("single");
    setTrailingEnabled(false);
    setGttError(null);

    // Set transaction type: BUY to cover Short position, SELL to close Long position
    const defaultTx = positionType === "Short" ? "BUY" : "SELL";
    setGttTxType(defaultTx);

    // Dynamic percentages based on direction
    const slPct = defaultTx === "BUY" ? 10 : -10;
    const tgtPct = defaultTx === "BUY" ? -10 : 10;

    const slPriceVal = roundToTick(currentLtp * (1 + slPct / 100));
    const tgtPriceVal = roundToTick(currentLtp * (1 + tgtPct / 100));

    // Initialize Single leg inputs
    setSingleTriggerPrice(slPriceVal.toFixed(2));
    setSingleTriggerPercent(slPct.toString());
    setSingleOrderPrice(slPriceVal.toFixed(2));
    setSingleOrderType("LIMIT");

    // Initialize OCO inputs
    setSlTriggerPrice(slPriceVal.toFixed(2));
    setSlTriggerPercent(slPct.toString());
    setSlOrderPrice(slPriceVal.toFixed(2));
    setSlOrderType("LIMIT");

    setTgtTriggerPrice(tgtPriceVal.toFixed(2));
    setTgtTriggerPercent(tgtPct.toString());
    setTgtOrderPrice(tgtPriceVal.toFixed(2));
    setTgtOrderType("LIMIT");
  };

  const handleGttSubmit = async (symbol: string, currentLtp: number) => {
    setGttError(null);

    if (gttQty <= 0) {
      setGttError("Quantity must be greater than 0");
      return;
    }

    let stopLossPayload: { trigger: number; price: number } | undefined = undefined;
    let targetPayload: { trigger: number; price: number } | undefined = undefined;

    if (gttTriggerType === "single") {
      const triggerVal = roundToTick(parseFloat(singleTriggerPrice));
      const orderPriceVal = singleOrderType === "LIMIT" 
        ? roundToTick(parseFloat(singleOrderPrice)) 
        : triggerVal;

      if (isNaN(triggerVal) || triggerVal <= 0) {
        setGttError("Trigger price must be a valid number greater than 0");
        return;
      }
      if (singleOrderType === "LIMIT" && (isNaN(orderPriceVal) || orderPriceVal <= 0)) {
        setGttError("Order price must be a valid number greater than 0");
        return;
      }

      stopLossPayload = {
        trigger: triggerVal,
        price: orderPriceVal,
      };
    } else {
      // OCO (both legs)
      const slTriggerVal = roundToTick(parseFloat(slTriggerPrice));
      const slOrderPriceVal = slOrderType === "LIMIT" 
        ? roundToTick(parseFloat(slOrderPrice)) 
        : slTriggerVal;

      const tgtTriggerVal = roundToTick(parseFloat(tgtTriggerPrice));
      const tgtOrderPriceVal = tgtOrderType === "LIMIT" 
        ? roundToTick(parseFloat(tgtOrderPrice)) 
        : tgtTriggerVal;

      if (isNaN(slTriggerVal) || slTriggerVal <= 0 || isNaN(tgtTriggerVal) || tgtTriggerVal <= 0) {
        setGttError("Trigger prices must be valid numbers greater than 0");
        return;
      }
      if (slOrderType === "LIMIT" && (isNaN(slOrderPriceVal) || slOrderPriceVal <= 0)) {
        setGttError("Stop-loss order price must be a valid number greater than 0");
        return;
      }
      if (tgtOrderType === "LIMIT" && (isNaN(tgtOrderPriceVal) || tgtOrderPriceVal <= 0)) {
        setGttError("Target order price must be a valid number greater than 0");
        return;
      }

      // OCO triggers must bracket the LTP (one above, one below)
      if (
        (slTriggerVal > currentLtp && tgtTriggerVal > currentLtp) || 
        (slTriggerVal < currentLtp && tgtTriggerVal < currentLtp)
      ) {
        setGttError(`For OCO GTT: One trigger must be ABOVE the current price (Rs. ${currentLtp}) and the other must be BELOW it.`);
        return;
      }
      if (slTriggerVal === currentLtp || tgtTriggerVal === currentLtp) {
        setGttError(`Trigger prices cannot be exactly equal to the current LTP (Rs. ${currentLtp}).`);
        return;
      }

      stopLossPayload = {
        trigger: slTriggerVal,
        price: slOrderPriceVal,
      };
      targetPayload = {
        trigger: tgtTriggerVal,
        price: tgtOrderPriceVal,
      };
    }

    setIsPlacingGtt(true);
    try {
      const apiKey = localStorage.getItem("kite_api_key");
      const sessionStr = localStorage.getItem("kite_session");

      if (!apiKey || !sessionStr) {
        throw new Error("No active session found. Please log in first.");
      }

      const session = JSON.parse(sessionStr);
      const { createKiteGttAction } = await import("@/app/actions/kite");
      
      const res = await createKiteGttAction(apiKey, session.accessToken, {
        symbol,
        quantity: gttQty,
        ltp: currentLtp,
        triggerType: gttTriggerType,
        transactionType: gttTxType,
        stopLoss: stopLossPayload,
        target: targetPayload,
      });

      if (!res.success) {
        throw new Error(res.error || "Zerodha API rejected the GTT trigger");
      }

      setActiveGttFormSymbol(null);
      alert(`GTT ${gttTriggerType === "single" ? "single-leg" : "OCO"} trigger successfully placed in Zerodha for ${symbol}!`);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      console.error(err);
      setGttError(err.message || "Failed to place GTT order");
    } finally {
      setIsPlacingGtt(false);
    }
  };

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

                    // Securing GTTs: must be BUY for Short position, and SELL for Long position
                    const securingGtts = matchingGtts.filter((g) => {
                      const dir = g.orders?.[0]?.transaction_type;
                      return pos.type === "Short" ? dir === "BUY" : dir === "SELL";
                    });

                    // Risk-increasing GTTs: same direction as position (SELL for Short, BUY for Long)
                    const sameDirectionGtts = matchingGtts.filter((g) => {
                      const dir = g.orders?.[0]?.transaction_type;
                      return pos.type === "Short" ? dir === "SELL" : dir === "BUY";
                    });

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
                            const totalGttQty = securingGtts.reduce((sum, gtt) => {
                              const qty = gtt.orders?.reduce((oSum: number, o: any) => oSum + (o.quantity || 0), 0) || 0;
                              return sum + qty;
                            }, 0);

                            if (totalGttQty === 0) {
                              return (
                                <div className="bg-rose-950/20 border border-rose-900/30 rounded-2xl p-3 flex items-start gap-2.5">
                                  <Warning className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                  <div className="space-y-0.5">
                                    <p className="text-rose-400 text-[10px] font-semibold uppercase tracking-wider">Unsecured Position</p>
                                    <p className="text-zinc-500 text-[9px] leading-relaxed">
                                      No active GTT Stop-Loss or Target orders detected for this position.
                                    </p>
                                  </div>
                                </div>
                              );
                            }

                            const parsedTriggers = securingGtts.map((gtt) => {
                              const isOco = gtt.type === "two-leg";
                              const trigger1 = gtt.condition.trigger_values[0];
                              const trigger2 = isOco ? gtt.condition.trigger_values[1] : null;
                              
                              let sl = 0;
                              let target = 0;
                              if (isOco && trigger2 !== null) {
                                sl = Math.max(trigger1, trigger2);
                                target = Math.min(trigger1, trigger2);
                              } else {
                                if (trigger1 > ltp) {
                                  sl = trigger1;
                                } else {
                                  target = trigger1;
                                }
                              }
                              
                              const qty = gtt.orders?.reduce((oSum: number, o: any) => oSum + (o.quantity || 0), 0) || 0;
                              return { sl, target, qty };
                            });

                            const isPartial = totalGttQty < pos.quantity;

                            return (
                              <div className="space-y-2">
                                <div className={`rounded-2xl p-3 flex items-start gap-2.5 border ${
                                  isPartial 
                                    ? "bg-amber-950/20 border-amber-900/30 text-amber-400" 
                                    : "bg-emerald-950/15 border-emerald-900/25 text-emerald-400"
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
                                          GTT covers <strong className="text-amber-300 font-mono">{totalGttQty}</strong> of <strong className="text-white font-mono">{pos.quantity}</strong> units. <strong className="text-rose-400 font-mono">{pos.quantity - totalGttQty}</strong> units are unprotected!
                                        </>
                                      ) : (
                                        <>
                                          GTT covers 100% of your position (<strong className="text-emerald-300 font-mono">{totalGttQty}</strong> units).
                                        </>
                                      )}
                                    </p>
                                  </div>
                                </div>

                                {/* List individual triggers */}
                                <div className="bg-zinc-950/40 rounded-xl p-2.5 border border-white/5 space-y-1.5">
                                  {parsedTriggers.map((t, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-[9px] text-zinc-500 font-mono">
                                      <span>Lot Qty: {t.qty}</span>
                                      <span>
                                        {t.sl > 0 && `SL: Rs. ${t.sl.toFixed(2)}`}
                                        {t.sl > 0 && t.target > 0 && " | "}
                                        {t.target > 0 && `Tgt: Rs. ${t.target.toFixed(2)}`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Same Direction Risk Warning */}
                          {sameDirectionGtts.length > 0 && (
                            <div className="bg-rose-950/20 border border-rose-900/30 rounded-2xl p-3 flex items-start gap-2.5 mt-2">
                              <Warning className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <p className="text-rose-400 text-[10px] font-semibold uppercase tracking-wider">Same-Direction GTT Detected</p>
                                <p className="text-zinc-400 text-[9px] leading-relaxed">
                                  Found active <strong className="text-rose-300 font-mono">SELL GTT</strong> of <strong className="text-white font-mono">{sameDirectionGtts.reduce((s, g) => s + (g.orders?.reduce((oSum: number, o: any) => oSum + (o.quantity || 0), 0) || 0), 0)}</strong> units. Since you are already <strong className="text-zinc-300 font-semibold">{pos.type}</strong>, this GTT will **open new short positions** (increase risk) rather than securing it!
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Place GTT Form or Button */}
                          {(() => {
                            const totalGttQty = securingGtts.reduce((sum, gtt) => {
                              const qty = gtt.orders?.reduce((oSum: number, o: any) => oSum + (o.quantity || 0), 0) || 0;
                              return sum + qty;
                            }, 0);
                            
                            const isLive = kitePositions && kitePositions.length > 0;
                            const unprotectedQty = pos.quantity - totalGttQty;

                            if (!isLive || unprotectedQty <= 0) return null;

                             return activeGttFormSymbol === pos.symbol ? (
                               <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 mt-3 space-y-5 shadow-2xl text-left text-zinc-200 w-full relative overflow-hidden">
                                 {/* Top header strip with Symbol & GTT logo */}
                                 <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                   <div className="flex items-center gap-2 flex-wrap">
                                     <span className="font-mono font-bold text-sm text-white">
                                       {pos.symbol}
                                     </span>
                                     <span className="text-[10px] text-zinc-500 font-medium px-1.5 py-0.5 bg-zinc-900 border border-white/5 rounded">
                                       NFO
                                     </span>
                                     <span className="font-mono text-xs text-zinc-400 font-semibold ml-1">
                                       {ltp.toFixed(2)}
                                     </span>
                                   </div>
                                   <div className="flex items-center gap-2">
                                     <span className="text-[9px] bg-orange-600 text-white font-bold px-1.5 py-0.5 rounded tracking-wide">
                                       GTT
                                     </span>
                                     <button 
                                       className="text-zinc-500 hover:text-zinc-300 text-xs font-mono"
                                       onClick={() => setActiveGttFormSymbol(null)}
                                     >
                                       [✕]
                                     </button>
                                   </div>
                                 </div>

                                 {gttError && (
                                   <div className="text-[10px] text-rose-400 bg-rose-950/20 border border-rose-900/30 rounded-xl p-3 font-mono">
                                     {gttError}
                                   </div>
                                 )}

                                 {/* Row: Transaction Type & Trigger Type */}
                                 <div className="grid grid-cols-2 gap-4">
                                   {/* Transaction Type Segment Control */}
                                   <div>
                                     <label className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold mb-1.5">
                                       Transaction Type
                                     </label>
                                     <div className="grid grid-cols-2 bg-zinc-900/60 p-0.5 rounded-lg border border-white/5">
                                       <button
                                         type="button"
                                         className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                                           gttTxType === "BUY" 
                                             ? "bg-[#4184f3] text-white shadow-sm" 
                                             : "text-zinc-500 hover:text-zinc-300"
                                         }`}
                                         onClick={() => setGttTxType("BUY")}
                                       >
                                         Buy
                                       </button>
                                       <button
                                         type="button"
                                         className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                                           gttTxType === "SELL" 
                                             ? "bg-[#ff5722] text-white shadow-sm" 
                                             : "text-zinc-500 hover:text-zinc-300"
                                         }`}
                                         onClick={() => setGttTxType("SELL")}
                                       >
                                         Sell
                                       </button>
                                     </div>
                                   </div>

                                   {/* Trigger Type Segment Control */}
                                   <div>
                                     <label className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold mb-1.5">
                                       Trigger Type
                                     </label>
                                     <div className="grid grid-cols-2 bg-zinc-900/60 p-0.5 rounded-lg border border-white/5">
                                       <button
                                         type="button"
                                         className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                                           gttTriggerType === "single" 
                                             ? "bg-zinc-800 text-white shadow-sm" 
                                             : "text-zinc-500 hover:text-zinc-300"
                                         }`}
                                         onClick={() => setGttTriggerType("single")}
                                       >
                                         Single
                                       </button>
                                       <button
                                         type="button"
                                         className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                                           gttTriggerType === "two-leg" 
                                             ? "bg-zinc-800 text-white shadow-sm" 
                                             : "text-zinc-500 hover:text-zinc-300"
                                         }`}
                                         onClick={() => setGttTriggerType("two-leg")}
                                       >
                                         OCO
                                       </button>
                                     </div>
                                   </div>
                                 </div>

                                 <p className="text-[10px] text-zinc-500 leading-relaxed italic bg-zinc-900/20 p-2 rounded-lg border border-white/5">
                                   The order is placed when the Last Traded Price (LTP) crosses the trigger price. Can be used to enter or exit a position.
                                 </p>

                                 {/* Trigger configuration area */}
                                 {gttTriggerType === "single" ? (
                                   /* SINGLE LEG FORM */
                                   <div className="space-y-3.5">
                                     <div className="grid grid-cols-2 gap-4">
                                       <div>
                                         <label className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">
                                           Trigger Price
                                         </label>
                                         <input
                                           type="number"
                                           step="0.05"
                                           className="font-mono text-white bg-zinc-900 border border-white/10 rounded-lg text-xs w-full p-2 focus:outline-none focus:border-emerald-500"
                                           value={singleTriggerPrice}
                                           onChange={(e) => handleSinglePriceChange(e.target.value, ltp)}
                                         />
                                       </div>

                                       <div>
                                         <label className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">
                                           % of LTP
                                         </label>
                                         <input
                                           type="number"
                                           step="0.01"
                                           className="font-mono text-white bg-zinc-900 border border-white/10 rounded-lg text-xs w-full p-2 focus:outline-none focus:border-emerald-500"
                                           value={singleTriggerPercent}
                                           onChange={(e) => handleSinglePercentChange(e.target.value, ltp)}
                                         />
                                       </div>
                                     </div>

                                     <div className="pt-2 border-t border-white/5 space-y-3">
                                       <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                         <span className="font-semibold">Places order</span>
                                         <div className="flex gap-2">
                                           <span className="bg-zinc-900 px-2 py-0.5 rounded border border-white/5 text-[9px] font-bold">NRML</span>
                                           <div className="flex bg-zinc-900 rounded p-0.5 border border-white/5 text-[9px]">
                                             <button
                                               type="button"
                                               className={`px-2 py-0.5 rounded ${singleOrderType === "LIMIT" ? "bg-zinc-800 text-white font-bold" : "text-zinc-500"}`}
                                               onClick={() => setSingleOrderType("LIMIT")}
                                             >
                                               Limit
                                             </button>
                                             <button
                                               type="button"
                                               className={`px-2 py-0.5 rounded ${singleOrderType === "MARKET" ? "bg-zinc-800 text-white font-bold" : "text-zinc-500"}`}
                                               onClick={() => setSingleOrderType("MARKET")}
                                             >
                                               Market
                                             </button>
                                           </div>
                                         </div>
                                       </div>

                                       <div className="grid grid-cols-2 gap-4">
                                         <div>
                                           <label className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">
                                             Qty.
                                           </label>
                                           <input
                                             type="number"
                                             className="font-mono text-white bg-zinc-900 border border-white/10 rounded-lg text-xs w-full p-2 focus:outline-none focus:border-emerald-500"
                                             value={gttQty}
                                             onChange={(e) => setGttQty(Math.max(1, parseInt(e.target.value) || 0))}
                                           />
                                         </div>

                                         {singleOrderType === "LIMIT" && (
                                           <div>
                                             <label className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">
                                               Price
                                             </label>
                                             <input
                                               type="number"
                                               step="0.05"
                                               className="font-mono text-white bg-zinc-900 border border-white/10 rounded-lg text-xs w-full p-2 focus:outline-none focus:border-emerald-500"
                                               value={singleOrderPrice}
                                               onChange={(e) => setSingleOrderPrice(e.target.value)}
                                             />
                                           </div>
                                         )}
                                       </div>
                                     </div>
                                   </div>
                                 ) : (
                                   /* OCO (STOPLOSS + TARGET) FORM */
                                   <div className="space-y-4">
                                     {/* Stoploss Leg */}
                                     <div className="space-y-2.5 bg-zinc-900/30 p-3.5 rounded-xl border border-white/5">
                                       <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400">
                                         <span className="uppercase tracking-wider">Stoploss</span>
                                         <div className="flex bg-zinc-900 rounded p-0.5 border border-white/5 text-[9px]">
                                           <button
                                             type="button"
                                             className={`px-2 py-0.5 rounded ${slOrderType === "LIMIT" ? "bg-zinc-800 text-white font-bold" : "text-zinc-500"}`}
                                             onClick={() => setSlOrderType("LIMIT")}
                                           >
                                             Limit
                                           </button>
                                           <button
                                             type="button"
                                             className={`px-2 py-0.5 rounded ${slOrderType === "MARKET" ? "bg-zinc-800 text-white font-bold" : "text-zinc-500"}`}
                                             onClick={() => setSlOrderType("MARKET")}
                                           >
                                             Market
                                           </button>
                                         </div>
                                       </div>

                                       <div className="grid grid-cols-3 gap-2">
                                         <div>
                                           <label className="text-[8px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">Trigger Price</label>
                                           <input
                                             type="number"
                                             step="0.05"
                                             className="font-mono text-white bg-zinc-900 border border-white/10 rounded-lg text-[10px] w-full p-1.5 focus:outline-none focus:border-emerald-500"
                                             value={slTriggerPrice}
                                             onChange={(e) => handleSlPriceChange(e.target.value, ltp)}
                                           />
                                         </div>
                                         <div>
                                           <label className="text-[8px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">% of LTP</label>
                                           <input
                                             type="number"
                                             step="0.01"
                                             className="font-mono text-white bg-zinc-900 border border-white/10 rounded-lg text-[10px] w-full p-1.5 focus:outline-none focus:border-emerald-500"
                                             value={slTriggerPercent}
                                             onChange={(e) => handleSlPercentChange(e.target.value, ltp)}
                                           />
                                         </div>
                                         {slOrderType === "LIMIT" && (
                                           <div>
                                             <label className="text-[8px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">Price</label>
                                             <input
                                               type="number"
                                               step="0.05"
                                               className="font-mono text-white bg-zinc-900 border border-white/10 rounded-lg text-[10px] w-full p-1.5 focus:outline-none focus:border-emerald-500"
                                               value={slOrderPrice}
                                               onChange={(e) => setSlOrderPrice(e.target.value)}
                                             />
                                           </div>
                                         )}
                                       </div>
                                     </div>

                                     {/* Target Leg */}
                                     <div className="space-y-2.5 bg-zinc-900/30 p-3.5 rounded-xl border border-white/5">
                                       <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400">
                                         <span className="uppercase tracking-wider">Target</span>
                                         <div className="flex bg-zinc-900 rounded p-0.5 border border-white/5 text-[9px]">
                                           <button
                                             type="button"
                                             className={`px-2 py-0.5 rounded ${tgtOrderType === "LIMIT" ? "bg-zinc-800 text-white font-bold" : "text-zinc-500"}`}
                                             onClick={() => setTgtOrderType("LIMIT")}
                                           >
                                             Limit
                                           </button>
                                           <button
                                             type="button"
                                             className={`px-2 py-0.5 rounded ${tgtOrderType === "MARKET" ? "bg-zinc-800 text-white font-bold" : "text-zinc-500"}`}
                                             onClick={() => setTgtOrderType("MARKET")}
                                           >
                                             Market
                                           </button>
                                         </div>
                                       </div>

                                       <div className="grid grid-cols-3 gap-2">
                                         <div>
                                           <label className="text-[8px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">Trigger Price</label>
                                           <input
                                             type="number"
                                             step="0.05"
                                             className="font-mono text-white bg-zinc-900 border border-white/10 rounded-lg text-[10px] w-full p-1.5 focus:outline-none focus:border-emerald-500"
                                             value={tgtTriggerPrice}
                                             onChange={(e) => handleTgtPriceChange(e.target.value, ltp)}
                                           />
                                         </div>
                                         <div>
                                           <label className="text-[8px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">% of LTP</label>
                                           <input
                                             type="number"
                                             step="0.01"
                                             className="font-mono text-white bg-zinc-900 border border-white/10 rounded-lg text-[10px] w-full p-1.5 focus:outline-none focus:border-emerald-500"
                                             value={tgtTriggerPercent}
                                             onChange={(e) => handleTgtPercentChange(e.target.value, ltp)}
                                           />
                                         </div>
                                         {tgtOrderType === "LIMIT" && (
                                           <div>
                                             <label className="text-[8px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">Price</label>
                                             <input
                                               type="number"
                                               step="0.05"
                                               className="font-mono text-white bg-zinc-900 border border-white/10 rounded-lg text-[10px] w-full p-1.5 focus:outline-none focus:border-emerald-500"
                                               value={tgtOrderPrice}
                                               onChange={(e) => setTgtOrderPrice(e.target.value)}
                                             />
                                           </div>
                                         )}
                                       </div>
                                     </div>

                                     {/* Shared Qty for OCO */}
                                     <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1">
                                       <span className="font-semibold">Shared Quantity (Qty)</span>
                                       <input
                                         type="number"
                                         className="font-mono text-white bg-zinc-900 border border-white/10 rounded-lg text-xs w-[100px] p-2 focus:outline-none focus:border-emerald-500 text-right"
                                         value={gttQty}
                                         onChange={(e) => setGttQty(Math.max(1, parseInt(e.target.value) || 0))}
                                       />
                                     </div>
                                   </div>
                                 )}

                                 {/* Trailing Checkbox Row */}
                                 <div className="flex items-center gap-2 pt-2 text-[10px] text-zinc-400">
                                   <input
                                     type="checkbox"
                                     id="trailingCheck"
                                     className="rounded bg-zinc-900 border-white/10 text-emerald-500 focus:ring-0 focus:ring-offset-0 focus:outline-none"
                                     checked={trailingEnabled}
                                     onChange={(e) => setTrailingEnabled(e.target.checked)}
                                   />
                                   <label htmlFor="trailingCheck" className="cursor-pointer select-none">
                                     Trailing
                                   </label>
                                 </div>

                                 {/* T&C Disclaimer & Expiry */}
                                 <p className="text-[8px] text-zinc-500 leading-normal border-t border-white/5 pt-3">
                                   By placing, I agree to the terms and accept that trigger executions are not guaranteed. This trigger expires on{" "}
                                   <strong className="text-zinc-400 font-mono">
                                     {(() => {
                                       const match = pos.symbol.match(/(\d{2})([A-Z]{3})/);
                                       if (match) {
                                         const day = match[1];
                                         const monthStr = match[2];
                                         const months: Record<string, string> = {
                                           JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
                                           JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12"
                                         };
                                         const month = months[monthStr] || "08";
                                         return `2026-${month}-${day}`;
                                       }
                                       return "2026-08-26";
                                     })()}
                                   </strong>.
                                 </p>

                                 {/* Submit / Cancel Actions */}
                                 <div className="grid grid-cols-2 gap-3 pt-1">
                                   <button
                                     type="button"
                                     className="py-2.5 text-xs font-bold rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-white/5 transition-all text-center"
                                     onClick={() => setActiveGttFormSymbol(null)}
                                   >
                                     Cancel
                                   </button>
                                   <button
                                     type="button"
                                     disabled={isPlacingGtt}
                                     className={`py-2.5 text-xs font-bold rounded-xl transition-all text-center text-white flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                                       gttTxType === "BUY" ? "bg-[#4184f3] hover:bg-[#3271d8]" : "bg-[#ff5722] hover:bg-[#e44c1c]"
                                     }`}
                                     onClick={() => handleGttSubmit(pos.symbol, ltp)}
                                   >
                                     {isPlacingGtt ? "Placing..." : "Place"}
                                   </button>
                                 </div>
                               </div>
                             ) : (
                               <button
                                 onClick={() => openGttForm(pos.symbol, unprotectedQty, ltp, pos.type)}
                                 className="w-full mt-2 bg-zinc-900 hover:bg-white/5 border border-white/5 hover:border-white/10 text-white text-[10px] py-2 rounded-xl transition-all font-medium tracking-wide flex items-center justify-center gap-1.5 shadow-sm"
                               >
                                 🛡️ Secure Naked {unprotectedQty} Units
                               </button>
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
