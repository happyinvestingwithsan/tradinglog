"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { RealizedTrade } from "@/lib/tradeEngine";

interface PerformanceChartProps {
  trades: RealizedTrade[];
}

export default function PerformanceChart({ trades }: PerformanceChartProps) {
  // Compute cumulative P&L chronologically
  const sorted = [...trades].sort(
    (a, b) => new Date(a.sellDate).getTime() - new Date(b.sellDate).getTime()
  );

  let cumulativePnl = 0;
  const chartData = sorted.map((t, idx) => {
    cumulativePnl += t.pnl;
    return {
      index: idx + 1,
      date: new Date(t.sellDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      pnl: cumulativePnl,
      tradePnl: t.pnl,
      symbol: t.symbol,
    };
  });

  // Prepend zero baseline
  const data = [{ index: 0, date: "Start", pnl: 0, tradePnl: 0, symbol: "" }, ...chartData];

  const minPnl = Math.min(...data.map((d) => d.pnl));
  const maxPnl = Math.max(...data.map((d) => d.pnl));
  const padding = (maxPnl - minPnl) * 0.1 || 1000;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.index === 0) return null;
      
      const isProfit = data.tradePnl >= 0;

      return (
        <div className="glass-panel rounded-2xl p-4 border border-white/10 text-xs backdrop-blur-xl">
          <p className="text-zinc-400 font-medium mb-1.5">{data.date}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-6">
              <span className="text-zinc-500">Asset:</span>
              <span className="font-mono text-zinc-300 font-medium">{data.symbol}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-zinc-500">Trade P&L:</span>
              <span className={`font-mono font-semibold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                {isProfit ? "+" : ""}
                {data.tradePnl.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                })}
              </span>
            </div>
            <div className="flex justify-between gap-6 border-t border-white/5 pt-1.5 mt-1.5">
              <span className="text-zinc-500">Cumulative P&L:</span>
              <span className="font-mono text-white font-semibold">
                {data.pnl.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                })}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[320px] md:h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <XAxis
            dataKey="date"
            stroke="#52525b"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          
          <YAxis
            stroke="#52525b"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => {
              if (Math.abs(v) >= 100000) return `${(v / 100000).toFixed(1)}L`;
              if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`;
              return v;
            }}
            dx={-10}
            domain={[minPnl - padding, maxPnl + padding]}
          />
          
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }} />
          
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
          
          <Area
            type="monotone"
            dataKey="pnl"
            stroke="#10b981"
            strokeWidth={1.5}
            fillOpacity={1}
            fill="url(#pnlGradient)"
            animationDuration={1500}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
