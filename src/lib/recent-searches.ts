import { createLocalStore, useLocalStore } from "@/lib/local-store";

export const RECENT_SEARCHES_KEY = "travelens:recent-searches";
export const MAX_RECENT = 6;

const EMPTY: string[] = [];

const recent = createLocalStore<string[]>(RECENT_SEARCHES_KEY, EMPTY, (raw) => {
  if (!Array.isArray(raw) || !raw.every((q) => typeof q === "string")) return EMPTY;
  return raw;
});

const sameQuery = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Puts `query` first, dropping any older case-insensitive duplicate, capped at `max`. */
export function pushRecent(list: string[], query: string, max = MAX_RECENT): string[] {
  const trimmed = query.trim();
  if (!trimmed) return list;
  return [trimmed, ...list.filter((q) => !sameQuery(q, trimmed))].slice(0, max);
}

export function addRecentSearch(query: string) {
  if (!query.trim()) return;
  recent.set((prev) => pushRecent(prev, query));
}

export function removeRecentSearch(query: string) {
  recent.set((prev) => prev.filter((q) => !sameQuery(q, query)));
}

export function clearRecentSearches() {
  recent.set(EMPTY);
}

export function useRecentSearches(): string[] {
  return useLocalStore(recent);
}
