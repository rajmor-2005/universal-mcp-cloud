'use client';

import { Bell, Search, Terminal, Copy, Check, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { GlobalSearchModal } from './GlobalSearchModal';

export function Header({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { currentWorkspace, theme, toggleTheme } = useAuth();

  const endpointUrl = currentWorkspace?.mcpEndpoint || `http://localhost:4000/mcp/u/${currentWorkspace?.id || 'ws_default'}`;

  const copyEndpoint = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA'].includes(activeTag || '')) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="h-16 glass-panel px-6 flex items-center justify-between sticky top-0 z-10 transition-colors duration-200">
        <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>

        <div className="flex items-center gap-3">
          {/* Endpoint Quick Copy Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs">
            <Terminal className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-slate-600 dark:text-slate-400 max-w-[260px] truncate">{endpointUrl}</span>
            <button
              onClick={copyEndpoint}
              className="ml-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Copy MCP Endpoint"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Global Search Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="relative hidden sm:flex items-center gap-2 pl-3 pr-3 py-1.5 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400 hover:border-indigo-500/50 transition-colors w-48 text-left"
          >
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="truncate flex-1">Search apps & tools...</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-200 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
              ⌘K
            </kbd>
          </button>

          {/* Mobile Search Icon Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Theme Switcher Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900"></span>
          </button>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
