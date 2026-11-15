import { useEffect, useMemo, useState } from 'react';
import { Check, Search, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { fetchPaymentGatewayStatus } from '../../services/apiService';
import { adminReviewDeposit, adminReviewWithdrawal } from '../../services/firestoreService';
import type { Deposit, Withdrawal } from '../../types/smm';
import { formatCurrency, formatTimestamp, getStatusStyles } from '../../utils/format';

export function AdminDepositsTab({
  deposits,
  withdrawals,
}: {
  deposits: Deposit[];
  withdrawals: Withdrawal[];
}) {
  const { firebaseUser, settings, currency, pushToast } = useApp();
  const [gatewayStatus, setGatewayStatus] = useState<{
    bkashConfigured: boolean;
    nagadConfigured: boolean;
    mode: string;
  } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');

  const adminActor = {
    uid: firebaseUser?.uid || '',
    email: firebaseUser?.email || 'admin',
  };

  useEffect(() => {
    void fetchPaymentGatewayStatus()
      .then(setGatewayStatus)
      .catch(() => null);
  }, []);

  const filteredDeposits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deposits.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (!q) return true;
      return (
        d.userEmail.toLowerCase().includes(q) ||
        d.transactionRef.toLowerCase().includes(q) ||
        d.senderNumber.toLowerCase().includes(q) ||
        d.method.toLowerCase().includes(q)
      );
    });
  }, [deposits, statusFilter, search]);

  const pendingDepositsCount = useMemo(
    () => deposits.filter((d) => d.status === 'pending').length,
    [deposits]
  );

  const handleReviewDeposit = async (dep: Deposit, decision: 'approved' | 'rejected') => {
    setBusyId(dep.id);
    try {
      await adminReviewDeposit(adminActor, {
        deposit: dep,
        decision,
        adminNote: notes[dep.id] || (decision === 'approved' ? 'Verified & credited' : 'Reference unverified'),
        settings,
      });
      pushToast(
        decision === 'approved' ? 'Deposit Approved' : 'Deposit Rejected',
        decision === 'approved' ? 'success' : 'info',
        `${dep.userEmail} — ৳${dep.amount.toFixed(2)}`
      );
    } catch (err) {
      pushToast('Review Failed', 'error', err instanceof Error ? err.message : 'Error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReviewWithdrawal = async (w: Withdrawal, decision: 'approved' | 'rejected') => {
    setBusyId(w.id);
    try {
      await adminReviewWithdrawal(adminActor, { withdrawal: w, decision });
      pushToast(`Withdrawal ${decision}`, 'success', `${w.userEmail} — ৳${w.amount}`);
    } catch (err) {
      pushToast('Review Failed', 'error', err instanceof Error ? err.message : 'Error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Payment &amp; Deposit Verification</h2>
          <p className="text-xs text-violet-300/75">
            Verify bKash ({settings.bkashNumber}) / Nagad ({settings.nagadNumber}) transactions before crediting balances
          </p>
        </div>
        {pendingDepositsCount > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/35 text-xs font-semibold text-amber-200">
            {pendingDepositsCount} Pending Review
          </span>
        )}
      </div>

      {/* Server Payment Gateway Status */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 border border-violet-400/20">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-sky-300 shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-white">Server Gateway Integration Status</p>
            <p className="text-violet-300/80">
              bKash ({settings.bkashNumber || '—'}):{' '}
              <strong className={gatewayStatus?.bkashConfigured ? 'text-emerald-300' : 'text-amber-300'}>
                {gatewayStatus?.bkashConfigured ? 'Merchant API Connected' : 'Manual Statement Review'}
              </strong>{' '}
              · Nagad ({settings.nagadNumber || '—'}):{' '}
              <strong className={gatewayStatus?.nagadConfigured ? 'text-emerald-300' : 'text-amber-300'}>
                {gatewayStatus?.nagadConfigured ? 'Merchant API Connected' : 'Manual Statement Review'}
              </strong>
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                statusFilter === st
                  ? 'bg-violet-600 text-white'
                  : 'bg-[#0B051A] border border-violet-500/20 text-violet-300 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-violet-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search TrxID, sender, email..."
            className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 pl-9 pr-3 py-2 text-xs text-white"
          />
        </div>
      </div>

      {/* Deposit Queue */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-violet-500/15">
          <h3 className="text-sm font-bold text-white">Deposit Claims ({filteredDeposits.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-violet-500/15 bg-[#0D0620]/80 text-[11px] text-violet-300/75">
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Method &amp; Ref</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-500/10 text-xs">
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-violet-300/70">
                    No deposit claims matching filter.
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-white">{dep.userName || dep.userEmail}</p>
                      <p className="text-[11px] text-violet-300/70">{dep.userEmail}</p>
                      <p className="text-[10px] text-violet-400/60">
                        {formatTimestamp(dep.createdAt)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-white">{dep.method}</p>
                      <p className="text-[11px] font-mono text-sky-300">
                        TrxID: {dep.transactionRef}
                      </p>
                      <p className="text-[11px] text-violet-300/70">From: {dep.senderNumber}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-emerald-300">
                      {formatCurrency(dep.amount, currency, settings)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded border text-[11px] capitalize ${getStatusStyles(
                          dep.status
                        )}`}
                      >
                        {dep.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {dep.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="text"
                            placeholder="Note (optional)"
                            value={notes[dep.id] || ''}
                            onChange={(e) =>
                              setNotes((prev) => ({ ...prev, [dep.id]: e.target.value }))
                            }
                            className="w-32 rounded-lg bg-[#0B051A] border border-violet-500/25 px-2 py-1 text-[11px] text-white"
                          />
                          <button
                            type="button"
                            disabled={busyId === dep.id}
                            onClick={() => void handleReviewDeposit(dep, 'approved')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/35 text-emerald-200 inline-flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyId === dep.id}
                            onClick={() => void handleReviewDeposit(dep, 'rejected')}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/35 text-rose-200 inline-flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-violet-300/70">
                          Reviewed by {dep.reviewedBy || 'admin'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Withdrawals Queue */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-violet-500/15">
          <h3 className="text-sm font-bold text-white">Withdrawal Requests ({withdrawals.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-violet-500/15 bg-[#0D0620]/80 text-[11px] text-violet-300/75">
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold">Method &amp; Account</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-500/10 text-xs">
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-violet-300/70">
                    No withdrawal requests.
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td className="py-3 px-4 text-white">{w.userEmail}</td>
                    <td className="py-3 px-4 text-violet-200">
                      {w.method} · <span className="font-mono">{w.accountDetails}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-white">
                      {formatCurrency(w.amount, currency, settings)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded border text-[11px] capitalize ${getStatusStyles(
                          w.status
                        )}`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {w.status === 'pending' ? (
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            disabled={busyId === w.id}
                            onClick={() => void handleReviewWithdrawal(w, 'approved')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/35 text-emerald-200"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === w.id}
                            onClick={() => void handleReviewWithdrawal(w, 'rejected')}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-400/35 text-rose-200"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-violet-300/70">{w.reviewedBy}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
