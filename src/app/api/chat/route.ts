import Groq from "groq-sdk";
import { Agent } from "undici";
import { NextResponse } from "next/server";

import {
  buildAminiyaSystemPrompt,
  type AssistantLanguage,
} from "@/lib/aminiya-assistant-prompts";
import { checkRateLimit, rateLimitResponseInit } from "@/lib/rate-limit";

/** Questions per IP per hour; each one spends Groq credits. */
const CHAT_LIMIT_PER_HOUR = 30;

// Force IPv4 because this server environment cannot reliably
// establish outbound IPv6 connections to the Groq API.
const ipv4Agent = new Agent({
  connect: { family: 4 },
});

const MAX_MESSAGES = 16;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_TOTAL_CHARACTERS = 14000;

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  messages: IncomingMessage[];
  language?: AssistantLanguage;
};

const headers = {
  "Cache-Control": "no-store, max-age=0",
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers });
}

function getDeterministicReply(
  message: string,
  language: AssistantLanguage
): string | null {
  const normalized = message
    .toLowerCase()
    .replace(/[’‘]/g, "'");

  const asksForMeaning =
    /\b(what does|what do|what is the meaning of|meaning of|what is meant by|explain|define|means|meaning|difference between)\b/.test(normalized) ||
    /\b(menene|ma'anar|me ake nufi|yana nufin|bayyana)\b/.test(normalized);

  const statusLabels = [
    "submitted",
    "under review",
    "action required",
    "resolved",
    "closed",
  ];

  const issueStatus = statusLabels.find((status) =>
    normalized.includes(status)
  );

  if (asksForMeaning && issueStatus) {
    const label =
      issueStatus === "under review"
        ? "Under review"
        : issueStatus === "action required"
          ? "Action required"
          : issueStatus.charAt(0).toUpperCase() + issueStatus.slice(1);

    if (language === "ha") {
      return `Aminiya Tracker na amfani da "${label}" a matsayin alamar matsayin rahoton matsalar al'umma. Bayanan dandamalin ba su fayyace ainihin ma'anar wannan matsayin a aikace ba. Takaitaccen bayani na jama'a ko bayanin warware matsala, idan akwai, na iya ƙara haske.`;
    }

    return `Aminiya Tracker uses "${label}" as a community-issue status label. The platform's documented information does not define the operational meaning of this status. Any available public summary or resolution summary for the specific issue may provide additional context.`;
  }

  const mentionsOfficial =
    /\bofficial\b/.test(normalized);
  const mentionsVerified =
    /\bverified\b|\bverification\b/.test(normalized);

  const asksAboutElectionVerification =
    (mentionsOfficial && mentionsVerified) ||
    (
      mentionsVerified &&
      /\b(election|result|results|vote|votes|figures|accurate|accuracy|correct)\b/.test(normalized)
    );

  if (asksAboutElectionVerification) {
    if (language === "ha") {
      return `Aminiya Tracker na amfani da "Official" da "Provisional" a matsayin alamun result_type. Bayanan dandamalin ba su bayyana wanda ke sanya waɗannan alamomi ko ma'anarsu ta fuskar doka ba. "Verified" yana nufin matsayin verification_status na tushen bayanin da aka haɗa. Tsarin yana buƙatar wannan matsayin ya zama "verified" kafin a tabbatar da sakamako ko a wallafa shi. Wannan ba yana nufin Aminiya ta tabbatar da daidaiton ƙuri'un ko ta yi bincike mai zaman kansa a kansu ba.`;
    }

    return `On Aminiya Tracker, "Official" and "Provisional" are result_type labels. The platform documentation does not establish who assigns these labels or define their legal meaning. "Verified" refers to the linked electoral source's verification_status. The workflow requires that source status to be "verified" before a result can be verified or published. This does not mean Aminiya has confirmed that the vote figures are accurate or independently audited them.`;
  }

  return null;
}

export async function POST(request: Request) {
  const limit = await checkRateLimit(
    request,
    "assistant-chat",
    CHAT_LIMIT_PER_HOUR,
    "You've asked a lot of questions in a short time. Please try again later."
  );

  if (!limit.allowed) {
    const { body, init } = rateLimitResponseInit(limit);
    return NextResponse.json(body, init);
  }

  let body: ChatRequestBody;

  try {
    body = await request.json();
  } catch {
    return errorResponse("The request body must be valid JSON.", 400);
  }

  if (!body || !Array.isArray(body.messages)) {
    return errorResponse("A messages array is required.", 400);
  }

  if (
    body.messages.length === 0 ||
    body.messages.length > MAX_MESSAGES
  ) {
    return errorResponse(
      `Send between 1 and ${MAX_MESSAGES} messages per request.`,
      400
    );
  }

  const language: AssistantLanguage =
    body.language === "ha" ? "ha" : "en";

  let totalCharacters = 0;
  const safeMessages: IncomingMessage[] = [];

  for (const message of body.messages) {
    if (
      !message ||
      (message.role !== "user" && message.role !== "assistant") ||
      typeof message.content !== "string"
    ) {
      return errorResponse(
        "Each message must have a valid role and text content.",
        400
      );
    }

    const content = message.content.trim();

    if (!content || content.length > MAX_MESSAGE_LENGTH) {
      return errorResponse(
        `Each message must contain between 1 and ${MAX_MESSAGE_LENGTH} characters.`,
        400
      );
    }

    totalCharacters += content.length;

    if (totalCharacters > MAX_TOTAL_CHARACTERS) {
      return errorResponse(
        "The conversation is too long. Please start a new chat.",
        400
      );
    }

    safeMessages.push({
      role: message.role,
      content,
    });
  }

  if (safeMessages[safeMessages.length - 1]?.role !== "user") {
    return errorResponse(
      "The last message must be from the user.",
      400
    );
  }

  const deterministicReply = getDeterministicReply(
    safeMessages[safeMessages.length - 1].content,
    language
  );

  if (deterministicReply) {
    return NextResponse.json(
      { reply: deterministicReply },
      { headers }
    );
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return errorResponse(
      "The assistant is not configured yet. Please try again later.",
      503
    );
  }

  try {
    const groq = new Groq({
      apiKey,
      timeout: 30000,
      maxRetries: 1,
      fetch: (url, init) =>
        fetch(url, {
          ...init,
          dispatcher: ipv4Agent,
        } as RequestInit & { dispatcher: Agent }),
    });

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content: buildAminiyaSystemPrompt(language),
        },
        ...safeMessages,
      ],
      temperature: 0.3,
      max_tokens: 900,
    });

    const reply = completion.choices[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return errorResponse(
        "The assistant could not produce a response. Please try again.",
        502
      );
    }

    return NextResponse.json(
      { reply: reply.trim() },
      { headers }
    );
  } catch (error) {
    console.error(
      "Aminiya chat request failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return errorResponse(
      "The assistant is temporarily unavailable. Please try again shortly.",
      502
    );
  }
}
