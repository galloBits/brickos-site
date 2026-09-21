"use client";

import { useState } from "react";
import { BUNDLES, AGENTS, AGENT_MONTHLY_PRICE_CENTS, FULL_OS_MONTHLY_PRICE_CENTS } from "@/lib/catalog";

function dollars(cents: number) {
  return `$${(cents / 100).toLocaleString()}`;
}

export default function PricingPage() {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAgent(slug: string) {
    setSelectedAgents((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  }

  async function checkout(body: { planType: "agent" | "bundle" | "full"; agentSlugs?: string[]; bundleId?: string }) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1280px] px-6 md:px-10 py-16">
      <h1 className="font-serif text-4xl mb-2">Choose your stack</h1>
      <p className="text-white/60 mb-10">
        Pick individual agents at {dollars(AGENT_MONTHLY_PRICE_CENTS)}/mo each, grab a bundle, or install the full OS.
      </p>

      <section className="mb-16 border border-accent p-8 bg-gradient-to-b from-accent/10 to-transparent">
        <h2 className="font-serif text-2xl mb-2">Full BrickOS</h2>
        <div className="text-4xl font-serif text-accent mb-4">{dollars(FULL_OS_MONTHLY_PRICE_CENTS)}/mo</div>
        <button
          disabled={loading}
          onClick={() => checkout({ planType: "full" })}
          className="px-6 py-3 font-mono text-xs tracking-widest text-black font-bold bg-accent hover:brightness-110 transition disabled:opacity-50"
        >
          INSTALL FULL OS →
        </button>
      </section>

      <section className="mb-16">
        <h2 className="font-mono text-xs tracking-widest opacity-60 mb-4">BUNDLES</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {BUNDLES.map((bundle) => (
            <div key={bundle.id} id={bundle.id} className="border border-white/10 p-5 bg-white/[0.02] flex flex-col">
              <h3 className="font-bold text-sm">{bundle.title}</h3>
              <p className="font-mono text-[11px] text-accent/80 mt-1">{bundle.description}</p>
              <div className="mt-4 font-serif text-2xl">{dollars(bundle.monthlyPriceCents)}/mo</div>
              <button
                disabled={loading}
                onClick={() => checkout({ planType: "bundle", bundleId: bundle.id })}
                className="mt-4 px-4 py-2 font-mono text-[11px] tracking-widest border border-white/15 hover:border-accent hover:text-accent transition disabled:opacity-50"
              >
                GET BUNDLE →
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-mono text-xs tracking-widest opacity-60 mb-4">
          PICK INDIVIDUAL AGENTS ({selectedAgents.length} selected)
        </h2>
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
          {AGENTS.map((agent) => (
            <button
              key={agent.slug}
              onClick={() => toggleAgent(agent.slug)}
              className={`text-left px-3 py-2.5 border font-mono text-[11px] transition ${
                selectedAgents.includes(agent.slug)
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-white/10 bg-black text-white/60 hover:border-white/20"
              }`}
            >
              {agent.title}
            </button>
          ))}
        </div>
        <button
          disabled={loading || selectedAgents.length === 0}
          onClick={() => checkout({ planType: "agent", agentSlugs: selectedAgents })}
          className="px-6 py-3 font-mono text-xs tracking-widest text-black font-bold bg-accent hover:brightness-110 transition disabled:opacity-50"
        >
          {loading
            ? "REDIRECTING…"
            : `CHECKOUT ${selectedAgents.length} AGENT${selectedAgents.length === 1 ? "" : "S"} →`}
        </button>
      </section>

      {error && <p className="mt-6 text-red-400 text-sm">{error}</p>}
    </main>
  );
}
