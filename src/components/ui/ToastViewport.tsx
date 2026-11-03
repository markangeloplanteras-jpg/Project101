import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export function ToastViewport() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 sm:right-6">
      {toasts.map((toast) => (
        <div key={toast.id} className="card flex items-start gap-3 rounded-2xl p-3.5 shadow-xl animate-fade-up">
          {toast.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> : toast.type === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 text-rose-500" /> : <Info className="mt-0.5 h-4 w-4 text-accent-500" />}
          <p className="flex-1 text-sm">{toast.message}</p>
          <button className="icon-btn h-7 w-7" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
