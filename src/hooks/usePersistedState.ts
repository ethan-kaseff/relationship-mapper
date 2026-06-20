import { useState, useEffect, type Dispatch, type SetStateAction } from "react";

/**
 * Drop-in replacement for useState that persists the value to localStorage under
 * `storageKey`. SSR-safe: returns `defaultValue` on the server and falls back to
 * it if storage is unavailable or holds invalid JSON.
 */
export function usePersistedState<T>(
  storageKey: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw !== null ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* storage unavailable (private mode / quota) — ignore */
    }
  }, [storageKey, value]);

  return [value, setValue];
}
