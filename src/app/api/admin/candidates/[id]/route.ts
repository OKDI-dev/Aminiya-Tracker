import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { computeBlurhash, isMissingColumnError } from "@/lib/server/blurhash";

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

async function authorisedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      user: null,
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error } = await supabase
    .from("app_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (
    error ||
    !profile ||
    !["admin", "electoral_reviewer"].includes(profile.role)
  ) {
    return {
      supabase,
      user: null,
      response: NextResponse.json(
        { error: "You are not authorised to manage candidates." },
        { status: 403 }
      ),
    };
  }

  return { supabase, user, response: null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let uploadedPath: string | null = null;

  try {
    const { supabase, user, response } = await authorisedClient();
    if (response || !user) return response;

    const { id } = await params;

    const { data: existing, error: existingError } = await supabase
      .from("candidates")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      console.error("Candidate lookup error:", existingError);
      return NextResponse.json(
        { error: "Could not load this candidate." },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Candidate not found." },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const fullName = String(formData.get("full_name") ?? "").trim();
    const biography = String(formData.get("biography") ?? "").trim() || null;
    const officialProfileUrl =
      String(formData.get("official_profile_url") ?? "").trim() || null;
    const publicationStatus = String(
      formData.get("publication_status") ?? ""
    );
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
      (officialProfileUrl.length > 2048 ||
        !isValidHttpUrl(officialProfileUrl))
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

    const updateRecord: Record<string, unknown> = {
      full_name: fullName,
      biography,
      official_profile_url: officialProfileUrl,
      publication_status: publicationStatus,
    };

    let photoBlurhash: string | null = null;

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
      photoBlurhash = await computeBlurhash(bytes);

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
      const { data: publicUrl } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      updateRecord.photo_url = publicUrl.publicUrl;
    }

    const updateCandidate = (values: Record<string, unknown>) =>
      supabase
        .from("candidates")
        .update(values)
        .eq("id", id)
        .select("id, full_name, photo_url, publication_status")
        .maybeSingle();

    let { data, error } = await updateCandidate(
      photoBlurhash
        ? { ...updateRecord, photo_blurhash: photoBlurhash }
        : updateRecord
    );

    if (error && photoBlurhash && isMissingColumnError(error)) {
      ({ data, error } = await updateCandidate(updateRecord));
    }

    if (error || !data) {
      if (uploadedPath) {
        await supabase.storage.from(BUCKET).remove([uploadedPath]);
        uploadedPath = null;
      }

      console.error("Candidate update failed:", error);
      return NextResponse.json(
        { error: error?.message || "Candidate not found or inaccessible." },
        { status: error ? 400 : 404 }
      );
    }

    return NextResponse.json({ candidate: data });
  } catch (error) {
    if (uploadedPath) {
      const { supabase } = await authorisedClient();
      await supabase.storage.from(BUCKET).remove([uploadedPath]);
    }

    console.error("Candidate update API error:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, response } = await authorisedClient();
    if (response) return response;

    const { id } = await params;

    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (candidateError) {
      console.error("Candidate lookup error:", candidateError);
      return NextResponse.json(
        { error: "Could not verify this candidate." },
        { status: 500 }
      );
    }

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found." },
        { status: 404 }
      );
    }

    const [candidaciesResult, electionResultsResult] = await Promise.all([
      supabase
        .from("candidacies")
        .select("id", { count: "exact", head: true })
        .eq("candidate_id", id),
      supabase
        .from("election_results")
        .select("id", { count: "exact", head: true })
        .eq("candidate_id", id),
    ]);

    if (candidaciesResult.error || electionResultsResult.error) {
      console.error("Candidate reference check failed:", {
        candidacies: candidaciesResult.error,
        electionResults: electionResultsResult.error,
      });

      return NextResponse.json(
        { error: "Could not verify whether this candidate is linked to other electoral records. Nothing was deleted." },
        { status: 500 }
      );
    }

    const candidaciesCount = candidaciesResult.count ?? 0;
    const resultsCount = electionResultsResult.count ?? 0;

    if (candidaciesCount > 0 || resultsCount > 0) {
      const references = [
        candidaciesCount > 0
          ? `${candidaciesCount} candidacy record(s)`
          : null,
        resultsCount > 0
          ? `${resultsCount} election result record(s)`
          : null,
      ].filter(Boolean);

      return NextResponse.json(
        {
          error: `This candidate is linked to ${references.join(" and ")}. Remove or reassign those references before deleting the candidate.`,
        },
        { status: 409 }
      );
    }

    const { error: deleteError } = await supabase
      .from("candidates")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Candidate deletion error:", deleteError);

      return NextResponse.json(
        {
          error:
            deleteError.code === "23503"
              ? "This candidate is still referenced by another electoral record and cannot be deleted."
              : "The candidate could not be deleted. No linked records were removed.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Candidate deletion API error:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
