import type { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/errors";
import { searchPhotos } from "@/services/unsplash";

const searchSchema = z.object({
  query: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(30).default(24),
  orientation: z.enum(["landscape", "portrait", "squarish"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const params = searchSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    return Response.json(await searchPhotos(params));
  } catch (err) {
    return toErrorResponse(err);
  }
}
