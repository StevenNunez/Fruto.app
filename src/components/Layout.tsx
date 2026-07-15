import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { MobileNav } from './MobileNav';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FAFAF7] font-sans text-stone-900 selection:bg-[#2D6A4F]/20 selection:text-[#2D6A4F]">
      <Navbar />
      <main className="mx-auto max-w-7xl pb-20 md:pb-8">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
};
