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

  if (trades.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono px-2">
          Closed Trades Log (0)
        </h3>
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm space-y-2">
          <p className="text-slate-600 text-xs font-mono font-medium">No closed trades recorded yet</p>
          <p className="text-slate-400 text-[11px] font-mono">
            Trades executed and squared off today in Zerodha Kite or uploaded via Excel will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-2">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-mono">
          Closed Trades Log ({filteredTrades.length})
        </h3>
        
        {/* Search/Filter Bar */}
        <div className="relative max-w-xs w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Funnel className="w-3.5 h-3.5 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Filter by Symbol..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-emerald-500 rounded-full focus:outline-none text-slate-900 placeholder-slate-400 transition-colors font-mono shadow-sm"
            value={filterSymbol}
            onChange={(e) => {
              setFilterSymbol(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wider font-semibold font-mono">
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
          <tbody className="divide-y divide-slate-100 text-xs font-mono">
            {paginatedTrades.map((trade, idx) => {
              const actualIndex = startIndex + idx + 1;
              const isProfit = trade.pnl >= 0;
              return (
                <tr
                  key={idx}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  <td className="py-3.5 px-6 text-slate-400">{actualIndex}</td>
                  <td className="py-3.5 px-6 text-slate-900 font-bold">
                    {trade.symbol}
                  </td>
                  <td className="py-3.5 px-6">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      trade.type === "Short" 
                        ? "bg-rose-50 text-rose-700 border border-rose-200" 
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right text-slate-600 font-medium">
                    {trade.quantity}
                  </td>
                  <td className="py-3.5 px-6 text-right text-slate-600">
                    Rs. {trade.buyPrice.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-6 text-right text-slate-600">
                    Rs. {trade.sellPrice.toFixed(2)}
                  </td>
                  <td className={`py-3.5 px-6 text-right font-bold ${isProfit ? "text-emerald-600" : "text-rose-600"}`}>
                    {isProfit ? "+" : ""}
                    {trade.pnl.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3.5 px-6 text-right text-slate-500 font-medium">
                    {trade.durationDays} {trade.durationDays === 1 ? "day" : "days"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-3">
        {paginatedTrades.map((trade, idx) => {
          const isProfit = trade.pnl >= 0;
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-slate-900 text-xs font-bold">{trade.symbol}</div>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                      trade.type === "Short" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}>
                      {trade.type}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Qty: {trade.quantity}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-mono font-bold ${isProfit ? "text-emerald-600" : "text-rose-600"}`}>
                    {isProfit ? "+" : ""}
                    {trade.pnl.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{trade.durationDays}d held</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 text-[10px] text-slate-600 font-mono">
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[8px]">Buy Price</span>
                  <span className="font-semibold">Rs. {trade.buyPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider text-[8px]">Sell Price</span>
                  <span className="font-semibold">Rs. {trade.sellPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-2 px-2">
          <span className="text-slate-500 text-xs font-mono">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 transition-colors shadow-sm"
            >
              <CaretLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-slate-900 disabled:opacity-40 transition-colors shadow-sm"
            >
              <CaretRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
