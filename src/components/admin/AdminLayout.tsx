import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, MapPin, BookOpen, Users, Leaf, BarChart2, Settings, Wallet, TrendingUp, Tag, Truck, Swords } from 'lucide-react';
import { cn } from '../../lib/utils';
import { loadConfig } from '../../lib/config';

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2);
}

const NAV = [
  { to: '/admin', end: true, label: 'Panel', Icon: LayoutDashboard },
  { to: '/admin/pedidos', end: false, label: 'Pedidos', Icon: Package },
  { to: '/admin/ruta', end: false, label: 'Ruta del Día', Icon: MapPin },
  { to: '/admin/catalogo', end: false, label: 'Catálogo', Icon: BookOpen },
  { to: '/admin/clientes', end: false, label: 'Clientes', Icon: Users },
  { to: '/admin/cosechas', end: false, label: 'Cosechas', Icon: Leaf },
  { to: '/admin/reportes', end: false, label: 'Reportes', Icon: BarChart2 },
  { to: '/admin/costos', end: false, label: 'Costos', Icon: Wallet },
  { to: '/admin/finanzas', end: false, label: 'Finanzas', Icon: TrendingUp },
  { to: '/admin/precios', end: false, label: 'Precios', Icon: Tag },
  { to: '/admin/proveedores', end: false, label: 'Proveedores', Icon: Truck },
  { to: '/admin/competencia', end: false, label: 'Competencia', Icon: Swords },
  { to: '/admin/configuracion', end: false, label: 'Configuración', Icon: Settings },
];

export const AdminLayout: React.FC = () => {
  const [config] = useState(loadConfig);
  const initials = getInitials(config.adminName);
  return (
    <div className="flex min-h-screen bg-[#F4F4F1] font-sans text-stone-900">
      {/* Sidebar – desktop */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-stone-200/80 bg-[#EEEDE8] md:flex lg:w-60">
        <div className="border-b border-stone-200/60 px-5 py-6">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold tracking-tight text-stone-800">
              Fruto<span className="text-brand-orange">.</span>app
            </span>
          </div>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
            Panel productor
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map(({ to, end, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#D8E8DC] text-[#1B4332]'
                    : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-800'
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-stone-200/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2D6A4F] text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-800">{config.adminName}</p>
              <p className="truncate text-xs text-stone-500">Productor · La Serena</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-stone-200/80 bg-[#EEEDE8] px-4 py-3 md:hidden">
          <div>
            <span className="text-base font-bold text-stone-800">
              Fruto<span className="text-brand-orange">.</span>app
            </span>
            <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
              Panel productor
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2D6A4F] text-[10px] font-bold text-white">
            {initials}
          </div>
        </header>

        {/* Mobile horizontal nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-stone-200/60 bg-[#EEEDE8]/80 px-3 py-2 scrollbar-hide md:hidden">
          {NAV.map(({ to, end, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-[#2D6A4F] text-white'
                    : 'text-stone-500 hover:bg-stone-200/60 hover:text-stone-700'
                )
              }
            >
              <Icon size={13} />
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
