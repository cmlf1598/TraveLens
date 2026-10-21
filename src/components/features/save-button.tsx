"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { toggleFavorite, useIsFavorite } from "@/lib/favorites";
import { cn } from "@/lib/utils";
import type { Photo } from "@/types/travel";

interface SaveButtonProps {
  photo: Photo;
  variant?: "tile" | "hero";
  className?: string;
}

export function SaveButton({ photo, variant = "tile", className }: SaveButtonProps) {
  const saved = useIsFavorite(photo.id);
  // REVIEWER_NOTE: counts unsaved -> saved clicks only. It is the `key` of the animated elements, so each
  // new save remounts them and replays the CSS animation. 0 means "never saved from this button", so a
  // photo that is already saved on first render, or an unsave, plays nothing.
  const [popCount, setPopCount] = useState(0);
  const popping = popCount > 0 && saved;

  function handleClick() {
    if (toggleFavorite(photo)) {
      setPopCount((n) => n + 1);
      // Unsplash guideline: report a download when a photo is saved. Best effort only.
      fetch(`/api/photos/${photo.id}/download`, { method: "POST" }).catch(() => {});
    }
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Quitar de guardados" : "Guardar"}
      onClick={handleClick}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full bg-white/70 text-foreground shadow-soft backdrop-blur-md transition-[opacity,background-color,transform] duration-200 ease-editorial outline-offset-2 hover:bg-white focus-visible:outline-2 focus-visible:outline-ring active:scale-95",
        variant === "tile" ? "size-9" : "size-11",
        // REVIEWER_NOTE: tile buttons fade in with the card's hover/focus (via the parent's `group`). Opacity
        // (not display/visibility) keeps them in the tab order, and saved ones never hide.
        variant === "tile" &&
          !saved &&
          "opacity-0 focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100",
        className,
      )}
    >
      {popping && (
        <span
          key={`ring-${popCount}`}
          aria-hidden
          data-slot="heart-ring"
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-primary motion-safe:animate-heart-ring"
        />
      )}
      <Heart
        key={popCount}
        data-slot="heart-icon"
        className={cn(
          variant === "tile" ? "size-4.5" : "size-5.5",
          saved && "fill-primary text-primary",
          popping && "motion-safe:animate-heart-pop",
        )}
      />
    </button>
  );
}
