"use client";

import React, { useState, useEffect } from "react";
import { authenticateKiteAction, fetchKiteDataAction } from "@/app/actions/kite";
import { KiteSession } from "@/lib/kite";
import { RawTrade } from "@/lib/tradeEngine";
import { Key, Swap, ShieldCheck, SpinnerGap, Plugs, Info } from "@phosphor-icons/react";

interface KiteConnectorProps {
  onDataFetched: (trades: RawTrade[], positions: any[], margins: any, gttTriggers: any[]) => void;
  onSessionActive: (session: KiteSession | null) => void;
}

export default function KiteConnector({ onDataFetched, onSessionActive }: KiteConnectorProps) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [requestToken, setRequestToken] = useState("");
  
  const [session, setSession] = useState<KiteSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load saved credentials from LocalStorage
  useEffect(() => {
    const savedKey = localStorage.getItem("kite_api_key") || "";
    const savedSecret = localStorage.getItem("kite_api_secret") || "";
    const savedSessionStr = localStorage.getItem("kite_session");
    
    setApiKey(savedKey);
    setApiSecret(savedSecret);

    if (savedSessionStr) {
      try {
        const parsedSession = JSON.parse(savedSessionStr) as KiteSession;
        setSession(parsedSession);
        onSessionActive(parsedSession);
        // Proactively fetch fresh positions & today's trades
        syncKiteData(parsedSession.apiKey, parsedSession.accessToken);
      } catch (e) {
        localStorage.removeItem("kite_session");
      }
    }
  }, []);

  const handleSaveCredentials = () => {
    localStorage.setItem("kite_api_key", apiKey);
    localStorage.setItem("kite_api_secret", apiSecret);
    setSuccess("Credentials saved locally in your browser.");
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleClearCredentials = () => {
    localStorage.removeItem("kite_api_key");
    localStorage.removeItem("kite_api_secret");
    localStorage.removeItem("kite_session");
    setApiKey("");
    setApiSecret("");
    setRequestToken("");
    setSession(null);
    onSessionActive(null);
    setSuccess("Zerodha connection cleared.");
    setTimeout(() => setSuccess(null), 3000);
  };

  const getLoginUrl = () => {
    if (!apiKey) return "#";
    return `https://kite.zerodha.com/connect/login?api_key=${apiKey}&v=3`;
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !apiSecret || !requestToken) {
      setError("Please fill in API Key, API Secret, and Request Token.");
      return;
    }

    setIsConnecting(true);
    setError(null);
    setSuccess(null);

    const res = await authenticateKiteAction(apiKey, apiSecret, requestToken);
    
    if (res.success && res.session) {
      const activeSession: KiteSession = {
        accessToken: res.session.accessToken,
        publicToken: res.session.publicToken,
        userId: res.session.userId,
        userName: res.session.userName,
        apiKey: res.session.apiKey,
      };

      setSession(activeSession);
      localStorage.setItem("kite_session", JSON.stringify(activeSession));
      localStorage.setItem("kite_api_key", apiKey);
      localStorage.setItem("kite_api_secret", apiSecret);
      onSessionActive(activeSession);
      setSuccess(`Welcome, ${activeSession.userName}! Session authenticated.`);
      
      // Fetch latest positions and trades
      await syncKiteData(activeSession.apiKey, activeSession.accessToken);
    } else {
      setError(res.error || "Authentication failed.");
    }
    setIsConnecting(false);
  };

  const syncKiteData = async (key: string, token: string) => {
    setIsFetching(true);
    setError(null);
    const res = await fetchKiteDataAction(key, token);
    
    if (res.success) {
      onDataFetched(res.trades || [], res.positions || [], res.margins || null, res.gttTriggers || []);
    } else {
      setError(res.error || "Failed to fetch positions and trades from Kite API.");
      // If token expired, clear session
      if (res.error?.includes("token") || res.error?.includes("session")) {
        localStorage.removeItem("kite_session");
        setSession(null);
        onSessionActive(null);
      }
    }
    setIsFetching(false);
  };

  const handleRefresh = () => {
    if (session) {
      syncKiteData(session.apiKey, session.accessToken);
    }
  };

  return (
    <div className="w-full space-y-6">
      {session ? (
        // Active Session View
        <div className="glass-panel rounded-[2rem] p-6 border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" weight="light" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold uppercase tracking-wider">Kite Zerodha Sync Active</p>
              <p className="text-zinc-400 text-xs font-medium font-mono mt-0.5">
                {session.userName} ({session.userId})
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="px-4 py-2 rounded-full bg-zinc-900 border border-white/5 text-zinc-300 hover:text-white disabled:opacity-40 transition-colors text-xs font-medium font-mono flex items-center gap-1.5"
            >
              {isFetching ? (
                <SpinnerGap className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Swap className="w-3.5 h-3.5" />
              )}
              <span>Fetch Live Updates</span>
            </button>
            
            <button
              onClick={handleClearCredentials}
              className="px-4 py-2 rounded-full bg-zinc-950 border border-rose-900/30 text-rose-400 hover:bg-rose-950/20 transition-colors text-xs font-medium font-mono"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        // Login Wizard Form
        <div className="glass-panel rounded-[2rem] p-6 border border-white/5 space-y-6">
          <div className="flex items-center gap-2 text-zinc-400 pb-2 border-b border-white/5">
            <Plugs className="w-4 h-4" />
            <h4 className="text-xs uppercase tracking-widest font-semibold">Connect Zerodha Account</h4>
          </div>

          <form onSubmit={handleConnect} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium block mb-1.5">
                  Kite API Key
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="w-3.5 h-3.5 text-zinc-600" />
                  </span>
                  <input
                    type="text"
                    className="w-full text-xs pl-9 pr-4 py-2 bg-zinc-900/40 border border-white/5 focus:border-emerald-500 rounded-full focus:outline-none text-zinc-300 font-mono"
                    placeholder="API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium block mb-1.5">
                  Kite API Secret
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="w-3.5 h-3.5 text-zinc-600" />
                  </span>
                  <input
                    type="password"
                    className="w-full text-xs pl-9 pr-4 py-2 bg-zinc-900/40 border border-white/5 focus:border-emerald-500 rounded-full focus:outline-none text-zinc-300 font-mono"
                    placeholder="API Secret"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {apiKey && (
              <div className="bg-zinc-950/50 rounded-2xl p-4 border border-white/5 space-y-3">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-zinc-400 text-xs leading-normal">
                    To authenticate, first click the link below to login through Zerodha. You will be redirected to a page that fails or shows a token. Copy the <code className="text-white font-mono bg-white/5 px-1 py-0.5 rounded">request_token</code> from your browser URL parameters and paste it below.
                  </p>
                </div>
                
                <a
                  href={getLoginUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 hover:bg-emerald-900/20 transition-all text-xs font-semibold"
                >
                  <span>1. Click to Login to Zerodha</span>
                  <span className="text-[10px]">↗</span>
                </a>
              </div>
            )}

            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium block mb-1.5">
                2. Paste Request Token here
              </label>
              <input
                type="text"
                className="w-full text-xs px-4 py-2 bg-zinc-900/40 border border-white/5 focus:border-emerald-500 rounded-full focus:outline-none text-zinc-300 font-mono"
                placeholder="Request Token (from redirect URL query parameter)"
                value={requestToken}
                onChange={(e) => setRequestToken(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2 justify-between">
              <button
                type="button"
                onClick={handleSaveCredentials}
                className="px-4 py-2 rounded-full border border-white/5 hover:border-white/15 text-zinc-400 hover:text-white transition-colors text-xs font-semibold"
              >
                Save Keys Locally
              </button>

              <button
                type="submit"
                disabled={isConnecting}
                className="px-6 py-2.5 rounded-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400 transition-colors text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
              >
                {isConnecting ? (
                  <>
                    <SpinnerGap className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Connect Session</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs text-center font-medium">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-xs text-center font-medium">
          {success}
        </div>
      )}
    </div>
  );
}
