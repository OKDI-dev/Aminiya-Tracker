import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { computeBlurhash, isMissingColumnError } from "@/lib/server/blurhash";

const BUCKET = "party-logos";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const allowedMimeTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const allowedStatuses = ["draft", "published", "archived"];

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  let uploadedPath: string | null = null;

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("app_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      !["admin", "electoral_reviewer"].includes(profile.role)
    ) {
      return NextResponse.json(
        { error: "You are not authorised to manage political parties." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const acronym = String(formData.get("acronym") ?? "").trim().toUpperCase() || null;
    const officialWebsite = String(formData.get("official_website") ?? "").trim() || null;
    const publicationStatus = String(formData.get("publication_status") ?? "draft");
    const logo = formData.get("logo");

    if (!name || name.length > 200) {
      return NextResponse.json(
        { error: "Enter a party name of no more than 200 characters." },
        { status: 400 }
      );
    }

    if (acronym && acronym.length > 30) {
      return NextResponse.json({ error: "Acronym must not exceed 30 characters." }, { status: 400 });
    }

    for (const [label, value] of [
      ["Official website", officialWebsite],
    ] as const) {
      if (value && (value.length > 2048 || !isValidHttpUrl(value))) {
        return NextResponse.json(
          { error: `Enter a valid HTTP or HTTPS ${label.toLowerCase()} URL.` },
          { status: 400 }
        );
      }
    }

    if (!allowedStatuses.includes(publicationStatus)) {
      return NextResponse.json({ error: "Select a valid publication status." }, { status: 400 });
    }

    let logoUrl: string | null = null;
    let logoBlurhash: string | null = null;

    if (logo instanceof File && logo.size > 0) {
      const extension = allowedMimeTypes[logo.type];

      if (!extension) {
        return NextResponse.json(
          { error: "Only JPG, PNG and WebP logos are allowed." },
          { status: 400 }
        );
      }

      if (logo.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "The party logo must not exceed 5 MB." },
          { status: 400 }
        );
      }

      const path = `${user.id}/${randomUUID()}.${extension}`;
      const bytes = Buffer.from(await logo.arrayBuffer());
      logoBlurhash = await computeBlurhash(bytes);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, {
          contentType: logo.type,
          upsert: false,
          cacheControl: "3600",
        });

      if (uploadError) {
        console.error("Party logo upload failed:", uploadError);
        return NextResponse.json(
          { error: `Logo upload failed: ${uploadError.message}` },
          { status: 400 }
        );
      }

      uploadedPath = path;
      const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);
      logoUrl = publicUrl.publicUrl;
    }

    const record = {
      name,
      acronym,
      logo_url: logoUrl,
      official_website: officialWebsite,
      publication_status: publicationStatus,
    };

    const insertParty = (values: Record<string, unknown>) =>
      supabase
        .from("political_parties")
        .insert(values)
        .select("id, name, acronym, logo_url")
        .single();

    let { data, error } = await insertParty(
      logoBlurhash ? { ...record, logo_blurhash: logoBlurhash } : record
    );

    // Migration 019 not applied yet: save without the placeholder.
    if (error && logoBlurhash && isMissingColumnError(error)) {
      ({ data, error } = await insertParty(record));
    }

    if (error) {
      if (uploadedPath) {
        await supabase.storage.from(BUCKET).remove([uploadedPath]);
      }

      console.error("Political party creation failed:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ party: data }, { status: 201 });
  } catch (error) {
    if (uploadedPath) {
      await supabase.storage.from(BUCKET).remove([uploadedPath]);
    }

    console.error("Political parties API error:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
