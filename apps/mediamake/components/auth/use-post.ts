'use client';

import { useCallback, useState } from 'react';

/** POSTs JSON to a sign-in route and keeps its busy state and error message. */
export function usePost() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const post = useCallback(async <T = Record<string, unknown>>(url: string, payload: unknown): Promise<T | null> => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as T & { message?: string; error?: string };
      if (!response.ok) {
        setError(data.message || data.error || 'Something went wrong. Try again.');
        return null;
      }
      return data;
    } catch {
      setError('Could not reach MediaMake. Check your connection and try again.');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return { post, busy, error, setError };
}
