import React from 'react';
import { Link } from 'react-router-dom';

export const AdminPlaceholder: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <h1 className="text-2xl font-bold text-stone-800">{title}</h1>
    <p className="mt-2 text-stone-500">Esta sección estará disponible pronto.</p>
    <Link
      to="/admin"
      className="mt-6 rounded-full bg-[#2D6A4F] px-5 py-2.5 text-sm font-semibold text-white"
    >
      Volver a pedidos
    </Link>
  </div>
);
