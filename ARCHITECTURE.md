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
| `src/app/api/insights/route.ts` | `POST {photoId, title, city?, country?, tags?}` → `DestinationInsight` |
| `src/app/page.tsx` | Home: sticky header with search, masonry grid of `?q=` results (streams behind a skeleton) |
| `src/app/destination/[id]/page.tsx` | Detail: hero · AI plan · "Destinos Similares" mosaic; each column streams behind its own skeleton |
| `src/services/unsplash.ts` | `fetchPopular()`, `searchDestinations()`, `fetchRelated()`, `getPhoto()`, `trackDownload()` (see below) |
| `src/lib/photo-text.ts` | Pure text cleaning: strip IDs/file names, dedupe place segments, slug → text, tag formatting. Unit-tested (`npm test`) |
| `src/services/gemini.ts` | `getDestinationInsight()`: `gemini-3.8-flash` via the Interactions API, JSON schema from zod |
| `src/services/fixtures/demo-photos.ts` | 30 real Unsplash images, hand-labeled, used only in demo mode |
| `src/lib/env.ts` | `getServerEnv()` (throws on missing keys), `isDemoMode()` |
| `src/lib/errors.ts` | `UpstreamError`, `toErrorResponse()` |
| `src/types/travel.ts` | Shared contracts (`Photo`, `PhotoSearchResult`, `DestinationInsight`, `ApiError`) |
| `src/components/ui/` | shadcn-generated primitives only; add more with `npx shadcn@latest add <name>` |
| `src/components/features/` | `SiteHeader`, `SearchBar`, `PhotoFeed` (infinite scroll), `MasonryGrid`, `PhotoCard`, `DestinationHero`, `TravelPlan`, `SimilarMosaic`, `BackButton`, `RetryButton` |

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

- **Description** = `description` → `alternative_slugs.es` (with its trailing ID removed) → `alt_description`. Every text field goes through `cleanText`, so titles never contain the photo ID or file names (`IMG_1234.JPG`, `DSC_0042`, `P1030456`).
- **Location** segments are deduped ("Sydney, Sydney, Australia" → "Sydney, Australia") without touching names like "Bora Bora". `cityName` is kept separately for the related fallback query and the Gemini prompt.
- Network calls go through two cached helpers: `rawSearch` (1 hour) and `rawPhoto` (1 day). The home feed's randomness lives outside the cache (`connection()` + seed), so each visit gets a new order while each city query stays cached. That matters with the demo key's 50 requests/hour: a cold home page costs 4 requests.

## Demo mode

Outside production, a missing `UNSPLASH_ACCESS_KEY` or `GEMINI_API_KEY` switches that service to bundled sample data (`isDemoMode()`), and the header shows a "Modo demo" badge. Demo search ranks the 30 fixture photos by how many query terms they match (similar to Unsplash relevance), and the demo home feed shuffles the whole fixture, because it covers only 12 of the 30 curated cities; the plan is a fixed sample that says it was not generated by AI. Production always requires both keys.

## UI behaviour

- **Search:** `SearchBar` debounces input (350 ms) and calls `router.replace('/?q=…')` in a transition; the server re-renders the results. Back/forward navigation is mirrored into the input (pending updates are tracked so their echo never overwrites newer keystrokes).
- **Grid:** CSS columns (2 → 5); tiles reserve their aspect ratio and show `urls.small`; title and subtitle appear only on hover or keyboard focus. Further pages load from `/api/photos` as the reader nears the end.
- **Detail:** the left column shows `urls.regular` with only the title and tags overlaid; the photo credit sits under the image. The similar-destinations mosaic is a fixed 2 × 7 grid (spans 2x2 · 1x1 · 1x2 · 1x1 · 1x2 · 1x1 · 1x1 · 2x1) showing `urls.thumb`, so 8 tiles never scroll.

## Known limitations

- Spanish text from `alternative_slugs.es` has no accents or capitalised proper nouns ("La opera de sidney"), because slugs are ASCII. `alt_description` and tags are English.
- The live-API path was verified against a mocked Unsplash (realistic payloads, request log), not the real service: field availability in search results (`tags`, `alternative_slugs`) should be confirmed once a key is added.
- An unknown `/destination/[id]` renders the not-found page with HTTP 200, because the shell has already streamed (expected with Partial Prerendering).

## Handoff TODO

1. Add real keys to `.env.local` and review live results (titles, related-photo relevance, Gemini plan quality and latency).
2. Call `POST /api/photos/[id]/download` when a download or save action is added (Unsplash guideline).
3. Blur-hash placeholders and keyboard navigation across the grid.
