import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  CreditCard,
  Gift,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  PlugZap,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Users,
  X,
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
import { fetchProviderStatus, type ProviderServerStatus } from '../../services/apiService';
import {
  subscribeAllDeposits,
  subscribeAllOrders,
  subscribeAllReferrals,
  subscribeAllTickets,
  subscribeAllUsers,
  subscribeAllWithdrawals,
  subscribeAuditLogs,
  subscribeProviderConfigs,
} from '../../services/firestoreService';
import type {
  AdminRoute,
  AuditLog,
  Deposit,
  Order,
  ProviderConfig,
  Referral,
  SupportTicket,
  UserProfile,
  Withdrawal,
} from '../../types/smm';
import { formatCurrency, formatNumber, formatTimestamp } from '../../utils/format';
import { AdminDepositsTab } from './AdminDepositsTab';
import {
  AdminLogsTab,
  AdminNotificationsTab,
  AdminReferralsTab,
  AdminSettingsTab,
  AdminSupportTab,
} from './AdminOperationsTabs';
import { AdminOrdersTab } from './AdminOrdersTab';
import { AdminProviderTab } from './AdminProviderTab';
import { AdminServicesTab } from './AdminServicesTab';
import { AdminUsersTab } from './AdminUsersTab';

export function AdminPanel() {
  const {
    isAdmin,
    firebaseUser,
    setAppMode,
    adminRoute,
    setAdminRoute,
    currency,
    settings,
    services,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [providerStatus, setProviderStatus] = useState<ProviderServerStatus | null>(null);

  useEffect(() => {
    if (!isAdmin || !firebaseUser) return;
    const unsubs = [
      subscribeAllUsers(setUsers),
      subscribeAllOrders(setOrders),
      subscribeAllDeposits(setDeposits),
      subscribeAllWithdrawals(setWithdrawals),
      subscribeAllTickets(setTickets),
      subscribeAllReferrals(setReferrals),
      subscribeProviderConfigs(setProviders),
      subscribeAuditLogs(setLogs),
    ];
    void fetchProviderStatus()
      .then(setProviderStatus)
      .catch(() => null);
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [isAdmin, firebaseUser]);

  const metrics = useMemo(() => {
    const pendingOrders = orders.filter((o) =>
      ['pending', 'processing', 'in_progress'].includes(o.status)
    ).length;
    const completedOrders = orders.filter((o) => o.status === 'completed').length;
    const pendingDeposits = deposits.filter((d) => d.status === 'pending').length;
    const openTickets = tickets.filter((t) => t.status === 'open').length;
    const approvedDeposits = deposits
      .filter((d) => d.status === 'approved')
      .reduce((sum, d) => sum + d.amount, 0);
    const totalRevenue = orders
      .filter((o) => o.status !== 'canceled' && o.status !== 'failed')
      .reduce((sum, o) => sum + o.price, 0);

    return {
      totalUsers: users.length,
      totalOrders: orders.length,
      pendingOrders,
      completedOrders,
      pendingDeposits,
      openTickets,
      approvedDeposits,
      totalRevenue,
    };
  }, [users, orders, deposits, tickets]);

  const dailyChartData = useMemo(() => {
    if (orders.length === 0) return [];
    const buckets = new Map<string, { day: string; orders: number; revenue: number }>();
    const sorted = [...orders].reverse();
    for (const ord of sorted) {
      const date = ord.createdAt ? ord.createdAt.toDate() : new Date();
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
      ).padStart(2, '0')}`;
      const label = date.toLocaleString('en-US', { month: 'short', day: 'numeric' });
      const cur = buckets.get(key) || { day: label, orders: 0, revenue: 0 };
      cur.orders += 1;
      if (ord.status !== 'canceled' && ord.status !== 'failed') {
        cur.revenue = Math.round((cur.revenue + ord.price) * 100) / 100;
      }
      buckets.set(key, cur);
    }
    return Array.from(buckets.values()).slice(-14);
  }, [orders]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#090414]">
        <div className="glass-panel max-w-md w-full rounded-2xl p-8 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
          <h1 className="text-xl font-bold text-white">Protected Admin Route</h1>
          <p className="text-xs text-violet-300/80 leading-relaxed">
            Access to the MAHIR DEV Admin Console requires a backend-verified administrator role.
          </p>
          <button
            type="button"
            onClick={() => setAppMode('user')}
            className="neon-button-primary rounded-xl px-5 py-2.5 text-xs font-semibold text-white"
          >
            Return to User Dashboard
          </button>
        </div>
      </div>
    );
  }

  const navItems: Array<{
    id: AdminRoute;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
  }> = [
    { id: 'overview', label: 'Admin Overview', icon: LayoutDashboard },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'orders', label: 'Order Management', icon: ShoppingBag, badge: metrics.pendingOrders },
    { id: 'services', label: 'Services & Categories', icon: Layers },
    { id: 'deposits', label: 'Deposits & Withdrawals', icon: CreditCard, badge: metrics.pendingDeposits },
    { id: 'referrals', label: 'Referral Settings', icon: Gift },
    { id: 'support', label: 'Support Tickets', icon: LifeBuoy, badge: metrics.openTickets },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'providers', label: 'SMM Provider API', icon: Server },
    { id: 'settings', label: 'Website & Banner Control', icon: Settings },
    { id: 'logs', label: 'Admin Activity Logs', icon: Activity },
  ];

  const sidebarBody = (
    <div className="flex flex-col h-full bg-[#0B051A] border-r border-violet-500/20">
      <div className="px-5 py-5 border-b border-violet-500/15 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-violet-600 flex items-center justify-center shadow">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-white tracking-wider">MAHIR DEV</p>
            <p className="text-[11px] text-amber-300 font-semibold">Admin Console</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden text-violet-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = adminRoute === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setAdminRoute(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                active
                  ? 'bg-violet-600/35 text-white border border-violet-400/35'
                  : 'text-violet-200/75 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-sky-300' : 'text-violet-400'}`} />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/40 text-[10px] font-bold text-amber-200 shrink-0">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-violet-500/15">
        <button
          type="button"
          onClick={() => setAppMode('user')}
          className="w-full rounded-xl py-2.5 px-3 bg-white/[0.05] hover:bg-white/[0.1] border border-violet-400/25 text-xs font-semibold text-white flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4 text-sky-300" />
          <span>Back to User Panel</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#080312] text-[#F5F2FF]">
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {sidebarBody}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">{sidebarBody}</aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between bg-[#0B051B]/90 backdrop-blur-xl border-b border-violet-500/15">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/[0.04] border border-violet-500/20 text-violet-200"
              aria-label="Open admin menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-base font-bold text-white">
              MAHIR DEV · Protected Admin Console
            </h1>
          </div>
          <span className="text-xs text-violet-300/80 font-mono hidden sm:inline">
            {firebaseUser?.email}
          </span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {adminRoute === 'overview' && (
            <div className="space-y-6">
              {/* Quick Operational Action Strip */}
              <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 border border-violet-400/25">
                <div className="flex items-center gap-3">
                  <PlugZap
                    className={`w-5 h-5 shrink-0 ${
                      providerStatus?.configured ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  />
                  <div className="text-xs">
                    <p className="font-bold text-white">
                      {providerStatus?.configured
                        ? `SMM Provider Connected (${providerStatus.name})`
                        : 'SMM Provider API Not Configured'}
                    </p>
                    <p className="text-violet-300/80">
                      {services.length} active catalog services · {metrics.pendingDeposits} pending
                      deposits · {metrics.openTickets} open support tickets
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminRoute('providers')}
                    className="px-3.5 py-2 rounded-xl neon-button-primary text-xs font-semibold text-white"
                  >
                    {providerStatus?.configured ? 'Manage API & Import' : 'Connect Real API'}
                  </button>
                  {metrics.pendingDeposits > 0 && (
                    <button
                      type="button"
                      onClick={() => setAdminRoute('deposits')}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-400/35 text-xs font-semibold text-amber-100"
                    >
                      Verify Deposits ({metrics.pendingDeposits})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAdminRoute('settings')}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-violet-400/25 text-xs font-semibold text-white"
                  >
                    Banners &amp; Support Links
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-violet-300/75">Total Registered Users</p>
                    <p className="text-2xl font-bold text-white font-mono tabular-nums mt-1">
                      {formatNumber(metrics.totalUsers)}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-violet-400" />
                </div>
                <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-violet-300/75">Total Orders</p>
                    <p className="text-2xl font-bold text-white font-mono tabular-nums mt-1">
                      {formatNumber(metrics.totalOrders)}
                    </p>
                  </div>
                  <ShoppingBag className="w-8 h-8 text-sky-400" />
                </div>
                <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-violet-300/75">Pending / Active Orders</p>
                    <p className="text-2xl font-bold text-amber-300 font-mono tabular-nums mt-1">
                      {formatNumber(metrics.pendingOrders)}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-amber-400" />
                </div>
                <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-violet-300/75">Completed Orders</p>
                    <p className="text-2xl font-bold text-emerald-300 font-mono tabular-nums mt-1">
                      {formatNumber(metrics.completedOrders)}
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-violet-300/75">Total Verified Deposits</p>
                    <p className="text-2xl font-bold text-white font-mono tabular-nums mt-1">
                      {formatCurrency(metrics.approvedDeposits, currency, settings)}
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-violet-400" />
                </div>
                <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-violet-300/75">Total Order Revenue</p>
                    <p className="text-2xl font-bold text-sky-300 font-mono tabular-nums mt-1">
                      {formatCurrency(metrics.totalRevenue, currency, settings)}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-sky-400" />
                </div>
              </div>

              {/* Revenue & Order Volume Chart */}
              <div className="glass-panel rounded-2xl p-6">
                <h2 className="text-base font-bold text-white mb-4">
                  Platform Order Volume &amp; Revenue Overview
                </h2>
                {dailyChartData.length === 0 ? (
                  <p className="text-xs text-violet-300/70 py-8 text-center">
                    Order analytics chart populates automatically as customers submit orders.
                  </p>
                ) : (
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyChartData}>
                        <defs>
                          <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(167, 139, 250, 0.1)" />
                        <XAxis dataKey="day" stroke="#A78BFA" fontSize={11} />
                        <YAxis stroke="#A78BFA" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#13092B',
                            border: '1px solid rgba(167,139,250,0.3)',
                            borderRadius: '12px',
                            fontSize: '12px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#38BDF8"
                          strokeWidth={2}
                          fill="url(#adminRevGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="glass-panel rounded-2xl p-6">
                <h2 className="text-base font-bold text-white mb-4">Recent Admin Activities</h2>
                {logs.length === 0 ? (
                  <p className="text-xs text-violet-300/70">No administrative actions recorded yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {logs.slice(0, 8).map((l) => (
                      <div
                        key={l.id}
                        className="rounded-xl p-3 bg-[#0B051A]/80 border border-violet-500/15 flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-mono text-sky-300 font-semibold">{l.action}</span>{' '}
                          <span className="text-white">{l.details}</span>
                        </div>
                        <span className="text-violet-300/65 text-[11px]">
                          {l.adminEmail} · {formatTimestamp(l.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {adminRoute === 'users' && <AdminUsersTab users={users} />}
          {adminRoute === 'orders' && <AdminOrdersTab orders={orders} />}
          {adminRoute === 'services' && (
            <AdminServicesTab onOpenProviders={() => setAdminRoute('providers')} />
          )}
          {adminRoute === 'deposits' && (
            <AdminDepositsTab deposits={deposits} withdrawals={withdrawals} />
          )}
          {adminRoute === 'referrals' && <AdminReferralsTab referrals={referrals} />}
          {adminRoute === 'support' && <AdminSupportTab tickets={tickets} />}
          {adminRoute === 'notifications' && <AdminNotificationsTab />}
          {adminRoute === 'providers' && <AdminProviderTab configs={providers} />}
          {adminRoute === 'settings' && <AdminSettingsTab />}
          {adminRoute === 'logs' && <AdminLogsTab logs={logs} />}
        </main>
      </div>
    </div>
  );
}
