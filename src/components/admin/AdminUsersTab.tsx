import React, { useMemo, useState } from 'react';
import { Bell, Search, ShieldAlert, UserCheck, Wallet, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import {
  adminAdjustUserBalance,
  adminSendNotification,
  adminUpdateUserStatusAndTier,
} from '../../services/firestoreService';
import type { UserProfile } from '../../types/smm';
import { formatCurrency, formatTimestamp, getStatusStyles } from '../../utils/format';

export function AdminUsersTab({ users }: { users: UserProfile[] }) {
  const { firebaseUser, currency, settings, pushToast } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [adjustTarget, setAdjustTarget] = useState<UserProfile | null>(null);
  const [delta, setDelta] = useState('0');
  const [reason, setReason] = useState('');

  const [notifyTarget, setNotifyTarget] = useState<UserProfile | null>(null);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMsg, setNotifyMsg] = useState('');

  const [busy, setBusy] = useState(false);

  const adminActor = {
    uid: firebaseUser?.uid || '',
    email: firebaseUser?.email || 'admin',
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== 'all' && u.accountStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
      );
    });
  }, [users, search, statusFilter]);

  const handleToggleStatus = async (u: UserProfile) => {
    const nextStatus = u.accountStatus === 'active' ? 'suspended' : 'active';
    try {
      await adminUpdateUserStatusAndTier(adminActor, {
        uid: u.uid,
        email: u.email,
        accountStatus: nextStatus,
      });
      pushToast(`User ${nextStatus}`, 'success', `${u.email} is now ${nextStatus}.`);
    } catch (err) {
      pushToast('Update Failed', 'error', err instanceof Error ? err.message : 'Error updating user.');
    }
  };

  const handleTierChange = async (
    u: UserProfile,
    tier: UserProfile['membershipLevel']
  ) => {
    try {
      await adminUpdateUserStatusAndTier(adminActor, {
        uid: u.uid,
        email: u.email,
        membershipLevel: tier,
      });
      pushToast('Membership Updated', 'success', `${u.email} set to ${tier}.`);
    } catch (err) {
      pushToast('Update Failed', 'error', err instanceof Error ? err.message : 'Error updating tier.');
    }
  };

  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    const amt = Number(delta);
    if (!Number.isFinite(amt) || amt === 0 || reason.trim().length < 3) {
      pushToast('Invalid Input', 'error', 'Enter a non-zero amount and a clear audit reason.');
      return;
    }
    setBusy(true);
    try {
      await adminAdjustUserBalance(adminActor, {
        targetUser: adjustTarget,
        delta: amt,
        reason,
      });
      pushToast('Balance Adjusted', 'success', `Logged adjustment for ${adjustTarget.email}.`);
      setAdjustTarget(null);
      setDelta('0');
      setReason('');
    } catch (err) {
      pushToast('Adjustment Failed', 'error', err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const handleSendUserNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyTarget) return;
    setBusy(true);
    try {
      await adminSendNotification(adminActor, {
        userId: notifyTarget.uid,
        title: notifyTitle,
        message: notifyMsg,
        type: 'info',
      });
      pushToast('Notification Sent', 'success', `Delivered to ${notifyTarget.email}.`);
      setNotifyTarget(null);
      setNotifyTitle('');
      setNotifyMsg('');
    } catch (err) {
      pushToast('Send Failed', 'error', err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">User Management</h2>
          <p className="text-xs text-violet-300/75">
            Search users, manage account suspension, membership tiers, direct alerts, and wallet adjustments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'suspended')}
            className="rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
          >
            <option value="all">All ({users.length})</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <div className="relative w-64">
            <Search className="w-4 h-4 text-violet-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email, name, UID..."
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 pl-9 pr-3 py-2 text-xs text-white"
            />
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-violet-500/15 bg-[#0D0620]/80 text-[11px] text-violet-300/75">
                <th className="py-3 px-4 font-semibold">User</th>
                <th className="py-3 px-4 font-semibold text-right">Balance</th>
                <th className="py-3 px-4 font-semibold text-right">Deposits / Spend</th>
                <th className="py-3 px-4 font-semibold">Tier</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-500/10 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-violet-300/70">
                    No registered users match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.uid} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-white">{u.displayName}</p>
                      <p className="text-[11px] text-violet-300/75">{u.email}</p>
                      <p className="text-[10px] font-mono text-violet-400/60">
                        {u.uid} · Joined {formatTimestamp(u.createdAt)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-sky-300">
                      {formatCurrency(u.walletBalance, currency, settings)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-violet-200">
                      {formatCurrency(u.totalDeposits, currency, settings)} /{' '}
                      {formatCurrency(u.totalSpending, currency, settings)}
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={u.membershipLevel}
                        onChange={(e) =>
                          void handleTierChange(u, e.target.value as UserProfile['membershipLevel'])
                        }
                        aria-label={`Membership tier for ${u.email}`}
                        className="rounded-lg bg-[#0B051A] border border-violet-500/25 px-2 py-1 text-xs text-white capitalize"
                      >
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                        <option value="vip">VIP</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-[11px] capitalize ${getStatusStyles(
                          u.accountStatus
                        )}`}
                      >
                        {u.accountStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setAdjustTarget(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-200"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Balance</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifyTarget(u)}
                        title="Send notification to this user"
                        className="inline-flex items-center gap-1 p-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-400/30 text-violet-200"
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(u)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border ${
                          u.accountStatus === 'active'
                            ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-400/30 text-rose-200'
                            : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/30 text-emerald-200'
                        }`}
                      >
                        {u.accountStatus === 'active' ? (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Suspend</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Reactivate</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance Adjustment Modal */}
      {adjustTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleBalanceSubmit}
            className="glass-panel w-full max-w-md rounded-2xl p-6 border border-violet-400/25 relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setAdjustTarget(null)}
              className="absolute top-4 right-4 text-violet-300 hover:text-white"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white">Authorized Balance Adjustment</h3>
            <p className="text-xs text-violet-300/80">
              Account: <strong className="text-white">{adjustTarget.email}</strong> (Current: ৳
              {adjustTarget.walletBalance.toFixed(2)})
            </p>
            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1">
                Delta Amount in BDT (positive to credit, negative to debit)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1">
                Audit Reason (required)
              </label>
              <input
                type="text"
                required
                minLength={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Manual reconciliation / promo credit"
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full neon-button-primary rounded-xl py-2.5 text-sm font-semibold text-white"
            >
              {busy ? 'Applying...' : 'Apply & Log Adjustment'}
            </button>
          </form>
        </div>
      )}

      {/* Direct User Notification Modal */}
      {notifyTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSendUserNotification}
            className="glass-panel w-full max-w-md rounded-2xl p-6 border border-violet-400/25 relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setNotifyTarget(null)}
              className="absolute top-4 right-4 text-violet-300 hover:text-white"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white">Send Direct Notification</h3>
            <p className="text-xs text-violet-300/80">
              Recipient: <strong className="text-white">{notifyTarget.email}</strong>
            </p>
            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1">Title</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
                placeholder="Account / Order Notice"
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1">Message</label>
              <textarea
                required
                minLength={2}
                maxLength={600}
                rows={3}
                value={notifyMsg}
                onChange={(e) => setNotifyMsg(e.target.value)}
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full neon-button-primary rounded-xl py-2.5 text-sm font-semibold text-white"
            >
              {busy ? 'Sending...' : 'Send Notification'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
