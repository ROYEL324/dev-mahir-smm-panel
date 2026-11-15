import React, { useMemo, useState } from 'react';
import { FolderPlus, Percent, Plus, Power, Search, Server, Sparkles, Trash2, Edit2, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import {
  adminBulkAdjustServiceRates,
  adminDeleteCategory,
  adminDeleteService,
  adminSaveCategory,
  adminSaveService,
  adminSeedStarterCatalog,
  adminToggleServiceEnabled,
} from '../../services/firestoreService';
import type { PlatformName, ServiceCategory, SmmService } from '../../types/smm';
import { formatCurrency, formatNumber } from '../../utils/format';

const PLATFORMS: PlatformName[] = [
  'Instagram',
  'Facebook',
  'YouTube',
  'TikTok',
  'Telegram',
  'X',
  'Other',
];

export function AdminServicesTab({ onOpenProviders }: { onOpenProviders?: () => void }) {
  const { firebaseUser, categories, services, currency, settings, pushToast } = useApp();
  const adminActor = {
    uid: firebaseUser?.uid || '',
    email: firebaseUser?.email || 'admin',
  };

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<ServiceCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catPlatform, setCatPlatform] = useState<PlatformName>('Instagram');
  const [catSort, setCatSort] = useState('1');
  const [catEnabled, setCatEnabled] = useState(true);

  const [srvModalOpen, setSrvModalOpen] = useState(false);
  const [editingSrv, setEditingSrv] = useState<SmmService | null>(null);
  const [srvName, setSrvName] = useState('');
  const [srvCatId, setSrvCatId] = useState('');
  const [srvPlatform, setSrvPlatform] = useState<PlatformName>('Instagram');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvRate, setSrvRate] = useState('150');
  const [srvMin, setSrvMin] = useState('100');
  const [srvMax, setSrvMax] = useState('50000');
  const [srvAvgTime, setSrvAvgTime] = useState('1 - 6 hours');
  const [srvRefill, setSrvRefill] = useState(true);
  const [srvCancel, setSrvCancel] = useState(false);
  const [srvProviderId, setSrvProviderId] = useState('primary');
  const [srvProviderServiceId, setSrvProviderServiceId] = useState('');
  const [srvEnabled, setSrvEnabled] = useState(true);
  const [busy, setBusy] = useState(false);

  // Filters & bulk markup
  const [srvSearch, setSrvSearch] = useState('');
  const [srvPlatformFilter, setSrvPlatformFilter] = useState<'All' | PlatformName>('All');
  const [bulkPercent, setBulkPercent] = useState('10');

  const filteredServices = useMemo(() => {
    const q = srvSearch.trim().toLowerCase();
    return services.filter((s) => {
      if (srvPlatformFilter !== 'All' && s.platform !== srvPlatformFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.providerServiceId.toLowerCase().includes(q)
      );
    });
  }, [services, srvSearch, srvPlatformFilter]);

  const openNewCat = () => {
    setEditingCat(null);
    setCatName('');
    setCatPlatform('Instagram');
    setCatSort(String(categories.length + 1));
    setCatEnabled(true);
    setCatModalOpen(true);
  };

  const openEditCat = (c: ServiceCategory) => {
    setEditingCat(c);
    setCatName(c.name);
    setCatPlatform(c.platform);
    setCatSort(String(c.sortOrder));
    setCatEnabled(c.enabled);
    setCatModalOpen(true);
  };

  const openNewSrv = () => {
    setEditingSrv(null);
    setSrvName('');
    setSrvCatId(categories[0]?.id || '');
    setSrvPlatform(categories[0]?.platform || 'Instagram');
    setSrvDesc('');
    setSrvRate('150');
    setSrvMin('100');
    setSrvMax('50000');
    setSrvAvgTime('1 - 4 hours');
    setSrvRefill(true);
    setSrvCancel(false);
    setSrvProviderId('primary');
    setSrvProviderServiceId('');
    setSrvEnabled(true);
    setSrvModalOpen(true);
  };

  const openEditSrv = (s: SmmService) => {
    setEditingSrv(s);
    setSrvName(s.name);
    setSrvCatId(s.categoryId);
    setSrvPlatform(s.platform);
    setSrvDesc(s.description);
    setSrvRate(String(s.ratePer1000));
    setSrvMin(String(s.minQty));
    setSrvMax(String(s.maxQty));
    setSrvAvgTime(s.avgTime);
    setSrvRefill(s.refillSupported);
    setSrvCancel(s.cancelSupported);
    setSrvProviderId(s.providerId);
    setSrvProviderServiceId(s.providerServiceId);
    setSrvEnabled(s.enabled);
    setSrvModalOpen(true);
  };

  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminSaveCategory(adminActor, {
        id: editingCat?.id,
        name: catName,
        platform: catPlatform,
        sortOrder: Number(catSort) || 1,
        enabled: catEnabled,
      });
      pushToast('Category Saved', 'success');
      setCatModalOpen(false);
    } catch (err) {
      pushToast('Error', 'error', err instanceof Error ? err.message : 'Failed to save category.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSrv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!srvCatId) {
      pushToast('Category Required', 'error', 'Create or select a service category first.');
      return;
    }
    setBusy(true);
    try {
      await adminSaveService(adminActor, {
        id: editingSrv?.id,
        categoryId: srvCatId,
        platform: srvPlatform,
        name: srvName,
        description: srvDesc,
        ratePer1000: Number(srvRate),
        minQty: Number(srvMin),
        maxQty: Number(srvMax),
        avgTime: srvAvgTime,
        refillSupported: srvRefill,
        cancelSupported: srvCancel,
        providerId: srvProviderId,
        providerServiceId: srvProviderServiceId,
        enabled: srvEnabled,
      });
      pushToast('Service Saved', 'success');
      setSrvModalOpen(false);
    } catch (err) {
      pushToast('Error', 'error', err instanceof Error ? err.message : 'Failed to save service.');
    } finally {
      setBusy(false);
    }
  };

  const handleSeed = async () => {
    setBusy(true);
    try {
      await adminSeedStarterCatalog(adminActor);
      pushToast('Starter Catalog Initialized', 'success', 'Added starter categories & 12 services.');
    } catch (err) {
      pushToast('Seed Failed', 'error', err instanceof Error ? err.message : 'Error seeding.');
    } finally {
      setBusy(false);
    }
  };

  const handleBulkRateAdjust = async () => {
    const delta = Number(bulkPercent);
    if (!Number.isFinite(delta) || delta === 0 || filteredServices.length === 0) return;
    setBusy(true);
    try {
      const count = await adminBulkAdjustServiceRates(adminActor, filteredServices, delta);
      pushToast(
        'Rates Adjusted',
        'success',
        `Updated ${count} service rates by ${delta > 0 ? '+' : ''}${delta}%.`
      );
    } catch (err) {
      pushToast('Adjustment Failed', 'error', err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Service &amp; Category Management</h2>
          <p className="text-xs text-violet-300/75">
            Configure platforms, categories, rates per 1,000, bulk markup, and provider mapping
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onOpenProviders && (
            <button
              type="button"
              onClick={onOpenProviders}
              className="rounded-xl px-3.5 py-2 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/35 text-xs font-semibold text-sky-100 inline-flex items-center gap-1.5"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Import From API</span>
            </button>
          )}
          {services.length === 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSeed()}
              className="rounded-xl px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/35 text-xs font-semibold text-amber-100 inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Initialize Starter Catalog</span>
            </button>
          )}
          <button
            type="button"
            onClick={openNewCat}
            className="rounded-xl px-3.5 py-2 bg-white/[0.06] hover:bg-white/[0.12] border border-violet-400/25 text-xs font-semibold text-white inline-flex items-center gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5 text-sky-300" />
            <span>Add Category</span>
          </button>
          <button
            type="button"
            onClick={openNewSrv}
            className="neon-button-primary rounded-xl px-4 py-2 text-xs font-semibold text-white inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {/* Categories Strip */}
      <div className="glass-panel rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">Categories ({categories.length})</h3>
        {categories.length === 0 ? (
          <p className="text-xs text-violet-300/70">No categories yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-xl p-3 bg-[#0B051A]/85 border border-violet-500/20 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{cat.name}</p>
                  <p className="text-[11px] text-violet-300/70">
                    {cat.platform} · Sort #{cat.sortOrder} · {cat.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditCat(cat)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-violet-200"
                    aria-label="Edit category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void adminDeleteCategory(adminActor, cat.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/15 text-rose-300"
                    aria-label="Delete category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter & Bulk Rate Adjust Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-60">
            <Search className="w-4 h-4 text-violet-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={srvSearch}
              onChange={(e) => setSrvSearch(e.target.value)}
              placeholder="Search service or provider ID..."
              className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 pl-9 pr-3 py-2 text-xs text-white"
            />
          </div>
          <select
            value={srvPlatformFilter}
            onChange={(e) => setSrvPlatformFilter(e.target.value as 'All' | PlatformName)}
            className="rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
          >
            <option value="All">All Platforms ({services.length})</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-violet-300/80">Bulk Rate %:</span>
          <input
            type="number"
            step="1"
            value={bulkPercent}
            onChange={(e) => setBulkPercent(e.target.value)}
            className="w-20 rounded-xl bg-[#0B051A] border border-violet-500/25 px-2.5 py-1.5 text-xs font-mono text-white"
          />
          <button
            type="button"
            disabled={busy || filteredServices.length === 0}
            onClick={() => void handleBulkRateAdjust()}
            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-violet-400/25 text-xs font-semibold text-white inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Percent className="w-3.5 h-3.5 text-sky-300" />
            <span>Apply ({filteredServices.length})</span>
          </button>
        </div>
      </div>

      {/* Services Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-violet-500/15 bg-[#0D0620]/80 text-[11px] text-violet-300/75">
                <th className="py-3 px-4 font-semibold">Service</th>
                <th className="py-3 px-4 font-semibold">Platform</th>
                <th className="py-3 px-4 font-semibold text-right">Rate / 1k</th>
                <th className="py-3 px-4 font-semibold text-right">Min / Max</th>
                <th className="py-3 px-4 font-semibold">State</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-500/10 text-xs">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-violet-300/70">
                    No services matching filter. Add a service, initialize starter catalog, or import from Provider API.
                  </td>
                </tr>
              ) : (
                filteredServices.map((srv) => (
                  <tr key={srv.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-white">{srv.name}</p>
                      <p className="text-[11px] font-mono text-violet-300/65">
                        {srv.id} · Provider Srv #{srv.providerServiceId || 'manual'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-violet-200">{srv.platform}</td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-sky-300 font-bold">
                      {formatCurrency(srv.ratePer1000, currency, settings)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-violet-200">
                      {formatNumber(srv.minQty)} – {formatNumber(srv.maxQty)}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => void adminToggleServiceEnabled(adminActor, srv)}
                        className={`px-2 py-0.5 rounded text-[11px] border inline-flex items-center gap-1 ${
                          srv.enabled
                            ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20'
                            : 'text-rose-300 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{srv.enabled ? 'Enabled' : 'Disabled'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={() => openEditSrv(srv)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-violet-500/25 text-white border border-violet-500/20"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void adminDeleteService(adminActor, srv.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/25"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <form
            onSubmit={handleSaveCat}
            className="glass-panel w-full max-w-md rounded-2xl p-6 border border-violet-400/25 relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setCatModalOpen(false)}
              className="absolute top-4 right-4 text-violet-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white">
              {editingCat ? 'Edit Category' : 'New Category'}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1">
                Category Name
              </label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-violet-200 mb-1">Platform</label>
                <select
                  value={catPlatform}
                  onChange={(e) => setCatPlatform(e.target.value as PlatformName)}
                  className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm text-white"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-violet-200 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  min={0}
                  value={catSort}
                  onChange={(e) => setCatSort(e.target.value)}
                  className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm font-mono text-white"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-violet-100">
              <input
                type="checkbox"
                checked={catEnabled}
                onChange={(e) => setCatEnabled(e.target.checked)}
              />
              <span>Category Enabled</span>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full neon-button-primary rounded-xl py-2.5 text-sm font-semibold text-white"
            >
              {busy ? 'Saving...' : 'Save Category'}
            </button>
          </form>
        </div>
      )}

      {/* Service Modal */}
      {srvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <form
            onSubmit={handleSaveSrv}
            className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-violet-400/25 relative space-y-3.5 max-h-[90vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => setSrvModalOpen(false)}
              className="absolute top-4 right-4 text-violet-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white">
              {editingSrv ? 'Edit Service' : 'Create Service'}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1">
                Service Name
              </label>
              <input
                type="text"
                required
                value={srvName}
                onChange={(e) => setSrvName(e.target.value)}
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-violet-200 mb-1">Platform</label>
                <select
                  value={srvPlatform}
                  onChange={(e) => setSrvPlatform(e.target.value as PlatformName)}
                  className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-violet-200 mb-1">Category</label>
                <select
                  required
                  value={srvCatId}
                  onChange={(e) => setSrvCatId(e.target.value)}
                  className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.platform})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-violet-200 mb-1">
                  Rate / 1k (BDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={srvRate}
                  onChange={(e) => setSrvRate(e.target.value)}
                  className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-violet-200 mb-1">Min Qty</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={srvMin}
                  onChange={(e) => setSrvMin(e.target.value)}
                  className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-violet-200 mb-1">Max Qty</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={srvMax}
                  onChange={(e) => setSrvMax(e.target.value)}
                  className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-violet-200 mb-1">
                  Estimated Avg Time
                </label>
                <input
                  type="text"
                  value={srvAvgTime}
                  onChange={(e) => setSrvAvgTime(e.target.value)}
                  className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-violet-200 mb-1">
                  Provider Service ID
                </label>
                <input
                  type="text"
                  value={srvProviderServiceId}
                  onChange={(e) => setSrvProviderServiceId(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-violet-200 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={srvDesc}
                onChange={(e) => setSrvDesc(e.target.value)}
                className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-violet-100 pt-1">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={srvEnabled}
                  onChange={(e) => setSrvEnabled(e.target.checked)}
                />
                <span>Enabled</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={srvRefill}
                  onChange={(e) => setSrvRefill(e.target.checked)}
                />
                <span>Refill Supported</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={srvCancel}
                  onChange={(e) => setSrvCancel(e.target.checked)}
                />
                <span>Cancel Supported</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full neon-button-primary rounded-xl py-2.5 text-sm font-semibold text-white"
            >
              {busy ? 'Saving...' : 'Save Service'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
