"use client";

import { useState } from "react";

type Rental = { address: string; rent: string; sqft: string };

export function RentEstimator() {
  const [subjectSqft, setSubjectSqft] = useState("1200");
  const [rentals, setRentals] = useState<Rental[]>([
    { address: "", rent: "", sqft: "" },
    { address: "", rent: "", sqft: "" },
    { address: "", rent: "", sqft: "" },
  ]);

  function update(i: number, field: keyof Rental, value: string) {
    setRentals((cur) => cur.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  const valid = rentals.filter((r) => Number(r.rent) > 0 && Number(r.sqft) > 0);
  const rentPerSqft = valid.length
    ? valid.reduce((sum, r) => sum + Number(r.rent) / Number(r.sqft), 0) / valid.length
    : 0;
  const estimatedRent = rentPerSqft * Number(subjectSqft || 0);

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
        <div className="font-mono text-[10px] tracking-widest opacity-60 mb-3">COMPARABLE RENTALS</div>
        <div className="space-y-2">
          {rentals.map((r, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <input
                placeholder="Address"
                value={r.address}
                onChange={(e) => update(i, "address", e.target.value)}
                className="bg-black border border-white/10 px-3 py-2 font-mono text-xs outline-none focus:border-accent/50"
              />
              <input
                placeholder="Monthly rent"
                type="number"
                value={r.rent}
                onChange={(e) => update(i, "rent", e.target.value)}
                className="bg-black border border-white/10 px-3 py-2 font-mono text-xs outline-none focus:border-accent/50"
              />
              <input
                placeholder="Sqft"
                type="number"
                value={r.sqft}
                onChange={(e) => update(i, "sqft", e.target.value)}
                className="bg-black border border-white/10 px-3 py-2 font-mono text-xs outline-none focus:border-accent/50"
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => setRentals((cur) => [...cur, { address: "", rent: "", sqft: "" }])}
          className="mt-3 font-mono text-[11px] text-accent hover:underline"
        >
          + Add rental comp
        </button>
      </div>

      <div className="border border-accent/30 bg-accent/5 p-6">
        <div className="font-mono text-[10px] tracking-widest opacity-60">
          BASED ON {valid.length} COMP{valid.length === 1 ? "" : "S"}
        </div>
        <div className="mt-2 text-3xl font-serif text-accent">
          ${rentPerSqft.toFixed(2)} <span className="text-sm opacity-60">/ sqft / mo avg</span>
        </div>
        <div className="mt-4 font-mono text-[11px] opacity-60">ESTIMATED MONTHLY RENT</div>
        <div className="text-2xl font-serif">
          ${estimatedRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      </div>
    </div>
  );
}
