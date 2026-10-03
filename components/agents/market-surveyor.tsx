"use client";

import { useState } from "react";
import { streamPost } from "@/lib/stream-client";
import { Markdown } from "./markdown";
import { btnCls, Field, inputCls } from "./ui";

export function MarketSurveyor() {
  const [market, setMarket] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [data, setData] = useState("");
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setAnalysis("");
    try {
      await streamPost("/api/agents/market-survey", { market, propertyType, data, question }, setAnalysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/60 max-w-[600px]">
        Turns the market data you&apos;ve gathered into a structured survey brief, flags what&apos;s missing, and lists
        what to verify. It has no live market feed, so it only uses numbers you provide and won&apos;t invent any.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="MARKET / SUBMARKET">
          <input value={market} onChange={(e) => setMarket(e.target.value)} placeholder="e.g. Phoenix — Maryvale" className={inputCls} />
        </Field>
        <Field label="PROPERTY TYPE">
          <input value={propertyType} onChange={(e) => setPropertyType(e.target.value)} placeholder="e.g. SFR, 4-plex, 40-unit garden" className={inputCls} />
        </Field>
      </div>

      <Field label="DATA YOU HAVE (rents, vacancy, recent sales, cap rates, news)">
        <textarea rows={6} maxLength={4000} value={data} onChange={(e) => setData(e.target.value)} className={inputCls} />
      </Field>
      <Field label="WHAT DO YOU WANT TO KNOW?">
        <textarea rows={3} maxLength={4000} value={question} onChange={(e) => setQuestion(e.target.value)} className={inputCls} />
      </Field>

      <button onClick={run} disabled={loading || !market.trim()} className={btnCls}>
        {loading ? "BUILDING BRIEF…" : "BUILD SURVEY BRIEF →"}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {(analysis || loading) && (
        <div className="border border-accent/30 bg-accent/5 p-6">
          <div className="font-mono text-[10px] tracking-widest opacity-60 mb-3">MARKET SURVEY BRIEF</div>
          {analysis ? <Markdown>{analysis}</Markdown> : <p className="text-sm text-white/50">Thinking…</p>}
        </div>
      )}
    </div>
  );
}
