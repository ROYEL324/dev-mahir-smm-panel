import {
  ArrowLeftRight,
  Crown,
  LayoutDashboard,
  Layers,
  LifeBuoy,
  LogIn,
  LogOut,
  PlusCircle,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { UserRoute } from '../../types/smm';

interface UserSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function UserSidebar({ mobileOpen, onCloseMobile }: UserSidebarProps) {
  const {
    userRoute,
    setUserRoute,
    t,
    firebaseUser,
    profile,
    isAdmin,
    setAppMode,
    openAuthModal,
    handleLogout,
    setMembershipModalOpen,
  } = useApp();

  const navItems: Array<{ id: UserRoute; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: t('navDashboard'), icon: LayoutDashboard },
    { id: 'new-order', label: t('navNewOrder'), icon: PlusCircle },
    { id: 'orders', label: t('navMyOrders'), icon: ShoppingBag },
    { id: 'services', label: t('navServices'), icon: Layers },
    { id: 'add-funds', label: t('navAddFunds'), icon: Wallet },
    { id: 'transactions', label: t('navTransactions'), icon: ArrowLeftRight },
    { id: 'referrals', label: t('navReferrals'), icon: Users },
    { id: 'support', label: t('navSupport'), icon: LifeBuoy },
    { id: 'settings', label: t('navSettings'), icon: Settings },
  ];

  const handleNav = (id: UserRoute) => {
    setUserRoute(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0C061C]/95 backdrop-blur-2xl border-r border-violet-500/15 select-none">
      {/* Brand Lockup */}
      <div className="px-5 pt-6 pb-5 flex items-center justify-between border-b border-violet-500/15">
        <button
          type="button"
          onClick={() => handleNav('dashboard')}
          className="flex items-center gap-3 text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-sky-500 flex items-center justify-center shadow-lg shadow-violet-600/35 ring-1 ring-white/20">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-wide text-white leading-tight">
              {t('brandPlatform')}
            </div>
            <div className="text-xs font-semibold text-violet-300 tracking-wider">
              {t('brandOwner')}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-violet-300 hover:text-white hover:bg-white/5"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = userRoute === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                active
                  ? 'bg-gradient-to-r from-violet-600/35 via-purple-600/25 to-blue-600/20 text-white border border-violet-400/35 shadow-[0_6px_20px_-6px_rgba(124,58,237,0.5)]'
                  : 'text-violet-200/75 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <Icon
                className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                  active ? 'text-sky-300' : 'text-violet-400/80'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        {/* Item 10: Logout / Sign In */}
        {firebaseUser ? (
          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              void handleLogout();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-300/85 hover:text-rose-200 hover:bg-rose-500/10 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            <span className="truncate">{t('navLogout')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              openAuthModal('login');
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-sky-300 hover:text-white hover:bg-sky-500/10 transition-colors whitespace-nowrap"
          >
            <LogIn className="w-[18px] h-[18px] shrink-0" />
            <span className="truncate">{t('navLogin')}</span>
          </button>
        )}

        {/* Protected Admin Switcher */}
        {isAdmin && (
          <div className="pt-3 mt-3 border-t border-violet-500/15">
            <button
              type="button"
              onClick={() => {
                onCloseMobile();
                setAppMode('admin');
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/25 transition-colors whitespace-nowrap"
            >
              <ShieldCheck className="w-[18px] h-[18px] shrink-0 text-amber-300" />
              <span className="truncate">{t('navAdminPanel')}</span>
            </button>
          </div>
        )}
      </nav>

      {/* Bottom Premium Membership Card */}
      <div className="p-4 border-t border-violet-500/15">
        <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-[#23114A] via-[#170A35] to-[#0E173A] border border-violet-400/25 shadow-lg">
          <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-violet-500/25 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-sky-400 flex items-center justify-center shadow">
                <Crown className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-white tracking-wide">
                  {t('premiumCardTitle')}
                </p>
                <p className="text-[11px] text-violet-300/80 capitalize">
                  {profile?.membershipLevel || 'standard'} · {t('premiumCardSub')}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              setMembershipModalOpen(true);
            }}
            className="mt-2.5 w-full neon-button-primary rounded-xl py-2 px-3 text-xs font-semibold text-white whitespace-nowrap"
          >
            {t('upgradeBtn')}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">{sidebarContent}</aside>
        </div>
      )}
    </>
  );
}
