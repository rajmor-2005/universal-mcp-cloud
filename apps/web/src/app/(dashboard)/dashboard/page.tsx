'use client';

import { useState, useEffect } from 'react';
import {
  Zap,
  Plug,
  Terminal,
  Activity,
  CheckCircle2,
  TrendingUp,
  Boxes,
  ArrowUpRight,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

export default function DashboardPage() {
  const { user, currentWorkspace, currentOrg } = useAuth();
  const [connectedApps, setConnectedApps] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!currentWorkspace || !currentOrg) return;
      try {
        setLoading(true);

        const [apps, toolList, subData] = await Promise.all([
          apiRequest<any[]>(`/connectors/workspace/${currentWorkspace.id}`).catch(() => []),
          apiRequest<any[]>(`/connectors/workspace/${currentWorkspace.id}/tools`).catch(() => []),
          apiRequest<any>(`/billing/organizations/${currentOrg.id}/subscription`).catch(() => null),
        ]);

        setConnectedApps(apps || []);
        setTools(toolList || []);
        setSubscription(subData);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [currentWorkspace?.id, currentOrg?.id]);

  const stats = [
    {
      name: 'Connected Apps',
      value: `${connectedApps.length} / ${subscription?.limits?.maxConnectedApps || 3}`,
      label: `${subscription?.subscription?.plan || 'FREE'} Plan Quota`,
      icon: Plug,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      name: 'Exposed MCP Tools',
      value: String(tools.length),
      label: 'Active tools in endpoint',
      icon: Terminal,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      name: 'Monthly Tool Calls',
      value: String(subscription?.usage?.toolCalls || 0),
      label: `Limit: ${subscription?.limits?.maxToolCallsPerMonth?.toLocaleString() || '1,000'}`,
      icon: Activity,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      name: 'Workspace Members',
      value: String(subscription?.usage?.activeSeats || 1),
      label: 'Row-level access control',
      icon: ShieldCheck,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-28 glass-panel rounded-2xl bg-slate-200/50 dark:bg-slate-800/40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 glass-panel p-5 rounded-2xl bg-slate-200/40 dark:bg-slate-800/30" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 glass-panel rounded-2xl bg-slate-200/40 dark:bg-slate-800/30" />
          <div className="h-64 glass-panel rounded-2xl bg-slate-200/40 dark:bg-slate-800/30" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-gradient-to-r from-indigo-50/60 via-purple-50/30 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Welcome back, {user?.name || user?.email?.split('@')[0] || 'User'} 👋
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Workspace: <span className="font-semibold text-slate-800 dark:text-slate-200">{currentWorkspace?.name}</span> ({currentWorkspace?.slug}). Single MCP endpoint is live.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/connectors"
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
          >
            <Plug className="h-3.5 w-3.5" />
            <span>Connect App</span>
          </Link>
          <Link
            href="/mcp-endpoint"
            className="px-4 py-2 text-xs font-semibold rounded-xl glass-card text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5"
          >
            <Terminal className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>View Endpoint</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="glass-card p-5 rounded-2xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.name}</span>
                <div className={`p-2 rounded-xl border ${stat.bg}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-3">{stat.value}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plug className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Connected Applications</span>
            </h3>
            <Link
              href="/connectors"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-semibold flex items-center gap-1"
            >
              <span>Marketplace</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {connectedApps.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Plug className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Connected Apps Yet</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Connect your first app from the marketplace to expose its tools to your AI clients.
              </p>
              <Link
                href="/connectors"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white shadow-md"
              >
                <span>Browse Marketplace</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {connectedApps.map((app) => (
                <div key={app.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2">
                      <img src={app.definition?.iconUrl} alt={app.displayName} className="h-5 w-5 object-contain" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{app.displayName}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{app.definition?.category}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Exposed Tools Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span>Available MCP Tools ({tools.length})</span>
            </h3>
          </div>

          <div className="glass-panel p-4 rounded-2xl space-y-2.5 max-h-96 overflow-y-auto">
            {tools.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No tools available until an app is connected.</p>
            ) : (
              tools.map((tool) => (
                <div
                  key={tool.id}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex flex-col gap-1 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-300 text-[11px]">
                      {tool.namespacedName}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                      {tool.connectorName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {tool.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
