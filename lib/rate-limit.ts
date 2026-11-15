import { createServiceRoleClient } from "@/lib/supabase/server";

// Best-effort IP of the caller. On Vercel, x-forwarded-for is set by the edge;
// locally it may be absent. Take the first hop (the client), ignore the proxy
// chain after it.
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Counts recent events for (bucket, ip) in a Supabase table shared by all
// serverless instances, then records this one. Returns false when the caller
// is over the limit. Fails OPEN on a DB error: a database hiccup should not
// take the whole feature offline — we log and allow rather than block.
export async function checkRateLimit(
  bucket: string,
  ip: string,
  opts: { limit: number; windowSeconds: number },
): Promise<{ allowed: boolean }> {
  try {
    const admin = createServiceRoleClient();
    const since = new Date(Date.now() - opts.windowSeconds * 1000).toISOString();
    const { count, error } = await admin
      .from("rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("bucket", bucket)
      .eq("ip", ip)
      .gte("created_at", since);
    if (error) {
      console.error("rate limit check failed", error);
      return { allowed: true };
    }
    if ((count ?? 0) >= opts.limit) return { allowed: false };
    await admin.from("rate_limit_events").insert({ bucket, ip });
    return { allowed: true };
  } catch (e) {
    console.error("rate limit error", e);
    return { allowed: true };
  }
}
