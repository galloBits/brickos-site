import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendEmail, renewalReminderEmail } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

const REMINDER_WINDOW_DAYS = 7;

// Runs daily (see vercel.json). For every active subscription's 90-day
// renewal_cycles row whose cycle_end is within the next 7 days and hasn't
// had a reminder sent yet, emails the user and marks reminder_sent_at.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const { data: cycles, error } = await supabase
    .from("renewal_cycles")
    .select("id, cycle_end, subscription_id, subscriptions!inner(user_id, status)")
    .is("reminder_sent_at", null)
    .lte("cycle_end", windowEnd.toISOString())
    .gte("cycle_end", now.toISOString())
    .eq("subscriptions.status", "active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const cycle of cycles ?? []) {
    const userId = (cycle as any).subscriptions.user_id as string;
    const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single();
    if (!profile?.email) continue;

    const daysLeft = Math.ceil((new Date(cycle.cycle_end).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    const { subject, html } = renewalReminderEmail(daysLeft);
    await sendEmail(profile.email, subject, html);
    await supabase.from("renewal_cycles").update({ reminder_sent_at: now.toISOString() }).eq("id", cycle.id);
    sent++;
  }

  return NextResponse.json({ processed: cycles?.length ?? 0, sent });
}
