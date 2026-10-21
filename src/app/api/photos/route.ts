import type { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/errors";
import { fetchPopular, searchDestinations } from "@/services/unsplash";

const paramsSchema = z.object({
  query: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(100).default(1),
  /** Home-feed only: the `seed` returned by the first page, to keep the city order. */
  seed: z.coerce.number().int().min(0).max(2 ** 32 - 1).optional(),
});

/** `?query=` searches; without a query it returns the curated home feed. */
export async function GET(request: NextRequest) {
  try {
    const { query, page, seed } = paramsSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const result = query ? await searchDestinations(query, page) : await fetchPopular({ seed, page });
    return Response.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
