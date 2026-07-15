import React, { useEffect, useState } from 'react';
import { ArrowRight, Truck, Clock, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { loadProducts } from '../lib/products';
import { loadStockRemaining } from '../lib/stock';
import { COLLECTIONS } from '../lib/collections';
import { Product } from '../types';
import { ProductCard } from '../components/ProductCard';

export const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockRemaining, setStockRemaining] = useState<Record<string, number>>({});

  useEffect(() => {
    loadProducts().then(setProducts);
    loadStockRemaining().then(setStockRemaining);
  }, []);

  const featuredProducts = products.filter((p) => p.isSeason).slice(0, 4);

  return (
    <div className="flex flex-col gap-12 pt-4">
      {/* Hero Section */}
      <section className="px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2.5rem] bg-white border border-stone-100 shadow-2xl px-6 py-16 text-left md:px-12 md:py-24"
        >
          <div className="relative z-10 max-w-xl">
            <span className="text-[10px] uppercase tracking-[0.2em] text-brand-orange font-bold">Cosecha de Hoy</span>
            <h1 className="mt-2 text-4xl font-bold leading-[1.1] tracking-tight text-brand-green md:text-6xl">
              Directo del campo <br />
              <span className="text-stone-800">a tu puerta.</span>
            </h1>
            <p className="mt-6 text-sm text-stone-500 max-w-md">
              Frutas y verduras frescas seleccionadas a mano cada mañana.
              Sabor real, apoyo local y honestidad en cada entrega.
            </p>
            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
              <Link to="/catalog"
                className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-brand-green px-10 py-4 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95">
                Ver catálogo
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="mt-12 inline-flex items-center gap-4 rounded-xl bg-brand-orange/5 border border-brand-orange/10 p-4">
              <Clock size={20} className="text-brand-orange" />
              <p className="text-[10px] leading-tight text-brand-orange uppercase font-bold tracking-wider">
                <strong>Pedido antes de las 3 PM</strong><br />
                Entrega hoy entre 7-10 PM
              </p>
            </div>
          </div>
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-green/5 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 h-full w-1/3 bg-gradient-to-l from-brand-green/5 to-transparent hidden md:block"></div>
        </motion.div>
      </section>

      {/* Value Prop Banner */}
      <section className="px-4 md:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-6">
            <div className="rounded-full bg-stone-50 p-3 text-[#2D6A4F]"><Clock size={24} /></div>
            <div>
              <h3 className="font-bold">Pedidos hasta 3 PM</h3>
              <p className="text-sm text-stone-500">Despacho garantizado para hoy.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-6">
            <div className="rounded-full bg-stone-50 p-3 text-[#2D6A4F]"><Truck size={24} /></div>
            <div>
              <h3 className="font-bold">Entrega 7-10 PM</h3>
              <p className="text-sm text-stone-500">Recibe al final de tu jornada.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-6">
            <div className="rounded-full bg-stone-50 p-3 text-[#2D6A4F]"><ShieldCheck size={24} /></div>
            <div>
              <h3 className="font-bold">Delivery gratis +$10k</h3>
              <p className="text-sm text-stone-500">Sin cargos en compras grandes.</p>
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
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {COLLECTIONS.map((col) => (
            <Link key={col.id} to={`/catalog?collection=${col.id}`}
              style={{ backgroundColor: col.bgColor }}
              className="flex w-36 shrink-0 flex-col rounded-2xl p-5 transition hover:scale-105 active:scale-95">
              <span className="mb-3 text-3xl">{col.emoji}</span>
              <p className="text-sm font-bold leading-tight" style={{ color: col.textColor }}>{col.label}</p>
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
            <p className="text-stone-500">Lo mejor de la cosecha de hoy.</p>
          </div>
          <Link to="/catalog" className="text-sm font-bold text-[#F4820A] hover:underline underline-offset-4">Ver todo</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product}
              outOfStock={stockRemaining[product.id] !== undefined && stockRemaining[product.id] <= 0} />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="mt-8 px-4 md:px-8">
        <div className="rounded-3xl bg-[#F4820A]/5 border border-[#F4820A]/10 p-8 md:p-12">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="max-w-md">
              <h2 className="text-3xl font-bold text-stone-800">¿Listo para comer mejor?</h2>
              <p className="mt-4 text-stone-600">Únete a las familias que ya disfrutan de la calidad artesanal de Fruto.app. Sin intermediarios, sin plástico excesivo.</p>
            </div>
            <Link to="/catalog"
              className="w-full rounded-2xl bg-[#F4820A] px-10 py-5 text-center text-lg font-bold text-white transition-all hover:bg-[#d47008] md:w-auto">
              Hacer mi pedido
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
