import { useEffect, useRef, RefObject } from 'react';

/**
 * Hook reutilizable para cerrar popups/dropdowns al hacer clic/tocar fuera del
 * contenedor o al presionar Escape.
 * Reemplaza la lógica duplicada en MenuDesplegable, SelectorMes y SelectorPremium.
 */
export function useClickAfuera<T extends HTMLElement>(onClickAfuera: () => void): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const handlerPointer = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickAfuera();
      }
    };
    const handlerTecla = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClickAfuera();
      }
    };
    document.addEventListener('mousedown', handlerPointer);
    document.addEventListener('touchstart', handlerPointer);
    document.addEventListener('keydown', handlerTecla);
    return () => {
      document.removeEventListener('mousedown', handlerPointer);
      document.removeEventListener('touchstart', handlerPointer);
      document.removeEventListener('keydown', handlerTecla);
    };
  }, [onClickAfuera]);

  return ref;
}
