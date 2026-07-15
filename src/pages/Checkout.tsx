import React, { useState, useRef } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { CreditCard, Landmark, Truck, CheckCircle2, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { cn } from '../lib/utils';
import { Sector } from '../types';
import { loadConfig, getActiveSectors } from '../lib/config';
import { createOrder } from '../lib/orders';

const PAYMENT_OPTIONS = [
  { id: 'MercadoPago' as const, label: 'MercadoPago', sub: 'Débito, Crédito, Prepago', Icon: CreditCard, color: 'bg-blue-100 text-blue-600' },
  { id: 'Transferencia' as const, label: 'Transferencia', sub: 'Te enviamos los datos al confirmar', Icon: Landmark, color: 'bg-orange-100 text-orange-600' },
];

export const Checkout: React.FC = () => {
  const { total, items, clearCart } = useCart();
  const navigate = useNavigate();
  const submitted = useRef(false);

  const [config] = useState(loadConfig);
  const sectors = getActiveSectors(config.sectors);
  const payments = PAYMENT_OPTIONS.filter((m) =>
    m.id === 'MercadoPago' ? config.paymentMethods.mercadopago : config.paymentMethods.transferencia
  );

  const [sector, setSector] = useState<Sector>(sectors[0] ?? 'La Serena');
  const [paymentMethod, setPaymentMethod] = useState<'MercadoPago' | 'Transferencia'>(
    payments[0]?.id ?? 'MercadoPago'
  );
  const [formData, setFormData] = useState({ name: '', address: '', phone: '', notes: '' });
  const [loading, setLoading] = useState(false);

  if (items.length === 0 && !submitted.current) return <Navigate to="/cart" replace />;

  const deliveryFee = total >= config.freeDeliveryThreshold ? 0 : config.deliveryFee;
  const finalTotal = total + deliveryFee;
  const upd = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const orderId = Math.random().toString(36).substring(2, 9).toUpperCase();
    const order = {
      id: orderId,
      customerName: formData.name.trim(),
      customerAddress: formData.address.trim(),
      customerPhone: formData.phone.trim(),
      customerSector: sector,
      notes: formData.notes.trim() || undefined,
      paymentMethod,
      items,
      total: finalTotal,
      createdAt: new Date().toISOString(),
      status: 'Pendiente' as const,
    };
    try {
      await createOrder(order);
    } catch (err) {
      console.error('Error al crear pedido:', err);
    }
    localStorage.setItem('fruto_last_order_id', orderId);
    submitted.current = true;
    clearCart();
    navigate('/confirmation', { state: { orderId } });
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-10">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-stone-400">
        <Link to="/cart" className="hover:text-stone-600 transition">Carrito</Link>
        <ChevronRight size={12} />
        <span className="text-stone-800">Datos de entrega</span>
        <ChevronRight size={12} />
        <span>Confirmación</span>
      </div>

      <h1 className="mb-8 text-2xl font-bold text-stone-800">¿A dónde enviamos tu pedido?</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">

          {/* Delivery */}
          <section className="rounded-3xl border border-stone-200 bg-white p-6">
            <h2 className="mb-5 flex items-center gap-2 text-sm font-bold text-stone-800">
              <Truck size={16} className="text-brand-green" />
              Información de entrega
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Nombre completo *
                </label>
                <input required type="text" placeholder="Juan Pérez" value={formData.name} onChange={upd('name')} className="input-field" />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Teléfono *
                </label>
                <input required type="tel" placeholder="+56 9 1234 5678" value={formData.phone} onChange={upd('phone')} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Dirección exacta *
                </label>
                <input required type="text" placeholder="Calle, número, depto (si aplica)" value={formData.address} onChange={upd('address')} className="input-field" />
              </div>
              {sectors.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Sector de entrega *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {sectors.map((s) => (
                      <button key={s} type="button" onClick={() => setSector(s)}
                        className={cn('rounded-xl border py-2.5 text-xs font-bold transition',
                          sector === s ? 'border-brand-green bg-brand-green/5 text-brand-green' : 'border-stone-200 text-stone-500 hover:border-stone-300'
                        )}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Instrucciones de entrega (opcional)
                </label>
                <textarea placeholder="Ej: Tocar el portón azul, llamar antes de llegar..." value={formData.notes} onChange={upd('notes')} rows={2} className="input-field resize-none" />
              </div>
            </div>
          </section>

          {/* Payment */}
          {payments.length > 0 && (
            <section className="rounded-3xl border border-stone-200 bg-white p-6">
              <h2 className="mb-5 flex items-center gap-2 text-sm font-bold text-stone-800">
                <CreditCard size={16} className="text-brand-green" />
                Método de pago
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {payments.map(({ id, label, sub, Icon, color }) => (
                  <button key={id} type="button" onClick={() => setPaymentMethod(id)}
                    className={cn('flex items-center gap-3 rounded-2xl border p-4 text-left transition',
                      paymentMethod === id ? 'border-brand-green bg-brand-green/5 ring-1 ring-brand-green' : 'border-stone-200 hover:border-stone-300'
                    )}>
                    <div className={cn('rounded-full p-2', color)}><Icon size={16} /></div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-stone-800">{label}</p>
                      <p className="text-[10px] text-stone-400">{sub}</p>
                    </div>
                    {paymentMethod === id && <CheckCircle2 size={15} className="text-brand-green" />}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Summary */}
        <div>
          <div className="sticky top-24 rounded-3xl border border-stone-200 bg-white p-5 shadow-xl">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">Tu pedido</p>
            <div className="mb-4 space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
                  <span className="text-stone-600"><span className="font-bold text-stone-800">{item.quantity}×</span> {item.name}</span>
                  <span className="shrink-0 font-semibold text-stone-800">${(item.price * item.quantity).toLocaleString('es-CL')}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-dashed border-stone-100 pt-4 text-xs">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span><span>${total.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Despacho</span>
                <span className={cn(deliveryFee === 0 && 'font-semibold text-brand-green')}>
                  {deliveryFee === 0 ? '¡Gratis!' : `$${deliveryFee.toLocaleString('es-CL')}`}
                </span>
              </div>
              {deliveryFee > 0 && (
                <p className="text-[10px] text-brand-orange">
                  Agrega ${(config.freeDeliveryThreshold - total).toLocaleString('es-CL')} más para envío gratis
                </p>
              )}
              <div className="flex justify-between border-t border-stone-100 pt-3 font-bold text-stone-800">
                <span>Total</span>
                <span className="text-lg text-brand-green">${finalTotal.toLocaleString('es-CL')}</span>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange py-4 font-bold text-white shadow-lg shadow-brand-orange/20 transition hover:bg-brand-orange/90 active:scale-95 disabled:opacity-60">
              <CheckCircle2 size={17} />
              {loading ? 'Enviando pedido...' : 'Confirmar pedido'}
            </button>
            <p className="mt-2.5 text-center text-[10px] text-stone-400">
              Entrega hoy entre {config.deliveryWindow}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
