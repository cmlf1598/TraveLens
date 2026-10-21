"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MasonryGrid, MasonryGridSkeleton } from "@/components/features/masonry-grid";
import { MasonryKeyboardNav } from "@/components/features/masonry-keyboard-nav";
import { useFavorites } from "@/lib/favorites";
import { useHydrated } from "@/lib/local-store";

/** Matches a page of the photo feed, which loads eagerly for the same reason (see `MasonryGrid`). */
const EAGER_COUNT = 24;

/** The saved-photos grid, read from localStorage; unsaving a tile removes it right away. */
export function SavedPhotos() {
  const photos = useFavorites();
  const hydrated = useHydrated();

  if (!hydrated) return <MasonryGridSkeleton />;

  if (photos.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center text-muted-foreground">
        <Heart aria-hidden className="size-8 text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">Aún no has guardado ningún lugar</h1>
        <p>Toca el corazón de cualquier foto para guardarla aquí.</p>
        <Button asChild className="rounded-full">
          <Link href="/">Explorar destinos</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex items-baseline gap-3 px-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">Guardados</h1>
        <p className="text-sm text-muted-foreground" role="status">
          {photos.length} {photos.length === 1 ? "lugar" : "lugares"}
        </p>
      </div>
      <MasonryKeyboardNav>
        <MasonryGrid photos={photos} eagerCount={EAGER_COUNT} />
      </MasonryKeyboardNav>
    </>
  );
}
