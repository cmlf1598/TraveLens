import Image from "next/image";
import { SaveButton } from "@/components/features/save-button";
import { Badge } from "@/components/ui/badge";
import type { Photo } from "@/types/travel";

export function DestinationHero({ photo }: { photo: Photo }) {
  const creditsPhotographer = photo.photographer.username !== "unsplash";

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div
        className="relative aspect-[4/5] overflow-hidden rounded-2xl sm:aspect-[4/3] lg:aspect-auto lg:min-h-0 lg:flex-1"
        style={{ backgroundColor: photo.color }}
      >
        <Image
          src={photo.urls.regular}
          alt={photo.alt}
          fill
          unoptimized
          preload
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="object-cover"
        />
        <SaveButton photo={photo} variant="hero" className="absolute top-4 right-4" />
        <div className="absolute inset-x-0 bottom-0 bg-scrim px-6 pt-24 pb-6 sm:px-8 sm:pb-8">
          <h1 className="max-w-[22ch] text-3xl leading-tight font-semibold text-white sm:text-4xl">{photo.title}</h1>
          {photo.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Etiquetas">
              {photo.tags.map((tag) => (
                <li key={tag}>
                  <Badge className="border-white/25 bg-white/15 text-white backdrop-blur-sm">{tag}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        Foto{" "}
        {creditsPhotographer && (
          <>
            de{" "}
            <a href={photo.photographer.profileUrl} className="underline underline-offset-2 hover:text-foreground">
              {photo.photographer.name}
            </a>{" "}
          </>
        )}
        en{" "}
        <a href={photo.unsplashUrl} className="underline underline-offset-2 hover:text-foreground">
          Unsplash
        </a>
      </p>
    </div>
  );
}
