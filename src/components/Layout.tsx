import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Navbar } from './Navbar';
import { MobileNav } from './MobileNav';
import { LogoWordmark } from './Logo';
import { cn } from '../lib/utils';

export const Layout: React.FC = () => {
  const { pathname } = useLocation();
  // En checkout la barra de confirmar ocupa el fondo; en confirmación no hace falta el tab bar.
  const hideMobileNav = pathname === '/checkout' || pathname === '/confirmation';

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-sans text-stone-900 selection:bg-[#2D6A4F]/20 selection:text-[#2D6A4F]">
      <Navbar />
      <main className={cn('mx-auto max-w-7xl md:pb-8', hideMobileNav ? 'pb-8' : 'pb-20')}>
        <Outlet />
      </main>

      {/* El checkout va sin distracciones; el resto lleva pie de página */}
      {pathname !== '/checkout' && (
        <footer className={cn('border-t border-stone-200 bg-white', !hideMobileNav && 'pb-20 md:pb-0')}>
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between md:px-8">
            <div className="max-w-xs">
              <LogoWordmark className="text-xl" />
              <p className="mt-2 text-sm text-stone-500">
                Frutas y verduras frescas a domicilio en La Serena, Coquimbo y Las Compañías.
                Seleccionadas para ti, entregadas en tu hogar.
              </p>
            </div>
            <nav className="flex flex-col gap-2 text-sm" aria-label="Enlaces del sitio">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Tienda</p>
              <Link to="/catalog" className="text-stone-600 transition hover:text-brand-green">
                Catálogo de frutas y verduras
              </Link>
              <Link to="/cuenta" className="text-stone-600 transition hover:text-brand-green">
                Mi cuenta y mis pedidos
              </Link>
              <Link to="/confirmation" className="text-stone-600 transition hover:text-brand-green">
                Seguimiento de mi pedido
              </Link>
            </nav>
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Entrega</p>
              <p className="text-stone-600">Mañana: envío gratis sobre el mínimo</p>
              <p className="text-stone-600">Hoy: despacho urgente con horario a elección</p>
              <p className="text-stone-600">Pago con Mercado Pago o transferencia</p>
            </div>
          </div>
          <div className="border-t border-stone-100">
            <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-stone-400 md:px-8">
              © {new Date().getFullYear()} Fruto.app · Delivery de frutas y verduras frescas ·
              Región de Coquimbo, Chile
            </p>
          </div>
        </footer>
      )}
      {!hideMobileNav && <MobileNav />}
    </div>
  );
};
