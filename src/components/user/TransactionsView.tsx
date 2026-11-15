import { useMemo, useState } from 'react';
import { ArrowLeftRight, Search } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { TransactionType } from '../../types/smm';
import { formatCurrency, formatTimestamp } from '../../utils/format';

export function TransactionsView() {
  const { transactions, currency, settings, t } = useApp();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (!q) return true;
      return (
        tx.id.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q) ||
        tx.referenceId.toLowerCase().includes(q)
      );
    });
  }, [transactions, search, typeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('navTransactions')}</h1>
        <p className="text-xs text-violet-300/80 mt-1">
          Immutable financial ledger of order charges, verified deposits, refunds, and referral credits
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-violet-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by transaction ID or description..."
            className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 pl-10 pr-4 py-2 text-sm text-white placeholder:text-violet-400/45 focus:outline-none focus:border-violet-400"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | TransactionType)}
          aria-label="Filter transaction type"
          className="rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-violet-400"
        >
          <option value="all">All Types</option>
          <option value="order_debit">Order Debits</option>
          <option value="deposit_credit">Deposits</option>
          <option value="refund_credit">Refunds</option>
          <option value="referral_bonus">Referral Bonuses</option>
          <option value="admin_adjustment">Admin Adjustments</option>
          <option value="withdrawal_debit">Withdrawals</option>
        </select>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ArrowLeftRight className="w-8 h-8 text-violet-400/70 mx-auto mb-2.5" />
            <p className="text-sm font-semibold text-white">No Transactions Recorded</p>
            <p className="text-xs text-violet-300/70 mt-1">{t('noTransactionsYet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-violet-500/15 bg-[#0D0620]/80 text-[11px] text-violet-300/75">
                  <th className="py-3 px-4 font-semibold">Transaction ID</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  <th className="py-3 px-4 font-semibold text-right">Balance After</th>
                  <th className="py-3 px-4 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-500/10 text-xs">
                {filtered.map((tx) => {
                  const isPositive = tx.amount >= 0;
                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-4 font-mono text-violet-200 whitespace-nowrap">
                        {tx.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-white font-medium">{tx.description}</p>
                        <p className="text-[11px] text-violet-300/65 capitalize">
                          {tx.type.replace('_', ' ')} · Ref: {tx.referenceId}
                        </p>
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                          isPositive ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {isPositive ? '+' : '-'}
                        {formatCurrency(Math.abs(tx.amount), currency, settings)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-violet-100 whitespace-nowrap">
                        {formatCurrency(tx.balanceAfter, currency, settings)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-violet-300/70 whitespace-nowrap">
                        {formatTimestamp(tx.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
