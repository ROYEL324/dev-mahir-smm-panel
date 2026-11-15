import type { Timestamp } from 'firebase/firestore';
import type { CurrencyCode, OrderStatus, PlatformSettings } from '../types/smm';

export function generateSafeId(prefix = 'id'): string {
  const random = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${random}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function formatCurrency(
  amountBdt: number,
  currency: CurrencyCode = 'BDT',
  settings?: PlatformSettings | null
): string {
  const safeVal = Number.isFinite(amountBdt) ? amountBdt : 0;
  if (currency === 'USD') {
    const rate = settings?.usdRate && settings.usdRate > 0 ? settings.usdRate : 120;
    const usd = safeVal / rate;
    return `$${usd.toFixed(2)}`;
  }
  if (currency === 'EUR') {
    const rate = settings?.eurRate && settings.eurRate > 0 ? settings.eurRate : 130;
    const eur = safeVal / rate;
    return `€${eur.toFixed(2)}`;
  }
  return `৳${safeVal.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNumber(val: number): string {
  return Number.isFinite(val) ? val.toLocaleString('en-US') : '0';
}

export function formatTimestamp(ts: Timestamp | null | undefined): string {
  if (!ts) return '—';
  try {
    const d = ts.toDate();
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'processing':
      return 'Processing';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'partial':
      return 'Partial';
    case 'canceled':
      return 'Canceled';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

export function getStatusStyles(status: string): string {
  switch (status) {
    case 'completed':
    case 'approved':
    case 'rewarded':
    case 'active':
    case 'answered':
      return 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
    case 'processing':
    case 'in_progress':
    case 'registered':
      return 'text-sky-300 border-sky-500/30 bg-sky-500/10';
    case 'pending':
    case 'open':
    case 'partial':
      return 'text-amber-300 border-amber-500/30 bg-amber-500/10';
    case 'canceled':
    case 'failed':
    case 'rejected':
    case 'suspended':
    case 'closed':
      return 'text-rose-300 border-rose-500/30 bg-rose-500/10';
    default:
      return 'text-violet-200 border-violet-500/30 bg-violet-500/10';
  }
}

export function isValidTargetInput(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 5 || trimmed.length > 512) return false;
  if (trimmed.startsWith('@') && trimmed.length >= 3) return true;
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return Boolean(url.hostname && url.hostname.includes('.'));
  } catch {
    return trimmed.length >= 5;
  }
}
