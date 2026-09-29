"use client";

import { useState } from "react";
import { median, parseTable, toNumber } from "@/lib/csv";
import { Field, ghostBtnCls, inputCls, money } from "./ui";

const SAMPLE = `unit,month,amount
101,2026-05,82
101,2026-06,85
101,2026-07,80
101,2026-08,168
102,2026-05,90
102,2026-06,88
102,2026-07,93
102,2026-08,91
103,2026-05,140
103,2026-06,152
103,2026-07,148
103,2026-08,150`;

export function UtilityAuditor() {
  const [text, setText] = useState("");
  const [threshold, setThreshold] = useState("30");

  const table = text.trim() ? parseTable(text) : null;
  const valid = table && table.headers.includes("unit") && table.headers.includes("amount");
  const t = (Number(threshold) || 0) / 100;

  let spikes: { unit: string; month: string; amount: number; baseline: number }[] = [];
  let highUnits: { unit: string; typical: number; portfolio: number }[] = [];

  if (table && valid) {
    const byUnit = new Map<string, { month: string; amount: number }[]>();
    for (const r of table.rows) {
      const unit = r.unit.trim();
      const list = byUnit.get(unit) ?? [];
      list.push({ month: r.month ?? "", amount: toNumber(r.amount) });
      byUnit.set(unit, list);
    }

    const unitMedians = new Map<string, number>();
    byUnit.forEach((readings, unit) => {
      const med = median(readings.map((x) => x.amount));
      unitMedians.set(unit, med);
      if (readings.length >= 3) {
        for (const r of readings) {
          if (med > 0 && r.amount > med * (1 + t)) spikes.push({ unit, month: r.month, amount: r.amount, baseline: med });
        }
      }
    });

    const portfolioMedian = median(Array.from(unitMedians.values()));
    if (unitMedians.size >= 3) {
      unitMedians.forEach((typical, unit) => {
        if (portfolioMedian > 0 && typical > portfolioMedian * (1 + t)) {
          highUnits.push({ unit, typical, portfolio: portfolioMedian });
        }
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/60 max-w-[560px]">
          Paste utility bills as CSV (unit, month, amount). Flags one-off spikes within a unit (possible leaks or
          meter errors) and units running well above the portfolio norm.
        </p>
        <button className={ghostBtnCls} onClick={() => setText(SAMPLE)}>
          LOAD SAMPLE DATA
        </button>
      </div>

      <div className="grid md:grid-cols-[1fr_200px] gap-6">
        <textarea
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"unit,month,amount\n101,2026-05,82"}
          className="w-full bg-black border border-white/10 px-3 py-2 font-mono text-xs outline-none focus:border-accent/50"
        />
        <Field label="FLAG WHEN ABOVE NORM BY %">
          <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} className={inputCls} />
        </Field>
      </div>

      {table && !valid && <p className="text-red-400 text-sm">CSV needs columns: unit, month, amount.</p>}

      {table && valid && (
        <div className="space-y-4">
          <div className="border border-white/10 p-4">
            <div className="font-mono text-[10px] tracking-widest opacity-60 mb-3">
              SPIKES VS. THE UNIT&apos;S OWN NORMAL ({spikes.length})
            </div>
            {spikes.length === 0 && <p className="text-sm text-white/50">No spikes found.</p>}
            {spikes.map((s, i) => (
              <div key={i} className="font-mono text-xs py-1 text-orange-300">
                Unit {s.unit}, {s.month}: {money(s.amount, 2)} vs. typical {money(s.baseline, 2)} (
                {(((s.amount - s.baseline) / s.baseline) * 100).toFixed(0)}% over)
              </div>
            ))}
          </div>
          <div className="border border-white/10 p-4">
            <div className="font-mono text-[10px] tracking-widest opacity-60 mb-3">
              UNITS RUNNING HIGH VS. PORTFOLIO ({highUnits.length})
            </div>
            {highUnits.length === 0 && (
              <p className="text-sm text-white/50">None (needs at least 3 units to compare).</p>
            )}
            {highUnits.map((u) => (
              <div key={u.unit} className="font-mono text-xs py-1 text-orange-300">
                Unit {u.unit}: typical {money(u.typical, 2)} vs. portfolio median {money(u.portfolio, 2)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
