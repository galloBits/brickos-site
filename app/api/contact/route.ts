import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendEmail, escapeHtml } from "@/lib/email";
import { clientIp, checkRateLimit } from "@/lib/rate-limit";

// Where contact-form messages are emailed. Set CONTACT_EMAIL in the environment
// to your real inbox; falls back to the site's hello@ address.
const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? "hello@thecoopdao.xyz";

export async function POST(request: Request) {
  const ip = clientIp(request);
  const { allowed } = await checkRateLimit("contact", ip, { limit: 3, windowSeconds: 3600 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many messages from here. Please try again later." }, { status: 429 });
  }

  let body: { name?: unknown; email?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 4000) : "";

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Please enter a message." }, { status: 400 });
  }

  // Save first so the lead is never lost, even if email delivery fails.
  const admin = createServiceRoleClient();
  const { data: row, error: dbError } = await admin
    .from("contact_messages")
    .insert({ name, email, message, ip })
    .select("id")
    .single();
  if (dbError) {
    console.error("contact insert failed", dbError);
    return NextResponse.json({ error: "Couldn't save your message. Please try again." }, { status: 500 });
  }

  const html = `
    <p><strong>New BrickOS contact message</strong></p>
    <p><strong>Name:</strong> ${escapeHtml(name || "(not given)")}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
  `;
  const result = await sendEmail(CONTACT_EMAIL, "New BrickOS contact message", html, { replyTo: email });
  if (result.ok) {
    await admin.from("contact_messages").update({ emailed: true }).eq("id", row.id);
  } else {
    // Saved but not emailed (e.g. RESEND_API_KEY not set yet). Still a success
    // for the visitor — we have their message and can follow up.
    console.warn("contact saved but email not sent:", result.error);
  }

  return NextResponse.json({ ok: true });
}
