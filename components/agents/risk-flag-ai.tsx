"use client";

import { useState } from "react";

export function RiskFlagAi() {
  const [dealNotes, setDealNotes] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await fetch("/api/agents/risk-flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setAnalysis(data.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <label className="flex flex-col gap-2">
        <span className="font-mono text-[10px] tracking-widest opacity-60">
          DEAL NOTES — condition, seller motivation, comps, anything you know
        </span>
        <textarea
          value={dealNotes}
          onChange={(e) => setDealNotes(e.target.value)}
          rows={8}
          maxLength={4000}
          placeholder="e.g. 3bd/2ba, roof looks original (~20yrs), seller inherited property and lives out of state, tenant currently in place month-to-month, foundation crack visible in one photo, asking $210k..."
          className="bg-black border border-white/10 px-4 py-3 font-mono text-sm outline-none focus:border-accent/50 resize-none"
        />
      </label>

      <button
        onClick={analyze}
        disabled={loading || !dealNotes.trim()}
        className="px-6 py-3 font-mono text-xs tracking-widest text-black font-bold bg-accent hover:brightness-110 transition disabled:opacity-50"
      >
        {loading ? "ANALYZING…" : "FLAG RISKS →"}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {analysis && (
        <div className="border border-accent/30 bg-accent/5 p-6">
          <div className="font-mono text-[10px] tracking-widest opacity-60 mb-3">RISK ANALYSIS</div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-white/90">{analysis}</div>
        </div>
      )}
    </div>
  );
}
