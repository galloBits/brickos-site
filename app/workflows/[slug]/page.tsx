import { notFound } from "next/navigation";
import Link from "next/link";
import { AGENTS, getAgent, getBundleForAgent } from "@/lib/catalog";
import { getEntitlement } from "@/lib/entitlement";
import { isAgentLive } from "@/lib/live-agents";
import { CompCruncher } from "@/components/agents/comp-cruncher";
import { RentEstimator } from "@/components/agents/rent-estimator";
import { RehabCalculator } from "@/components/agents/rehab-calculator";
import { MaoEngine } from "@/components/agents/mao-engine";
import { LoiDrafter } from "@/components/agents/loi-drafter";
import { OfferStackBuilder } from "@/components/agents/offer-stack-builder";
import { RiskFlagAi } from "@/components/agents/risk-flag-ai";
import { VacancyPricer } from "@/components/agents/vacancy-pricer";
import { LeaseGenerator } from "@/components/agents/lease-generator";
import { RentRollReconciler } from "@/components/agents/rent-roll-reconciler";
import { UtilityAuditor } from "@/components/agents/utility-auditor";
import { MarketSurveyor } from "@/components/agents/market-surveyor";
import { LeaseRenewalClock } from "@/components/agents/lease-renewal-clock";
import { WorkOrderRouter } from "@/components/agents/work-order-router";
import { VendorDispatcher } from "@/components/agents/vendor-dispatcher";
import { InspectionLogger } from "@/components/agents/inspection-logger";
import { TurnoverCoordinator } from "@/components/agents/turnover-coordinator";

const AGENT_TOOLS: Record<string, React.ComponentType> = {
  "comp-cruncher": CompCruncher,
  "rent-estimator": RentEstimator,
  "rehab-calculator": RehabCalculator,
  "mao-engine": MaoEngine,
  "loi-drafter": LoiDrafter,
  "offer-stack-builder": OfferStackBuilder,
  "risk-flag-ai": RiskFlagAi,
  "vacancy-pricer": VacancyPricer,
  "lease-generator": LeaseGenerator,
  "rent-roll-reconciler": RentRollReconciler,
  "utility-auditor": UtilityAuditor,
  "market-surveyor": MarketSurveyor,
  "lease-renewal-clock": LeaseRenewalClock,
  "work-order-router": WorkOrderRouter,
  "vendor-dispatcher": VendorDispatcher,
  "inspection-logger": InspectionLogger,
  "turnover-coordinator": TurnoverCoordinator,
};

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

export default async function WorkflowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const agent = getAgent(slug);
  if (!agent) notFound();

  const bundle = getBundleForAgent(agent.slug);
  const { signedIn, entitled } = await getEntitlement(agent.slug);
  const live = isAgentLive(agent.slug);
  const Tool = AGENT_TOOLS[agent.slug];

  return (
    <main className="mx-auto max-w-[860px] px-6 md:px-10 py-16">
      <div className="font-mono text-[11px] tracking-widest opacity-50 mb-3">
        {bundle?.title.toUpperCase()} AGENT
      </div>
      <h1 className="font-serif text-4xl md:text-5xl mb-6">{agent.title}</h1>

      {entitled && live && Tool ? (
        <Tool />
      ) : entitled ? (
        <div className="border border-white/10 bg-white/[0.02] p-6">
          <p className="font-mono text-sm mb-2 text-white/70">🛠 In development</p>
          <p className="text-white/60 text-sm">
            Your subscription already covers this agent — it'll activate automatically here as soon as it's built,
            no action needed. Check your{" "}
            <Link href="/dashboard" className="text-accent underline">
              dashboard
            </Link>{" "}
            for what's live today.
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
