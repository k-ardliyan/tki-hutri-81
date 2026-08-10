import { useEffect, useState } from 'react';

/**
 * useDebounce — delays updating the returned value until specified delay (default 300ms)
 * has passed since the last change.
 * Prevents triggering heavy filtering or API fetches on every single keystroke.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
