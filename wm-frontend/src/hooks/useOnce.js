// src/hooks/useOnce.js
import { useEffect, useRef } from 'react';

/**
 * useEffect'i sadece bir kere çalıştıran custom hook
 * React StrictMode'da bile tek sefer çalışır
 */
export const useOnce = (callback, deps = []) => {
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      return callback();
    }
  }, deps);
};