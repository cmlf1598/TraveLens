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
          <Loader2 aria-label="Buscando" className="mr-2.5 size-4 animate-spin text-muted-foreground" />
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

/** Search input bound to the `?q=` URL param; the grid re-renders as the URL changes. */
export function SearchBar() {
  const router = useRouter();
  const urlQuery = useSearchParams().get("q") ?? "";
  const [value, setValue] = useState(urlQuery);
  /** Queries we sent to the URL that it has not caught up with yet. */
  const [inFlight, setInFlight] = useState<string[]>([]);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  const [isPending, startTransition] = useTransition();

  // A URL change is either the echo of our own debounced update (ignore it, so it never
  // overwrites newer keystrokes) or external navigation such as back/forward (mirror it).
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
