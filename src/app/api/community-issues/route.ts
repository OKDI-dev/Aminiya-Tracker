import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { adminSupabase } from "@/lib/supabase/admin";

const categories = [
  "education",
  "healthcare",
  "water_sanitation",
  "roads_transport",
  "electricity",
  "security",
  "environment",
  "public_services",
  "youth_development",
  "other",
];

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}


export async function GET() {
  try {
    const { data, error } = await adminSupabase
      .from("electoral_areas")
      .select("id, name, parent_id, area_type")
      .eq("publication_status", "published")
      .in("area_type", ["state", "lga", "ward"])
      .order("name");

    if (error) {
      console.error("Community issue location loading error:", error.message);
      return NextResponse.json(
        { error: "Unable to load location information." },
        { status: 500 }
      );
    }

    return NextResponse.json({ areas: data ?? [] });
  } catch (error) {
    console.error("Community issue location GET error:", error);

    return NextResponse.json(
      { error: "Unable to load location options." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Honeypot: silently accept bot submissions without storing them.
    if (body.website) {
      return NextResponse.json({ success: true });
    }

    const category =
      typeof body.category === "string" ? body.category.trim() : "";
    const title =
      typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";
    const state =
      typeof body.state === "string" ? body.state.trim() : "";
    const lga = typeof body.lga === "string" ? body.lga.trim() : "";
    const ward =
      typeof body.ward === "string" ? body.ward.trim() : "";
    const community =
      typeof body.community === "string" ? body.community.trim() : "";
    const locationDescription =
      typeof body.location_description === "string"
        ? body.location_description.trim()
        : "";

    if (!categories.includes(category)) {
      return NextResponse.json(
        { error: "Please select a valid issue category." },
        { status: 400 }
      );
    }

    if (title.length < 5 || title.length > 150) {
      return NextResponse.json(
        { error: "The title must be between 5 and 150 characters." },
        { status: 400 }
      );
    }

    if (description.length < 20 || description.length > 5000) {
      return NextResponse.json(
        { error: "The description must be between 20 and 5,000 characters." },
        { status: 400 }
      );
    }

    if (state.length < 2 || state.length > 100 ||
        lga.length < 2 || lga.length > 100) {
      return NextResponse.json(
        { error: "Please provide a valid state and LGA." },
        { status: 400 }
      );
    }

    if (
      ward.length > 100 ||
      community.length > 150 ||
      locationDescription.length > 300
    ) {
      return NextResponse.json(
        { error: "One or more location fields are too long." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const rateLimitSecret = process.env.INCIDENT_RATE_LIMIT_SECRET;

    if (!supabaseUrl || !supabaseAnonKey || !rateLimitSecret) {
      console.error("Community issue submission configuration is incomplete.");
      return NextResponse.json(
        { error: "The submission service is not configured." },
        { status: 500 }
      );
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ipAddress =
      forwardedFor?.split(",")[0]?.trim() || realIp?.trim();

    if (!ipAddress) {
      return NextResponse.json(
        { error: "Unable to verify your connection. Please try again." },
        { status: 503 }
      );
    }

    const keyHash = createHmac("sha256", rateLimitSecret)
      .update(`community-issues:${ipAddress}`)
      .digest("hex");

    const rateLimitClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: allowed, error: limitError } =
      await rateLimitClient.rpc("consume_incident_submission_limit", {
        p_key_hash: keyHash,
        p_limit: 5,
      });

    if (limitError) {
      console.error("Community issue rate-limit check failed:", limitError.message);
      return NextResponse.json(
        { error: "Submission service is temporarily unavailable." },
        { status: 503 }
      );
    }

    if (allowed !== true) {
      return NextResponse.json(
        { error: "You have reached the submission limit. Please try again in an hour." },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }

    // The reference identifies the report; the secret token authorises tracking.
    const referenceCode =
      `AMI-${new Date().getFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;
    const trackingToken = randomBytes(32).toString("hex");

    const { error: insertError } = await adminSupabase
      .from("community_issues")
      .insert({
        reference_code: referenceCode,
        tracking_token_hash: hashToken(trackingToken),
        category,
        title,
        description,
        state,
        lga,
        ward: ward || null,
        community: community || null,
        location_description: locationDescription || null,
        status: "submitted",
      });

    if (insertError) {
      console.error("Community issue insert failed:", insertError.message);
      return NextResponse.json(
        { error: "Your issue could not be submitted. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Your community issue has been submitted for review.",
      referenceCode,
      trackingToken,
    });
  } catch (error) {
    console.error("Community issue submission error:", error);
    return NextResponse.json(
      { error: "Invalid submission. Please check your information." },
      { status: 400 }
    );
  }
}
