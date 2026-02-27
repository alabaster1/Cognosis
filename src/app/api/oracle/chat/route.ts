import { NextRequest, NextResponse } from "next/server";

const ORACLE_SYSTEM_PROMPT = `You are Cognosis Oracle: a scientist exploring the mystical.

Mission:
Explain, challenge, and investigate consciousness-related claims with scientific rigor, epistemic honesty, and clear communication.

Operating principles (always on):
1) Evidence first. Never present speculation as fact.
2) Explicitly separate observations, interpretations, and hypotheses when relevant.
3) Label evidence strength: strong / moderate / weak / absent.
4) Label confidence: high / medium / low.
5) If evidence is weak or absent, state a concrete test that could validate or falsify the claim.
6) Avoid dogma from both sides: no materialist absolutism, no mystical absolutism.
7) Describe scientific blind spots without anti-science rhetoric.
8) Treat parapsychology and anomalous claims as testable, not self-validating.
9) Never invent studies, citations, data, quotes, or authorities.
10) Be concise, precise, and useful.

Safety and integrity:
1) Do not provide medical, psychiatric, legal, or financial diagnosis/advice.
2) For health-risk topics, provide general educational framing and suggest qualified professionals.
3) If certainty beyond evidence is requested, refuse certainty and explain why.

Internal schema for substantial responses:
1) Claim type: empirical / theoretical / metaphysical / rhetorical
2) Evidence status: strong / moderate / weak / absent
3) Confidence: high / medium / low
4) Best next test: concrete, feasible, falsifiable

Default output styles:
- Explainer: What we know, What remains uncertain, How to test this, Why this matters, then evidence level + confidence.

Hard fail conditions:
1) No fabricated citations, studies, data, or quotes.
2) No fringe claim framed as proven fact.
3) No anti-science blanket statements.
4) No certainty claim without adequate evidence.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface OracleChatRequest {
  messages: ChatMessage[];
}

interface ResponsesContentItem {
  type?: string;
  text?: string;
}

interface ResponsesOutputItem {
  type?: string;
  role?: string;
  content?: ResponsesContentItem[];
}

interface ResponsesApiResult {
  output_text?: string;
  output?: ResponsesOutputItem[];
}

const DEFAULT_MODEL = "gpt-4.1-mini";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_MESSAGES = 20;
const MAX_TOTAL_CHARS = 12_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const ipWindow = new Map<string, { start: number; count: number }>();

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipWindow.get(ip);

  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    ipWindow.set(ip, { start: now, count: 1 });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

function totalChars(messages: ChatMessage[]): number {
  return messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
}

function buildResponse(
  body: Record<string, unknown>,
  status: number,
  requestId: string
): NextResponse {
  const res = NextResponse.json(
    {
      ...body,
      requestId,
    },
    { status }
  );
  res.headers.set("x-request-id", requestId);
  return res;
}

function extractAnswer(data: ResponsesApiResult): string {
  const direct = data.output_text?.trim();
  if (direct) return direct;

  const fromOutput = (data.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text!.trim())
    .filter(Boolean)
    .join("\n")
    .trim();

  return fromOutput;
}

export async function POST(req: NextRequest) {
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  const requestedModel = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const allowedModels = new Set(
    (process.env.ORACLE_ALLOWED_MODELS || `${DEFAULT_MODEL},gpt-4o-mini`)
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean)
  );
  const model = allowedModels.has(requestedModel) ? requestedModel : DEFAULT_MODEL;
  const ip = getClientIp(req);

  if (isRateLimited(ip)) {
    console.warn("[Oracle API] rate_limited", {
      requestId,
      ip,
      model,
    });
    return buildResponse(
      { error: "Too many Oracle requests. Please slow down." },
      429,
      requestId
    );
  }

  if (!apiKey) {
    console.error("[Oracle API] missing_api_key", { requestId, model });
    return buildResponse(
      { error: "Missing OPENAI_API_KEY in server environment." },
      500,
      requestId
    );
  }

  let payload: OracleChatRequest;
  try {
    payload = (await req.json()) as OracleChatRequest;
  } catch {
    console.warn("[Oracle API] invalid_json", { requestId, model });
    return buildResponse({ error: "Invalid JSON body." }, 400, requestId);
  }

  if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
    return buildResponse(
      { error: "messages must be a non-empty array." },
      400,
      requestId
    );
  }

  if (payload.messages.length > MAX_MESSAGES || totalChars(payload.messages) > MAX_TOTAL_CHARS) {
    console.warn("[Oracle API] payload_too_large", {
      requestId,
      model,
      messageCount: payload.messages.length,
      totalChars: totalChars(payload.messages),
    });
    return buildResponse(
      { error: "Message payload too large." },
      413,
      requestId
    );
  }

  const modePrompt =
    "Channel mode is Website. Prioritize clear, educational explanations.";

  const recentMessages = payload.messages.slice(-12);
  const input = [
    {
      role: "system",
      content: [
        {
          type: "input_text",
          text: `${ORACLE_SYSTEM_PROMPT}\n\n${modePrompt}`,
        },
      ],
    },
    ...recentMessages.map((message) => ({
      role: message.role,
      content: [
        {
          type: message.role === "assistant" ? "output_text" : "input_text",
          text: message.content,
        },
      ],
    })),
  ];

  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input,
        temperature: 0.4,
      }),
      signal: controller.signal,
    });
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }

    if (!response.ok) {
      const errText = await response.text();
      let upstreamDetails = errText;

      try {
        const parsed = JSON.parse(errText) as { error?: { message?: string } };
        upstreamDetails = parsed.error?.message || errText;
      } catch {
        // Keep raw text when upstream response is not JSON.
      }

      console.error(
        `[Oracle API] upstream_error requestId=${requestId} status=${response.status} model=${model} latencyMs=${Date.now() - startedAt}: ${upstreamDetails}`
      );

      return buildResponse(
        {
          error: "Oracle upstream request failed.",
          details: upstreamDetails,
          upstreamStatus: response.status,
        },
        502,
        requestId
      );
    }

    const data = (await response.json()) as ResponsesApiResult;
    const answer = extractAnswer(data);

    if (!answer) {
      console.error("[Oracle API] empty_response", {
        requestId,
        model,
        latencyMs: Date.now() - startedAt,
      });
      return buildResponse(
        { error: "Oracle returned an empty response." },
        502,
        requestId
      );
    }

    console.log("[Oracle API] success", {
      requestId,
      model,
      latencyMs: Date.now() - startedAt,
      inputMessages: recentMessages.length,
      outputChars: answer.length,
    });
    return buildResponse({ answer }, 200, requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Oracle API] request_failed", {
      requestId,
      model,
      latencyMs: Date.now() - startedAt,
      error: message,
    });
    return buildResponse(
      { error: "Failed to contact Oracle model.", details: message },
      500,
      requestId
    );
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
