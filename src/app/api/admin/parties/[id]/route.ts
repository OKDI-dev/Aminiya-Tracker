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
        { error: "You are not authorised to manage political parties." },
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
      .from("political_parties")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      console.error("Party lookup error:", existingError);
      return NextResponse.json(
        { error: "Could not load this political party." },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Political party not found." },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const acronym =
      String(formData.get("acronym") ?? "").trim().toUpperCase() || null;
    const officialWebsite =
      String(formData.get("official_website") ?? "").trim() || null;
    const publicationStatus = String(
      formData.get("publication_status") ?? ""
    );
    const logo = formData.get("logo");

    if (!name || name.length > 200) {
      return NextResponse.json(
        { error: "Enter a party name of no more than 200 characters." },
        { status: 400 }
      );
    }

    if (acronym && acronym.length > 30) {
      return NextResponse.json(
        { error: "Acronym must not exceed 30 characters." },
        { status: 400 }
      );
    }

    if (
      officialWebsite &&
      (officialWebsite.length > 2048 ||
        !isValidHttpUrl(officialWebsite))
    ) {
      return NextResponse.json(
        { error: "Enter a valid HTTP or HTTPS official website URL." },
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
      name,
      acronym,
      official_website: officialWebsite,
      publication_status: publicationStatus,
    };

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
      const { data: publicUrl } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      updateRecord.logo_url = publicUrl.publicUrl;
    }

    const updateParty = (values: Record<string, unknown>) =>
      supabase
        .from("political_parties")
        .update(values)
        .eq("id", id)
        .select("id, name, acronym, logo_url, publication_status")
        .maybeSingle();

    let { data, error } = await updateParty(
      logoBlurhash
        ? { ...updateRecord, logo_blurhash: logoBlurhash }
        : updateRecord
    );

    if (error && logoBlurhash && isMissingColumnError(error)) {
      ({ data, error } = await updateParty(updateRecord));
    }

    if (error || !data) {
      if (uploadedPath) {
        await supabase.storage.from(BUCKET).remove([uploadedPath]);
        uploadedPath = null;
      }

      console.error("Party update failed:", error);
      return NextResponse.json(
        { error: error?.message || "Party not found or inaccessible." },
        { status: error ? 400 : 404 }
      );
    }

    return NextResponse.json({ party: data });
  } catch (error) {
    if (uploadedPath) {
      const { supabase } = await authorisedClient();
      await supabase.storage.from(BUCKET).remove([uploadedPath]);
    }

    console.error("Party update API error:", error);
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

    const { data: party, error: partyError } = await supabase
      .from("political_parties")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (partyError) {
      console.error("Party lookup error:", partyError);
      return NextResponse.json(
        { error: "Could not verify this political party." },
        { status: 500 }
      );
    }

    if (!party) {
      return NextResponse.json(
        { error: "Political party not found." },
        { status: 404 }
      );
    }

    const [candidaciesResult, electionResultsResult] = await Promise.all([
      supabase
        .from("candidacies")
        .select("id", { count: "exact", head: true })
        .eq("party_id", id),
      supabase
        .from("election_results")
        .select("id", { count: "exact", head: true })
        .eq("party_id", id),
    ]);

    if (candidaciesResult.error || electionResultsResult.error) {
      console.error("Party reference check failed:", {
        candidacies: candidaciesResult.error,
        electionResults: electionResultsResult.error,
      });

      return NextResponse.json(
        { error: "Could not verify whether this party is linked to other electoral records. Nothing was deleted." },
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
          error: `This party is linked to ${references.join(" and ")}. Remove or reassign those references before deleting the party.`,
        },
        { status: 409 }
      );
    }

    const { error: deleteError } = await supabase
      .from("political_parties")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Party deletion error:", deleteError);

      return NextResponse.json(
        {
          error:
            deleteError.code === "23503"
              ? "This party is still referenced by another electoral record and cannot be deleted."
              : "The party could not be deleted. No linked records were removed.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Party deletion API error:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
