# TraveLens Architecture

AI-native, Pinterest-style travel explorer: Unsplash photography in a masonry grid; selecting a photo opens a detail panel with Gemini-generated destination insights.

**Stack:** Next.js 16 (App Router, Turbopack, Cache Components) · React 19 · Tailwind CSS v4 · shadcn/ui (Radix, `radix-nova` style) · lucide-react · zod 4.

> Read `AGENTS.md` first: this Next.js version differs from older training data. Bundled docs live in `node_modules/next/dist/docs/`.

## Layers

```
Browser (client components)
   │  fetch('/api/...')              ← only ever talks to our own origin
   ▼
src/app/api/**/route.ts   (BFF)      ← validate (zod) → call service → toErrorResponse
   │
   ▼
src/services/*.ts         ('server-only')  ← the only code that reads API keys
   │
   ▼
Unsplash API · Gemini API
```

| Path | Responsibility |
|---|---|
| `src/app/api/photos/route.ts` | `GET ?query&page&perPage&orientation` → `PhotoSearchResult` |
| `src/app/api/photos/[id]/download/route.ts` | `POST` → 204; Unsplash download tracking |
| `src/app/api/insights/route.ts` | `POST {photoId, description, location?}` → `DestinationInsight` |
| `src/services/unsplash.ts` | `searchPhotos()`, `trackDownload()` |
| `src/services/gemini.ts` | `getDestinationInsight()` |
| `src/lib/env.ts` | `getServerEnv()`; throws on missing keys |
| `src/lib/errors.ts` | `NotImplementedError`, `UpstreamError`, `toErrorResponse()` |
| `src/types/travel.ts` | Shared contracts (`Photo`, `PhotoSearchResult`, `DestinationInsight`, `ApiError`) |
| `src/components/ui/` | shadcn-generated primitives only; add more with `npx shadcn@latest add <name>` |
| `src/components/features/` | Product components: `Explorer` (client state boundary), `MasonryGrid`, `PhotoCard`, `DetailPanel` |

## BFF rules

1. Route handlers never call external APIs; they validate input, call a service, and map errors via `toErrorResponse` (400 validation · 429 rate limit · 501 not implemented · 502 upstream · 500 unknown).
2. `toErrorResponse` calls `unstable_rethrow` first. Keep it that way, or catching Next.js prerender bail-outs breaks builds.
3. Services `import "server-only"`; importing one from a client component fails the build.
4. Keys live in `.env.local` (see `.env.example`) and are never prefixed `NEXT_PUBLIC_`.
5. Cache Components is on: no `export const revalidate`. Cache inside services with a `'use cache'` helper + `cacheLife(...)`; `use cache` cannot sit directly in a route handler body.
6. Dynamic route params are async: `ctx: RouteContext<'/api/photos/[id]/download'>`, `await ctx.params`.

## Theme ("warm editorial")

Tokens are defined in `src/app/globals.css` (oklch, `:root` + `.dark`, mapped in `@theme inline`).

| Token | Use |
|---|---|
| `background` ivory / `foreground` ink | Page canvas and text |
| `primary` terracotta | CTAs, focus ring, selection |
| `pine` | Secondary brand hue (eyebrows, tags) via `text-pine` / `bg-pine` |
| `muted` / `secondary` sand | Skeletons, quiet surfaces |
| `accent` | Subtle hover surface (shadcn convention, intentionally not pine) |
| `font-display` (Fraunces) / `font-sans` (Inter) | `h1`–`h3` use display automatically; `font-heading` maps to Fraunces too |
| `shadow-soft` / `shadow-lift` | Card rest / hover elevation |
| `bg-scrim` | Gradient overlay for text over photos |
| `ease-editorial` | Default motion curve |

Radius base is `1rem`. Contrast was verified: fg/bg 15.8:1, primary button 4.7:1 (light) and 5.8:1 (dark).

## Current state: skeleton

All service functions have final signatures and throw `NotImplementedError`, so every API route returns **501** after input validation passes. `page.tsx` renders the themed shell with skeleton tiles (`Explorer initialPhotos={[]}`).

## Handoff TODO

1. **Services:** implement `searchPhotos` / `trackDownload` (Unsplash, `Authorization: Client-ID`) and `getDestinationInsight` (`npm i @google/genai`, `client.interactions.create`, model `gemini-3.8-flash`, JSON `response_format` from `z.toJSONSchema`). Implementation notes are in each stub's doc comment.
2. **Masonry grid:** wire search → `/api/photos`, infinite scroll, column balancing, keyboard navigation, blur-hash placeholders.
3. **Detail panel:** fetch `/api/insights` on open, with loading and error states; call the download-tracking route on save/download.
4. **Compliance:** Unsplash attribution links with `?utm_source=travelens&utm_medium=referral`; keep `ixid` on image URLs.
