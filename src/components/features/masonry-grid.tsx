import { Skeleton } from "@/components/ui/skeleton";
import { PhotoCard } from "@/components/features/photo-card";
import { cn } from "@/lib/utils";
import type { Photo } from "@/types/travel";

const COLUMNS = "columns-2 gap-3 sm:gap-4 md:columns-3 xl:columns-4 2xl:columns-5";
const ITEM = "mb-3 break-inside-avoid sm:mb-4";
const PLACEHOLDER_RATIOS = ["3 / 4", "4 / 5", "1 / 1", "2 / 3", "4 / 3", "3 / 5", "5 / 4", "3 / 4", "2 / 3", "1 / 1"];

interface MasonryGridProps {
  photos: Photo[];
  /** Number of skeleton tiles appended after the photos (e.g. while the next page loads). */
  placeholders?: number;
}

/** Pinterest-style masonry built on CSS columns; tiles keep their intrinsic aspect ratio. */
export function MasonryGrid({ photos, placeholders = 0 }: MasonryGridProps) {
  return (
    <div className={COLUMNS}>
      {photos.map((photo, i) => (
        <div key={photo.id} className={ITEM}>
          <PhotoCard photo={photo} preload={i < 4} />
        </div>
      ))}
      {Array.from({ length: placeholders }, (_, i) => (
        <Skeleton
          key={`placeholder-${i}`}
          className={cn(ITEM, "w-full rounded-xl")}
          style={{ aspectRatio: PLACEHOLDER_RATIOS[i % PLACEHOLDER_RATIOS.length] }}
        />
      ))}
    </div>
  );
}

export function MasonryGridSkeleton() {
  return <MasonryGrid photos={[]} placeholders={15} />;
}
