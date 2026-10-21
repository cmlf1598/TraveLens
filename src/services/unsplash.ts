import "server-only";

import { NotImplementedError } from "@/lib/errors";
import type { PhotoSearchParams, PhotoSearchResult } from "@/types/travel";

export const UNSPLASH_API_URL = "https://api.unsplash.com";

/**
 * Search photos for the masonry grid.
 *
 * Implementation notes (Role 2):
 * - `GET {UNSPLASH_API_URL}/search/photos?query&page&per_page&orientation`
 * - Header `Authorization: Client-ID ${getServerEnv("UNSPLASH_ACCESS_KEY")}`, `Accept-Version: v1`
 * - Normalize each result to `Photo`; keep the `ixid` param on image URLs (hotlinking rule).
 * - Wrap in a `'use cache'` helper with `cacheLife('hours')`; demo keys allow only 50 req/hour.
 * - Throw `UpstreamError("unsplash", res.status, ...)` on non-2xx.
 */
export async function searchPhotos(params: PhotoSearchParams): Promise<PhotoSearchResult> {
  void params;
  throw new NotImplementedError("Unsplash photo search");
}

/**
 * Register a download with Unsplash (required by the API guidelines whenever
 * the user downloads or "saves" a photo).
 *
 * Implementation notes (Role 2):
 * - `GET {UNSPLASH_API_URL}/photos/:id/download` with the same Client-ID header.
 * - Do not cache; this only counts downloads and must hit the API every time.
 */
export async function trackDownload(photoId: string): Promise<void> {
  void photoId;
  throw new NotImplementedError("Unsplash download tracking");
}
