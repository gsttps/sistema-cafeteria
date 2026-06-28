import { useEffect } from 'react';

/**
 * Ejecuta una acción al presionar Escape. Pensado para cerrar modales.
 * Solo se activa mientras `activo` sea true para no interceptar Escape
 * cuando el modal está cerrado.
 */
export function useTeclaEscape(activo: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!activo) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activo, onEscape]);
}
