'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Plug, Terminal, Globe, ArrowRight, Check, ExternalLink, Zap } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import Link from 'next/link';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const { currentWorkspace } = useAuth();
  const [query, setQuery] = useState('');
  const [marketplace, setMarketplace] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus input on open
    setTimeout(() => inputRef.current?.focus(), 50);

    const loadData = async () => {
      try {
        setLoading(true);
        const [marketData, toolData] = await Promise.all([
          apiRequest<any[]>('/connectors/marketplace'),
          currentWorkspace ? apiRequest<any[]>(`/connectors/workspace/${currentWorkspace.id}/tools`).catch(() => []) : [],
        ]);

        setMarketplace(marketData || []);
        setTools(toolData || []);
      } catch (err) {
        console.error('Search data load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, currentWorkspace?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const filteredMarketplace = marketplace.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.description.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase()),
  );

  const filteredTools = tools.filter(
    (t) =>
      t.namespacedName?.toLowerCase().includes(query.toLowerCase()) ||
      t.description?.toLowerCase().includes(query.toLowerCase()) ||
      t.connectorName?.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center gap-3">
          <Search className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search all MCP apps, cloud providers, exposed tools, or web services..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-0"
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results Container */}
        <div className="p-4 overflow-y-auto space-y-6 flex-1 text-xs">
          {loading && (
            <p className="text-slate-400 text-center py-8">Searching cloud MCP connectors & tools...</p>
          )}

          {!loading && filteredMarketplace.length === 0 && filteredTools.length === 0 && (
            <div className="text-center py-10 space-y-2">
              <Globe className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No matching MCP provider or tool found</p>
              <p className="text-slate-400 text-[11px]">Try searching for "github", "slack", "notion", "stripe", "issue", or "create".</p>
            </div>
          )}

          {/* Section: MCP Connector Apps */}
          {filteredMarketplace.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-1">
                <span className="flex items-center gap-1.5">
                  <Plug className="h-3.5 w-3.5 text-indigo-500" />
                  MCP Connector Apps ({filteredMarketplace.length})
                </span>
                <Link href="/connectors" onClick={onClose} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Browse Marketplace
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredMarketplace.map((conn) => (
                  <Link
                    key={conn.id}
                    href="/connectors"
                    onClick={onClose}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 flex items-center justify-center shrink-0">
                        <img src={conn.iconUrl} alt={conn.name} className="h-4 w-4 object-contain" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs">{conn.name}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{conn.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Section: Exposed MCP Tools */}
          {filteredTools.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-1">
                <span className="flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5 text-purple-500" />
                  Exposed MCP Endpoint Tools ({filteredTools.length})
                </span>
                <Link href="/mcp-endpoint" onClick={onClose} className="text-purple-600 dark:text-purple-400 hover:underline">
                  Test Playground
                </Link>
              </div>

              <div className="space-y-2">
                {filteredTools.map((tool) => (
                  <Link
                    key={tool.id}
                    href="/mcp-endpoint"
                    onClick={onClose}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-purple-500/50 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-300 text-xs">
                          {tool.namespacedName}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                          {tool.connectorName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        {tool.description}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-purple-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-indigo-500" />
            Universal MCP Cloud Search
          </span>
          <span>Press <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[10px]">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
