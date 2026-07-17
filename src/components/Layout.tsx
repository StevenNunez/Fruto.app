import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { MobileNav } from './MobileNav';
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
      {!hideMobileNav && <MobileNav />}
    </div>
  );
};
