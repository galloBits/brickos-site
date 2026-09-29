import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendEmail, escapeHtml } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

const THRESHOLDS = [90, 60, 30];
const DAY_MS = 24 * 60 * 60 * 1000;

type LeaseRow = {
  id: string;
  user_id: string;
  property_label: string;
  unit: string | null;
  tenant_name: string;
  lease_end: string;
};

// Daily: for each lease inside a 90/60/30-day window that hasn't been
// reminded for its tightest passed threshold, email the owner one digest.
// A lease added late (e.g. 45 days out) only triggers the 60-day reminder,
// and the 90-day one is marked sent so it doesn't fire afterward.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const horizon = new Date(todayUtc.getTime() + 90 * DAY_MS);

  const { data: leases, error } = await supabase
    .from("leases")
    .select("id, user_id, property_label, unit, tenant_name, lease_end")
    .gte("lease_end", todayUtc.toISOString().slice(0, 10))
    .lte("lease_end", horizon.toISOString().slice(0, 10));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!leases?.length) return NextResponse.json({ leases: 0, emailsSent: 0 });

  const { data: logs } = await supabase
    .from("lease_reminder_log")
    .select("lease_id, threshold_days")
    .in("lease_id", leases.map((l) => l.id));
  const logged = new Set((logs ?? []).map((l) => `${l.lease_id}:${l.threshold_days}`));

  const pendingByUser = new Map<string, { lease: LeaseRow; daysLeft: number; passed: number[] }[]>();
  for (const lease of leases as LeaseRow[]) {
    const daysLeft = Math.round((Date.parse(`${lease.lease_end}T00:00:00Z`) - todayUtc.getTime()) / DAY_MS);
    const passed = THRESHOLDS.filter((t) => daysLeft <= t);
    if (!passed.length) continue;
    if (logged.has(`${lease.id}:${Math.min(...passed)}`)) continue;
    const list = pendingByUser.get(lease.user_id) ?? [];
    list.push({ lease, daysLeft, passed });
    pendingByUser.set(lease.user_id, list);
  }

  let emailsSent = 0;
  for (const [userId, items] of Array.from(pendingByUser.entries())) {
    const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single();
    if (!profile?.email) continue;

    items.sort((a, b) => a.daysLeft - b.daysLeft);
    const rows = items
      .map(
        ({ lease, daysLeft }) =>
          `<li><strong>${escapeHtml(lease.tenant_name)}</strong> — ${escapeHtml(lease.property_label)}${
            lease.unit ? ` #${escapeHtml(lease.unit)}` : ""
          }: lease ends ${lease.lease_end} (${daysLeft} days)</li>`,
      )
      .join("");

    const result = await sendEmail(
      profile.email,
      `Lease renewals coming up (${items.length})`,
      `<p>These leases are approaching their end dates:</p><ul>${rows}</ul><p>Open Lease Renewal Clock in BrickOS to review them.</p>`,
    );
    if (!result.ok) continue;

    await supabase.from("lease_reminder_log").upsert(
      items.flatMap(({ lease, passed }) => passed.map((t) => ({ lease_id: lease.id, threshold_days: t }))),
      { onConflict: "lease_id,threshold_days", ignoreDuplicates: true },
    );
    emailsSent++;
  }

  return NextResponse.json({ leases: leases.length, emailsSent });
}
