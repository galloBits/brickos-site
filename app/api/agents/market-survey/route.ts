import { NextResponse } from "next/server";
import { getEntitlement } from "@/lib/entitlement";
import { runAgentPrompt } from "@/lib/anthropic";

export const maxDuration = 120;

const MAX = 4000;

export async function POST(request: Request) {
  const { entitled } = await getEntitlement("market-surveyor");
  if (!entitled) {
    return NextResponse.json({ error: "Not entitled to this agent" }, { status: 403 });
  }

  const { market, propertyType, data, question } = await request.json();
  const fields = { market, propertyType, data, question };
  for (const [name, value] of Object.entries(fields)) {
    if (typeof value !== "string" || value.length > MAX) {
      return NextResponse.json({ error: `${name} must be a string up to ${MAX} characters` }, { status: 400 });
    }
  }
  if (!market.trim()) {
    return NextResponse.json({ error: "market is required" }, { status: 400 });
  }

  const result = await runAgentPrompt({
    system:
      "You are a real estate market research analyst producing a market survey brief for an investor. You have NO live market data. Only use numbers the investor supplied in their data section; never invent rents, prices, vacancy rates, cap rates, or trends. If they supplied little or no data, say so plainly and focus on what to collect. Structure the brief as: (1) What the supplied data shows, (2) Gaps and what to verify, with suggested sources such as county records, MLS/broker comps, local rental listings, and census/BLS data, (3) Questions to ask local brokers or property managers, (4) Key risks specific to this market and property type, clearly labeled as general considerations rather than verified facts. Be concise.",
    user: `Market: ${market}\nProperty type: ${propertyType || "not specified"}\n\nData I have:\n${data || "(none)"}\n\nWhat I want to know:\n${question || "General market overview"}`,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ analysis: result.text });
}
