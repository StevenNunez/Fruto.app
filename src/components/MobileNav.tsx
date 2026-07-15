import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { cn } from '../lib/utils';

export const MobileNav: React.FC = () => {
  const { itemCount } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-stone-200 bg-white/80 px-4 pb-safe backdrop-blur-md md:hidden">
      <NavLink
        to="/"
        className={({ isActive }) =>
          cn('flex flex-col items-center gap-1 text-stone-500 transition-colors', isActive && 'text-[#2D6A4F]')
        }
      >
        <Home size={20} />
        <span className="text-[10px] font-medium">Inicio</span>
      </NavLink>
      <NavLink
        to="/catalog"
        className={({ isActive }) =>
          cn('flex flex-col items-center gap-1 text-stone-500 transition-colors', isActive && 'text-[#2D6A4F]')
        }
      >
        <Search size={20} />
        <span className="text-[10px] font-medium">Catálogo</span>
      </NavLink>
      <NavLink
        to="/cart"
        className={({ isActive }) =>
          cn('relative flex flex-col items-center gap-1 text-stone-500 transition-colors', isActive && 'text-[#2D6A4F]')
        }
      >
        <ShoppingBag size={20} />
        {itemCount > 0 && (
          <span className="absolute -top-1 right-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F4820A] px-1 text-[10px] font-bold text-white">
            {itemCount}
          </span>
        )}
        <span className="text-[10px] font-medium">Carrito</span>
      </NavLink>
    </nav>
  );
};
