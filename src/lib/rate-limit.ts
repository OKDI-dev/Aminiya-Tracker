import "server-only";

import { createHmac } from "node:crypto";
import { adminSupabase } from "@/lib/supabase/admin";

/** The shared limiter counts requests per key in a one-hour window. */
const WINDOW_SECONDS = 60 * 60;

export type RateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      status: 429 | 503;
      message: string;
      /** Seconds until the caller may retry (only for 429). */
      retryAfter?: number;
    };

/**
 * The caller's IP, preferring the header Vercel sets itself (which the client
 * cannot spoof) over the generic proxy headers.
 */
export function getClientIp(request: Request): string | null {
  const ip =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim();

  return ip && ip.length <= 255 ? ip : null;
}

/**
 * Consume one request from `bucket` for this caller's IP. IPs are never
 * stored: the key is an HMAC of bucket + IP under a server secret.
 */
export async function checkRateLimit(
  request: Request,
  bucket: string,
  limit: number,
  limitMessage = "You have reached the request limit. Please try again in an hour."
): Promise<RateLimitResult> {
  const secret = process.env.INCIDENT_RATE_LIMIT_SECRET;

  if (!secret) {
    console.error("Rate-limit secret is missing.");
    return {
      allowed: false,
      status: 503,
      message: "This service is temporarily unavailable.",
    };
  }

  const ipAddress = getClientIp(request);

  if (!ipAddress) {
    return {
      allowed: false,
      status: 503,
      message: "Unable to verify your connection. Please try again.",
    };
  }

  const keyHash = createHmac("sha256", secret)
    .update(`${bucket}:${ipAddress}`)
    .digest("hex");

  const { data, error } = await adminSupabase.rpc(
    "consume_incident_submission_limit",
    { p_key_hash: keyHash, p_limit: limit }
  );

  if (error) {
    console.error(`Rate-limit check failed (${bucket}):`, error.message);
    return {
      allowed: false,
      status: 503,
      message: "This service is temporarily unavailable.",
    };
  }

  if (data !== true) {
    return {
      allowed: false,
      status: 429,
      message: limitMessage,
      retryAfter: WINDOW_SECONDS,
    };
  }

  return { allowed: true };
}

/** JSON body + headers for a blocked request. */
export function rateLimitResponseInit(result: Exclude<RateLimitResult, { allowed: true }>) {
  return {
    body: {
      error: result.message,
      ...(result.retryAfter ? { retryAfter: result.retryAfter } : {}),
    },
    init: {
      status: result.status,
      headers: {
        "Cache-Control": "no-store",
        ...(result.retryAfter ? { "Retry-After": String(result.retryAfter) } : {}),
      },
    },
  };
}
