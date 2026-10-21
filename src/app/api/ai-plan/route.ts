import { z } from "zod";
import { toErrorResponse } from "@/lib/errors";
import { generateTravelPlan } from "@/services/gemini";

const requestSchema = z.object({
  destination: z.string().trim().min(1).max(200),
  context: z.object({
    photoId: z.string().regex(/^[\w-]{1,64}$/),
    description: z.string().trim().max(300).optional(),
    country: z.string().trim().max(100).optional(),
    tags: z.array(z.string().trim().max(50)).max(10).optional(),
  }),
});

/** `POST { destination, context }` → `TravelPlan`. The Gemini key never leaves the server. */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => ({}));
    const { destination, context } = requestSchema.parse(body);
    return Response.json(await generateTravelPlan(destination, context));
  } catch (err) {
    return toErrorResponse(err);
  }
}
