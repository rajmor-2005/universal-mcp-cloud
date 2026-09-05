'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Zap,
  ShieldCheck,
  Terminal,
  ArrowRight,
  CheckCircle2,
  Plug,
  Lock,
  Globe,
  Layers,
  Cpu,
  Workflow,
  Sparkles,
  ChevronRight,
  Code2,
} from 'lucide-react';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'architecture' | 'clients' | 'security'>('architecture');

  const workflowSteps = [
    {
      step: '01',
      title: 'Connect Any App or API',
      description: 'Connect GitHub, Slack, Notion, Stripe, Google Workspace, or custom REST/GraphQL APIs with OAuth, Bearer tokens, or API keys once.',
      icon: Plug,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    },
    {
      step: '02',
      title: 'Encrypted Vault Storage',
      description: 'Credentials are encrypted with AES-256-GCM and bound to your workspace with Additional Associated Data (AAD). Plaintext is never exposed.',
      icon: Lock,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    },
    {
      step: '03',
      title: 'Dynamic MCP Endpoint',
      description: 'A single, workspace-isolated URL automatically exposes every enabled tool using the standard Model Context Protocol (MCP 2024-11-05).',
      icon: Terminal,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    {
      step: '04',
      title: 'Instant AI Client Access',
      description: 'Paste your endpoint URL into Claude, Cursor, Windsurf, ChatGPT, or custom AI agents. Your AI can now execute real-world actions.',
      icon: Cpu,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
  ];

  const aiClients = [
    { name: 'Claude Desktop', category: 'Anthropic AI Client', status: 'Fully Supported', icon: '🤖' },
    { name: 'Cursor IDE', category: 'AI Code Editor', status: 'Fully Supported', icon: '⚡' },
    { name: 'Windsurf', category: 'Flow AI Editor', status: 'Fully Supported', icon: '🌊' },
    { name: 'Continue.dev', category: 'VS Code Extension', status: 'Fully Supported', icon: '⏩' },
    { name: 'Open WebUI', category: 'Open-Source AI Interface', status: 'Fully Supported', icon: '🌐' },
    { name: 'Custom Agents', category: 'LangChain & LlamaIndex', status: 'SDK Supported', icon: '🛠️' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#090d16] dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Header Navigation */}
      <header className="px-6 sm:px-12 py-5 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/60 glass-panel sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Zap className="h-5 w-5" />
          </div>
          <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
            Universal MCP Cloud
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]"
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-20 sm:py-28 max-w-5xl mx-auto text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 text-xs font-semibold mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Enterprise-Grade Universal AI Integration Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight max-w-4xl">
          Connect Apps Once.{' '}
          <span className="gradient-text">Use with Any AI Client.</span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
          The single endpoint platform that turns all your SaaS tools, APIs, and databases into a unified, secure Model Context Protocol (MCP) stream.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto px-7 py-3.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          >
            <span>Deploy Workspace Endpoint</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-7 py-3.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Terminal className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Open Interactive Dashboard</span>
          </Link>
        </div>

        {/* Live Architecture Flow Diagram */}
        <div className="mt-16 w-full max-w-4xl glass-card rounded-2xl p-6 sm:p-8 text-left space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">How Universal MCP Cloud Works</h3>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Protocol: MCP 2024-11-05
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {workflowSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-slate-400">{step.step}</span>
                      <div className={`p-2 rounded-lg border ${step.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">{step.title}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Clients Support Grid */}
      <section className="px-6 py-16 max-w-5xl mx-auto border-t border-slate-200/80 dark:border-slate-800/60">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Works Out of the Box With Any AI Client
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Standard Model Context Protocol compliance ensures zero lock-in and seamless integration.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {aiClients.map((client) => (
            <div key={client.name} className="glass-card p-4 rounded-xl flex items-center gap-3">
              <span className="text-2xl">{client.icon}</span>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{client.name}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{client.category}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800/60 py-8 px-6 text-center text-xs text-slate-500">
        <p>© 2026 Universal MCP Cloud Inc. Built with Next.js, NestJS, Prisma, Redis & Tailwind CSS.</p>
      </footer>
    </div>
  );
}
