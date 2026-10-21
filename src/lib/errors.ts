import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import type { ApiError } from "@/types/travel";

export class NotImplementedError extends Error {
  constructor(feature: string) {
    super(`${feature} is not implemented yet`);
    this.name = "NotImplementedError";
  }
}

export class UpstreamError extends Error {
  constructor(
    readonly service: "unsplash" | "gemini",
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

function errorJson(status: number, body: ApiError) {
  return Response.json(body, { status });
}

/**
 * Maps any thrown value to a JSON error response without leaking internals.
 * Next.js control-flow errors (prerender bail-outs, redirects) are rethrown.
 */
export function toErrorResponse(err: unknown): Response {
  unstable_rethrow(err);
  if (err instanceof z.ZodError) {
    return errorJson(400, {
      error: "invalid_request",
      message: "Request validation failed",
      details: z.flattenError(err).fieldErrors,
    });
  }
  if (err instanceof NotImplementedError) {
    return errorJson(501, { error: "not_implemented", message: err.message });
  }
  if (err instanceof UpstreamError) {
    const status = err.status === 429 ? 429 : 502;
    return errorJson(status, {
      error: `${err.service}_error`,
      message: status === 429 ? "Rate limit reached, try again later" : "Upstream service failed",
    });
  }
  console.error(err);
  return errorJson(500, { error: "internal_error", message: "Unexpected server error" });
}
