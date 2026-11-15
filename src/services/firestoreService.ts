import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  AuditLog,
  Deposit,
  Language,
  NotificationItem,
  Order,
  OrderStatus,
  PlatformName,
  PlatformSettings,
  ProviderConfig,
  Referral,
  ServiceCategory,
  SmmService,
  SupportTicket,
  Transaction,
  UserProfile,
  Withdrawal,
} from '../types/smm';
import { generateSafeId } from '../utils/format';

export const DEFAULT_SETTINGS: Omit<PlatformSettings, 'updatedAt'> = {
  siteName: 'MAHIR DEV SMM PANEL',
  defaultCurrency: 'BDT',
  usdRate: 120,
  eurRate: 130,
  referralEnabled: true,
  referralRewardPercent: 5,
  minDeposit: 50,
  withdrawalEnabled: true,
  bkashEnabled: true,
  bkashNumber: '01804515459',
  bkashInstructions:
    'Send Money (Personal) to bKash number 01804515459 and submit the exact TrxID below.',
  nagadEnabled: true,
  nagadNumber: '01804515459',
  nagadInstructions:
    'Send Money (Personal) to Nagad number 01804515459 and submit the exact TrxID below.',
  supportOnline: true,
  supportHours: '24/7 Priority Desk',
  supportTelegramUrl: '',
  supportEmail: 'mdsalimkhanbosstr@gmail.com',
  heroKicker: 'MAHIR DEV · Next-Gen Social Growth Infrastructure',
  heroTitle: 'Welcome to MAHIR DEV SMM PANEL',
  heroSubtitle:
    'Your Growth, Our Priority — Real-time order execution across Instagram, YouTube, TikTok, Facebook, Telegram, and X with transparent wallet ledger tracking.',
  heroCtaText: 'Start Ordering',
  heroSecondaryCtaText: 'Browse Services',
  heroBannerImageUrl: '/src/assets/images/astronaut_hero_3d_1794736598608.jpg',
  promoBannerEnabled: true,
  promoBannerText:
    'Fast 24/7 SMM Delivery Active · bKash & Nagad Personal: 01804515459',
};

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export function subscribeSettings(cb: (settings: PlatformSettings) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'settings', 'platform'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<PlatformSettings>;
        const isLegacyDoc = !('heroTitle' in data);
        cb({
          siteName: typeof data.siteName === 'string' && data.siteName ? data.siteName : DEFAULT_SETTINGS.siteName,
          defaultCurrency: data.defaultCurrency ?? DEFAULT_SETTINGS.defaultCurrency,
          usdRate: typeof data.usdRate === 'number' && data.usdRate > 0 ? data.usdRate : DEFAULT_SETTINGS.usdRate,
          eurRate: typeof data.eurRate === 'number' && data.eurRate > 0 ? data.eurRate : DEFAULT_SETTINGS.eurRate,
          referralEnabled: data.referralEnabled ?? DEFAULT_SETTINGS.referralEnabled,
          referralRewardPercent: data.referralRewardPercent ?? DEFAULT_SETTINGS.referralRewardPercent,
          minDeposit: typeof data.minDeposit === 'number' && data.minDeposit >= 1 ? data.minDeposit : DEFAULT_SETTINGS.minDeposit,
          withdrawalEnabled: data.withdrawalEnabled ?? DEFAULT_SETTINGS.withdrawalEnabled,
          bkashEnabled: data.bkashEnabled ?? DEFAULT_SETTINGS.bkashEnabled,
          bkashNumber:
            typeof data.bkashNumber === 'string' && (data.bkashNumber.trim() || !isLegacyDoc)
              ? data.bkashNumber
              : DEFAULT_SETTINGS.bkashNumber,
          bkashInstructions:
            typeof data.bkashInstructions === 'string' && (data.bkashInstructions.trim() || !isLegacyDoc)
              ? data.bkashInstructions
              : DEFAULT_SETTINGS.bkashInstructions,
          nagadEnabled: data.nagadEnabled ?? DEFAULT_SETTINGS.nagadEnabled,
          nagadNumber:
            typeof data.nagadNumber === 'string' && (data.nagadNumber.trim() || !isLegacyDoc)
              ? data.nagadNumber
              : DEFAULT_SETTINGS.nagadNumber,
          nagadInstructions:
            typeof data.nagadInstructions === 'string' && (data.nagadInstructions.trim() || !isLegacyDoc)
              ? data.nagadInstructions
              : DEFAULT_SETTINGS.nagadInstructions,
          supportOnline: data.supportOnline ?? DEFAULT_SETTINGS.supportOnline,
          supportHours: data.supportHours ?? DEFAULT_SETTINGS.supportHours,
          supportTelegramUrl:
            typeof data.supportTelegramUrl === 'string'
              ? data.supportTelegramUrl
              : DEFAULT_SETTINGS.supportTelegramUrl,
          supportEmail:
            typeof data.supportEmail === 'string'
              ? data.supportEmail
              : DEFAULT_SETTINGS.supportEmail,
          heroKicker: data.heroKicker ?? DEFAULT_SETTINGS.heroKicker,
          heroTitle: typeof data.heroTitle === 'string' && data.heroTitle.trim() ? data.heroTitle : DEFAULT_SETTINGS.heroTitle,
          heroSubtitle: data.heroSubtitle ?? DEFAULT_SETTINGS.heroSubtitle,
          heroCtaText: data.heroCtaText ?? DEFAULT_SETTINGS.heroCtaText,
          heroSecondaryCtaText: data.heroSecondaryCtaText ?? DEFAULT_SETTINGS.heroSecondaryCtaText,
          heroBannerImageUrl: data.heroBannerImageUrl ?? DEFAULT_SETTINGS.heroBannerImageUrl,
          promoBannerEnabled: data.promoBannerEnabled ?? DEFAULT_SETTINGS.promoBannerEnabled,
          promoBannerText: data.promoBannerText ?? DEFAULT_SETTINGS.promoBannerText,
          updatedAt: data.updatedAt ?? null,
        });
      } else {
        cb({ ...DEFAULT_SETTINGS, updatedAt: null });
      }
    },
    (error) => {
      console.warn('Settings subscription warning:', error.message);
      cb({ ...DEFAULT_SETTINGS, updatedAt: null });
    }
  );
}

export function subscribeCategories(
  isAdmin: boolean,
  cb: (categories: ServiceCategory[]) => void
): Unsubscribe {
  const colRef = collection(db, 'categories');
  const q = isAdmin
    ? query(colRef, orderBy('sortOrder', 'asc'))
    : query(colRef, where('enabled', '==', true), orderBy('sortOrder', 'asc'));

  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => d.data() as ServiceCategory));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    }
  );
}

export function subscribeServices(
  isAdmin: boolean,
  cb: (services: SmmService[]) => void
): Unsubscribe {
  const colRef = collection(db, 'services');
  const q = isAdmin
    ? query(colRef, orderBy('createdAt', 'desc'))
    : query(colRef, where('enabled', '==', true));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as SmmService);
      list.sort((a, b) => a.name.localeCompare(b.name));
      cb(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'services');
    }
  );
}

export function subscribeUserProfile(
  uid: string,
  cb: (profile: UserProfile | null) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      cb(snap.exists() ? (snap.data() as UserProfile) : null);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeUserOrders(uid: string, cb: (orders: Order[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'orders'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(200)
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as Order)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'orders')
  );
}

export function subscribeUserTransactions(
  uid: string,
  cb: (txs: Transaction[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(200)
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as Transaction)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'transactions')
  );
}

export function subscribeUserDeposits(uid: string, cb: (deposits: Deposit[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'deposits'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as Deposit)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'deposits')
  );
}

export function subscribeUserWithdrawals(
  uid: string,
  cb: (withdrawals: Withdrawal[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'withdrawals'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as Withdrawal)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'withdrawals')
  );
}

export function subscribeUserReferrals(
  uid: string,
  cb: (referrals: Referral[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'referrals'),
    where('referrerUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as Referral)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'referrals')
  );
}

export function subscribeUserTickets(
  uid: string,
  cb: (tickets: SupportTicket[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'supportTickets'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as SupportTicket)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'supportTickets')
  );
}

export function subscribeUserNotifications(
  uid: string,
  cb: (items: NotificationItem[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'notifications'),
    where('userId', 'in', [uid, 'all']),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as NotificationItem)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'notifications')
  );
}

// ---------------------------------------------------------------------------
// User Actions
// ---------------------------------------------------------------------------

export async function updateUserPreferences(
  uid: string,
  updates: { displayName?: string; language?: Language; photoURL?: string }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function placeAtomicOrder(params: {
  uid: string;
  serviceId: string;
  targetUrl: string;
  quantity: number;
}): Promise<{ orderId: string; price: number }> {
  const { uid, serviceId, targetUrl, quantity } = params;
  const orderId = generateSafeId('ord');
  const txId = generateSafeId('tx');

  try {
    let finalPrice = 0;
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', uid);
      const serviceRef = doc(db, 'services', serviceId);

      const [userSnap, serviceSnap] = await Promise.all([
        transaction.get(userRef),
        transaction.get(serviceRef),
      ]);

      if (!userSnap.exists()) {
        throw new Error('User profile not found.');
      }
      if (!serviceSnap.exists()) {
        throw new Error('Selected service does not exist.');
      }

      const user = userSnap.data() as UserProfile;
      const service = serviceSnap.data() as SmmService;

      if (user.accountStatus !== 'active') {
        throw new Error('Your account is currently suspended. Please contact support.');
      }
      if (!service.enabled) {
        throw new Error('This service is currently disabled by administrator.');
      }
      if (!Number.isInteger(quantity) || quantity < service.minQty || quantity > service.maxQty) {
        throw new Error(`Quantity must be between ${service.minQty} and ${service.maxQty}.`);
      }

      const calculatedPrice = Math.round(((quantity * service.ratePer1000) / 1000) * 100) / 100;
      if (calculatedPrice <= 0) {
        throw new Error('Order amount must be greater than 0.00.');
      }
      if (user.walletBalance < calculatedPrice) {
        throw new Error('Insufficient wallet balance for this order.');
      }

      finalPrice = calculatedPrice;
      const newBalance = Math.round((user.walletBalance - calculatedPrice) * 100) / 100;
      const newSpending = Math.round((user.totalSpending + calculatedPrice) * 100) / 100;

      transaction.update(userRef, {
        walletBalance: newBalance,
        totalSpending: newSpending,
        updatedAt: serverTimestamp(),
      });

      transaction.set(doc(db, 'orders', orderId), {
        id: orderId,
        userId: uid,
        serviceId: service.id,
        serviceName: service.name,
        platform: service.platform,
        targetUrl: targetUrl.trim(),
        quantity,
        price: calculatedPrice,
        status: 'pending',
        startCount: 0,
        remains: quantity,
        providerId: service.providerId || '',
        providerOrderId: '',
        transactionId: txId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      transaction.set(doc(db, 'transactions', txId), {
        id: txId,
        userId: uid,
        type: 'order_debit',
        amount: -calculatedPrice,
        balanceAfter: newBalance,
        description: `Order ${orderId}: ${service.name} (${quantity})`,
        referenceId: orderId,
        createdAt: serverTimestamp(),
      });
    });

    return { orderId, price: finalPrice };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
    }
    throw error;
  }
}

export async function submitDepositClaim(params: {
  user: UserProfile;
  method: string;
  amount: number;
  senderNumber: string;
  transactionRef: string;
}): Promise<string> {
  const id = generateSafeId('dep');
  const path = `deposits/${id}`;
  try {
    await setDoc(doc(db, 'deposits', id), {
      id,
      userId: params.user.uid,
      userEmail: params.user.email,
      userName: params.user.displayName,
      method: params.method.trim(),
      amount: Math.round(params.amount * 100) / 100,
      senderNumber: params.senderNumber.trim(),
      transactionRef: params.transactionRef.trim(),
      status: 'pending',
      adminNote: '',
      reviewedBy: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function submitWithdrawalRequest(params: {
  user: UserProfile;
  method: string;
  accountDetails: string;
  amount: number;
}): Promise<string> {
  const id = generateSafeId('wd');
  const path = `withdrawals/${id}`;
  try {
    await setDoc(doc(db, 'withdrawals', id), {
      id,
      userId: params.user.uid,
      userEmail: params.user.email,
      method: params.method.trim(),
      accountDetails: params.accountDetails.trim(),
      amount: Math.round(params.amount * 100) / 100,
      status: 'pending',
      reviewedBy: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createSupportTicket(params: {
  user: UserProfile;
  subject: string;
  category: SupportTicket['category'];
  orderId: string;
  message: string;
  priority: SupportTicket['priority'];
}): Promise<string> {
  const id = generateSafeId('tkt');
  const path = `supportTickets/${id}`;
  try {
    await setDoc(doc(db, 'supportTickets', id), {
      id,
      userId: params.user.uid,
      userEmail: params.user.email,
      subject: params.subject.trim(),
      category: params.category,
      orderId: params.orderId.trim(),
      message: params.message.trim(),
      status: 'open',
      priority: params.priority,
      adminReply: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ---------------------------------------------------------------------------
// Admin Subscriptions & Actions
// ---------------------------------------------------------------------------

export function subscribeAllUsers(cb: (users: UserProfile[]) => void): Unsubscribe {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(250));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as UserProfile)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'users')
  );
}

export function subscribeAllOrders(cb: (orders: Order[]) => void): Unsubscribe {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(300));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as Order)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'orders')
  );
}

export function subscribeAllDeposits(cb: (deposits: Deposit[]) => void): Unsubscribe {
  const q = query(collection(db, 'deposits'), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as Deposit)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'deposits')
  );
}

export function subscribeAllWithdrawals(cb: (withdrawals: Withdrawal[]) => void): Unsubscribe {
  const q = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as Withdrawal)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'withdrawals')
  );
}

export function subscribeAllTickets(cb: (tickets: SupportTicket[]) => void): Unsubscribe {
  const q = query(collection(db, 'supportTickets'), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as SupportTicket)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'supportTickets')
  );
}

export function subscribeAllReferrals(cb: (referrals: Referral[]) => void): Unsubscribe {
  const q = query(collection(db, 'referrals'), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as Referral)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'referrals')
  );
}

export function subscribeProviderConfigs(cb: (configs: ProviderConfig[]) => void): Unsubscribe {
  const q = query(collection(db, 'providerConfigs'), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as ProviderConfig)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'providerConfigs')
  );
}

export function subscribeAuditLogs(cb: (logs: AuditLog[]) => void): Unsubscribe {
  const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => d.data() as AuditLog)),
    (error) => handleFirestoreError(error, OperationType.LIST, 'auditLogs')
  );
}

async function writeAuditLog(
  admin: { uid: string; email: string },
  action: string,
  targetType: string,
  targetId: string,
  details: string
): Promise<void> {
  const id = generateSafeId('log');
  await setDoc(doc(db, 'auditLogs', id), {
    id,
    adminUid: admin.uid,
    adminEmail: admin.email,
    action: action.slice(0, 80),
    targetType: targetType.slice(0, 64),
    targetId: targetId.slice(0, 128),
    details: details.slice(0, 500),
    createdAt: serverTimestamp(),
  });
}

export async function adminSaveCategory(
  admin: { uid: string; email: string },
  data: { id?: string; name: string; platform: PlatformName; sortOrder: number; enabled: boolean }
): Promise<string> {
  const isNew = !data.id;
  const id = data.id || generateSafeId('cat');
  const path = `categories/${id}`;
  try {
    if (isNew) {
      await setDoc(doc(db, 'categories', id), {
        id,
        name: data.name.trim(),
        platform: data.platform,
        sortOrder: data.sortOrder,
        enabled: data.enabled,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'categories', id), {
        name: data.name.trim(),
        platform: data.platform,
        sortOrder: data.sortOrder,
        enabled: data.enabled,
        updatedAt: serverTimestamp(),
      });
    }
    await writeAuditLog(
      admin,
      isNew ? 'CREATE_CATEGORY' : 'UPDATE_CATEGORY',
      'category',
      id,
      `${data.platform} — ${data.name}`
    );
    return id;
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function adminDeleteCategory(
  admin: { uid: string; email: string },
  categoryId: string
): Promise<void> {
  const path = `categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
    await writeAuditLog(admin, 'DELETE_CATEGORY', 'category', categoryId, 'Deleted category');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adminSaveService(
  admin: { uid: string; email: string },
  data: Omit<SmmService, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const isNew = !data.id;
  const id = data.id || generateSafeId('srv');
  const path = `services/${id}`;
  const payload = {
    id,
    categoryId: data.categoryId,
    platform: data.platform,
    name: data.name.trim(),
    description: data.description.trim(),
    ratePer1000: Number(data.ratePer1000),
    minQty: Number(data.minQty),
    maxQty: Number(data.maxQty),
    avgTime: data.avgTime.trim() || '1-6 hours',
    refillSupported: Boolean(data.refillSupported),
    cancelSupported: Boolean(data.cancelSupported),
    providerId: data.providerId.trim(),
    providerServiceId: data.providerServiceId.trim(),
    enabled: Boolean(data.enabled),
  };

  try {
    if (isNew) {
      await setDoc(doc(db, 'services', id), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'services', id), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    }
    await writeAuditLog(
      admin,
      isNew ? 'CREATE_SERVICE' : 'UPDATE_SERVICE',
      'service',
      id,
      `${payload.name} (৳${payload.ratePer1000}/1k)`
    );
    return id;
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function adminDeleteService(
  admin: { uid: string; email: string },
  serviceId: string
): Promise<void> {
  const path = `services/${serviceId}`;
  try {
    await deleteDoc(doc(db, 'services', serviceId));
    await writeAuditLog(admin, 'DELETE_SERVICE', 'service', serviceId, 'Deleted service');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export const STARTER_CATEGORIES: Array<Omit<ServiceCategory, 'createdAt' | 'updatedAt'>> = [
  { id: 'cat_ig_followers', name: 'Instagram Growth & Followers', platform: 'Instagram', sortOrder: 1, enabled: true },
  { id: 'cat_fb_growth', name: 'Facebook Page & Post Boost', platform: 'Facebook', sortOrder: 2, enabled: true },
  { id: 'cat_yt_views', name: 'YouTube Views & Subscribers', platform: 'YouTube', sortOrder: 3, enabled: true },
  { id: 'cat_tt_engagement', name: 'TikTok Views & Followers', platform: 'TikTok', sortOrder: 4, enabled: true },
  { id: 'cat_tg_members', name: 'Telegram Channel Members', platform: 'Telegram', sortOrder: 5, enabled: true },
  { id: 'cat_x_growth', name: 'X (Twitter) Engagement', platform: 'X', sortOrder: 6, enabled: true },
];

export const STARTER_SERVICES: Array<Omit<SmmService, 'createdAt' | 'updatedAt'>> = [
  {
    id: 'srv_ig_hq_followers',
    categoryId: 'cat_ig_followers',
    platform: 'Instagram',
    name: 'Instagram Real High-Retention Followers [30D Refill]',
    description: 'High-retention global profiles with 30-day refill protection and smooth natural delivery.',
    ratePer1000: 185,
    minQty: 100,
    maxQty: 50000,
    avgTime: '1 - 4 hours',
    refillSupported: true,
    cancelSupported: false,
    providerId: 'primary',
    providerServiceId: '101',
    enabled: true,
  },
  {
    id: 'srv_ig_post_likes',
    categoryId: 'cat_ig_followers',
    platform: 'Instagram',
    name: 'Instagram Post & Reels Likes [Instant Start]',
    description: 'Fast organic-looking likes for public Instagram photos and Reels.',
    ratePer1000: 65,
    minQty: 50,
    maxQty: 100000,
    avgTime: '10 - 30 minutes',
    refillSupported: true,
    cancelSupported: false,
    providerId: 'primary',
    providerServiceId: '102',
    enabled: true,
  },
  {
    id: 'srv_fb_page_likes',
    categoryId: 'cat_fb_growth',
    platform: 'Facebook',
    name: 'Facebook Page Followers + Likes [HQ Non-Drop]',
    description: 'Boosts both page likes and followers simultaneously for public business pages.',
    ratePer1000: 210,
    minQty: 100,
    maxQty: 25000,
    avgTime: '2 - 6 hours',
    refillSupported: true,
    cancelSupported: false,
    providerId: 'primary',
    providerServiceId: '204',
    enabled: true,
  },
  {
    id: 'srv_fb_post_reactions',
    categoryId: 'cat_fb_growth',
    platform: 'Facebook',
    name: 'Facebook Post Likes & Reactions [Fast]',
    description: 'Reliable reactions boost for public Facebook posts, reels, and videos.',
    ratePer1000: 85,
    minQty: 100,
    maxQty: 50000,
    avgTime: '15 - 60 minutes',
    refillSupported: false,
    cancelSupported: false,
    providerId: 'primary',
    providerServiceId: '205',
    enabled: true,
  },
  {
    id: 'srv_yt_views_hr',
    categoryId: 'cat_yt_views',
    platform: 'YouTube',
    name: 'YouTube High Retention Views [Non-Drop]',
    description: 'Organic-paced views suitable for channel growth analytics and watch-time momentum.',
    ratePer1000: 260,
    minQty: 500,
    maxQty: 100000,
    avgTime: '3 - 12 hours',
    refillSupported: true,
    cancelSupported: true,
    providerId: 'primary',
    providerServiceId: '309',
    enabled: true,
  },
  {
    id: 'srv_yt_subscribers',
    categoryId: 'cat_yt_views',
    platform: 'YouTube',
    name: 'YouTube Channel Subscribers [30D Guarantee]',
    description: 'Gradual natural-speed subscriber delivery with 30-day refill guarantee.',
    ratePer1000: 1450,
    minQty: 100,
    maxQty: 10000,
    avgTime: '6 - 24 hours',
    refillSupported: true,
    cancelSupported: false,
    providerId: 'primary',
    providerServiceId: '312',
    enabled: true,
  },
  {
    id: 'srv_tt_views_fast',
    categoryId: 'cat_tt_engagement',
    platform: 'TikTok',
    name: 'TikTok Video Views [Instant Start]',
    description: 'Rapid delivery video views to accelerate algorithmic For-You discovery.',
    ratePer1000: 35,
    minQty: 500,
    maxQty: 500000,
    avgTime: '15 - 45 minutes',
    refillSupported: false,
    cancelSupported: false,
    providerId: 'primary',
    providerServiceId: '412',
    enabled: true,
  },
  {
    id: 'srv_tt_followers',
    categoryId: 'cat_tt_engagement',
    platform: 'TikTok',
    name: 'TikTok Real Followers [Stable]',
    description: 'Stable TikTok follower boost for creator and brand profiles.',
    ratePer1000: 320,
    minQty: 100,
    maxQty: 50000,
    avgTime: '1 - 6 hours',
    refillSupported: true,
    cancelSupported: false,
    providerId: 'primary',
    providerServiceId: '415',
    enabled: true,
  },
  {
    id: 'srv_tg_members',
    categoryId: 'cat_tg_members',
    platform: 'Telegram',
    name: 'Telegram Channel / Group Members [Stable]',
    description: 'Clean member delivery for public Telegram channels and community groups.',
    ratePer1000: 145,
    minQty: 100,
    maxQty: 50000,
    avgTime: '1 - 3 hours',
    refillSupported: true,
    cancelSupported: false,
    providerId: 'primary',
    providerServiceId: '502',
    enabled: true,
  },
  {
    id: 'srv_tg_post_views',
    categoryId: 'cat_tg_members',
    platform: 'Telegram',
    name: 'Telegram Channel Post Views [Last 5 Posts]',
    description: 'Instant post view delivery for public Telegram channels.',
    ratePer1000: 25,
    minQty: 100,
    maxQty: 200000,
    avgTime: '5 - 20 minutes',
    refillSupported: false,
    cancelSupported: false,
    providerId: 'primary',
    providerServiceId: '508',
    enabled: true,
  },
  {
    id: 'srv_x_reposts',
    categoryId: 'cat_x_growth',
    platform: 'X',
    name: 'X (Twitter) Post Impressions & Likes',
    description: 'Authentic engagement boost for public X posts and threads.',
    ratePer1000: 120,
    minQty: 100,
    maxQty: 20000,
    avgTime: '1 - 5 hours',
    refillSupported: false,
    cancelSupported: true,
    providerId: 'primary',
    providerServiceId: '601',
    enabled: true,
  },
  {
    id: 'srv_x_followers',
    categoryId: 'cat_x_growth',
    platform: 'X',
    name: 'X (Twitter) Profile Followers [HQ]',
    description: 'Steady follower growth for public X accounts.',
    ratePer1000: 390,
    minQty: 100,
    maxQty: 25000,
    avgTime: '2 - 8 hours',
    refillSupported: true,
    cancelSupported: false,
    providerId: 'primary',
    providerServiceId: '604',
    enabled: true,
  },
];

export async function adminSeedStarterCatalog(admin: { uid: string; email: string }): Promise<void> {
  const batch = writeBatch(db);

  for (const c of STARTER_CATEGORIES) {
    batch.set(doc(db, 'categories', c.id), {
      ...c,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  for (const s of STARTER_SERVICES) {
    batch.set(doc(db, 'services', s.id), {
      ...s,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  let existingSettings: Partial<PlatformSettings> | null = null;
  try {
    const snap = await getDoc(doc(db, 'settings', 'platform'));
    if (snap.exists()) {
      existingSettings = snap.data() as Partial<PlatformSettings>;
    }
  } catch {
    // proceed with default settings
  }

  const mergedSettings: Omit<PlatformSettings, 'updatedAt'> = {
    siteName: existingSettings?.siteName || DEFAULT_SETTINGS.siteName,
    defaultCurrency: existingSettings?.defaultCurrency || DEFAULT_SETTINGS.defaultCurrency,
    usdRate: existingSettings?.usdRate || DEFAULT_SETTINGS.usdRate,
    eurRate: existingSettings?.eurRate || DEFAULT_SETTINGS.eurRate,
    referralEnabled: existingSettings?.referralEnabled ?? DEFAULT_SETTINGS.referralEnabled,
    referralRewardPercent: existingSettings?.referralRewardPercent ?? DEFAULT_SETTINGS.referralRewardPercent,
    minDeposit: existingSettings?.minDeposit || DEFAULT_SETTINGS.minDeposit,
    withdrawalEnabled: existingSettings?.withdrawalEnabled ?? DEFAULT_SETTINGS.withdrawalEnabled,
    bkashEnabled: existingSettings?.bkashEnabled ?? DEFAULT_SETTINGS.bkashEnabled,
    bkashNumber: existingSettings?.bkashNumber?.trim() || DEFAULT_SETTINGS.bkashNumber,
    bkashInstructions: existingSettings?.bkashInstructions?.trim() || DEFAULT_SETTINGS.bkashInstructions,
    nagadEnabled: existingSettings?.nagadEnabled ?? DEFAULT_SETTINGS.nagadEnabled,
    nagadNumber: existingSettings?.nagadNumber?.trim() || DEFAULT_SETTINGS.nagadNumber,
    nagadInstructions: existingSettings?.nagadInstructions?.trim() || DEFAULT_SETTINGS.nagadInstructions,
    supportOnline: existingSettings?.supportOnline ?? DEFAULT_SETTINGS.supportOnline,
    supportHours: existingSettings?.supportHours || DEFAULT_SETTINGS.supportHours,
    supportTelegramUrl: existingSettings?.supportTelegramUrl ?? DEFAULT_SETTINGS.supportTelegramUrl,
    supportEmail: existingSettings?.supportEmail ?? DEFAULT_SETTINGS.supportEmail,
    heroKicker: existingSettings?.heroKicker ?? DEFAULT_SETTINGS.heroKicker,
    heroTitle: existingSettings?.heroTitle || DEFAULT_SETTINGS.heroTitle,
    heroSubtitle: existingSettings?.heroSubtitle ?? DEFAULT_SETTINGS.heroSubtitle,
    heroCtaText: existingSettings?.heroCtaText ?? DEFAULT_SETTINGS.heroCtaText,
    heroSecondaryCtaText: existingSettings?.heroSecondaryCtaText ?? DEFAULT_SETTINGS.heroSecondaryCtaText,
    heroBannerImageUrl: existingSettings?.heroBannerImageUrl ?? DEFAULT_SETTINGS.heroBannerImageUrl,
    promoBannerEnabled: existingSettings?.promoBannerEnabled ?? DEFAULT_SETTINGS.promoBannerEnabled,
    promoBannerText: existingSettings?.promoBannerText ?? DEFAULT_SETTINGS.promoBannerText,
  };

  batch.set(doc(db, 'settings', 'platform'), {
    ...mergedSettings,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    await writeAuditLog(admin, 'SEED_CATALOG', 'services', 'starter', 'Initialized starter categories, services, and platform settings');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'services');
  }
}

export async function adminToggleServiceEnabled(
  admin: { uid: string; email: string },
  service: SmmService
): Promise<void> {
  const path = `services/${service.id}`;
  try {
    await updateDoc(doc(db, 'services', service.id), {
      enabled: !service.enabled,
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog(
      admin,
      'TOGGLE_SERVICE',
      'service',
      service.id,
      `Set ${service.name} enabled=${!service.enabled}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminBulkAdjustServiceRates(
  admin: { uid: string; email: string },
  servicesList: SmmService[],
  percentDelta: number
): Promise<number> {
  if (!Number.isFinite(percentDelta) || percentDelta === 0 || servicesList.length === 0) return 0;
  const multiplier = Math.max(0.05, 1 + percentDelta / 100);
  const chunkSize = 400;
  let updated = 0;

  try {
    for (let i = 0; i < servicesList.length; i += chunkSize) {
      const chunk = servicesList.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const s of chunk) {
        const nextRate = Math.max(0.01, Math.round(s.ratePer1000 * multiplier * 100) / 100);
        batch.update(doc(db, 'services', s.id), {
          ratePer1000: nextRate,
          updatedAt: serverTimestamp(),
        });
        updated += 1;
      }
      await batch.commit();
    }
    await writeAuditLog(
      admin,
      'BULK_ADJUST_RATES',
      'services',
      'bulk',
      `Adjusted ${updated} service rates by ${percentDelta > 0 ? '+' : ''}${percentDelta}%`
    );
    return updated;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'services');
  }
}

export async function adminImportProviderServices(
  admin: { uid: string; email: string },
  params: {
    items: Array<{
      providerServiceId: string;
      name: string;
      categoryName: string;
      platform: PlatformName;
      ratePer1000: number;
      minQty: number;
      maxQty: number;
      refillSupported: boolean;
      cancelSupported: boolean;
      description: string;
    }>;
    existingCategories: ServiceCategory[];
    existingServices: SmmService[];
  }
): Promise<{ imported: number; createdCategories: number }> {
  const { items, existingCategories, existingServices } = params;
  if (items.length === 0) return { imported: 0, createdCategories: 0 };

  const categoryMap = new Map<string, ServiceCategory>();
  for (const cat of existingCategories) {
    categoryMap.set(`${cat.platform}::${cat.name.toLowerCase()}`, cat);
  }

  const existingByProviderId = new Map<string, SmmService>();
  for (const srv of existingServices) {
    if (srv.providerServiceId) {
      existingByProviderId.set(srv.providerServiceId, srv);
    }
  }

  let nextSort = existingCategories.length + 1;
  const newCategoriesToCreate: Array<{ id: string; name: string; platform: PlatformName; sortOrder: number }> = [];
  const operations: Array<{
    type: 'create' | 'update';
    serviceId: string;
    data: Omit<SmmService, 'id' | 'createdAt' | 'updatedAt'>;
  }> = [];

  for (const item of items) {
    const cleanCatName = (item.categoryName || `${item.platform} Provider Services`).trim().slice(0, 100);
    const catKey = `${item.platform}::${cleanCatName.toLowerCase()}`;
    let cat = categoryMap.get(catKey);
    if (!cat) {
      const newCatId = generateSafeId('cat');
      cat = {
        id: newCatId,
        name: cleanCatName,
        platform: item.platform,
        sortOrder: nextSort++,
        enabled: true,
        createdAt: null,
        updatedAt: null,
      };
      categoryMap.set(catKey, cat);
      newCategoriesToCreate.push({
        id: newCatId,
        name: cleanCatName,
        platform: item.platform,
        sortOrder: cat.sortOrder,
      });
    }

    const minQty = Math.max(1, Math.floor(item.minQty) || 10);
    const maxQty = Math.max(minQty, Math.floor(item.maxQty) || 50000);
    const ratePer1000 = Math.max(0.01, Math.round(item.ratePer1000 * 100) / 100);
    const cleanProvId = String(item.providerServiceId).trim().slice(0, 128);
    const existing = existingByProviderId.get(cleanProvId);

    const serviceData: Omit<SmmService, 'id' | 'createdAt' | 'updatedAt'> = {
      categoryId: cat.id,
      platform: item.platform,
      name: (item.name || `Provider Service #${cleanProvId}`).trim().slice(0, 160),
      description: (item.description || `Synced from SMM Provider Service #${cleanProvId}`).trim().slice(0, 1000),
      ratePer1000,
      minQty,
      maxQty,
      avgTime: 'Varies by provider queue',
      refillSupported: Boolean(item.refillSupported),
      cancelSupported: Boolean(item.cancelSupported),
      providerId: 'primary',
      providerServiceId: cleanProvId,
      enabled: true,
    };

    if (existing) {
      operations.push({ type: 'update', serviceId: existing.id, data: serviceData });
    } else {
      operations.push({
        type: 'create',
        serviceId: `srv_p_${cleanProvId.replace(/[^a-zA-Z0-9_\-]/g, '_')}`.slice(0, 120),
        data: serviceData,
      });
    }
  }

  try {
    // Commit new categories + service writes in safe batches of 350 ops
    const pendingWrites: Array<() => Promise<void>> = [];
    let currentBatch = writeBatch(db);
    let opCount = 0;

    const flushBatch = () => {
      const b = currentBatch;
      pendingWrites.push(() => b.commit());
      currentBatch = writeBatch(db);
      opCount = 0;
    };

    for (const nc of newCategoriesToCreate) {
      currentBatch.set(doc(db, 'categories', nc.id), {
        id: nc.id,
        name: nc.name,
        platform: nc.platform,
        sortOrder: nc.sortOrder,
        enabled: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      opCount++;
      if (opCount >= 350) flushBatch();
    }

    for (const op of operations) {
      if (op.type === 'create') {
        currentBatch.set(doc(db, 'services', op.serviceId), {
          id: op.serviceId,
          ...op.data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        currentBatch.update(doc(db, 'services', op.serviceId), {
          ...op.data,
          updatedAt: serverTimestamp(),
        });
      }
      opCount++;
      if (opCount >= 350) flushBatch();
    }

    if (opCount > 0) flushBatch();

    for (const commitFn of pendingWrites) {
      await commitFn();
    }

    await writeAuditLog(
      admin,
      'IMPORT_PROVIDER_SERVICES',
      'services',
      'provider_import',
      `Imported/updated ${operations.length} services and created ${newCategoriesToCreate.length} categories from Provider API`
    );

    return { imported: operations.length, createdCategories: newCategoriesToCreate.length };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'services');
  }
}

export async function adminUpdateOrderStatus(
  admin: { uid: string; email: string },
  params: {
    order: Order;
    status: OrderStatus;
    startCount: number;
    remains: number;
    providerOrderId: string;
    issueRefund?: boolean;
  }
): Promise<void> {
  const { order, status, startCount, remains, providerOrderId, issueRefund } = params;
  const path = `orders/${order.id}`;

  try {
    await runTransaction(db, async (tx) => {
      const orderRef = doc(db, 'orders', order.id);
      const userRef = doc(db, 'users', order.userId);
      const userSnap = await tx.get(userRef);

      tx.update(orderRef, {
        status,
        startCount,
        remains,
        providerOrderId: providerOrderId.trim(),
        updatedAt: serverTimestamp(),
      });

      if (issueRefund && (status === 'canceled' || status === 'failed') && userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        const newBal = Math.round((userData.walletBalance + order.price) * 100) / 100;
        const refundTxId = generateSafeId('tx');
        tx.update(userRef, {
          walletBalance: newBal,
          updatedAt: serverTimestamp(),
        });
        tx.set(doc(db, 'transactions', refundTxId), {
          id: refundTxId,
          userId: order.userId,
          type: 'refund_credit',
          amount: order.price,
          balanceAfter: newBal,
          description: `Refund for ${status} order ${order.id}`,
          referenceId: order.id,
          createdAt: serverTimestamp(),
        });
      }
    });

    await writeAuditLog(
      admin,
      'UPDATE_ORDER_STATUS',
      'order',
      order.id,
      `Set status=${status}, remains=${remains}${issueRefund ? ' (refund issued)' : ''}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminReviewDeposit(
  admin: { uid: string; email: string },
  params: {
    deposit: Deposit;
    decision: 'approved' | 'rejected';
    adminNote: string;
    settings: PlatformSettings;
  }
): Promise<void> {
  const { deposit, decision, adminNote, settings } = params;
  const path = `deposits/${deposit.id}`;

  try {
    await runTransaction(db, async (tx) => {
      const depRef = doc(db, 'deposits', deposit.id);
      const userRef = doc(db, 'users', deposit.userId);

      const [depSnap, userSnap] = await Promise.all([tx.get(depRef), tx.get(userRef)]);
      if (!depSnap.exists()) throw new Error('Deposit not found.');
      const currentDep = depSnap.data() as Deposit;
      if (currentDep.status !== 'pending') {
        throw new Error('Deposit has already been reviewed.');
      }

      tx.update(depRef, {
        status: decision,
        adminNote: adminNote.trim(),
        reviewedBy: admin.email,
        updatedAt: serverTimestamp(),
      });

      if (decision === 'approved' && userSnap.exists()) {
        const user = userSnap.data() as UserProfile;
        const newBal = Math.round((user.walletBalance + deposit.amount) * 100) / 100;
        const newTotalDeposits = Math.round((user.totalDeposits + deposit.amount) * 100) / 100;
        const txId = generateSafeId('tx');

        tx.update(userRef, {
          walletBalance: newBal,
          totalDeposits: newTotalDeposits,
          updatedAt: serverTimestamp(),
        });

        tx.set(doc(db, 'transactions', txId), {
          id: txId,
          userId: deposit.userId,
          type: 'deposit_credit',
          amount: deposit.amount,
          balanceAfter: newBal,
          description: `Verified ${deposit.method} deposit (${deposit.transactionRef})`,
          referenceId: deposit.id,
          createdAt: serverTimestamp(),
        });

        // Referral reward check if user was referred
        if (settings.referralEnabled && settings.referralRewardPercent > 0 && user.referredBy) {
          const refDocRef = doc(db, 'referrals', user.uid);
          const referrerRef = doc(db, 'users', user.referredBy);
          const [refSnap, referrerSnap] = await Promise.all([tx.get(refDocRef), tx.get(referrerRef)]);

          if (refSnap.exists() && referrerSnap.exists()) {
            const refData = refSnap.data() as Referral;
            if (refData.status === 'registered') {
              const bonus = Math.round(((deposit.amount * settings.referralRewardPercent) / 100) * 100) / 100;
              if (bonus > 0) {
                const referrer = referrerSnap.data() as UserProfile;
                const refNewBal = Math.round((referrer.walletBalance + bonus) * 100) / 100;
                const refTxId = generateSafeId('tx');

                tx.update(referrerRef, {
                  walletBalance: refNewBal,
                  referralCount: (referrer.referralCount || 0) + 1,
                  referralEarnings: Math.round(((referrer.referralEarnings || 0) + bonus) * 100) / 100,
                  updatedAt: serverTimestamp(),
                });
                tx.update(refDocRef, {
                  rewardAmount: bonus,
                  status: 'rewarded',
                });
                tx.set(doc(db, 'transactions', refTxId), {
                  id: refTxId,
                  userId: referrer.uid,
                  type: 'referral_bonus',
                  amount: bonus,
                  balanceAfter: refNewBal,
                  description: `Referral reward (${settings.referralRewardPercent}%) from ${user.email}`,
                  referenceId: deposit.id,
                  createdAt: serverTimestamp(),
                });
              }
            }
          }
        }
      }
    });

    await writeAuditLog(
      admin,
      decision === 'approved' ? 'APPROVE_DEPOSIT' : 'REJECT_DEPOSIT',
      'deposit',
      deposit.id,
      `${decision} ৳${deposit.amount} (${deposit.method} ${deposit.transactionRef}) — ${adminNote}`
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    throw error;
  }
}

export async function adminAdjustUserBalance(
  admin: { uid: string; email: string },
  params: { targetUser: UserProfile; delta: number; reason: string }
): Promise<void> {
  const { targetUser, delta, reason } = params;
  const path = `users/${targetUser.uid}`;
  try {
    await runTransaction(db, async (tx) => {
      const userRef = doc(db, 'users', targetUser.uid);
      const snap = await tx.get(userRef);
      if (!snap.exists()) throw new Error('User not found.');
      const user = snap.data() as UserProfile;
      const newBalance = Math.round((user.walletBalance + delta) * 100) / 100;
      if (newBalance < 0) throw new Error('Resulting balance cannot be negative.');
      const txId = generateSafeId('tx');

      tx.update(userRef, {
        walletBalance: newBalance,
        updatedAt: serverTimestamp(),
      });
      tx.set(doc(db, 'transactions', txId), {
        id: txId,
        userId: targetUser.uid,
        type: 'admin_adjustment',
        amount: delta,
        balanceAfter: newBalance,
        description: `Admin adjustment: ${reason.trim()}`,
        referenceId: admin.uid,
        createdAt: serverTimestamp(),
      });
    });

    await writeAuditLog(
      admin,
      'ADJUST_USER_BALANCE',
      'user',
      targetUser.uid,
      `Delta ${delta >= 0 ? '+' : ''}${delta} for ${targetUser.email}. Reason: ${reason}`
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    throw error;
  }
}

export async function adminUpdateUserStatusAndTier(
  admin: { uid: string; email: string },
  params: {
    uid: string;
    email: string;
    accountStatus?: UserProfile['accountStatus'];
    membershipLevel?: UserProfile['membershipLevel'];
  }
): Promise<void> {
  const path = `users/${params.uid}`;
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (params.accountStatus) updates.accountStatus = params.accountStatus;
  if (params.membershipLevel) updates.membershipLevel = params.membershipLevel;

  try {
    await updateDoc(doc(db, 'users', params.uid), updates);
    await writeAuditLog(
      admin,
      'UPDATE_USER_ACCOUNT',
      'user',
      params.uid,
      `Updated ${params.email}: status=${params.accountStatus || 'unchanged'}, tier=${params.membershipLevel || 'unchanged'}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminReviewWithdrawal(
  admin: { uid: string; email: string },
  params: { withdrawal: Withdrawal; decision: 'approved' | 'rejected' }
): Promise<void> {
  const { withdrawal, decision } = params;
  const path = `withdrawals/${withdrawal.id}`;

  try {
    await runTransaction(db, async (tx) => {
      const wdRef = doc(db, 'withdrawals', withdrawal.id);
      const userRef = doc(db, 'users', withdrawal.userId);
      const [wdSnap, userSnap] = await Promise.all([tx.get(wdRef), tx.get(userRef)]);
      if (!wdSnap.exists()) throw new Error('Withdrawal not found.');
      const cur = wdSnap.data() as Withdrawal;
      if (cur.status !== 'pending') throw new Error('Already reviewed.');

      tx.update(wdRef, {
        status: decision,
        reviewedBy: admin.email,
        updatedAt: serverTimestamp(),
      });

      if (decision === 'approved' && userSnap.exists()) {
        const user = userSnap.data() as UserProfile;
        if (user.walletBalance < withdrawal.amount) {
          throw new Error('User balance is below withdrawal amount.');
        }
        const newBal = Math.round((user.walletBalance - withdrawal.amount) * 100) / 100;
        const txId = generateSafeId('tx');
        tx.update(userRef, { walletBalance: newBal, updatedAt: serverTimestamp() });
        tx.set(doc(db, 'transactions', txId), {
          id: txId,
          userId: withdrawal.userId,
          type: 'withdrawal_debit',
          amount: -withdrawal.amount,
          balanceAfter: newBal,
          description: `Withdrawal via ${withdrawal.method} (${withdrawal.accountDetails})`,
          referenceId: withdrawal.id,
          createdAt: serverTimestamp(),
        });
      }
    });

    await writeAuditLog(
      admin,
      decision === 'approved' ? 'APPROVE_WITHDRAWAL' : 'REJECT_WITHDRAWAL',
      'withdrawal',
      withdrawal.id,
      `${decision} ৳${withdrawal.amount} for ${withdrawal.userEmail}`
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    throw error;
  }
}

export async function adminReplyTicket(
  admin: { uid: string; email: string },
  params: {
    ticketId: string;
    status: SupportTicket['status'];
    priority: SupportTicket['priority'];
    adminReply: string;
  }
): Promise<void> {
  const path = `supportTickets/${params.ticketId}`;
  try {
    await updateDoc(doc(db, 'supportTickets', params.ticketId), {
      status: params.status,
      priority: params.priority,
      adminReply: params.adminReply.trim(),
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog(
      admin,
      'REPLY_SUPPORT_TICKET',
      'supportTicket',
      params.ticketId,
      `Set status=${params.status}, priority=${params.priority}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminSendNotification(
  admin: { uid: string; email: string },
  params: { userId: string; title: string; message: string; type: NotificationItem['type'] }
): Promise<void> {
  const id = generateSafeId('ntf');
  const path = `notifications/${id}`;
  try {
    await setDoc(doc(db, 'notifications', id), {
      id,
      userId: params.userId.trim() || 'all',
      title: params.title.trim(),
      message: params.message.trim(),
      type: params.type,
      read: false,
      createdAt: serverTimestamp(),
    });
    await writeAuditLog(
      admin,
      'SEND_NOTIFICATION',
      'notification',
      id,
      `Target=${params.userId || 'all'} — ${params.title}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function adminSaveSettings(
  admin: { uid: string; email: string },
  settings: Omit<PlatformSettings, 'updatedAt'>
): Promise<void> {
  const path = 'settings/platform';
  try {
    await setDoc(doc(db, 'settings', 'platform'), {
      ...settings,
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog(admin, 'UPDATE_SETTINGS', 'settings', 'platform', 'Updated global platform configuration');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminSaveProviderConfig(
  admin: { uid: string; email: string },
  config: Omit<ProviderConfig, 'updatedAt'>
): Promise<void> {
  const path = `providerConfigs/${config.id}`;
  try {
    await setDoc(doc(db, 'providerConfigs', config.id), {
      ...config,
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog(
      admin,
      'SAVE_PROVIDER_CONFIG',
      'providerConfig',
      config.id,
      `Saved provider ${config.name} (${config.status})`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function checkUserExists(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists();
}
