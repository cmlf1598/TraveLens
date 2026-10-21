import { Skeleton } from "@/components/ui/skeleton";
import { PhotoCard } from "@/components/features/photo-card";
import { cn } from "@/lib/utils";
import type { Photo } from "@/types/travel";

const COLUMNS = "columns-2 gap-3 sm:gap-4 md:columns-3 xl:columns-4 2xl:columns-5";
const ITEM = "mb-3 break-inside-avoid sm:mb-4";
const ENTRANCE =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 fill-mode-both duration-500";
const STAGGER_STEP_MS = 40;
const STAGGER_MAX_MS = 600;
const PLACEHOLDER_RATIOS = ["3 / 4", "4 / 5", "1 / 1", "2 / 3", "4 / 3", "3 / 5", "5 / 4", "3 / 4", "2 / 3", "1 / 1"];

interface MasonryGridProps {
  photos: Photo[];
  /** Number of skeleton tiles appended after the photos (e.g. while the next page loads). */
  placeholders?: number;
  /** How many leading photos to load eagerly (the first page); the rest load lazily. */
  eagerCount?: number;
  /** Index of the first photo of the newest batch; entrance delays count from here. Defaults to 0. */
  staggerFrom?: number;
}

/**
 * Pinterest-style masonry built on CSS columns; tiles keep their intrinsic aspect ratio.
 *
 * REVIEWER_NOTE: CSS columns fill top-to-bottom, column by column, so the tiles at the top of
 * the screen are spread across the whole list (roughly items 0, 6, 12, 18 with four columns),
 * not the first few. That's why the entire first page loads eagerly: lazily loading any of those
 * top tiles delays the page's largest image (Next.js warns about this in the console).
 *
 * REVIEWER_NOTE: the entrance delay is relative to `staggerFrom` because tiles already on screen are
 * kept by `key` and never re-animate. Counting from the absolute index would make page 2+ wait the
 * full cap before its first tile appears; counting from the batch start staggers each page from zero.
 */
export function MasonryGrid({ photos, placeholders = 0, eagerCount = 0, staggerFrom = 0 }: MasonryGridProps) {
  return (
    <ul className={COLUMNS}>
      {photos.map((photo, i) => (
        <li
          key={photo.id}
          className={cn(ITEM, ENTRANCE)}
          style={{ animationDelay: `${Math.min(Math.max(i - staggerFrom, 0) * STAGGER_STEP_MS, STAGGER_MAX_MS)}ms` }}
        >
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
