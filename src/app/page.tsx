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
import OpportunityScanner from "@/components/OpportunityScanner";
import { fetchKiteDataAction, authenticateKiteAction } from "@/app/actions/kite";
import { 
  ChartLineUp, 
  FileXls, 
  PlugsConnected, 
  Plugs, 
  Warning, 
  ShieldCheck, 
  SignOut, 
  Target, 
  ArrowsClockwise, 
  Eye,
  CheckCircle
} from "@phosphor-icons/react";

export default function DashboardPage() {
  // Mode: "live" (honest Kite account) vs "demo" (sample test data)
  const [dataSourceMode, setDataSourceMode] = useState<"live" | "demo">("live");
  
  const [trades, setTrades] = useState<RawTrade[]>([]);
  const [kitePositions, setKitePositions] = useState<any[]>([]);
  const [kiteMargins, setKiteMargins] = useState<any>(null);
  const [kiteGttTriggers, setKiteGttTriggers] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<KiteSession | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"scanner" | "performance" | "config">("scanner");

  // Format sample mock trades
  const formattedMockTrades: RawTrade[] = useMemo(() => {
    return (initialTrades as any[]).map((t) => ({
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
  }, []);

  // When switching between Live and Demo mode
  useEffect(() => {
    if (dataSourceMode === "demo") {
      setTrades(formattedMockTrades);
    } else {
      // In live mode, trades come strictly from Kite or Excel
      setTrades([]);
      if (activeSession) {
        triggerAutoSync();
      }
    }
  }, [dataSourceMode]);

  // Load active session and check URL query params on mount
  useEffect(() => {
    // 1. Check for request_token in URL query param (redirect from Zerodha login)
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const reqToken = urlParams.get("request_token");
      const savedKey = localStorage.getItem("kite_api_key");
      const savedSecret = localStorage.getItem("kite_api_secret");

      if (reqToken && savedKey && savedSecret) {
        (async () => {
          setIsSyncing(true);
          const authRes = await authenticateKiteAction(savedKey, savedSecret, reqToken);
          if (authRes.success && authRes.session) {
            const sess = authRes.session;
            setActiveSession(sess);
            localStorage.setItem("kite_session", JSON.stringify(sess));
            // Clean redirect URL query parameters
            window.history.replaceState({}, document.title, window.location.pathname);
            // Fetch live portfolio immediately
            await syncKiteAccount(sess.apiKey, sess.accessToken);
          }
          setIsSyncing(false);
        })();
        return;
      }
    }

    // 2. Check for existing active session in localStorage
    const savedSessionStr = localStorage.getItem("kite_session");
    if (savedSessionStr) {
      try {
        const parsedSession = JSON.parse(savedSessionStr) as KiteSession;
        setActiveSession(parsedSession);
        syncKiteAccount(parsedSession.apiKey, parsedSession.accessToken);
      } catch (e) {
        console.error("Failed to restore Zerodha session:", e);
        localStorage.removeItem("kite_session");
      }
    }
  }, []);

  // Function to sync live positions, margins, and trades from Zerodha Kite
  const syncKiteAccount = async (apiKey: string, accessToken: string) => {
    setIsSyncing(true);
    try {
      const res = await fetchKiteDataAction(apiKey, accessToken);
      if (res.success) {
        setKitePositions(res.positions || []);
        setKiteMargins(res.margins || null);
        setKiteGttTriggers(res.gttTriggers || []);
        if (res.trades && res.trades.length > 0) {
          setTrades(res.trades);
        }
      } else {
        if (res.isTokenExpired) {
          localStorage.removeItem("kite_session");
          setActiveSession(null);
          setKitePositions([]);
          setKiteMargins(null);
        }
      }
    } catch (e) {
      console.error("Kite sync failed:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Run the FIFO engine on current trades list
  const { realizedTrades, openPositions, summary } = useMemo(() => {
    return runFifoMatching(trades);
  }, [trades]);

  // Handle excel uploads
  const handleExcelDataLoaded = (uploadedTrades: RawTrade[]) => {
    setDataSourceMode("live");
    setTrades(uploadedTrades);
    setKiteMargins(null);
    setKitePositions([]);
    setKiteGttTriggers([]);
    setActiveTab("performance");
  };

  // Handle live data fetches from Kite
  const handleKiteDataFetched = (liveTrades: RawTrade[], livePositions: any[], liveMargins: any, liveGttTriggers: any[]) => {
    setDataSourceMode("live");
    setKitePositions(livePositions);
    setKiteMargins(liveMargins);
    setKiteGttTriggers(liveGttTriggers);
    if (liveTrades && liveTrades.length > 0) {
      setTrades(liveTrades);
    }
    setActiveTab("performance");
  };

  // Trigger a full background sync from local storage session
  const triggerAutoSync = async () => {
    const savedSessionStr = localStorage.getItem("kite_session");
    if (savedSessionStr) {
      try {
        const parsedSession = JSON.parse(savedSessionStr) as KiteSession;
        await syncKiteAccount(parsedSession.apiKey, parsedSession.accessToken);
      } catch (e) {
        console.error("Auto sync refresh failed:", e);
      }
    }
  };

  // Active Display Positions:
  // In LIVE mode: exclusively shows live non-zero Kite positions. Never falls back to mock trades!
  // In DEMO mode: shows open positions from mock tradebook.
  const displayPositions = useMemo(() => {
    if (dataSourceMode === "demo") {
      return openPositions;
    }

    // LIVE MODE:
    if (activeSession && kitePositions && kitePositions.length > 0) {
      const activeKite = kitePositions.filter((kp: any) => kp.quantity !== 0);
      return activeKite.map((kp: any) => {
        const isShort = kp.quantity < 0;
        const qty = Math.abs(kp.quantity);
        const avg = Number(kp.average_price) || 0;
        const ltp = Number(kp.last_price) || avg;
        return {
          symbol: kp.tradingsymbol,
          type: (isShort ? "Short" : "Long") as "Short" | "Long",
          quantity: qty,
          entryPrice: avg,
          totalValue: avg * qty,
          lastPrice: ltp,
          pnl: Number(kp.pnl) || (isShort ? (avg - ltp) * qty : (ltp - avg) * qty),
          m2m: Number(kp.m2m) || 0,
          unrealised: Number(kp.unrealised) || 0,
          lots: [{ quantity: qty, price: avg, date: new Date() }],
          isKiteLive: true,
        };
      });
    }

    // Disconnected or 0 open positions in Kite -> strictly empty array
    return [];
  }, [dataSourceMode, activeSession, kitePositions, openPositions]);

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] text-[#0f172a] relative overflow-hidden flex flex-col font-sans select-none">
      
      {/* Background Ambient Subtle Tints */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none z-0"></div>

      {/* Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-slate-200/80 relative z-10 bg-white/70 backdrop-blur-md">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div>
            <h1 className="text-xl font-bold tracking-tighter uppercase text-slate-900 flex items-center gap-2">
              <span>FNO Journal</span>
              <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono px-2 py-0.5 rounded-full font-semibold tracking-normal">
                v1.0
              </span>
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">Tactical derivative positions & live scanner</p>
          </div>

          {/* Mode Switcher on mobile */}
          <div className="flex sm:hidden items-center bg-slate-100 p-1 rounded-full border border-slate-200 text-[10px] font-mono">
            <button
              onClick={() => setDataSourceMode("live")}
              className={`px-2.5 py-1 rounded-full transition-all ${
                dataSourceMode === "live" ? "bg-white text-emerald-800 font-bold shadow-sm" : "text-slate-500"
              }`}
            >
              Live
            </button>
            <button
              onClick={() => setDataSourceMode("demo")}
              className={`px-2.5 py-1 rounded-full transition-all ${
                dataSourceMode === "demo" ? "bg-amber-100 text-amber-900 font-bold shadow-sm" : "text-slate-500"
              }`}
            >
              Demo
            </button>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {/* View Tab Buttons */}
          <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-full text-xs font-mono">
            <button
              onClick={() => setActiveTab("scanner")}
              className={`px-3 sm:px-4 py-1.5 rounded-full transition-all duration-300 flex items-center gap-1.5 ${
                activeTab === "scanner" 
                  ? "bg-emerald-600 text-white shadow-sm font-bold" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Best Bets</span>
            </button>
            <button
              onClick={() => setActiveTab("performance")}
              className={`px-3 sm:px-4 py-1.5 rounded-full transition-all duration-300 ${
                activeTab === "performance" 
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200 font-bold" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`px-3 sm:px-4 py-1.5 rounded-full transition-all duration-300 ${
                activeTab === "config" 
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200 font-bold" 
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Connections
            </button>
          </div>

          {/* Desktop Mode Toggle */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-full border border-slate-200 text-xs font-mono">
            <button
              onClick={() => setDataSourceMode("live")}
              className={`px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
                dataSourceMode === "live" 
                  ? "bg-white text-emerald-700 shadow-sm font-bold border border-emerald-200/50" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeSession ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
              <span>Live Kite</span>
            </button>
            <button
              onClick={() => setDataSourceMode("demo")}
              className={`px-3 py-1 rounded-full transition-all flex items-center gap-1.5 ${
                dataSourceMode === "demo" 
                  ? "bg-amber-100 text-amber-900 shadow-sm font-bold border border-amber-300" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Demo Data</span>
            </button>
          </div>

          {/* Quick Refresh Button when Kite is connected */}
          {activeSession && (
            <button
              onClick={triggerAutoSync}
              disabled={isSyncing}
              title="Refresh Live Kite Positions & P&L"
              className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:border-emerald-300 text-xs font-mono font-semibold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <ArrowsClockwise className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-emerald-600" : ""}`} />
              <span className="hidden md:inline">Sync Live</span>
            </button>
          )}

          {/* Sign Out */}
          <a
            href="/api/auth/logout"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-rose-300 bg-white text-slate-600 hover:text-rose-600 shadow-sm transition-all text-xs font-mono font-semibold"
          >
            <SignOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 relative z-10">
        
        {activeTab === "config" ? (
          // CONNECTIONS & DATA IMPORT VIEW
          <section className="space-y-12 animate-fade-in max-w-3xl mx-auto py-4">
            <div className="space-y-3">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 leading-none">
                Data Connections
              </h2>
              <p className="text-slate-500 text-sm max-w-[65ch] leading-relaxed font-mono">
                Connect your Zerodha Kite account to stream live positions, real-time MTM, and margin metrics, or import a tradebook spreadsheet.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {/* Kite Integration */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1 text-slate-500 text-xs uppercase tracking-widest font-semibold font-mono">
                  <PlugsConnected className="w-4 h-4 text-emerald-600" />
                  <span>Kite Connect API Integration</span>
                </div>
                <KiteConnector 
                  onDataFetched={handleKiteDataFetched} 
                  onSessionActive={setActiveSession} 
                />
              </div>

              {/* Excel Spreadsheet Import */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1 text-slate-500 text-xs uppercase tracking-widest font-semibold font-mono">
                  <FileXls className="w-4 h-4 text-emerald-600" />
                  <span>Spreadsheet Export Upload</span>
                </div>
                <ExcelUploader onDataLoaded={handleExcelDataLoaded} />
              </div>
            </div>
          </section>
        ) : activeTab === "scanner" ? (
          // AI OPPORTUNITY SCANNER VIEW
          <section className="space-y-8 animate-fade-in">
            <OpportunityScanner 
              onOpenGtt={(symbol, qty, ltp) => {
                setActiveTab("performance");
              }} 
            />
          </section>
        ) : (
          // PERFORMANCE DASHBOARD VIEW
          <section className="space-y-8 animate-fade-in">
            
            {/* Top Metrics Grid */}
            <MetricsGrid 
              summary={summary} 
              kitePositions={kitePositions} 
              kiteMargins={kiteMargins}
              isKiteConnected={activeSession !== null}
              isDemoMode={dataSourceMode === "demo"}
              onConnectKite={() => setActiveTab("config")}
            />

            {/* Asymmetrical Bento layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Equity curve */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-xs uppercase tracking-widest font-bold text-slate-700 flex items-center gap-2 font-mono">
                    <ChartLineUp className="w-4 h-4 text-emerald-600" />
                    <span>Realized Equity Curve</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono font-medium">
                    Cumulative Closed P&L
                  </span>
                </div>
                <PerformanceChart trades={realizedTrades} />
              </div>

              {/* Right Column: Margin & Risk Safety */}
              <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm flex flex-col justify-between">
                {kiteMargins ? (
                  // Live margins view
                  <div className="space-y-5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h4 className="text-xs uppercase tracking-widest font-bold text-slate-700 font-mono">Margin & Risk Safety</h4>
                      <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                        Kite Active
                      </span>
                    </div>

                    <div className="space-y-3 font-mono text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">Cash Balance</span>
                        <span className="text-slate-900 font-bold">Rs. {kiteMargins.availableCash.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">Pledged Collateral</span>
                        <span className="text-slate-900 font-bold">Rs. {kiteMargins.collateral.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">Total Margin Available</span>
                        <span className="text-slate-900 font-bold">Rs. {kiteMargins.net.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-500">Margin Utilised</span>
                        <span className={`font-bold ${kiteMargins.utilised > 0 ? "text-emerald-600" : "text-slate-900"}`}>
                          Rs. {kiteMargins.utilised.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-500 font-semibold">Free Margin Remaining</span>
                        <span className="text-emerald-600 font-bold text-sm">
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
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-2.5 items-start">
                          <Warning className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-rose-700 text-[10px] font-bold uppercase tracking-wider font-mono">Cash Deficit Warning</p>
                            <p className="text-slate-600 text-[10px] leading-relaxed">
                              Pledges exceed 50% of utilized margin. Interest (18% p.a.) is charging on a shortfall of <strong className="text-rose-700 font-mono">Rs. {Math.round(shortfall).toLocaleString("en-IN")}</strong>.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-2.5 items-start">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="text-emerald-800 text-[10px] font-bold uppercase tracking-wider font-mono">Cash Balance Healthy</p>
                            <p className="text-slate-600 text-[10px] leading-relaxed font-medium">
                              Satisfies the 50:50 NSE margin rule. No interest penalties active.
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Max position capability */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1 font-mono">Lot Capacity</span>
                      <div className="font-mono text-slate-900 text-sm font-bold">
                        +{Math.floor(Math.max(0, kiteMargins.net - kiteMargins.utilised) / 160000)} additional lots
                      </div>
                      <p className="text-slate-400 text-[9px] mt-1 font-mono">Based on ~1.6L margin per lot.</p>
                    </div>
                  </div>
                ) : (
                  // Disconnected fallback view
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase tracking-widest font-bold text-slate-700 font-mono">SPAN Margin Safety</h4>
                    <div className="space-y-3 font-mono">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-500 text-xs">Total Margin Capital</span>
                        <span className="text-slate-400 text-xs font-semibold">Offline</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-500 text-xs">Active Exposure</span>
                        <span className="text-slate-400 text-xs font-semibold">
                          Rs. {displayPositions.reduce((s, p) => s + p.totalValue, 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-slate-500 text-xs">Account Status</span>
                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                          <span>Not Synced</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-4 text-slate-500 text-xs font-mono leading-relaxed">
                      Margin sync offline. Connect Zerodha Kite in the Connections tab to stream real-time SPAN margins and cash-to-collateral ratios.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Positions Table */}
            <div className="pt-2">
              <PositionsList 
                positions={displayPositions} 
                gttTriggers={kiteGttTriggers} 
                kitePositions={kitePositions}
                isKiteConnected={activeSession !== null}
                onRefresh={triggerAutoSync}
                onConnectKite={() => setActiveTab("config")}
              />
            </div>

            {/* Realized Trades Log */}
            <div className="pt-6 border-t border-slate-200/80">
              <TradesTable trades={realizedTrades} />
            </div>

          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-500 font-mono relative z-10">
        <span>© 2026 FNO Journal. Hemant Jain Mentorship Engine.</span>
        <div className="flex gap-4">
          <span className="hover:text-slate-800 transition-colors">F&O Slicer Ready</span>
          <span className="hover:text-slate-800 transition-colors">Light Theme Active</span>
          <span className="hover:text-slate-800 transition-colors">
            {activeSession ? "🟢 Kite Synced" : "⚪ Kite Disconnected"}
          </span>
        </div>
      </footer>
    </div>
  );
}
