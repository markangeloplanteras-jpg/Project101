import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  widthClass?: string;
}

export function Modal({ open, title, onClose, children, widthClass = 'max-w-2xl' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className={cnClass(widthClass)} role="dialog" aria-modal="true" aria-label={title}>
        <div className="card flex max-h-[90vh] flex-col rounded-2xl">
          <div className="flex items-center justify-between border-b border-default px-5 py-4">
            <h3 className="text-lg font-display">{title}</h3>
            <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function cnClass(widthClass: string) {
  return `relative w-full ${widthClass}`;
}
