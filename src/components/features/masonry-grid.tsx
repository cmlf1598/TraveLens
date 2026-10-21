import { Skeleton } from "@/components/ui/skeleton";
import { PhotoCard } from "@/components/features/photo-card";
import type { Photo } from "@/types/travel";

interface MasonryGridProps {
  photos: Photo[];
  onSelect: (photo: Photo) => void;
  isLoading?: boolean;
}

const PLACEHOLDER_RATIOS = ["3 / 4", "4 / 5", "1 / 1", "2 / 3", "4 / 3", "3 / 5", "5 / 4", "3 / 4"];

/**
 * Skeleton masonry built on CSS columns. Role 2 owns the real layout
 * (column balancing, infinite scroll, keyboard navigation).
 */
export function MasonryGrid({ photos, onSelect, isLoading = false }: MasonryGridProps) {
  return (
    <div className="columns-2 gap-4 md:columns-3 xl:columns-5 [&>*]:mb-4 [&>*]:break-inside-avoid">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} onSelect={onSelect} />
      ))}
      {isLoading &&
        PLACEHOLDER_RATIOS.map((ratio, i) => (
          <Skeleton key={i} className="w-full rounded-xl" style={{ aspectRatio: ratio }} />
        ))}
    </div>
  );
}
