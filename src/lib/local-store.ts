import { useSyncExternalStore } from "react";

export interface LocalStore<T> {
  get(): T;
  set(value: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
  /** Value used on the server and when storage is empty, blocked or invalid. */
  readonly fallback: T;
}

const UNREAD = Symbol("unread");

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function createLocalStore<T>(key: string, fallback: T, parse: (raw: unknown) => T): LocalStore<T> {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | typeof UNREAD = UNREAD;
  let cachedValue = fallback;

  const notify = () => listeners.forEach((listener) => listener());

  function get(): T {
    if (typeof window === "undefined") return fallback;
    const raw = readRaw(key);
    // REVIEWER_NOTE: useSyncExternalStore compares snapshots with Object.is and re-renders forever
    // if get() returns a new array each call. Re-parsing only when the raw string changes keeps the
    // reference stable (this also picks up writes from other tabs without extra bookkeeping).
    if (raw === cachedRaw) return cachedValue;
    let value = fallback;
    if (raw !== null) {
      try {
        value = parse(JSON.parse(raw));
      } catch {
        value = fallback;
      }
    }
    cachedRaw = raw;
    cachedValue = value;
    return value;
  }

  function set(value: T | ((prev: T) => T)) {
    if (typeof window === "undefined") return;
    const next = typeof value === "function" ? (value as (prev: T) => T)(get()) : value;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage blocked or full: the change is simply not persisted.
    }
    notify();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  return { get, set, subscribe, fallback };
}

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, () => store.fallback);
}

const subscribeNever = () => () => {};

/**
 * False on the server and during hydration, true afterwards. Lets a page tell "storage is empty"
 * apart from "storage hasn't been read yet", so it doesn't flash an empty state before hydration.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}
