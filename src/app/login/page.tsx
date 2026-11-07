"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, Warning, SpinnerGap } from '@phosphor-icons/react';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = () => {
    switch (error) {
      case 'unauthorized_email':
        return 'Access Denied. Your Google account email is not authorized to view this dashboard.';
      case 'missing_config':
        return 'Server Error. Google OAuth configuration is missing on the server. Please check your Vercel environment variables.';
      case 'token_exchange_failed':
        return 'OAuth Error. Failed to exchange code for token with Google.';
      case 'user_info_failed':
        return 'OAuth Error. Failed to retrieve your profile information from Google.';
      case 'oauth_failed':
        return 'Authentication failed or was cancelled.';
      case 'exception':
        return 'An unexpected error occurred during the login process.';
      default:
        return 'Authentication is required to access your FNO Trading Journal.';
    }
  };

  const isActualError = error !== null;

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] text-[#0f172a] relative overflow-hidden flex flex-col items-center justify-center font-sans select-none px-4">
      {/* Background Ambient Subtle Tints */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none z-0"></div>

      {/* Main Login Card */}
      <div className="w-full max-w-md relative z-10 space-y-8">
        
        {/* Logo and Brand Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 mb-2 shadow-sm">
            <ShieldCheck className="w-6 h-6 text-emerald-600" weight="bold" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight uppercase text-slate-900">
            FNO Journal
          </h1>
          <p className="text-slate-500 text-xs font-mono">Secure portal for live trading logs & scanner</p>
        </div>

        {/* Card wrapper */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 space-y-6 shadow-md shadow-slate-900/5">
          <div className="text-center space-y-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 font-mono">
              Authorized Sign In
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed font-mono">
              Connect your authorized Google account to view analytics and manage Zerodha Kite triggers.
            </p>
          </div>

          {/* Error / Warning Alert banner */}
          {isActualError ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-3 items-start animate-pulse">
              <Warning className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 font-mono">
                <p className="text-rose-700 text-xs font-bold uppercase tracking-wider">Access Restricted</p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {getErrorMessage()}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3 items-start">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-0.5 font-mono">
                <p className="text-emerald-800 text-xs font-bold uppercase tracking-wider">Client-Side Secure</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  API secrets stay in your local browser storage.
                </p>
              </div>
            </div>
          )}

          {/* Google OAuth trigger button */}
          <a
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] transition-all text-xs font-bold shadow-md cursor-pointer font-mono"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.35,11.1H12v2.7h5.38C16.88,16.27,14.65,18,12,18c-3.31,0-6-2.69-6-6s2.69-6,6-6c1.47,0,2.81,0.53,3.87,1.43l2.03-2.03C16.21,3.77,14.22,3,12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9c4.74,0,8.9-3.4,8.9-9A6.9,6.9,0,0,0,21.35,11.1Z" fill="#ffffff" />
            </svg>
            <span>Continue with Google</span>
          </a>
        </div>

        {/* Footer info */}
        <div className="text-center font-mono text-[10px] text-slate-400">
          <span>Protected by AES-256 Client-Side Keys.</span>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] bg-[#f8fafc] flex items-center justify-center">
        <SpinnerGap className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
