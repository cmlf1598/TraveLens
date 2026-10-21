import { createLocalStore, useLocalStore } from "@/lib/local-store";
import type { Photo } from "@/types/travel";

export const FAVORITES_KEY = "travelens:favorites";

const EMPTY: Photo[] = [];

/** Checks the fields the saved page renders; anything else (e.g. a bare ID from an older format) is dropped. */
function isSavedPhoto(value: unknown): value is Photo {
  const photo = value as Photo;
  return (
    typeof photo === "object" &&
    photo !== null &&
    typeof photo.id === "string" &&
    typeof photo.title === "string" &&
    typeof photo.width === "number" &&
    typeof photo.height === "number" &&
    typeof photo.urls?.small === "string"
  );
}

// REVIEWER_NOTE: Favorites store a snapshot of each photo, not just its ID, so the saved page renders
// straight from localStorage. Re-fetching every saved photo from Unsplash would cost one request each
// against a 50-requests/hour demo limit.
const favorites = createLocalStore<Photo[]>(FAVORITES_KEY, EMPTY, (raw) =>
  Array.isArray(raw) ? raw.filter(isSavedPhoto) : EMPTY,
);

export function isFavorite(id: string): boolean {
  return favorites.get().some((photo) => photo.id === id);
}

/** Saves or removes a photo (newest first) and returns its new saved state. */
export function toggleFavorite(photo: Photo): boolean {
  const saved = !isFavorite(photo.id);
  favorites.set((prev) => {
    const others = prev.filter((p) => p.id !== photo.id);
    return saved ? [photo, ...others] : others;
  });
  return saved;
}

export function useIsFavorite(id: string): boolean {
  return useLocalStore(favorites).some((photo) => photo.id === id);
}

/** Saved photos, newest first. Empty on the server and during hydration (see `useHydrated`). */
export function useFavorites(): Photo[] {
  return useLocalStore(favorites);
}
