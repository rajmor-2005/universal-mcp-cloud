'use client';

import { useState, useEffect } from 'react';
import {
  Plug,
  Search,
  CheckCircle2,
  Plus,
  Lock,
  ExternalLink,
  ShieldCheck,
  Zap,
  Key,
  X,
  RefreshCw,
  Activity,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Info,
  Sliders,
  Check,
  AlertCircle,
  Clock,
  BookOpen,
  Code2,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

import { AutoMcpModal } from '@/components/AutoMcpModal';

export default function ConnectorsPage() {
  const { currentWorkspace } = useAuth();
  const [activeTab, setActiveTab] = useState<'MARKETPLACE' | 'CONNECTED'>('MARKETPLACE');
  
  const [marketplace, setMarketplace] = useState<any[]>([]);
  const [connectedApps, setConnectedApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Modals
  const [autoMcpOpen, setAutoMcpOpen] = useState(false);
  const [modalConnector, setModalConnector] = useState<any | null>(null);
  const [detailModalConnector, setDetailModalConnector] = useState<any | null>(null);
  const [reconnectModalInstance, setReconnectModalInstance] = useState<any | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'OVERVIEW' | 'TOOLS' | 'AUTH' | 'GUIDE'>('GUIDE');
  
  // Inputs
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [bearerTokenInput, setBearerTokenInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  
  // Health diagnostics
  const [healthStatus, setHealthStatus] = useState<Record<string, { loading: boolean; data?: any }>>({});
  const activeApiUrl = ((typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : null) || 'http://localhost:4000').replace(/\/+$/, '');

  const categories = [
    { label: 'All', key: 'All' },
    { label: 'Developer Tools', key: 'DEVELOPER_TOOLS' },
    { label: 'Communication', key: 'COMMUNICATION' },
    { label: 'Productivity', key: 'PRODUCTIVITY' },
    { label: 'AI & ML', key: 'AI' },
    { label: 'Payments', key: 'PAYMENTS' },
    { label: 'Finance', key: 'FINANCE' },
    { label: 'CRM', key: 'CRM' },
    { label: 'Databases', key: 'DATABASES' },
    { label: 'Cloud Services', key: 'CLOUD' },
    { label: 'Commerce', key: 'COMMERCE' },
    { label: 'Storage', key: 'STORAGE' },
    { label: 'Marketing', key: 'MARKETING' },
    { label: 'Social Media', key: 'SOCIAL_MEDIA' },
    { label: 'Custom APIs', key: 'CUSTOM_API' },
  ];

  const loadConnectorsData = async () => {
    try {
      setLoading(true);
      const defs = await apiRequest<any[]>('/connectors/marketplace');
      setMarketplace(defs || []);

      if (currentWorkspace) {
        const instances = await apiRequest<any[]>(`/connectors/workspace/${currentWorkspace.id}`);
        setConnectedApps(instances || []);
      }
    } catch (err) {
      console.error('Failed to fetch connectors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnectorsData();
  }, [currentWorkspace?.id]);

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !modalConnector) return;

    try {
      setConnecting(true);

      const credentials: Record<string, string> = {};
      const token = bearerTokenInput || apiKeyInput;
      if (token) {
        credentials.bearerToken = token;
        credentials.apiKey = token;
      }
      if (usernameInput) credentials.username = usernameInput;
      if (passwordInput) credentials.password = passwordInput;

      await apiRequest(`/connectors/workspace/${currentWorkspace.id}/connect`, {
        method: 'POST',
        body: JSON.stringify({
          connectorDefinitionId: modalConnector.id,
          displayName: modalConnector.name,
          credentials,
        }),
      });

      setModalConnector(null);
      resetInputs();
      await loadConnectorsData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleReconnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconnectModalInstance) return;

    try {
      setConnecting(true);
      const credentials: Record<string, string> = {};
      if (apiKeyInput) credentials.apiKey = apiKeyInput;
      if (bearerTokenInput) credentials.bearerToken = bearerTokenInput;
      if (usernameInput) credentials.username = usernameInput;
      if (passwordInput) credentials.password = passwordInput;

      await apiRequest(`/connectors/instance/${reconnectModalInstance.id}/reconnect`, {
        method: 'POST',
        body: JSON.stringify({ credentials }),
      });

      setReconnectModalInstance(null);
      resetInputs();
      await loadConnectorsData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Reconnect failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleToggle = async (instanceId: string, currentEnabled: boolean) => {
    try {
      await apiRequest(`/connectors/instance/${instanceId}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ isEnabled: !currentEnabled }),
      });
      await loadConnectorsData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const handleDisconnect = async (instanceId: string) => {
    if (!confirm('Are you sure you want to disconnect this app? Connected MCP tools will be removed instantly.')) return;
    try {
      await apiRequest(`/connectors/instance/${instanceId}`, { method: 'DELETE' });
      await loadConnectorsData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Disconnect failed');
    }
  };

  const runHealthCheck = async (instanceId: string) => {
    setHealthStatus((prev) => ({ ...prev, [instanceId]: { loading: true } }));
    try {
      const res = await apiRequest(`/connectors/instance/${instanceId}/health`);
      setHealthStatus((prev) => ({ ...prev, [instanceId]: { loading: false, data: res } }));
    } catch (err) {
      setHealthStatus((prev) => ({
        ...prev,
        [instanceId]: { loading: false, data: { isHealthy: false, message: 'Health check failed' } },
      }));
    }
  };

  const resetInputs = () => {
    setApiKeyInput('');
    setBearerTokenInput('');
    setUsernameInput('');
    setPasswordInput('');
  };

  const isConnected = (defId: string) => {
    return connectedApps.some((inst) => inst.definitionId === defId && inst.isEnabled);
  };

  const getConnectedInstance = (defId: string) => {
    return connectedApps.find((inst) => inst.definitionId === defId);
  };

  const filteredMarketplace = marketplace.filter((conn) => {
    const matchesSearch =
      conn.name.toLowerCase().includes(search.toLowerCase()) ||
      conn.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || conn.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categoryCounts = categories.reduce((acc, cat) => {
    if (cat.key === 'All') {
      acc[cat.key] = marketplace.length;
    } else {
      acc[cat.key] = marketplace.filter((c) => c.category === cat.key).length;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Connector Marketplace</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Discover and connect SaaS applications. All connected tools are dynamically exposed to your AI clients via Universal MCP.
          </p>
        </div>

        {/* Top Tab Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAutoMcpOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 flex items-center gap-1.5 transition-all hover:scale-[1.02]"
          >
            <Sparkles className="h-4 w-4" />
            <span>⚡ Auto-Generate MCP from API URL</span>
          </button>

          <div className="inline-flex p-1 bg-slate-200/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 rounded-2xl shrink-0">
            <button
              onClick={() => setActiveTab('MARKETPLACE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'MARKETPLACE'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Browse Marketplace ({marketplace.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('CONNECTED')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'CONNECTED'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Plug className="h-4 w-4" />
              <span>Active Integrations ({connectedApps.filter((a) => a.isEnabled).length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* MARKETPLACE TAB */}
      {activeTab === 'MARKETPLACE' && (
        <div className="space-y-6">
          {/* Search & Category Filter */}
          <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search 25+ connectors, tools, or triggers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Category Chips */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat.key
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedCategory === cat.key ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {categoryCounts[cat.key] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Marketplace Connectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMarketplace.map((conn) => {
              const connected = isConnected(conn.id);
              const connectedInst = getConnectedInstance(conn.id);

              return (
                <div
                  key={conn.slug}
                  className="glass-card p-6 rounded-2xl flex flex-col justify-between border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/30 transition-all duration-200 group relative"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-3 shadow-sm group-hover:scale-105 transition-transform">
                        <img src={conn.iconUrl} alt={conn.name} className="h-8 w-8 object-contain" />
                      </div>

                      <div className="flex items-center gap-2">
                        {connected ? (
                          <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Connected</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
                            {conn.authType}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">{conn.name}</h3>
                      <button
                        onClick={() => setDetailModalConnector(conn)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Details</span>
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {conn.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <span>{conn._count?.tools || 0} Tools</span>
                    </span>

                    {connected ? (
                      <button
                        onClick={() => connectedInst && handleDisconnect(connectedInst.id)}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-rose-500/10 hover:text-rose-600 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => setModalConnector(conn)}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Connect</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONNECTED APPS TAB */}
      {activeTab === 'CONNECTED' && (
        <div className="space-y-6">
          {connectedApps.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-3xl space-y-4 max-w-md mx-auto">
              <div className="h-16 w-16 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Plug className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Connected Integrations</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Browse our marketplace to connect GitHub, Slack, OpenAI, Stripe, or PostgreSQL to your workspace.
              </p>
              <button
                onClick={() => setActiveTab('MARKETPLACE')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {connectedApps.map((inst) => {
                const health = healthStatus[inst.id];

                return (
                  <div key={inst.id} className="glass-panel p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                          <img src={inst.definition.iconUrl} alt={inst.definition.name} className="h-7 w-7 object-contain" />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{inst.displayName}</h3>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{inst.definition.name} • v{inst.definition.version || '1.0.0'}</span>
                        </div>
                      </div>

                      {/* Enable/Disable Toggle */}
                      <button
                        onClick={() => handleToggle(inst.id, inst.isEnabled)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          inst.isEnabled
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {inst.isEnabled ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
                        <span>{inst.isEnabled ? 'Enabled' : 'Disabled'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 p-3 bg-slate-100/60 dark:bg-slate-900/60 rounded-2xl text-xs">
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">Status</span>
                        <span className="font-bold text-emerald-500 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{inst.status}</span>
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">MCP Tools</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono mt-0.5 block">
                          {inst.definition.tools?.length || 0} Tools
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">Last Sync</span>
                        <span className="font-medium text-slate-600 dark:text-slate-400 mt-0.5 block truncate">
                          {new Date(inst.lastHealthCheck || inst.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {Array.isArray(inst.config?.grantedScopes) && inst.config.grantedScopes.length > 0 && (
                      <div className="pt-1">
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">Active GitHub Permissions / Scopes:</span>
                        <div className="flex flex-wrap gap-1">
                          {inst.config.grantedScopes.map((scope: string) => (
                            <span key={scope} className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              {scope}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {health?.data && (
                      <div className={`p-3 rounded-xl text-xs flex items-center justify-between ${
                        health.data.isHealthy
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 shrink-0" />
                          <span>{health.data.message}</span>
                        </div>
                        <span className="font-mono text-[10px]">{health.data.latencyMs}ms</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => runHealthCheck(inst.id)}
                        disabled={health?.loading}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1.5"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${health?.loading ? 'animate-spin' : ''}`} />
                        <span>{health?.loading ? 'Diagnosing...' : 'Test Connection'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setReconnectModalInstance(inst)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                        >
                          Configure
                        </button>
                        <button
                          onClick={() => handleDisconnect(inst.id)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONNECT MODAL */}
      {modalConnector && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={handleConnectSubmit} className="glass-panel p-6 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                  <img src={modalConnector.iconUrl} alt={modalConnector.name} className="h-7 w-7 object-contain" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Connect {modalConnector.name}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">{modalConnector.authType}</span>
                </div>
              </div>
              <button type="button" onClick={() => setModalConnector(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step-by-step Setup Guide Banner */}
            {modalConnector.metadata?.setupGuide && modalConnector.metadata.setupGuide.length > 0 && (
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl space-y-2 text-xs">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-indigo-500" />
                  <span>How to get credentials for {modalConnector.name}:</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300 leading-relaxed pl-1">
                  {modalConnector.metadata.setupGuide.map((step: string, idx: number) => (
                    <li key={idx} className="text-[11px]">
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="p-3 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-500" />
              <span>Credentials will be encrypted with AES-256-GCM in Vault.</span>
            </div>

            {/* Universal Credentials Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>
                    {modalConnector.slug === 'slack' && 'Slack Bot User OAuth Token (xoxb-...)'}
                    {modalConnector.slug === 'github' && 'GitHub Personal Access Token (ghp_...)'}
                    {modalConnector.slug === 'notion' && 'Notion Internal Integration Secret (secret_...)'}
                    {modalConnector.slug === 'openai' && 'OpenAI Secret API Key (sk_live_... / sk-proj-...)'}
                    {modalConnector.slug === 'anthropic' && 'Anthropic API Key (sk-ant-api03-...)'}
                    {modalConnector.slug === 'stripe' && 'Stripe Secret Key (sk_live_...)'}
                    {modalConnector.slug === 'hubspot' && 'HubSpot Private App Access Token (pat-na1-...)'}
                    {modalConnector.slug === 'shopify' && 'Shopify Admin API Access Token (shpat_...)'}
                    {modalConnector.slug === 'linear' && 'Linear Personal API Key (lin_api_...)'}
                    {modalConnector.slug === 'discord' && 'Discord Bot Token (MT...)'}
                    {modalConnector.slug === 'postgresql' && 'PostgreSQL Connection String'}
                    {modalConnector.slug === 'redis' && 'Redis Connection String'}
                    {modalConnector.slug === 'custom-rest-api' && 'Base Endpoint URL or Authorization Bearer Token'}
                    {!['slack', 'github', 'notion', 'openai', 'anthropic', 'stripe', 'hubspot', 'shopify', 'linear', 'discord', 'postgresql', 'redis', 'custom-rest-api'].includes(modalConnector.slug) && (
                      modalConnector.authType === 'API_KEY' ? 'API Key / Secret' : 'Bearer Token / Access Token / Secret Key'
                    )}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-500 font-semibold uppercase">{modalConnector.authType}</span>
                </label>

                <input
                  type="password"
                  placeholder={
                    modalConnector.slug === 'slack' ? 'xoxb-1234567890-...' :
                    modalConnector.slug === 'github' ? 'ghp_1234567890abcdef...' :
                    modalConnector.slug === 'notion' ? 'secret_1234567890abcdef...' :
                    modalConnector.slug === 'openai' ? 'sk-proj-1234567890abcdef...' :
                    modalConnector.slug === 'anthropic' ? 'sk-ant-api03-1234567890...' :
                    modalConnector.slug === 'stripe' ? 'sk_live_1234567890...' :
                    modalConnector.slug === 'hubspot' ? 'pat-na1-1234567890...' :
                    modalConnector.slug === 'postgresql' ? 'postgresql://user:password@localhost:5432/dbname' :
                    modalConnector.slug === 'redis' ? 'redis://:password@localhost:6379' :
                    'Paste key, secret, or token here...'
                  }
                  value={modalConnector.authType === 'API_KEY' ? apiKeyInput : bearerTokenInput}
                  onChange={(e) => {
                    if (modalConnector.authType === 'API_KEY') {
                      setApiKeyInput(e.target.value);
                    } else {
                      setBearerTokenInput(e.target.value);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {modalConnector.authType === 'BASIC_AUTH' && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Account SID / Username / Email</label>
                    <input
                      type="text"
                      placeholder="e.g. AC... or user@example.com"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Auth Token / Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {modalConnector.authType === 'OAUTH2' && (
                <div className="pt-2 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-2">- OR -</span>
                  <button
                    type="button"
                    onClick={() => alert(`OAuth 2.0 flow initiated for ${modalConnector.name}. Alternatively, enter your Personal Access Token / Bot Token above.`)}
                    className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Connect via 1-Click {modalConnector.name} OAuth 2.0</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button type="button" onClick={() => setModalConnector(null)} className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button type="submit" disabled={connecting} className="px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 shadow-md">
                {connecting ? 'Connecting...' : 'Authorize & Connect'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailModalConnector && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                  <img src={detailModalConnector.iconUrl} alt={detailModalConnector.name} className="h-8 w-8 object-contain" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{detailModalConnector.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{detailModalConnector.category} • v{detailModalConnector.version || '1.0.0'}</p>
                </div>
              </div>
              <button onClick={() => setDetailModalConnector(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-bold">
              <button
                onClick={() => setDetailActiveTab('GUIDE')}
                className={`pb-2 transition-colors ${detailActiveTab === 'GUIDE' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
              >
                Setup Guide & Instructions
              </button>
              <button
                onClick={() => setDetailActiveTab('OVERVIEW')}
                className={`pb-2 transition-colors ${detailActiveTab === 'OVERVIEW' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setDetailActiveTab('TOOLS')}
                className={`pb-2 transition-colors ${detailActiveTab === 'TOOLS' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
              >
                Tools ({detailModalConnector.tools?.length || 0})
              </button>
              <button
                onClick={() => setDetailActiveTab('AUTH')}
                className={`pb-2 transition-colors ${detailActiveTab === 'AUTH' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
              >
                Auth Info
              </button>
            </div>

            {detailActiveTab === 'GUIDE' && (
              <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl space-y-3">
                  <h4 className="font-extrabold text-indigo-900 dark:text-indigo-200 text-sm flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-indigo-500" />
                    <span>How to connect {detailModalConnector.name}:</span>
                  </h4>

                  {detailModalConnector.metadata?.setupGuide ? (
                    <ol className="list-decimal list-inside space-y-1.5 leading-relaxed pl-1">
                      {detailModalConnector.metadata.setupGuide.map((step: string, idx: number) => (
                        <li key={idx} className="text-xs text-slate-800 dark:text-slate-200">
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p>Refer to official API documentation for authentication details.</p>
                  )}
                </div>

                {/* Claude Desktop Config Snippet */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Code2 className="h-4 w-4 text-indigo-500" />
                    <span>Claude Desktop MCP Client Config (`claude_desktop_config.json`):</span>
                  </h4>
                  <pre className="p-3 bg-slate-900 dark:bg-slate-950 text-emerald-400 rounded-xl font-mono text-[11px] border border-slate-800 overflow-x-auto">
{`{
  "mcpServers": {
    "${detailModalConnector.slug}": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "${activeApiUrl}/api/v1/mcp/u/${currentWorkspace?.id || 'ws_default'}"],
      "headers": {
        "Authorization": "Bearer YOUR_WORKSPACE_API_KEY"
      }
    }
  }
}`}
                  </pre>
                </div>
              </div>
            )}

            {detailActiveTab === 'OVERVIEW' && (
              <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
                <p className="leading-relaxed">{detailModalConnector.description}</p>
                {detailModalConnector.metadata?.documentationUrl && (
                  <a
                    href={detailModalConnector.metadata.documentationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>View Official API Documentation</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {detailActiveTab === 'TOOLS' && (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {detailModalConnector.tools?.map((t: any) => (
                  <div key={t.id} className="p-3 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 block">{t.namespacedName}</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.description}</p>
                  </div>
                ))}
              </div>
            )}

            {detailActiveTab === 'AUTH' && (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="block font-bold text-slate-900 dark:text-white">Authentication Method</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 mt-1 block">{detailModalConnector.authType}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setModalConnector(detailModalConnector);
                  setDetailModalConnector(null);
                }}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 shadow-md"
              >
                Connect Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto MCP Generator Modal */}
      <AutoMcpModal
        isOpen={autoMcpOpen}
        onClose={() => setAutoMcpOpen(false)}
        onSuccess={() => {
          setAutoMcpOpen(false);
          if (typeof (window as any).loadMarketplaceData === 'function') {
            (window as any).loadMarketplaceData();
          }
        }}
      />
    </div>
  );
}
