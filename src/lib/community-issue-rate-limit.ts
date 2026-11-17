import { checkRateLimit, type RateLimitResult } from "@/lib/rate-limit";

export function checkCommunityIssueRateLimit(
  request: Request,
  endpoint: "tracking" | "evidence",
  limit: number
): Promise<RateLimitResult> {
  return checkRateLimit(request, `community-issue-${endpoint}`, limit);
}
