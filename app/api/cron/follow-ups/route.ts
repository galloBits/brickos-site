import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendEmail, escapeHtml } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

type Row = {
  user_id: string;
  lead_name: string;
  property_label: string | null;
  phone: string | null;
  next_follow_up: string;
};

// Daily: one digest email per user listing Follow-Up Clock leads that are due
// today or overdue. digest_log makes it at most one email per user per day,
// and a row is only written after the email actually sends.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: due, error } = await supabase
    .from("follow_ups")
    .select("user_id, lead_name, property_label, phone, next_follow_up")
    .lte("next_follow_up", today)
    .not("stage", "in", "(under_contract,dead)")
    .order("next_follow_up", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!due?.length) return NextResponse.json({ users: 0, emailsSent: 0 });

  const byUser = new Map<string, Row[]>();
  for (const row of due as Row[]) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  const { data: alreadySent } = await supabase
    .from("digest_log")
    .select("user_id")
    .eq("agent_slug", "follow-up-clock")
    .eq("sent_on", today)
    .in("user_id", Array.from(byUser.keys()));
  const skip = new Set((alreadySent ?? []).map((r) => r.user_id));

  let emailsSent = 0;
  for (const [userId, rows] of Array.from(byUser.entries())) {
    if (skip.has(userId)) continue;
    const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single();
    if (!profile?.email) continue;

    const items = rows
      .map((r) => {
        const late = r.next_follow_up < today ? ` (due ${r.next_follow_up})` : "";
        return `<li><strong>${escapeHtml(r.lead_name)}</strong>${r.property_label ? ` — ${escapeHtml(r.property_label)}` : ""}${
          r.phone ? ` · ${escapeHtml(r.phone)}` : ""
        }${late}</li>`;
      })
      .join("");

    const result = await sendEmail(
      profile.email,
      `${rows.length} follow-up${rows.length === 1 ? "" : "s"} due today`,
      `<p>These leads are due for a follow-up:</p><ul>${items}</ul><p>Log each contact in Follow-Up Clock to schedule the next one.</p>`,
    );
    if (!result.ok) continue;

    await supabase
      .from("digest_log")
      .upsert(
        { user_id: userId, agent_slug: "follow-up-clock", sent_on: today },
        { onConflict: "user_id,agent_slug,sent_on", ignoreDuplicates: true },
      );
    emailsSent++;
  }

  return NextResponse.json({ users: byUser.size, emailsSent });
}
