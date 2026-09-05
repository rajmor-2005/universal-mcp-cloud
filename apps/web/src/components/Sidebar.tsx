'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Plug,
  Terminal,
  FileText,
  CreditCard,
  Settings,
  ShieldCheck,
  Zap,
  Boxes,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Workspaces', href: '/workspaces', icon: Boxes },
  { name: 'Connectors', href: '/connectors', icon: Plug },
  { name: 'MCP Endpoint', href: '/mcp-endpoint', icon: Terminal },
  { name: 'Execution Logs', href: '/logs', icon: FileText },
  { name: 'Billing & Usage', href: '/billing', icon: CreditCard },
  { name: 'Security & Settings', href: '/settings', icon: Settings },
  { name: 'Admin Panel', href: '/admin', icon: ShieldCheck, badge: 'Admin' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, currentWorkspace, workspaces, setCurrentWorkspace, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-64 glass-panel flex flex-col h-screen sticky top-0 z-20 transition-colors duration-200">
      {/* Brand Logo */}
      <div className="p-5 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/60">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight leading-none">
              Universal MCP
            </h1>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
              Cloud Platform
            </span>
          </div>
        </Link>
      </div>

      {/* Workspace Switcher Selector */}
      <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/60">
        <div className="relative">
          <select
            value={currentWorkspace?.id || ''}
            onChange={(e) => {
              const ws = workspaces.find((w) => w.id === e.target.value);
              if (ws) setCurrentWorkspace(ws);
            }}
            className="w-full appearance-none bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 pr-8 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name} ({ws.slug})
              </option>
            ))}
          </select>
          <ChevronDown className="h-4 w-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/60">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center gap-2.5 truncate">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/10 dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {user?.email || ''}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
