"use client";

import { useState } from "react";
import type { ClaudeAgentClientProps } from "@/lib/claude-agents";
import { btnCls, Field, inputCls } from "./ui";

export function ClaudeAgent({ slug, intro, button, resultTitle, fields }: ClaudeAgentClientProps & { slug: string }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.type === "select" && f.required ? (f.options?.[0] ?? "") : ""])),
  );
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const missingRequired = fields.some((f) => f.required && !values[f.key]?.trim());

  async function run() {
    setLoading(true);
    setError(null);
    setOutput(null);
    try {
      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, values }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Request failed");
      setOutput(body.output);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/60 max-w-[640px]">{intro}</p>

      <div className="grid md:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
            <Field label={`${f.label}${f.required ? " *" : ""}`}>
              {f.type === "select" ? (
                <select
                  value={values[f.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  className={inputCls}
                >
                  {!f.required && <option value="">—</option>}
                  {f.options?.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  rows={f.rows ?? 4}
                  maxLength={f.max}
                  placeholder={f.placeholder}
                  value={values[f.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  className={inputCls}
                />
              ) : (
                <input
                  maxLength={f.max}
                  placeholder={f.placeholder}
                  value={values[f.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  className={inputCls}
                />
              )}
            </Field>
          </div>
        ))}
      </div>

      <button onClick={run} disabled={loading || missingRequired} className={btnCls}>
        {loading ? "WORKING…" : button}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {output && (
        <div className="border border-accent/30 bg-accent/5 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] tracking-widest opacity-60">{resultTitle}</span>
            <button onClick={copy} className="font-mono text-[11px] text-accent hover:underline">
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-white/90">{output}</div>
        </div>
      )}
    </div>
  );
}
