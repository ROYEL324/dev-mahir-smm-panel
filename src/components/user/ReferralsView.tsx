import React, { useMemo, useState } from 'react';
import { Copy, Check, Gift, Users, Wallet } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { submitWithdrawalRequest } from '../../services/firestoreService';
import { formatCurrency, formatNumber, formatTimestamp, getStatusStyles } from '../../utils/format';

export function ReferralsView() {
  const {
    t,
    firebaseUser,
    profile,
    referrals,
    transactions,
    withdrawals,
    settings,
    currency,
    openAuthModal,
    pushToast,
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [wdMethod, setWdMethod] = useState('bKash');
  const [wdAccount, setWdAccount] = useState('');
  const [wdAmount, setWdAmount] = useState('100');
  const [submittingWd, setSubmittingWd] = useState(false);

  const referralCode = profile?.referralCode || 'SIGN_IN_FIRST';
  const referralLink =
    typeof window !== 'undefined' && profile
      ? `${window.location.origin}/?ref=${profile.referralCode}`
      : '';

  const referralTxs = useMemo(
    () => transactions.filter((tx) => tx.type === 'referral_bonus'),
    [transactions]
  );

  const totalEarnings = useMemo(() => {
    if (profile && profile.referralEarnings > 0) return profile.referralEarnings;
    return referrals.reduce((sum, r) => sum + (r.rewardAmount || 0), 0);
  }, [profile, referrals]);

  const handleCopy = async () => {
    if (!referralLink) {
      openAuthModal('login');
      return;
    }
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      pushToast('Referral link copied to clipboard', 'success');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      pushToast('Copy failed', 'error', 'Please copy the link manually.');
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile) {
      openAuthModal('login');
      return;
    }
    const amt = Number(wdAmount);
    if (!Number.isFinite(amt) || amt <= 0 || amt > profile.walletBalance) {
      pushToast('Invalid Withdrawal Amount', 'error', 'Amount exceeds your available balance.');
      return;
    }
    setSubmittingWd(true);
    try {
      await submitWithdrawalRequest({
        user: profile,
        method: wdMethod,
        accountDetails: wdAccount,
        amount: amt,
      });
      pushToast('Withdrawal Requested', 'success', 'Queued for administrator approval.');
      setWdAccount('');
    } catch (err) {
      pushToast(
        'Withdrawal Failed',
        'error',
        err instanceof Error ? err.message : 'Unable to submit request.'
      );
    } finally {
      setSubmittingWd(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('referralTitle')}</h1>
        <p className="text-xs text-violet-300/80 mt-1">
          Earn {settings.referralRewardPercent}% commission when invited users complete verified deposits
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-violet-300/75">{t('totalReferrals')}</p>
          <p className="text-2xl font-bold text-white font-mono tabular-nums mt-1.5">
            {formatNumber(referrals.length)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-violet-300/75">{t('referralEarnings')}</p>
          <p className="text-2xl font-bold text-emerald-300 font-mono tabular-nums mt-1.5">
            {formatCurrency(totalEarnings, currency, settings)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-violet-300/75">Commission Rate</p>
          <p className="text-2xl font-bold text-sky-300 font-mono tabular-nums mt-1.5">
            {settings.referralEnabled ? `${settings.referralRewardPercent}%` : 'Paused'}
          </p>
        </div>
      </div>

      {/* Link & Code Panel */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-sky-500 flex items-center justify-center">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Invite &amp; Earn</h2>
            <p className="text-xs text-violet-300/75">
              Self-referrals and duplicate accounts are automatically blocked
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-[#0B051A] border border-violet-500/20 p-3.5">
            <p className="text-[11px] text-violet-300/70">{t('yourReferralCode')}</p>
            <p className="text-sm font-mono font-bold text-white mt-1">{referralCode}</p>
          </div>
          <div className="md:col-span-2 rounded-xl bg-[#0B051A] border border-violet-500/20 p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-violet-300/70">{t('yourReferralLink')}</p>
              <p className="text-xs font-mono text-sky-300 truncate mt-1">
                {referralLink || 'Sign in to generate your unique referral URL'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="neon-button-primary rounded-xl px-4 py-2 text-xs font-semibold text-white inline-flex items-center gap-1.5 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : t('copyLink')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Referral List */}
        <div className="xl:col-span-7 glass-panel rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Referred Users &amp; Rewards</h2>
          {referrals.length === 0 && referralTxs.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-violet-500/20 rounded-2xl">
              <Users className="w-8 h-8 text-violet-400/70 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">No Referrals Yet</p>
              <p className="text-xs text-violet-300/70 mt-1">
                Share your referral link to invite friends and track rewards here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="rounded-xl p-3.5 bg-[#0B051A]/85 border border-violet-500/15 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{ref.referredEmail}</p>
                    <p className="text-[11px] text-violet-300/65 mt-0.5">
                      {formatTimestamp(ref.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono font-bold text-emerald-300 tabular-nums">
                      +{formatCurrency(ref.rewardAmount, currency, settings)}
                    </p>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] border capitalize ${getStatusStyles(
                        ref.status
                      )}`}
                    >
                      {ref.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Withdrawal Section (when enabled by admin) */}
        <div className="xl:col-span-5 glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Withdraw Funds</h2>
            <Wallet className="w-4 h-4 text-sky-300" />
          </div>

          {!settings.withdrawalEnabled ? (
            <p className="text-xs text-violet-300/75 leading-relaxed">
              Withdrawals are currently disabled by the administrator. Referral rewards are credited directly to your spendable wallet balance.
            </p>
          ) : (
            <>
              <form onSubmit={handleWithdrawal} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-violet-200 mb-1">Method</label>
                  <select
                    value={wdMethod}
                    onChange={(e) => setWdMethod(e.target.value)}
                    className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
                  >
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-violet-200 mb-1">
                    Account / Number
                  </label>
                  <input
                    type="text"
                    required
                    minLength={4}
                    value={wdAccount}
                    onChange={(e) => setWdAccount(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-violet-200 mb-1">
                    Amount (BDT ৳)
                  </label>
                  <input
                    type="number"
                    required
                    min={50}
                    step="0.01"
                    value={wdAmount}
                    onChange={(e) => setWdAmount(e.target.value)}
                    className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingWd}
                  className="w-full neon-button-primary rounded-xl py-2.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {submittingWd ? 'Submitting...' : 'Request Withdrawal'}
                </button>
              </form>

              {withdrawals.length > 0 && (
                <div className="mt-5 pt-4 border-t border-violet-500/15 space-y-2">
                  <p className="text-xs font-semibold text-violet-200">Recent Withdrawals</p>
                  {withdrawals.slice(0, 4).map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-violet-500/10"
                    >
                      <span className="text-violet-200 truncate">
                        {w.method} · {w.accountDetails}
                      </span>
                      <span className="font-mono text-white shrink-0 ml-2">
                        {formatCurrency(w.amount, currency, settings)} ({w.status})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
