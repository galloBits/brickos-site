"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ghostBtnCls } from "./ui";

export type Lead = { name: string; property: string; notes: string };

const MAX_LEADS = 500;
const CHUNK = 200;

function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const dedupeKey = (name: string, property: string) => `${name.trim().toLowerCase()}|${property.trim().toLowerCase()}`;

// Adds leads to Follow-Up Clock, skipping any that are already tracked
// (same lead name + property). RLS requires the user to hold Follow-Up Clock.
export async function addLeadsToFollowUps(
  supabase: ReturnType<typeof createClient>,
  leads: Lead[],
): Promise<{ added: number; skipped: number }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in again.");

  const existing = await supabase.from("follow_ups").select("lead_name, property_label").limit(10000);
  if (existing.error) throw new Error(friendly(existing.error));
  const seen = new Set((existing.data ?? []).map((r) => dedupeKey(r.lead_name ?? "", r.property_label ?? "")));

  const fresh: Lead[] = [];
  for (const lead of leads.slice(0, MAX_LEADS)) {
    const name = lead.name.trim() || "Unknown owner";
    const key = dedupeKey(name, lead.property);
    if (seen.has(key)) continue;
    seen.add(key);
    fresh.push({ ...lead, name });
  }

  const today = todayIso();
  for (let i = 0; i < fresh.length; i += CHUNK) {
    const { error } = await supabase.from("follow_ups").insert(
      fresh.slice(i, i + CHUNK).map((l) => ({
        user_id: user.id,
        lead_name: l.name,
        property_label: l.property || null,
        notes: l.notes ? `${today}: ${l.notes}` : null,
        next_follow_up: today,
      })),
    );
    if (error) throw new Error(friendly(error));
  }
  return { added: fresh.length, skipped: Math.min(leads.length, MAX_LEADS) - fresh.length };
}

function friendly(error: { code?: string; message: string }): string {
  if (error.code === "42501" || /row-level security/i.test(error.message)) {
    return "You need the Follow-Up Clock agent to send leads there. Add it from the pricing page.";
  }
  return error.message;
}

export function SendLeadsButton({ leads, label }: { leads: Lead[]; label?: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setBusy(true);
    setResult(null);
    try {
      const { added, skipped } = await addLeadsToFollowUps(supabase, leads);
      setResult({
        ok: true,
        text: `Added ${added} lead${added === 1 ? "" : "s"} to Follow-Up Clock${skipped ? ` (${skipped} already tracked)` : ""}.`,
      });
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  }

  const capped = leads.length > MAX_LEADS;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={send} disabled={busy || leads.length === 0} className={ghostBtnCls}>
        {busy ? "ADDING…" : (label ?? `ADD ${Math.min(leads.length, MAX_LEADS)} TO FOLLOW-UP CLOCK`)}
      </button>
      {capped && <span className="font-mono text-[11px] text-white/50">first {MAX_LEADS} only</span>}
      {result && (
        <span className={`font-mono text-[11px] ${result.ok ? "text-accent" : "text-red-400"}`}>
          {result.text}{" "}
          {result.ok && (
            <Link href="/workflows/follow-up-clock" className="underline">
              Open Follow-Up Clock →
            </Link>
          )}
        </span>
      )}
    </div>
  );
}
