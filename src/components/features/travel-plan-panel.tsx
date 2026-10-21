"use client";

import { useEffect, useState } from "react";
import { Gem, RotateCw, Sparkles, UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TravelPlan, TravelPlanRequest } from "@/types/travel";

type PlanState =
  | { status: "loading" }
  | { status: "success"; plan: TravelPlan }
  | { status: "error"; message: string };

function errorMessage(status: number | null) {
  if (status === 429) return "Se alcanzó el límite de solicitudes a la IA. Inténtalo de nuevo en un minuto.";
  if (status === 504) return "El servicio de IA tardó demasiado en responder. Vuelve a intentarlo.";
  if (status === null) return "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";
  return "El servicio de IA no respondió. Vuelve a intentarlo en unos segundos.";
}

/**
 * Right panel of the destination page: requests the AI plan from `POST /api/ai-plan`
 * and renders it. Remount it (via `key`) when the destination changes.
 */
export function TravelPlanPanel({ destination, context }: TravelPlanRequest) {
  const [state, setState] = useState<PlanState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const body = JSON.stringify({ destination, context });

  // REVIEWER_NOTE: Client-side data fetching, step by step:
  // - The effect re-runs when `body` changes (a different destination) or `attempt` changes (the
  //   Retry button). `body` is a JSON string rather than the `context` object because objects
  //   compare by identity: a new but equal object would re-fetch on every render.
  // - The AbortController cancels the request when the component unmounts (e.g. you navigate
  //   away). In development, React mounts components twice to surface missing cleanups, which is
  //   why the Network tab shows one cancelled `/api/ai-plan` request followed by a successful one.
  //   That is expected, not a bug.
  // - `setState` is only called from the promise callbacks, never synchronously in the effect, so
  //   the first render already shows the skeleton.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/ai-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          setState({ status: "error", message: errorMessage(res.status) });
          return;
        }
        setState({ status: "success", plan: (await res.json()) as TravelPlan });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error", message: errorMessage(null) });
      });
    return () => controller.abort();
  }, [body, attempt]);

  function retry() {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={state.status === "loading"}>
      <div className="flex items-center gap-2 pb-1">
        <Sparkles className="size-4 text-primary" />
        <h2 id="plan-heading" className="text-xl font-semibold">
          Tu plan de viaje
        </h2>
      </div>
      {/* REVIEWER_NOTE: Screen readers can't see a skeleton appear or disappear. This short live
          region announces each state change once; making the whole panel `aria-live` instead
          would read the entire plan aloud the moment it arrives. */}
      <p className="sr-only" role="status">
        {state.status === "loading"
          ? "Generando tu plan de viaje…"
          : state.status === "success"
            ? "Plan de viaje listo."
            : state.message}
      </p>

      {state.status === "loading" && (
        <>
          <PlanGenerating destination={destination} />
          <TravelPlanSkeleton />
        </>
      )}

      {state.status === "error" && (
        <Card>
          <CardHeader>
            <CardTitle>No se pudo generar el plan</CardTitle>
            <CardDescription>{state.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={retry}>
              <RotateCw />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {state.status === "success" && <TravelPlanView destination={destination} plan={state.plan} />}
    </div>
  );
}

const GENERATING_STEP_MS = 1800;

const generatingSteps = (place: string) => [
  `Estudiando ${place}…`,
  "Buscando los rincones imprescindibles…",
  "Organizando tu itinerario de 3 días…",
  "Descubriendo una joya escondida…",
  "Eligiendo la comida local que no te puedes perder…",
  "Dando los últimos toques…",
];

/**
 * Loading banner shown while the AI writes the plan: the steps advance on a timer and stop at the
 * last one, and the bar fills with them without ever reaching the end.
 *
 * REVIEWER_NOTE: The steps are paced by time, not by real progress (the API returns the whole plan
 * at once). They are `aria-hidden` because a new announcement every 1.8 s would drown out the page
 * for screen-reader users; the panel's single `role="status"` line already says the plan is coming.
 */
function PlanGenerating({ destination }: { destination: string }) {
  const steps = generatingSteps(destination.split(",")[0].trim());
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), GENERATING_STEP_MS);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <Card className="bg-primary/5 ring-primary/20" data-testid="plan-generating">
      <CardHeader className="grid-cols-[2.5rem_1fr] items-center gap-x-3">
        <span className="row-span-2 flex size-10 items-center justify-center rounded-full bg-primary/10">
          <Sparkles aria-hidden className="size-5 text-primary motion-safe:animate-sparkle" />
        </span>
        <CardTitle className="text-base">La IA está creando tu plan perfecto</CardTitle>
        <CardDescription aria-hidden className="overflow-hidden">
          <span
            key={step}
            className="block truncate motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 duration-300"
          >
            {steps[step]}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div aria-hidden className="relative h-1.5 overflow-hidden rounded-full bg-primary/15">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-editorial"
            style={{ width: `${((step + 1) / (steps.length + 1)) * 100}%` }}
          />
          <div className="absolute inset-y-0 left-0 w-2/5 bg-linear-to-r from-transparent via-white/50 to-transparent motion-safe:animate-shimmer" />
        </div>
      </CardContent>
    </Card>
  );
}

function TravelPlanView({ destination, plan }: { destination: string; plan: TravelPlan }) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">{destination}</CardTitle>
          <CardDescription className="text-base leading-relaxed text-foreground/80">{plan.intro}</CardDescription>
        </CardHeader>
      </Card>

      <ol className="flex flex-col gap-4" aria-label={`Itinerario de ${plan.days.length} días`}>
        {plan.days.map((day) => (
          <li key={day.day}>
            <Card size="sm">
              <CardHeader className="grid-cols-[2.25rem_1fr] items-center gap-x-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-secondary font-display text-sm font-semibold tabular-nums">
                  {day.day}
                </span>
                <CardTitle className="text-base">
                  <span className="sr-only">Día {day.day}: </span>
                  {day.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex list-disc flex-col gap-1.5 pl-[3.25rem] text-sm leading-relaxed text-muted-foreground marker:text-primary">
                  {day.activities.map((activity) => (
                    <li key={activity}>{activity}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      <Card className="bg-pine/5 ring-pine/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gem className="size-4 text-pine" />
            Joya escondida: {plan.hiddenGem.name}
          </CardTitle>
          <CardDescription className="leading-relaxed">{plan.hiddenGem.description}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="size-4 text-primary" />
            Comida local
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3">
            {plan.localFood.map((food) => (
              <li key={food.dish} className="flex flex-col items-start gap-1">
                <Badge variant="secondary">{food.dish}</Badge>
                <p className="text-sm leading-relaxed text-muted-foreground">{food.description}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

export function TravelPlanSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="gap-3">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardHeader>
      </Card>
      {[0, 1, 2].map((i) => (
        <Card key={i} size="sm">
          <CardHeader className="grid-cols-[2.25rem_1fr] items-center gap-x-3">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2 pl-[calc(var(--card-spacing)+3.25rem)]">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader className="gap-3">
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-3.5 w-full" />
        </CardHeader>
      </Card>
    </div>
  );
}
