'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Users, Boxes, Plug, Activity, ToggleLeft, ToggleRight, Layers, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function AdminPage() {
  const [stats, setStats] = useState<{
    users: number;
    organizations: number;
    workspaces: number;
    connectedApps: number;
    toolExecutions: number;
  }>({
    users: 0,
    organizations: 0,
    workspaces: 0,
    connectedApps: 0,
    toolExecutions: 0,
  });
  const [flags, setFlags] = useState<any[]>([]);
  const [marketplace, setMarketplace] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [statsData, flagsData, marketplaceData] = await Promise.all([
        apiRequest<{ users: number; organizations: number; workspaces: number; connectedApps: number; toolExecutions: number }>('/admin/dashboard'),
        apiRequest<any[]>('/admin/feature-flags'),
        apiRequest<any[]>('/connectors/marketplace'),
      ]);

      setStats(statsData);
      setFlags(flagsData || []);
      setMarketplace(marketplaceData || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const toggleFlag = async (key: string, currentStatus: boolean) => {
    try {
      const updated = await apiRequest(`/admin/feature-flags/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ isEnabled: !currentStatus }),
      });
      setFlags(flags.map((f) => (f.key === key ? updated : f)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle feature flag');
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-rose-500/20 bg-gradient-to-r from-rose-950/30 via-slate-900 to-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Platform Administration</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Super-admin panel for feature flags, global connector marketplace health, and workspace telemetry.
            </p>
          </div>
        </div>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="glass-card p-5 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Total Registered Users</span>
          <p className="text-2xl font-extrabold text-white mt-2">{stats.users.toLocaleString()}</p>
        </div>
        <div className="glass-card p-5 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Organizations</span>
          <p className="text-2xl font-extrabold text-white mt-2">{stats.organizations.toLocaleString()}</p>
        </div>
        <div className="glass-card p-5 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Total Tool Calls</span>
          <p className="text-2xl font-extrabold text-white mt-2">{stats.toolExecutions.toLocaleString()}</p>
        </div>
        <div className="glass-card p-5 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Active Connected Apps</span>
          <p className="text-2xl font-extrabold text-white mt-2">{stats.connectedApps.toLocaleString()}</p>
        </div>
      </div>

      {/* Global Connector Marketplace Health */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            <span>Global Marketplace Registry ({marketplace.length} Integrations)</span>
          </h3>
          <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Hot-loading Active</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
          {marketplace.map((conn) => (
            <div key={conn.slug} className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={conn.iconUrl} alt={conn.name} className="h-6 w-6 object-contain" />
                <div>
                  <h4 className="text-xs font-bold text-white">{conn.name}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">{conn.category}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[9px] font-mono rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {conn.authType}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Flags Control */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ToggleRight className="h-5 w-5 text-indigo-400" />
          <span>Feature Flags Control</span>
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          {flags.map((flag) => (
            <div key={flag.key} className="glass-card p-4 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">{flag.name}</h4>
                <p className="text-[10px] font-mono text-slate-500">{flag.key}</p>
              </div>
              <button
                onClick={() => toggleFlag(flag.key, flag.isEnabled)}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  flag.isEnabled ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-800'
                }`}
              >
                {flag.isEnabled ? <ToggleRight className="h-6 w-6 text-emerald-400" /> : <ToggleLeft className="h-6 w-6 text-slate-500" />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
