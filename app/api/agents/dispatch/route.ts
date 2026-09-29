import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/entitlement";
import { sendEmail, escapeHtml } from "@/lib/email";

export async function POST(request: Request) {
  const { entitled } = await getEntitlement("vendor-dispatcher");
  if (!entitled) {
    return NextResponse.json({ error: "Not entitled to this agent" }, { status: 403 });
  }

  const { workOrderId } = await request.json();
  if (typeof workOrderId !== "string") {
    return NextResponse.json({ error: "workOrderId is required" }, { status: 400 });
  }

  // RLS scopes both tables to the signed-in owner, so a user can only ever
  // load and dispatch their own work orders and vendors.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const { data: wo } = await supabase
    .from("work_orders")
    .select("id, property_label, unit, title, description, trade, priority, vendor_id")
    .eq("id", workOrderId)
    .maybeSingle();
  if (!wo) return NextResponse.json({ error: "Work order not found" }, { status: 404 });
  if (!wo.vendor_id) return NextResponse.json({ error: "Assign a vendor first" }, { status: 400 });

  const { data: vendor } = await supabase
    .from("vendors")
    .select("name, email")
    .eq("id", wo.vendor_id)
    .maybeSingle();
  if (!vendor?.email) {
    return NextResponse.json({ error: "This vendor has no email on file" }, { status: 400 });
  }

  const location = `${wo.property_label}${wo.unit ? ` #${wo.unit}` : ""}`;
  const html = `
    <p>Hi ${escapeHtml(vendor.name)},</p>
    <p>New ${escapeHtml(wo.priority)}-priority ${escapeHtml(wo.trade)} work order:</p>
    <p><strong>${escapeHtml(wo.title)}</strong><br/>Location: ${escapeHtml(location)}</p>
    ${wo.description ? `<p>${escapeHtml(wo.description)}</p>` : ""}
    <p>Please reply to this email to confirm you can take the job and your earliest availability.</p>`;

  const result = await sendEmail(
    vendor.email,
    `[${wo.priority.toUpperCase()}] ${wo.trade} work order — ${location}`,
    html,
    { replyTo: user.email ?? undefined },
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Email failed to send" }, { status: 502 });
  }

  await supabase
    .from("work_orders")
    .update({ status: "dispatched", dispatched_at: new Date().toISOString() })
    .eq("id", wo.id);

  return NextResponse.json({ sentTo: vendor.email });
}
