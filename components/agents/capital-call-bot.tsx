"use client";

import { useState } from "react";
import { downloadCsv } from "@/lib/csv";
import { Field, formatDate, ghostBtnCls, inputCls, money } from "./ui";

type Lp = { name: string; email: string; commitment: string; called: string };

export function CapitalCallBot() {
  const [entity, setEntity] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [sender, setSender] = useState("");
  const [lps, setLps] = useState<Lp[]>([
    { name: "", email: "", commitment: "", called: "" },
    { name: "", email: "", commitment: "", called: "" },
  ]);
  const [copied, setCopied] = useState<number | "all" | null>(null);

  function update(i: number, field: keyof Lp, value: string) {
    setLps((cur) => cur.map((lp, idx) => (idx === i ? { ...lp, [field]: value } : lp)));
  }

  const valid = lps.filter((lp) => Number(lp.commitment) > 0);
  const totalCommitment = valid.reduce((s, lp) => s + Number(lp.commitment), 0);
  const call = Number(amount) || 0;

  const rows = valid.map((lp) => {
    const commitment = Number(lp.commitment);
    const called = Number(lp.called) || 0;
    const share = totalCommitment ? commitment / totalCommitment : 0;
    const due = Math.round(call * share * 100) / 100;
    const unfunded = commitment - called;
    return { ...lp, commitment, called, share, due, unfunded, over: due > unfunded + 0.005 };
  });

  const notice = (r: (typeof rows)[number]) => `Subject: Capital Call — ${entity || "[Entity]"}

Dear ${r.name || "[Investor]"},

${entity || "[Entity]"} is issuing a capital call of ${money(call, 2)} in total${purpose ? ` for ${purpose}` : ""}.

Your share, based on your commitment of ${money(r.commitment, 2)} (${(r.share * 100).toFixed(2)}% of total commitments), is ${money(r.due, 2)}.
Remaining unfunded commitment after this call: ${money(r.unfunded - r.due, 2)}.

Please fund by ${dueDate ? formatDate(dueDate) : "[due date]"} using the wire instructions previously provided to you.

IMPORTANT: We will never change wire instructions by email. Before sending funds, confirm the instructions by calling us at a phone number you already have on file.

Thank you,
${sender || "[Your name]"}`;

  async function copy(text: string, which: number | "all") {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/60 max-w-[640px]">
        Allocates a capital call across investors pro rata by commitment and drafts each investor&apos;s notice. It
        calculates and drafts; it doesn&apos;t send notices or move money.
      </p>

      <div className="grid md:grid-cols-3 gap-4">
        <Field label="ENTITY / FUND NAME">
          <input value={entity} onChange={(e) => setEntity(e.target.value)} className={inputCls} />
        </Field>
        <Field label="TOTAL CALL AMOUNT">
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
        </Field>
        <Field label="DUE DATE">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="PURPOSE">
          <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. the acquisition of 123 Main St" className={inputCls} />
        </Field>
        <Field label="SIGNED BY">
          <input value={sender} onChange={(e) => setSender(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <div>
        <div className="font-mono text-[10px] tracking-widest opacity-60 mb-3">INVESTORS</div>
        <div className="space-y-2">
          {lps.map((lp, i) => (
            <div key={i} className="grid md:grid-cols-[1fr_1fr_150px_150px_auto] gap-2">
              <input placeholder="Name" value={lp.name} onChange={(e) => update(i, "name", e.target.value)} className={inputCls} />
              <input placeholder="Email" value={lp.email} onChange={(e) => update(i, "email", e.target.value)} className={inputCls} />
              <input placeholder="Commitment" type="number" value={lp.commitment} onChange={(e) => update(i, "commitment", e.target.value)} className={inputCls} />
              <input placeholder="Called to date" type="number" value={lp.called} onChange={(e) => update(i, "called", e.target.value)} className={inputCls} />
              <button onClick={() => setLps((cur) => cur.filter((_, idx) => idx !== i))} className="font-mono text-xs text-white/40 hover:text-red-400">
                ✕
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setLps((cur) => [...cur, { name: "", email: "", commitment: "", called: "" }])} className="mt-3 font-mono text-[11px] text-accent hover:underline">
          + Add investor
        </button>
      </div>

      {rows.length > 0 && call > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              className={ghostBtnCls}
              onClick={() =>
                downloadCsv(
                  "capital-call.csv",
                  ["Investor", "Email", "Commitment", "Called to date", "This call", "Unfunded after call"],
                  rows.map((r) => [r.name, r.email, r.commitment, r.called, r.due.toFixed(2), (r.unfunded - r.due).toFixed(2)]),
                )
              }
            >
              EXPORT CSV
            </button>
            <button className={ghostBtnCls} onClick={() => copy(rows.map(notice).join("\n\n---\n\n"), "all")}>
              {copied === "all" ? "COPIED ✓" : "COPY ALL NOTICES"}
            </button>
          </div>

          {rows.some((r) => r.over) && (
            <p className="text-orange-400 text-sm">
              One or more investors would be called for more than their unfunded commitment. Check the numbers before
              sending.
            </p>
          )}

          {rows.map((r, i) => (
            <div key={i} className={`border p-4 bg-white/[0.02] ${r.over ? "border-orange-400/50" : "border-white/10"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs">
                  {r.name || "(unnamed)"} — <span className="text-accent">{money(r.due, 2)}</span>
                </span>
                <button onClick={() => copy(notice(r), i)} className="font-mono text-[11px] text-accent hover:underline">
                  {copied === i ? "Copied ✓" : "Copy notice"}
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-[11px] text-white/70">{notice(r)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
