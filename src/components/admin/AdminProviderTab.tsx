import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  PlugZap,
  RefreshCw,
  Search,
  Server,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import {
  callProviderAction,
  disconnectProviderCredentials,
  fetchProviderStatus,
  saveProviderCredentials,
  type ProviderServerStatus,
} from '../../services/apiService';
import {
  adminImportProviderServices,
  adminSaveProviderConfig,
} from '../../services/firestoreService';
import type { PlatformName, ProviderConfig, RemoteProviderService } from '../../types/smm';
import { formatCurrency, formatNumber, formatTimestamp } from '../../utils/format';

function detectPlatform(category?: string, name?: string): PlatformName {
  const haystack = `${category || ''} ${name || ''}`.toLowerCase();
  if (haystack.includes('instagram') || /\big\b/.test(haystack)) return 'Instagram';
  if (haystack.includes('facebook') || /\bfb\b/.test(haystack)) return 'Facebook';
  if (haystack.includes('youtube') || /\byt\b/.test(haystack)) return 'YouTube';
  if (haystack.includes('tiktok')) return 'TikTok';
  if (haystack.includes('telegram') || /\btg\b/.test(haystack)) return 'Telegram';
  if (haystack.includes('twitter') || /\bx\b/.test(haystack) || haystack.includes('tweet')) return 'X';
  return 'Other';
}

export function AdminProviderTab({ configs }: { configs: ProviderConfig[] }) {
  const { firebaseUser, categories, services, settings, currency, pushToast } = useApp();
  const adminActor = {
    uid: firebaseUser?.uid || '',
    email: firebaseUser?.email || 'admin',
  };

  const [serverStatus, setServerStatus] = useState<ProviderServerStatus | null>(null);
  const [name, setName] = useState('Primary SMM Provider');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [autoDispatchOrders, setAutoDispatchOrders] = useState(true);
  const [profitMarginPercent, setProfitMarginPercent] = useState('30');
  const [currencyToBdtRate, setCurrencyToBdtRate] = useState(String(settings.usdRate || 120));

  const [savingConfig, setSavingConfig] = useState(false);
  const [testingBalance, setTestingBalance] = useState(false);
  const [providerBalance, setProviderBalance] = useState<string | null>(null);

  // Remote services importer state
  const [fetchingServices, setFetchingServices] = useState(false);
  const [remoteServices, setRemoteServices] = useState<RemoteProviderService[]>([]);
  const [remoteSearch, setRemoteSearch] = useState('');
  const [remoteCategoryFilter, setRemoteCategoryFilter] = useState('ALL');
  const [providerRateIsUsd, setProviderRateIsUsd] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  // Quick diagnostic lookup
  const [diagOrderId, setDiagOrderId] = useState('');
  const [diagOutput, setDiagOutput] = useState<string | null>(null);
  const [diagBusy, setDiagBusy] = useState(false);

  const loadStatus = async () => {
    try {
      const s = await fetchProviderStatus();
      setServerStatus(s);
      if (s.name) setName(s.name);
      if (s.apiUrl) setApiUrl(s.apiUrl);
      setEnabled(s.enabled);
      setAutoDispatchOrders(s.autoDispatchOrders);
      setProfitMarginPercent(String(s.profitMarginPercent ?? 30));
      setCurrencyToBdtRate(String(s.currencyToBdtRate ?? settings.usdRate ?? 120));
    } catch {
      setServerStatus(null);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const handleSaveAndTest = async (e: React.FormEvent, testConnection: boolean) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const margin = Number(profitMarginPercent);
      const fxRate = Number(currencyToBdtRate);
      const resp = await saveProviderCredentials({
        name,
        apiUrl,
        apiKey: apiKey.trim() || undefined,
        enabled,
        autoDispatchOrders,
        profitMarginPercent: Number.isFinite(margin) ? margin : 30,
        currencyToBdtRate: Number.isFinite(fxRate) && fxRate > 0 ? fxRate : 120,
        testConnection,
      });

      if (!resp.ok) {
        pushToast('Provider Setup Failed', 'error', resp.error || 'Verify API URL & Key.');
        return;
      }

      await adminSaveProviderConfig(adminActor, {
        id: 'primary',
        name,
        apiUrl: resp.providerUrlMasked || apiUrl,
        enabled,
        status: resp.configured ? 'configured' : 'unconfigured',
      });

      setApiKey('');
      setServerStatus(resp);
      if (resp.balanceTest?.data) {
        const bal = `${resp.balanceTest.data.balance ?? '0'} ${resp.balanceTest.data.currency ?? ''}`.trim();
        setProviderBalance(bal);
        pushToast('Provider Connected & Verified', 'success', `Live Balance: ${bal}`);
      } else {
        pushToast('Provider API Saved', 'success', 'Credentials stored securely on backend.');
      }
    } catch (err) {
      pushToast('Save Error', 'error', err instanceof Error ? err.message : 'Unable to save provider.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCheckBalance = async () => {
    setTestingBalance(true);
    try {
      const resp = await callProviderAction<{ balance?: string; currency?: string }>('balance');
      if (!resp.ok || !resp.data) {
        pushToast('Balance Check Failed', 'error', resp.error || 'Provider unavailable.');
        setProviderBalance(null);
      } else {
        const bal = `${resp.data.balance ?? '0'} ${resp.data.currency ?? ''}`.trim();
        setProviderBalance(bal);
        pushToast('Provider Balance Synced', 'success', `Live Balance: ${bal}`);
      }
    } finally {
      setTestingBalance(false);
    }
  };

  const handleDisconnect = async () => {
    setSavingConfig(true);
    try {
      await disconnectProviderCredentials();
      await adminSaveProviderConfig(adminActor, {
        id: 'primary',
        name,
        apiUrl: '',
        enabled: false,
        status: 'unconfigured',
      });
      setApiUrl('');
      setApiKey('');
      setProviderBalance(null);
      setRemoteServices([]);
      await loadStatus();
      pushToast('Provider Disconnected', 'info', 'Stored API credentials removed from server.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleFetchRemoteServices = async () => {
    setFetchingServices(true);
    try {
      const resp = await callProviderAction<RemoteProviderService[]>('services');
      if (!resp.ok || !Array.isArray(resp.data)) {
        pushToast('Fetch Services Failed', 'error', resp.error || 'Could not fetch remote services.');
        return;
      }
      setRemoteServices(resp.data);
      setSelectedIds(new Set());
      pushToast('Remote Services Loaded', 'success', `Fetched ${resp.data.length} services from Provider API.`);
    } finally {
      setFetchingServices(false);
    }
  };

  const remoteCategories = useMemo(() => {
    const set = new Set<string>();
    remoteServices.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return ['ALL', ...Array.from(set).sort()];
  }, [remoteServices]);

  const filteredRemote = useMemo(() => {
    const q = remoteSearch.trim().toLowerCase();
    return remoteServices.filter((s) => {
      if (remoteCategoryFilter !== 'ALL' && s.category !== remoteCategoryFilter) return false;
      if (!q) return true;
      return (
        String(s.service).toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
      );
    });
  }, [remoteServices, remoteSearch, remoteCategoryFilter]);

  const computeSellingRateBdt = (rawRate: string | number) => {
    const base = Number(rawRate) || 0;
    const fx = providerRateIsUsd ? Number(currencyToBdtRate) || 120 : 1;
    const margin = Number(profitMarginPercent) || 0;
    return Math.max(0.01, Math.round(base * fx * (1 + margin / 100) * 100) / 100);
  };

  const existingProviderIds = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.providerServiceId) set.add(s.providerServiceId);
    });
    return set;
  }, [services]);

  const toggleSelectRemote = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectTopFiltered = () => {
    const next = new Set(selectedIds);
    filteredRemote.slice(0, 25).forEach((s) => next.add(String(s.service)));
    setSelectedIds(next);
  };

  const importItems = async (itemsToImport: RemoteProviderService[]) => {
    if (itemsToImport.length === 0) return;
    setImporting(true);
    try {
      const payload = itemsToImport.map((r) => ({
        providerServiceId: String(r.service),
        name: r.name || `Service #${r.service}`,
        categoryName: r.category || `${detectPlatform(r.category, r.name)} Services`,
        platform: detectPlatform(r.category, r.name),
        ratePer1000: computeSellingRateBdt(r.rate),
        minQty: Math.max(1, Number(r.min) || 10),
        maxQty: Math.max(Number(r.min) || 10, Number(r.max) || 50000),
        refillSupported: Boolean(r.refill),
        cancelSupported: Boolean(r.cancel),
        description: r.desc || `${r.category ? r.category + ' · ' : ''}Provider ID #${r.service}`,
      }));

      const res = await adminImportProviderServices(adminActor, {
        items: payload,
        existingCategories: categories,
        existingServices: services,
      });

      setSelectedIds(new Set());
      pushToast(
        'Catalog Import Complete',
        'success',
        `Imported/updated ${res.imported} services (${res.createdCategories} new categories created).`
      );
    } catch (err) {
      pushToast('Import Failed', 'error', err instanceof Error ? err.message : 'Unable to import services.');
    } finally {
      setImporting(false);
    }
  };

  const runDiagnostic = async (action: 'order-status' | 'refill' | 'cancel') => {
    if (!diagOrderId.trim()) return;
    setDiagBusy(true);
    setDiagOutput(null);
    try {
      const body = action === 'cancel' ? { orders: [diagOrderId.trim()] } : { order: diagOrderId.trim() };
      const resp = await callProviderAction(action, body);
      setDiagOutput(JSON.stringify(resp, null, 2));
    } finally {
      setDiagBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Real SMM Provider API Integration</h2>
          <p className="text-xs text-violet-300/75">
            Connect any standard SMM Panel v2 API (JustAnotherPanel, Peakerr, etc.) — API keys stay encrypted/isolated on the backend server
          </p>
        </div>
        {serverStatus?.configured && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-xs font-semibold text-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>API Connected</span>
          </span>
        )}
      </div>

      {/* Live Status Banner */}
      <div className="glass-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 border border-violet-400/20">
        <div className="flex items-start gap-3">
          {serverStatus?.configured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="text-sm font-bold text-white">
              {serverStatus?.configured
                ? `Active Provider: ${serverStatus.name}`
                : 'Provider API Not Connected Yet'}
            </p>
            <p className="text-xs text-violet-200/80">{serverStatus?.message}</p>
            {serverStatus?.hasKey && (
              <p className="text-[11px] font-mono text-sky-300">
                Stored Key: {serverStatus.apiKeyMasked} · Auto-Dispatch:{' '}
                {serverStatus.autoDispatchOrders ? 'ON' : 'OFF'}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {providerBalance && (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-xs font-mono font-bold text-emerald-200">
              Balance: {providerBalance}
            </div>
          )}
          <button
            type="button"
            disabled={testingBalance || !serverStatus?.configured}
            onClick={() => void handleCheckBalance()}
            className="rounded-xl px-3.5 py-2 bg-white/[0.06] hover:bg-white/[0.12] border border-violet-400/25 text-xs font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Server className="w-3.5 h-3.5 text-sky-300" />
            <span>{testingBalance ? 'Checking...' : 'Check Live Balance'}</span>
          </button>
        </div>
      </div>

      {/* Credentials & Automation Config Form */}
      <form
        onSubmit={(e) => void handleSaveAndTest(e, true)}
        className="glass-panel rounded-2xl p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <PlugZap className="w-4 h-4 text-sky-300" />
            <span>API Credentials &amp; Order Automation</span>
          </h3>
          {serverStatus?.configured && (
            <button
              type="button"
              disabled={savingConfig}
              onClick={() => void handleDisconnect()}
              className="text-xs text-rose-300 hover:text-rose-200 inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Stored API</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">Provider Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., JustAnotherPanel / Peakerr"
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3.5 py-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">
              Provider API Endpoint URL (v2)
            </label>
            <input
              type="url"
              required
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://provider-domain.com/api/v2"
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3.5 py-2.5 text-xs font-mono text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-violet-200 mb-1">
              Provider API Key{' '}
              {serverStatus?.hasKey && (
                <span className="text-violet-400 font-normal">(leave blank to keep {serverStatus.apiKeyMasked})</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                required={!serverStatus?.hasKey}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={serverStatus?.hasKey ? '••••••••••••••••' : 'Paste your SMM Provider API Key'}
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 pl-3.5 pr-10 py-2.5 text-xs font-mono text-white"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 hover:text-white"
                aria-label="Toggle API key visibility"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1">
                Default Profit Margin (%)
              </label>
              <input
                type="number"
                min={0}
                max={500}
                step="1"
                value={profitMarginPercent}
                onChange={(e) => setProfitMarginPercent(e.target.value)}
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2.5 text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1">
                1 USD = BDT (Import Rate)
              </label>
              <input
                type="number"
                min={1}
                step="0.5"
                value={currencyToBdtRate}
                onChange={(e) => setCurrencyToBdtRate(e.target.value)}
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2.5 text-xs font-mono text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 text-xs text-white pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>Provider Routing Enabled</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoDispatchOrders}
              onChange={(e) => setAutoDispatchOrders(e.target.checked)}
            />
            <span>Auto-Dispatch New User Orders to Provider API Immediately</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={savingConfig}
            className="neon-button-primary rounded-xl px-5 py-2.5 text-xs font-semibold text-white inline-flex items-center gap-2 disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{savingConfig ? 'Verifying & Saving...' : 'Save & Test Connection'}</span>
          </button>
          <button
            type="button"
            disabled={savingConfig}
            onClick={(e) => void handleSaveAndTest(e as unknown as React.FormEvent, false)}
            className="rounded-xl px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.12] border border-violet-400/25 text-xs font-semibold text-white"
          >
            Save Without Testing
          </button>
        </div>
        {configs.length > 0 && (
          <p className="text-[11px] text-violet-300/65">
            Last synced metadata: {formatTimestamp(configs[0].updatedAt)}
          </p>
        )}
      </form>

      {/* Remote Provider Services Importer */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">Import Real Services From Provider API</h3>
            <p className="text-xs text-violet-300/75">
              Fetch your provider&apos;s live service catalog, apply profit markup automatically, and import directly into your panel
            </p>
          </div>
          <button
            type="button"
            disabled={fetchingServices || !serverStatus?.configured}
            onClick={() => void handleFetchRemoteServices()}
            className="neon-button-primary rounded-xl px-4 py-2.5 text-xs font-semibold text-white inline-flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingServices ? 'animate-spin' : ''}`} />
            <span>{fetchingServices ? 'Fetching Services...' : 'Fetch Provider Services'}</span>
          </button>
        </div>

        {remoteServices.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-2">
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-violet-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={remoteSearch}
                  onChange={(e) => setRemoteSearch(e.target.value)}
                  placeholder="Search ID, service name, category..."
                  className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 pl-9 pr-3 py-2 text-xs text-white"
                />
              </div>
              <div className="md:col-span-4">
                <select
                  value={remoteCategoryFilter}
                  onChange={(e) => setRemoteCategoryFilter(e.target.value)}
                  className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
                >
                  {remoteCategories.map((c) => (
                    <option key={c} value={c}>
                      {c === 'ALL' ? `All Remote Categories (${remoteServices.length})` : c}
                    </option>
                  ))}
                </select>
              </div>
              <label className="md:col-span-3 flex items-center gap-2 text-xs text-violet-100">
                <input
                  type="checkbox"
                  checked={providerRateIsUsd}
                  onChange={(e) => setProviderRateIsUsd(e.target.checked)}
                />
                <span>Provider rates are USD (convert to BDT)</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0D0620] border border-violet-500/20 rounded-xl px-4 py-2.5 text-xs">
              <span className="text-violet-200">
                Showing <strong className="text-white">{filteredRemote.length}</strong> services ·{' '}
                <strong className="text-sky-300">{selectedIds.size}</strong> selected
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectTopFiltered}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-violet-400/25 text-white"
                >
                  Select First 25 Visible
                </button>
                <button
                  type="button"
                  disabled={selectedIds.size === 0 || importing}
                  onClick={() =>
                    void importItems(
                      remoteServices.filter((r) => selectedIds.has(String(r.service)))
                    )
                  }
                  className="px-3.5 py-1.5 rounded-lg neon-button-primary font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{importing ? 'Importing...' : `Import Selected (${selectedIds.size})`}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-xl border border-violet-500/15">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0D0620] z-10">
                  <tr className="border-b border-violet-500/20 text-[11px] text-violet-300/75">
                    <th className="py-2.5 px-3 w-8">Pick</th>
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Service &amp; Category</th>
                    <th className="py-2.5 px-3 text-right">Provider Rate</th>
                    <th className="py-2.5 px-3 text-right">Your Rate (BDT)</th>
                    <th className="py-2.5 px-3 text-right">Min / Max</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-500/10 text-xs">
                  {filteredRemote.slice(0, 120).map((r) => {
                    const idStr = String(r.service);
                    const alreadyImported = existingProviderIds.has(idStr);
                    const sellingBdt = computeSellingRateBdt(r.rate);
                    return (
                      <tr key={idStr} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(idStr)}
                            onChange={() => toggleSelectRemote(idStr)}
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono text-sky-300">#{idStr}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-white line-clamp-1">{r.name}</p>
                          <p className="text-[11px] text-violet-300/70">
                            {r.category} · {detectPlatform(r.category, r.name)}
                            {r.refill ? ' · Refill' : ''}
                            {r.cancel ? ' · Cancel' : ''}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-violet-200">
                          {r.rate} {providerRateIsUsd ? 'USD' : 'BDT'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300">
                          {formatCurrency(sellingBdt, currency, settings)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-violet-300/80 whitespace-nowrap">
                          {formatNumber(Number(r.min) || 0)} – {formatNumber(Number(r.max) || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            disabled={importing}
                            onClick={() => void importItems([r])}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                              alreadyImported
                                ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-200'
                                : 'bg-violet-600/30 hover:bg-violet-600/50 border-violet-400/35 text-white'
                            }`}
                          >
                            {alreadyImported ? 'Update' : 'Import'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Diagnostic Order Lookup */}
      <div className="glass-panel rounded-2xl p-6 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Wrench className="w-4 h-4 text-sky-300" />
          <span>Direct Provider Order Diagnostic (Status / Refill / Cancel)</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={diagOrderId}
            onChange={(e) => setDiagOrderId(e.target.value)}
            placeholder="External Provider Order ID (e.g. 982341)"
            className="flex-1 min-w-[220px] rounded-xl bg-[#0B051A] border border-violet-500/25 px-3.5 py-2 text-xs font-mono text-white"
          />
          <button
            type="button"
            disabled={diagBusy || !serverStatus?.configured}
            onClick={() => void runDiagnostic('order-status')}
            className="px-3.5 py-2 rounded-xl bg-sky-500/20 border border-sky-400/35 text-xs font-semibold text-sky-100 disabled:opacity-50"
          >
            Check Status
          </button>
          <button
            type="button"
            disabled={diagBusy || !serverStatus?.configured}
            onClick={() => void runDiagnostic('refill')}
            className="px-3.5 py-2 rounded-xl bg-violet-500/20 border border-violet-400/35 text-xs font-semibold text-violet-100 disabled:opacity-50"
          >
            Trigger Refill
          </button>
          <button
            type="button"
            disabled={diagBusy || !serverStatus?.configured}
            onClick={() => void runDiagnostic('cancel')}
            className="px-3.5 py-2 rounded-xl bg-rose-500/20 border border-rose-400/35 text-xs font-semibold text-rose-100 disabled:opacity-50"
          >
            Cancel Order
          </button>
        </div>
        {diagOutput && (
          <pre className="rounded-xl bg-[#070312] border border-violet-500/20 p-3 text-[11px] font-mono text-sky-200 overflow-x-auto">
            {diagOutput}
          </pre>
        )}
      </div>
    </div>
  );
}
