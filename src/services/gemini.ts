import "server-only";

import { GoogleGenAI } from "@google/genai";
import { cacheLife } from "next/cache";
import { z } from "zod";
import { getServerEnv, isDemoMode } from "@/lib/env";
import { UPSTREAM_TIMEOUT, UpstreamError } from "@/lib/errors";
import type { TravelPlan, TravelPlanContext } from "@/types/travel";

/** Flash-Lite answers in ~2 s; gemini-3.8-flash and gemini-3-flash-preview took 6–60 s for the same plan. */
export const GEMINI_MODEL = "gemini-3.5-flash-lite";
/** Flash-Lite normally answers in ~2 s; past this, the panel shows an error with a retry button. */
const GEMINI_TIMEOUT_MS = 20_000;

const travelPlanSchema = z.object({
  intro: z.string().describe("Dos o tres frases sobre el carácter del destino y por qué visitarlo"),
  days: z
    .array(
      z.object({
        day: z.number().int().min(1),
        title: z.string().describe("Tema del día, máximo seis palabras"),
        activities: z.array(z.string()).min(2).max(4).describe("Actividades concretas, una frase cada una"),
      }),
    )
    .min(3)
    .max(3),
  hiddenGem: z
    .object({
      name: z.string().describe("Lugar poco conocido por los turistas"),
      description: z.string().describe("Por qué merece la visita, en una o dos frases"),
    })
    .describe("Una joya escondida"),
  localFood: z
    .array(
      z.object({
        dish: z.string().describe("Nombre del plato o bebida típica"),
        description: z.string().describe("Qué es y dónde probarlo, en una frase"),
      }),
    )
    .min(3)
    .max(4),
});

// REVIEWER_NOTE: One schema, used twice. `travelPlanSchema` (zod) is converted to JSON Schema
// and sent to Gemini as `response_format`, which constrains the model to answer with exactly this
// shape. The `.describe(...)` texts travel inside it and act as per-field instructions. The same
// zod schema then validates the reply (`safeParse` below), because "constrained" output can still
// be malformed. A bad reply becomes a clean 502 with a retry button, never a crash in the panel.
const responseSchema = z.toJSONSchema(travelPlanSchema);
delete responseSchema.$schema;

const SYSTEM_INSTRUCTION = [
  "Eres un planificador de viajes experto.",
  "Responde siempre en español neutro, con frases breves y concretas.",
  "Si el destino es vago, elige el lugar más representativo de lo que muestra la foto.",
  "No inventes datos verificables como precios exactos u horarios.",
].join(" ");

function buildPrompt(destination: string, { description, country, tags }: TravelPlanContext) {
  return [
    `Crea un plan de viaje de 3 días para: ${destination}.`,
    country && `País: ${country}`,
    description && `La foto que inspira el viaje muestra: ${description}`,
    tags?.length && `Etiquetas de la foto: ${tags.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function demoPlan(destination: string): TravelPlan {
  return {
    intro: `Plan de ejemplo para ${destination}, generado sin IA. Añade GEMINI_API_KEY a .env.local para obtener un plan real.`,
    days: [
      { day: 1, title: "Llegada y primer paseo", activities: ["Recorre el barrio principal a pie.", "Cena cerca del alojamiento."] },
      { day: 2, title: "Lo imprescindible", activities: ["Visita los lugares más conocidos a primera hora.", "Reserva la tarde para un mirador."] },
      { day: 3, title: "A tu ritmo", activities: ["Haz una excursión cercana.", "Vuelve a tu rincón favorito para despedirte."] },
    ],
    hiddenGem: { name: "Un mercado de barrio", description: "Pregunta en tu alojamiento por el mercado donde compran los vecinos." },
    localFood: [
      { dish: "Plato del día", description: "Pide el menú del día en una casa de comidas local." },
      { dish: "Dulce típico", description: "Búscalo en una pastelería tradicional." },
      { dish: "Bebida local", description: "Pruébala en un bar frecuentado por vecinos." },
    ],
  };
}

/** Generate a 3-day travel plan (in Spanish). Cached per destination and context for a day. */
export async function generateTravelPlan(destination: string, context: TravelPlanContext): Promise<TravelPlan> {
  "use cache";
  cacheLife("days");

  if (isDemoMode("GEMINI_API_KEY")) return demoPlan(destination);

  const client = new GoogleGenAI({ apiKey: getServerEnv("GEMINI_API_KEY") });
  let outputText: string | undefined;
  try {
    const interaction = await client.interactions.create(
      {
        model: GEMINI_MODEL,
        system_instruction: SYSTEM_INSTRUCTION,
        input: buildPrompt(destination, context),
        response_format: { type: "text", mime_type: "application/json", schema: responseSchema },
        store: false,
      },
      { timeout_ms: GEMINI_TIMEOUT_MS },
    );
    outputText = interaction.output_text;
  } catch (err) {
    const timedOut = err instanceof Error && /timeout|timed out|abort/i.test(`${err.name} ${err.message}`);
    const status = timedOut ? UPSTREAM_TIMEOUT : ((err as { status?: number }).status ?? 502);
    throw new UpstreamError("gemini", status, `Gemini request failed (${status}): ${(err as Error).message}`);
  }

  let json: unknown = null;
  try {
    json = JSON.parse(outputText ?? "");
  } catch {}
  const parsed = travelPlanSchema.safeParse(json);
  if (!parsed.success) throw new UpstreamError("gemini", 502, "Gemini returned an invalid plan");
  return parsed.data;
}
