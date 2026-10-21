import "server-only";

import { NotImplementedError } from "@/lib/errors";
import type { DestinationInsight, DestinationInsightRequest } from "@/types/travel";

export const GEMINI_MODEL = "gemini-3.8-flash";

/**
 * Generate travel insights for the destination shown in a photo.
 *
 * Implementation notes (Role 2):
 * - `npm i @google/genai`; `new GoogleGenAI({ apiKey: getServerEnv("GEMINI_API_KEY") })`
 * - `client.interactions.create({ model: GEMINI_MODEL, input, system_instruction,
 *     response_format: { type: "text", mime_type: "application/json", schema } })`
 * - Derive `schema` from a zod schema mirroring `DestinationInsight` (`z.toJSONSchema`),
 *   then validate `JSON.parse(interaction.output_text)` with the same zod schema.
 * - Cache per `photoId` with `'use cache'` + `cacheLife('days')`; insights are stable.
 */
export async function getDestinationInsight(
  request: DestinationInsightRequest,
): Promise<DestinationInsight> {
  void request;
  throw new NotImplementedError("Gemini destination insights");
}
