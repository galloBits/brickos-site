import { createClient } from "@/lib/supabase/server";

export async function getEntitlement(agentSlug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, entitled: false, userId: null as string | null };

  const { data: fullOs } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("plan_type", "full")
    .eq("status", "active")
    .maybeSingle();
  if (fullOs) return { signedIn: true, entitled: true, userId: user.id };

  // RLS on subscription_agents already scopes rows to the signed-in user.
  const { data: direct } = await supabase
    .from("subscription_agents")
    .select("subscription_id, subscriptions!inner(status)")
    .eq("agent_slug", agentSlug)
    .eq("subscriptions.status", "active")
    .maybeSingle();

  return { signedIn: true, entitled: !!direct, userId: user.id };
}
