"use client";

import React from "react";
import { TradeSummary } from "@/lib/tradeEngine";
import { TrendUp, TrendDown, Trophy, ChartBar, Scales, CurrencyInr, ShieldCheck, Plugs, Info } from "@phosphor-icons/react";

interface MetricsGridProps {
  summary: TradeSummary;
  kitePositions?: any[];
  kiteMargins?: any;
  isKiteConnected?: boolean;
  isDemoMode?: boolean;
  onConnectKite?: () => void;
}

export default function MetricsGrid({ 
  summary, 
  kitePositions = [], 
  kiteMargins,
  isKiteConnected = false,
  isDemoMode = false,
  onConnectKite
}: MetricsGridProps) {
  
  // 1. LIVE KITE MODE COMPUTATIONS
  const activeKitePositions = (kitePositions || []).filter((p) => p.quantity !== 0);
  
  // Unrealized M2M across active open positions
  const kiteUnrealizedPnl = activeKitePositions.reduce((sum, p) => {
    return sum + (Number(p.unrealised) || Number(p.pnl) || 0);
  }, 0);

  // Today's Realized P&L from closed contracts in Kite
  const kiteRealizedPnl = (kitePositions || []).reduce((sum, p) => {
    return sum + (Number(p.realised) || 0);
  }, 0);

  // Total Kite P&L (Unrealized + Realized)
  const kiteTotalPnl = (kitePositions || []).reduce((sum, p) => {
    return sum + (Number(p.pnl) || 0);
  }, 0);

  const isLiveMtmPositive = kiteUnrealizedPnl >= 0;
  const isLiveRealizedPositive = kiteRealizedPnl >= 0;
  const isLiveTotalPositive = kiteTotalPnl >= 0;

  // Lot capacity based on ~1.6L margin per ATM/OTM put lot
  const freeMargin = kiteMargins ? Math.max(0, kiteMargins.net - kiteMargins.utilised) : 0;
  const lotCapacity = Math.floor(freeMargin / 160000);

  // Build the cards according to state
  let cards: any[] = [];

  if (isKiteConnected) {
    // Kite is actively connected: display LIVE Zerodha stats
    cards = [
      {
        title: "Live Open P&L (MTM)",
        value: kiteUnrealizedPnl.toLocaleString("en-IN", {
          style: "currency",
          currency: "INR",
        }),
        description: `${activeKitePositions.length} active F&O ${activeKitePositions.length === 1 ? "position" : "positions"} in Kite`,
        icon: isLiveMtmPositive ? (
          <TrendUp className="w-5 h-5 text-emerald-600" weight="bold" />
        ) : (
          <TrendDown className="w-5 h-5 text-rose-600" weight="bold" />
        ),
        textColor: isLiveMtmPositive ? "text-emerald-600" : "text-rose-600",
        bgAccent: isLiveMtmPositive ? "bg-emerald-50/80 border-emerald-200" : "bg-rose-50/80 border-rose-200",
      },
      {
        title: "Today's Realized P&L",
        value: kiteRealizedPnl.toLocaleString("en-IN", {
          style: "currency",
          currency: "INR",
        }),
        description: "Locked gains/losses on squared off contracts",
        icon: isLiveRealizedPositive ? (
          <TrendUp className="w-5 h-5 text-emerald-600" weight="bold" />
        ) : (
          <TrendDown className="w-5 h-5 text-rose-600" weight="bold" />
        ),
        textColor: isLiveRealizedPositive ? "text-emerald-600" : "text-rose-600",
        bgAccent: isLiveRealizedPositive ? "bg-emerald-50/60 border-emerald-100" : "bg-rose-50/60 border-rose-100",
      },
      {
        title: "Total Net P&L",
        value: kiteTotalPnl.toLocaleString("en-IN", {
          style: "currency",
          currency: "INR",
        }),
        description: "Combined MTM + Realized today",
        icon: isLiveTotalPositive ? (
          <CurrencyInr className="w-5 h-5 text-emerald-600" weight="bold" />
        ) : (
          <CurrencyInr className="w-5 h-5 text-rose-600" weight="bold" />
        ),
        textColor: isLiveTotalPositive ? "text-emerald-600" : "text-rose-600",
        bgAccent: isLiveTotalPositive ? "bg-emerald-50/60 border-emerald-100" : "bg-rose-50/60 border-rose-100",
      },
      {
        title: "Total Margin Capital",
        value: kiteMargins ? "₹" + kiteMargins.net.toLocaleString("en-IN") : "--",
        description: kiteMargins ? `Utilised: ₹${kiteMargins.utilised.toLocaleString("en-IN")}` : "Kite SPAN margin",
        icon: <ShieldCheck className="w-5 h-5 text-indigo-600" weight="bold" />,
        textColor: "text-slate-900",
        bgAccent: "bg-indigo-50/60 border-indigo-100",
      },
      {
        title: "Safe Lot Capacity",
        value: `+${lotCapacity} lots`,
        description: `Free margin: ₹${Math.round(freeMargin).toLocaleString("en-IN")}`,
        icon: <ChartBar className="w-5 h-5 text-emerald-600" weight="bold" />,
        textColor: lotCapacity > 0 ? "text-emerald-600" : "text-slate-700",
        bgAccent: "bg-slate-50 border-slate-200",
      },
    ];
  } else if (isDemoMode) {
    // DEMO ARCHIVE MODE
    const isRealizedPositive = summary.totalRealizedPnl >= 0;
    cards = [
      {
        title: "Sample Realized P&L",
        value: summary.totalRealizedPnl.toLocaleString("en-IN", {
          style: "currency",
          currency: "INR",
        }),
        description: "Demo mock closed trades archive",
        icon: isRealizedPositive ? (
          <TrendUp className="w-5 h-5 text-emerald-600" weight="bold" />
        ) : (
          <TrendDown className="w-5 h-5 text-rose-600" weight="bold" />
        ),
        textColor: isRealizedPositive ? "text-emerald-600" : "text-rose-600",
        bgAccent: isRealizedPositive ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100",
      },
      {
        title: "Win Rate (Demo)",
        value: (summary.winRatio * 100).toFixed(1) + "%",
        description: `${summary.winTradesCount} wins vs ${summary.lossTradesCount} losses`,
        icon: <Trophy className="w-5 h-5 text-amber-500" weight="bold" />,
        textColor: "text-slate-900",
        bgAccent: "bg-amber-50/50 border-amber-100",
      },
      {
        title: "Profit Factor",
        value: summary.profitFactor.toFixed(2) + "x",
        description: "Gross gains vs gross losses ratio",
        icon: <Scales className="w-5 h-5 text-slate-500" weight="bold" />,
        textColor: summary.profitFactor >= 2 ? "text-emerald-600" : summary.profitFactor >= 1 ? "text-slate-900" : "text-rose-600",
        bgAccent: "bg-slate-50 border-slate-200",
      },
      {
        title: "Avg Win / Loss",
        value: `+${Math.round(summary.avgWin).toLocaleString("en-IN")} / ${Math.round(summary.avgLoss).toLocaleString("en-IN")}`,
        description: "Per transaction average win vs loss",
        icon: <ChartBar className="w-5 h-5 text-slate-500" weight="bold" />,
        textColor: "text-slate-800",
        bgAccent: "bg-slate-50 border-slate-200",
      },
    ];
  } else {
    // DISCONNECTED LIVE ACCOUNT MODE (Honest, clean zero states)
    cards = [
      {
        title: "Live Open P&L (MTM)",
        value: "₹ --",
        description: "Connect Kite to stream live MTM",
        icon: <Plugs className="w-5 h-5 text-slate-400" weight="bold" />,
        textColor: "text-slate-400",
        bgAccent: "bg-slate-50 border-slate-200",
      },
      {
        title: "Today's Realized P&L",
        value: "₹ --",
        description: "Requires active Zerodha session",
        icon: <CurrencyInr className="w-5 h-5 text-slate-400" weight="bold" />,
        textColor: "text-slate-400",
        bgAccent: "bg-slate-50 border-slate-200",
      },
      {
        title: "Margin Capital",
        value: "Offline",
        description: "Sync with Kite for SPAN margin",
        icon: <ShieldCheck className="w-5 h-5 text-slate-400" weight="bold" />,
        textColor: "text-slate-400",
        bgAccent: "bg-slate-50 border-slate-200",
      },
      {
        title: "Open Positions",
        value: "0 Active",
        description: "Connect Kite to load contracts",
        icon: <ChartBar className="w-5 h-5 text-slate-400" weight="bold" />,
        textColor: "text-slate-400",
        bgAccent: "bg-slate-50 border-slate-200",
      },
    ];
  }

  return (
    <div className="space-y-4">
      {/* Disconnected Alert Banner */}
      {!isKiteConnected && !isDemoMode && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-3xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0">
              <Plugs className="w-5 h-5 text-amber-700" weight="bold" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase font-mono tracking-wider flex items-center gap-2">
                <span>Zerodha Kite Disconnected</span>
                <span className="text-[10px] bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  Daily Login Required
                </span>
              </h4>
              <p className="text-xs text-amber-800/90 mt-0.5 font-medium leading-relaxed">
                Your live positions, MTM, and margin safety require an active Zerodha session (tokens expire every morning at 6 AM). Connect your account to see your real-time portfolio.
              </p>
            </div>
          </div>
          {onConnectKite && (
            <button
              onClick={onConnectKite}
              className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold shadow-sm transition-all whitespace-nowrap flex items-center gap-1.5"
            >
              <span>Connect Zerodha Kite</span>
              <span>↗</span>
            </button>
          )}
        </div>
      )}

      {/* Demo Mode Alert Banner */}
      {isDemoMode && (
        <div className="bg-sky-50 border border-sky-200 rounded-3xl p-4 flex items-center gap-3 shadow-sm animate-fade-in">
          <Info className="w-5 h-5 text-sky-600 flex-shrink-0" weight="bold" />
          <p className="text-xs text-sky-800 font-mono">
            <strong>DEMO / SAMPLE MODE:</strong> Currently viewing mock demo data for layout preview. Switch to <strong>Live Kite Account</strong> in the top header to view your Zerodha portfolio.
          </p>
        </div>
      )}

      {/* Cards Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${cards.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-4`}>
        {cards.map((c, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <span className="text-slate-500 text-[10px] uppercase tracking-wider font-mono font-bold">
                {c.title}
              </span>
              <div className={`w-8 h-8 rounded-xl ${c.bgAccent} border flex items-center justify-center`}>
                {c.icon}
              </div>
            </div>
            <div className="mt-4">
              <div className={`text-2xl md:text-3xl font-mono font-bold tracking-tight ${c.textColor}`}>
                {c.value}
              </div>
              <p className="text-slate-500 text-[11px] mt-1 font-medium leading-normal">
                {c.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
