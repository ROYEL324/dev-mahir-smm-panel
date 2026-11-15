import { ArrowRight, CreditCard, PlusCircle, ShoppingBag, Wallet } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { formatCurrency, formatNumber } from '../../utils/format';

export function TopAccountSummary() {
  const {
    firebaseUser,
    profile,
    orders,
    currency,
    settings,
    t,
    setUserRoute,
    openAuthModal,
  } = useApp();

  const walletBalance = firebaseUser ? profile?.walletBalance || 0 : 0;
  const totalOrdersCount = firebaseUser ? orders.length : 0;
  const spendBalance = firebaseUser ? profile?.totalSpending || 0 : 0;

  return (
    <section
      aria-label="Account summary"
      className="mb-6 glass-panel rounded-2xl overflow-hidden border border-violet-400/20 divide-y divide-violet-500/15"
    >
      {/* 1. Top Row: User Balance */}
      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-violet-700/20 via-purple-800/15 to-sky-700/15 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-950/50 ring-1 ring-white/20">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
              {t('topBalanceLabel')}
            </h2>
            <p className="text-xs text-violet-200/75 mt-0.5 truncate">{t('topBalanceSub')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 ml-auto">
          <span className="text-2xl sm:text-[28px] font-extrabold text-white font-mono tabular-nums tracking-tight whitespace-nowrap">
            {formatCurrency(walletBalance, currency, settings)}
          </span>
          <button
            type="button"
            onClick={() => (firebaseUser ? setUserRoute('add-funds') : openAuthModal('login'))}
            className="neon-button-primary rounded-xl px-4 py-2 text-xs font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{firebaseUser ? t('navAddFunds') : t('navLogin')}</span>
          </button>
        </div>
      </div>

      {/* 2. Second Row: Total Orders */}
      <div className="px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-400/25 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4 text-violet-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-tight truncate">
              {t('topTotalOrdersLabel')}
            </p>
            <p className="text-xs text-violet-300/70 mt-0.5 truncate">{t('topTotalOrdersSub')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 ml-auto">
          <span className="text-lg sm:text-xl font-bold text-violet-100 font-mono tabular-nums whitespace-nowrap">
            {formatNumber(totalOrdersCount)}
          </span>
          <button
            type="button"
            onClick={() => (firebaseUser ? setUserRoute('orders') : openAuthModal('login'))}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-sky-300 hover:text-sky-200 hover:bg-white/[0.04] inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors min-h-[40px]"
          >
            <span>{t('navMyOrders')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Third Row: Spend Balance */}
      <div className="px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/25 flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4 text-sky-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-tight truncate">
              {t('topSpendBalanceLabel')}
            </p>
            <p className="text-xs text-violet-300/70 mt-0.5 truncate">{t('topSpendBalanceSub')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 ml-auto">
          <span className="text-lg sm:text-xl font-bold text-sky-300 font-mono tabular-nums whitespace-nowrap">
            {formatCurrency(spendBalance, currency, settings)}
          </span>
          <button
            type="button"
            onClick={() => (firebaseUser ? setUserRoute('transactions') : openAuthModal('login'))}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-violet-200 hover:text-white hover:bg-white/[0.04] inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors min-h-[40px]"
          >
            <span>{t('navTransactions')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
