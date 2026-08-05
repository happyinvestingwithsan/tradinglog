"use client";

import React from "react";
import { TradeSummary } from "@/lib/tradeEngine";
import { TrendUp, TrendDown, Trophy, ChartBar, Percent, Scales } from "@phosphor-icons/react";

interface MetricsGridProps {
  summary: TradeSummary;
}

export default function MetricsGrid({ summary }: MetricsGridProps) {
  const isPnlPositive = summary.totalRealizedPnl >= 0;

  const cards = [
    {
      title: "Realized P&L",
      value: summary.totalRealizedPnl.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
      }),
      description: "Net realized profits after matching buy/sell lots",
      icon: isPnlPositive ? (
        <TrendUp className="w-5 h-5 text-emerald-400" weight="light" />
      ) : (
        <TrendDown className="w-5 h-5 text-rose-400" weight="light" />
      ),
      textColor: isPnlPositive ? "text-emerald-400" : "text-rose-400",
      glowColor: isPnlPositive ? "rgba(16, 185, 129, 0.05)" : "rgba(244, 63, 94, 0.05)",
    },
    {
      title: "Win Rate",
      value: (summary.winRatio * 100).toFixed(1) + "%",
      description: `${summary.winTradesCount} wins vs ${summary.lossTradesCount} losses`,
      icon: <Trophy className="w-5 h-5 text-emerald-400" weight="light" />,
      textColor: "text-white",
      glowColor: "rgba(16, 185, 129, 0.03)",
    },
    {
      title: "Profit Factor",
      value: summary.profitFactor.toFixed(2) + "x",
      description: "Ratio of gross winning trades to gross losing trades",
      icon: <Scales className="w-5 h-5 text-zinc-400" weight="light" />,
      textColor: summary.profitFactor >= 2 ? "text-emerald-400" : summary.profitFactor >= 1 ? "text-zinc-300" : "text-rose-400",
      glowColor: "rgba(255, 255, 255, 0.01)",
    },
    {
      title: "Avg Win / Loss",
      value: `+${Math.round(summary.avgWin).toLocaleString("en-IN")} / ${Math.round(summary.avgLoss).toLocaleString("en-IN")}`,
      description: "Average profit per winning vs losing transaction",
      icon: <ChartBar className="w-5 h-5 text-zinc-400" weight="light" />,
      textColor: "text-zinc-300",
      glowColor: "rgba(255, 255, 255, 0.01)",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((c, i) => (
        <div
          key={i}
          className="bg-zinc-900/30 border border-white/5 rounded-[2rem] p-1.5 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-white/10 group"
          style={{
            boxShadow: `0 10px 40px -15px rgba(0,0,0,0.8), inset 0 0 20px ${c.glowColor}`,
          }}
        >
          <div className="bg-zinc-950/80 rounded-[calc(2rem-0.375rem)] p-6 min-h-[140px] flex flex-col justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            <div className="flex justify-between items-start">
              <span className="text-zinc-500 text-xs uppercase tracking-widest font-medium">
                {c.title}
              </span>
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105">
                {c.icon}
              </div>
            </div>
            <div className="mt-4">
              <div className={`text-2xl md:text-3xl font-mono font-semibold tracking-tight ${c.textColor}`}>
                {c.value}
              </div>
              <p className="text-zinc-500 text-[11px] mt-1 leading-normal">
                {c.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
