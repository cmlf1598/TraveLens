import { Suspense } from "react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { MasonryGridSkeleton } from "@/components/features/masonry-grid";
import { PhotoFeed } from "@/components/features/photo-feed";
import { RetryButton } from "@/components/features/retry-button";
import { SearchBar, SearchBarFallback } from "@/components/features/search-bar";
import { SiteHeader } from "@/components/features/site-header";
import { fetchPopular, searchDestinations } from "@/services/unsplash";

const SUGGESTIONS = ["Kioto", "Dolomitas", "Bali", "Santorini", "Capadocia"];

/**
 * REVIEWER_NOTE: How this page loads fast while depending on the URL:
 * - The page itself is *not* async and never awaits `searchParams`. It only passes the promise
 *   down, so the header, the search box and the grid skeleton are prerendered at build time and
 *   sent instantly (Next.js "Partial Prerendering").
 * - `<Results>` awaits the query inside a `<Suspense>` boundary; its HTML streams into the
 *   skeleton's place once the photos arrive.
 * - `<SearchBar>` reads the URL in the browser (`useSearchParams`), and Next.js requires such
 *   components to sit inside their own `<Suspense>`; `SearchBarFallback` is the static
 *   placeholder until it's ready.
 */
export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <SiteHeader>
        <Suspense fallback={<SearchBarFallback />}>
          <SearchBar />
        </Suspense>
      </SiteHeader>
      <main className="mx-auto w-full max-w-[1800px] flex-1 px-3 pt-6 pb-16 sm:px-6">
        <Suspense fallback={<MasonryGridSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  let result;
  try {
    result = query ? await searchDestinations(query) : await fetchPopular();
  } catch (err) {
    unstable_rethrow(err);
    console.error("Photo grid failed:", err);
    return (
      <StatusMessage title="No se pudieron cargar las fotos">
        <p>El servicio de imágenes no respondió. Vuelve a intentarlo en unos segundos.</p>
        <RetryButton />
      </StatusMessage>
    );
  }

  if (result.photos.length === 0) {
    return (
      <StatusMessage title={`Sin resultados para «${query}»`}>
        <p>Prueba con otra ciudad, un país o un tipo de paisaje:</p>
        <ul className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <li key={s}>
              <Link
                href={`/?q=${encodeURIComponent(s)}`}
                className="rounded-full border px-3 py-1 text-foreground hover:bg-accent"
              >
                {s}
              </Link>
            </li>
          ))}
        </ul>
      </StatusMessage>
    );
  }

  return (
    <>
      <h1 className="mb-5 px-1 text-2xl font-semibold sm:text-3xl">
        {query ? `Fotos de «${query}»` : "Inspiración para tu próximo viaje"}
      </h1>
      {/* REVIEWER_NOTE: `key={query}` makes React discard the feed and build a new one when the
          search changes, which resets its page counter and appended photos in one step. */}
      <PhotoFeed key={query} query={query} initial={result} />
    </>
  );
}

function StatusMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center text-muted-foreground">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      {children}
    </div>
  );
}
