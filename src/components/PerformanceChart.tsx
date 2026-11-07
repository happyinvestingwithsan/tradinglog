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
  if (trades.length === 0) {
    return (
      <div className="h-[280px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
        <p className="text-xs font-semibold text-slate-600 font-mono">No closed trades recorded</p>
        <p className="text-[11px] text-slate-400 font-mono mt-1 max-w-sm">
          Equity curve will plot automatically when closed positions are synced from Kite or imported from Excel.
        </p>
      </div>
    );
  }

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
      const pointData = payload[0].payload;
      if (pointData.index === 0) return null;
      
      const isProfit = pointData.tradePnl >= 0;

      return (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xl text-xs font-mono">
          <p className="text-slate-500 font-semibold mb-1.5">{pointData.date}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-6">
              <span className="text-slate-500">Asset:</span>
              <span className="font-bold text-slate-800">{pointData.symbol}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-slate-500">Trade P&L:</span>
              <span className={`font-bold ${isProfit ? "text-emerald-600" : "text-rose-600"}`}>
                {isProfit ? "+" : ""}
                {pointData.tradePnl.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                })}
              </span>
            </div>
            <div className="flex justify-between gap-6 border-t border-slate-100 pt-1.5 mt-1.5">
              <span className="text-slate-500">Cumulative P&L:</span>
              <span className="font-bold text-slate-900">
                {pointData.pnl.toLocaleString("en-IN", {
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
              <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
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
          
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }} />
          
          <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
          
          <Area
            type="monotone"
            dataKey="pnl"
            stroke="#059669"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#pnlGradient)"
            animationDuration={1200}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
