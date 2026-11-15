import React, { useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Mail, Shield, User as UserIcon } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { requestPasswordReset, resendVerificationEmail } from '../../services/authService';
import { updateUserPreferences } from '../../services/firestoreService';
import type { CurrencyCode, Language } from '../../types/smm';
import { formatTimestamp } from '../../utils/format';

export function SettingsView() {
  const {
    t,
    firebaseUser,
    profile,
    language,
    setLanguage,
    currency,
    setCurrency,
    openAuthModal,
    pushToast,
  } = useApp();

  const [displayName, setDisplayName] = useState(profile?.displayName || 'MAHIR DEV');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.displayName) setDisplayName(profile.displayName);
  }, [profile?.displayName]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) {
      openAuthModal('login');
      return;
    }
    setSaving(true);
    try {
      await updateUserPreferences(firebaseUser.uid, {
        displayName: displayName.trim().slice(0, 80) || 'MAHIR DEV',
        language,
      });
      pushToast('Settings Saved', 'success', 'Profile and language preferences updated.');
    } catch (err) {
      pushToast(
        'Save Failed',
        'error',
        err instanceof Error ? err.message : 'Unable to save settings.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!firebaseUser?.email) {
      openAuthModal('reset');
      return;
    }
    try {
      await requestPasswordReset(firebaseUser.email);
      pushToast('Reset Email Sent', 'success', `Sent password reset link to ${firebaseUser.email}.`);
    } catch (err) {
      pushToast(
        'Reset Failed',
        'error',
        err instanceof Error ? err.message : 'Unable to send password reset email.'
      );
    }
  };

  const handleResendVerification = async () => {
    if (!firebaseUser) return;
    try {
      await resendVerificationEmail(firebaseUser);
      pushToast('Verification Email Sent', 'success', 'Check your inbox to verify your email.');
    } catch (err) {
      pushToast(
        'Request Failed',
        'error',
        err instanceof Error ? err.message : 'Unable to resend verification email.'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('settingsTitle')}</h1>
        <p className="text-xs text-violet-300/80 mt-1">
          Manage your MAHIR DEV profile, language, display currency, and security credentials
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <form
          onSubmit={handleSaveProfile}
          className="xl:col-span-7 glass-panel rounded-2xl p-6 space-y-5"
        >
          <div className="flex items-center gap-3">
            <UserIcon className="w-5 h-5 text-sky-300" />
            <h2 className="text-base font-bold text-white">Profile &amp; Localization</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1.5">
                UI Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3.5 py-2.5 text-sm text-white"
              >
                <option value="en">English (Default)</option>
                <option value="bn">বাংলা (Bengali)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1.5">
                Display Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3.5 py-2.5 text-sm font-mono text-white"
              >
                <option value="BDT">BDT (৳)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="neon-button-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>

        {/* Account Security & Info */}
        <div className="xl:col-span-5 glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-sky-300" />
            <h2 className="text-base font-bold text-white">Account Security</h2>
          </div>

          {firebaseUser && profile ? (
            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-[#0B051A] border border-violet-500/15 p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-violet-300/75">User UID</span>
                  <span className="font-mono text-white">{profile.uid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-violet-300/75">Email</span>
                  <span className="text-white">{profile.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-violet-300/75">Membership</span>
                  <span className="text-sky-300 font-semibold capitalize">
                    {profile.membershipLevel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-violet-300/75">Registered</span>
                  <span className="text-violet-200">{formatTimestamp(profile.createdAt)}</span>
                </div>
              </div>

              <div className="rounded-xl bg-[#0B051A] border border-violet-500/15 p-3.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-violet-300" />
                  <span className="text-violet-100">
                    Email Verification:{' '}
                    {firebaseUser.emailVerified ? (
                      <strong className="text-emerald-300 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </strong>
                    ) : (
                      <strong className="text-amber-300">Unverified</strong>
                    )}
                  </span>
                </div>
                {!firebaseUser.emailVerified && (
                  <button
                    type="button"
                    onClick={() => void handleResendVerification()}
                    className="text-sky-300 hover:underline font-semibold"
                  >
                    Resend
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => void handlePasswordReset()}
                className="w-full rounded-xl py-2.5 px-4 bg-white/[0.05] hover:bg-white/[0.1] border border-violet-400/25 text-xs font-semibold text-white flex items-center justify-center gap-2 transition-colors"
              >
                <KeyRound className="w-4 h-4 text-sky-300" />
                <span>Send Password Reset Email</span>
              </button>
            </div>
          ) : (
            <div className="py-6 text-center space-y-3">
              <p className="text-xs text-violet-300/80">
                Sign in to manage your account credentials and security settings.
              </p>
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="neon-button-primary rounded-xl px-4 py-2 text-xs font-semibold text-white"
              >
                Sign In / Register
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
