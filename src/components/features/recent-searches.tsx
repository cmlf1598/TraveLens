"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { addRecentSearch, clearRecentSearches, removeRecentSearch, useRecentSearches } from "@/lib/recent-searches";

/** Chips for the last searches; renders nothing on the server and until there is history. */
export function RecentSearches() {
  const searches = useRecentSearches();
  if (searches.length === 0) return null;

  return (
    <section aria-label="Búsquedas recientes" className="mx-auto mb-5 flex w-full max-w-[36rem] flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
      <h2 className="font-sans text-xs font-medium text-muted-foreground">Búsquedas recientes</h2>
      <ul className="flex flex-wrap items-center gap-1.5">
        {searches.map((q) => (
          <li key={q} className="flex items-center rounded-full border text-foreground hover:bg-accent">
            <Link
              href={`/?q=${encodeURIComponent(q)}`}
              onClick={() => addRecentSearch(q)}
              className="rounded-full py-1 pr-1 pl-3"
            >
              {q}
            </Link>
            <button
              type="button"
              onClick={() => removeRecentSearch(q)}
              aria-label={`Quitar «${q}» de búsquedas recientes`}
              className="mr-1.5 flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <X aria-hidden className="size-3" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={clearRecentSearches}
        className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Borrar
      </button>
    </section>
  );
}
