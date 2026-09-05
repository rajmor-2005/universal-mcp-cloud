'use client';

import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useEffect } from 'react';
import { Zap } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex flex-col items-center justify-center gap-3 text-slate-900 dark:text-white">
        <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg animate-pulse">
          <Zap className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Authenticating workspace session...</p>
      </div>
    );
  }

  if (!user) return null;

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/dashboard':
        return 'Dashboard Overview';
      case '/workspaces':
        return 'Workspaces Management';
      case '/connectors':
        return 'Connector Marketplace & Connected Apps';
      case '/mcp-endpoint':
        return 'Universal MCP Endpoint';
      case '/logs':
        return 'Tool Execution Logs';
      case '/billing':
        return 'Subscription & Usage';
      case '/settings':
        return 'Security & Account Settings';
      case '/admin':
        return 'Platform Administration';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-[#090d16] dark:text-slate-100 transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={getPageTitle(pathname)} />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
