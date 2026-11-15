import { useMemo, useRef, useState, useEffect } from 'react';
import {
  Bell,
  ChevronDown,
  Globe,
  LogIn,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { markNotificationRead } from '../../services/firestoreService';
import type { CurrencyCode } from '../../types/smm';
import { formatCurrency, formatTimestamp } from '../../utils/format';

const DEFAULT_AVATAR = '/src/assets/images/mahir_dev_avatar_1794736598669.jpg';

export function UserTopBar({ onOpenMobileMenu }: { onOpenMobileMenu: () => void }) {
  const {
    firebaseUser,
    profile,
    isAdmin,
    setAppMode,
    setUserRoute,
    language,
    setLanguage,
    currency,
    setCurrency,
    settings,
    t,
    services,
    globalSearch,
    setGlobalSearch,
    launchOrderForService,
    notifications,
    unreadNotifications,
    openAuthModal,
    handleLogout,
  } = useApp();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setSearchFocused(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const searchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];
    return services
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.platform.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [globalSearch, services]);

  const displayName = profile?.displayName || 'MAHIR DEV';
  const membershipLabel = profile
    ? `${profile.membershipLevel.charAt(0).toUpperCase()}${profile.membershipLevel.slice(1)} Member`
    : 'MAHIR DEV Account';

  return (
    <header className="sticky top-0 z-20 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 bg-[#0B051B]/85 backdrop-blur-xl border-b border-violet-500/15">
      {/* Left: Mobile drawer trigger + Service search field */}
      <div className="flex items-center gap-3 flex-1 min-w-0 max-w-xl">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-white/[0.04] border border-violet-500/20 text-violet-200 hover:text-white shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div ref={searchRef} className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-violet-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={globalSearch}
            onFocus={() => setSearchFocused(true)}
            onChange={(e) => setGlobalSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && globalSearch.trim()) {
                setUserRoute('services');
                setSearchFocused(false);
              }
            }}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-xl bg-[#13092B]/90 border border-violet-500/20 pl-10 pr-4 py-2 text-sm text-white placeholder:text-violet-300/45 focus:outline-none focus:border-violet-400/60 transition-colors"
            aria-label="Search SMM services"
          />

          {searchFocused && globalSearch.trim().length > 0 && (
            <div className="absolute left-0 right-0 mt-2 rounded-2xl glass-panel border border-violet-400/25 overflow-hidden z-40">
              {searchResults.length > 0 ? (
                <div className="divide-y divide-violet-500/15">
                  {searchResults.map((srv) => (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => {
                        setSearchFocused(false);
                        launchOrderForService(srv.id);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-violet-500/15 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{srv.name}</p>
                        <p className="text-xs text-violet-300/75">
                          {srv.platform} · Min {srv.minQty} / Max {srv.maxQty}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-semibold text-sky-300 shrink-0 tabular-nums">
                        {formatCurrency(srv.ratePer1000, currency, settings)}/1k
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-xs text-violet-300/75">
                  No matching services found for &ldquo;{globalSearch}&rdquo;.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Language, Currency, Notifications, Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Language Toggle */}
        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-violet-500/20 text-xs font-semibold text-violet-100 transition-colors whitespace-nowrap"
          title="Switch Language (English / বাংলা)"
        >
          <Globe className="w-3.5 h-3.5 text-sky-300" />
          <span>{language === 'en' ? 'EN' : 'বাংলা'}</span>
        </button>

        {/* Currency Selector */}
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
          aria-label="Select currency"
          className="hidden md:block rounded-xl bg-[#13092B] border border-violet-500/20 px-2.5 py-1.5 text-xs font-mono font-semibold text-violet-100 focus:outline-none focus:border-violet-400"
        >
          <option value="BDT">BDT (৳)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
        </select>

        {/* Notifications Bell */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            className="relative p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-violet-500/20 text-violet-200 hover:text-white transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-violet-500 to-sky-500 text-[10px] font-bold text-white flex items-center justify-center tabular-nums">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl glass-panel border border-violet-400/25 overflow-hidden z-40">
              <div className="px-4 py-3 border-b border-violet-500/15 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Notifications</span>
                <span className="text-xs text-violet-300/75 tabular-nums">
                  {unreadNotifications} unread
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-violet-500/15">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-violet-300/70">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 ${n.read ? 'opacity-70' : 'bg-violet-500/10'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-white">{n.title}</p>
                        {!n.read && n.userId !== 'all' && (
                          <button
                            type="button"
                            onClick={() => void markNotificationRead(n.id)}
                            className="text-[11px] text-sky-300 hover:underline shrink-0"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-violet-200/80 mt-1 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-violet-300/55 mt-1">
                        {formatTimestamp(n.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-violet-500/20 transition-colors"
            aria-label="User profile menu"
          >
            {!avatarError ? (
              <img
                src={profile?.photoURL || DEFAULT_AVATAR}
                alt="MAHIR DEV avatar"
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-8 h-8 rounded-lg object-cover border border-violet-400/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-sky-500 flex items-center justify-center text-xs font-bold text-white">
                MD
              </div>
            )}
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-white leading-tight whitespace-nowrap">
                {displayName}
              </div>
              <div className="text-[11px] text-violet-300/80 leading-tight whitespace-nowrap">
                {membershipLabel}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-violet-300/75" />
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-2xl glass-panel border border-violet-400/25 overflow-hidden z-40 py-1.5">
              <div className="px-4 py-2.5 border-b border-violet-500/15">
                <p className="text-xs font-bold text-white truncate">{displayName}</p>
                <p className="text-[11px] text-violet-300/75 truncate">
                  {firebaseUser ? firebaseUser.email : 'Not signed in'}
                </p>
                {profile && (
                  <p className="text-xs font-mono font-semibold text-sky-300 mt-1 tabular-nums">
                    {formatCurrency(profile.walletBalance, currency, settings)}
                  </p>
                )}
              </div>

              {firebaseUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setUserRoute('add-funds');
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-violet-100 hover:bg-white/5 flex items-center gap-2.5"
                  >
                    <Wallet className="w-3.5 h-3.5 text-sky-300" />
                    <span>{t('navAddFunds')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setUserRoute('settings');
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-violet-100 hover:bg-white/5 flex items-center gap-2.5"
                  >
                    <Settings className="w-3.5 h-3.5 text-violet-300" />
                    <span>{t('navSettings')}</span>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setAppMode('admin');
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-amber-200 hover:bg-amber-500/10 flex items-center gap-2.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                      <span>{t('navAdminPanel')}</span>
                    </button>
                  )}
                  <div className="my-1 border-t border-violet-500/15" />
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      void handleLogout();
                    }}
                    className="w-full px-4 py-2 text-left text-xs text-rose-300 hover:bg-rose-500/10 flex items-center gap-2.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('navLogout')}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    openAuthModal('login');
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-sky-300 hover:bg-white/5 flex items-center gap-2.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In / Register</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
