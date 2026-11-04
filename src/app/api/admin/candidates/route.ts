import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "candidate-photos";
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
        { error: "You are not authorised to manage candidates." },
        { status: 403 }
      );
    }

    const formData = await request.formData();

    const fullName = String(formData.get("full_name") ?? "").trim();
    const biography = String(formData.get("biography") ?? "").trim() || null;
    const officialProfileUrl =
      String(formData.get("official_profile_url") ?? "").trim() || null;
    const publicationStatus = String(formData.get("publication_status") ?? "draft");
    const photo = formData.get("photo");

    if (!fullName || fullName.length > 200) {
      return NextResponse.json(
        { error: "Enter a candidate name of no more than 200 characters." },
        { status: 400 }
      );
    }

    if (biography && biography.length > 10000) {
      return NextResponse.json(
        { error: "Biography must not exceed 10,000 characters." },
        { status: 400 }
      );
    }

    if (
      officialProfileUrl &&
      (officialProfileUrl.length > 2048 || !isValidHttpUrl(officialProfileUrl))
    ) {
      return NextResponse.json(
        { error: "Enter a valid HTTP or HTTPS official profile URL." },
        { status: 400 }
      );
    }

    if (!allowedStatuses.includes(publicationStatus)) {
      return NextResponse.json(
        { error: "Select a valid publication status." },
        { status: 400 }
      );
    }

    let photoUrl: string | null = null;

    if (photo instanceof File && photo.size > 0) {
      const extension = allowedMimeTypes[photo.type];

      if (!extension) {
        return NextResponse.json(
          { error: "Only JPG, PNG and WebP images are allowed." },
          { status: 400 }
        );
      }

      if (photo.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "The candidate photograph must not exceed 5 MB." },
          { status: 400 }
        );
      }

      const path = `${user.id}/${randomUUID()}.${extension}`;
      const bytes = Buffer.from(await photo.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, {
          contentType: photo.type,
          upsert: false,
          cacheControl: "3600",
        });

      if (uploadError) {
        console.error("Candidate photo upload failed:", uploadError);
        return NextResponse.json(
          { error: `Photo upload failed: ${uploadError.message}` },
          { status: 400 }
        );
      }

      uploadedPath = path;
      const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);
      photoUrl = publicUrl.publicUrl;
    }

    const { data, error } = await supabase
      .from("candidates")
      .insert({
        full_name: fullName,
        biography,
        photo_url: photoUrl,
        official_profile_url: officialProfileUrl,
        publication_status: publicationStatus,
      })
      .select("id, full_name, photo_url")
      .single();

    if (error) {
      if (uploadedPath) {
        await supabase.storage.from(BUCKET).remove([uploadedPath]);
      }

      console.error("Candidate creation failed:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ candidate: data }, { status: 201 });
  } catch (error) {
    if (uploadedPath) {
      await supabase.storage.from(BUCKET).remove([uploadedPath]);
    }

    console.error("Candidate API error:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
