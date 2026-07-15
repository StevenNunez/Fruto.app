import React from 'react';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBasket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const Cart: React.FC = () => {
  const { items, updateQuantity, removeFromCart, total } = useCart();
  const deliveryLimit = 10000;
  const deliveryRemaining = Math.max(0, deliveryLimit - total);
  const deliveryProgress = Math.min(100, (total / deliveryLimit) * 100);

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

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        {/* Items List */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4"
              >
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100">
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                </div>
                
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-stone-800">{item.name}</h3>
                      <p className="text-sm text-stone-500">${item.price.toLocaleString()} / {item.unit}</p>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-stone-300 hover:text-red-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 overflow-hidden rounded-lg border border-stone-100 bg-stone-50 p-1">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 text-[#2D6A4F] hover:bg-white rounded"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 text-[#2D6A4F] hover:bg-white rounded"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <p className="font-bold text-[#2D6A4F]">
                      ${(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary Card */}
        <div className="flex flex-col gap-6">
          <div className="sticky top-24 rounded-[2.5rem] border border-stone-200 bg-white p-8 shadow-2xl">
            <h2 className="mb-8 text-2xl font-bold text-brand-green">Tu Pedido</h2>
            
            <div className="mb-10 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-xs">
                  <span className="text-stone-500">{item.quantity}{item.unit} {item.name}</span>
                  <span className="font-bold text-stone-800">${(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              
              <div className="pt-6 border-t border-dashed border-stone-200">
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Subtotal</span>
                  <span className="text-[10px] text-stone-500 font-bold">${total.toLocaleString()}</span>
                </div>
                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mb-3">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${deliveryProgress}%` }}
                    className="h-full bg-brand-orange"
                  />
                </div>
                <p className="text-[9px] text-brand-orange text-center font-medium">
                  {deliveryRemaining > 0 
                    ? `Te faltan $${deliveryRemaining.toLocaleString()} para envío gratis` 
                    : '¡Envío gratis aplicado!'}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-end mb-6">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Total</span>
              <span className="text-3xl font-black text-brand-green">
                ${(total + (deliveryRemaining === 0 ? 0 : 2500)).toLocaleString()}
              </span>
            </div>

            <Link
              to="/checkout"
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange py-5 font-bold text-white shadow-lg shadow-brand-orange/20 transition-all hover:bg-brand-orange/90 active:scale-95"
            >
              Confirmar Pedido
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
