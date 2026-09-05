'use client';

import { useState, useEffect } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Key,
  ShieldCheck,
  Zap,
  Play,
  Layers,
  Code2,
  Plus,
  Trash2,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

export default function McpEndpointPage() {
  const { currentWorkspace, currentOrg } = useAuth();
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyModal, setNewKeyModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [selectedApiKey, setSelectedApiKey] = useState<string>('');

  // Tool tester state
  const [testTool, setTestTool] = useState('github.list_repositories');
  const [testArgs, setTestArgs] = useState('{\n  "type": "owner"\n}');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const endpointUrl = `http://localhost:4000/api/v1/mcp/u/${currentWorkspace?.id || 'default'}`;

  const loadApiKeys = async () => {
    if (!currentOrg || !currentWorkspace) return;
    try {
      const keys = await apiRequest<any[]>(
        `/organizations/${currentOrg.id}/workspaces/${currentWorkspace.id}/api-keys`,
      );
      setApiKeys(keys || []);
    } catch (err) {
      console.error('Failed to load API keys:', err);
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, [currentOrg?.id, currentWorkspace?.id]);

  const copyEndpoint = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  const copyKeyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !currentWorkspace || !keyName) return;

    try {
      const result = await apiRequest(
        `/organizations/${currentOrg.id}/workspaces/${currentWorkspace.id}/api-keys`,
        {
          method: 'POST',
          body: JSON.stringify({ name: keyName }),
        },
      );

      setGeneratedKey(result.key);
      setSelectedApiKey(result.key);
      setKeyName('');
      await loadApiKeys();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create API key');
    }
  };

  const runTestCall = async () => {
    if (!currentWorkspace) return;
    setExecuting(true);
    setTestResponse(null);

    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(testArgs);
      } catch {
        alert('Invalid JSON arguments');
        setExecuting(false);
        return;
      }

      if (!selectedApiKey) {
        setTestResponse(JSON.stringify({ error: 'Please select an API Key before testing tool execution' }, null, 2));
        setExecuting(false);
        return;
      }

      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${selectedApiKey}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: testTool,
            arguments: parsedArgs,
          },
        }),
      });

      const data = await res.json();
      setTestResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setTestResponse(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }, null, 2));
    } finally {
      setExecuting(false);
    }
  };

  const [clientTab, setClientTab] = useState<'CLAUDE' | 'CURSOR' | 'WINDSURF' | 'CHATGPT'>('CLAUDE');

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-indigo-500/20 bg-gradient-to-r from-slate-50 via-indigo-50/50 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Workspace MCP Endpoint</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Connect Claude Desktop, Cursor, Windsurf, ChatGPT, or any MCP AI client to this single URL.
            </p>
          </div>
        </div>

        {/* Endpoint Display */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-indigo-600 dark:text-indigo-300 flex items-center justify-between shadow-inner">
            <span className="truncate">{endpointUrl}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-semibold bg-emerald-500/10 px-2 py-0.5 rounded ml-2">
              ACTIVE
            </span>
          </div>
          <button
            onClick={copyEndpoint}
            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
          >
            {copiedEndpoint ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copiedEndpoint ? 'Copied!' : 'Copy Endpoint'}</span>
          </button>
        </div>
      </div>

      {/* API Key Management & 1-Click Client Exporters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-500" />
              <span>Workspace Access Keys</span>
            </h3>
            <button
              onClick={() => setNewKeyModal(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Key</span>
            </button>
          </div>

          <div className="space-y-2">
            {apiKeys.length === 0 ? (
              <p className="text-xs text-slate-400">No API keys generated yet.</p>
            ) : (
              apiKeys.map((k) => (
                <div key={k.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{k.name}</p>
                    <p className="font-mono text-[10px] text-slate-400">{k.keyPrefix}...</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Used: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 1-Click Multi-AI Client Exporter */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Code2 className="h-4 w-4 text-indigo-500" />
              <span>1-Click AI Client Exporter</span>
            </h3>
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-0.5 text-[10px] font-semibold">
              {(['CLAUDE', 'CURSOR', 'WINDSURF', 'CHATGPT'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setClientTab(tab)}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    clientTab === tab
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {clientTab === 'CLAUDE' && (
            <div className="space-y-4">
              {/* Option 1: Custom Connector UI Modal */}
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400">Method A: Claude "Add custom connector" Modal</span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded">UI PASTE</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">1. Name</label>
                    <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg font-mono text-slate-200 text-[11px]">
                      <span>Universal MCP Cloud</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('Universal MCP Cloud');
                          setCopiedKey('claude-name');
                          setTimeout(() => setCopiedKey(null), 2000);
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedKey === 'claude-name' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">2. Remote MCP server URL</label>
                    <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg font-mono text-indigo-300 text-[11px] truncate">
                      <span className="truncate">{`${endpointUrl}/sse?apiKey=${selectedApiKey || 'umcp_dev_key'}`}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${endpointUrl}/sse?apiKey=${selectedApiKey || 'umcp_dev_key'}`);
                          setCopiedKey('claude-url');
                          setTimeout(() => setCopiedKey(null), 2000);
                        }}
                        className="text-slate-400 hover:text-white shrink-0 ml-2"
                      >
                        {copiedKey === 'claude-url' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 2: Config file */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-400">Method B: `claude_desktop_config.json` File:</span>
                <pre className="p-3 bg-slate-900 dark:bg-slate-950 text-slate-200 dark:text-slate-300 rounded-xl font-mono text-[11px] border border-slate-200 dark:border-slate-800 overflow-x-auto">
{`{
  "mcpServers": {
    "universal-mcp": {
      "command": "node",
      "args": ["D:/automcp_project/mcp-bridge.js"],
      "env": {
        "MCP_SERVER_URL": "${endpointUrl}",
        "MCP_API_KEY": "${selectedApiKey || 'YOUR_API_KEY'}"
      }
    }
  }
}`}
                </pre>
              </div>
            </div>
          )}

          {clientTab === 'CURSOR' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">Add to `.cursor/mcp.json`:</p>
              <pre className="p-3 bg-slate-900 dark:bg-slate-950 text-slate-200 dark:text-slate-300 rounded-xl font-mono text-[11px] border border-slate-200 dark:border-slate-800 overflow-x-auto">
{`{
  "mcpServers": {
    "universal-mcp": {
      "url": "${endpointUrl}",
      "headers": {
        "Authorization": "Bearer ${selectedApiKey || 'YOUR_API_KEY'}"
      }
    }
  }
}`}
              </pre>
            </div>
          )}

          {clientTab === 'WINDSURF' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">Add to `~/.codeium/windsurf/mcp_config.json`:</p>
              <pre className="p-3 bg-slate-900 dark:bg-slate-950 text-slate-200 dark:text-slate-300 rounded-xl font-mono text-[11px] border border-slate-200 dark:border-slate-800 overflow-x-auto">
{`{
  "mcpServers": {
    "universal-mcp": {
      "serverUrl": "${endpointUrl}",
      "apiKey": "${selectedApiKey || 'YOUR_API_KEY'}"
    }
  }
}`}
              </pre>
            </div>
          )}

          {clientTab === 'CHATGPT' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">Paste in ChatGPT Custom GPT Action Schema URL:</p>
              <div className="p-3 bg-slate-900 dark:bg-slate-950 text-indigo-400 rounded-xl font-mono text-[11px] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="truncate">{`${endpointUrl}/openapi.json`}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${endpointUrl}/openapi.json`);
                    setCopiedKey('openapi');
                    setTimeout(() => setCopiedKey(null), 2000);
                  }}
                  className="text-slate-400 hover:text-white ml-2"
                >
                  {copiedKey === 'openapi' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Key Modal */}
      {newKeyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateApiKey} className="glass-panel p-6 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Workspace API Key</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Key Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Claude Desktop Key"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            {generatedKey && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">API Key Created! Copy it now (shown only once):</p>
                <div className="flex items-center justify-between font-mono text-xs text-emerald-700 dark:text-emerald-200">
                  <span className="truncate">{generatedKey}</span>
                  <button type="button" onClick={() => copyKeyText(generatedKey)} className="ml-2 text-emerald-600 dark:text-emerald-300">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setNewKeyModal(false); setGeneratedKey(null); }}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              {!generatedKey && (
                <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white">
                  Generate Key
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Interactive Tool Playground */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Play className="h-4 w-4 text-emerald-500" />
          <span>Interactive Tool Execution Playground</span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Tool</label>
              <input
                type="text"
                value={testTool}
                onChange={(e) => setTestTool(e.target.value)}
                placeholder="github.list_repositories"
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Arguments (JSON)</label>
              <textarea
                rows={5}
                value={testArgs}
                onChange={(e) => setTestArgs(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 dark:bg-slate-950 font-mono text-xs text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>

            <button
              onClick={runTestCall}
              disabled={executing}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{executing ? 'Executing...' : 'Send JSON-RPC Tool Request'}</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Live MCP Output Response</label>
            <pre className="p-4 bg-slate-900 dark:bg-slate-950 h-56 rounded-xl font-mono text-[11px] text-emerald-400 border border-slate-200 dark:border-slate-800 overflow-y-auto">
              {testResponse || '// Response will appear here after execution...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
