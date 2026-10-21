import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isDemoMode } from "@/lib/env";

interface SiteHeaderProps {
  /** Content placed before the wordmark (e.g. a back button). */
  leading?: React.ReactNode;
  /** Centered slot, used by the home page for the search bar. */
  children?: React.ReactNode;
}

export function SiteHeader({ leading, children }: SiteHeaderProps) {
  const demo = isDemoMode("UNSPLASH_ACCESS_KEY") || isDemoMode("GEMINI_API_KEY");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto grid h-16 max-w-[1800px] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:grid-cols-[1fr_minmax(0,36rem)_1fr] sm:gap-6 sm:px-6">
        <div className="flex items-center gap-1">
          {leading}
          <Link href="/" className="font-display text-xl font-semibold tracking-tight">
            TraveLens
          </Link>
        </div>
        <div className="min-w-0">{children}</div>
        <div className="flex justify-end">
          {demo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="hidden cursor-default sm:inline-flex">
                  Modo demo
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-60">
                Faltan claves de API en .env.local: se muestran fotos y planes de ejemplo.
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </header>
  );
}
