import Anthropic from "@anthropic-ai/sdk";

// Lazy singleton, same reasoning as lib/stripe.ts and lib/email.ts: avoid
// throwing during Next.js build-time route collection when
// ANTHROPIC_API_KEY isn't set yet.
let _anthropic: Anthropic | undefined;

export const AGENT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

export function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _anthropic;
}

export type Effort = "low" | "medium" | "high";

export type AgentResult = { ok: true; text: string } | { ok: false; error: string };

// One place for every Claude-backed agent call. Uses server-side refusal
// fallbacks so a safety-classifier false positive on a routine real-estate
// document is retried on another model instead of failing outright.
export async function runAgentPrompt(opts: {
  system: string;
  user: string;
  effort?: Effort;
}): Promise<AgentResult> {
  try {
    const response = await getAnthropic().beta.messages.create({
      model: AGENT_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: opts.effort ?? "medium" },
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, error: "The model declined this request. Try rephrasing or removing unusual content." };
    }

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!text) return { ok: false, error: "The model returned an empty response. Please try again." };
    if (response.stop_reason === "max_tokens") {
      return { ok: true, text: `${text}\n\n[Response was cut off — try a shorter input.]` };
    }
    return { ok: true, text };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "The Anthropic API key is missing or invalid." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Too many requests right now. Please try again in a minute." };
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API error", error.status, error.message);
      return { ok: false, error: "The AI service returned an error. Please try again." };
    }
    console.error("Anthropic call failed", error);
    return { ok: false, error: "Couldn't reach the AI service. Please try again." };
  }
}
