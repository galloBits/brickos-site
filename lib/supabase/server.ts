import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// RLS-scoped client for use in Server Components / Route Handlers, acting as
// the currently signed-in user (reads their session from cookies).
// Next.js 15+ made cookies() async, so this is async too — await it at every
// call site.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component with no response to write to;
            // middleware refreshes the session instead. Safe to ignore.
          }
        },
      },
    },
  );
}

// Service-role client that bypasses RLS entirely. Only ever import this from
// server-only code that never runs in the browser: Stripe webhooks and cron
// routes. Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
