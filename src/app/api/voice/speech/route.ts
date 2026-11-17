import { request as httpsRequest } from "node:https";
import { NextResponse } from "next/server";

const MAX_TEXT_LENGTH = 1000;
const SPEECH_URL = "https://asr.naijallm.com/v1/audio/speech";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function requestSpeech(
  apiKey: string,
  text: string,
  language: "en" | "ha"
): Promise<{
  statusCode: number;
  contentType: string | undefined;
  audio: Buffer;
}> {
  const body = JSON.stringify({
    input: text,
    language,
    model: "naija-tts",
    response_format: "mp3",
  });

  return new Promise((resolve, reject) => {
    const outgoing = httpsRequest(
      SPEECH_URL,
      {
        method: "POST",
        family: 4,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (incoming) => {
        const chunks: Buffer[] = [];

        incoming.on("data", (chunk: Buffer) => chunks.push(chunk));

        incoming.on("end", () => {
          resolve({
            statusCode: incoming.statusCode ?? 502,
            contentType: incoming.headers["content-type"],
            audio: Buffer.concat(chunks),
          });
        });

        incoming.on("error", reject);
      }
    );

    outgoing.setTimeout(45000, () => {
      outgoing.destroy(new Error("Naija Speech request timed out."));
    });

    outgoing.on("error", reject);
    outgoing.write(body);
    outgoing.end();
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.NAIJA_ASR_KEY;

  if (!apiKey) {
    return errorResponse("Voice playback is not configured.", 503);
  }

  let body: { text?: unknown; language?: unknown };

  try {
    body = await request.json();
  } catch {
    return errorResponse("The speech request must contain valid JSON.", 400);
  }

  if (typeof body.text !== "string" || !body.text.trim()) {
    return errorResponse("Text to speak is required.", 400);
  }

  if (body.text.length > MAX_TEXT_LENGTH) {
    return errorResponse(
      `Text must not exceed ${MAX_TEXT_LENGTH} characters per request.`,
      400
    );
  }

  if (body.language !== "en" && body.language !== "ha") {
    return errorResponse("Choose English or Hausa for speech.", 400);
  }

  try {
    console.info("Aminiya TTS request:", {
      characters: body.text.trim().length,
      language: body.language,
    });

    let providerResponse:
      | {
          statusCode: number;
          contentType: string | undefined;
          audio: Buffer;
        }
      | undefined;

    for (let attempt = 1; attempt <= 1; attempt++) {
      try {
        providerResponse = await requestSpeech(
          apiKey,
          body.text.trim(),
          body.language
        );
        break;
      } catch (error) {
        console.error(`Naija Speech connection attempt ${attempt} failed:`, {
          message: error instanceof Error ? error.message : "Unknown error",
          code:
            error && typeof error === "object" && "code" in error
              ? error.code
              : undefined,
        });

        if (attempt === 2) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    if (!providerResponse) {
      return errorResponse("The voice service did not respond.", 502);
    }

    if (providerResponse.statusCode < 200 || providerResponse.statusCode >= 300) {
      console.error("Naija Speech audio generation failed:", {
        status: providerResponse.statusCode,
        contentType: providerResponse.contentType,
        response: providerResponse.audio.toString("utf8").slice(0, 1000),
      });

      return errorResponse(
        "Voice generation is temporarily unavailable. Please try again.",
        502
      );
    }

    if (providerResponse.audio.length === 0) {
      return errorResponse("The voice service returned empty audio.", 502);
    }

    return new Response(new Uint8Array(providerResponse.audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(providerResponse.audio.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Naija Speech audio request failed:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return errorResponse(
      "Voice generation is temporarily unavailable. Please try again.",
      502
    );
  }
}
