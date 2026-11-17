import { createHmac, timingSafeEqual } from "node:crypto";

// Signs unsubscribe links so a visitor can only opt out their OWN row, never
// someone else's by guessing a user id. We sign with a server-only secret;
// the service-role key is always present, so no extra env var is required.
function secret(): string {
  return (
    process.env.UNSUBSCRIBE_SECRET ??
    process.env.CRON_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "dev-only-insecure-secret"
  );
}

export function unsubscribeToken(userId: string): string {
  return createHmac("sha256", secret()).update(`unsub:${userId}`).digest("base64url");
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = unsubscribeToken(userId);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://brickos.thecoopdao.xyz";
}

export function unsubscribeUrl(userId: string): string {
  const t = unsubscribeToken(userId);
  return `${siteUrl()}/api/unsubscribe?u=${encodeURIComponent(userId)}&t=${encodeURIComponent(t)}`;
}
