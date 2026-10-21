import "server-only";

import { GoogleGenAI } from "@google/genai";
import { cacheLife } from "next/cache";
import { z } from "zod";
import { getServerEnv, isDemoMode } from "@/lib/env";
import { UpstreamError } from "@/lib/errors";
import type { DestinationInsight, DestinationInsightRequest } from "@/types/travel";

export const GEMINI_MODEL = "gemini-3.8-flash";

const insightSchema = z.object({
  destination: z.string().describe("Nombre del destino, p. ej. «Kioto, Japón»"),
  summary: z.string().describe("Dos o tres frases sobre por qué visitarlo"),
  bestTimeToVisit: z.string().describe("Mejor época para ir y el motivo, en una frase"),
  highlights: z.array(z.string()).min(3).max(5).describe("Lugares o experiencias imprescindibles"),
  itinerary: z
    .array(
      z.object({
        day: z.number().int().min(1),
        title: z.string(),
        description: z.string().describe("Una o dos frases"),
      }),
    )
    .min(3)
    .max(3),
  travelTips: z.array(z.string()).min(2).max(4).describe("Consejos prácticos y concretos"),
});

const responseSchema = z.toJSONSchema(insightSchema);
delete responseSchema.$schema;

const SYSTEM_INSTRUCTION = [
  "Eres un planificador de viajes experto.",
  "Responde siempre en español neutro, con frases breves y concretas.",
  "Si la foto no identifica un lugar concreto, propón el destino más representativo de lo que muestra.",
  "No inventes datos verificables como precios exactos u horarios.",
].join(" ");

function buildPrompt({ title, city, country, tags }: DestinationInsightRequest) {
  return [
    "Crea un plan de viaje de 3 días inspirado en esta foto.",
    `Descripción de la foto: ${title}`,
    city && `Ciudad: ${city}`,
    country && `País: ${country}`,
    tags?.length && `Etiquetas: ${tags.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function demoInsight({ title, city, country }: DestinationInsightRequest): DestinationInsight {
  const place = [city, country].filter(Boolean).join(", ") || title;
  return {
    destination: place,
    summary:
      "Plan de ejemplo generado sin IA. Añade GEMINI_API_KEY a .env.local para obtener un plan real para este destino.",
    bestTimeToVisit: "Primavera u otoño, cuando el clima es suave y hay menos visitantes.",
    highlights: ["El centro histórico a primera hora", "Un mirador al atardecer", "Un mercado local"],
    itinerary: [
      { day: 1, title: "Llegada y primer paseo", description: "Recorre el barrio principal a pie y cena cerca del alojamiento." },
      { day: 2, title: "Lo imprescindible", description: "Visita los lugares más conocidos temprano para evitar las colas." },
      { day: 3, title: "A tu ritmo", description: "Elige una excursión cercana o vuelve a tu rincón favorito." },
    ],
    travelTips: ["Reserva con antelación en temporada alta.", "Lleva calzado cómodo para caminar."],
  };
}

/** Generate a 3-day travel plan (in Spanish) for the destination shown in a photo. */
export async function getDestinationInsight(
  request: DestinationInsightRequest,
): Promise<DestinationInsight> {
  "use cache";
  cacheLife("days");

  if (isDemoMode("GEMINI_API_KEY")) return demoInsight(request);

  const client = new GoogleGenAI({ apiKey: getServerEnv("GEMINI_API_KEY") });
  let outputText: string | undefined;
  try {
    const interaction = await client.interactions.create({
      model: GEMINI_MODEL,
      system_instruction: SYSTEM_INSTRUCTION,
      input: buildPrompt(request),
      response_format: { type: "text", mime_type: "application/json", schema: responseSchema },
      store: false,
    });
    outputText = interaction.output_text;
  } catch (err) {
    const status = (err as { status?: number }).status ?? 502;
    throw new UpstreamError("gemini", status, `Gemini request failed (${status})`);
  }

  let json: unknown = null;
  try {
    json = JSON.parse(outputText ?? "");
  } catch {}
  const parsed = insightSchema.safeParse(json);
  if (!parsed.success) throw new UpstreamError("gemini", 502, "Gemini returned an invalid plan");
  return parsed.data;
}
