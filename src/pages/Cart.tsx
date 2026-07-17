import React, { useEffect, useState } from 'react';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBasket, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { loadConfig, DEFAULT_CONFIG, computeDeliveryFee } from '../lib/config';
import { exceedsStock, loadStockRemaining } from '../lib/stock';

export const Cart: React.FC = () => {
  const { items, updateQuantity, removeFromCart, total } = useCart();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [stockRemaining, setStockRemaining] = useState<Record<string, number>>({});

  useEffect(() => {
    loadConfig().then(setConfig);
    loadStockRemaining()
      .then(setStockRemaining)
      .catch((err) => console.error('Cart stock:', err));
  }, []);

  // En carrito mostramos el escenario "mañana" (el default): gratis sobre umbral.
  const mananaFee = computeDeliveryFee(total, 'manana', config);
  const hoyFee = computeDeliveryFee(total, 'hoy', config);
  const deliveryLimit = config.freeDeliveryThreshold;
  const deliveryRemaining = Math.max(0, deliveryLimit - total);
  const deliveryProgress = Math.min(100, (total / deliveryLimit) * 100);
  const previewTotalManana = total + mananaFee;

  const stockIssues = items.filter((item) =>
    exceedsStock(item.id, item.quantity, stockRemaining)
  );
  const canCheckout = stockIssues.length === 0;

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 rounded-full bg-stone-100 p-8 text-stone-300">
          <ShoppingBasket size={64} />
        </div>
        <h2 className="text-2xl font-bold text-stone-800">Tu carrito está vacío</h2>
        <p className="mt-2 max-w-xs text-stone-500">
          Parece que aún no has agregado productos frescos a tu cesta.
        </p>
        <Link
          to="/catalog"
          className="mt-8 rounded-2xl bg-[#2D6A4F] px-8 py-4 font-bold text-white transition-all hover:scale-105 active:scale-95"
        >
          Explorar catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 md:px-8">
      <h1 className="mb-8 text-3xl font-bold text-stone-800">Tu Pedido</h1>

      {stockIssues.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="font-bold">Algunos productos no tienen stock suficiente</p>
            <p className="mt-0.5 text-amber-700">
              Ajusta las cantidades o quita los productos agotados para continuar.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map((item) => {
              const remaining = stockRemaining[item.id];
              const overStock = exceedsStock(item.id, item.quantity, stockRemaining);
              const atMax = remaining !== undefined && item.quantity >= remaining;
              const noStock = remaining !== undefined && remaining <= 0;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    'flex items-center gap-4 rounded-2xl border bg-white p-4',
                    overStock ? 'border-amber-300' : 'border-stone-200'
                  )}
                >
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl text-stone-300">
                        🌿
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-stone-800">{item.name}</h3>
                        <p className="text-sm text-stone-500">
                          ${item.price.toLocaleString('es-CL')} / {item.unit}
                        </p>
                        {overStock && (
                          <p className="mt-1 text-xs font-semibold text-amber-600">
                            {noStock
                              ? 'Sin stock — quítalo del carrito'
                              : `Solo quedan ${remaining} ${item.unit}`}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-300 transition hover:bg-red-50 hover:text-red-500"
                        aria-label={`Quitar ${item.name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1 overflow-hidden rounded-xl border border-stone-100 bg-stone-50 p-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-[#2D6A4F] hover:bg-white"
                          aria-label="Quitar uno"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={atMax || noStock}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg',
                            atMax || noStock
                              ? 'cursor-not-allowed text-stone-300'
                              : 'text-[#2D6A4F] hover:bg-white'
                          )}
                          aria-label="Agregar uno"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <p className="font-bold text-[#2D6A4F]">
                        ${(item.price * item.quantity).toLocaleString('es-CL')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-6">
          <div className="sticky top-24 rounded-[2.5rem] border border-stone-200 bg-white p-8 shadow-2xl">
            <h2 className="mb-6 text-2xl font-bold text-brand-green">Tu Pedido</h2>

            <div className="mb-6 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <span className="text-stone-500">
                    {item.quantity}
                    {item.unit} {item.name}
                  </span>
                  <span className="font-bold text-stone-800">
                    ${(item.price * item.quantity).toLocaleString('es-CL')}
                  </span>
                </div>
              ))}
            </div>

            <div className="mb-6 border-t border-dashed border-stone-200 pt-5">
              <div className="mb-2 flex justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-stone-400">Subtotal</span>
                <span className="font-bold text-stone-500">${total.toLocaleString('es-CL')}</span>
              </div>

              {/* Barra hacia envío gratis (solo aplica a entrega mañana) */}
              <p className="mb-2 text-xs font-semibold text-stone-600">
                Envío gratis mañana desde ${deliveryLimit.toLocaleString('es-CL')}
              </p>
              <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${deliveryProgress}%` }}
                  className="h-full bg-brand-orange"
                />
              </div>
              <p className="mb-4 text-center text-xs font-medium text-brand-orange">
                {deliveryRemaining > 0
                  ? `Te faltan $${deliveryRemaining.toLocaleString('es-CL')} para envío gratis mañana`
                  : '¡Ya tienes envío gratis para mañana!'}
              </p>

              <div className="space-y-2 rounded-2xl bg-stone-50 p-3 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Si eliges <strong>mañana</strong></span>
                  <span className={cn(mananaFee === 0 && 'font-semibold text-brand-green')}>
                    {mananaFee === 0 ? 'Envío gratis' : `+$${mananaFee.toLocaleString('es-CL')}`}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Si eliges <strong>hoy</strong></span>
                  <span className="font-semibold text-brand-orange">
                    +${hoyFee.toLocaleString('es-CL')} despacho
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-2 flex items-end justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-stone-400">
                Total (mañana)
              </span>
              <span className="text-3xl font-black text-brand-green">
                ${previewTotalManana.toLocaleString('es-CL')}
              </span>
            </div>
            <p className="mb-6 text-xs text-stone-400">
              En el siguiente paso eliges mañana o hoy. El total final se ajusta ahí.
            </p>

            {canCheckout ? (
              <Link
                to="/checkout"
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange py-5 font-bold text-white shadow-lg shadow-brand-orange/20 transition-all hover:bg-brand-orange/90 active:scale-95"
              >
                Continuar
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-stone-300 py-5 font-bold text-white"
              >
                Ajusta el stock para continuar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
