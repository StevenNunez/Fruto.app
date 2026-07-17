import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Truck, Clock, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { loadProducts } from '../lib/products';
import { loadStockRemaining } from '../lib/stock';
import { loadConfig, DEFAULT_CONFIG } from '../lib/config';
import { COLLECTIONS } from '../lib/collections';
import { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { ProductSkeletonGrid } from '../components/ProductSkeleton';
import { LoadError } from '../components/LoadError';

export const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockRemaining, setStockRemaining] = useState<Record<string, number>>({});
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [prods, stock, cfg] = await Promise.all([
        loadProducts(),
        loadStockRemaining(),
        loadConfig(),
      ]);
      setProducts(prods);
      setStockRemaining(stock);
      setConfig(cfg);
    } catch (err) {
      console.error('Home load:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const featuredProducts = products.filter((p) => p.isSeason).slice(0, 4);
  const freeDeliveryLabel = `$${config.freeDeliveryThreshold.toLocaleString('es-CL')}`;

  return (
    <div className="flex flex-col gap-12 pt-4">
      {/* Hero Section */}
      <section className="px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-stone-100 bg-white px-6 py-16 text-left shadow-2xl md:px-12 md:py-24"
        >
          <div className="relative z-10 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange">
              Fresco y Seleccionado
            </span>
            <h1 className="mt-2 text-4xl font-bold leading-[1.1] tracking-tight text-brand-green md:text-6xl">
              Tus frutas y verduras <br />
              <span className="text-stone-800">sin salir de casa.</span>
            </h1>
            <p className="mt-6 max-w-md text-sm text-stone-500">
              Frescas, seleccionadas para ti y entregadas en tu hogar el mismo día.
              Sin filas, sin supermercado, sin perder tu tiempo.
            </p>
            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
              <Link
                to="/catalog"
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green px-10 py-4 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 sm:w-auto"
              >
                Ver catálogo
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="mt-12 inline-flex items-center gap-4 rounded-xl border border-brand-orange/10 bg-brand-orange/5 p-4">
              <Clock size={20} className="shrink-0 text-brand-orange" />
              <p className="text-xs font-bold uppercase leading-tight tracking-wider text-brand-orange">
                <strong>Mañana gratis desde {freeDeliveryLabel}</strong>
                <br />
                ¿Lo necesitas hoy? Despacho ${config.deliveryFee.toLocaleString('es-CL')} y eliges horario
              </p>
            </div>
          </div>
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-green/5 blur-3xl" />
          <div className="absolute bottom-0 right-0 hidden h-full w-1/3 bg-gradient-to-l from-brand-green/5 to-transparent md:block" />
        </motion.div>
      </section>

      {/* Value Prop Banner */}
      <section className="px-4 md:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-6">
            <div className="rounded-full bg-stone-50 p-3 text-[#2D6A4F]">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="font-bold">Para mañana, sin apuro</h3>
              <p className="text-sm text-stone-500">
                Envío gratis desde {freeDeliveryLabel}. Entrega {config.deliveryWindow}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-6">
            <div className="rounded-full bg-stone-50 p-3 text-[#2D6A4F]">
              <Truck size={24} />
            </div>
            <div>
              <h3 className="font-bold">¿Lo necesitas hoy?</h3>
              <p className="text-sm text-stone-500">
                Despacho ${config.deliveryFee.toLocaleString('es-CL')} y eliges tu ventana horaria.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-6">
            <div className="rounded-full bg-stone-50 p-3 text-[#2D6A4F]">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-bold">Fresco y seleccionado</h3>
              <p className="text-sm text-stone-500">En tu casa, sin filas ni supermercado.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Collections */}
      <section className="px-4 md:px-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-800">Colecciones</h2>
            <p className="text-stone-500">Elige según lo que necesitas hoy.</p>
          </div>
        </div>
        <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
          {COLLECTIONS.map((col) => (
            <Link
              key={col.id}
              to={`/catalog?collection=${col.id}`}
              style={{ backgroundColor: col.bgColor }}
              className="flex w-36 shrink-0 flex-col rounded-2xl p-5 transition hover:scale-105 active:scale-95"
            >
              <span className="mb-3 text-3xl">{col.emoji}</span>
              <p className="text-sm font-bold leading-tight" style={{ color: col.textColor }}>
                {col.label}
              </p>
              <p className="mt-1 text-xs text-stone-400">{col.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="px-4 md:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-800">Productos del día</h2>
            <p className="text-stone-500">Lo mejor de la selección de hoy.</p>
          </div>
          <Link
            to="/catalog"
            className="text-sm font-bold text-[#F4820A] underline-offset-4 hover:underline"
          >
            Ver todo
          </Link>
        </div>

        {loading && <ProductSkeletonGrid count={4} />}

        {!loading && error && (
          <LoadError onRetry={load} message="No pudimos cargar los productos del día." />
        )}

        {!loading && !error && featuredProducts.length === 0 && (
          <p className="rounded-2xl border border-dashed border-stone-200 py-12 text-center text-sm text-stone-400">
            Aún no hay productos destacados. Explora el catálogo completo.
          </p>
        )}

        {!loading && !error && featuredProducts.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {featuredProducts.map((product) => {
              const remaining = stockRemaining[product.id];
              const outOfStock = remaining !== undefined && remaining <= 0;
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  outOfStock={outOfStock}
                  maxStock={remaining}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="mt-8 px-4 md:px-8">
        <div className="rounded-3xl border border-[#F4820A]/10 bg-[#F4820A]/5 p-8 md:p-12">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="max-w-md">
              <h2 className="text-3xl font-bold text-stone-800">¿Listo para comer mejor?</h2>
              <p className="mt-4 text-stone-600">
                Únete a las familias que ya reciben sus frutas y verduras frescas en la puerta de
                su casa. Calidad seleccionada, sin filas ni supermercado.
              </p>
            </div>
            <Link
              to="/catalog"
              className="w-full rounded-2xl bg-[#F4820A] px-10 py-5 text-center text-lg font-bold text-white transition-all hover:bg-[#d47008] md:w-auto"
            >
              Hacer mi pedido
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
