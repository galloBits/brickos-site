import Anthropic from "@anthropic-ai/sdk";
import { STREAM_ERROR_MARK } from "./stream-protocol";

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

export function friendlyAnthropicError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return "The Anthropic API key is missing or invalid.";
  if (error instanceof Anthropic.RateLimitError) return "Too many requests right now. Please try again in a minute.";
  if (error instanceof Anthropic.APIError) {
    console.error("Anthropic API error", error.status, error.message);
    return "The AI service returned an error. Please try again.";
  }
  console.error("Anthropic call failed", error);
  return "Couldn't reach the AI service. Please try again.";
}

// One place for every Claude-backed agent call. Streams the answer back as
// plain text so users see output within seconds instead of waiting for the
// whole response, and uses server-side refusal fallbacks so a safety-
// classifier false positive on a routine real-estate document is retried on
// another model instead of failing outright.
export function streamAgentResponse(opts: { system: string; user: string; effort?: Effort }): Response {
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));
      try {
        const stream = getAnthropic().beta.messages.stream({
          model: AGENT_MODEL,
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: opts.effort ?? "low" },
          system: opts.system,
          messages: [{ role: "user", content: opts.user }],
        });

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") send(event.delta.text);
        }

        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          send(`${STREAM_ERROR_MARK}The model declined this request. Try rephrasing or removing unusual content.`);
        } else if (final.stop_reason === "max_tokens") {
          send(`${STREAM_ERROR_MARK}The response was cut off. Try a shorter input.`);
        }
      } catch (error) {
        send(`${STREAM_ERROR_MARK}${friendlyAnthropicError(error)}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
