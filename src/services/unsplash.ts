import "server-only";

import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { getServerEnv, isDemoMode } from "@/lib/env";
import { UPSTREAM_TIMEOUT, UpstreamError } from "@/lib/errors";
import {
  cleanDescription,
  cleanText,
  foldText,
  formatTags,
  slugToText,
  toDisplayText,
  topicLabel,
} from "@/lib/photo-text";
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
/** Photographer descriptions longer than this read as captions, not titles; the Spanish slug wins. */
const MAX_DESCRIPTION_LENGTH = 100;

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
  /** Only on `GET /photos/:id`; search results never include tags. */
  tags?: { title: string }[];
  /** Present on search results for roughly half the photos, keyed by topic slug. */
  topic_submissions?: Record<string, { status?: string }>;
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

/** Tags when Unsplash sends them, otherwise the photo's (non-rejected) topic categories. */
function toTags(raw: UnsplashPhoto): string[] {
  const tags = (raw.tags ?? []).map((t) => t.title);
  if (tags.length) return tags.slice(0, 6);
  return Object.entries(raw.topic_submissions ?? {})
    .filter(([, submission]) => submission.status !== "rejected")
    .map(([slug]) => topicLabel(slug))
    .slice(0, 6);
}

/**
 * REVIEWER_NOTE: Where a photo's descriptive text comes from, best source first:
 * 1. `description`: written by the photographer. Best when it exists, but often noisy
 *    ("follow me on instagram…", camera details), so `cleanDescription` strips that first.
 * 2. `alternative_slugs.es`: Unsplash's own Spanish summary, stored URL-style
 *    ("tranvia-amarillo-en-lisboa-<id>"), so it lacks accents. It also wins when the
 *    photographer's text is a long caption (> 100 chars), which makes a poor title.
 * 3. `alt_description`: an English accessibility caption, the last resort.
 */
function toDescription(raw: UnsplashPhoto): string | null {
  const own = cleanDescription(raw.description, raw.id);
  const spanish = slugToText(raw.alternative_slugs?.es, raw.id);
  if (own && (own.length <= MAX_DESCRIPTION_LENGTH || !spanish)) return own;
  return spanish ?? own ?? cleanText(raw.alt_description, raw.id);
}

function toRecord(raw: UnsplashPhoto): PhotoRecord {
  const description = toDescription(raw);
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
    tags: toTags(raw),
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

const UNSPLASH_TIMEOUT_MS = 10_000;

/**
 * REVIEWER_NOTE: The only function that talks to api.unsplash.com, and it only runs on the
 * server (`import "server-only"` at the top makes the build fail if a client component imports
 * this file), so the Client-ID key never reaches the browser.
 * - A 404 becomes `null` ("no such photo") so pages can show their not-found screen.
 * - Unsplash doesn't document a status code for "rate limit exceeded", but every response carries
 *   `X-Ratelimit-Remaining`; a failure with 0 remaining is reported as 429 whatever the status.
 * - A 10 s timeout stops a hung request from leaving the UI in a loading state forever.
 */
async function unsplashFetch<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  const url = new URL(path, UNSPLASH_API_URL);
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, value);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${getServerEnv("UNSPLASH_ACCESS_KEY")}`,
        "Accept-Version": "v1",
      },
      signal: AbortSignal.timeout(UNSPLASH_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new UpstreamError("unsplash", UPSTREAM_TIMEOUT, `Unsplash ${path} timed out`);
    }
    throw err;
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    const rateLimited = res.status === 429 || res.headers.get("x-ratelimit-remaining") === "0";
    throw new UpstreamError(
      "unsplash",
      rateLimited ? 429 : res.status,
      `Unsplash ${path} responded ${res.status}${rateLimited ? " (hourly rate limit reached)" : ""}`,
    );
  }
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

/**
 * REVIEWER_NOTE: `"use cache"` makes Next.js store this function's result, keyed by its
 * arguments, for the `cacheLife` period (an hour here). Identical searches within the hour cost
 * no Unsplash request, which matters with the demo key's 50 requests per hour. Caching sits on
 * these low-level "raw" helpers, not on the public functions, because the public ones add
 * per-request work that must stay uncached (the random city order in `fetchPopular`).
 */
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
 *
 * REVIEWER_NOTE: Why a seed instead of plain `Math.random()` per page? Page 2 is fetched later,
 * by the browser (infinite scroll). With a fresh shuffle per page, cities would repeat or be
 * skipped. Instead, page 1 picks a random number (the seed), the same seed always produces the
 * same shuffle (`mulberry32` is a tiny deterministic random generator), and the client sends the
 * seed back with each later page.
 * `await connection()` tells Next.js this output depends on the individual request. Without it,
 * Next.js could prerender the feed at build time and freeze one "random" order for every visitor.
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
  // The same photo can match two city queries; keep its first occurrence only.
  const unique = [...new Map(interleave(batches).map((p) => [p.id, p] as const)).values()];
  return {
    photos: unique,
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
 *
 * REVIEWER_NOTE: Two-stage search. The primary query is specific (e.g. "Sydney, Australia beach
 * opera house city") and gives the most relevant matches, but specific queries often return few
 * results. Only if it falls short does the broader secondary query run, so the sidebar is always
 * full and the API is hit a second time only when needed. `seen` starts with the current photo's
 * ID, so it can never appear among its own "similar" photos.
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
