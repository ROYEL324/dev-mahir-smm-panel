import React, { useMemo, useState } from 'react';
import { RefreshCw, RotateCcw, Search, Send, X, XCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import {
  callProviderAction,
  fetchPendingDispatches,
  markDispatchesSynced,
} from '../../services/apiService';
import { adminUpdateOrderStatus } from '../../services/firestoreService';
import type { Order, OrderStatus } from '../../types/smm';
import {
  formatCurrency,
  formatNumber,
  formatTimestamp,
  getStatusLabel,
  getStatusStyles,
} from '../../utils/format';

function mapProviderStatus(raw: string): OrderStatus {
  const s = raw.toLowerCase();
  if (s.includes('complete')) return 'completed';
  if (s.includes('progress')) return 'in_progress';
  if (s.includes('partial')) return 'partial';
  if (s.includes('cancel')) return 'canceled';
  if (s.includes('fail') || s.includes('error')) return 'failed';
  return 'processing';
}

export function AdminOrdersTab({ orders }: { orders: Order[] }) {
  const { firebaseUser, services, currency, settings, pushToast } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [editing, setEditing] = useState<Order | null>(null);
  const [nextStatus, setNextStatus] = useState<OrderStatus>('pending');
  const [startCount, setStartCount] = useState('0');
  const [remains, setRemains] = useState('0');
  const [providerOrderId, setProviderOrderId] = useState('');
  const [issueRefund, setIssueRefund] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const adminActor = {
    uid: firebaseUser?.uid || '',
    email: firebaseUser?.email || 'admin',
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.userId.toLowerCase().includes(q) ||
        o.serviceName.toLowerCase().includes(q) ||
        o.targetUrl.toLowerCase().includes(q) ||
        o.providerOrderId.toLowerCase().includes(q)
      );
    });
  }, [orders, statusFilter, search]);

  const openEdit = (ord: Order) => {
    setEditing(ord);
    setNextStatus(ord.status);
    setStartCount(String(ord.startCount));
    setRemains(String(ord.remains));
    setProviderOrderId(ord.providerOrderId);
    setIssueRefund(false);
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await adminUpdateOrderStatus(adminActor, {
        order: editing,
        status: nextStatus,
        startCount: Number(startCount) || 0,
        remains: Number(remains) || 0,
        providerOrderId,
        issueRefund,
      });
      pushToast('Order Updated', 'success', `Order ${editing.id} set to ${nextStatus}.`);
      setEditing(null);
    } catch (err) {
      pushToast('Update Failed', 'error', err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const handleDispatchProvider = async (ord: Order) => {
    const srv = services.find((s) => s.id === ord.serviceId);
    const providerServiceId = srv?.providerServiceId;
    if (!providerServiceId || providerServiceId.toLowerCase() === 'manual') {
      pushToast(
        'Missing Provider Service ID',
        'error',
        'Configure a numeric Provider Service ID on this service first.'
      );
      return;
    }
    const resp = await callProviderAction<{ order?: string | number }>('order', {
      service: providerServiceId,
      link: ord.targetUrl,
      quantity: ord.quantity,
    });
    if (!resp.ok || !resp.data?.order) {
      pushToast('Provider Dispatch Failed', 'error', resp.error || 'Provider rejected order.');
      return;
    }
    await adminUpdateOrderStatus(adminActor, {
      order: ord,
      status: 'processing',
      startCount: ord.startCount,
      remains: ord.remains,
      providerOrderId: String(resp.data.order),
    });
    pushToast('Dispatched to Provider', 'success', `Provider Order #${resp.data.order}`);
  };

  const handleSyncProviderStatus = async (ord: Order) => {
    if (!ord.providerOrderId) {
      pushToast('No Provider Reference', 'info', 'This order does not have a providerOrderId yet.');
      return;
    }
    const resp = await callProviderAction<{
      status?: string;
      start_count?: string | number;
      remains?: string | number;
    }>('order-status', { order: ord.providerOrderId });

    if (!resp.ok || !resp.data) {
      pushToast('Sync Failed', 'error', resp.error || 'Unable to query provider status.');
      return;
    }

    const mapped = mapProviderStatus(String(resp.data.status || ''));
    const shouldRefund =
      (mapped === 'canceled' || mapped === 'failed') &&
      ord.status !== 'canceled' &&
      ord.status !== 'failed';

    await adminUpdateOrderStatus(adminActor, {
      order: ord,
      status: mapped,
      startCount: Number(resp.data.start_count ?? ord.startCount),
      remains: Number(resp.data.remains ?? ord.remains),
      providerOrderId: ord.providerOrderId,
      issueRefund: shouldRefund,
    });
    pushToast(
      'Status Synced',
      'success',
      `Provider status: ${mapped}${shouldRefund ? ' (Refund issued)' : ''}`
    );
  };

  const handleRequestRefill = async (ord: Order) => {
    if (!ord.providerOrderId) return;
    const resp = await callProviderAction<{ refill?: string | number }>('refill', {
      order: ord.providerOrderId,
    });
    if (!resp.ok) {
      pushToast('Refill Request Failed', 'error', resp.error || 'Provider rejected refill.');
      return;
    }
    pushToast(
      'Refill Requested',
      'success',
      `Provider Refill #${resp.data?.refill ?? 'submitted'} for Order ${ord.id}`
    );
  };

  const handleCancelProviderOrder = async (ord: Order) => {
    if (!ord.providerOrderId) return;
    const resp = await callProviderAction('cancel', { orders: [ord.providerOrderId] });
    if (!resp.ok) {
      pushToast('Provider Cancel Failed', 'error', resp.error || 'Provider could not cancel.');
      return;
    }
    await adminUpdateOrderStatus(adminActor, {
      order: ord,
      status: 'canceled',
      startCount: ord.startCount,
      remains: ord.remains,
      providerOrderId: ord.providerOrderId,
      issueRefund: ord.status !== 'canceled' && ord.status !== 'failed',
    });
    pushToast('Order Canceled & Refunded', 'success', `Order ${ord.id} canceled at provider.`);
  };

  const handleBulkSyncAll = async () => {
    setBulkBusy(true);
    try {
      let syncedDispatchesCount = 0;
      let updatedStatusesCount = 0;

      // 1. Sync any auto-dispatched records from server queue into Firestore
      const pendingResp = await fetchPendingDispatches();
      const syncedOrderIds: string[] = [];
      for (const rec of pendingResp.records || []) {
        const match = orders.find((o) => o.id === rec.orderId);
        if (match && !match.providerOrderId) {
          await adminUpdateOrderStatus(adminActor, {
            order: match,
            status: 'processing',
            startCount: match.startCount,
            remains: match.remains,
            providerOrderId: rec.providerOrderId,
          });
          syncedDispatchesCount++;
        }
        syncedOrderIds.push(rec.orderId);
      }
      if (syncedOrderIds.length > 0) {
        await markDispatchesSynced(syncedOrderIds);
      }

      // 2. Query live statuses for active provider-backed orders
      const activeWithRef = orders.filter(
        (o) => o.providerOrderId && ['pending', 'processing', 'in_progress'].includes(o.status)
      );

      if (activeWithRef.length > 0) {
        const providerIds = activeWithRef.map((o) => o.providerOrderId);
        const batchResp = await callProviderAction<
          Record<string, { status?: string; start_count?: string | number; remains?: string | number }>
        >('order-status', { orders: providerIds });

        if (batchResp.ok && batchResp.data && typeof batchResp.data === 'object') {
          for (const ord of activeWithRef) {
            const info = batchResp.data[ord.providerOrderId];
            if (!info || !info.status) continue;
            const mapped = mapProviderStatus(String(info.status));
            const nextStart = Number(info.start_count ?? ord.startCount);
            const nextRemains = Number(info.remains ?? ord.remains);
            if (mapped !== ord.status || nextStart !== ord.startCount || nextRemains !== ord.remains) {
              const shouldRefund =
                (mapped === 'canceled' || mapped === 'failed') &&
                ord.status !== 'canceled' &&
                ord.status !== 'failed';
              await adminUpdateOrderStatus(adminActor, {
                order: ord,
                status: mapped,
                startCount: nextStart,
                remains: nextRemains,
                providerOrderId: ord.providerOrderId,
                issueRefund: shouldRefund,
              });
              updatedStatusesCount++;
            }
          }
        }
      }

      pushToast(
        'Provider Sync Complete',
        'success',
        `Synced ${syncedDispatchesCount} dispatches & updated ${updatedStatusesCount} live statuses.`
      );
    } catch (err) {
      pushToast('Bulk Sync Error', 'error', err instanceof Error ? err.message : 'Unable to sync.');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDispatchAllPending = async () => {
    const queue = orders.filter((o) => {
      if (o.status !== 'pending' || o.providerOrderId) return false;
      const srv = services.find((s) => s.id === o.serviceId);
      return Boolean(srv?.providerServiceId && srv.providerServiceId.toLowerCase() !== 'manual');
    });

    if (queue.length === 0) {
      pushToast('No Pending API Orders', 'info', 'All eligible pending orders already have provider refs.');
      return;
    }

    setBulkBusy(true);
    let sent = 0;
    try {
      for (const ord of queue) {
        const srv = services.find((s) => s.id === ord.serviceId);
        if (!srv?.providerServiceId) continue;
        const resp = await callProviderAction<{ order?: string | number }>('order', {
          service: srv.providerServiceId,
          link: ord.targetUrl,
          quantity: ord.quantity,
        });
        if (resp.ok && resp.data?.order) {
          await adminUpdateOrderStatus(adminActor, {
            order: ord,
            status: 'processing',
            startCount: ord.startCount,
            remains: ord.remains,
            providerOrderId: String(resp.data.order),
          });
          sent++;
        }
      }
      pushToast('Batch Dispatch Complete', 'success', `Dispatched ${sent} of ${queue.length} pending orders.`);
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Order Management</h2>
          <p className="text-xs text-violet-300/75">
            Update order statuses, bulk sync with SMM Provider API, trigger refills, and process refunds
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() => void handleDispatchAllPending()}
            className="rounded-xl px-3.5 py-2 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/35 text-xs font-semibold text-sky-100 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Dispatch All Pending</span>
          </button>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() => void handleBulkSyncAll()}
            className="neon-button-primary rounded-xl px-3.5 py-2 text-xs font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${bulkBusy ? 'animate-spin' : ''}`} />
            <span>{bulkBusy ? 'Syncing...' : 'Sync All Provider Orders'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="w-4 h-4 text-violet-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order ID, provider #, target..."
            className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 pl-9 pr-3 py-2 text-xs text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)}
          className="rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
        >
          <option value="all">All Statuses ({orders.length})</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="partial">Partial</option>
          <option value="canceled">Canceled</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-violet-500/15 bg-[#0D0620]/80 text-[11px] text-violet-300/75">
                <th className="py-3 px-4 font-semibold">Order</th>
                <th className="py-3 px-4 font-semibold">Service &amp; Link</th>
                <th className="py-3 px-4 font-semibold text-right">Qty / Price</th>
                <th className="py-3 px-4 font-semibold">Provider Ref</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-500/10 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-violet-300/70">
                    No orders found.
                  </td>
                </tr>
              ) : (
                filtered.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-white">{ord.id}</p>
                      <p className="text-[10px] text-violet-300/65">
                        {formatTimestamp(ord.createdAt)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-white truncate max-w-[220px]">
                        {ord.serviceName}
                      </p>
                      <p className="text-[11px] text-sky-300/80 truncate max-w-[220px]">
                        {ord.targetUrl}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      <p className="text-white">{formatNumber(ord.quantity)}</p>
                      <p className="text-sky-300 font-semibold">
                        {formatCurrency(ord.price, currency, settings)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-violet-200">
                      {ord.providerOrderId || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-[11px] ${getStatusStyles(
                          ord.status
                        )}`}
                      >
                        {getStatusLabel(ord.status)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1">
                      <button
                        type="button"
                        onClick={() => openEdit(ord)}
                        className="px-2.5 py-1.5 rounded-lg bg-violet-600/25 hover:bg-violet-600/40 border border-violet-400/30 text-white"
                      >
                        Edit
                      </button>
                      {!ord.providerOrderId ? (
                        <button
                          type="button"
                          onClick={() => void handleDispatchProvider(ord)}
                          title="Send order to external SMM provider API"
                          className="p-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-200 inline-flex items-center"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleSyncProviderStatus(ord)}
                            title="Sync live status from provider API"
                            className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-200 inline-flex items-center"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRequestRefill(ord)}
                            title="Trigger provider refill"
                            className="p-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-400/30 text-violet-200 inline-flex items-center"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          {ord.status !== 'canceled' && ord.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => void handleCancelProviderOrder(ord)}
                              title="Cancel at provider & refund wallet"
                              className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-200 inline-flex items-center"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveOrder}
            className="glass-panel w-full max-w-md rounded-2xl p-6 border border-violet-400/25 relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="absolute top-4 right-4 text-violet-300 hover:text-white"
              aria-label="Close order edit modal"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white">Update Order {editing.id}</h3>

            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1">Status</label>
              <select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm text-white"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="partial">Partial</option>
                <option value="canceled">Canceled</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-violet-200 mb-1">
                  Start Count
                </label>
                <input
                  type="number"
                  min={0}
                  value={startCount}
                  onChange={(e) => setStartCount(e.target.value)}
                  className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-violet-200 mb-1">Remains</label>
                <input
                  type="number"
                  min={0}
                  value={remains}
                  onChange={(e) => setRemains(e.target.value)}
                  className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1">
                Provider Order Reference
              </label>
              <input
                type="text"
                value={providerOrderId}
                onChange={(e) => setProviderOrderId(e.target.value)}
                placeholder="Optional external provider order ID"
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm font-mono text-white"
              />
            </div>

            {(nextStatus === 'canceled' || nextStatus === 'failed') &&
              editing.status !== 'canceled' &&
              editing.status !== 'failed' && (
                <label className="flex items-center gap-2 text-xs text-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={issueRefund}
                    onChange={(e) => setIssueRefund(e.target.checked)}
                    className="rounded border-violet-400"
                  />
                  <span>
                    Issue full refund of ৳{editing.price.toFixed(2)} back to user wallet
                  </span>
                </label>
              )}

            <button
              type="submit"
              disabled={busy}
              className="w-full neon-button-primary rounded-xl py-2.5 text-sm font-semibold text-white"
            >
              {busy ? 'Saving...' : 'Save Order Changes'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
