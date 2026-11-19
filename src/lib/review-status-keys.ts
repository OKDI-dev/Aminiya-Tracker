/**
 * Keys shared by a review page's OptimisticStatusBadge (server-rendered) and
 * its review actions (client). Kept out of "use client" modules so server
 * components can call them.
 */
export const communityIssueStatusKey = (issueId: string) => `community_issues:${issueId}`;
export const incidentStatusKey = (incidentId: string) => `election_incidents:${incidentId}`;

export const communityIssueStatusStyles: Record<string, string> = {
  submitted: "bg-tint text-ink-muted",
  under_review: "bg-blue-100 text-blue-800",
  action_required: "bg-signal/15 text-ink",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-line-soft text-ink-muted",
};

export const incidentStatusStyles: Record<string, string> = {
  submitted: "bg-tint text-ink-muted",
  under_review: "bg-blue-100 text-blue-800",
  verified: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
  dismissed: "bg-red-100 text-red-700",
};
