"use client";

import { useState } from "react";
import { streamPost } from "@/lib/stream-client";
import { Markdown } from "./markdown";
import { btnCls } from "./ui";

export function RiskFlagAi() {
  const [dealNotes, setDealNotes] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    setAnalysis("");
    try {
      await streamPost("/api/agents/risk-flag", { dealNotes }, setAnalysis);
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

      <button onClick={analyze} disabled={loading || !dealNotes.trim()} className={btnCls}>
        {loading ? "ANALYZING…" : "FLAG RISKS →"}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {(analysis || loading) && (
        <div className="border border-accent/30 bg-accent/5 p-6">
          <div className="font-mono text-[10px] tracking-widest opacity-60 mb-3">RISK ANALYSIS</div>
          {analysis ? <Markdown>{analysis}</Markdown> : <p className="text-sm text-white/50">Thinking…</p>}
        </div>
      )}
    </div>
  );
}
