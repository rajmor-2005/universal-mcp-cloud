'use client';

import { useState, useEffect } from 'react';
import { Boxes, Plus, Terminal, Users, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

export default function WorkspacesPage() {
  const { currentOrg, workspaces, currentWorkspace, setCurrentWorkspace, refreshData } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg || !name || !slug) return;

    try {
      setCreating(true);
      await apiRequest(`/organizations/${currentOrg.id}/workspaces`, {
        method: 'POST',
        body: JSON.stringify({ name, slug }),
      });

      setName('');
      setSlug('');
      setShowCreateModal(false);
      await refreshData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Workspaces</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Every workspace gets ONE isolated MCP endpoint with its own connected apps and secret vault keys.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="glass-panel p-6 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Workspace</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Workspace Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Analytics Team"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                }}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Slug Identifier</label>
              <input
                type="text"
                required
                placeholder="analytics-team"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-indigo-600 dark:text-indigo-300"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500"
              >
                {creating ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workspace Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {workspaces.map((ws) => {
          const isSelected = currentWorkspace?.id === ws.id;

          return (
            <div
              key={ws.id}
              onClick={() => setCurrentWorkspace(ws)}
              className={`glass-card p-6 rounded-2xl border flex flex-col justify-between space-y-4 cursor-pointer ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                    <Boxes className="h-5 w-5" />
                  </div>
                  {isSelected && (
                    <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Active</span>
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-4">{ws.name}</h3>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">{ws.slug}</p>
              </div>

              <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono text-[11px] truncate max-w-[200px]">
                  {ws.mcpEndpoint || `/mcp/u/${ws.id}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
