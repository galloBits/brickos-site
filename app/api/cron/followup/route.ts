import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendEmail, followUpEmail } from "@/lib/email";
import { unsubscribeUrl, siteUrl } from "@/lib/unsubscribe";

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

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at, marketing_unsubscribed");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const base = siteUrl();
  let sent = 0;
  for (const profile of profiles ?? []) {
    // Respect opt-outs: the drip is marketing, so a user who unsubscribed
    // should never get another step.
    if (profile.marketing_unsubscribed) continue;

    const ageDays = (now - new Date(profile.created_at).getTime()) / (24 * 60 * 60 * 1000);
    const firstName = profile.full_name?.trim().split(/\s+/)[0] || undefined;
    const unsubUrl = unsubscribeUrl(profile.id);

    for (const { step, afterDays } of STEPS) {
      if (ageDays < afterDays) continue;

      const { data: existing } = await supabase
        .from("follow_up_log")
        .select("id")
        .eq("user_id", profile.id)
        .eq("step", step)
        .maybeSingle();
      if (existing) continue;

      const { subject, html } = followUpEmail(step, {
        firstName,
        dashboardUrl: `${base}/dashboard`,
        pricingUrl: `${base}/pricing`,
        unsubscribeUrl: unsubUrl,
      });
      // One-click unsubscribe (RFC 8058): Gmail/Apple Mail show a native
      // "Unsubscribe" control and POST to this URL.
      const result = await sendEmail(profile.email, subject, html, {
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      if (!result.ok) continue;
      await supabase.from("follow_up_log").insert({ user_id: profile.id, step });
      sent++;
    }
  }

  return NextResponse.json({ profiles: profiles?.length ?? 0, sent });
}
