'use client';

import { useState, useEffect } from 'react';
import { Check, Zap, CreditCard, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

const plans = [
  { name: 'FREE', price: '$0', period: '/month', apps: '3 Connected Apps', calls: '1,000 Tool Calls/mo', seats: '2 Seats' },
  { name: 'STARTER', price: '$29', period: '/month', apps: '10 Connected Apps', calls: '10,000 Tool Calls/mo', seats: '5 Seats', popular: true },
  { name: 'PRO', price: '$99', period: '/month', apps: '25 Connected Apps', calls: '100,000 Tool Calls/mo', seats: '20 Seats' },
  { name: 'ENTERPRISE', price: 'Custom', period: '', apps: 'Unlimited Apps', calls: 'Unlimited Calls', seats: 'Unlimited Seats' },
];

export default function BillingPage() {
  const { currentOrg } = useAuth();
  const [subData, setSubData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSubscription() {
      if (!currentOrg) return;
      try {
        setLoading(true);
        const res = await apiRequest(`/billing/organizations/${currentOrg.id}/subscription`);
        setSubData(res);
      } catch (err) {
        console.error('Failed to load subscription:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSubscription();
  }, [currentOrg?.id]);

  const currentPlan = subData?.subscription?.plan || 'FREE';
  const toolCallsUsed = subData?.usage?.toolCalls || 0;
  const toolCallsLimit = subData?.limits?.maxToolCallsPerMonth || 1000;
  const toolCallsPercent = Math.min(100, Math.round((toolCallsUsed / toolCallsLimit) * 100));

  const appsUsed = subData?.usage?.connectedApps || 0;
  const appsLimit = subData?.limits?.maxConnectedApps || 3;
  const appsPercent = Math.min(100, Math.round((appsUsed / appsLimit) * 100));

  const seatsUsed = subData?.usage?.activeSeats || 1;
  const seatsLimit = subData?.limits?.maxSeats || 2;
  const seatsPercent = Math.min(100, Math.round((seatsUsed / seatsLimit) * 100));

  return (
    <div className="space-y-8">
      {/* Current Subscription Header */}
      <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            Current Plan: {currentPlan}
          </span>
          <h2 className="text-xl font-bold text-white mt-2">Active Subscription</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time usage and capacity metrics for organization: <span className="font-semibold text-slate-200">{currentOrg?.name}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
            Upgrade Plan
          </button>
          <button className="px-4 py-2 text-xs font-semibold rounded-xl glass-card text-slate-300 border border-slate-700/60">
            Payment Methods
          </button>
        </div>
      </div>

      {/* Usage Meter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-400">Tool Calls Meter</span>
            <span className="text-white font-bold">{toolCallsUsed.toLocaleString()} / {toolCallsLimit.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full transition-all" style={{ width: `${toolCallsPercent}%` }}></div>
          </div>
          <p className="text-[11px] text-slate-500">{toolCallsPercent}% used this period</p>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-400">Connected Apps</span>
            <span className="text-white font-bold">{appsUsed} / {appsLimit}</span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full transition-all" style={{ width: `${appsPercent}%` }}></div>
          </div>
          <p className="text-[11px] text-slate-500">{appsPercent}% capacity used</p>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-3">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-400">Active Seats</span>
            <span className="text-white font-bold">{seatsUsed} / {seatsLimit}</span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${seatsPercent}%` }}></div>
          </div>
          <p className="text-[11px] text-slate-500">{seatsPercent}% seat capacity used</p>
        </div>
      </div>

      {/* Plans Pricing Grid */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white">Available Plans</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const isCurrent = currentPlan.toUpperCase() === plan.name.toUpperCase();
            return (
              <div
                key={plan.name}
                className={`glass-card p-6 rounded-2xl flex flex-col justify-between border relative ${
                  plan.popular
                    ? 'border-indigo-500/50 shadow-xl shadow-indigo-500/10'
                    : 'border-slate-800'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-bold rounded-full bg-indigo-600 text-white uppercase tracking-wider shadow-md">
                    Most Popular
                  </span>
                )}

                <div>
                  <h4 className="text-base font-bold text-white">{plan.name}</h4>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                    <span className="text-xs text-slate-400 ml-1">{plan.period}</span>
                  </div>

                  <ul className="mt-6 space-y-3 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>{plan.apps}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>{plan.calls}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>{plan.seats}</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8">
                  {isCurrent ? (
                    <button disabled className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-400 font-semibold text-xs border border-slate-700/60">
                      Current Plan
                    </button>
                  ) : (
                    <button className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md">
                      Select Plan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
