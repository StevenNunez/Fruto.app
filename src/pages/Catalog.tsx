import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { loadProducts, loadCategories } from '../lib/products';
import { loadStockRemaining } from '../lib/stock';
import { COLLECTIONS } from '../lib/collections';
import { ProductCard } from '../components/ProductCard';
import { Product } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const Catalog: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(() => searchParams.get('collection'));
  const [searchQuery, setSearchQuery] = useState('');
  const [stockRemaining, setStockRemaining] = useState<Record<string, number>>({});

  useEffect(() => {
    loadProducts().then(setProducts);
    loadCategories().then(setCategories);
    loadStockRemaining().then(setStockRemaining);
  }, []);

  const activeCollection = COLLECTIONS.find((c) => c.id === selectedCollection) ?? null;

  const filteredProducts = products.filter((product) => {
    const passesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    const passesCollection = !selectedCollection || (product.tags ?? []).includes(selectedCollection);
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return passesCategory && passesCollection && matchesSearch;
  });

  return (
    <div className="px-4 pt-6 md:px-8 md:pt-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-800">Nuestro Mercado</h1>
        <p className="text-stone-500">Elige tus productos frescos, seleccionados para ti.</p>
      </div>

      {/* Search and Filters */}
      <div className="sticky top-20 z-30 mb-8 flex flex-col gap-3 bg-[#FAFAF7]/80 pb-4 pt-2 backdrop-blur-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input type="text" placeholder="¿Qué buscas hoy?" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-12 pr-4 outline-none transition-all placeholder:text-stone-400 focus:border-[#2D6A4F] focus:ring-4 focus:ring-[#2D6A4F]/5"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button onClick={() => setSelectedCategory('Todos')}
            className={cn('whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-all',
              selectedCategory === 'Todos' && !selectedCollection ? 'bg-[#2D6A4F] text-white' : 'bg-white text-stone-500 border border-stone-200 hover:border-[#2D6A4F]/30'
            )}>Todos</button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={cn('whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-all',
                selectedCategory === cat && !selectedCollection ? 'bg-[#2D6A4F] text-white' : 'bg-white text-stone-500 border border-stone-200 hover:border-[#2D6A4F]/30'
              )}>{cat}</button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {COLLECTIONS.map((col) => {
            const active = selectedCollection === col.id;
            return (
              <button key={col.id} onClick={() => setSelectedCollection((prev) => prev === col.id ? null : col.id)}
                style={active ? { backgroundColor: col.bgColor, color: col.textColor, borderColor: col.textColor + '40' } : {}}
                className={cn('flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all',
                  active ? 'border-transparent' : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:bg-stone-50'
                )}>
                <span>{col.emoji}</span>
                {col.label}
                {active && <X size={12} className="ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active collection banner */}
      {activeCollection && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 rounded-2xl px-5 py-3"
          style={{ backgroundColor: activeCollection.bgColor }}>
          <span className="text-2xl">{activeCollection.emoji}</span>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: activeCollection.textColor }}>{activeCollection.label}</p>
            <p className="text-xs" style={{ color: activeCollection.textColor + 'aa' }}>{activeCollection.description}</p>
          </div>
          <button onClick={() => setSelectedCollection(null)}
            className="rounded-full p-1 transition hover:bg-black/10"
            style={{ color: activeCollection.textColor }}>
            <X size={16} />
          </button>
        </motion.div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-4 pb-12 sm:grid-cols-3 md:grid-cols-4 md:gap-8">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product}
              outOfStock={stockRemaining[product.id] !== undefined && stockRemaining[product.id] <= 0} />
          ))}
        </AnimatePresence>
      </div>

      {filteredProducts.length === 0 && (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 text-stone-400">
            <Search size={32} />
          </div>
          <h3 className="text-lg font-bold text-stone-800">No encontramos resultados</h3>
          <p className="text-stone-500">Intenta con otra búsqueda o categoría.</p>
        </div>
      )}
    </div>
  );
};
