import { useMemo, useState } from 'react';
import { Eye, Search, ShoppingBag, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { Order, OrderStatus } from '../../types/smm';
import {
  formatCurrency,
  formatNumber,
  formatTimestamp,
  getStatusLabel,
  getStatusStyles,
} from '../../utils/format';
import { PlatformIcon } from '../shared/PlatformIcon';

const STATUS_FILTERS: Array<{ id: 'all' | OrderStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'Processing' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'partial', label: 'Partial' },
  { id: 'canceled', label: 'Canceled' },
  { id: 'failed', label: 'Failed' },
];

export function OrdersView() {
  const { orders, currency, settings, setUserRoute, firebaseUser, openAuthModal } = useApp();
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.serviceName.toLowerCase().includes(q) ||
        o.targetUrl.toLowerCase().includes(q) ||
        o.providerOrderId.toLowerCase().includes(q)
      );
    });
  }, [orders, statusFilter, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">My Orders</h1>
          <p className="text-xs text-violet-300/80 mt-1">
            Track real-time status updates, remains, and provider fulfillment references
          </p>
        </div>
        <button
          type="button"
          onClick={() => (firebaseUser ? setUserRoute('new-order') : openAuthModal('login'))}
          className="neon-button-primary rounded-xl px-4 py-2 text-xs font-semibold text-white"
        >
          Place New Order
        </button>
      </div>

      {/* Filters & Search */}
      <div className="glass-panel rounded-2xl p-4 space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-violet-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Order ID, service, or target link..."
            className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 pl-10 pr-4 py-2 text-sm text-white placeholder:text-violet-400/45 focus:outline-none focus:border-violet-400"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((st) => {
            const active = statusFilter === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-violet-600 text-white'
                    : 'bg-[#0B051A]/80 text-violet-300/80 hover:text-white border border-violet-500/20'
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-9 h-9 text-violet-400/70 mx-auto mb-2.5" />
            <p className="text-sm font-semibold text-white">No matching orders</p>
            <p className="text-xs text-violet-300/70 mt-1">
              {orders.length === 0
                ? 'You have not placed any orders yet.'
                : 'Try adjusting your status filter or search query.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-violet-500/15 bg-[#0D0620]/80 text-[11px] text-violet-300/75">
                  <th className="py-3 px-4 font-semibold">Order ID</th>
                  <th className="py-3 px-4 font-semibold">Service & Target</th>
                  <th className="py-3 px-4 font-semibold text-right">Quantity</th>
                  <th className="py-3 px-4 font-semibold text-right">Charge</th>
                  <th className="py-3 px-4 font-semibold text-right">Remains</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-500/10 text-xs">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 font-mono text-violet-200 whitespace-nowrap">
                      {ord.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={ord.platform} className="w-4 h-4 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate max-w-[240px]">
                            {ord.serviceName}
                          </p>
                          <p className="text-[11px] text-sky-300/80 truncate max-w-[240px]">
                            {ord.targetUrl}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-white">
                      {formatNumber(ord.quantity)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-sky-300 font-semibold">
                      {formatCurrency(ord.price, currency, settings)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-violet-200">
                      {formatNumber(ord.remains)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md border text-[11px] font-medium whitespace-nowrap ${getStatusStyles(
                          ord.status
                        )}`}
                      >
                        {getStatusLabel(ord.status)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-violet-500/25 border border-violet-500/20 text-violet-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-violet-400/25 relative">
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 text-violet-300 hover:text-white p-1"
              aria-label="Close order details"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white mb-4">Order Details</h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-violet-500/15">
                <span className="text-violet-300/75">Order ID</span>
                <span className="font-mono text-white">{selectedOrder.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-violet-500/15">
                <span className="text-violet-300/75">Service</span>
                <span className="text-white font-semibold text-right max-w-[260px]">
                  {selectedOrder.serviceName}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-violet-500/15">
                <span className="text-violet-300/75">Target Link</span>
                <span className="text-sky-300 break-all text-right max-w-[260px]">
                  {selectedOrder.targetUrl}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-violet-500/15">
                <span className="text-violet-300/75">Quantity / Remains</span>
                <span className="font-mono tabular-nums text-white">
                  {formatNumber(selectedOrder.quantity)} / {formatNumber(selectedOrder.remains)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-violet-500/15">
                <span className="text-violet-300/75">Start Count</span>
                <span className="font-mono tabular-nums text-white">
                  {formatNumber(selectedOrder.startCount)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-violet-500/15">
                <span className="text-violet-300/75">Charge</span>
                <span className="font-mono tabular-nums text-sky-300 font-bold">
                  {formatCurrency(selectedOrder.price, currency, settings)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-violet-500/15">
                <span className="text-violet-300/75">Provider Reference</span>
                <span className="font-mono text-violet-200">
                  {selectedOrder.providerOrderId || 'Queued / Manual Fulfillment'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-violet-500/15">
                <span className="text-violet-300/75">Created At</span>
                <span className="text-violet-200">{formatTimestamp(selectedOrder.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-violet-300/75">Status</span>
                <span
                  className={`px-2.5 py-0.5 rounded-md border text-[11px] font-medium ${getStatusStyles(
                    selectedOrder.status
                  )}`}
                >
                  {getStatusLabel(selectedOrder.status)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
