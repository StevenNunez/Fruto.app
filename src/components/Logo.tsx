import React from 'react';
import { cn } from '../lib/utils';

/**
 * Identidad de Fruto.app — la "o" de Fruto ES la fruta:
 * un anillo naranjo con hoja verde. Para contextos cuadrados
 * (favicon, ícono de app) existe LogoMark: baldosa verde con
 * la fruta rellena (public/favicon.svg usa el mismo dibujo).
 */

/** La "o"-fruta: anillo naranjo + hoja verde. Escala con el font-size del padre. */
export const FruitO: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 96 136"
    style={{ height: '1.04em', width: 'auto', overflow: 'visible' }}
    className={className}
    aria-hidden="true"
  >
    <circle cx="48" cy="100" r="28" fill="none" stroke="#F4820A" strokeWidth="15" />
    <path
      d="M50 60 C48 38 63 18 90 15 C92 38 77 58 54 63 C52.4 62.4 51 61.4 50 60 Z"
      fill="#2D6A4F"
    />
  </svg>
);

/** Wordmark completo: Frut(o).app — para navbar y encabezados. */
export const LogoWordmark: React.FC<{ className?: string }> = ({ className }) => (
  <span
    className={cn(
      'flex items-baseline font-bold tracking-tight text-brand-green',
      className
    )}
    aria-label="Fruto.app"
  >
    Frut
    <FruitO />
    <span className="text-brand-orange">.app</span>
  </span>
);

/** Ícono cuadrado (mismo dibujo que public/favicon.svg). */
export const LogoMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 128 128" className={className} aria-hidden="true">
    <rect width="128" height="128" rx="34" fill="#2D6A4F" />
    <circle cx="64" cy="76" r="32" fill="#F4820A" />
    <path
      d="M67 40 C68 24 82 14 100 16 C99 33 86 44 70 44 C68.5 43 67.3 41.6 67 40 Z"
      fill="#FAFAF7"
    />
  </svg>
);
