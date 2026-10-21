import "server-only";

import { cacheLife } from "next/cache";
import { getServerEnv, isDemoMode } from "@/lib/env";
import { UpstreamError } from "@/lib/errors";
import { DEMO_PHOTOS } from "@/services/fixtures/demo-photos";
import type { Photo, PhotoSearchParams, PhotoSearchResult } from "@/types/travel";

export const UNSPLASH_API_URL = "https://api.unsplash.com";
const DEFAULT_QUERY = "travel destination";
const UTM = "utm_source=travelens&utm_medium=referral";

interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  color: string | null;
  blur_hash: string | null;
  description: string | null;
  alt_description: string | null;
  urls: { thumb: string; small: string; regular: string; full: string };
  links: { html: string };
  user: { name: string; username: string; links: { html: string } };
  location?: { name: string | null; city: string | null; country: string | null };
  tags?: { title: string }[];
}

interface UnsplashSearchResponse {
  total_pages: number;
  results: UnsplashPhoto[];
}

function withUtm(url: string) {
  return `${url}${url.includes("?") ? "&" : "?"}${UTM}`;
}

function toTitle(raw: UnsplashPhoto) {
  const text = (raw.description ?? raw.alt_description ?? "").trim().replace(/\s+/g, " ");
  if (!text) return raw.location?.name ?? "Sin título";
  const title = text.charAt(0).toUpperCase() + text.slice(1);
  return title.length > 90 ? `${title.slice(0, 87).trimEnd()}…` : title;
}

function toPhoto(raw: UnsplashPhoto): Photo {
  return {
    id: raw.id,
    width: raw.width,
    height: raw.height,
    color: raw.color ?? "#d6cfc2",
    blurHash: raw.blur_hash,
    alt: raw.alt_description ?? toTitle(raw),
    title: toTitle(raw),
    city: raw.location?.city ?? null,
    country: raw.location?.country ?? null,
    tags: (raw.tags ?? []).map((t) => t.title).slice(0, 6),
    urls: raw.urls,
    photographer: {
      name: raw.user.name,
      username: raw.user.username,
      profileUrl: withUtm(raw.user.links.html),
    },
    unsplashUrl: withUtm(raw.links.html),
  };
}

async function unsplashFetch<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  const url = new URL(path, UNSPLASH_API_URL);
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, value);

  const res = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${getServerEnv("UNSPLASH_ACCESS_KEY")}`,
      "Accept-Version": "v1",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new UpstreamError("unsplash", res.status, `Unsplash ${path} responded ${res.status}`);
  return (await res.json()) as T;
}

const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function searchDemo({ query, page = 1, perPage = 24 }: PhotoSearchParams): PhotoSearchResult {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const matches = terms.length
    ? DEMO_PHOTOS.filter((p) => {
        const haystack = normalize([p.title, p.city, p.country, ...p.tags].join(" "));
        return terms.every((t) => haystack.includes(t));
      })
    : DEMO_PHOTOS;
  const start = (page - 1) * perPage;
  return {
    photos: matches.slice(start, start + perPage),
    page,
    totalPages: Math.max(1, Math.ceil(matches.length / perPage)),
  };
}

/** Search photos for the masonry grid. An empty query returns general travel photography. */
export async function searchPhotos(params: PhotoSearchParams): Promise<PhotoSearchResult> {
  "use cache";
  cacheLife("hours");

  if (isDemoMode("UNSPLASH_ACCESS_KEY")) return searchDemo(params);

  const { query, page = 1, perPage = 24, orientation } = params;
  const data = await unsplashFetch<UnsplashSearchResponse>("/search/photos", {
    query: query.trim() || DEFAULT_QUERY,
    page: String(page),
    per_page: String(perPage),
    content_filter: "high",
    ...(orientation && { orientation }),
  });
  return {
    photos: (data?.results ?? []).map(toPhoto),
    page,
    totalPages: data?.total_pages ?? 0,
  };
}

/** Full photo details (location and tags are only present on this endpoint). */
export async function getPhoto(id: string): Promise<Photo | null> {
  "use cache";
  cacheLife("days");

  if (isDemoMode("UNSPLASH_ACCESS_KEY")) return DEMO_PHOTOS.find((p) => p.id === id) ?? null;

  const raw = await unsplashFetch<UnsplashPhoto>(`/photos/${encodeURIComponent(id)}`);
  return raw && toPhoto(raw);
}

/** Photos of the same place, falling back to the first tag, excluding the photo itself. */
export async function getSimilarPhotos(photo: Photo, limit = 8): Promise<Photo[]> {
  if (isDemoMode("UNSPLASH_ACCESS_KEY")) {
    const score = (p: Photo) =>
      (p.city && p.city === photo.city ? 4 : 0) +
      (p.country && p.country === photo.country ? 2 : 0) +
      p.tags.filter((t) => photo.tags.includes(t)).length;
    return DEMO_PHOTOS.filter((p) => p.id !== photo.id)
      .map((p) => ({ p, s: score(p) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map(({ p }) => p);
  }

  const queries = [photo.city, photo.tags[0], photo.title].filter((q): q is string => !!q);
  const seen = new Set([photo.id]);
  const similar: Photo[] = [];
  for (const query of queries) {
    const { photos } = await searchPhotos({ query, perPage: limit + 1 });
    for (const p of photos) {
      if (similar.length === limit) break;
      if (!seen.has(p.id)) {
        seen.add(p.id);
        similar.push(p);
      }
    }
    if (similar.length === limit) break;
  }
  return similar;
}

/**
 * Register a download with Unsplash (required by the API guidelines whenever the
 * user downloads a photo). Never cached: it only counts downloads.
 */
export async function trackDownload(photoId: string): Promise<void> {
  if (isDemoMode("UNSPLASH_ACCESS_KEY")) return;
  await unsplashFetch(`/photos/${encodeURIComponent(photoId)}/download`);
}
