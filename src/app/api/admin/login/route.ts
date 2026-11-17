import { createHmac } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

type CookieOptions = NonNullable<
  Parameters<NextResponse["cookies"]["set"]>[2]
>;

const WINDOW_SECONDS = 5 * 60;

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

  const ipAddress =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim();

  if (!ipAddress || ipAddress.length > 255) {
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

  const { data: allowed, error: limitError } = await adminSupabase.rpc(
    "check_admin_login_limit",
    { p_key_hash: keyHash }
  );

  if (limitError) {
    console.error("Admin login rate-limit check failed:", limitError.message);

    return NextResponse.json(
      { error: "Sign-in service is temporarily unavailable." },
      { status: 503 }
    );
  }

  if (allowed !== true) {
    return NextResponse.json(
      {
        error:
          "Too many failed sign-in attempts. Your login is temporarily locked. Please wait 5 minutes before trying again.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(WINDOW_SECONDS) },
      }
    );
  }

  const pendingCookies = new Map<
    string,
    { name: string; value: string; options?: CookieOptions }
  >();

  function jsonResponse(
    payload: unknown,
    status = 200,
    headers?: HeadersInit
  ) {
    const response = NextResponse.json(payload, { status, headers });

    for (const cookie of pendingCookies.values()) {
      response.cookies.set(
        cookie.name,
        cookie.value,
        cookie.options
      );
    }

    return response;
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
          p_limit: 5,
        }
      );

      if (recordError) {
        console.error(
          "Could not record admin login failure:",
          recordError.message
        );

        return jsonResponse(
          { error: "Sign-in service is temporarily unavailable." },
          503
        );
      }

      if (typeof attempts === "number" && attempts >= 5) {
        return jsonResponse(
          {
            error:
              "Too many failed sign-in attempts. Your login is temporarily locked. Please wait 5 minutes before trying again.",
          },
          429,
          { "Retry-After": String(WINDOW_SECONDS) }
        );
      }

      return jsonResponse(
        { error: "Invalid email or password." },
        401
      );
    }

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
      await supabase.auth.signOut();

      return jsonResponse(
        {
          error:
            "Your account does not have permission to access the staff dashboard.",
        },
        403
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
