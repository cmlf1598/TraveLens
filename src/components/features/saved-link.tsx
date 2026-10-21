"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/lib/favorites";
import { cn } from "@/lib/utils";

/** Header link to the saved page, with the number of saved photos once there are any. */
export function SavedLink() {
  const count = useFavorites().length;

  return (
    <Button asChild variant="ghost" className="rounded-full">
      <Link href="/saved" aria-label={count > 0 ? `Guardados (${count})` : "Guardados"}>
        <Heart className={cn(count > 0 && "fill-primary text-primary")} />
        <span className="hidden sm:inline">Guardados</span>
        {count > 0 && <span className="text-muted-foreground tabular-nums">{count}</span>}
      </Link>
    </Button>
  );
}
