import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type LoadErrorProps = {
  message?: string;
  onRetry: () => void;
};

export const LoadError: React.FC<LoadErrorProps> = ({
  message = 'No pudimos cargar los productos. Revisa tu conexión e inténtalo de nuevo.',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center rounded-3xl border border-stone-200 bg-white px-6 py-16 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
      <AlertTriangle size={28} />
    </div>
    <h3 className="text-lg font-bold text-stone-800">Algo salió mal</h3>
    <p className="mt-2 max-w-sm text-sm text-stone-500">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-green px-6 py-3 text-sm font-bold text-white transition hover:bg-[#245a42] active:scale-95"
    >
      <RefreshCw size={16} />
      Reintentar
    </button>
  </div>
);
