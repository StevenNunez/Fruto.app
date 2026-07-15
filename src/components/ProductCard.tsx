import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ProductCardProps {
  product: Product;
  outOfStock?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, outOfStock = false }) => {
  const { addToCart, updateQuantity, items } = useCart();
  const qty = items.find((i) => i.id === product.id)?.quantity ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className={cn(
              'h-full w-full object-cover transition-transform duration-500 group-hover:scale-110',
              outOfStock && 'opacity-50 grayscale'
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-300">
            <span className="text-4xl">🌿</span>
          </div>
        )}
        {!outOfStock && product.isSeason && (
          <div className="absolute left-2 top-2 rounded bg-brand-orange px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
            Temporada
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-end justify-center pb-3">
            <span className="rounded-full bg-stone-800/75 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-[2px]">
              Sin stock
            </span>
          </div>
        )}
        {!outOfStock && qty > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-green px-1 text-[10px] font-bold text-white shadow"
          >
            {qty}
          </motion.div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="flex-1">
          <h3 className="line-clamp-2 text-xs font-bold leading-snug text-stone-800">{product.name}</h3>
          <p className="mt-0.5 text-[10px] text-stone-400">
            ${product.price.toLocaleString('es-CL')} / {product.unit}
          </p>
        </div>

        {outOfStock ? (
          <div className="flex w-full items-center justify-center rounded-xl bg-stone-100 py-2 text-xs font-semibold text-stone-400">
            Sin stock disponible
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {qty > 0 ? (
              <motion.div
                key="qty"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-between rounded-xl border border-brand-green/20 bg-brand-green/5 px-1 py-0.5"
              >
                <button
                  onClick={() => updateQuantity(product.id, qty - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-green transition hover:bg-brand-green/10 active:scale-90"
                >
                  <Minus size={13} />
                </button>
                <span className="text-sm font-bold text-brand-green">{qty}</span>
                <button
                  onClick={() => addToCart(product)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-green text-white transition hover:bg-[#245a42] active:scale-90"
                >
                  <Plus size={13} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="add"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                onClick={() => addToCart(product)}
                className="flex w-full items-center justify-center gap-1 rounded-xl bg-brand-green py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#245a42] active:scale-95"
              >
                <Plus size={13} />
                Agregar
              </motion.button>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};
