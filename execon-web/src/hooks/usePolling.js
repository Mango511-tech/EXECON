import { useEffect, useRef } from 'react';

/**
 * Ejecuta `callback` cada `intervalMs` mientras la pestaña esté visible
 * y también al volver a enfocarla. El callback recibe `true` (modo silencioso).
 */
export default function usePolling(callback, intervalMs = 8000) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => {
      if (!document.hidden) saved.current(true);
    };
    const id = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs]);
}
