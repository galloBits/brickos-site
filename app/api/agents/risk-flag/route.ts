import { NextResponse } from "next/server";
import { getEntitlement } from "@/lib/entitlement";
import { getAnthropic, AGENT_MODEL } from "@/lib/anthropic";

export async function POST(request: Request) {
  const { entitled } = await getEntitlement("risk-flag-ai");
  if (!entitled) {
    return NextResponse.json({ error: "Not entitled to this agent" }, { status: 403 });
  }

  const { dealNotes } = await request.json();
  if (!dealNotes || typeof dealNotes !== "string" || dealNotes.length > 4000) {
    return NextResponse.json({ error: "dealNotes is required (max 4000 chars)" }, { status: 400 });
  }

  const message = await getAnthropic().messages.create({
    model: AGENT_MODEL,
    max_tokens: 1024,
    system:
      "You are a real estate acquisitions risk analyst. Given free-text deal notes from an investor, list the concrete red flags and open questions they should investigate before making an offer. Be specific and concise — a numbered list, no preamble, no disclaimers beyond what's asked. If the notes are too sparse to say anything specific, say what additional information you'd need.",
    messages: [{ role: "user", content: dealNotes }],
  });

  const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return NextResponse.json({ analysis: text });
}
