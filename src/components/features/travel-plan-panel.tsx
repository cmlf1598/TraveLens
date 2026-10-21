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
    <div className="flex flex-col gap-4" aria-live="polite" aria-busy={state.status === "loading"}>
      <div className="flex items-center gap-2 pb-1">
        <Sparkles className="size-4 text-primary" />
        <h2 id="plan-heading" className="text-xl font-semibold">
          Tu plan de viaje
        </h2>
      </div>

      {state.status === "loading" && <TravelPlanSkeleton />}

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
