'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setStoredToken, setStoredRefreshToken } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { Zap, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshData } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const oauthError = searchParams.get('error');

    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      setLoading(false);
      return;
    }

    if (accessToken && refreshToken) {
      setStoredToken(accessToken);
      setStoredRefreshToken(refreshToken);

      refreshData()
        .then(() => {
          router.replace('/dashboard');
        })
        .catch((err) => {
          console.error('Failed to initialize session after OAuth:', err);
          router.replace('/dashboard');
        });
    } else {
      setError('Invalid OAuth response. No tokens were returned.');
      setLoading(false);
    }
  }, [searchParams, router, refreshData]);

  if (loading) {
    return (
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xl text-center">
        <div className="inline-flex h-12 w-12 rounded-2xl bg-indigo-600 items-center justify-center text-white shadow-lg shadow-indigo-500/25 mb-2">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Authenticating with GitHub...</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Please wait while we verify your account and load your workspace.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-6 shadow-xl text-center">
      <div className="inline-flex h-12 w-12 rounded-2xl bg-rose-600 items-center justify-center text-white shadow-lg shadow-rose-500/25 mb-2">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Authentication Error</h2>
      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
        {error}
      </div>
      <Link
        href="/login"
        className="inline-block w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all"
      >
        Return to Login
      </Link>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" />
          <p className="text-xs text-slate-400">Loading authentication...</p>
        </div>
      }>
        <AuthCallbackHandler />
      </Suspense>
    </div>
  );
}
