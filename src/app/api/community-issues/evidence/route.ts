import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { adminSupabase } from "@/lib/supabase/admin";
import { checkCommunityIssueRateLimit } from "@/lib/community-issue-rate-limit";

const BUCKET = "community-issue-evidence";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hasValidSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      )
    );
  }

  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }

  if (mimeType === "application/pdf") {
    return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }

  return false;
}

function safeFilename(filename: string) {
  const cleaned = filename
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 255);

  return cleaned || "evidence";
}

export async function POST(request: Request) {
  const uploadedPaths: string[] = [];
  let reservationId: string | null = null;

  try {
    // Limit upload requests before processing multipart form data.
    const rateLimit = await checkCommunityIssueRateLimit(
      request,
      "evidence",
      10
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.message },
        {
          status: rateLimit.status,
          headers:
            rateLimit.status === 429
              ? { "Retry-After": "3600" }
              : undefined,
        }
      );
    }

    const formData = await request.formData();

    const referenceCode = String(
      formData.get("referenceCode") ?? ""
    ).trim().toUpperCase();

    const trackingToken = String(
      formData.get("trackingToken") ?? ""
    ).trim();

    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File);

    if (
      !/^AMI-\d{4}-[A-F0-9]{10}$/.test(referenceCode) ||
      !/^[a-f0-9]{64}$/.test(trackingToken)
    ) {
      return NextResponse.json(
        { error: "Enter valid tracking details." },
        { status: 400 }
      );
    }

    if (files.length === 0 || files.length > MAX_FILES) {
      return NextResponse.json(
        { error: "Select between 1 and 5 evidence files." },
        { status: 400 }
      );
    }

    const { data: issue, error: issueError } = await adminSupabase
      .from("community_issues")
      .select("id")
      .eq("reference_code", referenceCode)
      .eq("tracking_token_hash", hashToken(trackingToken))
      .maybeSingle();

    if (issueError) {
      console.error("Evidence issue lookup failed:", issueError.message);

      return NextResponse.json(
        { error: "Evidence service is temporarily unavailable." },
        { status: 503 }
      );
    }

    if (!issue) {
      return NextResponse.json(
        { error: "No report was found with those tracking details." },
        { status: 404 }
      );
    }

    // Validate all files before reserving database slots.
    const validatedFiles: {
      file: File;
      buffer: Buffer;
      filename: string;
    }[] = [];

    for (const file of files) {
      if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `${file.name}: each file must be between 1 byte and 10 MB.` },
          { status: 400 }
        );
      }

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            error: `${file.name}: only JPEG, PNG, WebP and PDF files are allowed.`,
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      if (!hasValidSignature(buffer, file.type)) {
        return NextResponse.json(
          {
            error: `${file.name}: the file content does not match its declared format.`,
          },
          { status: 400 }
        );
      }

      validatedFiles.push({
        file,
        buffer,
        filename: safeFilename(file.name),
      });
    }

    // Reserve slots atomically. PostgreSQL locks the issue row while
    // checking existing attachments and active reservations.
    const { data: reservation, error: reservationError } =
      await adminSupabase.rpc(
        "reserve_community_issue_evidence_slots",
        {
          p_issue_id: issue.id,
          p_file_count: validatedFiles.length,
        }
      );

    if (reservationError || !reservation) {
      console.error(
        "Evidence slot reservation failed:",
        reservationError?.message
      );

      const message = reservationError?.message ?? "";

      if (
        message.includes("maximum of five evidence files") ||
        message.includes("Invalid evidence file count")
      ) {
        return NextResponse.json(
          {
            error: "This issue can have a maximum of five evidence files. Remove some files or check existing attachments.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Unable to reserve evidence upload slots. Please try again." },
        { status: 503 }
      );
    }

    reservationId = reservation as string;

    const metadata: {
      issue_id: string;
      storage_path: string;
      original_filename: string;
      mime_type: string;
      file_size: number;
    }[] = [];

    for (const item of validatedFiles) {
      const storagePath =
        `${issue.id}/${randomUUID()}-${item.filename}`;

      const { error: uploadError } = await adminSupabase.storage
        .from(BUCKET)
        .upload(storagePath, item.buffer, {
          contentType: item.file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Evidence upload failed:", uploadError.message);
        throw new Error("An evidence file could not be uploaded.");
      }

      uploadedPaths.push(storagePath);

      metadata.push({
        issue_id: issue.id,
        storage_path: storagePath,
        original_filename: item.filename,
        mime_type: item.file.type,
        file_size: item.file.size,
      });
    }

    const { error: metadataError } = await adminSupabase
      .from("community_issue_evidence")
      .insert(metadata);

    if (metadataError) {
      console.error(
        "Evidence metadata insert failed:",
        metadataError.message
      );

      throw new Error("Evidence could not be registered. Please try again.");
    }

    return NextResponse.json({
      success: true,
      message: "Evidence uploaded successfully.",
      uploaded: metadata.length,
    });
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await adminSupabase.storage
        .from(BUCKET)
        .remove(uploadedPaths);

      if (cleanupError) {
        console.error("Evidence cleanup failed:", cleanupError.message);
      }
    }

    console.error("Community issue evidence error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to upload evidence.",
      },
      { status: 400 }
    );
  } finally {
    // Release the reservation after success or failure.
    if (reservationId) {
      const { error: releaseError } = await adminSupabase.rpc(
        "release_community_issue_evidence_reservation",
        { p_reservation_id: reservationId }
      );

      if (releaseError) {
        console.error(
          "Evidence reservation release failed:",
          releaseError.message
        );
      }
    }
  }
}
