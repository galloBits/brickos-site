"use client";

import { useState } from "react";

export function ManageBilling() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't open billing");
      window.location.href = body.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={open}
        disabled={loading}
        className="px-4 py-2 font-mono text-[11px] tracking-widest border border-white/15 hover:border-accent hover:text-accent transition disabled:opacity-50"
      >
        {loading ? "OPENING…" : "MANAGE BILLING / CANCEL"}
      </button>
      {error && <p className="mt-2 text-red-400 text-sm max-w-[420px]">{error}</p>}
    </div>
  );
}
