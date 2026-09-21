import { notFound } from "next/navigation";
import Link from "next/link";
import { AGENTS, getAgent, getBundleForAgent } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";

// Statically generates all 58 /workflows/<agent-slug> routes at build time.
export function generateStaticParams() {
  return AGENTS.map((agent) => ({ slug: agent.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = getAgent(slug);
  if (!agent) return {};
  return {
    title: `${agent.title} — BrickOS`,
    description: `${agent.title} is a BrickOS AI agent, part of the ${getBundleForAgent(agent.slug)?.title} bundle.`,
  };
}

async function getEntitlement(agentSlug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, entitled: false };

  const { data: fullOs } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("plan_type", "full")
    .eq("status", "active")
    .maybeSingle();
  if (fullOs) return { signedIn: true, entitled: true };

  // RLS on subscription_agents already scopes rows to the signed-in user.
  const { data: direct } = await supabase
    .from("subscription_agents")
    .select("subscription_id, subscriptions!inner(status)")
    .eq("agent_slug", agentSlug)
    .eq("subscriptions.status", "active")
    .maybeSingle();

  return { signedIn: true, entitled: !!direct };
}

export default async function WorkflowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = getAgent(slug);
  if (!agent) notFound();

  const bundle = getBundleForAgent(agent.slug);
  const { signedIn, entitled } = await getEntitlement(agent.slug);

  return (
    <main className="mx-auto max-w-[860px] px-6 md:px-10 py-16">
      <div className="font-mono text-[11px] tracking-widest opacity-50 mb-3">
        {bundle?.title.toUpperCase()} AGENT
      </div>
      <h1 className="font-serif text-4xl md:text-5xl mb-6">{agent.title}</h1>

      {entitled ? (
        <div className="border border-accent/30 bg-accent/5 p-6">
          <p className="text-accent font-mono text-sm mb-2">✓ Active on your account</p>
          <p className="text-white/70 text-sm">
            This agent runs automatically per its configured schedule. Manage it from your{" "}
            <Link href="/dashboard" className="text-accent underline">
              dashboard
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="border border-white/10 bg-white/[0.02] p-6">
          <p className="text-white/70 text-sm mb-4">
            {signedIn ? "You don't have this agent yet." : "Sign in or create an account to install this agent."}
          </p>
          <Link
            href={signedIn ? "/pricing" : "/signup"}
            className="inline-flex px-6 py-3 font-mono text-xs tracking-widest text-black font-bold bg-accent hover:brightness-110 transition"
          >
            {signedIn ? "GET THIS AGENT →" : "CREATE ACCOUNT →"}
          </Link>
        </div>
      )}

      {bundle && (
        <div className="mt-12">
          <div className="font-mono text-[11px] tracking-widest opacity-50 mb-3">PART OF: {bundle.title}</div>
          <div className="flex flex-wrap gap-2">
            {bundle.agents
              .filter((slug) => slug !== agent.slug)
              .map((slug) => {
                const other = getAgent(slug);
                if (!other) return null;
                return (
                  <Link
                    key={slug}
                    href={`/workflows/${slug}`}
                    className="px-3 py-1.5 border border-white/10 font-mono text-[11px] text-white/60 hover:border-accent/40 hover:text-accent transition"
                  >
                    {other.title}
                  </Link>
                );
              })}
          </div>
        </div>
      )}
    </main>
  );
}
