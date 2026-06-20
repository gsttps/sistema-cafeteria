import { useEffect, useRef, RefObject } from 'react';

/**
 * Hook reutilizable para cerrar popups/dropdowns al hacer clic fuera del contenedor.
 * Reemplaza la lógica duplicada en MenuDesplegable, SelectorMes y SelectorPremium.
 */
export function useClickAfuera<T extends HTMLElement>(onClickAfuera: () => void): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickAfuera();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClickAfuera]);

  return ref;
}
