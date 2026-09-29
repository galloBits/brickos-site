"use client";

import { useState } from "react";
import { Field, inputCls, ResultBox, money } from "./ui";

type Comp = { rent: string; sqft: string };

export function VacancyPricer() {
  const [sqft, setSqft] = useState("1000");
  const [comps, setComps] = useState<Comp[]>([
    { rent: "", sqft: "" },
    { rent: "", sqft: "" },
    { rent: "", sqft: "" },
  ]);
  const [daysVacant, setDaysVacant] = useState("0");
  const [targetDays, setTargetDays] = useState("21");
  const [cutPct, setCutPct] = useState("2");

  function updateComp(i: number, field: keyof Comp, value: string) {
    setComps((cur) => cur.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  }

  const valid = comps.filter((c) => Number(c.rent) > 0 && Number(c.sqft) > 0);
  const rentPerSqft = valid.length ? valid.reduce((s, c) => s + Number(c.rent) / Number(c.sqft), 0) / valid.length : 0;
  const marketRent = rentPerSqft * (Number(sqft) || 0);

  const days = Number(daysVacant) || 0;
  const target = Number(targetDays) || 0;
  const weeksOver = days > target ? Math.ceil((days - target) / 7) : 0;
  const reductionPct = Math.min(10, weeksOver * (Number(cutPct) || 0));
  const suggested = marketRent * (1 - reductionPct / 100);
  const lostRent = (marketRent / 30) * days;

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/60 max-w-[560px]">
        Prices a vacant unit from rental comps, then steps the price down for every week the unit sits past your
        target lease-up time (capped at 10%).
      </p>

      <div className="grid md:grid-cols-4 gap-4">
        <Field label="UNIT SQFT">
          <input type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} className={inputCls} />
        </Field>
        <Field label="DAYS VACANT SO FAR">
          <input type="number" value={daysVacant} onChange={(e) => setDaysVacant(e.target.value)} className={inputCls} />
        </Field>
        <Field label="TARGET DAYS TO LEASE">
          <input type="number" value={targetDays} onChange={(e) => setTargetDays(e.target.value)} className={inputCls} />
        </Field>
        <Field label="CUT PER WEEK OVER TARGET %">
          <input type="number" value={cutPct} onChange={(e) => setCutPct(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <div>
        <div className="font-mono text-[10px] tracking-widest opacity-60 mb-3">RENTAL COMPS</div>
        <div className="space-y-2">
          {comps.map((c, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 max-w-[420px]">
              <input
                placeholder="Monthly rent"
                type="number"
                value={c.rent}
                onChange={(e) => updateComp(i, "rent", e.target.value)}
                className={inputCls}
              />
              <input
                placeholder="Sqft"
                type="number"
                value={c.sqft}
                onChange={(e) => updateComp(i, "sqft", e.target.value)}
                className={inputCls}
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => setComps((cur) => [...cur, { rent: "", sqft: "" }])}
          className="mt-3 font-mono text-[11px] text-accent hover:underline"
        >
          + Add comp
        </button>
      </div>

      <ResultBox>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="font-mono text-[10px] tracking-widest opacity-60">MARKET RENT</div>
            <div className="text-2xl font-serif">{money(marketRent)}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-widest opacity-60">
              SUGGESTED LIST PRICE {reductionPct > 0 && `(−${reductionPct}%)`}
            </div>
            <div className="text-3xl font-serif text-accent">{money(suggested)}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-widest opacity-60">RENT LOST SO FAR</div>
            <div className="text-2xl font-serif">{money(lostRent)}</div>
          </div>
        </div>
      </ResultBox>
    </div>
  );
}
