import "server-only";

import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { getServerEnv, isDemoMode } from "@/lib/env";
import { UpstreamError } from "@/lib/errors";
import { cleanText, foldText, formatTags, slugToText, toDisplayText } from "@/lib/photo-text";
import { DEMO_PHOTOS } from "@/services/fixtures/demo-photos";
import type { Photo, PhotoMode, PhotoRecord, PhotoSearchResult } from "@/types/travel";

export const UNSPLASH_API_URL = "https://api.unsplash.com";
const UTM = "utm_source=travelens&utm_medium=referral";

/** Curated home-feed cities: `query` goes to Unsplash, `label` is shown in the (Spanish) UI. */
export const POPULAR_CITIES = [
  { query: "Paris", label: "París" },
  { query: "Tokyo", label: "Tokio" },
  { query: "New York", label: "Nueva York" },
  { query: "London", label: "Londres" },
  { query: "Rome", label: "Roma" },
  { query: "Barcelona", label: "Barcelona" },
  { query: "Istanbul", label: "Estambul" },
  { query: "Dubai", label: "Dubái" },
  { query: "Bangkok", label: "Bangkok" },
  { query: "Singapore", label: "Singapur" },
  { query: "Kyoto", label: "Kioto" },
  { query: "Bali", label: "Bali" },
  { query: "Amsterdam", label: "Ámsterdam" },
  { query: "Prague", label: "Praga" },
  { query: "Venice", label: "Venecia" },
  { query: "Lisbon", label: "Lisboa" },
  { query: "Santorini", label: "Santorini" },
  { query: "Cusco", label: "Cusco" },
  { query: "Rio de Janeiro", label: "Río de Janeiro" },
  { query: "Cape Town", label: "Ciudad del Cabo" },
  { query: "Sydney", label: "Sídney" },
  { query: "Marrakech", label: "Marrakech" },
  { query: "Hong Kong", label: "Hong Kong" },
  { query: "Seoul", label: "Seúl" },
  { query: "Havana", label: "La Habana" },
  { query: "Buenos Aires", label: "Buenos Aires" },
  { query: "Mexico City", label: "Ciudad de México" },
  { query: "Cairo", label: "El Cairo" },
  { query: "Reykjavik", label: "Reikiavik" },
  { query: "Vienna", label: "Viena" },
] as const;
type PopularCity = (typeof POPULAR_CITIES)[number];

const CITIES_PER_PAGE = 4;
const PHOTOS_PER_CITY = 6;
const SEARCH_PER_PAGE = 24;
const RELATED_LIMIT = 8;
/** Over-fetch so excluding the current photo and duplicates still leaves enough. */
const RELATED_FETCH = 12;
const FALLBACK_TITLE = "Fotografía de viaje";

// ---------------------------------------------------------------------------
// Unsplash API shapes and normalization
// ---------------------------------------------------------------------------

interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  color: string | null;
  blur_hash: string | null;
  description: string | null;
  alt_description: string | null;
  alternative_slugs?: Partial<Record<string, string>>;
  urls: { thumb: string; small: string; regular: string };
  links: { html: string };
  user: { name: string; username: string; links: { html: string } };
  /** Only on `GET /photos/:id`. */
  location?: { name: string | null; city: string | null; country: string | null };
  /** Present on `GET /photos/:id`; may be missing from search results. */
  tags?: { title: string }[];
}

interface UnsplashSearchResponse {
  total_pages: number;
  results: UnsplashPhoto[];
}

interface RawPage {
  records: PhotoRecord[];
  totalPages: number;
}

function withUtm(url: string) {
  return `${url}${url.includes("?") ? "&" : "?"}${UTM}`;
}

function toRecord(raw: UnsplashPhoto): PhotoRecord {
  const description =
    cleanText(raw.description, raw.id) ??
    slugToText(raw.alternative_slugs?.es, raw.id) ??
    cleanText(raw.alt_description, raw.id);
  const cityName = cleanText(raw.location?.city, raw.id);
  const country = cleanText(raw.location?.country, raw.id);
  const location =
    cleanText(raw.location?.name, raw.id) ?? cleanText([cityName, country].filter(Boolean).join(", "), raw.id);

  return {
    id: raw.id,
    width: raw.width,
    height: raw.height,
    color: raw.color ?? "#d6cfc2",
    blurHash: raw.blur_hash,
    alt: cleanText(raw.alt_description, raw.id) ?? description ?? "",
    description: description && toDisplayText(description),
    cityName,
    country,
    location,
    tags: (raw.tags ?? []).map((t) => t.title).slice(0, 6),
    urls: { thumb: raw.urls.thumb, small: raw.urls.small, regular: raw.urls.regular },
    photographer: {
      name: raw.user.name,
      username: raw.user.username,
      profileUrl: withUtm(raw.user.links.html),
    },
    unsplashUrl: withUtm(raw.links.html),
  };
}

/** Composes title/subtitle for a display mode; see `PhotoMode`. */
function present(record: PhotoRecord, mode: PhotoMode, contextCity?: PopularCity): Photo {
  if (mode === "home") {
    return {
      ...record,
      cityName: record.cityName ?? contextCity?.query ?? null,
      title: contextCity?.label ?? record.cityName ?? record.description ?? FALLBACK_TITLE,
      subtitle: record.description,
    };
  }
  return {
    ...record,
    title: record.description ?? record.location ?? FALLBACK_TITLE,
    subtitle: record.tags.length ? formatTags(record.tags.slice(0, 3)) : record.location,
  };
}

// ---------------------------------------------------------------------------
// Transport (cached) — live API or demo fixtures
// ---------------------------------------------------------------------------

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

/** Demo stand-in for Unsplash relevance search: ranks fixtures by matched query terms. */
function searchDemo(query: string, page: number, perPage: number): RawPage {
  const terms = foldText(query).split(/[\s,]+/).filter(Boolean);
  const ranked = DEMO_PHOTOS.map((p) => {
    const haystack = foldText([p.description, p.location, ...p.tags].join(" "));
    return { p, score: terms.filter((t) => haystack.includes(t)).length };
  })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ p }) => p);
  const start = (page - 1) * perPage;
  return {
    records: ranked.slice(start, start + perPage),
    totalPages: Math.max(1, Math.ceil(ranked.length / perPage)),
  };
}

async function rawSearch(query: string, page: number, perPage: number): Promise<RawPage> {
  "use cache";
  cacheLife("hours");

  if (isDemoMode("UNSPLASH_ACCESS_KEY")) return searchDemo(query, page, perPage);

  const data = await unsplashFetch<UnsplashSearchResponse>("/search/photos", {
    query,
    page: String(page),
    per_page: String(perPage),
    content_filter: "high",
  });
  return {
    records: (data?.results ?? []).map(toRecord),
    totalPages: data?.total_pages ?? 0,
  };
}

async function rawPhoto(id: string): Promise<PhotoRecord | null> {
  "use cache";
  cacheLife("days");

  if (isDemoMode("UNSPLASH_ACCESS_KEY")) return DEMO_PHOTOS.find((p) => p.id === id) ?? null;

  const raw = await unsplashFetch<UnsplashPhoto>(`/photos/${encodeURIComponent(id)}`);
  return raw && toRecord(raw);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Deterministic PRNG so one seed always yields the same city order. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], seed: number): T[] {
  const random = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Round-robin merge so neighbouring tiles show different cities. */
function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) {
    for (const list of lists) if (i < list.length) out.push(list[i]);
  }
  return out;
}

/**
 * Home feed: the curated cities in a random (seeded) order, `CITIES_PER_PAGE` per page,
 * each queried as "<city> travel". Pass the returned `seed` back to continue the same order.
 */
export async function fetchPopular({ seed, page = 1 }: { seed?: number; page?: number } = {}): Promise<PhotoSearchResult> {
  if (seed === undefined) {
    await connection();
    seed = Math.floor(Math.random() * 2 ** 32);
  }

  if (isDemoMode("UNSPLASH_ACCESS_KEY")) {
    // The fixture covers too few of the curated cities, so demo mode shuffles it whole.
    const perPage = CITIES_PER_PAGE * PHOTOS_PER_CITY;
    const records = shuffle(DEMO_PHOTOS, seed).slice((page - 1) * perPage, page * perPage);
    return {
      photos: records.map((r) => present(r, "home")),
      page,
      totalPages: Math.ceil(DEMO_PHOTOS.length / perPage),
      seed,
    };
  }

  const cities = shuffle(POPULAR_CITIES, seed).slice((page - 1) * CITIES_PER_PAGE, page * CITIES_PER_PAGE);
  const batches = await Promise.all(
    cities.map(async (city) => {
      const { records } = await rawSearch(`${city.query} travel`, 1, PHOTOS_PER_CITY);
      return records.map((r) => present(r, "home", city));
    }),
  );
  const seen = new Set<string>();
  return {
    photos: interleave(batches).filter((p) => !seen.has(p.id) && seen.add(p.id)),
    page,
    totalPages: Math.ceil(POPULAR_CITIES.length / CITIES_PER_PAGE),
    seed,
  };
}

/** Search bar: Unsplash relevance search, presented in `search` mode. */
export async function searchDestinations(query: string, page = 1): Promise<PhotoSearchResult> {
  const { records, totalPages } = await rawSearch(query.trim(), page, SEARCH_PER_PAGE);
  return { photos: records.map((r) => present(r, "search")), page, totalPages };
}

/** Full photo details (location and tags are only returned by this endpoint). */
export async function getPhoto(id: string): Promise<Photo | null> {
  const record = await rawPhoto(id);
  return record && present(record, "search");
}

/**
 * Sidebar photos. Primary query: location + first 3 tags. If that yields fewer than
 * `limit` usable photos, a secondary "<fallbackCity> landmark travel" query fills the rest.
 * Results are deduplicated by ID, exclude `excludedId`, and are capped at `limit`.
 */
export async function fetchRelated(
  location: string | null,
  tags: string[],
  excludedId: string,
  fallbackCity: string | null,
  limit = RELATED_LIMIT,
): Promise<Photo[]> {
  const seen = new Set([excludedId]);
  const related: Photo[] = [];
  const collect = (records: PhotoRecord[]) => {
    for (const record of records) {
      if (related.length === limit) return;
      if (seen.has(record.id)) continue;
      seen.add(record.id);
      related.push(present(record, "search"));
    }
  };

  const primary = [location, ...tags.slice(0, 3)].filter(Boolean).join(" ").trim();
  if (primary) collect((await rawSearch(primary, 1, RELATED_FETCH)).records);

  if (related.length < limit) {
    const secondary = [fallbackCity, "landmark travel"].filter(Boolean).join(" ");
    collect((await rawSearch(secondary, 1, RELATED_FETCH)).records);
  }
  return related;
}

/**
 * Register a download with Unsplash (required by the API guidelines whenever the
 * user downloads a photo). Never cached: it only counts downloads.
 */
export async function trackDownload(photoId: string): Promise<void> {
  if (isDemoMode("UNSPLASH_ACCESS_KEY")) return;
  await unsplashFetch(`/photos/${encodeURIComponent(photoId)}/download`);
}
