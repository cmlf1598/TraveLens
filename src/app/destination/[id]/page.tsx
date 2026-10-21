import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/features/back-button";
import { DestinationHero } from "@/components/features/destination-hero";
import { SimilarMosaic, SimilarMosaicSkeleton } from "@/components/features/similar-mosaic";
import { SiteHeader } from "@/components/features/site-header";
import { TravelPlan, TravelPlanSkeleton } from "@/components/features/travel-plan";
import { getPhoto } from "@/services/unsplash";

const PHOTO_ID = /^[\w-]{1,64}$/;

/** Hero | Plan | Similar. On desktop the row fills the viewport below the header. */
const LAYOUT =
  "mx-auto grid w-full max-w-[1800px] flex-1 gap-6 px-4 pt-4 pb-10 sm:px-6 lg:h-[calc(100dvh-4rem)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(14rem,18rem)] lg:pb-6";

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
      <section aria-labelledby="plan-heading" className="min-h-0 lg:overflow-y-auto lg:pr-1">
        <Suspense fallback={<TravelPlanSkeleton />}>
          <TravelPlan photo={photo} />
        </Suspense>
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
