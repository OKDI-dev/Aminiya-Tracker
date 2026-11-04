import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { adminSupabase } from "@/lib/supabase/admin";


const BUCKET = "promise-progress-evidence";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

function safeFilename(filename: string) {
  return filename
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(-180) || "evidence";
}

function hasValidSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (type === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (type === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  if (type === "application/pdf") {
    return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
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
      .single();

    if (
      profileError ||
      !profile ||
      !["admin", "electoral_reviewer"].includes(profile.role)
    ) {
      return NextResponse.json({ error: "Electoral staff access required." }, { status: 403 });
    }

    const formData = await request.formData();
    const updateId = String(formData.get("update_id") || "").trim();
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updateId)) {
      return NextResponse.json({ error: "A valid progress update ID is required." }, { status: 400 });
    }

    if (files.length < 1 || files.length > 5) {
      return NextResponse.json({ error: "Select between 1 and 5 files." }, { status: 400 });
    }

    const { data: update, error: updateError } = await adminSupabase
      .from("promise_progress_updates")
      .select("id, review_status")
      .eq("id", updateId)
      .maybeSingle();

    if (updateError || !update) {
      return NextResponse.json({ error: "Progress update not found." }, { status: 404 });
    }

    if (update.review_status !== "pending") {
      return NextResponse.json(
        { error: "Evidence can only be added while the progress update is pending review." },
        { status: 409 }
      );
    }

    const { count, error: countError } = await adminSupabase
      .from("promise_progress_evidence")
      .select("id", { count: "exact", head: true })
      .eq("progress_update_id", updateId);

    if (countError) {
      return NextResponse.json({ error: "Could not check existing evidence." }, { status: 500 });
    }

    if ((count || 0) + files.length > 5) {
      return NextResponse.json(
        { error: `This update can have up to 5 files. It currently has ${count || 0}.` },
        { status: 400 }
      );
    }

    const uploadedPaths: string[] = [];
    const metadata: {
      progress_update_id: string;
      storage_path: string;
      original_filename: string;
      mime_type: string;
      file_size: number;
      uploaded_by: string;
    }[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        await adminSupabase.storage.from(BUCKET).remove(uploadedPaths);
        return NextResponse.json(
          { error: `${file.name}: unsupported file type.` },
          { status: 400 }
        );
      }

      if (file.size < 1 || file.size > MAX_FILE_SIZE) {
        await adminSupabase.storage.from(BUCKET).remove(uploadedPaths);
        return NextResponse.json(
          { error: `${file.name}: file must be between 1 byte and 10 MB.` },
          { status: 400 }
        );
      }

      const bytes = new Uint8Array(await file.arrayBuffer());

      if (!hasValidSignature(file.type, bytes)) {
        await adminSupabase.storage.from(BUCKET).remove(uploadedPaths);
        return NextResponse.json(
          { error: `${file.name}: file content does not match its declared type.` },
          { status: 400 }
        );
      }

      const path = `${updateId}/${randomUUID()}-${safeFilename(file.name)}`;

      const { error: uploadError } = await adminSupabase.storage
        .from(BUCKET)
        .upload(path, bytes, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        await adminSupabase.storage.from(BUCKET).remove(uploadedPaths);
        return NextResponse.json(
          { error: `Could not upload ${file.name}. ${uploadError.message}` },
          { status: 500 }
        );
      }

      uploadedPaths.push(path);
      metadata.push({
        progress_update_id: updateId,
        storage_path: path,
        original_filename: file.name.slice(0, 255),
        mime_type: file.type,
        file_size: file.size,
        uploaded_by: user.id,
      });
    }

    const { data: inserted, error: insertError } = await adminSupabase
      .from("promise_progress_evidence")
      .insert(metadata)
      .select("id, original_filename, mime_type, file_size, created_at");

    if (insertError) {
      await adminSupabase.storage.from(BUCKET).remove(uploadedPaths);
      return NextResponse.json(
        { error: "Files were uploaded but their records could not be saved. Please retry." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, evidence: inserted });
  } catch (error) {
    console.error("Promise evidence upload error:", error);
    return NextResponse.json({ error: "An unexpected upload error occurred." }, { status: 500 });
  }
}
