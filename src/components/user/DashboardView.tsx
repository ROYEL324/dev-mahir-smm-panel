import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Headphones,
  Layers,
  Megaphone,
  PlusCircle,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../../contexts/AppContext';
import { STARTER_SERVICES } from '../../services/firestoreService';
import {
  formatCurrency,
  formatNumber,
  formatTimestamp,
  getStatusLabel,
  getStatusStyles,
} from '../../utils/format';
import astronautHeroAsset from '../../assets/images/astronaut_hero_3d_1794736598608.jpg';
import { PlatformIcon } from '../shared/PlatformIcon';

const DEFAULT_HERO_ASTRONAUT_IMAGE = '/src/assets/images/astronaut_hero_3d_1794736598608.jpg';

export function DashboardView() {
  const {
    t,
    firebaseUser,
    profile,
    orders,
    services,
    referrals,
    tickets,
    settings,
    currency,
    setUserRoute,
    launchOrderForService,
    openAuthModal,
  } = useApp();

  const [heroImgError, setHeroImgError] = useState(false);

  const totalOrders = orders.length;

  const successRateDisplay = useMemo(() => {
    const finalized = orders.filter((o) =>
      ['completed', 'partial', 'canceled', 'failed'].includes(o.status)
    );
    if (finalized.length === 0) return '—';
    const completed = finalized.filter((o) => o.status === 'completed').length;
    return `${Math.round((completed / finalized.length) * 100)}%`;
  }, [orders]);

  const openTicketsCount = useMemo(
    () => tickets.filter((tk) => tk.status !== 'closed').length,
    [tickets]
  );

  const monthlyChartData = useMemo(() => {
    if (orders.length === 0) return [];
    const buckets = new Map<string, { month: string; orders: number; spend: number }>();
    const sorted = [...orders].reverse();
    for (const ord of sorted) {
      const date = ord.createdAt ? ord.createdAt.toDate() : new Date();
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const existing = buckets.get(key) || { month: label, orders: 0, spend: 0 };
      existing.orders += 1;
      existing.spend = Math.round((existing.spend + ord.price) * 100) / 100;
      buckets.set(key, existing);
    }
    return Array.from(buckets.values());
  }, [orders]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);
  const popularServices = useMemo(() => {
    if (services.length > 0) return services.slice(0, 5);
    return STARTER_SERVICES.slice(0, 5).map((s) => ({
      ...s,
      createdAt: null,
      updatedAt: null,
    }));
  }, [services]);

  const rawHeroUrl = settings.heroBannerImageUrl?.trim() || '';
  const heroImageSrc =
    !rawHeroUrl || rawHeroUrl === DEFAULT_HERO_ASTRONAUT_IMAGE ? astronautHeroAsset : rawHeroUrl;

  const statCards = [
    {
      label: t('statTotalOrders'),
      value: firebaseUser ? formatNumber(totalOrders) : '0',
      sub: t('statOrdersDesc'),
      icon: ShoppingBag,
      glow: 'from-violet-500 to-purple-600',
    },
    {
      label: t('statSuccessRate'),
      value: firebaseUser ? successRateDisplay : '—',
      sub: t('statSuccessDesc'),
      icon: CheckCircle2,
      glow: 'from-sky-400 to-blue-600',
    },
    {
      label: t('statActiveUsers'),
      value: firebaseUser ? formatNumber(referrals.length) : '0',
      sub: t('statUsersDesc'),
      icon: Users,
      glow: 'from-fuchsia-500 to-violet-600',
    },
    {
      label: t('statSupportStatus'),
      value: settings.supportOnline ? t('statSupportOnline') : t('statSupportOffline'),
      sub: firebaseUser
        ? `${openTicketsCount} open tickets · ${settings.supportHours}`
        : settings.supportHours,
      icon: Headphones,
      glow: 'from-indigo-400 to-sky-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Admin-Controlled Announcement / Promo Banner */}
      {settings.promoBannerEnabled && settings.promoBannerText && (
        <div className="glass-panel rounded-2xl px-4 py-3 border border-violet-400/25 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-violet-100">
            <Megaphone className="w-4 h-4 text-sky-300 shrink-0" />
            <span>{settings.promoBannerText}</span>
          </div>
          <button
            type="button"
            onClick={() => (firebaseUser ? setUserRoute('add-funds') : openAuthModal('login'))}
            className="text-xs font-semibold text-sky-300 hover:text-sky-200 whitespace-nowrap"
          >
            {firebaseUser ? 'Add Funds →' : 'Sign In →'}
          </button>
        </div>
      )}

      {/* Futuristic 3D Purple Astronaut Hero Section (Admin Controllable) */}
      <section className="relative overflow-hidden rounded-3xl glass-panel border border-violet-400/20 p-6 sm:p-8 lg:p-10">
        <div
          className="absolute -left-24 -top-24 w-72 h-72 rounded-full bg-violet-600/25 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute right-10 bottom-0 w-80 h-80 rounded-full bg-blue-600/20 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <p className="text-xs font-semibold tracking-widest uppercase text-sky-300">
              {settings.heroKicker || 'MAHIR DEV · Next-Gen Social Growth Infrastructure'}
            </p>
            <h1 className="text-3xl sm:text-4xl xl:text-[42px] font-extrabold tracking-tight text-white leading-[1.12] [text-wrap:balance]">
              {settings.heroTitle || t('heroTitle')}
            </h1>
            <p className="text-base sm:text-lg text-violet-200/85 max-w-xl leading-relaxed">
              {settings.heroSubtitle || t('heroSubtitle')}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (!firebaseUser) {
                    openAuthModal('login');
                  } else {
                    setUserRoute('new-order');
                  }
                }}
                className="neon-button-primary rounded-xl px-6 py-3 text-sm font-semibold text-white inline-flex items-center gap-2 whitespace-nowrap"
              >
                <span>{settings.heroCtaText || t('heroCta')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setUserRoute('services')}
                className="rounded-xl px-5 py-3 text-sm font-semibold text-violet-100 bg-white/[0.06] hover:bg-white/[0.11] border border-violet-400/25 transition-colors whitespace-nowrap"
              >
                {settings.heroSecondaryCtaText || t('heroSecondaryCta')}
              </button>
            </div>
          </div>

          {/* 3D Astronaut / Custom Banner Visual Anchor */}
          <div className="lg:col-span-5 flex items-center justify-center relative">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 flex items-center justify-center">
              <div
                className="absolute inset-2 rounded-full bg-gradient-to-tr from-violet-600/35 via-purple-500/20 to-sky-400/30 blur-2xl animate-orbit-pulse pointer-events-none"
                aria-hidden="true"
              />
              {!heroImgError ? (
                <div className="relative w-full h-full rounded-3xl overflow-hidden border border-violet-400/25 shadow-[0_24px_60px_-15px_rgba(124,58,237,0.55)] animate-astronaut-float">
                  <img
                    src={heroImageSrc}
                    alt="MAHIR DEV Futuristic 3D Purple Astronaut Banner"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-[#0D0620]/60 via-transparent to-transparent pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              ) : (
                <div className="w-full h-full rounded-3xl bg-gradient-to-br from-violet-900/60 to-blue-900/40 border border-violet-400/30 flex flex-col items-center justify-center p-6 text-center animate-astronaut-float">
                  <TrendingUp className="w-14 h-14 text-sky-300 mb-3" />
                  <p className="text-sm font-bold text-white">MAHIR DEV</p>
                  <p className="text-xs text-violet-300">SMM Growth Engine</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Four Glowing Statistics Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="glass-card rounded-2xl p-5 flex items-start justify-between gap-4 hover:-translate-y-0.5"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-violet-300/80 truncate">{card.label}</p>
                <p className="text-2xl sm:text-[28px] font-bold text-white mt-1.5 font-mono tabular-nums tracking-tight">
                  {card.value}
                </p>
                <p className="text-xs text-violet-300/65 mt-1.5 leading-snug">{card.sub}</p>
              </div>
              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.glow} flex items-center justify-center shrink-0 shadow-lg shadow-violet-950/60 ring-1 ring-white/25`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
          );
        })}
      </section>

      {/* Analytics Chart + Account Balance Overview */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 glass-panel rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-bold text-white">{t('chartTitle')}</h2>
              <p className="text-xs text-violet-300/75">
                Live monthly volume and spend derived from your Cloud Firestore orders
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUserRoute('orders')}
              className="text-xs font-semibold text-sky-300 hover:text-sky-200 transition-colors"
            >
              View All Orders →
            </button>
          </div>

          {monthlyChartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData}>
                  <defs>
                    <linearGradient id="purpleOrderGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(167,139,250,0.12)" />
                  <XAxis dataKey="month" stroke="#A78BFA" fontSize={12} tickLine={false} />
                  <YAxis stroke="#A78BFA" fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#120829',
                      borderColor: 'rgba(139,92,246,0.35)',
                      borderRadius: '12px',
                      color: '#F5F2FF',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="#A855F7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#purpleOrderGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 rounded-2xl border border-dashed border-violet-500/25 bg-[#0A0518]/60 flex flex-col items-center justify-center text-center p-6">
              <TrendingUp className="w-8 h-8 text-violet-400/70 mb-2.5" />
              <p className="text-sm font-semibold text-white">No Order Analytics Yet</p>
              <p className="text-xs text-violet-300/70 max-w-sm mt-1 mb-4">
                Your real monthly order trends and spending chart will populate automatically once you place your first order.
              </p>
              <button
                type="button"
                onClick={() => (firebaseUser ? setUserRoute('new-order') : openAuthModal('login'))}
                className="neon-button-primary rounded-xl px-4 py-2 text-xs font-semibold text-white"
              >
                {firebaseUser ? 'Place First Order' : 'Sign In to Start'}
              </button>
            </div>
          )}
        </div>

        <div className="xl:col-span-4 glass-panel rounded-2xl p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{t('balanceOverviewTitle')}</h2>
              <Wallet className="w-5 h-5 text-sky-300" />
            </div>

            <div className="rounded-2xl p-4 bg-gradient-to-br from-violet-700/25 via-purple-800/20 to-blue-700/20 border border-violet-400/25 mb-4">
              <p className="text-xs text-violet-200/80">{t('currentBalance')}</p>
              <p className="text-3xl font-bold text-white font-mono tabular-nums mt-1">
                {formatCurrency(profile?.walletBalance || 0, currency, settings)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 bg-[#0C061C]/80 border border-violet-500/15">
                <p className="text-[11px] text-violet-300/75">{t('totalDeposits')}</p>
                <p className="text-sm font-bold text-emerald-300 font-mono tabular-nums mt-1">
                  {formatCurrency(profile?.totalDeposits || 0, currency, settings)}
                </p>
              </div>
              <div className="rounded-xl p-3 bg-[#0C061C]/80 border border-violet-500/15">
                <p className="text-[11px] text-violet-300/75">{t('totalSpending')}</p>
                <p className="text-sm font-bold text-violet-100 font-mono tabular-nums mt-1">
                  {formatCurrency(profile?.totalSpending || 0, currency, settings)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-violet-300/80 mb-2.5">{t('quickActionsTitle')}</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => (firebaseUser ? setUserRoute('new-order') : openAuthModal('login'))}
                className="rounded-xl px-3 py-2.5 bg-violet-600/20 hover:bg-violet-600/35 border border-violet-400/25 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5 text-sky-300" />
                <span>New Order</span>
              </button>
              <button
                type="button"
                onClick={() => (firebaseUser ? setUserRoute('add-funds') : openAuthModal('login'))}
                className="rounded-xl px-3 py-2.5 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/25 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5 text-sky-300" />
                <span>Add Funds</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Orders + Popular Services */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">{t('recentOrdersTitle')}</h2>
            <button
              type="button"
              onClick={() => setUserRoute('orders')}
              className="text-xs font-semibold text-sky-300 hover:text-sky-200"
            >
              See all →
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-violet-500/20 rounded-2xl">
              <ShoppingBag className="w-7 h-7 text-violet-400/70 mx-auto mb-2" />
              <p className="text-sm font-medium text-white">No Orders Yet</p>
              <p className="text-xs text-violet-300/70 mt-1">{t('noOrdersYet')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-violet-500/15 text-[11px] text-violet-300/70">
                    <th className="py-2.5 pr-3 font-semibold">Service</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Qty</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Charge</th>
                    <th className="py-2.5 pl-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-500/10 text-xs">
                  {recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <PlatformIcon platform={ord.platform} className="w-4 h-4 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate max-w-[220px]">
                              {ord.serviceName}
                            </p>
                            <p className="text-[11px] text-violet-300/65 font-mono">
                              {ord.id} · {formatTimestamp(ord.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-violet-100">
                        {formatNumber(ord.quantity)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-sky-300 font-semibold">
                        {formatCurrency(ord.price, currency, settings)}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md border text-[11px] font-medium ${getStatusStyles(
                            ord.status
                          )}`}
                        >
                          {getStatusLabel(ord.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="xl:col-span-5 glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">{t('popularServicesTitle')}</h2>
            <button
              type="button"
              onClick={() => setUserRoute('services')}
              className="text-xs font-semibold text-sky-300 hover:text-sky-200"
            >
              Full Catalog →
            </button>
          </div>

          {popularServices.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-violet-500/20 rounded-2xl">
              <Layers className="w-7 h-7 text-violet-400/70 mx-auto mb-2" />
              <p className="text-sm font-medium text-white">Catalog Empty</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {popularServices.map((srv) => (
                <div
                  key={srv.id}
                  className="rounded-xl p-3.5 bg-[#0C061C]/75 border border-violet-500/15 hover:border-violet-400/40 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-400/20 flex items-center justify-center shrink-0">
                      <PlatformIcon platform={srv.platform} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{srv.name}</p>
                      <p className="text-[11px] text-violet-300/70 font-mono tabular-nums">
                        {formatCurrency(srv.ratePer1000, currency, settings)} / 1,000 · Min {srv.minQty}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!firebaseUser) {
                        openAuthModal('login');
                      } else {
                        launchOrderForService(srv.id);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-violet-600/25 hover:bg-violet-600/45 border border-violet-400/30 text-xs font-semibold text-white shrink-0 transition-colors"
                  >
                    Order
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
