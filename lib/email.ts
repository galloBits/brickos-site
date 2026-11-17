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
  opts?: { replyTo?: string; headers?: Record<string, string> },
): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY not set — skipping email to ${to}: ${subject}`);
    return { ok: false, error: "Email isn't configured yet (RESEND_API_KEY is not set)." };
  }
  try {
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await _resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      replyTo: opts?.replyTo,
      headers: opts?.headers,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Email send failed" };
  }
}

// Shared branded layout so every email reads as one friendly, polished piece
// instead of a bare line of text. Light card, orange accent, small footer.
const ACCENT = "#EA580C";
export function wrapEmail(contentHtml: string, opts?: { unsubscribeUrl?: string }): string {
  const footerUnsub = opts?.unsubscribeUrl
    ? `<p style="margin:8px 0 0">You're getting these because you signed up for BrickOS.
         <a href="${opts.unsubscribeUrl}" style="color:#6b7280;text-decoration:underline">Unsubscribe</a>.</p>`
    : "";
  return `
  <div style="background:#f4f4f5;padding:24px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e4e4e7">
          <tr><td style="background:#111111;padding:18px 28px">
            <span style="color:#ffffff;font-weight:700;font-size:18px;letter-spacing:0.5px">Brick<span style="color:${ACCENT}">OS</span></span>
          </td></tr>
          <tr><td style="padding:28px">
            ${contentHtml}
          </td></tr>
          <tr><td style="padding:18px 28px;border-top:1px solid #f0f0f0;color:#9ca3af;font-size:12px;line-height:1.5">
            <p style="margin:0">BrickOS — The Real Estate Operator OS · a TheCoopDAO company</p>
            ${footerUnsub}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:6px;font-size:14px">${label}</a>`;
}

export function renewalReminderEmail(daysLeft: number) {
  return {
    subject: `Your BrickOS renewal is in ${daysLeft} days`,
    html: `<p>Your 90-day BrickOS cycle renews in ${daysLeft} days. No action needed — billing continues automatically via Stripe unless you cancel from your dashboard.</p>`,
  };
}

export type FollowUpStep = "day1" | "day3" | "day7" | "day14";

export function followUpEmail(
  step: FollowUpStep,
  opts: { firstName?: string; dashboardUrl: string; pricingUrl: string; unsubscribeUrl: string },
): { subject: string; html: string } {
  const hi = opts.firstName ? `Hi ${escapeHtml(opts.firstName)},` : "Hi there,";
  const p = (text: string) => `<p style="margin:0 0 16px;color:#27272a;font-size:15px;line-height:1.6">${text}</p>`;
  const cta = (label: string, href: string) => `<p style="margin:24px 0 4px">${button(label, href)}</p>`;

  const copy: Record<FollowUpStep, { subject: string; body: string }> = {
    day1: {
      subject: "Welcome to BrickOS 👋",
      body:
        p(`${hi}`) +
        p("Welcome aboard — we're really glad you're here. BrickOS gives you a team of AI agents that handle the busywork at every stage of a deal, so you can spend your time on the work that actually moves the needle.") +
        p("The best way to get a feel for it is to run your first agent. It only takes a minute.") +
        cta("Open your dashboard →", opts.dashboardUrl) +
        p("Not sure where to start? Just reply to this email — a real person will point you to the right agent."),
    },
    day3: {
      subject: "Let's get your first win in BrickOS",
      body:
        p(`${hi}`) +
        p("Quick nudge: most operators run their first agent within a few minutes of logging in — and that first win is usually the moment BrickOS clicks.") +
        p("If you tell us what you're working on right now (a deal you're underwriting, a property you're turning over, investors you need to update), we'll point you to the exact agent for it.") +
        cta("Pick an agent →", opts.dashboardUrl) +
        p("Happy to help you get set up — just hit reply."),
    },
    day7: {
      subject: "How's your first week with BrickOS going?",
      body:
        p(`${hi}`) +
        p("You've been with us a week — how's it feeling so far? We'd genuinely love to hear what's working and what's getting in your way.") +
        p("Reply to this email and tell us what's slowing you down. We read every message, and your feedback shapes what we build next.") +
        cta("Jump back in →", opts.dashboardUrl) +
        p("Thanks for giving BrickOS a shot."),
    },
    day14: {
      subject: "Get more out of your BrickOS stack",
      body:
        p(`${hi}`) +
        p("Two weeks in — nice work. Operators who add a second bundle in their first month tend to save the most time, because the agents start handing work off to each other across stages of a deal.") +
        p("Take a look at what else is available and see if there's a bundle that fits where you spend your hours.") +
        cta("Explore bundles →", opts.pricingUrl) +
        p("Questions about what fits? Reply and we'll help you choose."),
    },
  };

  const chosen = copy[step];
  return { subject: chosen.subject, html: wrapEmail(chosen.body, { unsubscribeUrl: opts.unsubscribeUrl }) };
}
