type DbError = { code?: string | null; message?: string | null } | null | undefined;

/**
 * Turn a Supabase/Postgres error into a sentence staff can act on.
 * The raw error is logged so nothing is lost for debugging.
 */
export function friendlyDbError(
  error: DbError,
  fallback = "Something went wrong. Please try again."
): string {
  if (error) console.error("Database error:", error.code, error.message);

  const code = error?.code ?? "";
  const message = (error?.message ?? "").toLowerCase();

  if (
    (typeof navigator !== "undefined" && navigator.onLine === false) ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed")
  ) {
    return "Couldn't reach the server. Check your connection and try again.";
  }

  if (code === "42501" || message.includes("row-level security") || message.includes("permission denied")) {
    return "You don't have permission to do this. Ask an admin to check your staff role.";
  }

  if (code === "PGRST301" || message.includes("jwt expired") || message.includes("invalid jwt")) {
    return "Your session has expired. Sign in again to continue.";
  }

  if (code === "23514") {
    if (message.includes("date_range")) return "The end date can't be before the start date.";
    if (message.includes("time_range")) return "The end time can't be before the start time.";
    return "Some values aren't allowed. Check the dates, times and category.";
  }

  if (code === "23505") return "This already exists.";
  if (code === "22007" || code === "22008") return "One of the dates or times isn't valid.";
  if (code === "23502") return "A required field is missing.";

  return fallback;
}
