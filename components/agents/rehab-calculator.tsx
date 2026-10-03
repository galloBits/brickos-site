"use client";

import { useState } from "react";
import { HandoffLink } from "./handoff-link";

type LineItem = { name: string; cost: string };

const DEFAULT_ITEMS: LineItem[] = [
  { name: "Roof", cost: "" },
  { name: "Kitchen", cost: "" },
  { name: "Bathrooms", cost: "" },
  { name: "Flooring", cost: "" },
  { name: "Paint (interior + exterior)", cost: "" },
  { name: "HVAC", cost: "" },
];

export function RehabCalculator() {
  const [items, setItems] = useState<LineItem[]>(DEFAULT_ITEMS);
  const [contingencyPct, setContingencyPct] = useState("15");

  function update(i: number, field: keyof LineItem, value: string) {
    setItems((cur) => cur.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  const subtotal = items.reduce((sum, it) => sum + (Number(it.cost) || 0), 0);
  const contingency = subtotal * (Number(contingencyPct || 0) / 100);
  const total = subtotal + contingency;

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] tracking-widest opacity-60 mb-3">LINE ITEMS</div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_160px_auto] gap-2 items-center">
              <input
                value={it.name}
                onChange={(e) => update(i, "name", e.target.value)}
                className="bg-black border border-white/10 px-3 py-2 font-mono text-xs outline-none focus:border-accent/50"
              />
              <input
                placeholder="Cost"
                type="number"
                value={it.cost}
                onChange={(e) => update(i, "cost", e.target.value)}
                className="bg-black border border-white/10 px-3 py-2 font-mono text-xs outline-none focus:border-accent/50"
              />
              <button
                onClick={() => setItems((cur) => cur.filter((_, idx) => idx !== i))}
                className="font-mono text-xs text-white/40 hover:text-red-400"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setItems((cur) => [...cur, { name: "", cost: "" }])}
          className="mt-3 font-mono text-[11px] text-accent hover:underline"
        >
          + Add line item
        </button>
      </div>

      <label className="flex flex-col gap-2 max-w-[160px]">
        <span className="font-mono text-[10px] tracking-widest opacity-60">CONTINGENCY %</span>
        <input
          value={contingencyPct}
          onChange={(e) => setContingencyPct(e.target.value)}
          type="number"
          className="bg-black border border-white/10 px-4 py-2.5 font-mono text-sm outline-none focus:border-accent/50"
        />
      </label>

      <div className="border border-accent/30 bg-accent/5 p-6 space-y-1">
        <div className="flex justify-between font-mono text-xs opacity-70">
          <span>Subtotal</span>
          <span>${subtotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="flex justify-between font-mono text-xs opacity-70">
          <span>Contingency ({contingencyPct || 0}%)</span>
          <span>${contingency.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="flex justify-between text-2xl font-serif text-accent pt-2 mt-2 border-t border-accent/20">
          <span>Total rehab</span>
          <span>${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
        </div>
      </div>
      {total > 0 && (
        <div className="flex flex-wrap gap-3">
          <HandoffLink slug="mao-engine" params={{ repair: Math.round(total) }}>
            Use as repair cost in MAO Engine
          </HandoffLink>
        </div>
      )}
    </div>
  );
}
