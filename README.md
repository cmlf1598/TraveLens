# TraveLens

A Pinterest-style travel explorer with AI-generated trip plans. Browse destinations as a masonry grid of Unsplash photos, open one, and get a 3-day plan written by Gemini for the place in the picture. The interface is in Spanish.

- **Home** (`/`): a feed of popular cities, or search results for whatever you type.
- **Destination** (`/destination/[id]`): the photo, an AI travel plan, and a mosaic of similar destinations.

Built with Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS v4, shadcn/ui, the Unsplash API and the Gemini API (`@google/genai`).

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Add your API keys. Copy `.env.example` to `.env.local` and fill in both values:

   ```
   UNSPLASH_ACCESS_KEY=...   # https://unsplash.com/oauth/applications → "Access Key"
   GEMINI_API_KEY=...        # https://aistudio.google.com/apikey
   ```

   `.env.local` is git-ignored. Never prefix these names with `NEXT_PUBLIC_`: that would ship the keys to the browser.

3. Start the dev server and open <http://localhost:3000>:

   ```bash
   npm run dev
   ```

Without keys, the app runs in **demo mode**: 30 sample photos and a fixed sample plan, with a "Modo demo" badge in the header. Demo mode never applies to production builds.

| Script | What it does |
|---|---|
| `npm run dev` | Development server. Opening it from another device on your network (e.g. `http://192.168.1.23:3000`) works because `next.config.ts` allows `192.168.1.*`. |
| `npm run build` / `npm start` | Production build and server (both API keys required). |
| `npm run lint` | ESLint. |
| `npm test` | Unit tests for the text-cleaning helpers (Node's built-in test runner). |

[ARCHITECTURE.md](ARCHITECTURE.md) covers the folder structure, theme tokens and design decisions. Comments marked `REVIEWER_NOTE` in the source explain the trickier sections.

---

## How the API connections work

This section explains [`src/services/unsplash.ts`](src/services/unsplash.ts) and [`src/services/gemini.ts`](src/services/gemini.ts): how each connection is set up, how requests are built and responses read, and how the photos and the AI plan stay about the same place.

### 1. Establishing the connections

Both APIs are called **only from the server**. The browser never talks to Unsplash's API or to Gemini directly, and never sees a key.

```
Browser                         TraveLens server (Next.js)                     External APIs
───────                         ──────────────────────────                     ─────────────
page request ─────────────────▶ Server Components ──┐
                                                    ├─▶ services/unsplash.ts ──▶ api.unsplash.com
fetch('/api/photos') ─────────▶ app/api/photos ─────┤
fetch('/api/ai-plan') ────────▶ app/api/ai-plan ────┴─▶ services/gemini.ts ────▶ generativelanguage.googleapis.com
```

Three things enforce this:

- **Keys are read on the server only.** `getServerEnv()` in [`src/lib/env.ts`](src/lib/env.ts) reads `process.env.UNSPLASH_ACCESS_KEY` / `GEMINI_API_KEY` and throws if one is missing. Next.js only exposes variables prefixed `NEXT_PUBLIC_` to the browser, and these aren't.
- **The services can't end up in browser code.** Both files start with `import "server-only"`, so the build fails if a client component ever imports them.
- **The browser goes through "backend for frontend" (BFF) routes.** When the browser needs data after the page has loaded (more photos while scrolling, the AI plan), it calls TravelLens's own routes in `src/app/api/`. Each route validates its input with zod, calls a service, and turns failures into a safe JSON error.

The two connections are set up differently:

| | Unsplash | Gemini |
|---|---|---|
| Client | Plain `fetch` (no SDK), in `unsplashFetch()` | Official SDK: `new GoogleGenAI({ apiKey })` from `@google/genai` |
| Endpoint | `https://api.unsplash.com` + path | `POST https://generativelanguage.googleapis.com/{api_version}/interactions` (built by the SDK) |
| Authentication | Header `Authorization: Client-ID <UNSPLASH_ACCESS_KEY>` | Header `x-goog-api-key: <GEMINI_API_KEY>` (added by the SDK) |
| Other headers | `Accept-Version: v1` pins the API version | Set by the SDK |
| Timeout | 10 s (`AbortSignal.timeout`) | 20 s (`timeout_ms` request option) |
| Without a key | Demo fixture in `src/services/fixtures/demo-photos.ts` | Fixed sample plan (`demoPlan()`) |

`isDemoMode(key)` decides the last row: it's true only when the key is missing **and** the app isn't a production build.

### 2. Building requests and reading responses

#### Unsplash

**One function makes every call.** `unsplashFetch(path, params)` builds the URL with `new URL(path, "https://api.unsplash.com")`, appends the query parameters, sends the request with the auth headers and a timeout, then:

| Response | Result |
|---|---|
| `200` | Parsed JSON, typed as the expected shape |
| `404` | `null` (the destination page shows "Este destino no existe") |
| Error with header `X-Ratelimit-Remaining: 0`, or `429` | `UpstreamError` with status 429. Unsplash signals an exhausted rate limit with `403`, so the header is the reliable signal. |
| Other error, or a timeout | `UpstreamError` (502 / 504) |

**Three endpoints are used:**

| Endpoint | Parameters | Called by | Purpose |
|---|---|---|---|
| `GET /search/photos` | `query`, `page`, `per_page`, `content_filter=high` | `rawSearch()` → `fetchPopular()`, `searchDestinations()`, `fetchRelated()` | Every list of photos |
| `GET /photos/:id` | none | `rawPhoto()` → `getPhoto()` | The destination page's photo, with location and tags |
| `GET /photos/:id/download` | none | `trackDownload()` | Download counting required by Unsplash's guidelines (not wired to the UI yet) |

**What each public function sends:**

- `fetchPopular({ seed, page })` builds the home feed. It shuffles 30 curated cities using `seed`, takes 4 per page, and searches each as `"<City> travel"` (e.g. `query=Lisbon+travel&per_page=6`). The four result lists are interleaved, so neighbouring tiles show different cities.
- `searchDestinations(query, page)` sends the search box text as `query`, 24 photos per page.
- `fetchRelated(location, tags, excludedId, fallbackCity)` fills "Destinos Similares". Section 3 covers it.

**Both responses are cached.** `rawSearch()` and `rawPhoto()` are marked `"use cache"`, so Next.js stores their results keyed by their arguments: one hour for searches, one day for photo details. Repeat requests cost no Unsplash quota (demo keys allow 50 requests per hour).

**Reading the JSON.** Unsplash returns more fields than the app needs. `toRecord()` maps the raw photo object to TravelLens's own `Photo` type using these paths:

| JSON path | Becomes | Notes |
|---|---|---|
| `total_pages` | `totalPages` | Search only; tells infinite scroll when to stop |
| `results[]` | One `Photo` each | Search only; `/photos/:id` returns a single object |
| `id` | `id` | Used in `/destination/[id]` links |
| `width`, `height` | `width`, `height` | Each tile reserves its aspect ratio before the image loads |
| `color` | `color` | Placeholder background while loading |
| `urls.thumb` | `urls.thumb` | Similar-destinations mosaic (200 px) |
| `urls.small` | `urls.small` | Home and search grid (400 px) |
| `urls.regular` | `urls.regular` | Destination page photo (1080 px) |
| `description` | `description`, 1st choice | Written by the photographer; `cleanDescription()` drops links, @handles, #hashtags and clauses like "follow me on instagram" or camera details |
| `alternative_slugs.es` | `description`, 2nd choice | Unsplash's Spanish summary in URL form, e.g. `tranvia-amarillo-en-la-historica-calle-lisbon-ljhCEaHYWJ8`. The trailing photo ID is cut off and hyphens become spaces. Also used when the photographer's text is over 100 characters. |
| `alt_description` | `alt`; `description`, 3rd choice | English accessibility caption |
| `location.city` | `cityName` | **Only on `/photos/:id`** |
| `location.country` | `country` | Only on `/photos/:id` |
| `location.name` | `location` | Only on `/photos/:id`; repeated parts removed ("Sydney, Sydney, Australia" → "Sydney, Australia") |
| `tags[].title` | `tags` | **Only on `/photos/:id`** |
| `topic_submissions.<slug>` | `tags` fallback | Search results have no tags. Topic slugs whose `status` isn't `"rejected"` are used instead, e.g. `street-photography` → "street photography". |
| `user.name`, `user.links.html` | `photographer` | Photo credit. Links get `?utm_source=travelens&utm_medium=referral`, as Unsplash requires. |
| `links.html` | `unsplashUrl` | "Foto de … en Unsplash" link |

Every text field passes through `cleanText()` ([`src/lib/photo-text.ts`](src/lib/photo-text.ts)), which guarantees that no photo ID or file name (`IMG_1234.JPG`, `DSC_0042`) ever reaches a title.

A real example from search results (trimmed):

```jsonc
{
  "id": "ljhCEaHYWJ8",
  "description": "Summers of Lisbon, Please follow me on instagram @_aayush_guptaa_",
  "alternative_slugs": { "es": "tranvia-amarillo-en-la-historica-calle-lisbon-ljhCEaHYWJ8" },
  "alt_description": "A yellow tram traveling through a street lined with historic buildings in Lisbon, Portugal",
  "urls": { "thumb": "https://images.unsplash.com/photo-…&w=200", "small": "…&w=400", "regular": "…&w=1080" },
  "user": { "name": "Aayush Gupta", "links": { "html": "https://unsplash.com/@…" } }
}
```

becomes `description: "Summers of Lisbon"`: the promotional clause and the handle are removed, and what's left is short enough to beat the slug.

**Title and subtitle depend on where the photo is shown** (`present()`):

| Mode | Used by | Title | Subtitle |
|---|---|---|---|
| `home` | `fetchPopular` | The curated city's Spanish name ("Lisboa") | The description |
| `search` | `searchDestinations`, `fetchRelated`, `getPhoto` | The description | Tags joined with "•" ("Nature • City • Travel") |

#### Gemini

**The request.** `generateTravelPlan(destination, context)` makes one call:

```ts
client.interactions.create(
  {
    model: "gemini-3.5-flash-lite",
    system_instruction: SYSTEM_INSTRUCTION,  // role, language, rules
    input: buildPrompt(destination, context), // the prompt text
    response_format: { type: "text", mime_type: "application/json", schema: responseSchema },
    store: false,                             // don't keep the conversation on Google's side
  },
  { timeout_ms: 20_000 },
);
```

- **`system_instruction`** sets fixed rules: act as a travel planner, answer in neutral Spanish with short sentences, pick the most representative place if the destination is vague, and don't invent precise prices or opening hours.
- **`input`** is assembled from the photo. For the Lisbon tram photo it reads:

  ```
  Crea un plan de viaje de 3 días para: Lisbon, Portugal.
  País: Portugal
  La foto que inspira el viaje muestra: Summers of Lisbon
  Etiquetas de la foto: portugal, lisbon
  ```

  Lines whose data is missing are left out.
- **`response_format.schema`** makes the model answer in a fixed JSON shape. The shape is written once as a zod schema (`travelPlanSchema`) and converted with `z.toJSONSchema()`. Each field's `.describe("…")` text goes into the schema too, acting as an instruction for that field (e.g. `days[].title`: "Tema del día, máximo seis palabras").

**Reading the response.** The SDK returns an `interaction` object, and the answer is a JSON string in `interaction.output_text`. Three steps turn it into data:

1. `JSON.parse(output_text)`; if parsing fails, the value becomes `null`.
2. `travelPlanSchema.safeParse(...)` checks the result against the same zod schema used for the request. Constrained output can still be malformed, so it's validated rather than trusted.
3. If validation fails, the function throws an `UpstreamError` (502), and the panel shows an error with a Reintentar button instead of crashing.

The validated object (`TravelPlan`) has these paths, each rendered by its own component in [`travel-plan-panel.tsx`](src/components/features/travel-plan-panel.tsx):

| JSON path | Rendered as |
|---|---|
| `intro` | Description in the first Card, under the destination name |
| `days[].day`, `days[].title` | One Card per day: number badge and title |
| `days[].activities[]` | Bullet list inside that day's Card |
| `hiddenGem.name`, `hiddenGem.description` | Green-tinted "Joya escondida" Card |
| `localFood[].dish` | A Badge per dish |
| `localFood[].description` | Text under each Badge |

From the live test of the Lisbon photo: days "Exploración por Alfama y Baixa", "Monumentos en Belém y Chiado" and "Modernidad en Parque de las Naciones"; hidden gem "Mirador de Senhora do Monte"; local food "Pastéis de Belém", "Bacalhau à Bras" and "Ginjinha". It arrived in about 2.5 s.

**Caching.** `generateTravelPlan` is also `"use cache"` (one day), keyed by `destination` and the whole `context`, which includes the photo ID. Reopening a destination shows its plan instantly and costs no Gemini quota.

### 3. Keeping the images and the AI plan in sync

The destination page has three panels: the photo, the AI plan, and similar destinations. Each comes from a separate API call, yet all three are about the same place, because **all three are derived from one `Photo` object**.

```
click a tile ──▶ /destination/ljhCEaHYWJ8
                       │
                       ▼   (server)
               getPhoto("ljhCEaHYWJ8")  ─── GET /photos/:id ───▶ Unsplash
                       │
                       ▼
     Photo { urls, title, tags, location, cityName, country, description }
         │                      │                                   │
         ▼                      ▼                                   ▼
   Photo panel            Similar destinations                AI plan (browser)
   urls.regular,          fetchRelated(                       POST /api/ai-plan {
   title, tags              location, tags,                     destination: location ?? cityName ?? title,
                            excludedId: id,                     context: { photoId, description,
                            fallbackCity: cityName ?? country)             country, tags } }
                                │                                   │
                                ▼                                   ▼
                         GET /search/photos ×1–2             generateTravelPlan() ──▶ Gemini
```

How the pieces stay consistent:

1. **The detail endpoint is the anchor.** Search results carry no location or tags, so the destination page always re-fetches the photo with `GET /photos/:id`. That's where `location.name`, `location.city`, `location.country` and `tags[].title` come from.
2. **The same fields feed both queries.** `location` and `tags` build the Unsplash query for similar photos and are also written into Gemini's prompt. Similar photos and the plan therefore describe the same place: "Lisbon, Portugal" plus "portugal, lisbon" produces Lisbon photos and a Lisbon plan.
3. **Similar photos use a two-stage search** (`fetchRelated`):
   - **Primary:** the location plus the first 3 tags, e.g. `"Lisbon, Portugal portugal lisbon"`, 12 results.
   - **Secondary:** if fewer than 8 usable photos come back, `"<cityName or country> landmark travel"` fills the gap.
   - Results are deduplicated by photo ID, the current photo is excluded, and the list is capped at 8, which the mosaic shows as images only (`urls.thumb`).
4. **The plan has a fallback for vague photos.** The destination string falls back from `location` to `cityName` to the photo's title. The prompt always includes what the photo shows, and the system instruction tells Gemini to choose the most representative place when the destination is vague. A photo without location data (say, a beach at sunset) still gets a coherent plan.
5. **Plans can't leak between photos.**
   - `TravelPlanPanel` is rendered with `key={photo.id}`, so opening another destination creates a fresh panel instead of briefly showing the previous plan.
   - An `AbortController` cancels the old request when the panel unmounts.
   - The photo ID inside `context` makes each photo its own cache entry.
6. **The three panels load independently**, so a slow or failing API never blocks the others:
   - The **photo** is fetched on the server before the page renders, since there's nothing to show without it.
   - **Similar destinations** stream from the server behind their own skeleton.
   - The **plan** is fetched by the browser after the page is interactive, so it can show a skeleton, an error, and a Reintentar button.
   - If Unsplash's similar-photos search fails, the sidebar says there are none and the plan still loads. If Gemini fails, the photo and mosaic are unaffected.

**Known gaps:**
- A home tile's title is the curated city ("París"), but the destination page uses the photo's own Unsplash location, so a photo without location data falls back to its description.
- Unsplash place names are usually English, so the plan's heading reads "Lisbon, Portugal" while the plan text is Spanish.
- Spanish descriptions taken from `alternative_slugs.es` have no accents ("Tranvia amarillo…"), because slugs are ASCII.
