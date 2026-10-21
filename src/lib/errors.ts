import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import type { ApiError } from "@/types/travel";

/** Status used for an upstream call that exceeded its time budget. */
export const UPSTREAM_TIMEOUT = 504;

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
 *
 * REVIEWER_NOTE: Every BFF route ends in `catch (err) { return toErrorResponse(err) }`, so this is
 * the single place that decides what a browser learns about a failure:
 * - `unstable_rethrow` comes first. Next.js signals things like "stop prerendering here" or
 *   `notFound()` by *throwing* special errors; swallowing them here would break the build.
 * - Validation errors (zod) → 400 with per-field details, safe to show because they describe
 *   the caller's own input.
 * - Unsplash/Gemini failures → 429 when rate-limited (the client shows "try again in a minute"),
 *   otherwise 502 or 504. The upstream message is logged on the server, never sent to the browser.
 * - Anything else → 500, logged.
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
  if (err instanceof UpstreamError) {
    console.error(`[${err.service}] ${err.message}`);
    const status = err.status === 429 || err.status === UPSTREAM_TIMEOUT ? err.status : 502;
    const message =
      status === 429
        ? "Rate limit reached, try again later"
        : status === UPSTREAM_TIMEOUT
          ? "Upstream service timed out"
          : "Upstream service failed";
    return errorJson(status, { error: `${err.service}_error`, message });
  }
  console.error(err);
  return errorJson(500, { error: "internal_error", message: "Unexpected server error" });
}
