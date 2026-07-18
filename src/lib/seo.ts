import { useEffect } from 'react';

const DEFAULT_DESCRIPTION =
  'Compra frutas y verduras frescas online y recíbelas en tu hogar. Delivery el mismo día o para mañana en La Serena, Coquimbo y Las Compañías.';

/**
 * Título y descripción por página (SPA: hay que actualizarlos a mano al
 * navegar). Google indexa cada ruta con su propio título.
 */
export function usePageMeta(title: string, description?: string): void {
  useEffect(() => {
    document.title = title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', description ?? DEFAULT_DESCRIPTION);
  }, [title, description]);
}
