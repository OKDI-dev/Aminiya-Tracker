import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import {
  checkRateLimit,
  rateLimitResponseInit,
} from "@/lib/rate-limit";

const allowedCategories = [
  "general",
  "feedback",
  "partnership",
  "collaboration",
  "other",
] as const;

type ContactCategory = (typeof allowedCategories)[number];

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);

    if (contentLength > 12_000) {
      return NextResponse.json(
        { error: "Your message is too large. Please shorten it and try again." },
        { status: 413 }
      );
    }

    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Please check your submission and try again." },
        { status: 400 }
      );
    }

    const fields = body as Record<string, unknown>;

    // Honeypot: quietly accept automated submissions without storing them.
    if (textValue(fields.website)) {
      return NextResponse.json({ success: true });
    }

    const name = textValue(fields.name);
    const email = textValue(fields.email).toLowerCase();
    const category = textValue(fields.category);
    const subject = textValue(fields.subject);
    const message = textValue(fields.message);

    if (name.length < 2 || name.length > 120) {
      return NextResponse.json(
        { error: "Please enter a name between 2 and 120 characters." },
        { status: 400 }
      );
    }

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!allowedCategories.includes(category as ContactCategory)) {
      return NextResponse.json(
        { error: "Please select a valid enquiry type." },
        { status: 400 }
      );
    }

    if (subject.length < 3 || subject.length > 160) {
      return NextResponse.json(
        { error: "The subject must be between 3 and 160 characters." },
        { status: 400 }
      );
    }

    if (message.length < 20 || message.length > 5000) {
      return NextResponse.json(
        { error: "Your message must be between 20 and 5,000 characters." },
        { status: 400 }
      );
    }

    const rateLimit = await checkRateLimit(
      request,
      "contact-enquiry",
      5,
      "You have reached the contact submission limit. Please try again in an hour."
    );

    if (!rateLimit.allowed) {
      const response = rateLimitResponseInit(rateLimit);
      return NextResponse.json(response.body, response.init);
    }

    const { data: inserted, error: insertError } = await adminSupabase
      .from("contact_enquiries")
      .insert({
        name,
        email,
        category,
        subject,
        message,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("Contact enquiry submission failed:", insertError?.message);

      return NextResponse.json(
        { error: "Your message could not be submitted. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reference: inserted.id,
    });
  } catch (error) {
    console.error("Contact API error:", error);

    return NextResponse.json(
      { error: "Your message could not be processed. Please check your information and try again." },
      { status: 400 }
    );
  }
}
