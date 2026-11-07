"use client";

import React, { useState, useEffect } from "react";
import { authenticateKiteAction, validateAccessTokenAction, fetchKiteDataAction } from "@/app/actions/kite";
import { KiteSession } from "@/lib/kite";
import { RawTrade } from "@/lib/tradeEngine";
import { Key, Swap, ShieldCheck, SpinnerGap, Plugs, Info, LockKey, ArrowSquareOut } from "@phosphor-icons/react";

interface KiteConnectorProps {
  onDataFetched: (trades: RawTrade[], positions: any[], margins: any, gttTriggers: any[]) => void;
  onSessionActive: (session: KiteSession | null) => void;
}

export default function KiteConnector({ onDataFetched, onSessionActive }: KiteConnectorProps) {
  const [authMode, setAuthMode] = useState<"login" | "token">("login");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [requestToken, setRequestToken] = useState("");
  const [directAccessToken, setDirectAccessToken] = useState("");
  
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

    // Auto-detect request_token from URL query if user just redirected back from Zerodha
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlReqToken = urlParams.get("request_token");
      if (urlReqToken) {
        setRequestToken(urlReqToken);
        // If API key and secret are already saved, auto-authenticate!
        if (savedKey && savedSecret && !savedSessionStr) {
          autoAuthenticate(savedKey, savedSecret, urlReqToken);
        }
      }
    }

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

  const autoAuthenticate = async (key: string, secret: string, reqToken: string) => {
    setIsConnecting(true);
    setError(null);
    const res = await authenticateKiteAction(key, secret, reqToken);
    if (res.success && res.session) {
      const activeSession: KiteSession = {
        accessToken: res.session.accessToken,
        publicToken: res.session.publicToken,
        userId: res.session.userId,
        userName: res.session.userName,
        apiKey: key,
      };
      setSession(activeSession);
      localStorage.setItem("kite_session", JSON.stringify(activeSession));
      onSessionActive(activeSession);
      setSuccess(`Auto-connected as ${activeSession.userName}! Live positions synced.`);
      // Clean query parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      await syncKiteData(activeSession.apiKey, activeSession.accessToken);
    } else {
      setError(res.error || "Auto-authentication failed. Please check your API secret.");
    }
    setIsConnecting(false);
  };

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
    setDirectAccessToken("");
    setSession(null);
    onSessionActive(null);
    setSuccess("Zerodha connection cleared.");
    setTimeout(() => setSuccess(null), 3000);
  };

  const getLoginUrl = () => {
    if (!apiKey) return "#";
    return `https://kite.zerodha.com/connect/login?api_key=${apiKey}&v=3`;
  };

  // Connect via Request Token exchange
  const handleConnectRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !apiSecret || !requestToken) {
      setError("Please enter your API Key, API Secret, and Request Token.");
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
      setSuccess(`Connected as ${activeSession.userName}! Session live.`);
      
      // Clean query parameters from URL if present
      if (typeof window !== "undefined" && window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      await syncKiteData(activeSession.apiKey, activeSession.accessToken);
    } else {
      setError(res.error || "Authentication failed. Request tokens expire in a few minutes.");
    }
    setIsConnecting(false);
  };

  // Connect directly with existing Access Token
  const handleConnectDirectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !directAccessToken) {
      setError("Please enter your API Key and Access Token.");
      return;
    }

    setIsConnecting(true);
    setError(null);
    setSuccess(null);

    const res = await validateAccessTokenAction(apiKey, directAccessToken);
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
      onSessionActive(activeSession);
      setSuccess(`Connected directly as ${activeSession.userName}!`);

      await syncKiteData(activeSession.apiKey, activeSession.accessToken);
    } else {
      setError(res.error || "Invalid Access Token or expired session.");
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
      if (res.isTokenExpired || res.error?.includes("token") || res.error?.includes("session")) {
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
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-emerald-600" weight="bold" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-slate-900 text-sm font-bold uppercase tracking-wider font-mono">
                    Zerodha Kite Live Sync
                  </p>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-bold px-2 py-0.5 rounded-full">
                    Active Session
                  </span>
                </div>
                <p className="text-slate-500 text-xs font-mono mt-0.5">
                  Logged in as <strong className="text-slate-800">{session.userName}</strong> ({session.userId})
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={handleRefresh}
                disabled={isFetching}
                className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 disabled:opacity-40 transition-colors text-xs font-semibold font-mono flex items-center gap-1.5 shadow-sm"
              >
                {isFetching ? (
                  <SpinnerGap className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Swap className="w-3.5 h-3.5" />
                )}
                <span>Sync Live Positions</span>
              </button>
              
              <button
                onClick={handleClearCredentials}
                className="px-4 py-2.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors text-xs font-semibold font-mono"
              >
                Disconnect
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] text-slate-500 font-mono flex items-center justify-between">
            <span>ℹ️ Zerodha security rule: access tokens expire every morning at ~6:00 AM IST.</span>
            <span className="text-slate-700 font-semibold">Ready for live trading</span>
          </div>
        </div>
      ) : (
        // Login Wizard Form
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-800">
              <Plugs className="w-5 h-5 text-emerald-600" weight="bold" />
              <h4 className="text-sm uppercase tracking-widest font-bold font-mono">Connect Zerodha Account</h4>
            </div>

            {/* Mode Selector */}
            <div className="flex bg-slate-100 p-1 rounded-full text-[11px] font-mono border border-slate-200">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`px-3 py-1 rounded-full transition-all ${
                  authMode === "login" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Standard Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("token")}
                className={`px-3 py-1 rounded-full transition-all ${
                  authMode === "token" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Paste Access Token
              </button>
            </div>
          </div>

          {authMode === "login" ? (
            // STANDARD REQUEST TOKEN FLOW
            <form onSubmit={handleConnectRequestToken} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5 font-mono">
                    1. Kite API Key
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-full focus:outline-none text-slate-900 font-mono transition-colors"
                      placeholder="e.g. 3xyz98abc..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5 font-mono">
                    2. Kite API Secret
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockKey className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                    <input
                      type="password"
                      className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-full focus:outline-none text-slate-900 font-mono transition-colors"
                      placeholder="e.g. 48charSecretKey..."
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {apiKey && (
                <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200 space-y-3">
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" weight="bold" />
                    <p className="text-emerald-900 text-xs leading-relaxed font-mono">
                      Step 1: Click the button below to log in through Zerodha Kite. After logging in, you will be redirected back with a fresh <code className="bg-emerald-200/80 px-1 py-0.5 rounded font-bold text-emerald-950">request_token</code>.
                    </p>
                  </div>
                  
                  <a
                    href={getLoginUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-all text-xs font-bold font-mono shadow-sm"
                  >
                    <span>Click to Log in with Zerodha</span>
                    <ArrowSquareOut className="w-4 h-4" />
                  </a>
                </div>
              )}

              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5 font-mono">
                  3. Request Token (Auto-filled on redirect or paste here)
                </label>
                <input
                  type="text"
                  className="w-full text-xs px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-full focus:outline-none text-slate-900 font-mono transition-colors"
                  placeholder="Paste request_token from browser redirect URL"
                  value={requestToken}
                  onChange={(e) => setRequestToken(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2 justify-between">
                <button
                  type="button"
                  onClick={handleSaveCredentials}
                  className="px-4 py-2 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors text-xs font-semibold font-mono"
                >
                  Save API Keys Locally
                </button>

                <button
                  type="submit"
                  disabled={isConnecting}
                  className="px-6 py-2.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-xs font-bold font-mono flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
                >
                  {isConnecting ? (
                    <>
                      <SpinnerGap className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Connect Live Session</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            // DIRECT ACCESS TOKEN FLOW
            <form onSubmit={handleConnectDirectToken} className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <p className="text-slate-600 text-xs font-mono leading-relaxed">
                  If you already generated an <code className="bg-slate-200 px-1 py-0.5 rounded font-bold">access_token</code> today (e.g. from Python, another trading script, or Kite developer console), paste it directly below for instant sync.
                </p>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5 font-mono">
                  Kite API Key
                </label>
                <input
                  type="text"
                  className="w-full text-xs px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-full focus:outline-none text-slate-900 font-mono transition-colors"
                  placeholder="Kite API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5 font-mono">
                  Today's Access Token
                </label>
                <input
                  type="password"
                  className="w-full text-xs px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-full focus:outline-none text-slate-900 font-mono transition-colors"
                  placeholder="Paste 32-character access_token"
                  value={directAccessToken}
                  onChange={(e) => setDirectAccessToken(e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="px-6 py-2.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-xs font-bold font-mono flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
                >
                  {isConnecting ? (
                    <>
                      <SpinnerGap className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating Token...</span>
                    </>
                  ) : (
                    <span>Connect with Access Token</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium font-mono animate-fade-in">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs text-center font-medium font-mono animate-fade-in">
          {success}
        </div>
      )}
    </div>
  );
}
