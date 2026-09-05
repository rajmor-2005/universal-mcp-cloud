'use client';

import { useState } from 'react';
import { ShieldCheck, Key, Fingerprint, Lock, CheckCircle2, User, QrCode, Sun, Moon } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';

export default function SettingsPage() {
  const { user, theme, toggleTheme } = useAuth();
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [mfaSecret, setMfaSecret] = useState<any | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      setProfileSuccess(false);
      await apiRequest('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: nameInput }),
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSetupMfa = async () => {
    try {
      const res = await apiRequest('/auth/mfa/setup', { method: 'POST' });
      setMfaSecret(res);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'MFA setup failed');
    }
  };

  const handleVerifyMfa = async () => {
    try {
      await apiRequest('/auth/mfa/enable', {
        method: 'POST',
        body: JSON.stringify({ token: totpCode }),
      });
      setMfaSuccess(true);
      setMfaSecret(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Invalid TOTP code');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* User Profile */}
      <form onSubmit={handleUpdateProfile} className="glass-card p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Profile Settings</span>
          </h3>
          {profileSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Profile updated!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              defaultValue={user?.email || ''}
              disabled
              className="w-full px-3 py-2 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingProfile}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
          >
            {savingProfile ? 'Saving Changes...' : 'Save Profile'}
          </button>
        </div>
      </form>

      {/* Theme Preference Settings */}
      <div className="glass-card p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {theme === 'light' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-400" />}
          <span>Appearance & Theme</span>
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Interface Mode</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Switch between clean light mode and dark mode.</p>
          </div>

          <button
            onClick={toggleTheme}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-2"
          >
            {theme === 'light' ? (
              <>
                <Moon className="h-3.5 w-3.5" />
                <span>Enable Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                <span>Enable Light Mode</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Security & Multi-Factor Auth */}
      <div className="glass-card p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Security & Authentication</span>
        </h3>

        {/* Two-Factor Authentication (TOTP) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Two-Factor Authentication (TOTP)</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Protect your account with Google Authenticator or 1Password.</p>
              </div>
            </div>

            <button
              onClick={handleSetupMfa}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors"
            >
              {user?.mfaEnabled ? 'Manage 2FA' : 'Set Up 2FA'}
            </button>
          </div>

          {mfaSecret && (
            <div className="p-4 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
              <p className="text-xs text-slate-700 dark:text-slate-300">Scan this QR code with your authenticator app:</p>
              {mfaSecret.qrCodeUrl && (
                <img src={mfaSecret.qrCodeUrl} alt="TOTP QR Code" className="h-36 w-36 rounded-xl border p-2 bg-white" />
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="6-digit TOTP code"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white font-mono"
                />
                <button
                  onClick={handleVerifyMfa}
                  className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg"
                >
                  Verify & Enable
                </button>
              </div>
            </div>
          )}

          {mfaSuccess && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> 2FA successfully enabled on your account!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
