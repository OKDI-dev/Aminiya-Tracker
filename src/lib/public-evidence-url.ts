/**
 * Evidence URLs displayed publicly must use HTTPS and must not contain
 * common private or temporary signed-storage URL patterns.
 */
export function isPublicEvidenceUrl(value: string | null | undefined): boolean {
  if (!value) return false;

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") return false;
    if (url.username || url.password) return false;

    const path = url.pathname.toLowerCase();

    // Supabase private and signed storage object routes.
    if (
      path.includes("/storage/v1/object/sign/") ||
      path.includes("/storage/v1/object/authenticated/")
    ) {
      return false;
    }

    // Common temporary signed-URL query parameters.
    const sensitiveParameters = [
      "token",
      "signature",
      "sig",
      "x-amz-signature",
      "x-goog-signature",
    ];

    if (
      sensitiveParameters.some((parameter) =>
        url.searchParams.has(parameter)
      )
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
