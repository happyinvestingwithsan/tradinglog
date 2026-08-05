"use client";

import React, { useState, useEffect, useMemo } from "react";
import initialTrades from "@/lib/initialData.json";
import { runFifoMatching, RawTrade } from "@/lib/tradeEngine";
import { KiteSession } from "@/lib/kite";
import PerformanceChart from "@/components/PerformanceChart";
import MetricsGrid from "@/components/MetricsGrid";
import PositionsList from "@/components/PositionsList";
import TradesTable from "@/components/TradesTable";
import ExcelUploader from "@/components/ExcelUploader";
import KiteConnector from "@/components/KiteConnector";
import { fetchKiteDataAction } from "@/app/actions/kite";
import { ChartLineUp, FileXls, PlugsConnected, Plugs, Warning, ShieldCheck, SignOut } from "@phosphor-icons/react";

export default function DashboardPage() {
  const [trades, setTrades] = useState<RawTrade[]>([]);
  const [kitePositions, setKitePositions] = useState<any[]>([]);
  const [kiteMargins, setKiteMargins] = useState<any>(null);
  const [kiteGttTriggers, setKiteGttTriggers] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<KiteSession | null>(null);
  const [activeTab, setActiveTab] = useState<"performance" | "config">("performance");

  // Load initial data on mount
  useEffect(() => {
    // Cast initial JSON data to RawTrade format
    const formattedInitial = (initialTrades as any[]).map((t) => ({
      symbol: t.symbol,
      tradeDate: t.tradeDate,
      tradeType: t.tradeType as "buy" | "sell",
      quantity: Number(t.quantity),
      price: Number(t.price),
      tradeId: t.tradeId,
      orderId: t.orderId,
      executionTime: t.executionTime,
      expiryDate: t.expiryDate,
    }));
    setTrades(formattedInitial);

    // Auto-fetch if active Kite session exists in localStorage
    const savedSessionStr = localStorage.getItem("kite_session");
    if (savedSessionStr) {
      try {
        const parsedSession = JSON.parse(savedSessionStr) as KiteSession;
        setActiveSession(parsedSession);
        
        const autoSync = async () => {
          const res = await fetchKiteDataAction(parsedSession.apiKey, parsedSession.accessToken);
          if (res.success) {
            setKitePositions(res.positions || []);
            setKiteMargins(res.margins || null);
            setKiteGttTriggers(res.gttTriggers || []);
            
            if (res.trades && res.trades.length > 0) {
              setTrades((prevTrades) => {
                const tradeMap = new Map<string, RawTrade>();
                prevTrades.forEach((t) => { if (t.tradeId) tradeMap.set(t.tradeId, t); });
                res.trades.forEach((t) => { if (t.tradeId) tradeMap.set(t.tradeId, t); });
                return Array.from(tradeMap.values());
              });
            }
          }
        };
        autoSync();
      } catch (e) {
        console.error("Failed to restore Zerodha session:", e);
      }
    }
  }, []);

  // Run the FIFO engine on current trades list
  const { realizedTrades, openPositions, summary } = useMemo(() => {
    return runFifoMatching(trades);
  }, [trades]);

  // Handle excel uploads
  const handleExcelDataLoaded = (uploadedTrades: RawTrade[]) => {
    setTrades(uploadedTrades);
    setKiteMargins(null);
    setKitePositions([]);
    setKiteGttTriggers([]);
    setActiveTab("performance");
  };

  // Handle live data fetches from Kite
  const handleKiteDataFetched = (liveTrades: RawTrade[], livePositions: any[], liveMargins: any, liveGttTriggers: any[]) => {
    setKitePositions(livePositions);
    setKiteMargins(liveMargins);
    setKiteGttTriggers(liveGttTriggers);
    
    if (liveTrades.length > 0) {
      setTrades((prevTrades) => {
        // Merge trades without duplicates by tradeId
        const tradeMap = new Map<string, RawTrade>();
        // Add existing trades
        prevTrades.forEach((t) => {
          if (t.tradeId) tradeMap.set(t.tradeId, t);
        });
        // Add/Overwrite with live trades
        liveTrades.forEach((t) => {
          if (t.tradeId) tradeMap.set(t.tradeId, t);
        });
        
        return Array.from(tradeMap.values());
      });
    }
    
    setActiveTab("performance");
  };

  // Trigger a full background sync from local storage session
  const triggerAutoSync = async () => {
    const savedSessionStr = localStorage.getItem("kite_session");
    if (savedSessionStr) {
      try {
        const parsedSession = JSON.parse(savedSessionStr) as KiteSession;
        const res = await fetchKiteDataAction(parsedSession.apiKey, parsedSession.accessToken);
        if (res.success) {
          setKitePositions(res.positions || []);
          setKiteMargins(res.margins || null);
          setKiteGttTriggers(res.gttTriggers || []);
          
          if (res.trades && res.trades.length > 0) {
            setTrades((prevTrades) => {
              const tradeMap = new Map<string, RawTrade>();
              prevTrades.forEach((t) => { if (t.tradeId) tradeMap.set(t.tradeId, t); });
              res.trades.forEach((t) => { if (t.tradeId) tradeMap.set(t.tradeId, t); });
              return Array.from(tradeMap.values());
            });
          }
        }
      } catch (e) {
        console.error("Auto sync refresh failed:", e);
      }
    }
  };

  // We always use the detailed FIFO-matched open positions computed from the merged trades list
  const displayPositions = openPositions;

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-[#fafafa] relative overflow-hidden flex flex-col font-sans select-none">
      
      {/* Background Ambient Mesh Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#10b981]/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#f43f5e]/3 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6 flex justify-between items-center border-b border-white/5 relative z-10">
        <div>
          <h1 className="text-xl font-bold tracking-tighter uppercase text-white flex items-center gap-2">
            <span>FNO Journal</span>
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono px-2 py-0.5 rounded-full font-medium tracking-normal">
              v1.0
            </span>
          </h1>
          <p className="text-zinc-500 text-xs mt-1">Tactical derivative positions & logs</p>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-950 border border-white/5 p-1 rounded-full text-xs font-mono">
            <button
              onClick={() => setActiveTab("performance")}
              className={`px-4 py-1.5 rounded-full transition-all duration-300 ${
                activeTab === "performance" ? "bg-white/5 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`px-4 py-1.5 rounded-full transition-all duration-300 ${
                activeTab === "config" ? "bg-white/5 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Connections
            </button>
          </div>

          <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-mono font-medium ${
            activeSession 
              ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30" 
              : "bg-zinc-950 text-zinc-500 border-white/5"
          }`}>
            {activeSession ? (
              <>
                <PlugsConnected className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kite Live</span>
              </>
            ) : (
              <>
                <Plugs className="w-3.5 h-3.5" />
                <span>Local Book</span>
              </>
            )}
          </div>

          <a
            href="/api/auth/logout"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/5 hover:border-rose-900/30 bg-zinc-950 text-zinc-500 hover:text-rose-400 transition-all text-[10px] font-mono font-medium"
          >
            <SignOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-12 relative z-10">
        
        {activeTab === "config" ? (
          // CONNECTIONS & DATA IMPORT VIEW
          <section className="space-y-12 animate-fade-in max-w-3xl mx-auto py-6">
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-none">
                Data Connections
              </h2>
              <p className="text-zinc-400 text-sm max-w-[65ch] leading-relaxed">
                Connect your Zerodha Kite account to fetch live trades and open positions automatically, or drop in a tradebook spreadsheet exported from the Console.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {/* Kite Integration */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1 text-zinc-400 text-xs uppercase tracking-widest font-semibold">
                  <PlugsConnected className="w-4 h-4 text-emerald-400" />
                  <span>Kite Connect API Integration</span>
                </div>
                <KiteConnector 
                  onDataFetched={handleKiteDataFetched} 
                  onSessionActive={setActiveSession} 
                />
              </div>

              {/* Excel Spreadsheet Import */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1 text-zinc-400 text-xs uppercase tracking-widest font-semibold">
                  <FileXls className="w-4 h-4 text-emerald-400" />
                  <span>Spreadsheet Export Upload</span>
                </div>
                <ExcelUploader onDataLoaded={handleExcelDataLoaded} />
              </div>
            </div>
          </section>
        ) : (
          // PERFORMANCE DASHBOARD VIEW
          <section className="space-y-12 animate-fade-in">
            {/* Top Metrics Grid */}
            <MetricsGrid summary={summary} />

            {/* Asymmetrical Bento layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Equity curve */}
              <div className="lg:col-span-2 bg-zinc-900/30 border border-white/5 rounded-[2rem] p-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
                <div className="bg-zinc-950/80 rounded-[calc(2rem-0.375rem)] p-6 md:p-8 space-y-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs uppercase tracking-widest font-semibold text-zinc-400 flex items-center gap-2">
                      <ChartLineUp className="w-4 h-4 text-emerald-400" />
                      <span>Realized Equity Curve</span>
                    </h3>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Cumulative P&L
                    </span>
                  </div>
                  <PerformanceChart trades={realizedTrades} />
                </div>
              </div>

              {/* Right Column: Positions Summary (Bento block) */}
              <div className="lg:col-span-1 bg-zinc-900/30 border border-white/5 rounded-[2rem] p-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] h-full">
                <div className="bg-zinc-950/80 rounded-[calc(2rem-0.375rem)] p-6 md:p-8 h-full flex flex-col justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                  {kiteMargins ? (
                    // Live margins view
                    <div className="space-y-5">
                      <h4 className="text-xs uppercase tracking-widest font-semibold text-zinc-400">Margin & Risk Safety</h4>
                      <div className="space-y-3.5 font-mono text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-white/5">
                          <span className="text-zinc-500">Cash Balance</span>
                          <span className="text-white font-semibold">Rs. {kiteMargins.availableCash.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-white/5">
                          <span className="text-zinc-500">Pledged Collateral</span>
                          <span className="text-white font-semibold">Rs. {kiteMargins.collateral.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-white/5">
                          <span className="text-zinc-500">Total Margin Available</span>
                          <span className="text-white font-semibold">Rs. {kiteMargins.net.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-white/5">
                          <span className="text-zinc-500">Margin Utilised</span>
                          <span className={`font-semibold ${kiteMargins.utilised > 0 ? "text-emerald-400" : "text-white"}`}>
                            Rs. {kiteMargins.utilised.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-zinc-500">Available Free Margin</span>
                          <span className="text-emerald-400 font-semibold">
                            Rs. {Math.max(0, kiteMargins.net - kiteMargins.utilised).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      {/* Cash-to-Collateral health alerts */}
                      {kiteMargins.utilised > 0 && (() => {
                        const requiredCash = kiteMargins.utilised * 0.5;
                        const isShortfall = kiteMargins.availableCash < requiredCash;
                        const shortfall = requiredCash - kiteMargins.availableCash;

                        return isShortfall ? (
                          <div className="bg-rose-950/20 border border-rose-900/30 rounded-2xl p-4 flex gap-2.5 items-start">
                            <Warning className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-rose-400 text-[10px] font-semibold uppercase tracking-wider">Cash Deficit Warning</p>
                              <p className="text-zinc-400 text-[10px] leading-relaxed">
                                Pledges exceed 50% of utilized margin. Interest (18% p.a.) is charging on a shortfall of <strong className="text-rose-300 font-mono">Rs. {Math.round(shortfall).toLocaleString("en-IN")}</strong>.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-emerald-950/15 border border-emerald-900/25 rounded-2xl p-4 flex gap-2.5 items-start">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wider">Cash Balance Healthy</p>
                              <p className="text-zinc-500 text-[10px] leading-relaxed font-medium">
                                Cash balance satisfies the 50:50 NSE margin rule. No interest penalties are currently active.
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Max position capability */}
                      <div className="bg-zinc-950/50 rounded-2xl p-4 border border-white/5">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold block mb-1">Lot Writing Capacity</span>
                        <div className="font-mono text-zinc-300 text-xs font-semibold">
                          +{Math.floor(Math.max(0, kiteMargins.net - kiteMargins.utilised) / 160000)} additional lots
                        </div>
                        <p className="text-zinc-500 text-[9px] mt-1">Based on SPAN requirement of Rs. 1.6 Lakhs per lot.</p>
                      </div>
                    </div>
                  ) : (
                    // Default fallback view
                    <>
                      <div className="space-y-4">
                        <h4 className="text-xs uppercase tracking-widest font-semibold text-zinc-400">Position Summary</h4>
                        <div className="space-y-3 font-mono">
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-zinc-500 text-xs">Total Margin Capital</span>
                            <span className="text-zinc-300 text-xs font-semibold">Rs. 10,00,000</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-zinc-500 text-xs">Active Exposures</span>
                            <span className="text-zinc-300 text-xs font-semibold">
                              Rs. {displayPositions.reduce((s, p) => s + p.totalValue, 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-zinc-500 text-xs">Account Status</span>
                            <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Healthy</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-4 mt-6 text-zinc-500 text-xs leading-relaxed">
                        Margin sync offline. Connect your Zerodha Kite account in the **Connections** tab to display live SPAN margins, cash-collateral breakdowns, and position capabilities.
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Positions Table */}
            <div className="pt-4">
              <PositionsList 
                positions={displayPositions} 
                gttTriggers={kiteGttTriggers} 
                kitePositions={kitePositions}
                onRefresh={triggerAutoSync}
              />
            </div>

            {/* Realized Trades Log */}
            <div className="pt-4 border-t border-white/5">
              <TradesTable trades={realizedTrades} />
            </div>

          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-zinc-600 font-mono relative z-10">
        <span>© 2026 FNO Journal. Decoupled Architecture.</span>
        <div className="flex gap-4">
          <span className="hover:text-zinc-400 transition-colors">Vercel Edge Ready</span>
          <span className="hover:text-zinc-400 transition-colors">Client-side Encryption</span>
        </div>
      </footer>
    </div>
  );
}
