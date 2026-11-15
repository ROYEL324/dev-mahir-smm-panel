import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../firebase';
import { translations } from '../i18n/translations';
import {
  captureReferralFromUrl,
  ensureUserProfile,
  logoutUser,
  verifyAdminRole,
} from '../services/authService';
import {
  adminSeedStarterCatalog,
  DEFAULT_SETTINGS,
  subscribeCategories,
  subscribeServices,
  subscribeSettings,
  subscribeUserDeposits,
  subscribeUserNotifications,
  subscribeUserOrders,
  subscribeUserProfile,
  subscribeUserReferrals,
  subscribeUserTickets,
  subscribeUserTransactions,
  subscribeUserWithdrawals,
} from '../services/firestoreService';
import type {
  AdminRoute,
  CurrencyCode,
  Deposit,
  Language,
  NotificationItem,
  Order,
  PlatformSettings,
  Referral,
  ServiceCategory,
  SmmService,
  SupportTicket,
  ToastMessage,
  Transaction,
  UserProfile,
  UserRoute,
  Withdrawal,
} from '../types/smm';

interface AppContextValue {
  authReady: boolean;
  firebaseUser: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  appMode: 'user' | 'admin';
  setAppMode: (mode: 'user' | 'admin') => void;
  userRoute: UserRoute;
  setUserRoute: (route: UserRoute) => void;
  adminRoute: AdminRoute;
  setAdminRoute: (route: AdminRoute) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  t: (key: string) => string;
  settings: PlatformSettings;
  categories: ServiceCategory[];
  services: SmmService[];
  catalogLoading: boolean;
  orders: Order[];
  transactions: Transaction[];
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  referrals: Referral[];
  tickets: SupportTicket[];
  notifications: NotificationItem[];
  unreadNotifications: number;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  preselectedServiceId: string | null;
  launchOrderForService: (serviceId: string) => void;
  authModalOpen: boolean;
  authModalInitialTab: 'login' | 'register' | 'reset';
  openAuthModal: (tab?: 'login' | 'register' | 'reset') => void;
  closeAuthModal: () => void;
  membershipModalOpen: boolean;
  setMembershipModalOpen: (open: boolean) => void;
  toasts: ToastMessage[];
  pushToast: (title: string, variant?: ToastMessage['variant'], description?: string) => void;
  dismissToast: (id: string) => void;
  handleLogout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [appMode, setAppMode] = useState<'user' | 'admin'>('user');
  const [userRoute, setUserRoute] = useState<UserRoute>('dashboard');
  const [adminRoute, setAdminRoute] = useState<AdminRoute>('overview');

  const [language, setLanguage] = useState<Language>('en');
  const [currency, setCurrency] = useState<CurrencyCode>('BDT');
  const [settings, setSettings] = useState<PlatformSettings>({
    ...DEFAULT_SETTINGS,
    updatedAt: null,
  });

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<SmmService[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [globalSearch, setGlobalSearch] = useState('');
  const [preselectedServiceId, setPreselectedServiceId] = useState<string | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'register' | 'reset'>('login');
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback(
    (title: string, variant: ToastMessage['variant'] = 'info', description?: string) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, description, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const [prof, adminFlag] = await Promise.all([
            ensureUserProfile(user),
            verifyAdminRole(user),
          ]);
          setProfile(prof);
          setIsAdmin(adminFlag);
          if (prof?.language) {
            setLanguage(prof.language);
          }
        } catch (err) {
          console.error('Error hydrating authenticated session:', err);
          setIsAdmin(false);
        }
      } else {
        setProfile(null);
        setIsAdmin(false);
        setAppMode('user');
        setOrders([]);
        setTransactions([]);
        setDeposits([]);
        setWithdrawals([]);
        setReferrals([]);
        setTickets([]);
        setNotifications([]);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Public & catalog subscriptions
  useEffect(() => {
    if (!authReady) return;
    setCatalogLoading(true);
    const unsubSettings = subscribeSettings((s) => {
      setSettings(s);
    });
    const unsubCats = subscribeCategories(isAdmin, (cats) => {
      setCategories(cats);
    });
    const unsubSrvs = subscribeServices(isAdmin, (srvs) => {
      setServices(srvs);
      setCatalogLoading(false);
    });
    return () => {
      unsubSettings();
      unsubCats();
      unsubSrvs();
    };
  }, [authReady, isAdmin]);

  const autoSeedAttemptedRef = useRef(false);

  // Automatically initialize starter services, categories & bKash/Nagad settings on first admin sign-in
  useEffect(() => {
    if (
      !authReady ||
      !isAdmin ||
      !firebaseUser ||
      catalogLoading ||
      services.length > 0 ||
      autoSeedAttemptedRef.current
    ) {
      return;
    }

    autoSeedAttemptedRef.current = true;
    void adminSeedStarterCatalog({
      uid: firebaseUser.uid,
      email: firebaseUser.email || 'mdsalimkhanbosstr@gmail.com',
    })
      .then(() => {
        pushToast(
          'Starter Services & Settings Synced',
          'success',
          '12 starter services and bKash/Nagad 01804515459 saved to Firestore.'
        );
      })
      .catch((err) => {
        console.warn('Auto-seed catalog warning:', err);
      });
  }, [authReady, isAdmin, firebaseUser, catalogLoading, services.length, pushToast]);

  // Authenticated user subscriptions
  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const uid = firebaseUser.uid;
    const unsubs = [
      subscribeUserProfile(uid, (prof) => {
        if (prof) setProfile(prof);
      }),
      subscribeUserOrders(uid, setOrders),
      subscribeUserTransactions(uid, setTransactions),
      subscribeUserDeposits(uid, setDeposits),
      subscribeUserWithdrawals(uid, setWithdrawals),
      subscribeUserReferrals(uid, setReferrals),
      subscribeUserTickets(uid, setTickets),
      subscribeUserNotifications(uid, setNotifications),
    ];
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, firebaseUser]);

  const t = useCallback(
    (key: string) => translations[language][key] || translations.en[key] || key,
    [language]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const launchOrderForService = useCallback((serviceId: string) => {
    setPreselectedServiceId(serviceId);
    setAppMode('user');
    setUserRoute('new-order');
  }, []);

  const openAuthModal = useCallback((tab: 'login' | 'register' | 'reset' = 'login') => {
    setAuthModalInitialTab(tab);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    await logoutUser();
    setAppMode('user');
    setUserRoute('dashboard');
    pushToast('Signed out successfully', 'info');
  }, [pushToast]);

  const value: AppContextValue = {
    authReady,
    firebaseUser,
    profile,
    isAdmin,
    appMode,
    setAppMode,
    userRoute,
    setUserRoute,
    adminRoute,
    setAdminRoute,
    language,
    setLanguage,
    currency,
    setCurrency,
    t,
    settings,
    categories,
    services,
    catalogLoading,
    orders,
    transactions,
    deposits,
    withdrawals,
    referrals,
    tickets,
    notifications,
    unreadNotifications,
    globalSearch,
    setGlobalSearch,
    preselectedServiceId,
    launchOrderForService,
    authModalOpen,
    authModalInitialTab,
    openAuthModal,
    closeAuthModal,
    membershipModalOpen,
    setMembershipModalOpen,
    toasts,
    pushToast,
    dismissToast,
    handleLogout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
