import React, { useEffect, useState } from 'react';
import { X, Share, SquarePlus, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LogoMark } from './Logo';

/**
 * Invitación a instalar la PWA. Aparece solo en la Home (nunca
 * interrumpe una compra), con una pausa, y se puede descartar
 * (no vuelve a molestar por 30 días).
 * - Android/Chrome: instalación real con un toque (beforeinstallprompt).
 * - iPhone/iPad: Safari no tiene ese botón, se muestran los 2 pasos.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'fruto_pwa_dismissed';
const DISMISS_MS = 30 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function recentlyDismissed(): boolean {
  const t = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
  return Date.now() - t < DISMISS_MS;
}

export const InstallPrompt: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    const timer = setTimeout(() => setReady(true), 2500);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setReady(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 1000 * DISMISS_MS));
    } else {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setReady(false);
  };

  const show = ready && (deferred !== null || isIOS());

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="fixed inset-x-4 bottom-20 z-40 md:inset-x-auto md:bottom-6 md:right-6 md:w-96"
        >
          <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-2xl shadow-stone-900/10">
            <div className="flex items-start gap-3">
              <LogoMark className="h-12 w-12 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-stone-800">Lleva Fruto.app contigo</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  Instálala en tu teléfono y pide en dos toques, como cualquier app.
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Cerrar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-300 transition hover:bg-stone-100 hover:text-stone-500"
              >
                <X size={16} />
              </button>
            </div>

            {deferred ? (
              <button
                type="button"
                onClick={install}
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-brand-green py-3 text-sm font-bold text-white transition hover:bg-[#245a42] active:scale-95"
              >
                <Download size={16} />
                Instalar la app
              </button>
            ) : (
              <div className="mt-3 space-y-2 rounded-2xl bg-stone-50 p-3">
                <p className="flex items-center gap-2 text-xs text-stone-600">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-[10px] font-bold text-brand-green">
                    1
                  </span>
                  Toca <Share size={14} className="inline shrink-0 text-brand-green" />
                  <span className="font-semibold">Compartir</span> abajo en Safari
                </p>
                <p className="flex items-center gap-2 text-xs text-stone-600">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-[10px] font-bold text-brand-green">
                    2
                  </span>
                  Elige <SquarePlus size={14} className="inline shrink-0 text-brand-green" />
                  <span className="font-semibold">Agregar a pantalla de inicio</span>
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
