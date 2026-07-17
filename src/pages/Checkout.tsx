import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import {
  CreditCard,
  Landmark,
  Truck,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  CalendarDays,
  Zap,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { cn } from '../lib/utils';
import { DeliveryMode, Sector } from '../types';
import {
  loadConfig,
  getActiveSectors,
  DEFAULT_CONFIG,
  computeDeliveryFee,
  EXPRESS_DELIVERY_SLOTS,
  deliverySummary,
} from '../lib/config';
import { createOrder } from '../lib/orders';
import {
  formatChileanMobileInput,
  isValidChileanMobile,
  normalizeChileanMobile,
} from '../lib/phone';
import { exceedsStock, loadStockRemaining } from '../lib/stock';

const PAYMENT_OPTIONS = [
  {
    id: 'MercadoPago' as const,
    label: 'MercadoPago',
    sub: 'Débito, Crédito, Prepago',
    Icon: CreditCard,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'Transferencia' as const,
    label: 'Transferencia',
    sub: 'Te enviamos los datos al confirmar',
    Icon: Landmark,
    color: 'bg-orange-100 text-orange-600',
  },
];

export const Checkout: React.FC = () => {
  const { total, items, clearCart } = useCart();
  const navigate = useNavigate();
  const submitted = useRef(false);

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [stockRemaining, setStockRemaining] = useState<Record<string, number>>({});
  const sectors = getActiveSectors(config.sectors);
  const payments = PAYMENT_OPTIONS.filter((m) =>
    m.id === 'MercadoPago'
      ? config.paymentMethods.mercadopago
      : config.paymentMethods.transferencia
  );

  const [sector, setSector] = useState<Sector>(sectors[0] ?? 'La Serena');
  const [paymentMethod, setPaymentMethod] = useState<'MercadoPago' | 'Transferencia'>(
    payments[0]?.id ?? 'MercadoPago'
  );
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('manana');
  const [deliverySlot, setDeliverySlot] = useState<string>(EXPRESS_DELIVERY_SLOTS[0]);

  useEffect(() => {
    loadConfig().then((cfg) => {
      setConfig(cfg);
      const active = getActiveSectors(cfg.sectors);
      if (active.length > 0) setSector((s) => (active.includes(s) ? s : active[0]));
      setPaymentMethod((m) => {
        const stillOk =
          m === 'MercadoPago'
            ? cfg.paymentMethods.mercadopago
            : cfg.paymentMethods.transferencia;
        if (stillOk) return m;
        return cfg.paymentMethods.mercadopago ? 'MercadoPago' : 'Transferencia';
      });
    });
    loadStockRemaining()
      .then(setStockRemaining)
      .catch((err) => console.error('Checkout stock:', err));
  }, []);

  const [formData, setFormData] = useState({ name: '', address: '', phone: '', notes: '' });
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  if (items.length === 0 && !submitted.current) return <Navigate to="/cart" replace />;

  const deliveryFee = computeDeliveryFee(total, deliveryMode, config);
  const finalTotal = total + deliveryFee;
  const stockIssues = items.filter((item) =>
    exceedsStock(item.id, item.quantity, stockRemaining)
  );
  const hasStockIssues = stockIssues.length > 0;
  const freeGap = Math.max(0, config.freeDeliveryThreshold - total);

  const upd = (key: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  const onPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatChileanMobileInput(e.target.value);
    setFormData((prev) => ({ ...prev, phone: formatted }));
    if (phoneError) setPhoneError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasStockIssues) return;

    if (!isValidChileanMobile(formData.phone)) {
      setPhoneError('Ingresa un celular chileno válido (+56 9 XXXX XXXX)');
      return;
    }

    setLoading(true);
    setSubmitError(false);

    try {
      const freshStock = await loadStockRemaining();
      setStockRemaining(freshStock);
      const stillBad = items.some((item) => exceedsStock(item.id, item.quantity, freshStock));
      if (stillBad) {
        setLoading(false);
        setSubmitError(true);
        return;
      }
    } catch {
      // Si falla el stock, igual intentamos crear el pedido.
    }

    const orderId = crypto.randomUUID();
    const order = {
      id: orderId,
      customerName: formData.name.trim(),
      customerAddress: formData.address.trim(),
      customerPhone: normalizeChileanMobile(formData.phone),
      customerSector: sector,
      notes: formData.notes.trim() || undefined,
      paymentMethod,
      items,
      total: finalTotal,
      createdAt: new Date().toISOString(),
      status: 'Pendiente' as const,
      deliveryMode,
      deliverySlot: deliveryMode === 'hoy' ? deliverySlot : undefined,
    };
    try {
      await createOrder(order);
    } catch (err) {
      console.error('Error al crear pedido:', err);
      setSubmitError(true);
      setLoading(false);
      return;
    }
    localStorage.setItem('fruto_last_order_id', orderId);
    submitted.current = true;
    clearCart();
    navigate('/confirmation', { state: { orderId } });
  };

  const submitDisabled = loading || hasStockIssues;

  const FeeLines = () => (
    <div className="space-y-2 border-t border-dashed border-stone-100 pt-4 text-xs">
      <div className="flex justify-between text-stone-500">
        <span>Subtotal</span>
        <span>${total.toLocaleString('es-CL')}</span>
      </div>
      <div className="flex justify-between text-stone-500">
        <span>Despacho {deliveryMode === 'hoy' ? '(hoy)' : '(mañana)'}</span>
        <span className={cn(deliveryFee === 0 && 'font-semibold text-brand-green')}>
          {deliveryFee === 0 ? '¡Gratis!' : `$${deliveryFee.toLocaleString('es-CL')}`}
        </span>
      </div>
      {deliveryMode === 'manana' && deliveryFee > 0 && (
        <p className="text-xs text-brand-orange">
          Agrega ${freeGap.toLocaleString('es-CL')} más para envío gratis mañana
        </p>
      )}
      {deliveryMode === 'hoy' && (
        <p className="text-xs text-stone-400">
          Entrega hoy siempre incluye despacho (cubre el courier urgente).
        </p>
      )}
      <div className="flex justify-between border-t border-stone-100 pt-3 font-bold text-stone-800">
        <span>Total</span>
        <span className="text-lg text-brand-green">${finalTotal.toLocaleString('es-CL')}</span>
      </div>
      <p className="text-xs text-stone-400">
        {deliverySummary(deliveryMode, deliverySlot, config)}
      </p>
    </div>
  );

  const SubmitButton = ({ className }: { className?: string }) => (
    <button
      type="submit"
      disabled={submitDisabled}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange py-4 font-bold text-white shadow-lg shadow-brand-orange/20 transition hover:bg-brand-orange/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
    >
      <CheckCircle2 size={17} />
      {loading
        ? 'Enviando pedido...'
        : hasStockIssues
          ? 'Hay productos sin stock'
          : submitError
            ? 'Reintentar pedido'
            : 'Confirmar pedido'}
    </button>
  );

  return (
    <div className="px-4 py-6 pb-28 md:px-8 md:py-10 md:pb-10">
      <div className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-stone-400">
        <Link to="/cart" className="transition hover:text-stone-600">
          Carrito
        </Link>
        <ChevronRight size={12} />
        <span className="text-stone-800">Datos de entrega</span>
        <ChevronRight size={12} />
        <span>Confirmación</span>
      </div>

      <h1 className="mb-8 text-2xl font-bold text-stone-800">¿A dónde enviamos tu pedido?</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {hasStockIssues && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="text-sm text-amber-800">
                <p className="font-bold">Algunos productos se agotaron</p>
                <p className="mt-0.5">
                  <Link to="/cart" className="font-semibold underline underline-offset-2">
                    Vuelve al carrito
                  </Link>{' '}
                  y ajusta las cantidades antes de confirmar.
                </p>
              </div>
            </div>
          )}

          {/* Cuándo lo quieres */}
          <section className="rounded-3xl border border-stone-200 bg-white p-6">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-800">
              <Truck size={16} className="text-brand-green" />
              ¿Cuándo lo quieres?
            </h2>
            <p className="mb-4 text-xs text-stone-500">
              Mañana: sin apuro (envío gratis desde $
              {config.freeDeliveryThreshold.toLocaleString('es-CL')}). Hoy: te lo coordinamos con
              despacho pago.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setDeliveryMode('manana')}
                className={cn(
                  'flex min-h-[5.5rem] flex-col rounded-2xl border p-4 text-left transition',
                  deliveryMode === 'manana'
                    ? 'border-brand-green bg-brand-green/5 ring-1 ring-brand-green'
                    : 'border-stone-200 hover:border-stone-300'
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="rounded-full bg-emerald-100 p-2 text-brand-green">
                    <CalendarDays size={16} />
                  </div>
                  <span className="text-sm font-bold text-stone-800">Mañana</span>
                  {deliveryMode === 'manana' && (
                    <CheckCircle2 size={15} className="ml-auto text-brand-green" />
                  )}
                </div>
                <p className="text-xs text-stone-500">Entrega planificada · {config.deliveryWindow}</p>
                <p className="mt-2 text-xs font-semibold text-brand-green">
                  {total >= config.freeDeliveryThreshold
                    ? 'Envío gratis en tu pedido'
                    : `Despacho $${config.deliveryFee.toLocaleString('es-CL')} · gratis +$${config.freeDeliveryThreshold.toLocaleString('es-CL')}`}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMode('hoy')}
                className={cn(
                  'flex min-h-[5.5rem] flex-col rounded-2xl border p-4 text-left transition',
                  deliveryMode === 'hoy'
                    ? 'border-brand-orange bg-brand-orange/5 ring-1 ring-brand-orange'
                    : 'border-stone-200 hover:border-stone-300'
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className="rounded-full bg-orange-100 p-2 text-brand-orange">
                    <Zap size={16} />
                  </div>
                  <span className="text-sm font-bold text-stone-800">Hoy</span>
                  {deliveryMode === 'hoy' && (
                    <CheckCircle2 size={15} className="ml-auto text-brand-orange" />
                  )}
                </div>
                <p className="text-xs text-stone-500">Urgente · elige tu ventana horaria</p>
                <p className="mt-2 text-xs font-semibold text-brand-orange">
                  Despacho ${config.deliveryFee.toLocaleString('es-CL')} (siempre)
                </p>
              </button>
            </div>

            {deliveryMode === 'hoy' && (
              <div className="mt-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500">
                  Horario preferido *
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXPRESS_DELIVERY_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setDeliverySlot(slot)}
                      className={cn(
                        'min-h-10 rounded-xl border px-3 py-2 text-xs font-bold transition',
                        deliverySlot === slot
                          ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                          : 'border-stone-200 text-stone-500 hover:border-stone-300'
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white p-6">
            <h2 className="mb-5 flex items-center gap-2 text-sm font-bold text-stone-800">
              <Truck size={16} className="text-brand-green" />
              Información de entrega
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-500">
                  Nombre completo *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Juan Pérez"
                  value={formData.name}
                  onChange={upd('name')}
                  className="input-field"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-500">
                  Teléfono *
                </label>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  placeholder="+56 9 1234 5678"
                  value={formData.phone}
                  onChange={onPhoneChange}
                  onBlur={() => {
                    if (formData.phone && !isValidChileanMobile(formData.phone)) {
                      setPhoneError('Ingresa un celular chileno válido (+56 9 XXXX XXXX)');
                    }
                  }}
                  className={cn(
                    'input-field',
                    phoneError && 'border-red-300 focus:border-red-400 focus:ring-red-100'
                  )}
                  autoComplete="tel"
                  aria-invalid={!!phoneError}
                  aria-describedby={phoneError ? 'phone-error' : undefined}
                />
                {phoneError ? (
                  <p id="phone-error" className="mt-1.5 text-xs font-medium text-red-600">
                    {phoneError}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-stone-400">
                    Celular chileno. Te contactamos si hace falta.
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-500">
                  Dirección exacta *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Calle, número, depto (si aplica)"
                  value={formData.address}
                  onChange={upd('address')}
                  className="input-field"
                  autoComplete="street-address"
                />
              </div>
              {sectors.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500">
                    Sector de entrega *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {sectors.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSector(s)}
                        className={cn(
                          'min-h-11 rounded-xl border py-2.5 text-xs font-bold transition',
                          sector === s
                            ? 'border-brand-green bg-brand-green/5 text-brand-green'
                            : 'border-stone-200 text-stone-500 hover:border-stone-300'
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-500">
                  Instrucciones de entrega (opcional)
                </label>
                <textarea
                  placeholder="Ej: Tocar el portón azul, llamar antes de llegar..."
                  value={formData.notes}
                  onChange={upd('notes')}
                  rows={2}
                  className="input-field resize-none"
                />
              </div>
            </div>
          </section>

          {payments.length > 0 && (
            <section className="rounded-3xl border border-stone-200 bg-white p-6">
              <h2 className="mb-5 flex items-center gap-2 text-sm font-bold text-stone-800">
                <CreditCard size={16} className="text-brand-green" />
                Método de pago
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {payments.map(({ id, label, sub, Icon, color }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPaymentMethod(id)}
                    className={cn(
                      'flex min-h-[4.5rem] items-center gap-3 rounded-2xl border p-4 text-left transition',
                      paymentMethod === id
                        ? 'border-brand-green bg-brand-green/5 ring-1 ring-brand-green'
                        : 'border-stone-200 hover:border-stone-300'
                    )}
                  >
                    <div className={cn('rounded-full p-2', color)}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-stone-800">{label}</p>
                      <p className="text-xs text-stone-400">{sub}</p>
                    </div>
                    {paymentMethod === id && (
                      <CheckCircle2 size={15} className="text-brand-green" />
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Summary — desktop */}
        <div className="hidden lg:block">
          <div className="sticky top-24 rounded-3xl border border-stone-200 bg-white p-5 shadow-xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-stone-400">
              Tu pedido
            </p>
            <div className="mb-4 space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
                  <span className="text-stone-600">
                    <span className="font-bold text-stone-800">{item.quantity}×</span> {item.name}
                  </span>
                  <span className="shrink-0 font-semibold text-stone-800">
                    ${(item.price * item.quantity).toLocaleString('es-CL')}
                  </span>
                </div>
              ))}
            </div>
            <FeeLines />
            {submitError && (
              <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
                <div className="text-xs text-red-700">
                  <p className="font-bold">No pudimos enviar tu pedido.</p>
                  <p className="mt-0.5">
                    Revisa tu conexión a internet e inténtalo de nuevo. Tu carrito sigue guardado.
                  </p>
                </div>
              </div>
            )}
            <SubmitButton className="mt-5" />
          </div>
        </div>

        {/* Summary — mobile */}
        <div className="lg:hidden">
          <div className="rounded-3xl border border-stone-200 bg-white p-5">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-stone-400">
              Tu pedido
            </p>
            <div className="mb-4 space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
                  <span className="text-stone-600">
                    <span className="font-bold text-stone-800">{item.quantity}×</span> {item.name}
                  </span>
                  <span className="shrink-0 font-semibold text-stone-800">
                    ${(item.price * item.quantity).toLocaleString('es-CL')}
                  </span>
                </div>
              ))}
            </div>
            <FeeLines />
            {submitError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
                <div className="text-xs text-red-700">
                  <p className="font-bold">No pudimos enviar tu pedido.</p>
                  <p className="mt-0.5">
                    Revisa tu conexión e inténtalo de nuevo. Tu carrito sigue guardado.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white/95 px-4 py-3 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Total · {deliveryMode === 'hoy' ? 'Hoy' : 'Mañana'}
              </p>
              <p className="truncate text-lg font-black text-brand-green">
                ${finalTotal.toLocaleString('es-CL')}
              </p>
            </div>
            <SubmitButton className="w-auto min-w-[10.5rem] shrink-0 px-5 py-3.5" />
          </div>
        </div>
      </form>
    </div>
  );
};
