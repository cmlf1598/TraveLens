"use client";

import { useState } from "react";
import { DetailPanel } from "@/components/features/detail-panel";
import { MasonryGrid } from "@/components/features/masonry-grid";
import type { Photo } from "@/types/travel";

interface ExplorerProps {
  initialPhotos: Photo[];
}

/** Client boundary that owns grid ↔ panel selection state. */
export function Explorer({ initialPhotos }: ExplorerProps) {
  const [selected, setSelected] = useState<Photo | null>(null);

  return (
    <>
      <MasonryGrid photos={initialPhotos} onSelect={setSelected} isLoading={initialPhotos.length === 0} />
      <DetailPanel
        photo={selected}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}
