import React, { useEffect, useState } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { CheckCircle2, Package, Truck, Home, MessageCircle, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Order } from '../types';
import { cn } from '../lib/utils';
import { loadConfig } from '../lib/config';
import { loadOrderById } from '../lib/orders';

const STEPS: { key: Order['status']; label: string; Icon: React.ElementType; msg: string }[] = [
  { key: 'Pendiente',  label: 'Recibido',   Icon: CheckCircle2, msg: 'Tu pedido fue recibido. Lo estamos confirmando.' },
  { key: 'Preparando', label: 'Preparando', Icon: Package,      msg: 'Estamos seleccionando y empacando tus productos frescos.' },
  { key: 'En camino',  label: 'En camino',  Icon: Truck,        msg: '¡Ya viene en camino! Pronto estará en tu puerta.' },
  { key: 'Entregado',  label: 'Entregado',  Icon: Home,         msg: '¡Entregado! Gracias por preferir lo local. ¡Buen provecho!' },
];

export const Confirmation: React.FC = () => {
  const [config] = useState(loadConfig);
  const location = useLocation();
  const orderId: string | null =
    (location.state as { orderId?: string } | null)?.orderId ??
    localStorage.getItem('fruto_last_order_id');

  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;
    loadOrderById(orderId).then(setOrder);
    const id = setInterval(() => loadOrderById(orderId).then(setOrder), 10_000);
    return () => clearInterval(id);
  }, [orderId]);

  if (!orderId) return <Navigate to="/" replace />;

  const stepIdx = order ? Math.max(0, STEPS.findIndex((s) => s.key === order.status)) : 0;
  const currentStep = STEPS[stepIdx];

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4">

        {/* Hero */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14 }}
          className="flex flex-col items-center text-center"
        >
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-green text-white shadow-xl shadow-brand-green/25">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-2xl font-bold text-stone-800">¡Pedido confirmado!</h1>
          <p className="mt-1 text-sm text-stone-500">
            Pedido <span className="font-bold text-stone-700">#{orderId}</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          {/* Status card */}
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-brand-green/10 bg-brand-green/5 px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-green">Estado actual</p>
              <p className="mt-0.5 text-sm font-semibold text-stone-800">{currentStep.msg}</p>
            </div>

            {/* Timeline */}
            <div className="px-5 py-5">
              <div className="flex items-start">
                {STEPS.map((step, i) => {
                  const done = i <= stepIdx;
                  const active = i === stepIdx;
                  const StepIcon = step.Icon;
                  return (
                    <React.Fragment key={step.key}>
                      <div className="flex flex-col items-center gap-1.5">
                        <div className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all',
                          done ? 'border-brand-green bg-brand-green text-white' : 'border-stone-200 bg-stone-50 text-stone-300',
                          active && 'ring-4 ring-brand-green/20'
                        )}>
                          <StepIcon size={16} />
                        </div>
                        <span className={cn('text-center text-[9px] font-bold leading-tight', done ? 'text-brand-green' : 'text-stone-300')}>
                          {step.label}
                        </span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={cn('mb-5 mt-[18px] h-0.5 flex-1 transition-all', i < stepIdx ? 'bg-brand-green' : 'bg-stone-100')} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Order summary */}
          {order ? (
            <div className="rounded-3xl border border-stone-200 bg-white p-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">Detalle del pedido</p>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-stone-600"><span className="font-bold text-stone-800">{item.quantity}×</span> {item.name}</span>
                    <span className="font-semibold text-stone-800">${(item.price * item.quantity).toLocaleString('es-CL')}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-dashed border-stone-100 pt-3 text-sm font-bold">
                <span className="text-stone-800">Total</span>
                <span className="text-brand-green">${order.total.toLocaleString('es-CL')}</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-stone-400">
                <Clock size={11} />
                Entrega en {order.customerAddress}, {order.customerSector} · Hoy {config.deliveryWindow}
              </div>
              {order.notes && <p className="mt-1 text-[10px] italic text-stone-400">Nota: {order.notes}</p>}
            </div>
          ) : (
            <div className="rounded-3xl border border-stone-100 bg-stone-50 p-5 text-center text-sm text-stone-400">
              Cargando detalles del pedido...
            </div>
          )}

          {/* Transfer info */}
          {order?.paymentMethod === 'Transferencia' && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-bold text-amber-800">Datos para transferencia</p>
              <div className="mt-2 space-y-1 text-xs text-amber-700">
                <p>{config.bankName} · RUT: {config.bankRut}</p>
                <p>Nombre: {config.bankAccountName}</p>
                <p className="font-bold">Monto: ${order.total.toLocaleString('es-CL')}</p>
              </div>
              <p className="mt-2 text-[10px] text-amber-600">Envía el comprobante por WhatsApp para confirmar tu pedido.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl border border-[#25D366] bg-white py-4 font-bold text-[#25D366] transition hover:bg-[#25D366]/5 active:scale-95">
              <MessageCircle size={18} />
              Consultar por WhatsApp
            </a>
            <Link to="/"
              className="flex items-center justify-center gap-2 rounded-2xl bg-stone-800 py-4 font-bold text-white transition hover:bg-stone-900 active:scale-95">
              Volver al inicio
            </Link>
          </div>

          <p className="text-center text-[10px] text-stone-300">Esta página se actualiza automáticamente cada 10 segundos.</p>
        </motion.div>
      </div>
    </div>
  );
};
