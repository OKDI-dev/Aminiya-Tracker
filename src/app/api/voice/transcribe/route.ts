import { randomUUID } from "node:crypto";
import { request as httpsRequest } from "node:https";
import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponseInit } from "@/lib/rate-limit";

/** A 60-second voice question is well under 2 MB; 10 MB leaves headroom. */
const MAX_AUDIO_SIZE = 10 * 1024 * 1024;
/** Transcriptions per IP per hour; each one spends NaijaLLM credits. */
const TRANSCRIBE_LIMIT_PER_HOUR = 15;
const TRANSCRIPTION_URL =
  "https://asr.naijallm.com/v1/audio/transcriptions";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function requestTranscription(
  apiKey: string,
  audio: Buffer,
  filename: string,
  mimeType: string,
  language: "en" | "ha"
): Promise<{ statusCode: number; body: string }> {
  const boundary = `----AminiyaVoice${randomUUID()}`;
  const safeFilename = filename.replace(/["\r\n]/g, "_");

  const parts = [
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${safeFilename}"\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`
    ),
    audio,
    Buffer.from(
      `\r\n--${boundary}\r\n` +
        `Content-Disposition: form-data; name="language"\r\n\r\n` +
        `${language}\r\n` +
        `--${boundary}--\r\n`
    ),
  ];

  const payload = Buffer.concat(parts);

  return new Promise((resolve, reject) => {
    const outgoing = httpsRequest(
      TRANSCRIPTION_URL,
      {
        method: "POST",
        family: 4,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": String(payload.length),
        },
      },
      (incoming) => {
        const chunks: Buffer[] = [];

        incoming.on("data", (chunk: Buffer) => chunks.push(chunk));

        incoming.on("end", () => {
          resolve({
            statusCode: incoming.statusCode ?? 502,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });

        incoming.on("error", reject);
      }
    );

    outgoing.setTimeout(90000, () => {
      outgoing.destroy(new Error("Naija Speech transcription timed out."));
    });

    outgoing.on("error", reject);
    outgoing.write(payload);
    outgoing.end();
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.NAIJA_ASR_KEY;

  if (!apiKey) {
    return errorResponse("Voice transcription is not configured.", 503);
  }

  // Check the limit before reading the upload, so blocked callers cost nothing.
  const limit = await checkRateLimit(
    request,
    "assistant-transcribe",
    TRANSCRIBE_LIMIT_PER_HOUR,
    "You've used voice input a lot in a short time. Please type your question or try again later."
  );

  if (!limit.allowed) {
    const { body, init } = rateLimitResponseInit(limit);
    return NextResponse.json(body, init);
  }

  // Reject oversized uploads from the header before buffering the body.
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_AUDIO_SIZE + 64 * 1024) {
    return errorResponse("The recording is too long. Keep voice questions under a minute.", 413);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorResponse("The audio upload could not be read.", 400);
  }

  const audio = formData.get("file");
  const requestedLanguage = formData.get("language");

  if (!(audio instanceof File)) {
    return errorResponse("An audio recording is required.", 400);
  }

  if (audio.size === 0 || audio.size > MAX_AUDIO_SIZE) {
    return errorResponse(
      "The recording is empty or too long. Keep voice questions under a minute.",
      400
    );
  }

  if (requestedLanguage !== "en" && requestedLanguage !== "ha") {
    return errorResponse("Choose English or Hausa for transcription.", 400);
  }

  try {
    const audioBuffer = Buffer.from(await audio.arrayBuffer());
    const filename = audio.name || "recording.webm";
    const mimeType = audio.type || "application/octet-stream";

    let providerResponse:
      | { statusCode: number; body: string }
      | undefined;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        providerResponse = await requestTranscription(
          apiKey,
          audioBuffer,
          filename,
          mimeType,
          requestedLanguage
        );
        break;
      } catch (error) {
        console.error(
          `Naija Speech transcription connection attempt ${attempt} failed:`,
          {
            message:
              error instanceof Error ? error.message : "Unknown error",
            code:
              error && typeof error === "object" && "code" in error
                ? error.code
                : undefined,
          }
        );

        if (attempt === 2) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    if (!providerResponse) {
      return errorResponse("The voice service did not respond.", 502);
    }

    if (
      providerResponse.statusCode < 200 ||
      providerResponse.statusCode >= 300
    ) {
      console.error("Naija Speech transcription failed:", {
        status: providerResponse.statusCode,
        response: providerResponse.body.slice(0, 1000),
      });

      return errorResponse(
        "Speech recognition is temporarily unavailable. Please try again.",
        502
      );
    }

    let result: unknown;

    try {
      result = JSON.parse(providerResponse.body);
    } catch {
      return errorResponse("The voice service returned an invalid response.", 502);
    }

    if (
      !result ||
      typeof result !== "object" ||
      !("text" in result) ||
      typeof result.text !== "string" ||
      !result.text.trim()
    ) {
      return errorResponse(
        "No speech could be recognised. Please try again.",
        422
      );
    }

    return NextResponse.json(
      { text: result.text.trim() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Naija Speech transcription request failed:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return errorResponse(
      "Speech recognition is temporarily unavailable. Please try again.",
      502
    );
  }
}
