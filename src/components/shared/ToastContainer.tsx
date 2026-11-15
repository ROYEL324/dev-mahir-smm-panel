import { CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.variant === 'success'
            ? CheckCircle2
            : toast.variant === 'error'
              ? AlertTriangle
              : Info;
        const accent =
          toast.variant === 'success'
            ? 'border-emerald-500/35 text-emerald-300'
            : toast.variant === 'error'
              ? 'border-rose-500/35 text-rose-300'
              : 'border-violet-400/35 text-violet-200';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto glass-panel rounded-xl px-4 py-3 flex items-start gap-3 border ${accent} transition-all duration-200`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-snug">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-violet-200/80 mt-0.5 leading-relaxed">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-violet-300/70 hover:text-white transition-colors p-0.5 rounded"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
