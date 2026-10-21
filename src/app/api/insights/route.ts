import { z } from "zod";
import { toErrorResponse } from "@/lib/errors";
import { getDestinationInsight } from "@/services/gemini";

const insightSchema = z.object({
  photoId: z.string().regex(/^[\w-]{1,64}$/),
  title: z.string().trim().min(1).max(200),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  tags: z.array(z.string().trim().max(50)).max(10).optional(),
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
