'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Persist a piece of React state in localStorage.
 *
 * SSR-safe: the first render always returns `initialValue` so the server and
 * client markup match, the stored value is read in a mount effect, and nothing
 * is written back until that read has happened (otherwise the defaults would
 * immediately clobber whatever was saved).
 *
 * The third tuple member tells you whether the stored value has been read yet,
 * which is what you need if you want to seed other state from it exactly once.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);
  const initialValueRef = useRef(initialValue);

  useEffect(() => {
    setHydrated(false);
    try {
      const raw = window.localStorage.getItem(key);
      setValue(raw !== null ? (JSON.parse(raw) as T) : initialValueRef.current);
    } catch {
      // Corrupt JSON, or storage blocked (private mode) — keep the default.
      setValue(initialValueRef.current);
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded or storage blocked — persistence is best effort.
    }
  }, [key, hydrated, value]);

  return [value, setValue, hydrated] as const;
}
