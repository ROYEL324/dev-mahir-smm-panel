import type { Timestamp } from 'firebase/firestore';

export type PlatformName =
  | 'Instagram'
  | 'Facebook'
  | 'YouTube'
  | 'TikTok'
  | 'Telegram'
  | 'X'
  | 'Other';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'in_progress'
  | 'completed'
  | 'partial'
  | 'canceled'
  | 'failed';

export type Language = 'en' | 'bn';
export type CurrencyCode = 'BDT' | 'USD' | 'EUR';

export type UserRoute =
  | 'dashboard'
  | 'new-order'
  | 'orders'
  | 'services'
  | 'add-funds'
  | 'transactions'
  | 'referrals'
  | 'support'
  | 'settings';

export type AdminRoute =
  | 'overview'
  | 'users'
  | 'orders'
  | 'services'
  | 'deposits'
  | 'referrals'
  | 'support'
  | 'notifications'
  | 'providers'
  | 'settings'
  | 'logs';

export interface AdminRole {
  uid: string;
  email: string;
  role: 'super_admin' | 'admin' | 'moderator';
  grantedBy: string;
  createdAt: Timestamp | null;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  walletBalance: number;
  totalDeposits: number;
  totalSpending: number;
  accountStatus: 'active' | 'suspended';
  membershipLevel: 'standard' | 'premium' | 'vip';
  referralCode: string;
  referredBy: string;
  referralCount: number;
  referralEarnings: number;
  language: Language;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface ServiceCategory {
  id: string;
  name: string;
  platform: PlatformName;
  sortOrder: number;
  enabled: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface SmmService {
  id: string;
  categoryId: string;
  platform: PlatformName;
  name: string;
  description: string;
  ratePer1000: number;
  minQty: number;
  maxQty: number;
  avgTime: string;
  refillSupported: boolean;
  cancelSupported: boolean;
  providerId: string;
  providerServiceId: string;
  enabled: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Order {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  platform: PlatformName;
  targetUrl: string;
  quantity: number;
  price: number;
  status: OrderStatus;
  startCount: number;
  remains: number;
  providerId: string;
  providerOrderId: string;
  transactionId: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type TransactionType =
  | 'order_debit'
  | 'deposit_credit'
  | 'refund_credit'
  | 'referral_bonus'
  | 'admin_adjustment'
  | 'withdrawal_debit';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId: string;
  createdAt: Timestamp | null;
}

export interface Deposit {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  method: string;
  amount: number;
  senderNumber: string;
  transactionRef: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote: string;
  reviewedBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Withdrawal {
  id: string;
  userId: string;
  userEmail: string;
  method: string;
  accountDetails: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Referral {
  id: string;
  referrerUid: string;
  referredUid: string;
  referredEmail: string;
  rewardAmount: number;
  status: 'registered' | 'rewarded';
  createdAt: Timestamp | null;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  category: 'order' | 'payment' | 'service' | 'account' | 'other';
  orderId: string;
  message: string;
  status: 'open' | 'answered' | 'closed';
  priority: 'normal' | 'high' | 'urgent';
  adminReply: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  createdAt: Timestamp | null;
}

export interface PlatformSettings {
  siteName: string;
  defaultCurrency: CurrencyCode;
  usdRate: number;
  eurRate: number;
  referralEnabled: boolean;
  referralRewardPercent: number;
  minDeposit: number;
  withdrawalEnabled: boolean;
  bkashEnabled: boolean;
  bkashNumber: string;
  bkashInstructions: string;
  nagadEnabled: boolean;
  nagadNumber: string;
  nagadInstructions: string;
  supportOnline: boolean;
  supportHours: string;
  supportTelegramUrl: string;
  supportEmail: string;
  heroKicker: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  heroSecondaryCtaText: string;
  heroBannerImageUrl: string;
  promoBannerEnabled: boolean;
  promoBannerText: string;
  updatedAt: Timestamp | null;
}

export interface ProviderConfig {
  id: string;
  name: string;
  apiUrl: string;
  enabled: boolean;
  status: 'configured' | 'unconfigured' | 'error';
  updatedAt: Timestamp | null;
}

export interface RemoteProviderService {
  service: string | number;
  name: string;
  category?: string;
  type?: string;
  rate: string | number;
  min: string | number;
  max: string | number;
  refill?: boolean;
  cancel?: boolean;
  dripfeed?: boolean;
  desc?: string;
}

export interface AuditLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: Timestamp | null;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'info';
}
