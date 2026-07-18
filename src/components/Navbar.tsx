import React from 'react';
import { ShoppingBag, User } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { cn } from '../lib/utils';
import { LogoWordmark } from './Logo';

export const Navbar: React.FC = () => {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to="/" aria-label="Fruto.app — Inicio">
          <LogoWordmark className="text-2xl" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <NavLink to="/" className={({ isActive }) => cn('text-[11px] font-medium uppercase tracking-[0.2em] text-brand-green transition-colors hover:opacity-70', !isActive && 'opacity-40')}>Inicio</NavLink>
          <NavLink to="/catalog" className={({ isActive }) => cn('text-[11px] font-medium uppercase tracking-[0.2em] text-brand-green transition-colors hover:opacity-70', !isActive && 'opacity-40')}>Catálogo</NavLink>
        </nav>

        <div className="flex items-center gap-1">
          <Link
            to="/cuenta"
            aria-label="Mi cuenta"
            className="p-2 text-stone-600 transition-colors hover:text-[#2D6A4F]"
          >
            <User size={24} />
          </Link>
          <Link to="/cart" className="relative p-2 text-stone-600 transition-colors hover:text-[#2D6A4F]">
            <ShoppingBag size={24} />
            {itemCount > 0 && (
              <span className="absolute right-0 top-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F4820A] px-1.5 text-[11px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};
