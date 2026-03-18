'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// Global toast state (simple event bus)
let listeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function notify(listeners: ((t: Toast[]) => void)[], newToasts: Toast[]) {
  listeners.forEach((l) => l(newToasts));
}

export function showToast(message: string, type: ToastType = 'info') {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, message, type }];
  notify(listeners, toasts);
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify(listeners, toasts);
  }, 4000);
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (t: Toast[]) => setItems([...t]);
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  }, []);

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />,
    error:   <AlertCircle  className="h-4 w-4 text-red-600 shrink-0" />,
    info:    <Info         className="h-4 w-4 text-blue-600 shrink-0" />,
  };

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg',
            'animate-in slide-in-from-bottom-2 fade-in-0 duration-200',
            colors[t.type]
          )}
        >
          {icons[t.type]}
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => {
              toasts = toasts.filter((x) => x.id !== t.id);
              notify(listeners, toasts);
            }}
            className="opacity-60 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
