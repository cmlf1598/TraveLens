import { z } from "zod";
import { toErrorResponse } from "@/lib/errors";
import { getDestinationInsight } from "@/services/gemini";

const insightSchema = z.object({
  photoId: z.string().regex(/^[\w-]{1,64}$/),
  description: z.string().trim().min(1).max(500),
  location: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => ({}));
    const input = insightSchema.parse(body);
    return Response.json(await getDestinationInsight(input));
  } catch (err) {
    return toErrorResponse(err);
  }
}
