"use client";

import { useState } from "react";

export function MaoEngine() {
  const [arv, setArv] = useState("250000");
  const [arvMultiplier, setArvMultiplier] = useState("70");
  const [repairCost, setRepairCost] = useState("35000");
  const [closingCostPct, setClosingCostPct] = useState("3");
  const [holdingCosts, setHoldingCosts] = useState("4000");
  const [wholesaleFee, setWholesaleFee] = useState("10000");

  const arvNum = Number(arv) || 0;
  const closingCosts = arvNum * (Number(closingCostPct || 0) / 100);
  const mao =
    arvNum * (Number(arvMultiplier || 0) / 100) -
    (Number(repairCost) || 0) -
    closingCosts -
    (Number(holdingCosts) || 0) -
    (Number(wholesaleFee) || 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/60 max-w-[520px]">
        Default formula follows the standard 70% rule — adjust the multiplier and cost lines to match your own
        underwriting criteria.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {[
          { label: "AFTER REPAIR VALUE (ARV)", value: arv, set: setArv },
          { label: "ARV MULTIPLIER %", value: arvMultiplier, set: setArvMultiplier },
          { label: "REPAIR COST", value: repairCost, set: setRepairCost },
          { label: "CLOSING COST %", value: closingCostPct, set: setClosingCostPct },
          { label: "HOLDING COSTS", value: holdingCosts, set: setHoldingCosts },
          { label: "WHOLESALE / ASSIGNMENT FEE", value: wholesaleFee, set: setWholesaleFee },
        ].map((field) => (
          <label key={field.label} className="flex flex-col gap-2">
            <span className="font-mono text-[10px] tracking-widest opacity-60">{field.label}</span>
            <input
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              type="number"
              className="bg-black border border-white/10 px-4 py-2.5 font-mono text-sm outline-none focus:border-accent/50"
            />
          </label>
        ))}
      </div>

      <div className="border border-accent/30 bg-accent/5 p-6">
        <div className="font-mono text-[10px] tracking-widest opacity-60">MAX ALLOWABLE OFFER</div>
        <div className="mt-2 text-4xl font-serif text-accent">
          ${mao.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div className="mt-3 font-mono text-[11px] opacity-50">
          = (ARV × {arvMultiplier || 0}%) − repairs − closing costs − holding costs − fee
        </div>
      </div>
    </div>
  );
}
