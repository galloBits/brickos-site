"use client";

import { useState } from "react";

type Structure = {
  name: string;
  price: string;
  downPct: string;
  noteRate: string;
  termYears: string;
};

const DEFAULT_STRUCTURES: Structure[] = [
  { name: "All Cash", price: "220000", downPct: "100", noteRate: "0", termYears: "0" },
  { name: "Seller Finance", price: "235000", downPct: "10", noteRate: "6", termYears: "5" },
  { name: "Subject-To", price: "230000", downPct: "5", noteRate: "0", termYears: "0" },
];

function monthlyPI(principal: number, ratePct: number, years: number) {
  if (!principal || !years) return 0;
  const r = ratePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function OfferStackBuilder() {
  const [structures, setStructures] = useState<Structure[]>(DEFAULT_STRUCTURES);

  function update(i: number, field: keyof Structure, value: string) {
    setStructures((cur) => cur.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        {structures.map((s, i) => {
          const price = Number(s.price) || 0;
          const down = price * (Number(s.downPct) || 0) / 100;
          const financed = price - down;
          const pi = monthlyPI(financed, Number(s.noteRate) || 0, Number(s.termYears) || 0);
          return (
            <div key={i} className="border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <input
                value={s.name}
                onChange={(e) => update(i, "name", e.target.value)}
                className="w-full bg-transparent font-bold text-sm border-b border-white/10 pb-2 outline-none"
              />
              {[
                { label: "PRICE", key: "price" as const },
                { label: "DOWN %", key: "downPct" as const },
                { label: "NOTE RATE %", key: "noteRate" as const },
                { label: "TERM (YEARS)", key: "termYears" as const },
              ].map((f) => (
                <label key={f.key} className="flex flex-col gap-1">
                  <span className="font-mono text-[9px] tracking-widest opacity-50">{f.label}</span>
                  <input
                    type="number"
                    value={s[f.key]}
                    onChange={(e) => update(i, f.key, e.target.value)}
                    className="bg-black border border-white/10 px-2 py-1.5 font-mono text-xs outline-none focus:border-accent/50"
                  />
                </label>
              ))}
              <div className="pt-2 border-t border-white/10 font-mono text-[11px] space-y-1">
                <div className="flex justify-between opacity-60">
                  <span>Down payment</span>
                  <span>${down.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between opacity-60">
                  <span>Financed</span>
                  <span>${financed.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-accent text-sm pt-1">
                  <span>Est. P&I / mo</span>
                  <span>${pi.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={() =>
          setStructures((cur) => [...cur, { name: "New Structure", price: "0", downPct: "0", noteRate: "0", termYears: "0" }])
        }
        className="font-mono text-[11px] text-accent hover:underline"
      >
        + Add structure
      </button>
    </div>
  );
}
