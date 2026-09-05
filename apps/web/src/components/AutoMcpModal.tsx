'use client';

import { useState } from 'react';
import { Zap, Link as LinkIcon, Code, Key, CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

export function AutoMcpModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { currentWorkspace } = useAuth();
  const [inputMode, setInputMode] = useState<'URL' | 'RAW'>('URL');
  const [apiUrl, setApiUrl] = useState('');
  const [rawJson, setRawJson] = useState('');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleAutoImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || loading) return;

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      let payload: Record<string, any> = {
        name,
        apiKey: apiKey || undefined,
        bearerToken: bearerToken || undefined,
      };

      if (inputMode === 'URL') {
        if (!apiUrl) throw new Error('Please enter an API URL or Swagger JSON/YAML URL');
        payload.url = apiUrl;
      } else {
        if (!rawJson) throw new Error('Please paste an OpenAPI JSON specification');
        try {
          payload.rawSpec = JSON.parse(rawJson);
        } catch {
          throw new Error('Invalid JSON format in specification');
        }
      }

      const res = await apiRequest(`/connectors/workspace/${currentWorkspace.id}/auto-import`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setResult(res);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-generate MCP tools');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel p-6 rounded-3xl max-w-lg w-full border border-indigo-500/30 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Auto-Generate MCP Server</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  AI ENGINE
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paste any API URL, Swagger JSON, or Swagger spec URL to generate MCP tools instantly.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <span>Successfully Generated {result.toolsGenerated} MCP Tools!</span>
            </div>
            <p className="font-mono text-[11px] text-emerald-200">
              Connector: {result.connectorName} ({result.baseUrl})
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              {result.tools?.slice(0, 5).map((t: string) => (
                <span key={t} className="px-2 py-0.5 bg-emerald-500/20 rounded font-mono text-[10px]">
                  {t}
                </span>
              ))}
              {result.tools?.length > 5 && (
                <span className="px-2 py-0.5 bg-emerald-500/20 rounded font-mono text-[10px]">
                  +{result.tools.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleAutoImport} className="space-y-4">
          {/* Mode Switcher */}
          <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setInputMode('URL')}
              className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                inputMode === 'URL' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              <span>API / Swagger URL</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('RAW')}
              className={`flex-1 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                inputMode === 'RAW' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              <span>Paste JSON Spec</span>
            </button>
          </div>

          {inputMode === 'URL' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">API Base URL or OpenAPI JSON URL</label>
              <input
                type="url"
                required
                placeholder="e.g. https://petstore.swagger.io/v2/swagger.json"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Paste OpenAPI 3.0 / Swagger JSON</label>
              <textarea
                rows={4}
                required
                placeholder='{"openapi": "3.0.0", "info": {"title": "Inventory API"...'
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Connector Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Internal Inventory API"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">API Key / Bearer Token</label>
              <input
                type="password"
                placeholder="Optional API key or secret"
                value={apiKey || bearerToken}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setBearerToken(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>{loading ? 'Parsing Endpoints & Building MCP Tools...' : 'Auto-Generate MCP Tools'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
