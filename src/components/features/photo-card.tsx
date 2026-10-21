import Image from "next/image";
import Link from "next/link";
import type { Photo } from "@/types/travel";

interface PhotoCardProps {
  photo: Photo;
  preload?: boolean;
}

export function PhotoCard({ photo, preload = false }: PhotoCardProps) {
  return (
    <Link
      href={`/destination/${photo.id}`}
      className="group relative block overflow-hidden rounded-xl outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
      style={{ backgroundColor: photo.color, aspectRatio: `${photo.width} / ${photo.height}` }}
    >
      {/* Unsplash requires hotlinking, so images bypass the Next.js optimizer. */}
      <Image
        src={photo.urls.small}
        alt={photo.alt}
        width={400}
        height={Math.round((400 * photo.height) / photo.width)}
        unoptimized
        preload={preload}
        className="size-full object-cover"
      />
      <div className="absolute inset-0 flex flex-col justify-end bg-scrim p-4 opacity-0 transition-opacity duration-200 ease-editorial group-hover:opacity-100 group-focus-visible:opacity-100">
        <p className="line-clamp-2 font-display text-lg leading-snug font-medium text-white">{photo.title}</p>
        {photo.subtitle && <p className="mt-1 line-clamp-2 text-sm text-white/80">{photo.subtitle}</p>}
      </div>
    </Link>
  );
}
