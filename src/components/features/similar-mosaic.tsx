import Image from "next/image";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getSimilarPhotos } from "@/services/unsplash";
import type { Photo } from "@/types/travel";

/**
 * Bento layout for 8 tiles on a 2 × 7 grid (14 cells, no gaps):
 * 2x2 · 1x1 · 1x2 · 1x1 · 1x2 · 1x1 · 1x1 · 2x1. Fixed rows keep every
 * tile inside the sidebar's height, so the mosaic never scrolls.
 */
const SPANS = [
  "col-span-2 row-span-2",
  "",
  "row-span-2",
  "",
  "row-span-2",
  "",
  "",
  "col-span-2",
];
const MOSAIC = "grid h-[36rem] grid-flow-dense grid-cols-2 grid-rows-7 gap-2 lg:h-full lg:min-h-0";

export async function SimilarMosaic({ photo }: { photo: Photo }) {
  let similar: Photo[];
  try {
    similar = await getSimilarPhotos(photo, SPANS.length);
  } catch (err) {
    unstable_rethrow(err);
    similar = [];
  }

  if (similar.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay destinos similares para esta foto.</p>;
  }

  return (
    <ul className={MOSAIC}>
      {similar.map((item, i) => (
        <li key={item.id} className={cn("min-h-0", SPANS[i])}>
          <Link
            href={`/destination/${item.id}`}
            aria-label={item.title}
            className="relative block size-full overflow-hidden rounded-lg outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
            style={{ backgroundColor: item.color }}
          >
            <Image
              src={item.urls.thumb}
              alt=""
              fill
              unoptimized
              sizes="10rem"
              className="object-cover transition-transform duration-500 ease-editorial hover:scale-105"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SimilarMosaicSkeleton() {
  return (
    <div className={MOSAIC} aria-hidden>
      {SPANS.map((span, i) => (
        <Skeleton key={i} className={cn("rounded-lg", span)} />
      ))}
    </div>
  );
}
