import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams, Link, Navigate } from 'react-router-dom';
import {
  CheckCircle2,
  Package,
  Truck,
  Home,
  MessageCircle,
  Clock,
  CreditCard,
  XCircle,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { Session } from '@supabase/supabase-js';
import { Order } from '../types';
import { cn } from '../lib/utils';
import { loadConfig, DEFAULT_CONFIG, deliverySummary } from '../lib/config';
import { loadOrderById, shortOrderId } from '../lib/orders';
import { getSession, signUp } from '../lib/auth';
import { claimOrder, saveMyProfile } from '../lib/profile';
import { usePageMeta } from '../lib/seo';

const STEPS: { key: Order['status']; label: string; Icon: React.ElementType; msg: string }[] = [
  {
    key: 'Pendiente',
    label: 'Recibido',
    Icon: CheckCircle2,
    msg: 'Tu pedido fue recibido. Lo estamos confirmando.',
  },
  {
    key: 'Preparando',
    label: 'Preparando',
    Icon: Package,
    msg: 'Estamos seleccionando y empacando tus productos frescos.',
  },
  {
    key: 'En camino',
    label: 'En camino',
    Icon: Truck,
    msg: '¡Ya viene en camino! Pronto estará en tu puerta.',
  },
  {
    key: 'Entregado',
    label: 'Entregado',
    Icon: Home,
    msg: '¡Entregado! Gracias por tu compra. ¡Buen provecho!',
  },
];

export const Confirmation: React.FC = () => {
  usePageMeta('Seguimiento de tu pedido | Fruto.app');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  useEffect(() => {
    loadConfig().then(setConfig);
  }, []);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Mercado Pago vuelve a esta página con "?order=<id>" (sin state de router,
  // porque es una navegación externa, no un Link interno).
  const orderId: string | null =
    (location.state as { orderId?: string } | null)?.orderId ??
    searchParams.get('order') ??
    localStorage.getItem('fruto_last_order_id');

  const [order, setOrder] = useState<Order | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Si el cliente ya tiene cuenta, este pedido queda vinculado solo
  // (claim_order ignora pedidos que ya tienen dueño).
  useEffect(() => {
    getSession().then((s) => {
      setSession(s);
      setSessionChecked(true);
      if (s && orderId) claimOrder(orderId);
    });
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let delivered = false;

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const refresh = async () => {
      const next = await loadOrderById(orderId);
      if (cancelled) return;
      setOrder(next);
      if (next?.status === 'Entregado') {
        delivered = true;
        stopPolling();
      }
    };

    const startPolling = () => {
      if (intervalId || delivered) return;
      intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') void refresh();
      }, 10_000);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
        startPolling();
      } else {
        stopPolling();
      }
    };

    void refresh();
    startPolling();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [orderId]);

  if (!orderId) return <Navigate to="/" replace />;

  const stepIdx = order ? Math.max(0, STEPS.findIndex((s) => s.key === order.status)) : 0;
  const currentStep = STEPS[stepIdx];
  const isDelivered = order?.status === 'Entregado';
  // Transferencia sin verificar: el pedido NO está confirmado todavía —
  // decirlo honestamente y guiar al cliente a completar el pago.
  const waitingTransfer =
    order?.paymentMethod === 'Transferencia' && order.paymentStatus === 'pendiente_transferencia';

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14 }}
          className="flex flex-col items-center text-center"
        >
          <div
            className={cn(
              'mb-4 flex h-20 w-20 items-center justify-center rounded-full text-white shadow-xl',
              waitingTransfer
                ? 'bg-amber-500 shadow-amber-500/25'
                : 'bg-brand-green shadow-brand-green/25'
            )}
          >
            {waitingTransfer ? <Clock size={40} /> : <CheckCircle2 size={40} />}
          </div>
          <h1 className="text-2xl font-bold text-stone-800">
            {waitingTransfer ? '¡Pedido recibido!' : '¡Pedido confirmado!'}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Pedido <span className="font-bold text-stone-700">#{shortOrderId(orderId)}</span>
          </p>
          {waitingTransfer && (
            <p className="mt-1.5 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-700">
              Se confirmará cuando verifiquemos tu transferencia
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-brand-green/10 bg-brand-green/5 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-green">
                Estado actual
              </p>
              <p className="mt-0.5 text-sm font-semibold text-stone-800">
                {waitingTransfer
                  ? 'Recibimos tu pedido. Falta verificar tu transferencia para confirmarlo.'
                  : currentStep.msg}
              </p>
            </div>

            <div className="px-5 py-5">
              <div className="flex items-start">
                {STEPS.map((step, i) => {
                  const done = i <= stepIdx;
                  const active = i === stepIdx;
                  const StepIcon = step.Icon;
                  return (
                    <React.Fragment key={step.key}>
                      <div className="flex flex-col items-center gap-1.5">
                        <div
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all',
                            done
                              ? 'border-brand-green bg-brand-green text-white'
                              : 'border-stone-200 bg-stone-50 text-stone-300',
                            active && 'ring-4 ring-brand-green/20'
                          )}
                        >
                          <StepIcon size={16} />
                        </div>
                        <span
                          className={cn(
                            'text-center text-[10px] font-bold leading-tight',
                            done ? 'text-brand-green' : 'text-stone-300'
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div
                          className={cn(
                            'mb-5 mt-[18px] h-0.5 flex-1 transition-all',
                            i < stepIdx ? 'bg-brand-green' : 'bg-stone-100'
                          )}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {order ? (
            <div className="rounded-3xl border border-stone-200 bg-white p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-400">
                Detalle del pedido
              </p>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-stone-600">
                      <span className="font-bold text-stone-800">{item.quantity}×</span>{' '}
                      {item.name}
                    </span>
                    <span className="font-semibold text-stone-800">
                      ${(item.price * item.quantity).toLocaleString('es-CL')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-dashed border-stone-100 pt-3 text-sm font-bold">
                <span className="text-stone-800">Total</span>
                <span className="text-brand-green">
                  ${order.total.toLocaleString('es-CL')}
                </span>
              </div>
              <div className="mt-3 flex items-start gap-1.5 text-xs text-stone-400">
                <Clock size={12} className="mt-0.5 shrink-0" />
                <span>
                  {order.customerAddress}, {order.customerSector}
                  <br />
                  <span className="font-semibold text-stone-600">
                    {deliverySummary(order.deliveryMode, order.deliverySlot, config)}
                  </span>
                </span>
              </div>
              {order.notes && (
                <p className="mt-1 text-xs italic text-stone-400">Nota: {order.notes}</p>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-stone-100 bg-stone-50 p-5 text-center text-sm text-stone-400">
              Cargando detalles del pedido...
            </div>
          )}

          {order?.paymentMethod === 'MercadoPago' && (
            <div
              className={cn(
                'rounded-3xl border p-5',
                order.paymentStatus === 'pagado'
                  ? 'border-brand-green/20 bg-brand-green/5'
                  : order.paymentStatus === 'rechazado'
                    ? 'border-red-200 bg-red-50'
                    : 'border-amber-200 bg-amber-50'
              )}
            >
              <div className="flex items-center gap-2">
                {order.paymentStatus === 'pagado' ? (
                  <CheckCircle2 size={16} className="shrink-0 text-brand-green" />
                ) : order.paymentStatus === 'rechazado' ? (
                  <XCircle size={16} className="shrink-0 text-red-500" />
                ) : (
                  <CreditCard size={16} className="shrink-0 text-amber-600" />
                )}
                <p
                  className={cn(
                    'text-sm font-bold',
                    order.paymentStatus === 'pagado'
                      ? 'text-brand-green'
                      : order.paymentStatus === 'rechazado'
                        ? 'text-red-700'
                        : 'text-amber-800'
                  )}
                >
                  {order.paymentStatus === 'pagado'
                    ? 'Pago aprobado'
                    : order.paymentStatus === 'rechazado'
                      ? 'Pago rechazado'
                      : 'Confirmando tu pago...'}
                </p>
              </div>
              <p className="mt-1.5 text-xs text-stone-500">
                {order.paymentStatus === 'pagado'
                  ? 'Ya recibimos tu pago, gracias.'
                  : order.paymentStatus === 'rechazado'
                    ? 'Mercado Pago rechazó el pago. Escríbenos por WhatsApp para intentar de nuevo.'
                    : 'Esto se actualiza solo apenas Mercado Pago nos confirme el pago (unos segundos).'}
              </p>
            </div>
          )}

          {order?.paymentMethod === 'Transferencia' &&
            (order.paymentStatus === 'pagado' ? (
              <div className="rounded-3xl border border-brand-green/20 bg-brand-green/5 p-5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-brand-green" />
                  <p className="text-sm font-bold text-brand-green">Transferencia verificada</p>
                </div>
                <p className="mt-1.5 text-xs text-stone-500">
                  Ya recibimos tu pago. ¡Gracias! Tu pedido está confirmado.
                </p>
              </div>
            ) : (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-bold text-amber-800">
                  Falta un paso: realiza tu transferencia
                </p>
                {config.bankName && config.bankRut ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">
                        1
                      </span>
                      <div className="min-w-0 flex-1 rounded-2xl bg-white/70 p-3 text-sm text-stone-700">
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                          Transfiere ${order.total.toLocaleString('es-CL')} a:
                        </p>
                        <p className="mt-1.5">{config.bankName}</p>
                        <p>RUT: {config.bankRut}</p>
                        <p>Nombre: {config.bankAccountName}</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800">
                        2
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-amber-800">
                          Envíanos el comprobante y confirmamos tu pedido al tiro.
                        </p>
                        {config.whatsapp && (
                          <a
                            href={`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(
                              `¡Hola! Soy ${order.customerName}. Te envío el comprobante de mi pedido #${shortOrderId(order.id)} por $${order.total.toLocaleString('es-CL')}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3 text-sm font-bold text-white transition hover:bg-[#1fb959] active:scale-95"
                          >
                            <MessageCircle size={16} />
                            Enviar comprobante por WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-amber-600">
                      Esta página se actualizará sola cuando verifiquemos tu pago.
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-amber-700">
                    Te enviaremos los datos de transferencia por WhatsApp para confirmar tu pedido.
                  </p>
                )}
              </div>
            ))}

          {/* Después de comprar: guardar el pedido en una cuenta (opcional) */}
          {sessionChecked && order && (
            session ? (
              <Link
                to="/cuenta"
                className="flex items-center justify-between rounded-3xl border border-brand-green/20 bg-brand-green/5 p-5 transition hover:border-brand-green/40"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={18} className="shrink-0 text-brand-green" />
                  <div>
                    <p className="text-sm font-bold text-stone-800">
                      Este pedido quedó guardado en tu cuenta
                    </p>
                    <p className="text-xs text-stone-500">Ver mis pedidos e historial</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-brand-green">Mi cuenta →</span>
              </Link>
            ) : (
              <AccountInvite order={order} orderId={orderId} />
            )
          )}

          <div className="flex flex-col gap-3">
            {config.whatsapp && !waitingTransfer && (
              <a
                href={`https://wa.me/${config.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#25D366] bg-white py-4 font-bold text-[#25D366] transition hover:bg-[#25D366]/5 active:scale-95"
              >
                <MessageCircle size={18} />
                Consultar por WhatsApp
              </a>
            )}
            <Link
              to="/"
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-stone-800 py-4 font-bold text-white transition hover:bg-stone-900 active:scale-95"
            >
              Volver al inicio
            </Link>
          </div>

          <p className="text-center text-xs text-stone-300">
            {isDelivered
              ? 'Tu pedido ya fue entregado.'
              : 'Esta página se actualiza sola mientras el pedido está en camino.'}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Invitación post-compra: crear cuenta reutilizando los datos del pedido.
// El momento ideal (ya compró, cero fricción): solo pide correo y contraseña.
// ---------------------------------------------------------------------------

const AccountInvite: React.FC<{ order: Order; orderId: string }> = ({ order, orderId }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'creating' | 'done' | 'confirmEmail'>('idle');
  const [error, setError] = useState('');

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('creating');
    try {
      const { needsEmailConfirm } = await signUp(email.trim(), password);
      if (needsEmailConfirm) {
        setStatus('confirmEmail');
        return;
      }
      // Vincular el pedido recién hecho y guardar los datos de entrega
      // que YA escribió en el checkout — no se le pide nada de nuevo.
      await claimOrder(orderId);
      await saveMyProfile({
        name: order.customerName,
        phone: order.customerPhone ?? '',
        address: order.customerAddress,
        sector: order.customerSector,
      }).catch(() => {});
      setStatus('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(
        msg.includes('already registered')
          ? 'Ese correo ya tiene una cuenta. Inicia sesión en "Mi cuenta".'
          : 'No pudimos crear la cuenta. Inténtalo de nuevo.'
      );
      setStatus('idle');
    }
  };

  if (status === 'done') {
    return (
      <div className="rounded-3xl border border-brand-green/20 bg-brand-green/5 p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="shrink-0 text-brand-green" />
          <p className="text-sm font-bold text-brand-green">¡Cuenta creada!</p>
        </div>
        <p className="mt-1.5 text-xs text-stone-500">
          Tu pedido y tus datos de entrega quedaron guardados. La próxima compra será mucho más rápida.
        </p>
        <Link
          to="/cuenta"
          className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand-green hover:underline"
        >
          Ir a mi cuenta →
        </Link>
      </div>
    );
  }

  if (status === 'confirmEmail') {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-bold text-amber-800">Revisa tu correo</p>
        <p className="mt-1.5 text-xs text-amber-700">
          Te enviamos un enlace para confirmar tu cuenta. Al confirmarla, entra a "Mi cuenta" para
          ver tus pedidos.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-brand-orange/20 bg-brand-orange/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
          <Sparkles size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-stone-800">
            ¿Quieres que tu próxima compra sea más rápida?
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            Crea tu cuenta con los datos de este pedido: seguimiento, historial y repetir compras
            con un clic. Solo elige una contraseña.
          </p>
        </div>
      </div>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-2xl bg-brand-orange py-3 text-sm font-bold text-white transition hover:bg-brand-orange/90 active:scale-95"
        >
          Crear mi cuenta
        </button>
      ) : (
        <form onSubmit={create} className="mt-4 space-y-3">
          <input
            required
            type="email"
            autoComplete="email"
            placeholder="Tu correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
          <input
            required
            type="password"
            minLength={6}
            autoComplete="new-password"
            placeholder="Elige una contraseña (mín. 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={status === 'creating'}
            className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-brand-orange py-3 text-sm font-bold text-white transition hover:bg-brand-orange/90 active:scale-95 disabled:opacity-60"
          >
            {status === 'creating' ? 'Creando tu cuenta...' : 'Guardar mi pedido en mi cuenta'}
          </button>
        </form>
      )}
    </div>
  );
};
