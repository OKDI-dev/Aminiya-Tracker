import { createHmac } from "node:crypto";
import { adminSupabase } from "@/lib/supabase/admin";

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; status: 429 | 503; message: string };

export async function checkCommunityIssueRateLimit(
  request: Request,
  endpoint: "tracking" | "evidence",
  limit: number
): Promise<RateLimitResult> {
  const secret = process.env.INCIDENT_RATE_LIMIT_SECRET;

  if (!secret) {
    console.error("Community issue rate-limit secret is missing.");

    return {
      allowed: false,
      status: 503,
      message: "This service is temporarily unavailable.",
    };
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  const ipAddress =
    forwardedFor?.split(",")[0]?.trim() || realIp?.trim();

  if (!ipAddress) {
    return {
      allowed: false,
      status: 503,
      message: "Unable to verify your connection. Please try again.",
    };
  }

  const keyHash = createHmac("sha256", secret)
    .update(`community-issue-${endpoint}:${ipAddress}`)
    .digest("hex");

  const { data, error } = await adminSupabase.rpc(
    "consume_incident_submission_limit",
    {
      p_key_hash: keyHash,
      p_limit: limit,
    }
  );

  if (error) {
    console.error("Community issue rate-limit check failed:", error.message);

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
      message: "You have reached the request limit. Please try again in an hour.",
    };
  }

  return { allowed: true };
}
