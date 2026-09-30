"use client";

import { useState } from "react";
import { downloadCsv } from "@/lib/csv";
import { Field, ghostBtnCls, inputCls, money, ResultBox } from "./ui";

type Investor = { name: string; capital: string };

export function DistributionCalc() {
  const [cash, setCash] = useState("50000");
  const [reserve, setReserve] = useState("0");
  const [investors, setInvestors] = useState<Investor[]>([
    { name: "", capital: "" },
    { name: "", capital: "" },
    { name: "", capital: "" },
  ]);

  function update(i: number, field: keyof Investor, value: string) {
    setInvestors((cur) => cur.map((inv, idx) => (idx === i ? { ...inv, [field]: value } : inv)));
  }

  const valid = investors.filter((i) => Number(i.capital) > 0);
  const totalCapital = valid.reduce((s, i) => s + Number(i.capital), 0);
  const distributable = Math.max(0, (Number(cash) || 0) - (Number(reserve) || 0));

  // Allocate in cents and hand leftover rounding cents to the largest
  // holders so the payouts sum to exactly the distributable amount.
  const totalCents = Math.round(distributable * 100);
  const rows = valid.map((inv) => {
    const share = totalCapital ? Number(inv.capital) / totalCapital : 0;
    return { name: inv.name || "(unnamed)", capital: Number(inv.capital), share, cents: Math.floor(totalCents * share) };
  });
  let leftover = totalCents - rows.reduce((s, r) => s + r.cents, 0);
  [...rows]
    .sort((a, b) => b.share - a.share)
    .forEach((r) => {
      if (leftover > 0) {
        r.cents += 1;
        leftover -= 1;
      }
    });

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/60 max-w-[600px]">
        Splits a distribution pro rata by capital contributed. It calculates the amounts; it doesn&apos;t move money.
        If your operating agreement has a preferred return or promote, use Waterfall Modeler instead.
      </p>

      <div className="grid md:grid-cols-3 gap-4 max-w-[640px]">
        <Field label="CASH AVAILABLE TO DISTRIBUTE">
          <input type="number" value={cash} onChange={(e) => setCash(e.target.value)} className={inputCls} />
        </Field>
        <Field label="HOLD BACK AS RESERVE">
          <input type="number" value={reserve} onChange={(e) => setReserve(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <div>
        <div className="font-mono text-[10px] tracking-widest opacity-60 mb-3">INVESTORS</div>
        <div className="space-y-2">
          {investors.map((inv, i) => (
            <div key={i} className="grid grid-cols-[1fr_180px_auto] gap-2 max-w-[560px]">
              <input placeholder="Investor name" value={inv.name} onChange={(e) => update(i, "name", e.target.value)} className={inputCls} />
              <input placeholder="Capital contributed" type="number" value={inv.capital} onChange={(e) => update(i, "capital", e.target.value)} className={inputCls} />
              <button onClick={() => setInvestors((cur) => cur.filter((_, idx) => idx !== i))} className="font-mono text-xs text-white/40 hover:text-red-400">
                ✕
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setInvestors((cur) => [...cur, { name: "", capital: "" }])} className="mt-3 font-mono text-[11px] text-accent hover:underline">
          + Add investor
        </button>
      </div>

      {rows.length > 0 && (
        <ResultBox>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-mono text-[10px] tracking-widest opacity-60">DISTRIBUTING</div>
              <div className="text-3xl font-serif text-accent">{money(distributable, 2)}</div>
            </div>
            <button
              className={ghostBtnCls}
              onClick={() =>
                downloadCsv(
                  "distribution.csv",
                  ["Investor", "Capital", "Share %", "Distribution"],
                  rows.map((r) => [r.name, r.capital, (r.share * 100).toFixed(4), (r.cents / 100).toFixed(2)]),
                )
              }
            >
              EXPORT CSV
            </button>
          </div>
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="text-left text-white/50 border-b border-white/10">
                <th className="py-2">INVESTOR</th>
                <th className="py-2 text-right">CAPITAL</th>
                <th className="py-2 text-right">SHARE</th>
                <th className="py-2 text-right">DISTRIBUTION</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-2">{r.name}</td>
                  <td className="py-2 text-right">{money(r.capital)}</td>
                  <td className="py-2 text-right">{(r.share * 100).toFixed(2)}%</td>
                  <td className="py-2 text-right text-accent">{money(r.cents / 100, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResultBox>
      )}
    </div>
  );
}
