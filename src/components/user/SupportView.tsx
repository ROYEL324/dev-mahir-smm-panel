import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  LifeBuoy,
  Mail,
  MessageSquarePlus,
  Send,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { createSupportTicket } from '../../services/firestoreService';
import type { SupportTicket } from '../../types/smm';
import { formatTimestamp, getStatusStyles } from '../../utils/format';

function normalizeTelegramHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^t\.me\//i.test(trimmed)) return `https://${trimmed}`;
  if (trimmed.startsWith('@')) return `https://t.me/${trimmed.slice(1)}`;
  return `https://t.me/${trimmed}`;
}

export function SupportView() {
  const { t, firebaseUser, profile, tickets, settings, openAuthModal, pushToast } = useApp();

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('order');
  const [orderId, setOrderId] = useState('');
  const [priority, setPriority] = useState<SupportTicket['priority']>('normal');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const telegramHref = useMemo(
    () => normalizeTelegramHref(settings.supportTelegramUrl || ''),
    [settings.supportTelegramUrl]
  );

  const supportEmail = (settings.supportEmail || '').trim();

  const handleCopyEmail = async () => {
    if (!supportEmail) return;
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopiedEmail(true);
      pushToast('Support Email Copied', 'success', supportEmail);
      window.setTimeout(() => setCopiedEmail(false), 1800);
    } catch {
      pushToast('Copy Failed', 'error', 'Copy manually: ' + supportEmail);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !profile) {
      openAuthModal('login');
      return;
    }
    if (subject.trim().length < 3 || message.trim().length < 5) {
      pushToast('Incomplete Ticket', 'error', 'Please enter a clear subject and message.');
      return;
    }
    setSubmitting(true);
    try {
      await createSupportTicket({
        user: profile,
        subject,
        category,
        orderId,
        message,
        priority,
      });
      pushToast('Support Ticket Opened', 'success', 'Our support team will respond shortly.');
      setSubject('');
      setOrderId('');
      setMessage('');
    } catch (err) {
      pushToast(
        'Ticket Creation Failed',
        'error',
        err instanceof Error ? err.message : 'Unable to submit ticket.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('supportTitle')}</h1>
          <p className="text-xs text-violet-300/80 mt-1">
            Desk status:{' '}
            <span className={settings.supportOnline ? 'text-emerald-300 font-semibold' : 'text-amber-300 font-semibold'}>
              {settings.supportOnline ? 'Online' : 'Offline'}
            </span>{' '}
            · {settings.supportHours}
          </p>
        </div>
      </div>

      {/* Direct Support Channels: Telegram & Email Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Telegram Support Button Card */}
        <div className="glass-panel rounded-2xl p-5 border border-sky-400/25 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25 shrink-0">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white">Telegram Live Support</h2>
              <p className="text-xs text-violet-300/80 truncate">
                {telegramHref
                  ? settings.supportTelegramUrl
                  : 'Telegram support channel not configured yet'}
              </p>
            </div>
          </div>
          {telegramHref ? (
            <a
              href={telegramHref}
              target="_blank"
              rel="noopener noreferrer"
              className="neon-button-primary rounded-xl px-4 py-2.5 text-xs font-semibold text-white inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <span>Message on Telegram</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="rounded-xl px-4 py-2.5 bg-white/[0.04] border border-violet-500/20 text-xs font-semibold text-violet-300/50 cursor-not-allowed shrink-0"
            >
              Not Set Yet
            </button>
          )}
        </div>

        {/* Email Support Button Card */}
        <div className="glass-panel rounded-2xl p-5 border border-violet-400/25 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white">Email Support Desk</h2>
              <p className="text-xs text-violet-300/80 truncate">
                {supportEmail || 'Support email not configured yet'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {supportEmail ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleCopyEmail()}
                  title="Copy support email"
                  className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-violet-400/25 text-violet-200"
                >
                  {copiedEmail ? (
                    <Check className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <a
                  href={`mailto:${supportEmail}?subject=${encodeURIComponent('MAHIR DEV SMM Support Request')}`}
                  className="neon-button-primary rounded-xl px-4 py-2.5 text-xs font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Email</span>
                </a>
              </>
            ) : (
              <button
                type="button"
                disabled
                className="rounded-xl px-4 py-2.5 bg-white/[0.04] border border-violet-500/20 text-xs font-semibold text-violet-300/50 cursor-not-allowed"
              >
                Not Set Yet
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Create Ticket */}
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-5 glass-panel rounded-2xl p-6 space-y-4 h-fit"
        >
          <div className="flex items-center gap-2.5 mb-1">
            <MessageSquarePlus className="w-5 h-5 text-sky-300" />
            <h2 className="text-base font-bold text-white">{t('createTicket')}</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1.5">Subject</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={140}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Order speed / Refill / Deposit inquiry"
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3.5 py-2.5 text-sm text-white placeholder:text-violet-400/40 focus:outline-none focus:border-violet-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SupportTicket['category'])}
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2.5 text-xs text-white"
              >
                <option value="order">Order Issue</option>
                <option value="payment">Payment / Deposit</option>
                <option value="service">Service Question</option>
                <option value="account">Account / Membership</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as SupportTicket['priority'])}
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2.5 text-xs text-white"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1.5">
              Order ID (optional)
            </label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="ord_..."
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-violet-400/40 focus:outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1.5">Message</label>
            <textarea
              required
              minLength={5}
              maxLength={2000}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your request clearly..."
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3.5 py-2.5 text-sm text-white placeholder:text-violet-400/40 focus:outline-none focus:border-violet-400"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full neon-button-primary rounded-xl py-2.5 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting
              ? 'Submitting...'
              : firebaseUser
                ? 'Submit Support Ticket'
                : 'Sign In to Open Ticket'}
          </button>
        </form>

        {/* Ticket List */}
        <div className="xl:col-span-7 glass-panel rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Your Support Tickets</h2>
          {tickets.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-violet-500/20 rounded-2xl">
              <LifeBuoy className="w-8 h-8 text-violet-400/70 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">No Tickets Yet</p>
              <p className="text-xs text-violet-300/70 mt-1">
                Need help with an order or deposit? Open a ticket on the left or contact us via Telegram / Email above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((tk) => (
                <div
                  key={tk.id}
                  className="rounded-xl p-4 bg-[#0B051A]/85 border border-violet-500/15 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-white">{tk.subject}</p>
                      <p className="text-[11px] text-violet-300/70 font-mono">
                        {tk.id} · {tk.category} · {formatTimestamp(tk.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-md border text-[11px] font-medium capitalize shrink-0 ${getStatusStyles(
                        tk.status
                      )}`}
                    >
                      {tk.status}
                    </span>
                  </div>
                  <p className="text-xs text-violet-100/85 leading-relaxed">{tk.message}</p>
                  {tk.adminReply && (
                    <div className="rounded-xl bg-violet-600/15 border border-violet-400/25 p-3">
                      <p className="text-[11px] font-semibold text-sky-300 mb-1">
                        MAHIR DEV Support Reply
                      </p>
                      <p className="text-xs text-white leading-relaxed">{tk.adminReply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
