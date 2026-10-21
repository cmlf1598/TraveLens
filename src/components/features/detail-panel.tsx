"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Photo } from "@/types/travel";

interface DetailPanelProps {
  photo: Photo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Skeleton detail panel. Role 3 adds the Gemini insight sections
 * (fetched from `POST /api/insights`) and download tracking.
 */
export function DetailPanel({ photo, open, onOpenChange }: DetailPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {photo && (
          <>
            <div
              className="relative w-full overflow-hidden"
              style={{ backgroundColor: photo.color, aspectRatio: `${photo.width} / ${photo.height}` }}
            >
              <Image src={photo.urls.regular} alt={photo.alt} fill sizes="512px" className="object-cover" />
            </div>
            <SheetHeader>
              <SheetTitle className="text-2xl">{photo.location ?? "Untitled destination"}</SheetTitle>
              <SheetDescription>
                Photo by{" "}
                <a href={photo.photographer.profileUrl} className="underline underline-offset-4">
                  {photo.photographer.name}
                </a>{" "}
                on{" "}
                <a href={photo.unsplashUrl} className="underline underline-offset-4">
                  Unsplash
                </a>
              </SheetDescription>
            </SheetHeader>
            <Separator />
            <div className="flex items-center gap-2 px-4 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-primary" />
              AI insights arrive here.
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
