import Link from "next/link";
import { BUNDLES, TOTAL_AGENT_COUNT, AGENT_MONTHLY_PRICE_CENTS, FULL_OS_MONTHLY_PRICE_CENTS } from "@/lib/catalog";

function dollars(cents: number) {
  return `$${(cents / 100).toLocaleString()}`;
}

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto max-w-[1280px] px-6 md:px-10 pt-16 md:pt-28 pb-20 border-b border-white/[0.06]">
        <div className="inline-flex items-center gap-2 border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[10px] tracking-widest text-accent">
          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" /> LIVE • {TOTAL_AGENT_COUNT} AGENTS
          DEPLOYED
        </div>
        <h1 className="font-serif text-[38px] md:text-[64px] leading-[0.95] tracking-tight mt-6">
          We built BrickOS because real estate operators were drowning in busywork.
        </h1>
        <p className="mt-6 text-lg md:text-xl leading-snug text-white/70 max-w-[560px]">
          {TOTAL_AGENT_COUNT} agents that replace your entire team — from off-market sourcing to exit. Not another
          CRM. An operating system that runs your portfolio while you sleep.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="px-7 py-3.5 text-black font-bold font-mono text-xs tracking-widest bg-accent hover:brightness-110 transition"
          >
            INSTALL IN 3 MINS →
          </Link>
          <Link
            href="#agents"
            className="px-7 py-3.5 border border-white/15 font-mono text-xs tracking-widest hover:border-white/30 transition"
          >
            VIEW {TOTAL_AGENT_COUNT} AGENTS
          </Link>
        </div>
      </section>

      <section id="agents" className="mx-auto max-w-[1280px] px-6 md:px-10 py-20 border-b border-white/[0.06]">
        <h2 className="font-serif text-[32px] md:text-[44px] leading-[0.9] mb-10">The {TOTAL_AGENT_COUNT} Agents</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {BUNDLES.map((bundle) => (
            <div key={bundle.id} className="border border-white/[0.08] bg-[#121212] hover:border-accent/40 transition p-5 flex flex-col">
              <div className="font-mono text-[10px] tracking-widest opacity-50 mb-3">
                {String(bundle.agents.length).padStart(2, "0")} AGENTS
              </div>
              <h3 className="font-bold text-sm leading-tight">{bundle.title}</h3>
              <p className="font-mono text-[11px] mt-2 text-accent/80">{bundle.description}</p>
              <div className="mt-5 space-y-1.5">
                {bundle.agents.slice(0, 5).map((slug) => (
                  <div key={slug} className="font-mono text-[11px] text-white/55">
                    › {slug.replace(/-/g, " ")}
                  </div>
                ))}
                {bundle.agents.length > 5 && (
                  <div className="font-mono text-[11px] text-white/40">+ {bundle.agents.length - 5} more</div>
                )}
              </div>
              <Link
                href={`/pricing#${bundle.id}`}
                className="mt-auto pt-3 border-t border-white/[0.06] font-mono text-[10px] opacity-60 hover:text-accent transition"
              >
                BUNDLE • {dollars(bundle.monthlyPriceCents)}/mo →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-6 md:px-10 py-20">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-white/10 p-8 bg-white/[0.02]">
            <h3 className="font-serif text-3xl">Pick only the agents you need.</h3>
            <div className="mt-6 text-5xl font-serif text-accent">{dollars(AGENT_MONTHLY_PRICE_CENTS)}</div>
            <div className="font-mono text-xs opacity-60 mt-1">/ agent / mo • cancel anytime • 7-day trial</div>
            <Link
              href="/pricing"
              className="mt-6 inline-flex px-6 py-3 font-mono text-xs tracking-widest border border-white/15 hover:border-accent hover:text-accent transition"
            >
              CHOOSE AGENTS →
            </Link>
          </div>
          <div className="border p-8 border-accent bg-gradient-to-b from-accent/10 to-transparent">
            <h3 className="font-serif text-3xl">The Full BrickOS</h3>
            <div className="mt-6 text-5xl font-serif text-accent">{dollars(FULL_OS_MONTHLY_PRICE_CENTS)}</div>
            <div className="font-mono text-xs opacity-60 mt-1">/ mo • all {TOTAL_AGENT_COUNT} agents</div>
            <Link
              href="/pricing"
              className="mt-6 inline-flex px-6 py-3 font-mono text-xs tracking-widest text-black font-bold bg-accent hover:brightness-110 transition"
            >
              INSTALL FULL OS →
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-[1280px] px-6 md:px-10 py-10 border-t border-white/[0.06] font-mono text-[11px] opacity-60">
        © 2026 BrickOS is a TheCoopDAO company · hello@thecoopdao.xyz
      </footer>
    </main>
  );
}
