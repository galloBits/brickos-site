import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendEmail, followUpEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

const STEPS: { step: "day1" | "day3" | "day7" | "day14"; afterDays: number }[] = [
  { step: "day1", afterDays: 1 },
  { step: "day3", afterDays: 3 },
  { step: "day7", afterDays: 7 },
  { step: "day14", afterDays: 14 },
];

// Runs daily (see vercel.json). For every profile, checks whether it's
// crossed one of the drip-sequence thresholds (signup +1/+3/+7/+14 days)
// and, if so, sends that step's email exactly once (unique constraint on
// follow_up_log(user_id, step) makes this idempotent even on double-runs).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = Date.now();

  const { data: profiles, error } = await supabase.from("profiles").select("id, email, created_at");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const profile of profiles ?? []) {
    const ageDays = (now - new Date(profile.created_at).getTime()) / (24 * 60 * 60 * 1000);

    for (const { step, afterDays } of STEPS) {
      if (ageDays < afterDays) continue;

      const { data: existing } = await supabase
        .from("follow_up_log")
        .select("id")
        .eq("user_id", profile.id)
        .eq("step", step)
        .maybeSingle();
      if (existing) continue;

      const { subject, html } = followUpEmail(step);
      await sendEmail(profile.email, subject, html);
      await supabase.from("follow_up_log").insert({ user_id: profile.id, step });
      sent++;
    }
  }

  return NextResponse.json({ profiles: profiles?.length ?? 0, sent });
}
