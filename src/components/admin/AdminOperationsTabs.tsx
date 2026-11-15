import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import {
  adminReplyTicket,
  adminSaveSettings,
  adminSendNotification,
} from '../../services/firestoreService';
import type {
  AuditLog,
  CurrencyCode,
  NotificationItem,
  Referral,
  SupportTicket,
} from '../../types/smm';
import { formatCurrency, formatTimestamp, getStatusStyles } from '../../utils/format';

export function AdminReferralsTab({ referrals }: { referrals: Referral[] }) {
  const { firebaseUser, settings, currency, pushToast } = useApp();
  const [enabled, setEnabled] = useState(settings.referralEnabled);
  const [percent, setPercent] = useState(String(settings.referralRewardPercent));
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminSaveSettings(
        { uid: firebaseUser?.uid || '', email: firebaseUser?.email || 'admin' },
        {
          ...settings,
          referralEnabled: enabled,
          referralRewardPercent: Math.min(50, Math.max(0, Number(percent) || 0)),
        }
      );
      pushToast('Referral Settings Updated', 'success');
    } catch (err) {
      pushToast('Save Failed', 'error', err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Referral Program Settings</h2>
      <form onSubmit={handleSave} className="glass-panel rounded-2xl p-5 flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 text-xs text-white pb-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>Enable Referral Commissions</span>
        </label>
        <div>
          <label className="block text-xs font-semibold text-violet-200 mb-1">
            Reward Percentage (0%–50%)
          </label>
          <input
            type="number"
            min={0}
            max={50}
            step="0.5"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            className="w-36 rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm font-mono text-white"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="neon-button-primary rounded-xl px-4 py-2 text-xs font-semibold text-white"
        >
          {saving ? 'Saving...' : 'Save Referral Config'}
        </button>
      </form>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-violet-500/15 bg-[#0D0620]/80 text-[11px] text-violet-300/75">
              <th className="py-3 px-4">Referred Email</th>
              <th className="py-3 px-4">Referrer UID</th>
              <th className="py-3 px-4 text-right">Reward</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-violet-500/10 text-xs">
            {referrals.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-violet-300/70">
                  No referrals recorded yet.
                </td>
              </tr>
            ) : (
              referrals.map((r) => (
                <tr key={r.id}>
                  <td className="py-3 px-4 text-white">{r.referredEmail}</td>
                  <td className="py-3 px-4 font-mono text-violet-300">{r.referrerUid}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-300">
                    {formatCurrency(r.rewardAmount, currency, settings)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded border text-[11px] ${getStatusStyles(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminSupportTab({ tickets }: { tickets: SupportTicket[] }) {
  const { firebaseUser, pushToast } = useApp();
  const [statusFilter, setStatusFilter] = useState<'all' | SupportTicket['status']>('all');
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, SupportTicket['status']>>({});

  const filteredTickets = tickets.filter((tk) =>
    statusFilter === 'all' ? true : tk.status === statusFilter
  );

  const handleReply = async (tk: SupportTicket) => {
    const replyText = replies[tk.id] ?? tk.adminReply;
    const status = statuses[tk.id] ?? 'answered';
    try {
      await adminReplyTicket(
        { uid: firebaseUser?.uid || '', email: firebaseUser?.email || 'admin' },
        {
          ticketId: tk.id,
          status,
          priority: tk.priority,
          adminReply: replyText,
        }
      );
      pushToast('Ticket Updated', 'success');
    } catch (err) {
      pushToast('Failed', 'error', err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">Support Ticket Management</h2>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'open', 'answered', 'closed'] as const).map((st) => (
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
      </div>
      {filteredTickets.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-xs text-violet-300/75">
          No support tickets matching filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((tk) => (
            <div key={tk.id} className="glass-panel rounded-2xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-white">{tk.subject}</p>
                  <p className="text-[11px] text-violet-300/75">
                    {tk.userEmail} · {tk.category} · Priority: {tk.priority} ·{' '}
                    {formatTimestamp(tk.createdAt)}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded border text-[11px] capitalize ${getStatusStyles(
                    tk.status
                  )}`}
                >
                  {tk.status}
                </span>
              </div>
              <p className="text-xs text-violet-100 bg-[#0B051A] rounded-xl p-3 border border-violet-500/15">
                {tk.message}
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={replies[tk.id] ?? tk.adminReply}
                  onChange={(e) => setReplies((prev) => ({ ...prev, [tk.id]: e.target.value }))}
                  placeholder="Write administrator response..."
                  className="flex-1 rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
                />
                <select
                  value={statuses[tk.id] ?? tk.status}
                  onChange={(e) =>
                    setStatuses((prev) => ({
                      ...prev,
                      [tk.id]: e.target.value as SupportTicket['status'],
                    }))
                  }
                  className="rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
                >
                  <option value="open">Open</option>
                  <option value="answered">Answered</option>
                  <option value="closed">Closed</option>
                </select>
                <button
                  type="button"
                  onClick={() => void handleReply(tk)}
                  className="neon-button-primary rounded-xl px-4 py-2 text-xs font-semibold text-white"
                >
                  Send Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminNotificationsTab() {
  const { firebaseUser, pushToast } = useApp();
  const [targetUserId, setTargetUserId] = useState('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationItem['type']>('info');
  const [busy, setBusy] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminSendNotification(
        { uid: firebaseUser?.uid || '', email: firebaseUser?.email || 'admin' },
        { userId: targetUserId, title, message, type }
      );
      pushToast('Notification Published', 'success');
      setTitle('');
      setMessage('');
    } catch (err) {
      pushToast('Failed', 'error', err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-xl font-bold text-white">Notification Management</h2>
      <form onSubmit={handleSend} className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">
              Target (use &ldquo;all&rdquo; for global broadcast or enter User UID)
            </label>
            <input
              type="text"
              required
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as NotificationItem['type'])}
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
            >
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-violet-200 mb-1">Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-violet-200 mb-1">Message</label>
          <textarea
            rows={3}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm text-white"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="neon-button-primary rounded-xl px-5 py-2.5 text-xs font-semibold text-white inline-flex items-center gap-2"
        >
          <Bell className="w-4 h-4" />
          <span>{busy ? 'Sending...' : 'Publish Notification'}</span>
        </button>
      </form>
    </div>
  );
}


export function AdminSettingsTab() {
  const { firebaseUser, settings, pushToast } = useApp();
  const [form, setForm] = useState({ ...settings });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { updatedAt: _u, ...rest } = form;
      await adminSaveSettings(
        { uid: firebaseUser?.uid || '', email: firebaseUser?.email || 'admin' },
        {
          ...rest,
          usdRate: Number(rest.usdRate) > 0 ? Number(rest.usdRate) : 120,
          eurRate: Number(rest.eurRate) > 0 ? Number(rest.eurRate) : 130,
          minDeposit: Number(rest.minDeposit) >= 1 ? Number(rest.minDeposit) : 50,
          referralRewardPercent: Number.isFinite(Number(rest.referralRewardPercent))
            ? Math.min(50, Math.max(0, Number(rest.referralRewardPercent)))
            : 5,
        }
      );
      pushToast('Website & Banner Settings Saved', 'success');
    } catch (err) {
      pushToast('Save Failed', 'error', err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {/* Banner & Hero Control */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-white">Banner &amp; Hero Control</h2>
            <p className="text-xs text-violet-300/75">
              Customize the dashboard hero banner, 3D astronaut/banner image URL, CTA buttons, and announcement strip
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setForm({
                ...form,
                heroBannerImageUrl: '/src/assets/images/astronaut_hero_3d_1794736598608.jpg',
              })
            }
            className="text-xs text-sky-300 hover:underline"
          >
            Reset Default 3D Astronaut
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">
              Hero Eyebrow Kicker
            </label>
            <input
              type="text"
              maxLength={140}
              value={form.heroKicker}
              onChange={(e) => setForm({ ...form, heroKicker: e.target.value })}
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">
              Hero Main Title
            </label>
            <input
              type="text"
              required
              maxLength={160}
              value={form.heroTitle}
              onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-violet-200 mb-1">
            Hero Subtitle
          </label>
          <textarea
            rows={2}
            maxLength={400}
            value={form.heroSubtitle}
            onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
            className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">
              Primary CTA Text
            </label>
            <input
              type="text"
              maxLength={60}
              value={form.heroCtaText}
              onChange={(e) => setForm({ ...form, heroCtaText: e.target.value })}
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">
              Secondary CTA Text
            </label>
            <input
              type="text"
              maxLength={60}
              value={form.heroSecondaryCtaText}
              onChange={(e) => setForm({ ...form, heroSecondaryCtaText: e.target.value })}
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">
              Hero Banner Image URL
            </label>
            <input
              type="text"
              maxLength={600}
              value={form.heroBannerImageUrl}
              onChange={(e) => setForm({ ...form, heroBannerImageUrl: e.target.value })}
              placeholder="/src/assets/images/... or https://..."
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs font-mono text-white"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-violet-500/15 space-y-2.5">
          <label className="flex items-center gap-2 text-xs text-white">
            <input
              type="checkbox"
              checked={form.promoBannerEnabled}
              onChange={(e) => setForm({ ...form, promoBannerEnabled: e.target.checked })}
            />
            <span>Show Top Announcement / Promo Banner on Dashboard</span>
          </label>
          <input
            type="text"
            maxLength={300}
            value={form.promoBannerText}
            onChange={(e) => setForm({ ...form, promoBannerText: e.target.value })}
            placeholder="Announcement banner text..."
            className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
          />
        </div>
      </div>

      {/* Website & Payment Settings */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <h2 className="text-xl font-bold text-white">Website &amp; Payment Settings</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">Site Name</label>
            <input
              type="text"
              required
              value={form.siteName}
              onChange={(e) => setForm({ ...form, siteName: e.target.value })}
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">
              Default Currency
            </label>
            <select
              value={form.defaultCurrency}
              onChange={(e) =>
                setForm({ ...form, defaultCurrency: e.target.value as CurrencyCode })
              }
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm text-white"
            >
              <option value="BDT">BDT (৳)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">
              1 USD = BDT Rate
            </label>
            <input
              type="number"
              step="0.01"
              value={form.usdRate}
              onChange={(e) => setForm({ ...form, usdRate: Number(e.target.value) })}
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">
              1 EUR = BDT Rate
            </label>
            <input
              type="number"
              step="0.01"
              value={form.eurRate}
              onChange={(e) => setForm({ ...form, eurRate: Number(e.target.value) })}
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">
              Minimum Deposit (BDT)
            </label>
            <input
              type="number"
              min={1}
              value={form.minDeposit}
              onChange={(e) => setForm({ ...form, minDeposit: Number(e.target.value) })}
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm font-mono text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">Support Hours</label>
            <input
              type="text"
              value={form.supportHours}
              onChange={(e) => setForm({ ...form, supportHours: e.target.value })}
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-violet-500/15">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-white font-semibold">
              <input
                type="checkbox"
                checked={form.bkashEnabled}
                onChange={(e) => setForm({ ...form, bkashEnabled: e.target.checked })}
              />
              <span>Enable bKash Deposits</span>
            </label>
            <input
              type="text"
              maxLength={32}
              value={form.bkashNumber}
              onChange={(e) => setForm({ ...form, bkashNumber: e.target.value })}
              placeholder="bKash Number (e.g. 01804515459)"
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs font-mono text-sky-300"
            />
            <input
              type="text"
              value={form.bkashInstructions}
              onChange={(e) => setForm({ ...form, bkashInstructions: e.target.value })}
              placeholder="bKash payment instructions"
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-white font-semibold">
              <input
                type="checkbox"
                checked={form.nagadEnabled}
                onChange={(e) => setForm({ ...form, nagadEnabled: e.target.checked })}
              />
              <span>Enable Nagad Deposits</span>
            </label>
            <input
              type="text"
              maxLength={32}
              value={form.nagadNumber}
              onChange={(e) => setForm({ ...form, nagadNumber: e.target.value })}
              placeholder="Nagad Number (e.g. 01804515459)"
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs font-mono text-sky-300"
            />
            <input
              type="text"
              value={form.nagadInstructions}
              onChange={(e) => setForm({ ...form, nagadInstructions: e.target.value })}
              placeholder="Nagad payment instructions"
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-violet-500/15">
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">
              Support Telegram Link or @Username
            </label>
            <input
              type="text"
              maxLength={300}
              value={form.supportTelegramUrl}
              onChange={(e) => setForm({ ...form, supportTelegramUrl: e.target.value })}
              placeholder="https://t.me/your_support_handle"
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs font-mono text-sky-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">
              Support Email Address
            </label>
            <input
              type="email"
              maxLength={200}
              value={form.supportEmail}
              onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
              placeholder="support@yourdomain.com"
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs font-mono text-sky-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-violet-500/15">
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">
              Referral Bonus Commission (%)
            </label>
            <input
              type="number"
              min={0}
              max={50}
              step="0.5"
              value={form.referralRewardPercent}
              onChange={(e) => setForm({ ...form, referralRewardPercent: Number(e.target.value) })}
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm font-mono text-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs text-white pt-5">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.referralEnabled}
                onChange={(e) => setForm({ ...form, referralEnabled: e.target.checked })}
              />
              <span>Enable Referral Program</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.supportOnline}
                onChange={(e) => setForm({ ...form, supportOnline: e.target.checked })}
              />
              <span>Support Desk Online</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.withdrawalEnabled}
                onChange={(e) => setForm({ ...form, withdrawalEnabled: e.target.checked })}
              />
              <span>Enable User Withdrawals</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="neon-button-primary rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
        >
          {saving ? 'Saving...' : 'Save All Banner & Website Settings'}
        </button>
      </div>
    </form>
  );
}

export function AdminLogsTab({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Admin Activity Audit Logs</h2>
        <p className="text-xs text-violet-300/75">
          Immutable log of sensitive administrative actions
        </p>
      </div>
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-violet-500/15 bg-[#0D0620]/80 text-[11px] text-violet-300/75">
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Admin</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Target</th>
                <th className="py-3 px-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-500/10 text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-violet-300/70">
                    No audit actions logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-violet-300/75 whitespace-nowrap">
                      {formatTimestamp(log.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-white">{log.adminEmail}</td>
                    <td className="py-3 px-4 font-mono text-sky-300">{log.action}</td>
                    <td className="py-3 px-4 font-mono text-violet-200">
                      {log.targetType}:{log.targetId}
                    </td>
                    <td className="py-3 px-4 text-violet-200/85">{log.details}</td>
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
