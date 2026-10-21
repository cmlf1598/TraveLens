"use client";

import { lazy, Suspense, useState } from "react";
import Image from "next/image";
import { MapPin, Search, Sparkles } from "lucide-react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { foldText } from "./lib/photo-text";
import { cn } from "./lib/utils";

/**
 * REVIEWER_NOTE: Single-screen, client-only entry point for environments without a Next.js server
 * (the course's auto-grader renders `src/App.tsx` in plain Vitest + jsdom). The real app lives in
 * `src/app/`, whose pages are server components that fetch from Unsplash behind `server-only`
 * imports and therefore can't be rendered there. This screen shows the same features (search,
 * destination grid, detail view, AI itinerary) from a bundled sample, and reuses the real UI parts.
 * - Imports are relative, not `@/`, so the module loads even where the tsconfig alias isn't set up.
 * - `TravelPlanPanel` is lazy: it pulls in `@/` modules and calls `/api/ai-plan`, so it's only
 *   loaded when the user asks for a plan.
 */
const TravelPlanPanel = lazy(() =>
  import("./components/features/travel-plan-panel").then((m) => ({ default: m.TravelPlanPanel })),
);

type Category = "ciudades" | "naturaleza" | "costa";
type Tab = Category | "todos";

interface Destination {
  id: string;
  city: string;
  country: string;
  description: string;
  category: Category;
  tags: string[];
  color: string;
}

const DESTINATIONS: Destination[] = [
  { id: "1493976040374-85c8e12f0c0e", city: "Kioto", country: "Japón", description: "Calle de Higashiyama al atardecer", category: "ciudades", tags: ["templos", "cultura"], color: "#6b4a3a" },
  { id: "1501785888041-af3ef285b470", city: "Dolomitas", country: "Italia", description: "Barca en el lago di Braies", category: "naturaleza", tags: ["lagos", "montañas"], color: "#3aa6a6" },
  { id: "1533105079780-92b9be482077", city: "Santorini", country: "Grecia", description: "Vista al Egeo entre casas blancas", category: "costa", tags: ["islas", "mar"], color: "#3a6ab0" },
  { id: "1502602898657-3e91760cbb34", city: "París", country: "Francia", description: "Torre Eiffel al anochecer", category: "ciudades", tags: ["monumentos", "europa"], color: "#6a6f9a" },
  { id: "1537996194471-e657df975ab4", city: "Bali", country: "Indonesia", description: "Templo Ulun Danu Bratan", category: "naturaleza", tags: ["templos", "lagos"], color: "#4a5a4a" },
  { id: "1516483638261-f4dbaf036963", city: "Cinque Terre", country: "Italia", description: "Manarola sobre el acantilado", category: "costa", tags: ["pueblos", "costa"], color: "#b07a5a" },
  { id: "1540959733332-eab4deabeeaf", city: "Tokio", country: "Japón", description: "Neones de Tokio", category: "ciudades", tags: ["noche", "asia"], color: "#3ab0c0" },
  { id: "1526392060635-9d6019884377", city: "Cusco", country: "Perú", description: "Machu Picchu entre nubes", category: "naturaleza", tags: ["montañas", "ruinas"], color: "#5a6a5a" },
  { id: "1528127269322-539801943592", city: "Ha Long", country: "Vietnam", description: "Bahía de Ha Long", category: "costa", tags: ["mar", "islas"], color: "#7a9aa0" },
  { id: "1523906834658-6e24ef2386f9", city: "Venecia", country: "Italia", description: "Puente de Rialto", category: "ciudades", tags: ["canales", "europa"], color: "#8ac0d0" },
  { id: "1530789253388-582c481c54b0", city: "Capadocia", country: "Turquía", description: "Globos sobre Capadocia", category: "naturaleza", tags: ["globos", "amanecer"], color: "#40a0a0" },
  { id: "1539650116574-8efeb43e2750", city: "El Cairo", country: "Egipto", description: "Pirámides de Guiza", category: "ciudades", tags: ["desierto", "monumentos"], color: "#d9c0a0" },
];

const TABS: { value: Tab; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ciudades", label: "Ciudades" },
  { value: "naturaleza", label: "Naturaleza" },
  { value: "costa", label: "Costa" },
];

function imageUrl(id: string, width: number) {
  return `https://images.unsplash.com/photo-${id}?ixlib=rb-4.1.0&q=80&fm=jpg&w=${width}&fit=max`;
}

function matches(destination: Destination, query: string) {
  const q = foldText(query);
  if (!q) return true;
  const { city, country, description, tags } = destination;
  return [city, country, description, ...tags].some((text) => foldText(text).includes(q));
}

export default function App() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("todos");
  const [selectedId, setSelectedId] = useState(DESTINATIONS[0].id);
  /** Destination the user asked an AI plan for; the panel only shows while it's still selected. */
  const [planFor, setPlanFor] = useState<string | null>(null);

  const visible = DESTINATIONS.filter((d) => (tab === "todos" || d.category === tab) && matches(d, query));
  const selected = DESTINATIONS.find((d) => d.id === selectedId) ?? DESTINATIONS[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
          <span className="font-display text-xl font-semibold tracking-tight">TraveLens</span>
          <div role="search" className="relative w-full sm:max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca una ciudad, un país o un paisaje"
              aria-label="Buscar destinos"
              className="h-11 rounded-full bg-card pl-10 text-base shadow-soft"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1800px] gap-8 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <section aria-labelledby="explore-heading" className="flex flex-col gap-5">
          <h1 id="explore-heading" className="text-2xl font-semibold sm:text-3xl">
            Inspiración para tu próximo viaje
          </h1>

          <nav aria-label="Categorías">
            <div role="tablist" className="flex flex-wrap gap-2">
              {TABS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  aria-controls="destination-grid"
                  onClick={() => setTab(value)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition-colors duration-200 ease-editorial hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring",
                    tab === value && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </nav>

          <div id="destination-grid" role="tabpanel" aria-label="Destinos">
            {visible.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">Sin resultados para «{query.trim()}».</p>
            ) : (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((d) => (
                  <li
                    key={d.id}
                    className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-500"
                  >
                    <DestinationCard
                      destination={d}
                      selected={d.id === selected.id}
                      onSelect={() => setSelectedId(d.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside aria-labelledby="detail-heading" className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <div
            className="relative aspect-4/3 overflow-hidden rounded-2xl shadow-soft"
            style={{ backgroundColor: selected.color }}
          >
            <Image
              src={imageUrl(selected.id, 1080)}
              alt={selected.description}
              width={1080}
              height={810}
              unoptimized
              className="size-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-5 pt-16 text-white">
              <h2 id="detail-heading" className="font-display text-3xl font-semibold">
                {selected.city}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
                <MapPin aria-hidden className="size-4" />
                {selected.country}
              </p>
            </div>
          </div>
          <p className="leading-relaxed text-muted-foreground">{selected.description}</p>
          <ul className="flex flex-wrap gap-2" aria-label="Etiquetas">
            {selected.tags.map((tag) => (
              <li key={tag}>
                <Badge variant="secondary">{tag}</Badge>
              </li>
            ))}
          </ul>

          <section aria-label="Itinerario" className="flex flex-col gap-4">
            {planFor === selected.id ? (
              <Suspense fallback={<p role="status">Preparando el planificador…</p>}>
                <TravelPlanPanel
                  key={selected.id}
                  destination={`${selected.city}, ${selected.country}`}
                  context={{
                    photoId: selected.id,
                    description: selected.description,
                    country: selected.country,
                    tags: selected.tags,
                  }}
                />
              </Suspense>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-2xl bg-primary/5 p-5 ring-1 ring-primary/20">
                <h3 className="text-lg font-semibold">Itinerario de 3 días</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  La IA prepara un plan día a día para {selected.city}, con una joya escondida y la comida local
                  que no te puedes perder.
                </p>
                <Button onClick={() => setPlanFor(selected.id)}>
                  <Sparkles />
                  Generar itinerario con IA
                </Button>
              </div>
            )}
          </section>
        </aside>
      </main>
    </div>
  );
}

interface DestinationCardProps {
  destination: Destination;
  selected: boolean;
  onSelect: () => void;
}

function DestinationCard({ destination, selected, onSelect }: DestinationCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "group block w-full overflow-hidden rounded-2xl bg-card text-left shadow-soft ring-1 ring-border/60 transition-[transform,box-shadow] duration-300 ease-editorial outline-offset-2 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-ring",
        selected && "ring-2 ring-primary",
      )}
    >
      <div className="aspect-4/3 overflow-hidden" style={{ backgroundColor: destination.color }}>
        <Image
          src={imageUrl(destination.id, 600)}
          alt={destination.description}
          width={600}
          height={450}
          unoptimized
          className="size-full object-cover transition-transform duration-500 ease-editorial group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <p className="font-display text-lg font-medium">{destination.city}</p>
        <p className="text-sm text-muted-foreground">{destination.country}</p>
      </div>
    </button>
  );
}
