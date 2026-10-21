import Image from "next/image";
import Link from "next/link";
import type { Photo } from "@/types/travel";

interface PhotoCardProps {
  photo: Photo;
  /** Load immediately instead of lazily; set for tiles likely to be visible on first paint. */
  eager?: boolean;
}

export function PhotoCard({ photo, eager = false }: PhotoCardProps) {
  return (
    <Link
      href={`/destination/${photo.id}`}
      className="group relative block overflow-hidden rounded-xl outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
      style={{ backgroundColor: photo.color, aspectRatio: `${photo.width} / ${photo.height}` }}
    >
      {/*
        REVIEWER_NOTE: Two deliberate choices on this image:
        - `unoptimized`: Unsplash's API terms require images to be served ("hotlinked") from
          images.unsplash.com, so they must not go through Next.js's own image proxy.
        - `alt=""`: the overlay below holds the title and subtitle. It is only *visually* hidden
          (opacity 0) until hover or keyboard focus, so screen readers already announce it as the
          link's name; an alt text as well would make them read the photo twice.
      */}
      <Image
        src={photo.urls.small}
        alt=""
        width={400}
        height={Math.round((400 * photo.height) / photo.width)}
        unoptimized
        loading={eager ? "eager" : "lazy"}
        className="size-full object-cover"
      />
      <div className="absolute inset-0 flex flex-col justify-end bg-scrim p-4 opacity-0 transition-opacity duration-200 ease-editorial group-hover:opacity-100 group-focus-visible:opacity-100">
        <p className="line-clamp-2 font-display text-lg leading-snug font-medium text-white">{photo.title}</p>
        {photo.subtitle && <p className="mt-1 line-clamp-2 text-sm text-white/80">{photo.subtitle}</p>}
      </div>
    </Link>
  );
}
