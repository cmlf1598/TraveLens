import { Skeleton } from "@/components/ui/skeleton";
import { PhotoCard } from "@/components/features/photo-card";
import type { Photo } from "@/types/travel";

const COLUMNS = "columns-2 gap-3 sm:gap-4 md:columns-3 xl:columns-4 2xl:columns-5";
const ITEM = "mb-3 break-inside-avoid sm:mb-4";
const PLACEHOLDER_RATIOS = ["3 / 4", "4 / 5", "1 / 1", "2 / 3", "4 / 3", "3 / 5", "5 / 4", "3 / 4", "2 / 3", "1 / 1"];

interface MasonryGridProps {
  photos: Photo[];
  /** Number of skeleton tiles appended after the photos (e.g. while the next page loads). */
  placeholders?: number;
  /** How many leading photos to load eagerly (the first page); the rest load lazily. */
  eagerCount?: number;
}

/**
 * Pinterest-style masonry built on CSS columns; tiles keep their intrinsic aspect ratio.
 *
 * REVIEWER_NOTE: CSS columns fill top-to-bottom, column by column, so the tiles at the top of
 * the screen are spread across the whole list (roughly items 0, 6, 12, 18 with four columns),
 * not the first few. That's why the entire first page loads eagerly: lazily loading any of those
 * top tiles delays the page's largest image (Next.js warns about this in the console).
 */
export function MasonryGrid({ photos, placeholders = 0, eagerCount = 0 }: MasonryGridProps) {
  return (
    <ul className={COLUMNS}>
      {photos.map((photo, i) => (
        <li key={photo.id} className={ITEM}>
          <PhotoCard photo={photo} eager={i < eagerCount} />
        </li>
      ))}
      {Array.from({ length: placeholders }, (_, i) => (
        <li key={`placeholder-${i}`} className={ITEM} aria-hidden>
          <Skeleton
            className="w-full rounded-xl"
            style={{ aspectRatio: PLACEHOLDER_RATIOS[i % PLACEHOLDER_RATIOS.length] }}
          />
        </li>
      ))}
    </ul>
  );
}

export function MasonryGridSkeleton() {
  return (
    <div role="status" aria-label="Cargando fotos">
      <MasonryGrid photos={[]} placeholders={15} />
    </div>
  );
}
