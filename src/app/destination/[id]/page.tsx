import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/features/back-button";
import { DestinationHero } from "@/components/features/destination-hero";
import { SimilarMosaic, SimilarMosaicSkeleton } from "@/components/features/similar-mosaic";
import { SiteHeader } from "@/components/features/site-header";
import { TravelPlanPanel, TravelPlanSkeleton } from "@/components/features/travel-plan-panel";
import { getPhoto } from "@/services/unsplash";

const PHOTO_ID = /^[\w-]{1,64}$/;

/**
 * Hero | Plan | Similar. On desktop the row fills exactly the viewport below the header
 * (4rem + 1px border); the plan column scrolls on its own.
 *
 * REVIEWER_NOTE: Three classes make the "fits the screen exactly" layout work on desktop (`lg:`):
 * - `h-[calc(100dvh-4rem-1px)]`: the grid is the screen height minus the header.
 * - `flex-none`: the page body is a flex column, and `flex-1` (used on mobile) would override that
 *   height and let the grid grow with its content.
 * - `grid-rows-[minmax(0,1fr)]`: by default a grid row grows to fit its tallest child (here, a long
 *   AI plan). `minmax(0, 1fr)` pins the row to the grid's height, so the plan column scrolls
 *   instead of pushing the photo and the mosaic off screen. A live plan exposed this; the short
 *   demo plan never did.
 */
const LAYOUT =
  "mx-auto grid w-full max-w-[1800px] flex-1 gap-6 px-4 pt-4 pb-10 sm:px-6 lg:h-[calc(100dvh-4rem-1px)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(14rem,18rem)] lg:flex-none lg:grid-rows-[minmax(0,1fr)] lg:pb-6";

export default function DestinationPage({ params }: PageProps<"/destination/[id]">) {
  return (
    <>
      <SiteHeader leading={<BackButton />} />
      <Suspense fallback={<DestinationSkeleton />}>
        <Destination params={params} />
      </Suspense>
    </>
  );
}

async function Destination({ params }: Pick<PageProps<"/destination/[id]">, "params">) {
  const { id } = await params;
  if (!PHOTO_ID.test(id)) notFound();
  const photo = await getPhoto(id);
  if (!photo) notFound();

  return (
    <main className={LAYOUT}>
      <DestinationHero photo={photo} />
      {/* tabIndex: on desktop this column scrolls on its own; keyboard users can only scroll a
          region that can take focus. */}
      <section
        aria-labelledby="plan-heading"
        tabIndex={0}
        className="min-h-0 rounded-xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring lg:overflow-y-auto lg:pr-1"
      >
        {/* REVIEWER_NOTE: The page has three loading strategies on purpose. The photo is awaited
            here on the server (nothing to show without it). The mosaic streams from the server
            behind its own <Suspense>. The AI plan is fetched by the browser (`TravelPlanPanel`
            is a client component), so the page is interactive before the slowest call finishes
            and the plan can offer a Retry button without reloading the page. */}
        <TravelPlanPanel
          key={photo.id}
          destination={photo.location ?? photo.cityName ?? photo.title}
          context={{
            photoId: photo.id,
            description: photo.description ?? undefined,
            country: photo.country ?? undefined,
            tags: photo.tags,
          }}
        />
      </section>
      <SimilarSidebar>
        <Suspense fallback={<SimilarMosaicSkeleton />}>
          <SimilarMosaic photo={photo} />
        </Suspense>
      </SimilarSidebar>
    </main>
  );
}

function SimilarSidebar({ children }: { children: React.ReactNode }) {
  return (
    <aside aria-labelledby="similar-heading" className="flex min-h-0 flex-col gap-3">
      <h2 id="similar-heading" className="text-xl font-semibold">
        Destinos Similares
      </h2>
      {children}
    </aside>
  );
}

function DestinationSkeleton() {
  return (
    <main className={LAYOUT} aria-busy>
      <Skeleton className="aspect-[4/5] rounded-2xl sm:aspect-[4/3] lg:aspect-auto lg:h-full" />
      <TravelPlanSkeleton />
      <SimilarSidebar>
        <SimilarMosaicSkeleton />
      </SimilarSidebar>
    </main>
  );
}
