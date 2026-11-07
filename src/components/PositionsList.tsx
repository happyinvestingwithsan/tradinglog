"use client";

import React, { useState, useEffect } from "react";
import { OpenPosition } from "@/lib/tradeEngine";
import { Faders, CalendarBlank, Warning, ShieldCheck, Folder, TrendUp, TrendDown, Check, Lightning } from "@phosphor-icons/react";

interface PositionsListProps {
  positions: OpenPosition[];
  gttTriggers?: any[];
  kitePositions?: any[];
  isKiteConnected?: boolean;
  onRefresh?: () => void;
  onConnectKite?: () => void;
}

export default function PositionsList({ 
  positions, 
  gttTriggers = [], 
  kitePositions = [],
  isKiteConnected = false,
  onRefresh,
  onConnectKite
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

    const defaultTx = positionType === "Short" ? "BUY" : "SELL";
    setGttTxType(defaultTx);

    const slPct = defaultTx === "BUY" ? 10 : -10;
    const tgtPct = defaultTx === "BUY" ? -10 : 10;

    const slPriceVal = roundToTick(currentLtp * (1 + slPct / 100));
    const tgtPriceVal = roundToTick(currentLtp * (1 + tgtPct / 100));

    setSingleTriggerPrice(slPriceVal.toFixed(2));
    setSingleTriggerPercent(slPct.toString());
    setSingleOrderPrice(slPriceVal.toFixed(2));
    setSingleOrderType("LIMIT");

    setSlTriggerPrice(slPriceVal.toFixed(2));
    setSlTriggerPercent(slPct.toString());
    setSlOrderPrice(slPriceVal.toFixed(2));
    setSlOrderType("LIMIT");

    setTgtTriggerPrice(tgtPriceVal.toFixed(2));
    setTgtTriggerPercent(tgtPct.toString());
    setTgtOrderPrice(tgtPriceVal.toFixed(2));
    setTgtOrderType("LIMIT");
  };

  const submitGtt = async (symbol: string, currentLtp: number) => {
    setGttError(null);
    let stopLossPayload = undefined;
    let targetPayload = undefined;

    if (gttTriggerType === "single") {
      const singleTriggerVal = parseFloat(singleTriggerPrice);
      const singleOrderPriceVal = singleOrderType === "MARKET" ? 0 : parseFloat(singleOrderPrice);

      if (isNaN(singleTriggerVal) || singleTriggerVal <= 0) {
        setGttError("Trigger price must be a valid number greater than 0");
        return;
      }
      if (singleOrderType === "LIMIT" && (isNaN(singleOrderPriceVal) || singleOrderPriceVal <= 0)) {
        setGttError("Limit order price must be a valid number greater than 0");
        return;
      }

      stopLossPayload = {
        trigger: singleTriggerVal,
        price: singleOrderPriceVal,
      };
    } else {
      const slTriggerVal = parseFloat(slTriggerPrice);
      const slOrderPriceVal = slOrderType === "MARKET" ? 0 : parseFloat(slOrderPrice);
      const tgtTriggerVal = parseFloat(tgtTriggerPrice);
      const tgtOrderPriceVal = tgtOrderType === "MARKET" ? 0 : parseFloat(tgtOrderPrice);

      if (isNaN(slTriggerVal) || slTriggerVal <= 0) {
        setGttError("Stop-loss trigger price must be a valid number greater than 0");
        return;
      }
      if (slOrderType === "LIMIT" && (isNaN(slOrderPriceVal) || slOrderPriceVal <= 0)) {
        setGttError("Stop-loss order price must be a valid number greater than 0");
        return;
      }
      if (isNaN(tgtTriggerVal) || tgtTriggerVal <= 0) {
        setGttError("Target trigger price must be a valid number greater than 0");
        return;
      }
      if (tgtOrderType === "LIMIT" && (isNaN(tgtOrderPriceVal) || tgtOrderPriceVal <= 0)) {
        setGttError("Target order price must be a valid number greater than 0");
        return;
      }

      if (
        (slTriggerVal > currentLtp && tgtTriggerVal > currentLtp) || 
        (slTriggerVal < currentLtp && tgtTriggerVal < currentLtp)
      ) {
        setGttError(`For OCO GTT: One trigger must be ABOVE the current price (Rs. ${currentLtp}) and the other must be BELOW it.`);
        return;
      }

      stopLossPayload = { trigger: slTriggerVal, price: slOrderPriceVal };
      targetPayload = { trigger: tgtTriggerVal, price: tgtOrderPriceVal };
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
      alert(`GTT trigger successfully placed in Zerodha for ${symbol}!`);
      
      if (onRefresh) onRefresh();
    } catch (err: any) {
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

  const getUnderlying = (symbol: string): string => {
    const match = symbol.match(/^[A-Z&]+/);
    return match ? match[0] : symbol;
  };

  if (positions.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-10 md:p-14 text-center border border-slate-200 shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
          <Folder className="w-6 h-6" />
        </div>
        
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
            {isKiteConnected ? "0 Open Positions in Kite" : "No Positions Synced"}
          </h3>
          <p className="text-slate-500 text-xs font-medium leading-relaxed font-mono">
            {isKiteConnected 
              ? "You currently have no active open option or futures positions in your Zerodha Kite account." 
              : "Zerodha Kite is disconnected. Connect your account in Connections to stream your active positions and live MTM."}
          </p>
        </div>

        <div className="pt-2 flex justify-center gap-3">
          {isKiteConnected ? (
            onRefresh && (
              <button
                onClick={onRefresh}
                className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>🔄 Sync Positions Now</span>
              </button>
            )
          ) : (
            onConnectKite && (
              <button
                onClick={onConnectKite}
                className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <span>Connect Zerodha Kite</span>
                <span>↗</span>
              </button>
            )
          )}
        </div>
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
    <div className="space-y-6">
      {/* List Header */}
      <div className="flex justify-between items-center px-2">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono flex items-center gap-2">
          <span>Active Positions Ledger</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </h3>
        <span className="text-slate-500 text-xs font-mono font-medium">
          {positions.length} Active Options Grouped by Underlying
        </span>
      </div>

      {/* Render Grouped Underlying Cards */}
      <div className="space-y-6">
        {Object.entries(groupedPositions).map(([underlying, posList]) => {
          let totalUnderlyingExposure = 0;
          let totalUnderlyingPnl = 0;

          posList.forEach((pos) => {
            const ltp = customLtps[pos.symbol] !== undefined 
              ? customLtps[pos.symbol] 
              : (pos.lastPrice || pos.entryPrice);
            totalUnderlyingExposure += pos.totalValue;
            
            // Prefer Kite's exact PNL if provided directly, otherwise compute
            const isShort = pos.type === "Short";
            const pnl = pos.pnl !== undefined 
              ? pos.pnl 
              : isShort 
              ? (pos.entryPrice - ltp) * pos.quantity 
              : (ltp - pos.entryPrice) * pos.quantity;
            totalUnderlyingPnl += pnl;
          });

          const isUnderlyingProfit = totalUnderlyingPnl >= 0;

          return (
            <div
              key={underlying}
              className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-sm space-y-6"
            >
              {/* Underlying Header */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <Folder className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 font-mono leading-none">
                      {underlying}
                    </h2>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-1 block">
                      Underlying Group ({posList.length} contracts)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 sm:text-right font-mono">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-medium">Total Value</span>
                    <span className="text-xs text-slate-700 font-semibold">
                      Rs. {totalUnderlyingExposure.toLocaleString("en-IN")}
                    </span>
                  </div>
                  
                  <div className="border-l border-slate-200 pl-6">
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-medium">Live Group P&L</span>
                    <div className={`flex items-center gap-1.5 text-base font-bold mt-0.5 ${
                      isUnderlyingProfit ? "text-emerald-600" : "text-rose-600"
                    }`}>
                      {isUnderlyingProfit ? (
                        <TrendUp className="w-4 h-4 text-emerald-600" weight="bold" />
                      ) : (
                        <TrendDown className="w-4 h-4 text-rose-600" weight="bold" />
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
              <div className="space-y-6 divide-y divide-slate-100">
                {posList.map((pos) => {
                  const ltp = customLtps[pos.symbol] !== undefined 
                    ? customLtps[pos.symbol] 
                    : (pos.lastPrice || pos.entryPrice);
                  
                  const isShort = pos.type === "Short";
                  const optionPnl = pos.pnl !== undefined
                    ? pos.pnl
                    : isShort 
                    ? (pos.entryPrice - ltp) * pos.quantity 
                    : (ltp - pos.entryPrice) * pos.quantity;
                  const isOptionProfit = optionPnl >= 0;

                  // Match GTT triggers
                  const matchingGtts = gttTriggers.filter(
                    (g) => g.condition?.tradingsymbol === pos.symbol && g.status?.toLowerCase() === "active"
                  );

                  const securingGtts = matchingGtts.filter((g) => {
                    const dir = g.orders?.[0]?.transaction_type;
                    return pos.type === "Short" ? dir === "BUY" : dir === "SELL";
                  });

                  return (
                    <div key={pos.symbol} className="pt-6 first:pt-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Option Contract Info */}
                      <div className="lg:col-span-1 space-y-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-900 text-base font-bold tracking-tight">
                              {pos.symbol}
                            </span>
                            {pos.isKiteLive && (
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold px-1.5 py-0.2 rounded">
                                Kite Sync
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                              isShort ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}>
                              {pos.type}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono font-medium">
                              Qty: {pos.quantity} units
                            </span>
                          </div>

                          {/* Mentor Decay Tracker Badge */}
                          {isShort && pos.entryPrice > 0 && ltp > 0 && (() => {
                            const decayPct = Math.round(((pos.entryPrice - ltp) / pos.entryPrice) * 100 * 10) / 10;
                            if (decayPct >= 50) {
                              return (
                                <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                                  <span>🎯 50% Target Hit (+{decayPct}%):</span> Book profit & free margin!
                                </div>
                              );
                            } else if (decayPct >= 30) {
                              return (
                                <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-300 text-cyan-800 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                                  <span>⚡ 30% Fast Decay (+{decayPct}%):</span> Quick bounce profit ready!
                                </div>
                              );
                            }
                            return (
                              <div className="mt-1.5 text-[11px] font-mono text-slate-500">
                                Current Decay: <strong className={decayPct >= 0 ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>{decayPct}%</strong> (Target: 50%)
                              </div>
                            );
                          })()}
                        </div>

                        {/* Price Breakdown */}
                        <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-200 font-mono text-xs">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-medium">Avg Entry</span>
                            <span className="text-slate-800 font-bold mt-0.5 block">
                              Rs. {pos.entryPrice.toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="border-l border-slate-200 pl-3">
                            <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-medium">Live LTP</span>
                            <input
                              type="number"
                              step="0.05"
                              placeholder={pos.entryPrice.toFixed(2)}
                              className="font-bold text-slate-900 bg-white border border-slate-200 rounded px-2 py-0.5 w-full mt-0.5 focus:border-emerald-500 focus:outline-none"
                              value={customLtps[pos.symbol] || ""}
                              onChange={(e) => handleLtpChange(pos.symbol, e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* GTT Security Checking */}
                      <div className="lg:col-span-1 space-y-2">
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold font-mono">Hedging & GTT Safety</span>
                        {(() => {
                          const totalGttQty = securingGtts.reduce((sum, gtt) => {
                            const qty = gtt.orders?.reduce((oSum: number, o: any) => oSum + (o.quantity || 0), 0) || 0;
                            return sum + qty;
                          }, 0);

                          if (totalGttQty === 0) {
                            return (
                              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-start gap-2.5">
                                <Warning className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                  <p className="text-rose-700 text-[10px] font-bold uppercase tracking-wider font-mono">Unsecured Position</p>
                                  <p className="text-slate-500 text-[10px] leading-relaxed font-medium">
                                    No active GTT Stop-Loss or Target orders found in Zerodha.
                                  </p>
                                </div>
                              </div>
                            );
                          }

                          const isPartial = totalGttQty < pos.quantity;

                          return (
                            <div className={`rounded-2xl p-3 flex items-start gap-2.5 border ${
                              isPartial ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                            }`}>
                              {isPartial ? (
                                <Warning className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              ) : (
                                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                              )}
                              <div className="space-y-0.5 font-mono">
                                <p className="text-[10px] font-bold uppercase tracking-wider">
                                  {isPartial ? "Partially Secured" : "Fully Secured"}
                                </p>
                                <p className="text-[10px] text-slate-600">
                                  Covers {totalGttQty} of {pos.quantity} units in Zerodha Kite.
                                </p>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Open GTT trigger form button */}
                        <button
                          onClick={() => openGttForm(pos.symbol, pos.quantity, ltp, pos.type)}
                          className="w-full mt-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                        >
                          <Faders className="w-3.5 h-3.5 text-slate-600" />
                          <span>Configure GTT Target/SL</span>
                        </button>
                      </div>

                      {/* Live P&L display */}
                      <div className="lg:col-span-1 bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between font-mono">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Unrealized Contract P&L</span>
                          <div className={`text-xl font-bold mt-1 ${isOptionProfit ? "text-emerald-600" : "text-rose-600"}`}>
                            {isOptionProfit ? "+" : ""}
                            {optionPnl.toLocaleString("en-IN", {
                              style: "currency",
                              currency: "INR",
                            })}
                          </div>
                          {pos.m2m !== undefined && pos.m2m !== 0 && (
                            <span className="text-[10px] text-slate-500 mt-1 block">
                              Today M2M: <strong className={pos.m2m >= 0 ? "text-emerald-600" : "text-rose-600"}>{pos.m2m >= 0 ? "+" : ""}{pos.m2m}</strong>
                            </span>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between">
                          <span>Exposure: Rs. {pos.totalValue.toLocaleString("en-IN")}</span>
                          <span className="font-semibold text-slate-700">{pos.quantity} Lots</span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* GTT Placement Modal Form */}
              {activeGttFormSymbol && posList.some(p => p.symbol === activeGttFormSymbol) && (
                <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 space-y-4 shadow-xl text-slate-900">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <div>
                      <span className="font-mono font-bold text-base text-slate-900">
                        Zerodha GTT Order: {activeGttFormSymbol}
                      </span>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Place automated profit exit or safety order directly into Kite
                      </p>
                    </div>
                    <button 
                      onClick={() => setActiveGttFormSymbol(null)}
                      className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 font-mono text-xs font-bold"
                    >
                      ✕ Close
                    </button>
                  </div>

                  {gttError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-mono font-semibold">
                      {gttError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Trigger Type</label>
                      <select 
                        value={gttTriggerType}
                        onChange={(e) => setGttTriggerType(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="single">Single Leg Target</option>
                        <option value="two-leg">Two-Leg (OCO: Stop-Loss + Target)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Target Trigger Price (₹)</label>
                      <input 
                        type="number"
                        step="0.05"
                        value={singleTriggerPrice}
                        onChange={(e) => handleSinglePriceChange(e.target.value, customLtps[activeGttFormSymbol] || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Order Quantity</label>
                      <input 
                        type="number"
                        value={gttQty}
                        onChange={(e) => setGttQty(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setActiveGttFormSymbol(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => submitGtt(activeGttFormSymbol, customLtps[activeGttFormSymbol] || 0)}
                      disabled={isPlacingGtt}
                      className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-40"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isPlacingGtt ? "Submitting to Zerodha..." : "Submit GTT to Kite"}</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}
