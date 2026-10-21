import Image from "next/image";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchRelated } from "@/services/unsplash";
import type { Photo } from "@/types/travel";

/**
 * REVIEWER_NOTE: Bento layout for 8 tiles on a 2-column × 7-row grid. The spans below cover all
 * 14 cells exactly: 2x2 (4) + 1x1 (1) + 1x2 (2) + 1x1 (1) + 1x2 (2) + 1x1 (1) + 1x1 (1) + 2x1 (2).
 * `grid-flow-dense` lets small tiles fill holes left beside the tall ones, and `grid-rows-7` with
 * `h-full` divides the sidebar's height into 7 equal rows. The mosaic therefore always fits the
 * column and never scrolls, whatever the screen height.
 *
 *   ┌───┬───┐  row 1-2: tile 0 (2x2)
 *   │ 0     │
 *   ├───┼───┤  row 3-4: tile 1, tile 2 (1x2), tile 3
 *   │ 1 │ 2 │
 *   │ 3 │   │
 *   ├───┼───┤  row 5-6: tile 4 (1x2), tile 5, tile 6
 *   │ 4 │ 5 │
 *   │   │ 6 │
 *   ├───┴───┤  row 7: tile 7 (2x1)
 *   │ 7     │
 *   └───────┘
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
    similar = await fetchRelated(
      photo.location,
      photo.tags,
      photo.id,
      photo.cityName ?? photo.country,
      SPANS.length,
    );
  } catch (err) {
    // REVIEWER_NOTE: The sidebar is optional, so a failure here degrades to "no similar
    // destinations" instead of breaking the whole page; it is still logged for the developer.
    unstable_rethrow(err);
    console.error("Similar destinations failed:", err);
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
              className="object-cover transition-transform duration-500 ease-editorial motion-safe:hover:scale-105"
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
