import { createHmac } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getClientIp } from "@/lib/rate-limit";
import { adminSupabase } from "@/lib/supabase/admin";

type CookieOptions = NonNullable<
  Parameters<NextResponse["cookies"]["set"]>[2]
>;

/** Failed attempts allowed before a 5-minute lock (see migration 024). */
const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 5 * 60;

const LOCKED_MESSAGE =
  "Too many failed sign-in attempts. Sign-in is locked for a few minutes.";

function lockedResponse(retryAfter: number, init?: (r: NextResponse) => NextResponse) {
  const response = NextResponse.json(
    { error: LOCKED_MESSAGE, retryAfter },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
  return init ? init(response) : response;
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const rateLimitSecret = process.env.INCIDENT_RATE_LIMIT_SECRET;

  if (!supabaseUrl || !supabaseAnonKey || !rateLimitSecret) {
    console.error("Admin login service configuration is incomplete.");

    return NextResponse.json(
      { error: "Sign-in service is temporarily unavailable." },
      { status: 503 }
    );
  }

  const ipAddress = getClientIp(request);

  if (!ipAddress) {
    return NextResponse.json(
      { error: "Unable to verify your connection. Please try again." },
      { status: 503 }
    );
  }

  const keyHash = createHmac("sha256", rateLimitSecret)
    .update(`admin-login:${ipAddress}`)
    .digest("hex");

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Please provide your email address and password." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Please provide your email address and password." },
      { status: 400 }
    );
  }

  const credentials = body as {
    email?: unknown;
    password?: unknown;
  };

  const email =
    typeof credentials.email === "string"
      ? credentials.email.trim()
      : "";
  const password =
    typeof credentials.password === "string"
      ? credentials.password
      : "";

  if (
    !email ||
    email.length > 320 ||
    !password ||
    password.length > 1024
  ) {
    return NextResponse.json(
      { error: "Please provide a valid email address and password." },
      { status: 400 }
    );
  }

  const { data: lockSeconds, error: limitError } = await adminSupabase.rpc(
    "check_admin_login_limit",
    { p_key_hash: keyHash }
  );

  if (limitError || typeof lockSeconds !== "number") {
    console.error(
      "Admin login rate-limit check failed:",
      limitError?.message ?? "Unexpected response"
    );

    return NextResponse.json(
      { error: "Sign-in service is temporarily unavailable." },
      { status: 503 }
    );
  }

  if (lockSeconds > 0) {
    return lockedResponse(lockSeconds);
  }

  const pendingCookies = new Map<
    string,
    { name: string; value: string; options?: CookieOptions }
  >();

  function withCookies(response: NextResponse) {
    for (const cookie of pendingCookies.values()) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    return response;
  }

  function jsonResponse(payload: unknown, status = 200) {
    return withCookies(NextResponse.json(payload, { status }));
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          pendingCookies.set(name, { name, value, options });
        });
      },
    },
  });

  try {
    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError || !data.user) {
      const { data: attempts, error: recordError } = await adminSupabase.rpc(
        "record_admin_login_failure",
        {
          p_key_hash: keyHash,
          p_limit: MAX_ATTEMPTS,
        }
      );

      if (recordError || typeof attempts !== "number") {
        console.error(
          "Could not record admin login failure:",
          recordError?.message ?? "Unexpected response"
        );

        return jsonResponse(
          { error: "Sign-in service is temporarily unavailable." },
          503
        );
      }

      if (attempts >= MAX_ATTEMPTS) {
        return lockedResponse(LOCK_SECONDS, withCookies);
      }

      return jsonResponse(
        {
          error: "Invalid email or password.",
          attemptsRemaining: MAX_ATTEMPTS - attempts,
        },
        401
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("app_profiles")
      .select("user_id, display_name, role")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      !["admin", "electoral_reviewer"].includes(profile.role)
    ) {
      // Deliberately leave the failure counter alone: a valid non-staff
      // account must not be usable to reset the lockout between guesses.
      await supabase.auth.signOut();

      return jsonResponse(
        {
          error:
            "Your account does not have permission to access the staff dashboard.",
        },
        403
      );
    }

    // Only a successful staff sign-in clears the failure counter.
    const { error: clearError } = await adminSupabase.rpc(
      "clear_admin_login_limit",
      { p_key_hash: keyHash }
    );

    if (clearError) {
      console.error(
        "Could not clear admin login attempts:",
        clearError.message
      );
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Admin login error:", error);

    return jsonResponse(
      { error: "Unable to sign in. Please try again." },
      500
    );
  }
}
