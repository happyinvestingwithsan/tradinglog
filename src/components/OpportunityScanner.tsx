"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Target, 
  ArrowClockwise, 
  Fire, 
  Copy, 
  Check, 
  TrendDown, 
  TrendUp, 
  SlidersHorizontal,
  Lightning,
  Buildings,
  RocketLaunch,
  SquaresFour
} from "@phosphor-icons/react";
import { ScannedStock, ScannerSummary } from "@/lib/scannerEngine";

interface OpportunityScannerProps {
  onOpenGtt?: (symbol: string, defaultQty: number, ltp: number) => void;
}

export default function OpportunityScanner({ onOpenGtt }: OpportunityScannerProps) {
  const [data, setData] = useState<ScannerSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);

  // Market Cap Slicer: ALL | LARGE_CAP | MID_CAP
  const [capSlicer, setCapSlicer] = useState<"ALL" | "Large Cap" | "Mid Cap">("ALL");
  const [primeOnly, setPrimeOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchScan = async (forceRefresh: boolean = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/scanner${forceRefresh ? "?refresh=true" : ""}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load scanner results");
      }
    } catch (err: any) {
      setError(err.message || "Network error fetching scanner");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScan(false);
  }, []);

  const handleCopyAlert = (stock: ScannedStock) => {
    const text = `🚨 *FNO MENTOR SETUP: ${stock.symbol}*
Category: ${stock.capType} (${stock.category})
Current Price: ₹${stock.price} (${stock.dayPct > 0 ? "+" : ""}${stock.dayPct}%)
Discount: ${stock.dropPct}% from 52W High (₹${stock.high52})
👉 *Action: SELL ATM PUT*
Strike: ${stock.atmStrike} PE
Est. Premium: ₹${stock.estPremium}
Break-Even: ₹${stock.breakEven} (${stock.safetyCushionPct}% cushion)
🎯 30% Fast Decay Exit: ₹${stock.target30Decay}
🎯 50% GTT Target: ₹${stock.target50Decay}
Rule: Sales/Profit ATH + ${stock.dropThreshold}% Discount + Red Panic Day.`;

    navigator.clipboard.writeText(text);
    setCopiedSymbol(stock.symbol);
    setTimeout(() => setCopiedSymbol(null), 2500);
  };

  // Slice candidates based on the Cap Slicer Tool
  const { slicedCandidates, slicedTopPick, stats } = useMemo(() => {
    const rawList = data?.candidates || [];
    
    // 1. Slice by Cap Slicer
    const capFiltered = rawList.filter((item) => {
      if (capSlicer === "ALL") return true;
      return item.capType === capSlicer;
    });

    // 2. Derive dynamic top pick for this specific slice
    const dynamicTopPick = capFiltered.find(c => c.status === "ULTRA_PRIME") 
                        || capFiltered.find(c => c.status === "PRIME") 
                        || capFiltered.find(c => c.dropPct >= c.dropThreshold) 
                        || capFiltered[0] 
                        || null;

    // 3. Stats for this slice
    const ultraCount = capFiltered.filter(c => c.status === "ULTRA_PRIME").length;
    const primeCount = capFiltered.filter(c => c.status === "PRIME").length;
    const watchCount = capFiltered.filter(c => c.status === "WATCHLIST").length;

    // 4. Secondary filters (search, prime only)
    const finalFiltered = capFiltered.filter((item) => {
      if (primeOnly && item.status !== "ULTRA_PRIME" && item.status !== "PRIME") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
      }
      return true;
    });

    return {
      slicedCandidates: finalFiltered,
      slicedTopPick: dynamicTopPick,
      stats: {
        total: capFiltered.length,
        ultra: ultraCount,
        prime: primeCount,
        watch: watchCount
      }
    };
  }, [data, capSlicer, primeOnly, searchQuery]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-600 animate-spin" />
          <Target className="w-6 h-6 text-emerald-600 absolute inset-0 m-auto" />
        </div>
        <div>
          <p className="text-slate-900 text-sm font-semibold tracking-wide">Scanning F&O Large & Mid Cap Stocks</p>
          <p className="text-slate-500 text-xs mt-1">Filtering 52W highs, red panic candles & ATM strikes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-slate-900">
      
      {/* 1. SELECTION SLICER TOOL & HEADER */}
      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-slate-900 text-base md:text-lg font-bold tracking-tight">
                  F&O Opportunity Scanner
                </h2>
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                  Hemant Jain System
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Strictly F&O Tradeable Stocks • Large Cap (F40) & Mid Cap (E40) • No Small Caps
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchScan(true)}
            disabled={refreshing}
            className="w-full md:w-auto px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all text-xs font-mono font-medium flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <ArrowClockwise className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span>{refreshing ? "Scanning Market..." : "Refresh Live Quotes"}</span>
          </button>
        </div>

        {/* PROMINENT LARGE CAP / MID CAP SLICER TOOL */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => setCapSlicer("ALL")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 ${
                capSlicer === "ALL"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <SquaresFour className="w-4 h-4" />
              <span>All F&O (55)</span>
            </button>

            <button
              onClick={() => setCapSlicer("Large Cap")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 ${
                capSlicer === "Large Cap"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Buildings className="w-4 h-4" />
              <span>Large Cap (F40: 31)</span>
            </button>

            <button
              onClick={() => setCapSlicer("Mid Cap")}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 ${
                capSlicer === "Mid Cap"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <RocketLaunch className="w-4 h-4" />
              <span>Mid Cap (E40: 24)</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-500 px-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <strong>{stats.ultra + stats.prime}</strong> Prime Setups
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <strong>{stats.watch}</strong> on Watchlist
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
          {error}
        </div>
      )}

      {/* 2. HERO CARD: DYNAMIC BEST BET TODAY FOR ACTIVE SLICE */}
      {slicedTopPick && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 p-6 md:p-8 space-y-6 shadow-md shadow-emerald-900/5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <span className="text-xs uppercase font-mono tracking-widest text-emerald-800 font-bold">
                🎯 Best Bet Today ({capSlicer === "ALL" ? "Overall F&O" : capSlicer})
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full font-semibold">
                {slicedTopPick.capType}
              </span>
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
                F&O Tradeable
              </span>
            </div>
          </div>

          {/* Stock Header & Live Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 space-y-2">
              <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-3">
                <span>{slicedTopPick.symbol}</span>
                <span className="text-lg md:text-xl font-bold text-slate-600 font-mono">
                  ₹{slicedTopPick.price}
                </span>
              </h3>
              <p className="text-slate-600 text-xs font-medium">{slicedTopPick.name}</p>

              <div className="flex items-center gap-2 pt-2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold ${
                  slicedTopPick.dayPct < 0 
                    ? "bg-rose-100 text-rose-800 border border-rose-200" 
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                }`}>
                  {slicedTopPick.dayPct < 0 ? <TrendDown className="w-3.5 h-3.5" /> : <TrendUp className="w-3.5 h-3.5" />}
                  <span>{slicedTopPick.dayPct > 0 ? "+" : ""}{slicedTopPick.dayPct}% Today</span>
                </span>

                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Fire className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{slicedTopPick.dropPct}% Off 52W High</span>
                </span>
              </div>
            </div>

            {/* Strategy Execution Breakdown */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">Suggested Strike</p>
                <p className="text-lg font-bold text-slate-900 font-mono mt-1">
                  {slicedTopPick.atmStrike} PE
                </p>
                <p className="text-[10px] text-emerald-700 font-mono font-semibold mt-0.5">ATM (Pure Theta)</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">Est. Premium</p>
                <p className="text-lg font-bold text-slate-900 font-mono mt-1">
                  ₹{slicedTopPick.estPremium}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Panic Spiked</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">Break-Even</p>
                <p className="text-lg font-bold text-slate-900 font-mono mt-1">
                  ₹{slicedTopPick.breakEven}
                </p>
                <p className="text-[10px] text-emerald-700 font-mono font-semibold mt-0.5">+{slicedTopPick.safetyCushionPct}% Buffer</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-semibold">50% GTT Target</p>
                <p className="text-lg font-bold text-emerald-600 font-mono mt-1">
                  ₹{slicedTopPick.target50Decay}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Take Profit</p>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
              <Lightning className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Mentor Matrix:</strong> 30% Fast Decay Exit @ ₹{slicedTopPick.target30Decay} | 50% GTT Target @ ₹{slicedTopPick.target50Decay}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleCopyAlert(slicedTopPick)}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 transition-all text-xs font-mono font-semibold flex items-center justify-center gap-1.5"
              >
                {copiedSymbol === slicedTopPick.symbol ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Copied Alert!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-600" />
                    <span>Copy Alert</span>
                  </>
                )}
              </button>

              {onOpenGtt && (
                <button
                  onClick={() => onOpenGtt(slicedTopPick.symbol, 1, slicedTopPick.price)}
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Target className="w-4 h-4" />
                  <span>Setup GTT Order</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SECONDARY CONTROLS & SEARCH */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setPrimeOnly(!primeOnly)}
            className={`px-4 py-2 rounded-full border text-xs font-mono flex items-center gap-1.5 transition-all font-semibold ${
              primeOnly 
                ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                : "bg-white text-slate-600 border-slate-200 hover:text-slate-900 shadow-sm"
            }`}
          >
            <Fire className="w-3.5 h-3.5 text-emerald-600" />
            <span>Prime Setups Only</span>
          </button>
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search F&O symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs px-4 py-2 bg-white border border-slate-200 focus:border-emerald-500 rounded-full focus:outline-none text-slate-800 font-mono shadow-sm"
          />
        </div>
      </div>

      {/* 4. OPPORTUNITIES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {slicedCandidates.map((stock) => {
          const isPrime = stock.status === "ULTRA_PRIME" || stock.status === "PRIME";
          const isWatchlist = stock.status === "WATCHLIST";

          return (
            <div
              key={stock.symbol}
              className={`bg-white rounded-3xl p-5 border transition-all duration-300 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md ${
                isPrime
                  ? "border-emerald-300 bg-emerald-50/20"
                  : isWatchlist
                  ? "border-amber-200 bg-amber-50/10"
                  : "border-slate-200 opacity-90 hover:opacity-100"
              }`}
            >
              {/* Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-slate-900 text-base font-bold font-mono">{stock.symbol}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                      {stock.capType}
                    </span>
                  </div>

                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                    stock.status === "ULTRA_PRIME"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : stock.status === "PRIME"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : isWatchlist
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}>
                    {stock.statusLabel}
                  </span>
                </div>
                <p className="text-slate-500 text-xs truncate font-medium">{stock.name}</p>
              </div>

              {/* Price & Drop Stats */}
              <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-100 font-mono">
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">Current Spot</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">₹{stock.price}</p>
                  <span className={`text-[10px] font-bold inline-flex items-center gap-0.5 ${
                    stock.dayPct < 0 ? "text-rose-600" : "text-emerald-600"
                  }`}>
                    {stock.dayPct < 0 ? "▼" : "▲"} {stock.dayPct > 0 ? "+" : ""}{stock.dayPct}%
                  </span>
                </div>

                <div>
                  <p className="text-[10px] text-slate-500 font-semibold">52W Drop</p>
                  <p className={`text-sm font-bold mt-0.5 ${
                    stock.dropPct >= stock.dropThreshold ? "text-emerald-700" : "text-slate-700"
                  }`}>
                    -{stock.dropPct}%
                  </p>
                  <p className="text-[10px] text-slate-400">Peak: ₹{stock.high52}</p>
                </div>
              </div>

              {/* Progress Bar towards Mentor Threshold */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Req: {stock.dropThreshold}%</span>
                  <span className="font-semibold text-slate-700">{stock.dropPct}% Reached</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      stock.dropPct >= stock.dropThreshold ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                    style={{ width: `${Math.min(100, (stock.dropPct / stock.dropThreshold) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Trade Action Plan */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-center justify-between text-xs font-mono">
                <div>
                  <p className="text-[10px] text-slate-500 font-medium">Strike / Premium</p>
                  <p className="text-slate-900 font-bold">{stock.atmStrike} PE @ ₹{stock.estPremium}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 font-medium">50% GTT Target</p>
                  <p className="text-emerald-700 font-bold">₹{stock.target50Decay}</p>
                </div>
              </div>

              {/* Quick Action Button */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleCopyAlert(stock)}
                  className="w-full py-2 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 transition-all text-xs font-mono font-semibold flex items-center justify-center gap-1.5"
                >
                  {copiedSymbol === stock.symbol ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied Alert</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Copy Setup</span>
                    </>
                  )}
                </button>

                {onOpenGtt && (
                  <button
                    onClick={() => onOpenGtt(stock.symbol, 1, stock.price)}
                    className="px-4 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-mono text-xs flex items-center justify-center gap-1 font-bold"
                    title="Open GTT order"
                  >
                    <Target className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
