import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAgent } from "@/lib/catalog";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("id, plan_type, status, current_period_end, stripe_price_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: subAgentRows } = await supabase
    .from("subscription_agents")
    .select("agent_slug, subscription_id")
    .in("subscription_id", (subscriptions ?? []).map((s) => s.id));

  const hasFullOs = (subscriptions ?? []).some((s) => s.plan_type === "full" && s.status === "active");
  const entitledSlugs = hasFullOs
    ? []
    : Array.from(new Set((subAgentRows ?? []).map((r) => r.agent_slug)));

  return (
    <main className="mx-auto max-w-[1280px] px-6 md:px-10 py-16">
      <h1 className="font-serif text-4xl mb-2">Your dashboard</h1>
      <p className="text-white/60 mb-10">{user.email}</p>

      <section className="mb-12">
        <h2 className="font-mono text-xs tracking-widest opacity-60 mb-4">SUBSCRIPTIONS</h2>
        {!subscriptions?.length && (
          <div className="border border-white/10 p-6 bg-white/[0.02]">
            <p className="text-white/60 mb-4">You don't have any active agents yet.</p>
            <Link href="/pricing" className="text-accent underline">
              Choose agents →
            </Link>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          {subscriptions?.map((s) => (
            <div key={s.id} className="border border-white/10 p-5 bg-white/[0.02]">
              <div className="font-mono text-[10px] tracking-widest opacity-50">{s.plan_type.toUpperCase()}</div>
              <div className="mt-2 text-sm">Status: {s.status}</div>
              {s.current_period_end && (
                <div className="mt-1 text-xs text-white/50">
                  Renews {new Date(s.current_period_end).toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {(hasFullOs || entitledSlugs.length > 0) && (
        <section>
          <h2 className="font-mono text-xs tracking-widest opacity-60 mb-4">YOUR AGENTS</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {hasFullOs
              ? "All 58 agents included with Full OS."
              : entitledSlugs.map((slug) => {
                  const agent = getAgent(slug);
                  if (!agent) return null;
                  return (
                    <Link
                      key={slug}
                      href={`/workflows/${slug}`}
                      className="border border-white/10 p-4 bg-white/[0.02] hover:border-accent/40 transition text-sm"
                    >
                      {agent.title}
                    </Link>
                  );
                })}
          </div>
        </section>
      )}
    </main>
  );
}
