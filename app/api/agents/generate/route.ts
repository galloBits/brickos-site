import { NextResponse } from "next/server";
import { getEntitlement } from "@/lib/entitlement";
import { streamAgentResponse } from "@/lib/anthropic";
import { CLAUDE_AGENTS } from "@/lib/claude-agents";

export const maxDuration = 120;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const slug = body?.slug;
  const rawValues = body?.values;

  if (typeof slug !== "string" || !Object.hasOwn(CLAUDE_AGENTS, slug)) {
    return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
  }
  const cfg = CLAUDE_AGENTS[slug];

  const { entitled } = await getEntitlement(slug);
  if (!entitled) {
    return NextResponse.json({ error: "Not entitled to this agent" }, { status: 403 });
  }

  if (!rawValues || typeof rawValues !== "object") {
    return NextResponse.json({ error: "values is required" }, { status: 400 });
  }

  // Only accept the configured fields; validate type, length, required,
  // and that select values are one of the offered options.
  const values: Record<string, string> = {};
  for (const field of cfg.fields) {
    const raw = rawValues[field.key];
    const value = typeof raw === "string" ? raw : "";
    if (value.length > field.max) {
      return NextResponse.json({ error: `${field.label} is too long (max ${field.max} characters)` }, { status: 400 });
    }
    if (field.required && !value.trim()) {
      return NextResponse.json({ error: `${field.label} is required` }, { status: 400 });
    }
    if (field.type === "select" && value && !field.options?.includes(value)) {
      return NextResponse.json({ error: `Invalid choice for ${field.label}` }, { status: 400 });
    }
    values[field.key] = value;
  }

  return streamAgentResponse({ system: cfg.system, user: cfg.buildUser(values), effort: cfg.effort });
}
