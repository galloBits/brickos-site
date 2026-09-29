import { Resend } from "resend";

// Lazy singleton, same reasoning as lib/stripe.ts: avoid throwing during
// Next.js build-time route collection when RESEND_API_KEY isn't set yet.
let _resend: Resend | undefined;

const FROM = process.env.EMAIL_FROM ?? "BrickOS <hello@thecoopdao.xyz>";

export type SendResult = { ok: boolean; error?: string };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  opts?: { replyTo?: string },
): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY not set — skipping email to ${to}: ${subject}`);
    return { ok: false, error: "Email isn't configured yet (RESEND_API_KEY is not set)." };
  }
  try {
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await _resend.emails.send({ from: FROM, to, subject, html, replyTo: opts?.replyTo });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Email send failed" };
  }
}

export function renewalReminderEmail(daysLeft: number) {
  return {
    subject: `Your BrickOS renewal is in ${daysLeft} days`,
    html: `<p>Your 90-day BrickOS cycle renews in ${daysLeft} days. No action needed — billing continues automatically via Stripe unless you cancel from your dashboard.</p>`,
  };
}

export function followUpEmail(step: "day1" | "day3" | "day7" | "day14") {
  const copy: Record<typeof step, { subject: string; html: string }> = {
    day1: {
      subject: "Getting started with BrickOS",
      html: "<p>Welcome to BrickOS. Head to your dashboard to activate your first agent.</p>",
    },
    day3: {
      subject: "Have you run your first agent yet?",
      html: "<p>Most operators install their first agent within 3 minutes. Need a hand picking one?</p>",
    },
    day7: {
      subject: "One week in — how's BrickOS working for you?",
      html: "<p>Reply to this email and tell us what's slowing you down — we read every reply.</p>",
    },
    day14: {
      subject: "Unlock more of your stack",
      html: "<p>Operators who add a second bundle in their first month save the most time. Take a look at what's available.</p>",
    },
  };
  return copy[step];
}
