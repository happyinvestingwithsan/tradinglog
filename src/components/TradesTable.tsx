"use client";

import React, { useState } from "react";
import { RealizedTrade } from "@/lib/tradeEngine";
import { Funnel, CaretLeft, CaretRight } from "@phosphor-icons/react";

interface TradesTableProps {
  trades: RealizedTrade[];
}

export default function TradesTable({ trades }: TradesTableProps) {
  const [filterSymbol, setFilterSymbol] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter trades
  const filteredTrades = trades.filter((t) =>
    t.symbol.toLowerCase().includes(filterSymbol.toLowerCase())
  );

  // Chronological sort: newest closed trades first
  const sortedTrades = [...filteredTrades].sort(
    (a, b) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime()
  );

  // Pagination
  const totalPages = Math.ceil(sortedTrades.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTrades = sortedTrades.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-2">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-widest">
          Closed Trades Log ({filteredTrades.length})
        </h3>
        
        {/* Search/Filter Bar */}
        <div className="relative max-w-xs w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Funnel className="w-3.5 h-3.5 text-zinc-500" />
          </span>
          <input
            type="text"
            placeholder="Filter by Symbol..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-zinc-900/40 border border-white/5 hover:border-white/15 focus:border-emerald-500/50 rounded-full focus:outline-none text-zinc-300 placeholder-zinc-500 transition-colors font-mono"
            value={filterSymbol}
            onChange={(e) => {
              setFilterSymbol(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-zinc-900/20 border border-white/5 rounded-3xl overflow-hidden shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-zinc-950/40 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              <th className="py-4 px-6">#</th>
              <th className="py-4 px-6">Symbol</th>
              <th className="py-4 px-6">Type</th>
              <th className="py-4 px-6 text-right">Qty</th>
              <th className="py-4 px-6 text-right">Buy Price</th>
              <th className="py-4 px-6 text-right">Sell Price</th>
              <th className="py-4 px-6 text-right">P&L</th>
              <th className="py-4 px-6 text-right">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02] text-xs font-mono">
            {paginatedTrades.map((trade, idx) => {
              const actualIndex = startIndex + idx + 1;
              const isProfit = trade.pnl >= 0;
              return (
                <tr
                  key={idx}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="py-3.5 px-6 text-zinc-600">{actualIndex}</td>
                  <td className="py-3.5 px-6 text-white font-semibold">
                    {trade.symbol}
                  </td>
                  <td className="py-3.5 px-6">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      trade.type === "Short" 
                        ? "bg-rose-950/20 text-rose-400 border border-rose-900/20" 
                        : "bg-emerald-950/20 text-emerald-400 border border-emerald-900/20"
                    }`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right text-zinc-400">
                    {trade.quantity}
                  </td>
                  <td className="py-3.5 px-6 text-right text-zinc-400">
                    Rs. {trade.buyPrice.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-6 text-right text-zinc-400">
                    Rs. {trade.sellPrice.toFixed(2)}
                  </td>
                  <td className={`py-3.5 px-6 text-right font-bold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                    {isProfit ? "+" : ""}
                    {trade.pnl.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3.5 px-6 text-right text-zinc-500">
                    {trade.durationDays} {trade.durationDays === 1 ? "day" : "days"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-4">
        {paginatedTrades.map((trade, idx) => {
          const isProfit = trade.pnl >= 0;
          return (
            <div
              key={idx}
              className="bg-zinc-900/30 border border-white/5 rounded-2xl p-4 space-y-3 shadow-md"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-white text-xs font-semibold">{trade.symbol}</div>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                      trade.type === "Short" ? "bg-rose-950/30 text-rose-400" : "bg-emerald-950/30 text-emerald-400"
                    }`}>
                      {trade.type}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">Qty: {trade.quantity}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-mono font-bold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                    {isProfit ? "+" : ""}
                    {trade.pnl.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{trade.durationDays}d held</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-white/5 text-[10px] text-zinc-400 font-mono">
                <div>
                  <span className="text-zinc-600 block uppercase tracking-wider text-[8px]">Buy Price</span>
                  <span>Rs. {trade.buyPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-zinc-600 block uppercase tracking-wider text-[8px]">Sell Price</span>
                  <span>Rs. {trade.sellPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-2 px-2">
          <span className="text-zinc-500 text-xs font-mono">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-full border border-white/5 bg-zinc-900/30 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
            >
              <CaretLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-full border border-white/5 bg-zinc-900/30 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 transition-colors"
            >
              <CaretRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
