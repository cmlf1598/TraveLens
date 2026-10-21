# TraveLens Architecture

AI-native, Pinterest-style travel explorer (UI in Spanish): Unsplash photography in a masonry grid; selecting a photo opens `/destination/[id]` with the photo, a Gemini-generated 3-day plan and a mosaic of similar destinations.

**Stack:** Next.js 16 (App Router, Turbopack, Cache Components) · React 19 · Tailwind CSS v4 · shadcn/ui (Radix, `radix-nova` style) · lucide-react · zod 4.

> Read `AGENTS.md` first: this Next.js version differs from older training data. Bundled docs live in `node_modules/next/dist/docs/`.

## Layers

```
Browser (client components)          Server Components (pages)
   │  fetch('/api/...')                 │  call services directly (server-side, no keys exposed)
   ▼                                    │
src/app/api/**/route.ts   (BFF)         │  ← validate (zod) → call service → toErrorResponse
   │                                    │
   ▼                                    ▼
src/services/*.ts         ('server-only', 'use cache')  ← the only code that reads API keys
   │
   ▼
Unsplash API · Gemini API
```

| Path | Responsibility |
|---|---|
| `src/app/api/photos/route.ts` | `GET ?query&page` → search; `GET ?seed&page` (no query) → curated home feed. Both return `PhotoSearchResult` |
| `src/app/api/photos/[id]/download/route.ts` | `POST` → 204; Unsplash download tracking |
| `src/app/api/ai-plan/route.ts` | `POST { destination, context: { photoId, description?, country?, tags? } }` → `TravelPlan` |
| `src/app/page.tsx` | Home: sticky header with search, masonry grid of `?q=` results (streams behind a skeleton) |
| `src/app/destination/[id]/page.tsx` | Detail: hero · AI plan · "Destinos Similares" mosaic. Photo and mosaic stream from the server; the plan is fetched by the client panel |
| `src/app/saved/page.tsx` | Saved places: a static shell; `SavedPhotos` renders the grid from localStorage after hydration (skeleton until then, so it never flashes the empty state) |
| `src/services/unsplash.ts` | `fetchPopular()`, `searchDestinations()`, `fetchRelated()`, `getPhoto()`, `trackDownload()` (see below) |
| `src/lib/photo-text.ts` | Pure text cleaning: strip IDs/file names, dedupe place segments, slug → text, tag formatting. Unit-tested (`npm test`) |
| `src/services/gemini.ts` | `generateTravelPlan(destination, context)`: `gemini-3.5-flash-lite` via `@google/genai` (Interactions API), JSON schema from zod, cached a day per input |
| `src/services/fixtures/demo-photos.ts` | 30 real Unsplash images, hand-labeled, used only in demo mode |
| `src/lib/local-store.ts` | `createLocalStore()` + `useLocalStore()`: SSR-safe localStorage store (`useSyncExternalStore`, server snapshot = fallback, cross-tab sync); `useHydrated()` |
| `src/lib/favorites.ts` · `src/lib/recent-searches.ts` | Saved photo snapshots (`travelens:favorites`, full `Photo` objects so the saved page needs no API calls) and the last 6 searches (`travelens:recent-searches`), both built on `local-store` |
| `src/lib/grid-navigation.ts` | `findNextTile()`: geometric arrow-key target in the masonry grid |
| `src/lib/env.ts` | `getServerEnv()` (throws on missing keys), `isDemoMode()` |
| `src/lib/errors.ts` | `UpstreamError`, `toErrorResponse()` |
| `src/types/travel.ts` | Shared contracts (`Photo`, `PhotoSearchResult`, `TravelPlan`, `ApiError`) |
| `src/components/ui/` | shadcn-generated primitives only; add more with `npx shadcn@latest add <name>` |
| `src/components/features/` | `SiteHeader`, `SearchBar`, `RecentSearches`, `PhotoFeed` (infinite scroll), `MasonryGrid`, `MasonryKeyboardNav`, `PhotoCard`, `SaveButton`, `SavedLink`, `SavedPhotos`, `DestinationHero`, `TravelPlanPanel`, `SimilarMosaic`, `BackButton`, `RetryButton` |

## BFF rules

1. Route handlers never call external APIs; they validate input, call a service, and map errors via `toErrorResponse` (400 validation · 429 rate limit · 502 upstream · 500 unknown).
2. `toErrorResponse` calls `unstable_rethrow` first. Keep it that way, or catching Next.js prerender bail-outs breaks builds.
3. Services `import "server-only"`; importing one from a client component fails the build.
4. Keys live in `.env.local` (see `.env.example`) and are never prefixed `NEXT_PUBLIC_`.
5. Cache Components is on: no `export const revalidate`. Cache inside services with a `'use cache'` helper + `cacheLife(...)`; `use cache` cannot sit directly in a route handler body.
6. Dynamic route params are async: `ctx: RouteContext<'/api/photos/[id]/download'>`, `await ctx.params`.
7. Pages read `params` / `searchParams` inside a `<Suspense>` child, never at the page's top level, so the shell stays prerendered.
8. Unsplash images use `unoptimized` on `next/image`: their guidelines require hotlinking from `images.unsplash.com`, not re-serving through `/_next/image`.

## Theme ("warm editorial")

Tokens are defined in `src/app/globals.css` (oklch, `:root` + `.dark`, mapped in `@theme inline`).

| Token | Use |
|---|---|
| `background` ivory / `foreground` ink | Page canvas and text |
| `primary` terracotta | CTAs, focus ring, selection |
| `pine` | Secondary brand hue (plan icons, tips) via `text-pine` / `bg-pine` |
| `muted` / `secondary` sand | Skeletons, quiet surfaces |
| `accent` | Subtle hover surface (shadcn convention, intentionally not pine) |
| `font-display` (Fraunces) / `font-sans` (Inter) | `h1`–`h3` use display automatically; `font-heading` maps to Fraunces too |
| `shadow-soft` / `shadow-lift` | Card rest / hover elevation |
| `bg-scrim` | Gradient overlay for text over photos |
| `ease-editorial` | Default motion curve |

Radius base is `1rem`. Contrast was verified: fg/bg 15.8:1, primary button 4.7:1 (light) and 5.8:1 (dark).

## Unsplash integration

| Function | Query | Display mode |
|---|---|---|
| `fetchPopular({ seed?, page })` | 30 curated cities shuffled by `seed`, 4 per page, each as `"<city> travel"` (6 photos), interleaved | `home`: title = city label ("París"), subtitle = description |
| `searchDestinations(query, page)` | The search text, 24 per page | `search`: title = description, subtitle = tags ("Nature • City • Travel") |
| `fetchRelated(location, tags, excludedId, fallbackCity)` | Primary `location + first 3 tags`; if < 8 usable, secondary `"<fallbackCity> landmark travel"`. Deduped by ID, excludes the current photo, max 8 | `search` (the sidebar shows images only) |
| `getPhoto(id)` | `GET /photos/:id` (the only endpoint with location and tags) | `search` |

- **Description** = `description` → `alternative_slugs.es` (with its trailing ID removed) → `alt_description`. The photographer's `description` first loses URLs, @handles, #hashtags and whole clauses that are self-promotion or camera talk (`cleanDescription`); if it is still longer than 100 characters, the Spanish slug wins. Every text field goes through `cleanText`, so titles never contain the photo ID or file names (`IMG_1234.JPG`, `DSC_0042`, `P1030456`).
- **Tags**: Unsplash only returns tags from `GET /photos/:id`. Search results never include them, so search-mode subtitles fall back to the photo's topic categories (`topic_submissions`, rejected ones excluded). In a live check only about 1 in 4 results had any, so many search tiles have no subtitle.
- **Location** segments are deduped ("Sydney, Sydney, Australia" → "Sydney, Australia") without touching names like "Bora Bora". `cityName` is kept separately for the related fallback query and the Gemini prompt.
- Network calls go through two cached helpers: `rawSearch` (1 hour) and `rawPhoto` (1 day). The home feed's randomness lives outside the cache (`connection()` + seed), so each visit gets a new order while each city query stays cached. That matters with the demo key's 50 requests/hour: a cold home page costs 4 requests.

## Demo mode

Outside production, a missing `UNSPLASH_ACCESS_KEY` or `GEMINI_API_KEY` switches that service to bundled sample data (`isDemoMode()`), and the header shows a "Modo demo" badge. Demo search ranks the 30 fixture photos by how many query terms they match (similar to Unsplash relevance), and the demo home feed shuffles the whole fixture, because it covers only 12 of the 30 curated cities; the plan is a fixed sample that says it was not generated by AI. Production always requires both keys.

## UI behaviour

- **Search:** `SearchBar` debounces input (350 ms) and calls `router.replace('/?q=…')` in a transition; the server re-renders the results. Back/forward navigation is mirrored into the input (pending updates are tracked so their echo never overwrites newer keystrokes).
- **Recent searches:** a search is recorded on Enter or when the input loses focus with text in it (never per debounced keystroke). Chips under the header link to `/?q=…`, each removable, plus "Borrar" to clear. Nothing renders until there is history.
- **Grid:** CSS columns (2 → 5); tiles reserve their aspect ratio and show `urls.small`; title and subtitle appear only on hover or keyboard focus. Further pages load from `/api/photos` as the reader nears the end. Tiles fade in staggered (40 ms per tile, capped at 600 ms), counted from the start of each newly loaded page (`staggerFrom`).
- **Keyboard:** arrow keys move focus between tiles by on-screen position (`MasonryKeyboardNav` + `findNextTile`), since CSS columns make DOM order differ from visual order. Tab order is unchanged.
- **Favorites:** `SaveButton` (heart) sits top-right on each tile (shown on hover/focus, always once saved) and on the detail photo. A snapshot of each saved photo persists in localStorage; saving also reports an Unsplash download. `/saved` lists them newest first (header link "Guardados" with a count); unsaving there removes the tile at once. A save plays a heart pop with a ring burst. That animation and the tile fade-in are `motion-safe:` only.
- **Detail:** the left column shows `urls.regular` with only the title and tags overlaid; the photo credit sits under the image. The similar-destinations mosaic is a fixed 2 × 7 grid (spans 2x2 · 1x1 · 1x2 · 1x1 · 1x2 · 1x1 · 1x1 · 2x1) showing `urls.thumb`, so 8 tiles never scroll.

## AI travel plan

`TravelPlanPanel` (client component, right column) posts to `/api/ai-plan` after the page loads and owns the loading → success / error → retry states (while loading, a "La IA está creando tu plan perfecto" banner steps through timed status messages naming the destination, above the skeleton); it is keyed by photo ID so navigating between destinations starts fresh, and it aborts its request on unmount. The plan JSON (`intro`, 3 `days` with activities, `hiddenGem`, `localFood`) is rendered as one Card per day, a pine-tinted Card for the hidden gem, and Badges for local dishes.

- SDK: `@google/genai`. The older `@google/generative-ai` is deprecated (support ended 30 Nov 2025, repo archived 16 Dec 2025).
- Model: `gemini-3.5-flash-lite` (~2–2.5 s). Measured alternatives for the same prompt: `gemini-3-flash-preview` 6–52 s, `gemini-3.8-flash` 10–60 s.

## Development notes

- **Opening the dev server from another address** (e.g. `http://192.168.1.23:3000` instead of `localhost`): Next.js 16 refuses to serve its development JavaScript to unknown origins, so the page renders but never becomes interactive (no search, no AI plan). `allowedDevOrigins: ["192.168.1.*"]` in `next.config.ts` allows the local network; add other hosts there if needed.
- **Reading the code:** comments marked `REVIEWER_NOTE` explain the non-obvious parts: URL-synced search, infinite scroll, caching, the seeded home feed, the bento grid, AI output validation and error mapping. Search for that tag to tour them.
- **Errors are logged server-side** with the service name (`[unsplash] …`, `[gemini] …`); the browser only receives a generic message and status (400 / 429 / 502 / 504 / 500).

## Known limitations

- Spanish text from `alternative_slugs.es` has no accents or capitalised proper nouns ("La opera de sidney"), because slugs are ASCII. `alt_description` and tags are English.
- Verified live (2026-10-20): search results include `alternative_slugs` (9 languages) but no `tags`, `location`, `short_description` or `breadcrumbs`.
- An unknown `/destination/[id]` renders the not-found page with HTTP 200, because the shell has already streamed (expected with Partial Prerendering).

## Handoff TODO

1. Review more live searches for description noise the clause filters miss; extend `PROMO_CLAUSE` / `GEAR_CLAUSE` in `src/lib/photo-text.ts` with a test for each case.
2. Blur-hash placeholders.
