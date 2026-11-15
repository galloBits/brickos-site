import { NextResponse } from "next/server";
import { clientIp, checkRateLimit } from "@/lib/rate-limit";

// Mints a short-lived xAI Realtime "client secret" so the browser can open a
// voice WebSocket WITHOUT ever seeing XAI_API_KEY. The real key stays here on
// the server; the browser only ever gets a token that expires in minutes.
//
// Cost control: this endpoint is public, and every voice session spends xAI
// credits. Two rate limits guard it — a per-visitor cap so one person (or bot)
// can't hammer it, and a global cap so a swarm of IPs can't either.
const PER_IP_LIMIT = 5; // sessions per window, per visitor
const GLOBAL_LIMIT = 80; // sessions per window, everyone combined
const WINDOW_SECONDS = 600; // 10 minutes

export async function POST(request: Request) {
  const key = process.env.XAI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Voice agent isn't configured yet." }, { status: 503 });
  }

  const ip = clientIp(request);
  const perIp = await checkRateLimit("voice-token", ip, { limit: PER_IP_LIMIT, windowSeconds: WINDOW_SECONDS });
  if (!perIp.allowed) {
    return NextResponse.json({ error: "You've started a lot of voice chats. Please try again in a few minutes." }, { status: 429 });
  }
  const global = await checkRateLimit("voice-token-global", "*", { limit: GLOBAL_LIMIT, windowSeconds: WINDOW_SECONDS });
  if (!global.allowed) {
    return NextResponse.json({ error: "The voice assistant is busy right now. Please try again shortly." }, { status: 429 });
  }

  try {
    const res = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expires_after: { seconds: 600 } }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("xAI client_secrets failed", res.status, detail);
      return NextResponse.json({ error: "Couldn't start the voice session." }, { status: 502 });
    }

    const data = (await res.json()) as { value?: string; expires_at?: number };
    if (!data.value) {
      console.error("xAI client_secrets returned no token", data);
      return NextResponse.json({ error: "Voice service returned no token." }, { status: 502 });
    }
    return NextResponse.json({ value: data.value, expires_at: data.expires_at });
  } catch (error) {
    console.error("xAI token mint error", error);
    return NextResponse.json({ error: "Couldn't reach the voice service." }, { status: 502 });
  }
}
