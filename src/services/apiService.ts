import { auth } from '../firebase';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface ProviderServerStatus {
  configured: boolean;
  enabled: boolean;
  name: string;
  apiUrl: string;
  providerUrlMasked: string | null;
  apiKeyMasked: string;
  hasKey: boolean;
  autoDispatchOrders: boolean;
  profitMarginPercent: number;
  currencyToBdtRate: number;
  updatedAt: string | null;
  message: string;
}

export interface PendingDispatchRecord {
  orderId: string;
  userId: string;
  providerOrderId: string;
  serviceId: string;
  status: string;
  syncedToFirestore: boolean;
  dispatchedAt: string;
}

export async function validateOrderServer(payload: {
  targetUrl: string;
  quantity: number;
  minQty: number;
  maxQty: number;
  ratePer1000: number;
}): Promise<{ valid: boolean; calculatedPrice?: number; error?: string }> {
  const resp = await fetch('/api/orders/validate', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  return resp.json();
}

export async function dispatchOrderToProvider(orderId: string): Promise<{
  attempted: boolean;
  dispatched: boolean;
  providerOrderId?: string;
  syncedToFirestore?: boolean;
  error?: string;
  reason?: string;
}> {
  const resp = await fetch('/api/orders/dispatch', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ orderId }),
  });
  return resp.json();
}

export async function fetchPendingDispatches(): Promise<{ records: PendingDispatchRecord[] }> {
  const resp = await fetch('/api/orders/pending-dispatches', {
    headers: await authHeaders(),
  });
  return resp.json();
}

export async function markDispatchesSynced(orderIds: string[]): Promise<void> {
  if (orderIds.length === 0) return;
  await fetch('/api/orders/mark-synced', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ orderIds }),
  });
}

export async function fetchProviderStatus(): Promise<ProviderServerStatus> {
  const resp = await fetch('/api/provider/status', {
    headers: await authHeaders(),
  });
  return resp.json();
}

export async function saveProviderCredentials(payload: {
  name: string;
  apiUrl: string;
  apiKey?: string;
  enabled: boolean;
  autoDispatchOrders: boolean;
  profitMarginPercent: number;
  currencyToBdtRate: number;
  testConnection: boolean;
}): Promise<
  ProviderServerStatus & {
    ok: boolean;
    saved?: boolean;
    error?: string;
    balanceTest?: { ok: boolean; data?: { balance?: string; currency?: string }; error?: string };
  }
> {
  const resp = await fetch('/api/provider/configure', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  return resp.json();
}

export async function disconnectProviderCredentials(): Promise<{ ok: boolean; message?: string }> {
  const resp = await fetch('/api/provider/configure', {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  return resp.json();
}

export async function fetchPaymentGatewayStatus(): Promise<{
  bkashConfigured: boolean;
  nagadConfigured: boolean;
  mode: string;
}> {
  const resp = await fetch('/api/payments/config-status', {
    headers: await authHeaders(),
  });
  return resp.json();
}

export async function callProviderAction<T = unknown>(
  endpoint: 'balance' | 'services' | 'order' | 'order-status' | 'refill' | 'cancel',
  body?: Record<string, unknown>
): Promise<{ ok: boolean; configured: boolean; data?: T; error?: string }> {
  const resp = await fetch(`/api/provider/${endpoint}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body || {}),
  });
  return resp.json();
}
