import type { NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/errors";
import { trackDownload } from "@/services/unsplash";

const photoIdSchema = z.string().regex(/^[\w-]{1,64}$/);

export async function POST(_request: NextRequest, ctx: RouteContext<"/api/photos/[id]/download">) {
  try {
    const id = photoIdSchema.parse((await ctx.params).id);
    await trackDownload(id);
    return new Response(null, { status: 204 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
