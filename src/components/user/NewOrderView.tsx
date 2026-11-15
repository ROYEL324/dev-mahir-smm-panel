import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  Link as LinkIcon,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { dispatchOrderToProvider, validateOrderServer } from '../../services/apiService';
import { placeAtomicOrder, STARTER_CATEGORIES, STARTER_SERVICES } from '../../services/firestoreService';
import type { PlatformName } from '../../types/smm';
import { formatCurrency, formatNumber, isValidTargetInput } from '../../utils/format';
import { PlatformIcon } from '../shared/PlatformIcon';

const PLATFORMS: PlatformName[] = [
  'Instagram',
  'Facebook',
  'YouTube',
  'TikTok',
  'Telegram',
  'X',
  'Other',
];

export function NewOrderView() {
  const {
    t,
    firebaseUser,
    profile,
    categories,
    services,
    settings,
    currency,
    preselectedServiceId,
    setUserRoute,
    openAuthModal,
    pushToast,
  } = useApp();

  const [selectedPlatform, setSelectedPlatform] = useState<PlatformName>('Instagram');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isCatalogSynced = services.length > 0;

  const activeCategories = useMemo(() => {
    if (categories.length > 0) return categories;
    return STARTER_CATEGORIES.map((c) => ({ ...c, createdAt: null, updatedAt: null }));
  }, [categories]);

  const activeServices = useMemo(() => {
    if (services.length > 0) return services;
    return STARTER_SERVICES.map((s) => ({ ...s, createdAt: null, updatedAt: null }));
  }, [services]);

  // Apply preselected service when navigated from Services or Search
  useEffect(() => {
    if (preselectedServiceId) {
      const found = activeServices.find((s) => s.id === preselectedServiceId);
      if (found) {
        setSelectedPlatform(found.platform);
        setSelectedCategoryId(found.categoryId);
        setSelectedServiceId(found.id);
        setQuantity(found.minQty);
      }
    }
  }, [preselectedServiceId, activeServices]);

  const platformCategories = useMemo(() => {
    return activeCategories.filter((c) => c.platform === selectedPlatform);
  }, [activeCategories, selectedPlatform]);

  useEffect(() => {
    if (platformCategories.length > 0 && !platformCategories.some((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId(platformCategories[0].id);
    } else if (platformCategories.length === 0) {
      setSelectedCategoryId('');
    }
  }, [platformCategories, selectedCategoryId]);

  const filteredServices = useMemo(() => {
    if (selectedCategoryId) {
      return activeServices.filter(
        (s) => s.platform === selectedPlatform && s.categoryId === selectedCategoryId
      );
    }
    return activeServices.filter((s) => s.platform === selectedPlatform);
  }, [activeServices, selectedPlatform, selectedCategoryId]);

  useEffect(() => {
    if (filteredServices.length > 0 && !filteredServices.some((s) => s.id === selectedServiceId)) {
      setSelectedServiceId(filteredServices[0].id);
      setQuantity(filteredServices[0].minQty);
    } else if (filteredServices.length === 0) {
      setSelectedServiceId('');
    }
  }, [filteredServices, selectedServiceId]);

  const activeService = useMemo(
    () => activeServices.find((s) => s.id === selectedServiceId) || null,
    [activeServices, selectedServiceId]
  );

  const calculatedPrice = useMemo(() => {
    if (!activeService || !Number.isFinite(quantity) || quantity <= 0) return 0;
    return Math.round(((quantity * activeService.ratePer1000) / 1000) * 100) / 100;
  }, [activeService, quantity]);

  const insufficientBalance = Boolean(
    profile && calculatedPrice > 0 && profile.walletBalance < calculatedPrice
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    if (!firebaseUser || !profile) {
      openAuthModal('login');
      return;
    }

    if (!isCatalogSynced) {
      setErrorMsg(
        'Catalog is awaiting initial admin sync in Firestore. Sign in with the admin account once to publish live services.'
      );
      return;
    }

    if (!activeService) {
      setErrorMsg('Please select an active service.');
      return;
    }

    if (!isValidTargetInput(targetUrl)) {
      setErrorMsg('Please enter a valid target URL or @username (min 5 characters).');
      return;
    }

    const intQty = Math.floor(Number(quantity));
    if (intQty < activeService.minQty || intQty > activeService.maxQty) {
      setErrorMsg(
        `Quantity must be between ${formatNumber(activeService.minQty)} and ${formatNumber(
          activeService.maxQty
        )}.`
      );
      return;
    }

    if (profile.walletBalance < calculatedPrice) {
      setErrorMsg(t('insufficientBalance'));
      return;
    }

    setSubmitting(true);
    try {
      // Server-side pre-validation
      const validation = await validateOrderServer({
        targetUrl: targetUrl.trim(),
        quantity: intQty,
        minQty: activeService.minQty,
        maxQty: activeService.maxQty,
        ratePer1000: activeService.ratePer1000,
      });

      if (!validation.valid) {
        throw new Error(validation.error || 'Server order validation rejected this request.');
      }

      const result = await placeAtomicOrder({
        uid: firebaseUser.uid,
        serviceId: activeService.id,
        targetUrl: targetUrl.trim(),
        quantity: intQty,
      });

      let toastDesc = `Order ${result.orderId} submitted for ${formatCurrency(
        result.price,
        currency,
        settings
      )}.`;

      try {
        const dispatch = await dispatchOrderToProvider(result.orderId);
        if (dispatch.dispatched && dispatch.providerOrderId) {
          toastDesc = `Order ${result.orderId} auto-dispatched to fulfillment (#${dispatch.providerOrderId}).`;
        }
      } catch {
        // Order remains safely queued in Firestore for manual/admin sync
      }

      pushToast('Order Placed Successfully', 'success', toastDesc);
      setTargetUrl('');
      setUserRoute('orders');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to place order.';
      setErrorMsg(msg);
      pushToast('Order Rejected', 'error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('placeOrderTitle')}</h1>
          <p className="text-xs text-violet-300/80 mt-1">
            Server-validated order placement with atomic wallet balance deduction
          </p>
        </div>
        {profile && (
          <div className="rounded-xl px-4 py-2 glass-card flex items-center gap-2.5">
            <Wallet className="w-4 h-4 text-sky-300" />
            <span className="text-xs text-violet-200/80">Available:</span>
            <span className="text-sm font-bold text-white font-mono tabular-nums">
              {formatCurrency(profile.walletBalance, currency, settings)}
            </span>
          </div>
        )}
      </div>

      {/* Platform Selector Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {PLATFORMS.map((platform) => {
          const active = selectedPlatform === platform;
          return (
            <button
              key={platform}
              type="button"
              onClick={() => setSelectedPlatform(platform)}
              className={`rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 text-xs font-semibold border transition-all whitespace-nowrap ${
                active
                  ? 'bg-gradient-to-r from-violet-600/40 to-blue-600/30 border-violet-400/60 text-white shadow-lg shadow-violet-700/25'
                  : 'bg-[#110826]/75 border-violet-500/20 text-violet-200/75 hover:text-white hover:border-violet-400/40'
              }`}
            >
              <PlatformIcon platform={platform} className="w-4 h-4 shrink-0" />
              <span>{platform}</span>
            </button>
          );
        })}
      </div>

      {activeServices.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center">
          <Layers className="w-10 h-10 text-violet-400/70 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">No Services Configured Yet</h2>
          <p className="text-xs text-violet-300/80 max-w-md mx-auto mt-1.5">{t('noServicesYet')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Order Form */}
          <form
            onSubmit={handleSubmit}
            className="xl:col-span-7 glass-panel rounded-2xl p-6 space-y-5"
          >
            {errorMsg && (
              <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-300" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1.5">
                {t('selectCategory')}
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-400"
              >
                {platformCategories.length === 0 ? (
                  <option value="">All {selectedPlatform} Services</option>
                ) : (
                  platformCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Service */}
            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1.5">
                {t('selectService')}
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => {
                  const srv = activeServices.find((s) => s.id === e.target.value);
                  setSelectedServiceId(e.target.value);
                  if (srv) setQuantity(srv.minQty);
                }}
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-400"
              >
                {filteredServices.length === 0 ? (
                  <option value="">No enabled services for {selectedPlatform}</option>
                ) : (
                  filteredServices.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.name} — {formatCurrency(srv.ratePer1000, currency, settings)} / 1000
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Target URL */}
            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1.5">
                {t('targetLink')}
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 text-violet-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://instagram.com/username or post URL"
                  className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-violet-400/40 focus:outline-none focus:border-violet-400"
                />
              </div>
            </div>

            {/* Quantity & Limits */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-violet-200">{t('quantity')}</label>
                {activeService && (
                  <span className="text-[11px] text-violet-300/75 font-mono tabular-nums">
                    {t('minQty')}: {formatNumber(activeService.minQty)} · {t('maxQty')}:{' '}
                    {formatNumber(activeService.maxQty)}
                  </span>
                )}
              </div>
              <input
                type="number"
                required
                min={activeService?.minQty || 1}
                max={activeService?.maxQty || 1000000}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3.5 py-2.5 text-sm font-mono tabular-nums text-white focus:outline-none focus:border-violet-400"
              />
            </div>

            {/* Calculated Charge */}
            <div className="rounded-2xl p-4 bg-[#0D0620] border border-violet-400/25 flex items-center justify-between">
              <div>
                <p className="text-xs text-violet-300/80">{t('totalPrice')}</p>
                <p className="text-[11px] text-violet-300/60 mt-0.5">
                  Auto-computed from database rate
                </p>
              </div>
              <p className="text-2xl font-bold text-sky-300 font-mono tabular-nums">
                {formatCurrency(calculatedPrice, currency, settings)}
              </p>
            </div>

            {insufficientBalance && (
              <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-xs text-amber-200">{t('insufficientBalance')}</p>
                <button
                  type="button"
                  onClick={() => setUserRoute('add-funds')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 text-xs font-semibold text-amber-100 shrink-0"
                >
                  Add Funds
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !activeService || insufficientBalance}
              className="w-full neon-button-primary rounded-xl py-3 px-5 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-55 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Validating & Submitting...'
                  : !firebaseUser
                    ? 'Sign In to Confirm Order'
                    : t('confirmOrder')}
              </span>
            </button>
          </form>

          {/* Service Details Sidebar */}
          <div className="xl:col-span-5 glass-panel rounded-2xl p-6 space-y-4 h-fit">
            <h2 className="text-base font-bold text-white">Service Specifications</h2>
            {activeService ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-400/25 flex items-center justify-center shrink-0">
                    <PlatformIcon platform={activeService.platform} className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-snug">{activeService.name}</p>
                    <p className="text-xs text-violet-300/75 mt-0.5">
                      ID: <span className="font-mono">{activeService.id}</span> ·{' '}
                      {activeService.platform}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-violet-200/85 leading-relaxed bg-[#0B051A]/80 rounded-xl p-3.5 border border-violet-500/15">
                  {activeService.description || 'No additional description provided.'}
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl p-3 bg-[#0B051A]/80 border border-violet-500/15">
                    <span className="text-violet-300/70 block">{t('avgTime')}</span>
                    <span className="font-semibold text-white mt-1 inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-300" />
                      {activeService.avgTime || 'Varies'}
                    </span>
                  </div>
                  <div className="rounded-xl p-3 bg-[#0B051A]/80 border border-violet-500/15">
                    <span className="text-violet-300/70 block">Rate per 1,000</span>
                    <span className="font-semibold text-sky-300 font-mono tabular-nums mt-1 block">
                      {formatCurrency(activeService.ratePer1000, currency, settings)}
                    </span>
                  </div>
                  <div className="rounded-xl p-3 bg-[#0B051A]/80 border border-violet-500/15">
                    <span className="text-violet-300/70 block">Refill Support</span>
                    <span className="font-semibold text-white mt-1 inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-violet-300" />
                      {activeService.refillSupported ? 'Supported' : 'Not Available'}
                    </span>
                  </div>
                  <div className="rounded-xl p-3 bg-[#0B051A]/80 border border-violet-500/15">
                    <span className="text-violet-300/70 block">Cancel Option</span>
                    <span className="font-semibold text-white mt-1 inline-flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-violet-300" />
                      {activeService.cancelSupported ? 'Supported' : 'Non-Cancelable'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-violet-300/70">
                Select a platform and service to inspect limits and processing information.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
