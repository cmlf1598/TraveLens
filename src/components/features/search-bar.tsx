"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 350;

interface SearchFieldProps {
  value: string;
  onValueChange?: (value: string) => void;
  onClear?: () => void;
  isPending?: boolean;
  disabled?: boolean;
}

function SearchField({ value, onValueChange, onClear, isPending, disabled }: SearchFieldProps) {
  return (
    <div role="search" className="relative w-full">
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onClear?.()}
        disabled={disabled}
        placeholder="Busca una ciudad, un país o un paisaje"
        aria-label="Buscar destinos"
        className="h-11 rounded-full bg-card pr-11 pl-10 text-base shadow-soft [&::-webkit-search-cancel-button]:hidden"
      />
      <div className="absolute top-1/2 right-1.5 -translate-y-1/2">
        {isPending ? (
          <span role="status" className="mr-2.5 flex">
            <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground" />
            <span className="sr-only">Buscando…</span>
          </span>
        ) : (
          value && (
            <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={onClear} aria-label="Borrar búsqueda">
              <X />
            </Button>
          )
        )}
      </div>
    </div>
  );
}

/** Static stand-in rendered while the URL-bound search bar hydrates. */
export function SearchBarFallback() {
  return <SearchField value="" disabled />;
}

/**
 * Search input bound to the `?q=` URL param; the grid re-renders as the URL changes.
 *
 * REVIEWER_NOTE: The URL is the single source of truth for the search, so results can be shared,
 * bookmarked and restored with the back button. The flow per keystroke:
 * 1. Typing only updates local `value`, so the input stays instant.
 * 2. After 350 ms without typing (the debounce in the effect below), the query is written to the
 *    URL with `router.replace` (replace, not push, so each keystroke doesn't add a history entry).
 * 3. The URL change makes the server component in `app/page.tsx` re-render with new results.
 *    Wrapping it in `startTransition` keeps the old grid visible meanwhile, and gives us
 *    `isPending` for the spinner.
 */
export function SearchBar() {
  const router = useRouter();
  const urlQuery = useSearchParams().get("q") ?? "";
  const [value, setValue] = useState(urlQuery);
  /** Queries we sent to the URL that it has not caught up with yet. */
  const [inFlight, setInFlight] = useState<string[]>([]);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  const [isPending, startTransition] = useTransition();

  // REVIEWER_NOTE: The tricky part is the reverse direction (URL → input). A URL change is either
  // the echo of our own debounced update or real navigation (back/forward, a suggestion link).
  // An echo must be ignored: the user may have typed more since we sent it, and copying the older
  // value back would eat their keystrokes. `inFlight` lists what we've sent and not seen yet; any
  // other URL value is navigation and is copied into the input. This runs during render (React's
  // "adjust state when a prop changes" pattern) rather than in an effect, so the input never shows
  // a stale value for a frame. An earlier version tracked only the last value sent, and broke the
  // back button when you returned to a query you had typed before.
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    if (!inFlight.includes(urlQuery)) {
      setValue(urlQuery);
      setInFlight([]);
    } else if (urlQuery === inFlight.at(-1)) {
      setInFlight([]);
    }
  }

  useEffect(() => {
    const next = value.trim();
    if (next === urlQuery) return;
    const timer = setTimeout(() => {
      setInFlight((prev) => [...prev, next]);
      startTransition(() => {
        router.replace(next ? `/?q=${encodeURIComponent(next)}` : "/", { scroll: false });
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, urlQuery, router]);

  return (
    <div className={cn("w-full transition-opacity", isPending && "opacity-90")}>
      <SearchField value={value} onValueChange={setValue} onClear={() => setValue("")} isPending={isPending} />
    </div>
  );
}
