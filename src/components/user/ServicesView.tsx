import { useMemo, useState } from 'react';
import { Clock, Info, Layers, RefreshCw, Search, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { STARTER_CATEGORIES, STARTER_SERVICES } from '../../services/firestoreService';
import type { PlatformName, SmmService } from '../../types/smm';
import { formatCurrency, formatNumber } from '../../utils/format';
import { PlatformIcon } from '../shared/PlatformIcon';

const PLATFORM_TABS: Array<'All' | PlatformName> = [
  'All',
  'Instagram',
  'Facebook',
  'YouTube',
  'TikTok',
  'Telegram',
  'X',
  'Other',
];

export function ServicesView() {
  const {
    services,
    categories,
    currency,
    settings,
    globalSearch,
    setGlobalSearch,
    launchOrderForService,
    firebaseUser,
    openAuthModal,
  } = useApp();

  const [platform, setPlatform] = useState<'All' | PlatformName>('All');
  const [detailService, setDetailService] = useState<SmmService | null>(null);

  const activeCategories = useMemo(() => {
    if (categories.length > 0) return categories;
    return STARTER_CATEGORIES.map((c) => ({ ...c, createdAt: null, updatedAt: null }));
  }, [categories]);

  const activeServices = useMemo(() => {
    if (services.length > 0) return services;
    return STARTER_SERVICES.map((s) => ({ ...s, createdAt: null, updatedAt: null }));
  }, [services]);

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    activeCategories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [activeCategories]);

  const filteredServices = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return activeServices.filter((s) => {
      if (platform !== 'All' && s.platform !== platform) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.platform.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    });
  }, [activeServices, platform, globalSearch]);

  const handleOrderClick = (serviceId: string) => {
    if (!firebaseUser) {
      openAuthModal('login');
      return;
    }
    launchOrderForService(serviceId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Services Catalog</h1>
        <p className="text-xs text-violet-300/80 mt-1">
          Live pricing per 1,000 units with transparent minimum and maximum limits
        </p>
      </div>

      {/* Filters */}
      <div className="glass-panel rounded-2xl p-4 space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-violet-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Filter services by name or keyword..."
            className="w-full rounded-xl bg-[#0B051A] border border-violet-500/25 pl-10 pr-4 py-2 text-sm text-white placeholder:text-violet-400/45 focus:outline-none focus:border-violet-400"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PLATFORM_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setPlatform(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                platform === tab
                  ? 'bg-violet-600 text-white'
                  : 'bg-[#0B051A]/80 text-violet-300/80 hover:text-white border border-violet-500/20'
              }`}
            >
              {tab !== 'All' && <PlatformIcon platform={tab} className="w-3.5 h-3.5" />}
              <span>{tab}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Services Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {filteredServices.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-9 h-9 text-violet-400/70 mx-auto mb-2.5" />
            <p className="text-sm font-semibold text-white">No Services Found</p>
            <p className="text-xs text-violet-300/70 mt-1 max-w-md mx-auto">
              Try another platform filter or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-violet-500/15 bg-[#0D0620]/80 text-[11px] text-violet-300/75">
                  <th className="py-3 px-4 font-semibold">Service</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold text-right">Rate / 1k</th>
                  <th className="py-3 px-4 font-semibold text-right">Min / Max</th>
                  <th className="py-3 px-4 font-semibold">Avg Time</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-500/10 text-xs">
                {filteredServices.map((srv) => (
                  <tr key={srv.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <PlatformIcon platform={srv.platform} className="w-4 h-4 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate max-w-[280px]">
                            {srv.name}
                          </p>
                          <p className="text-[11px] text-violet-300/65">
                            {srv.platform} {srv.refillSupported ? '· Refill' : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-violet-200/80 whitespace-nowrap">
                      {categoryNameMap.get(srv.categoryId) || srv.platform}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-sky-300 whitespace-nowrap">
                      {formatCurrency(srv.ratePer1000, currency, settings)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-violet-200 whitespace-nowrap">
                      {formatNumber(srv.minQty)} – {formatNumber(srv.maxQty)}
                    </td>
                    <td className="py-3.5 px-4 text-violet-200/80 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-violet-400" />
                        {srv.avgTime}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailService(srv)}
                          className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-violet-500/20 text-violet-200"
                          aria-label={`View description for ${srv.name}`}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOrderClick(srv.id)}
                          className="px-3 py-1.5 rounded-lg neon-button-primary text-xs font-semibold text-white"
                        >
                          Order
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Service Description Modal */}
      {detailService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-violet-400/25 relative">
            <button
              type="button"
              onClick={() => setDetailService(null)}
              className="absolute top-4 right-4 text-violet-300 hover:text-white p-1"
              aria-label="Close service info"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <PlatformIcon platform={detailService.platform} className="w-6 h-6" />
              <div>
                <h2 className="text-base font-bold text-white">{detailService.name}</h2>
                <p className="text-xs text-violet-300/75">{detailService.platform}</p>
              </div>
            </div>
            <p className="text-xs text-violet-200/90 leading-relaxed mb-4 bg-[#0B051A] rounded-xl p-3.5 border border-violet-500/15">
              {detailService.description || 'No extra description provided.'}
            </p>
            <div className="flex items-center justify-between text-xs text-violet-300/80 mb-5">
              <span className="inline-flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 text-sky-300" />
                Refill: {detailService.refillSupported ? 'Yes' : 'No'}
              </span>
              <span className="font-mono tabular-nums font-bold text-sky-300">
                {formatCurrency(detailService.ratePer1000, currency, settings)} / 1,000
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const id = detailService.id;
                setDetailService(null);
                handleOrderClick(id);
              }}
              className="w-full neon-button-primary rounded-xl py-2.5 text-xs font-semibold text-white"
            >
              Order This Service
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
