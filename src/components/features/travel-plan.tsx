import { unstable_rethrow } from "next/navigation";
import { CalendarDays, Lightbulb, Sparkles, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RetryButton } from "@/components/features/retry-button";
import { getDestinationInsight } from "@/services/gemini";
import type { Photo } from "@/types/travel";

function PlanHeading() {
  return (
    <div className="flex items-center gap-2 pb-1">
      <Sparkles className="size-4 text-primary" />
      <h2 id="plan-heading" className="text-xl font-semibold">
        Tu plan de viaje
      </h2>
    </div>
  );
}

/** AI-generated 3-day plan; streams in behind `TravelPlanSkeleton`. */
export async function TravelPlan({ photo }: { photo: Photo }) {
  let plan;
  try {
    plan = await getDestinationInsight({
      photoId: photo.id,
      title: photo.description ?? photo.title,
      city: photo.cityName ?? undefined,
      country: photo.country ?? undefined,
      tags: photo.tags,
    });
  } catch (err) {
    unstable_rethrow(err);
    return (
      <div className="flex flex-col gap-4">
        <PlanHeading />
        <Card>
          <CardHeader>
            <CardTitle>No se pudo generar el plan</CardTitle>
            <CardDescription>
              El servicio de IA no respondió. Vuelve a intentarlo en unos segundos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RetryButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PlanHeading />

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">{plan.destination}</CardTitle>
          <CardDescription className="text-base leading-relaxed text-foreground/80">{plan.summary}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3 text-sm">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-pine" />
          <p>
            <span className="font-medium">Mejor época: </span>
            {plan.bestTimeToVisit}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itinerario de {plan.itinerary.length} días</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-4">
            {plan.itinerary.map((day) => (
              <li key={day.day} className="grid grid-cols-[2.25rem_1fr] gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-secondary font-display text-sm font-semibold tabular-nums">
                  {day.day}
                </span>
                <div>
                  <p className="font-medium">{day.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{day.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="size-4 text-primary" />
              Imprescindibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm marker:text-primary">
              {plan.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="size-4 text-pine" />
              Consejos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm marker:text-pine">
              {plan.travelTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function TravelPlanSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Generando tu plan de viaje">
      <PlanHeading />
      <Card>
        <CardHeader className="gap-3">
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-[2.25rem_1fr] gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3.5 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} size="sm">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
              <Skeleton className="h-3.5 w-3/5" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
