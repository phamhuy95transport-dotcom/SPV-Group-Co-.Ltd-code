import React from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: ToastState;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast.show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
      <div
        className={`px-5 py-3.5 rounded-2xl shadow-2xl border-2 flex items-center gap-3.5 max-w-md transition-all ${
          toast.type === 'success'
            ? 'bg-slate-900 text-white border-emerald-500/50'
            : toast.type === 'error'
            ? 'bg-rose-950 text-white border-rose-500/50'
            : 'bg-indigo-950 text-white border-indigo-500/50'
        }`}
      >
        {toast.type === 'success' ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
        ) : (
          <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
        )}
        <div className="flex-grow text-xs sm:text-sm font-semibold">{toast.message}</div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
