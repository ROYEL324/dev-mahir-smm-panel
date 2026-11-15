import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeApp as initializeAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const ADMIN_BOOTSTRAP_EMAIL = 'mdsalimkhanbosstr@gmail.com';
const DATA_DIR = path.join(__dirname, '.data');
const PROVIDER_FILE = path.join(DATA_DIR, 'provider-config.json');
const DISPATCHES_FILE = path.join(DATA_DIR, 'order-dispatches.json');

interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId?: string;
}

interface StoredProviderConfig {
  name: string;
  apiUrl: string;
  apiKey: string;
  enabled: boolean;
  autoDispatchOrders: boolean;
  profitMarginPercent: number;
  currencyToBdtRate: number;
  updatedAt: string;
}

interface PendingDispatchRecord {
  orderId: string;
  userId: string;
  providerOrderId: string;
  serviceId: string;
  status: string;
  syncedToFirestore: boolean;
  dispatchedAt: string;
}

function loadFirebaseConfig(): FirebaseAppletConfig | null {
  try {
    const configPath = path.join(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as FirebaseAppletConfig;
    }
  } catch (err) {
    console.error('Failed to read firebase-applet-config.json:', err);
  }
  return null;
}

const firebaseConfig = loadFirebaseConfig();

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStoredProviderConfig(): StoredProviderConfig | null {
  try {
    if (fs.existsSync(PROVIDER_FILE)) {
      return JSON.parse(fs.readFileSync(PROVIDER_FILE, 'utf-8')) as StoredProviderConfig;
    }
  } catch (err) {
    console.error('Failed to read provider config file:', err);
  }
  return null;
}

function writeStoredProviderConfig(cfg: StoredProviderConfig) {
  ensureDataDir();
  fs.writeFileSync(PROVIDER_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
}

function clearStoredProviderConfig() {
  try {
    if (fs.existsSync(PROVIDER_FILE)) {
      fs.unlinkSync(PROVIDER_FILE);
    }
  } catch (err) {
    console.error('Failed to remove provider config file:', err);
  }
}

function readDispatchRecords(): PendingDispatchRecord[] {
  try {
    if (fs.existsSync(DISPATCHES_FILE)) {
      return JSON.parse(fs.readFileSync(DISPATCHES_FILE, 'utf-8')) as PendingDispatchRecord[];
    }
  } catch {
    // ignore corrupt file
  }
  return [];
}

function writeDispatchRecords(records: PendingDispatchRecord[]) {
  ensureDataDir();
  fs.writeFileSync(DISPATCHES_FILE, JSON.stringify(records.slice(-500), null, 2), 'utf-8');
}

function recordOrderDispatch(rec: PendingDispatchRecord) {
  const list = readDispatchRecords().filter((r) => r.orderId !== rec.orderId);
  list.push(rec);
  writeDispatchRecords(list);
}

function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 6) return '••••••';
  return `${'•'.repeat(Math.min(12, key.length - 4))}${key.slice(-4)}`;
}

function maskApiUrl(urlStr: string): string | null {
  if (!urlStr) return null;
  try {
    const u = new URL(urlStr);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return '***configured***';
  }
}

function getEffectiveProviderConfig() {
  const stored = readStoredProviderConfig();
  const envUrl = (process.env.SMM_PROVIDER_API_URL || '').trim();
  const envKey = (process.env.SMM_PROVIDER_API_KEY || '').trim();

  const apiUrl = stored?.apiUrl?.trim() || envUrl;
  const apiKey = stored?.apiKey?.trim() || envKey;
  const enabled = stored ? stored.enabled : Boolean(apiUrl && apiKey);

  return {
    name: stored?.name || 'Primary SMM Provider',
    apiUrl,
    apiKey,
    enabled,
    configured: Boolean(apiUrl && apiKey),
    autoDispatchOrders: stored ? stored.autoDispatchOrders : true,
    profitMarginPercent: stored?.profitMarginPercent ?? 30,
    currencyToBdtRate: stored?.currencyToBdtRate ?? 120,
    updatedAt: stored?.updatedAt || null,
  };
}

async function tryUpdateOrderViaAdminSdk(orderId: string, providerOrderId: string): Promise<boolean> {
  if (!firebaseConfig?.projectId) return false;
  try {
    if (getAdminApps().length === 0) {
      initializeAdminApp({ projectId: firebaseConfig.projectId });
    }
    const db = firebaseConfig.firestoreDatabaseId
      ? getAdminFirestore(getAdminApps()[0], firebaseConfig.firestoreDatabaseId)
      : getAdminFirestore(getAdminApps()[0]);

    await db.collection('orders').doc(orderId).update({
      providerOrderId,
      status: 'processing',
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  } catch {
    // Expected when container lacks ADC service account credentials
    return false;
  }
}

interface VerifiedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedUser | null> {
  if (!firebaseConfig?.apiKey || !idToken) return null;
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      users?: Array<{ localId?: string; email?: string; emailVerified?: boolean }>;
    };
    const user = data.users?.[0];
    if (!user?.localId || !user?.email) return null;
    return {
      uid: user.localId,
      email: user.email,
      emailVerified: Boolean(user.emailVerified),
    };
  } catch (err) {
    console.error('Token verification failed:', err);
    return null;
  }
}

interface AuthedRequest extends Request {
  authUser?: VerifiedUser;
  authToken?: string;
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication token required.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const user = await verifyFirebaseIdToken(token);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
    return;
  }
  req.authUser = user;
  req.authToken = token;
  next();
}

async function checkIsAdminInFirestore(
  uid: string,
  email: string,
  emailVerified: boolean,
  idToken: string
): Promise<boolean> {
  if (email.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL && emailVerified) {
    return true;
  }
  if (!firebaseConfig?.projectId) return false;
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(dbId)}/documents/admins/${encodeURIComponent(uid)}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    return resp.ok;
  } catch {
    return false;
  }
}

async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    const token = req.authToken!;
    const user = req.authUser!;
    const isAdmin = await checkIsAdminInFirestore(user.uid, user.email, user.emailVerified, token);
    if (!isAdmin) {
      res.status(403).json({ error: 'Administrator privileges required.' });
      return;
    }
    next();
  });
}

async function fetchFirestoreDocRest(
  collectionName: string,
  docId: string,
  idToken: string
): Promise<Record<string, unknown> | null> {
  if (!firebaseConfig?.projectId) return null;
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(dbId)}/documents/${encodeURIComponent(collectionName)}/${encodeURIComponent(docId)}`;
  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!resp.ok) return null;
    const raw = (await resp.json()) as {
      fields?: Record<string, { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean }>;
    };
    if (!raw.fields) return null;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw.fields)) {
      if (v.stringValue !== undefined) out[k] = v.stringValue;
      else if (v.integerValue !== undefined) out[k] = Number(v.integerValue);
      else if (v.doubleValue !== undefined) out[k] = Number(v.doubleValue);
      else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
    }
    return out;
  } catch {
    return null;
  }
}

async function callSmmProvider(
  params: Record<string, string>,
  override?: { apiUrl: string; apiKey: string }
) {
  const effective = getEffectiveProviderConfig();
  const apiUrl = override?.apiUrl?.trim() || effective.apiUrl;
  const apiKey = override?.apiKey?.trim() || effective.apiKey;
  const configured = Boolean(apiUrl && apiKey);

  if (!configured) {
    return {
      ok: false,
      configured: false,
      status: 503,
      error: 'No SMM Provider API is configured yet. Save your Provider API URL and Key in Admin Panel → SMM Provider API.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const form = new URLSearchParams({ key: apiKey, ...params });
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: controller.signal,
    });

    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        ok: false,
        configured: true,
        status: 502,
        error: `Provider returned a non-JSON response (HTTP ${response.status}). Check that the API URL points to a valid /api/v2 endpoint.`,
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        configured: true,
        status: response.status,
        error: `Provider HTTP ${response.status}`,
        data: parsed,
      };
    }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'error' in parsed) {
      return {
        ok: false,
        configured: true,
        status: 400,
        error: String((parsed as { error: unknown }).error),
        data: parsed,
      };
    }

    return {
      ok: true,
      configured: true,
      status: 200,
      data: parsed,
    };
  } catch (err) {
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'SMM Provider API request timed out after 15 seconds.'
        : err instanceof Error
          ? err.message
          : 'Unknown provider communication error.';
    return {
      ok: false,
      configured: true,
      status: 504,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'mahir-dev-smm-panel' });
  });

  // Server-side order validation
  app.post('/api/orders/validate', requireAuth, (req: AuthedRequest, res: Response) => {
    const { targetUrl, quantity, minQty, maxQty, ratePer1000 } = req.body as {
      targetUrl?: string;
      quantity?: number;
      minQty?: number;
      maxQty?: number;
      ratePer1000?: number;
    };

    if (!targetUrl || typeof targetUrl !== 'string' || targetUrl.trim().length < 5) {
      res.status(400).json({ valid: false, error: 'A valid target URL or username is required.' });
      return;
    }

    const qty = Number(quantity);
    const min = Number(minQty);
    const max = Number(maxQty);
    const rate = Number(ratePer1000);

    if (!Number.isInteger(qty) || qty < min || qty > max) {
      res.status(400).json({ valid: false, error: `Quantity must be an integer between ${min} and ${max}.` });
      return;
    }

    if (!Number.isFinite(rate) || rate <= 0) {
      res.status(400).json({ valid: false, error: 'Invalid service rate.' });
      return;
    }

    const calculatedPrice = Math.round(((qty * rate) / 1000) * 100) / 100;
    if (calculatedPrice <= 0) {
      res.status(400).json({ valid: false, error: 'Order total must be at least 0.01.' });
      return;
    }

    res.json({
      valid: true,
      quantity: qty,
      calculatedPrice,
      validatedBy: req.authUser?.uid,
    });
  });

  // Auto-dispatch newly placed order to configured SMM Provider API
  app.post('/api/orders/dispatch', requireAuth, async (req: AuthedRequest, res: Response) => {
    const { orderId } = req.body as { orderId?: string };
    if (!orderId || !/^[a-zA-Z0-9_\-]+$/.test(orderId)) {
      res.status(400).json({ attempted: false, dispatched: false, error: 'Invalid orderId.' });
      return;
    }

    const cfg = getEffectiveProviderConfig();
    if (!cfg.configured || !cfg.enabled || !cfg.autoDispatchOrders) {
      res.json({
        attempted: false,
        dispatched: false,
        reason: !cfg.configured
          ? 'provider_not_configured'
          : !cfg.enabled
            ? 'provider_disabled'
            : 'auto_dispatch_disabled',
      });
      return;
    }

    const orderDoc = await fetchFirestoreDocRest('orders', orderId, req.authToken!);
    if (!orderDoc) {
      res.status(404).json({ attempted: false, dispatched: false, error: 'Order not found.' });
      return;
    }

    if (orderDoc.userId !== req.authUser!.uid) {
      res.status(403).json({ attempted: false, dispatched: false, error: 'Not authorized for this order.' });
      return;
    }

    if (orderDoc.providerOrderId) {
      res.json({
        attempted: false,
        dispatched: true,
        providerOrderId: String(orderDoc.providerOrderId),
      });
      return;
    }

    const serviceId = String(orderDoc.serviceId || '');
    const serviceDoc = await fetchFirestoreDocRest('services', serviceId, req.authToken!);
    const providerServiceId = String(serviceDoc?.providerServiceId || '').trim();

    if (!providerServiceId || providerServiceId.toLowerCase() === 'manual') {
      res.json({ attempted: false, dispatched: false, reason: 'manual_service' });
      return;
    }

    const providerResp = await callSmmProvider({
      action: 'add',
      service: providerServiceId,
      link: String(orderDoc.targetUrl || ''),
      quantity: String(orderDoc.quantity || ''),
    });

    if (!providerResp.ok) {
      res.json({
        attempted: true,
        dispatched: false,
        error: providerResp.error || 'Provider rejected dispatch.',
      });
      return;
    }

    const dataObj = providerResp.data as { order?: string | number } | undefined;
    const providerOrderId = dataObj?.order !== undefined ? String(dataObj.order) : '';
    if (!providerOrderId) {
      res.json({
        attempted: true,
        dispatched: false,
        error: 'Provider succeeded without returning an order ID.',
      });
      return;
    }

    const syncedDirect = await tryUpdateOrderViaAdminSdk(orderId, providerOrderId);
    recordOrderDispatch({
      orderId,
      userId: req.authUser!.uid,
      providerOrderId,
      serviceId,
      status: 'processing',
      syncedToFirestore: syncedDirect,
      dispatchedAt: new Date().toISOString(),
    });

    res.json({
      attempted: true,
      dispatched: true,
      providerOrderId,
      syncedToFirestore: syncedDirect,
    });
  });

  // Pending dispatches queue for Admin Panel sync
  app.get('/api/orders/pending-dispatches', requireAdmin, (_req: AuthedRequest, res: Response) => {
    const records = readDispatchRecords().filter((r) => !r.syncedToFirestore);
    res.json({ records });
  });

  app.post('/api/orders/mark-synced', requireAdmin, (req: AuthedRequest, res: Response) => {
    const { orderIds } = req.body as { orderIds?: string[] };
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      res.json({ ok: true });
      return;
    }
    const idSet = new Set(orderIds);
    const updated = readDispatchRecords().map((r) =>
      idSet.has(r.orderId) ? { ...r, syncedToFirestore: true } : r
    );
    writeDispatchRecords(updated);
    res.json({ ok: true });
  });

  // Payment Gateway Configuration Status (Admin)
  app.get('/api/payments/config-status', requireAdmin, (_req: AuthedRequest, res: Response) => {
    const bkashConfigured = Boolean(
      process.env.BKASH_APP_KEY && process.env.BKASH_APP_SECRET && process.env.BKASH_USERNAME && process.env.BKASH_PASSWORD
    );
    const nagadConfigured = Boolean(process.env.NAGAD_MERCHANT_ID && process.env.NAGAD_MERCHANT_KEY);
    res.json({
      bkashConfigured,
      nagadConfigured,
      mode: bkashConfigured || nagadConfigured ? 'hybrid_gateway_and_manual' : 'manual_admin_verification_only',
    });
  });

  // Payment Gateway Verification Endpoint
  app.post('/api/payments/verify-gateway', requireAdmin, (req: AuthedRequest, res: Response) => {
    const { method, transactionRef } = req.body as { method?: string; transactionRef?: string };
    const bkashConfigured = Boolean(process.env.BKASH_APP_KEY && process.env.BKASH_APP_SECRET);
    const nagadConfigured = Boolean(process.env.NAGAD_MERCHANT_ID && process.env.NAGAD_MERCHANT_KEY);

    if (method === 'bKash' && !bkashConfigured) {
      res.status(503).json({
        verified: false,
        configured: false,
        message: 'bKash automated Merchant API credentials are not configured on the server. Verify manually in your bKash statement before approving.',
      });
      return;
    }

    if (method === 'Nagad' && !nagadConfigured) {
      res.status(503).json({
        verified: false,
        configured: false,
        message: 'Nagad automated Merchant API credentials are not configured on the server. Verify manually in your Nagad merchant statement before approving.',
      });
      return;
    }

    res.status(501).json({
      verified: false,
      configured: true,
      message: `Live gateway query for reference ${transactionRef || ''} requires merchant webhook/token handshake.`,
    });
  });

  // SMM Provider API Status (Admin) - Never returns plaintext apiKey
  app.get('/api/provider/status', requireAdmin, (_req: AuthedRequest, res: Response) => {
    const cfg = getEffectiveProviderConfig();
    res.json({
      configured: cfg.configured,
      enabled: cfg.enabled,
      name: cfg.name,
      apiUrl: cfg.apiUrl,
      providerUrlMasked: maskApiUrl(cfg.apiUrl),
      apiKeyMasked: maskApiKey(cfg.apiKey),
      hasKey: Boolean(cfg.apiKey),
      autoDispatchOrders: cfg.autoDispatchOrders,
      profitMarginPercent: cfg.profitMarginPercent,
      currencyToBdtRate: cfg.currencyToBdtRate,
      updatedAt: cfg.updatedAt,
      message: cfg.configured
        ? `Connected to ${cfg.name} (${maskApiUrl(cfg.apiUrl)}).`
        : 'No SMM Provider API configured yet. Paste your Provider API URL and Key below to connect.',
    });
  });

  // Save & Test SMM Provider API Credentials from Admin Panel
  app.post('/api/provider/configure', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const {
      name,
      apiUrl,
      apiKey,
      enabled,
      autoDispatchOrders,
      profitMarginPercent,
      currencyToBdtRate,
      testConnection,
    } = req.body as {
      name?: string;
      apiUrl?: string;
      apiKey?: string;
      enabled?: boolean;
      autoDispatchOrders?: boolean;
      profitMarginPercent?: number;
      currencyToBdtRate?: number;
      testConnection?: boolean;
    };

    const existing = getEffectiveProviderConfig();
    const cleanUrl = (apiUrl ?? existing.apiUrl).trim();
    const cleanKey = (apiKey ?? '').trim() || existing.apiKey;

    if (!cleanUrl || !/^https?:\/\/.+/i.test(cleanUrl)) {
      res.status(400).json({ ok: false, error: 'Please enter a valid Provider API URL starting with https:// or http://' });
      return;
    }

    if (!cleanKey) {
      res.status(400).json({ ok: false, error: 'Please enter your Provider API Key.' });
      return;
    }

    const nextConfig: StoredProviderConfig = {
      name: (name || existing.name || 'Primary SMM Provider').trim().slice(0, 80),
      apiUrl: cleanUrl,
      apiKey: cleanKey,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      autoDispatchOrders: autoDispatchOrders !== undefined ? Boolean(autoDispatchOrders) : true,
      profitMarginPercent: Number.isFinite(Number(profitMarginPercent))
        ? Math.max(0, Math.min(500, Number(profitMarginPercent)))
        : existing.profitMarginPercent,
      currencyToBdtRate: Number.isFinite(Number(currencyToBdtRate)) && Number(currencyToBdtRate) > 0
        ? Number(currencyToBdtRate)
        : existing.currencyToBdtRate,
      updatedAt: new Date().toISOString(),
    };

    let balanceTest: { ok: boolean; data?: unknown; error?: string } | null = null;
    if (testConnection) {
      const testRes = await callSmmProvider(
        { action: 'balance' },
        { apiUrl: nextConfig.apiUrl, apiKey: nextConfig.apiKey }
      );
      balanceTest = {
        ok: testRes.ok,
        data: testRes.data,
        error: testRes.error,
      };
      if (!testRes.ok) {
        res.status(400).json({
          ok: false,
          saved: false,
          error: testRes.error || 'Provider API connection test failed. Check URL and API Key.',
          balanceTest,
        });
        return;
      }
    }

    writeStoredProviderConfig(nextConfig);

    res.json({
      ok: true,
      saved: true,
      configured: true,
      enabled: nextConfig.enabled,
      name: nextConfig.name,
      apiUrl: nextConfig.apiUrl,
      providerUrlMasked: maskApiUrl(nextConfig.apiUrl),
      apiKeyMasked: maskApiKey(nextConfig.apiKey),
      hasKey: true,
      autoDispatchOrders: nextConfig.autoDispatchOrders,
      profitMarginPercent: nextConfig.profitMarginPercent,
      currencyToBdtRate: nextConfig.currencyToBdtRate,
      updatedAt: nextConfig.updatedAt,
      balanceTest,
    });
  });

  app.delete('/api/provider/configure', requireAdmin, (_req: AuthedRequest, res: Response) => {
    clearStoredProviderConfig();
    res.json({ ok: true, message: 'Stored provider API credentials cleared.' });
  });

  // SMM Provider: Balance Check
  app.post('/api/provider/balance', requireAdmin, async (_req: AuthedRequest, res: Response) => {
    const result = await callSmmProvider({ action: 'balance' });
    res.status(result.status).json(result);
  });

  // SMM Provider: Services List
  app.post('/api/provider/services', requireAdmin, async (_req: AuthedRequest, res: Response) => {
    const result = await callSmmProvider({ action: 'services' });
    res.status(result.status).json(result);
  });

  // SMM Provider: Add Order
  app.post('/api/provider/order', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const { service, link, quantity } = req.body as { service?: string; link?: string; quantity?: number };
    if (!service || !link || !quantity) {
      res.status(400).json({ ok: false, error: 'Missing service, link, or quantity.' });
      return;
    }
    const result = await callSmmProvider({
      action: 'add',
      service: String(service),
      link: String(link),
      quantity: String(quantity),
    });
    res.status(result.status).json(result);
  });

  // SMM Provider: Order Status / Multiple Orders Status
  app.post('/api/provider/order-status', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const { order, orders } = req.body as { order?: string; orders?: string[] };
    if (Array.isArray(orders) && orders.length > 0) {
      const result = await callSmmProvider({ action: 'statuses', orders: orders.join(',') });
      res.status(result.status).json(result);
      return;
    }
    if (!order) {
      res.status(400).json({ ok: false, error: 'Missing order or orders parameter.' });
      return;
    }
    const result = await callSmmProvider({ action: 'status', order: String(order) });
    res.status(result.status).json(result);
  });

  // SMM Provider: Refill
  app.post('/api/provider/refill', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const { order } = req.body as { order?: string };
    if (!order) {
      res.status(400).json({ ok: false, error: 'Missing provider order ID.' });
      return;
    }
    const result = await callSmmProvider({ action: 'refill', order: String(order) });
    res.status(result.status).json(result);
  });

  // SMM Provider: Cancel
  app.post('/api/provider/cancel', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const { orders } = req.body as { orders?: string[] };
    if (!Array.isArray(orders) || orders.length === 0) {
      res.status(400).json({ ok: false, error: 'Missing provider order IDs.' });
      return;
    }
    const result = await callSmmProvider({ action: 'cancel', orders: orders.join(',') });
    res.status(result.status).json(result);
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MAHIR DEV SMM Panel server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
