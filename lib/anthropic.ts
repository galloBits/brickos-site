import Anthropic from "@anthropic-ai/sdk";

// Lazy singleton, same reasoning as lib/stripe.ts and lib/email.ts: avoid
// throwing during Next.js build-time route collection when
// ANTHROPIC_API_KEY isn't set yet.
let _anthropic: Anthropic | undefined;

export function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _anthropic;
}
