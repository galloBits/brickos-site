import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

export const runtime = "nodejs";

async function optOut(userId: string, token: string): Promise<boolean> {
  if (!userId || !token || !verifyUnsubscribeToken(userId, token)) return false;
  const admin = createServiceRoleClient();
  const { error } = await admin.from("profiles").update({ marketing_unsubscribed: true }).eq("id", userId);
  if (error) {
    console.error("unsubscribe update failed", error);
    return false;
  }
  return true;
}

function page(title: string, message: string, ok: boolean): Response {
  const accent = ok ? "#EA580C" : "#b91c1c";
  const html = `<!doctype html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title></head>
    <body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
      <div style="max-width:440px;margin:64px auto;background:#fff;border:1px solid #e4e4e7;border-radius:10px;overflow:hidden">
        <div style="background:#111;padding:18px 28px;color:#fff;font-weight:700;font-size:18px">Brick<span style="color:#EA580C">OS</span></div>
        <div style="padding:28px">
          <h1 style="margin:0 0 12px;font-size:20px;color:${accent}">${title}</h1>
          <p style="margin:0;color:#27272a;font-size:15px;line-height:1.6">${message}</p>
          <p style="margin:24px 0 0"><a href="https://brickos.thecoopdao.xyz" style="color:#EA580C;font-weight:600;text-decoration:none">Back to BrickOS →</a></p>
        </div>
      </div>
    </body></html>`;
  return new Response(html, { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Link click from an email.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ok = await optOut(url.searchParams.get("u") ?? "", url.searchParams.get("t") ?? "");
  return ok
    ? page("You're unsubscribed", "You won't receive any more onboarding emails from BrickOS. You'll still get essential account and billing messages. Changed your mind? Just reply to any email and we'll add you back.", true)
    : page("Link expired or invalid", "We couldn't process that unsubscribe link. Please email hello@thecoopdao.xyz and we'll take care of it right away.", false);
}

// One-click unsubscribe (RFC 8058): the mail client POSTs here directly.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const ok = await optOut(url.searchParams.get("u") ?? "", url.searchParams.get("t") ?? "");
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Invalid link" }, { status: 400 });
}
