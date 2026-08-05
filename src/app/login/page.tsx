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
    <div className="min-h-[100dvh] bg-[#050505] text-[#fafafa] relative overflow-hidden flex flex-col items-center justify-center font-sans select-none px-4">
      {/* Background Ambient Mesh Glowing Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#10b981]/5 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#f43f5e]/3 rounded-full blur-[140px] pointer-events-none z-0"></div>

      {/* Main Login Card */}
      <div className="w-full max-w-md relative z-10 space-y-8">
        
        {/* Logo and Brand Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" weight="light" />
          </div>
          <h1 className="text-2xl font-bold tracking-tighter uppercase text-white">
            FNO Journal
          </h1>
          <p className="text-zinc-500 text-xs">Secure login portal for live trading logs</p>
        </div>

        {/* Glass panel wrapper */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-[2rem] p-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
          <div className="bg-zinc-950/80 rounded-[calc(2rem-0.375rem)] p-8 space-y-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            
            <div className="text-center space-y-1">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Identify Yourself
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Connect your pre-authorized Google account to view analytics and manage Zerodha Kite triggers.
              </p>
            </div>

            {/* Error / Warning Alert banner */}
            {isActualError ? (
              <div className="bg-rose-950/20 border border-rose-900/30 rounded-2xl p-4 flex gap-3 items-start animate-pulse">
                <Warning className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-rose-400 text-xs font-semibold uppercase tracking-wider">Access Restricted</p>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    {getErrorMessage()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 flex gap-3 items-start">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Secure Session</p>
                  <p className="text-zinc-500 text-[11px] leading-relaxed font-medium">
                    Access is locked to one pre-authorized Google email. All connections use end-to-end client-side encryption.
                  </p>
                </div>
              </div>
            )}

            {/* Google OAuth trigger button */}
            <a
              href="/api/auth/google"
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-full bg-white text-black hover:bg-zinc-200 active:scale-[0.98] transition-all text-xs font-bold shadow-md cursor-pointer"
            >
              {/* Google G Logo SVG */}
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 0, 0)">
                  <path d="M21.35,11.1H12v2.7h5.38C16.88,16.27,14.65,18,12,18c-3.31,0-6-2.69-6-6s2.69-6,6-6c1.47,0,2.81,0.53,3.87,1.43l2.03-2.03C16.21,3.77,14.22,3,12,3c-4.97,0-9,4.03-9,9s4.03,9,9,9c4.74,0,8.9-3.4,8.9-9A6.9,6.9,0,0,0,21.35,11.1Z" fill="#000000" />
                </g>
              </svg>
              <span>Continue with Google</span>
            </a>

          </div>
        </div>

        {/* Footer info */}
        <div className="text-center font-mono text-[10px] text-zinc-600">
          <span>Protected by AES-256 Client-Side Keys.</span>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] bg-[#050505] flex items-center justify-center">
        <SpinnerGap className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
