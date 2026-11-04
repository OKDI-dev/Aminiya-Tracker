import "server-only";

import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";

async function getCount(
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>
) {
  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getPublicAccountabilityStats() {
  const supabase = await createClient();

  const [
    communityTotal,
    communitySubmitted,
    communityUnderReview,
    communityActionRequired,
    communityResolved,
    communityClosed,

    promiseTotal,
    promiseNotStarted,
    promiseInProgress,
    promisePartiallyFulfilled,
    promiseFulfilled,
    promiseStalled,

    electionTotal,
    candidateTotal,
    partyTotal,
  ] = await Promise.all([
    // Community issue records are queried with the service role.
    // Only aggregate counts leave this server-side function.
    getCount(
      adminSupabase.from("community_issues").select("id", {
        count: "exact",
        head: true,
      })
    ),
    getCount(
      adminSupabase.from("community_issues").select("id", {
        count: "exact",
        head: true,
      }).eq("status", "submitted")
    ),
    getCount(
      adminSupabase.from("community_issues").select("id", {
        count: "exact",
        head: true,
      }).eq("status", "under_review")
    ),
    getCount(
      adminSupabase.from("community_issues").select("id", {
        count: "exact",
        head: true,
      }).eq("status", "action_required")
    ),
    getCount(
      adminSupabase.from("community_issues").select("id", {
        count: "exact",
        head: true,
      }).eq("status", "resolved")
    ),
    getCount(
      adminSupabase.from("community_issues").select("id", {
        count: "exact",
        head: true,
      }).eq("status", "closed")
    ),

    // Public Supabase client: published promise visibility remains subject
    // to the existing RLS policies.
    getCount(
      supabase.from("political_promises").select("id", {
        count: "exact",
        head: true,
      }).eq("publication_status", "published")
    ),
    getCount(
      supabase.from("political_promises").select("id", {
        count: "exact",
        head: true,
      }).eq("publication_status", "published").eq("progress_status", "not_started")
    ),
    getCount(
      supabase.from("political_promises").select("id", {
        count: "exact",
        head: true,
      }).eq("publication_status", "published").eq("progress_status", "in_progress")
    ),
    getCount(
      supabase.from("political_promises").select("id", {
        count: "exact",
        head: true,
      }).eq("publication_status", "published").eq("progress_status", "partially_fulfilled")
    ),
    getCount(
      supabase.from("political_promises").select("id", {
        count: "exact",
        head: true,
      }).eq("publication_status", "published").eq("progress_status", "fulfilled")
    ),
    getCount(
      supabase.from("political_promises").select("id", {
        count: "exact",
        head: true,
      }).eq("publication_status", "published").eq("progress_status", "stalled")
    ),

    getCount(
      supabase.from("elections").select("id", {
        count: "exact",
        head: true,
      }).eq("publication_status", "published")
    ),
    getCount(
      supabase.from("candidates").select("id", {
        count: "exact",
        head: true,
      }).eq("publication_status", "published")
    ),
    getCount(
      supabase.from("political_parties").select("id", {
        count: "exact",
        head: true,
      }).eq("publication_status", "published")
    ),
  ]);

  return {
    communityIssues: {
      total: communityTotal,
      submitted: communitySubmitted,
      underReview: communityUnderReview,
      actionRequired: communityActionRequired,
      resolved: communityResolved,
      closed: communityClosed,
    },
    promises: {
      total: promiseTotal,
      notStarted: promiseNotStarted,
      inProgress: promiseInProgress,
      partiallyFulfilled: promisePartiallyFulfilled,
      fulfilled: promiseFulfilled,
      stalled: promiseStalled,
    },
    electoralInformation: {
      elections: electionTotal,
      candidates: candidateTotal,
      parties: partyTotal,
    },
    generatedAt: new Date().toISOString(),
  };
}
