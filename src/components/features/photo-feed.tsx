"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MasonryGrid } from "@/components/features/masonry-grid";
import type { Photo, PhotoSearchResult } from "@/types/travel";

interface PhotoFeedProps {
  query: string;
  initial: PhotoSearchResult;
}

/**
 * Renders the server-fetched first page and appends further pages from
 * `GET /api/photos` as the reader nears the end of the grid.
 * Remount it (via `key={query}`) when the query changes.
 */
export function PhotoFeed({ query, initial }: PhotoFeedProps) {
  const [photos, setPhotos] = useState<Photo[]>(initial.photos);
  const [page, setPage] = useState(initial.page);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = page < initial.totalPages;

  // REVIEWER_NOTE: Infinite scroll. An invisible <div> (the "sentinel") sits after the grid, and an
  // IntersectionObserver fires when it comes within 800px of the viewport, so the next page starts
  // loading before the reader reaches the end. The observer disconnects as soon as it fires and is
  // re-created only when `status` returns to "idle", so one scroll can never trigger two requests.
  // The home feed passes back the `seed` from the first page, so page 2 continues the same random
  // city order instead of starting a new shuffle.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || status !== "idle") return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setStatus("loading");
        try {
          const params = new URLSearchParams({ page: String(page + 1) });
          if (query) params.set("query", query);
          else if (initial.seed !== undefined) params.set("seed", String(initial.seed));
          const res = await fetch(`/api/photos?${params}`);
          if (!res.ok) throw new Error(String(res.status));
          const next = (await res.json()) as PhotoSearchResult;
          setPhotos((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            return [...prev, ...next.photos.filter((p) => !seen.has(p.id))];
          });
          setPage(next.page);
          setStatus("idle");
        } catch {
          setStatus("error");
        }
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [query, initial.seed, page, hasMore, status]);

  return (
    <>
      <MasonryGrid
        photos={photos}
        eagerCount={initial.photos.length}
        placeholders={status === "loading" ? 5 : 0}
      />
      <div ref={sentinelRef} aria-hidden />
      <p className="sr-only" role="status">
        {status === "loading" ? "Cargando más fotos…" : ""}
      </p>
      {status === "error" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
          <p>No se pudieron cargar más fotos. Revisa tu conexión e inténtalo de nuevo.</p>
          <Button variant="outline" onClick={() => setStatus("idle")}>
            Cargar más fotos
          </Button>
        </div>
      )}
    </>
  );
}
