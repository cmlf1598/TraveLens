import Image from "next/image";
import type { Photo } from "@/types/travel";

interface PhotoCardProps {
  photo: Photo;
  onSelect: (photo: Photo) => void;
}

export function PhotoCard({ photo, onSelect }: PhotoCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(photo)}
      className="group relative block w-full overflow-hidden rounded-xl shadow-soft transition-[box-shadow,translate] duration-300 ease-editorial hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ backgroundColor: photo.color, aspectRatio: `${photo.width} / ${photo.height}` }}
    >
      <Image
        src={photo.urls.small}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
        className="h-full w-full object-cover"
      />
      <span className="absolute inset-0 bg-scrim opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="absolute inset-x-3 bottom-3 truncate text-left text-sm text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        {photo.location ?? photo.photographer.name}
      </span>
    </button>
  );
}
