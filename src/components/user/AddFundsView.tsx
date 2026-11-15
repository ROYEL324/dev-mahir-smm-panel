import React, { useMemo, useState } from 'react';
import { Check, Copy, CreditCard, ShieldAlert, Wallet } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { submitDepositClaim } from '../../services/firestoreService';
import { formatCurrency, formatTimestamp, getStatusStyles } from '../../utils/format';

export function AddFundsView() {
  const {
    t,
    firebaseUser,
    profile,
    deposits,
    settings,
    currency,
    openAuthModal,
    pushToast,
  } = useApp();

  const availableMethods = useMemo(() => {
    const list: Array<{ id: string; label: string; number: string; instructions: string }> = [];
    if (settings.bkashEnabled) {
      list.push({
        id: 'bKash',
        label: 'bKash (BDT)',
        number: settings.bkashNumber || '01804515459',
        instructions: settings.bkashInstructions,
      });
    }
    if (settings.nagadEnabled) {
      list.push({
        id: 'Nagad',
        label: 'Nagad (BDT)',
        number: settings.nagadNumber || '01804515459',
        instructions: settings.nagadInstructions,
      });
    }
    if (list.length === 0) {
      list.push({
        id: 'Manual Bank / Gateway',
        label: 'Approved Gateway Transfer',
        number: '',
        instructions: 'Submit verified payment reference details for administrator approval.',
      });
    }
    return list;
  }, [settings]);

  const [method, setMethod] = useState(availableMethods[0]?.id || 'bKash');
  const [amount, setAmount] = useState<string>(String(settings.minDeposit || 50));
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedNum, setCopiedNum] = useState(false);

  const activeMethodObj = useMemo(
    () => availableMethods.find((m) => m.id === method) || availableMethods[0],
    [availableMethods, method]
  );

  const handleCopyNumber = async (num: string) => {
    if (!num) return;
    try {
      await navigator.clipboard.writeText(num);
      setCopiedNum(true);
      pushToast('Payment Number Copied', 'success', `${method}: ${num}`);
      window.setTimeout(() => setCopiedNum(false), 2000);
    } catch {
      pushToast('Copy failed', 'error', 'Please copy the number manually.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile) {
      openAuthModal('login');
      return;
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount < settings.minDeposit) {
      pushToast(
        'Invalid Deposit Amount',
        'error',
        `Minimum deposit is ৳${settings.minDeposit}.`
      );
      return;
    }

    if (senderNumber.trim().length < 4 || transactionRef.trim().length < 4) {
      pushToast(
        'Missing Payment Details',
        'error',
        'Provide your valid sender number and transaction reference ID.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await submitDepositClaim({
        user: profile,
        method,
        amount: numAmount,
        senderNumber,
        transactionRef,
      });
      pushToast(
        'Deposit Request Submitted',
        'success',
        'Your payment claim is queued for verified confirmation before wallet credit.'
      );
      setSenderNumber('');
      setTransactionRef('');
    } catch (err) {
      pushToast(
        'Submission Failed',
        'error',
        err instanceof Error ? err.message : 'Unable to submit deposit.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('addFundsTitle')}</h1>
        <p className="text-xs text-violet-300/80 mt-1">
          Submit verified bKash, Nagad, or approved gateway deposits
        </p>
      </div>

      {/* Wallet Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-violet-300/75">{t('currentBalance')}</p>
          <p className="text-2xl font-bold text-white font-mono tabular-nums mt-1.5">
            {formatCurrency(profile?.walletBalance || 0, currency, settings)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-violet-300/75">{t('totalDeposits')}</p>
          <p className="text-2xl font-bold text-emerald-300 font-mono tabular-nums mt-1.5">
            {formatCurrency(profile?.totalDeposits || 0, currency, settings)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs text-violet-300/75">{t('totalSpending')}</p>
          <p className="text-2xl font-bold text-sky-300 font-mono tabular-nums mt-1.5">
            {formatCurrency(profile?.totalSpending || 0, currency, settings)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Deposit Form */}
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-6 glass-panel rounded-2xl p-6 space-y-5"
        >
          <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3.5 flex items-start gap-2.5 text-xs text-amber-100 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <span>{t('depositSecurityNotice')}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-2">
              {t('paymentMethod')}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {availableMethods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold border flex items-center justify-center gap-2 transition-colors ${
                    method === m.id
                      ? 'bg-violet-600/35 border-violet-400 text-white'
                      : 'bg-[#0B051A] border-violet-500/20 text-violet-200/80 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-sky-300" />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {activeMethodObj && (
            <div className="rounded-xl bg-[#0B051A] border border-violet-500/25 p-4 space-y-2.5">
              {activeMethodObj.number && (
                <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-violet-500/15">
                  <div>
                    <p className="text-[11px] text-violet-300/75">
                      Official {activeMethodObj.id} Number (Send Money)
                    </p>
                    <p className="text-lg font-mono font-bold text-sky-300 tracking-wider mt-0.5">
                      {activeMethodObj.number}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopyNumber(activeMethodObj.number)}
                    className="px-3 py-1.5 rounded-lg bg-violet-600/25 hover:bg-violet-600/45 border border-violet-400/30 text-xs font-semibold text-white inline-flex items-center gap-1.5 shrink-0"
                  >
                    {copiedNum ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedNum ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
              <p className="text-xs text-violet-200/85 leading-relaxed">
                {activeMethodObj.instructions}
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-violet-200">
                {t('depositAmount')} (BDT ৳)
              </label>
              <span className="text-[11px] text-violet-300/70 font-mono">
                Min ৳{settings.minDeposit}
              </span>
            </div>
            <input
              type="number"
              required
              min={settings.minDeposit}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3.5 py-2.5 text-sm font-mono tabular-nums text-white focus:outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1.5">
              {t('senderNumber')}
            </label>
            <input
              type="text"
              required
              minLength={4}
              value={senderNumber}
              onChange={(e) => setSenderNumber(e.target.value)}
              placeholder="e.g. 017XXXXXXXX"
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3.5 py-2.5 text-sm text-white placeholder:text-violet-400/40 focus:outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1.5">
              {t('txReference')}
            </label>
            <input
              type="text"
              required
              minLength={4}
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. BKH8923XY10"
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-violet-400/40 focus:outline-none focus:border-violet-400"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full neon-button-primary rounded-xl py-3 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting
              ? 'Submitting Claim...'
              : firebaseUser
                ? t('submitDeposit')
                : 'Sign In to Add Funds'}
          </button>
        </form>

        {/* Deposit History */}
        <div className="xl:col-span-6 glass-panel rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Deposit Requests</h2>
          {deposits.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-violet-500/20 rounded-2xl">
              <Wallet className="w-8 h-8 text-violet-400/70 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">No Deposit History</p>
              <p className="text-xs text-violet-300/70 mt-1">
                Submitted payment claims and approval statuses will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {deposits.map((dep) => (
                <div
                  key={dep.id}
                  className="rounded-xl p-4 bg-[#0B051A]/85 border border-violet-500/15 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-mono tabular-nums">
                        {formatCurrency(dep.amount, currency, settings)}
                      </span>
                      <span className="text-xs text-violet-300/75">via {dep.method}</span>
                    </div>
                    <p className="text-xs font-mono text-sky-300/85 mt-0.5 truncate">
                      TrxID: {dep.transactionRef} · {dep.senderNumber}
                    </p>
                    <p className="text-[11px] text-violet-300/60 mt-1">
                      {formatTimestamp(dep.createdAt)}
                      {dep.adminNote ? ` · Note: ${dep.adminNote}` : ''}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-md border text-[11px] font-medium capitalize shrink-0 ${getStatusStyles(
                      dep.status
                    )}`}
                  >
                    {dep.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
