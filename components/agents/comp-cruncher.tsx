"use client";

import { useState } from "react";
import { HandoffLink } from "./handoff-link";

type Comp = { address: string; price: string; sqft: string };

export function CompCruncher() {
  const [subjectSqft, setSubjectSqft] = useState("1500");
  const [comps, setComps] = useState<Comp[]>([
    { address: "", price: "", sqft: "" },
    { address: "", price: "", sqft: "" },
    { address: "", price: "", sqft: "" },
  ]);

  function updateComp(i: number, field: keyof Comp, value: string) {
    setComps((cur) => cur.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  }

  const validComps = comps.filter((c) => Number(c.price) > 0 && Number(c.sqft) > 0);
  const pricePerSqft = validComps.length
    ? validComps.reduce((sum, c) => sum + Number(c.price) / Number(c.sqft), 0) / validComps.length
    : 0;
  const estimatedValue = pricePerSqft * Number(subjectSqft || 0);

  return (
    <div className="space-y-6">
      <label className="flex flex-col gap-2 max-w-[240px]">
        <span className="font-mono text-[10px] tracking-widest opacity-60">SUBJECT PROPERTY SQFT</span>
        <input
          value={subjectSqft}
          onChange={(e) => setSubjectSqft(e.target.value)}
          type="number"
          className="bg-black border border-white/10 px-4 py-2.5 font-mono text-sm outline-none focus:border-accent/50"
        />
      </label>

      <div>
        <div className="font-mono text-[10px] tracking-widest opacity-60 mb-3">COMPARABLE SALES</div>
        <div className="space-y-2">
          {comps.map((comp, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <input
                placeholder="Address"
                value={comp.address}
                onChange={(e) => updateComp(i, "address", e.target.value)}
                className="bg-black border border-white/10 px-3 py-2 font-mono text-xs outline-none focus:border-accent/50"
              />
              <input
                placeholder="Sold price"
                type="number"
                value={comp.price}
                onChange={(e) => updateComp(i, "price", e.target.value)}
                className="bg-black border border-white/10 px-3 py-2 font-mono text-xs outline-none focus:border-accent/50"
              />
              <input
                placeholder="Sqft"
                type="number"
                value={comp.sqft}
                onChange={(e) => updateComp(i, "sqft", e.target.value)}
                className="bg-black border border-white/10 px-3 py-2 font-mono text-xs outline-none focus:border-accent/50"
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => setComps((cur) => [...cur, { address: "", price: "", sqft: "" }])}
          className="mt-3 font-mono text-[11px] text-accent hover:underline"
        >
          + Add comp
        </button>
      </div>

      <div className="border border-accent/30 bg-accent/5 p-6">
        <div className="font-mono text-[10px] tracking-widest opacity-60">
          BASED ON {validComps.length} COMP{validComps.length === 1 ? "" : "S"}
        </div>
        <div className="mt-2 text-3xl font-serif text-accent">
          ${pricePerSqft.toFixed(2)} <span className="text-sm opacity-60">/ sqft avg</span>
        </div>
        <div className="mt-4 font-mono text-[11px] opacity-60">ESTIMATED VALUE</div>
        <div className="text-2xl font-serif">
          ${estimatedValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </div>
      </div>
      {estimatedValue > 0 && (
        <div className="flex flex-wrap gap-3">
          <HandoffLink slug="mao-engine" params={{ arv: Math.round(estimatedValue) }}>
            Use as ARV in MAO Engine
          </HandoffLink>
        </div>
      )}
    </div>
  );
}
