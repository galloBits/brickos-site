"use client";

import { useState } from "react";
import { Field, inputCls, money, ResultBox } from "./ui";

type Tier = { name: string; lp: number; gpEquity: number; promote: number };

// Whole-fund (European) waterfall, assuming all cash comes back in a single
// exit distribution after the hold period:
//   1. Return of capital, pro rata
//   2. Preferred return, compounded annually on contributed capital, pro rata
//   3. GP catch-up at the stated rate until promote = carry % of profits so far
//   4. Remaining profit split: carry % to GP as promote, rest pro rata
export function computeWaterfall(input: {
  lpEquity: number;
  gpEquity: number;
  prefPct: number;
  years: number;
  distributions: number;
  catchUpPct: number;
  carryPct: number;
}): Tier[] {
  const E = input.lpEquity + input.gpEquity;
  if (E <= 0) return [];
  const lpShare = input.lpEquity / E;
  const gpShare = input.gpEquity / E;
  const carry = input.carryPct / 100;
  const catchUp = input.catchUpPct / 100;
  let remaining = Math.max(0, input.distributions);
  const tiers: Tier[] = [];

  const roc = Math.min(remaining, E);
  remaining -= roc;
  tiers.push({ name: "Return of capital", lp: roc * lpShare, gpEquity: roc * gpShare, promote: 0 });

  const prefOwed = E * (Math.pow(1 + input.prefPct / 100, Math.max(0, input.years)) - 1);
  const pref = Math.min(remaining, prefOwed);
  remaining -= pref;
  tiers.push({ name: `Preferred return (${input.prefPct}%)`, lp: pref * lpShare, gpEquity: pref * gpShare, promote: 0 });

  if (catchUp > carry && carry > 0 && remaining > 0) {
    const tierSize = (carry * pref) / (catchUp - carry);
    const paid = Math.min(remaining, tierSize);
    remaining -= paid;
    const promote = paid * catchUp;
    const rest = paid - promote;
    tiers.push({ name: `GP catch-up (${input.catchUpPct}%)`, lp: rest * lpShare, gpEquity: rest * gpShare, promote });
  }

  const promote = remaining * carry;
  const rest = remaining - promote;
  tiers.push({
    name: `Profit split (${100 - input.carryPct}/${input.carryPct})`,
    lp: rest * lpShare,
    gpEquity: rest * gpShare,
    promote,
  });

  return tiers;
}

export function WaterfallModeler() {
  const [lpEquity, setLpEquity] = useState("900000");
  const [gpEquity, setGpEquity] = useState("100000");
  const [prefPct, setPrefPct] = useState("8");
  const [years, setYears] = useState("5");
  const [distributions, setDistributions] = useState("1800000");
  const [catchUpPct, setCatchUpPct] = useState("0");
  const [carryPct, setCarryPct] = useState("20");

  const lp = Number(lpEquity) || 0;
  const gp = Number(gpEquity) || 0;
  const tiers = computeWaterfall({
    lpEquity: lp,
    gpEquity: gp,
    prefPct: Number(prefPct) || 0,
    years: Number(years) || 0,
    distributions: Number(distributions) || 0,
    catchUpPct: Number(catchUpPct) || 0,
    carryPct: Math.min(100, Math.max(0, Number(carryPct) || 0)),
  });

  const totals = tiers.reduce(
    (t, r) => ({ lp: t.lp + r.lp, gpEquity: t.gpEquity + r.gpEquity, promote: t.promote + r.promote }),
    { lp: 0, gpEquity: 0, promote: 0 },
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/60 max-w-[640px]">
        Models a whole-fund waterfall: return of capital, then preferred return, optional GP catch-up, then the profit
        split. It assumes all cash comes back at exit after the hold period. It&apos;s a planning tool; the waterfall in
        your operating agreement controls.
      </p>

      <div className="grid md:grid-cols-4 gap-4">
        <Field label="LP EQUITY">
          <input type="number" value={lpEquity} onChange={(e) => setLpEquity(e.target.value)} className={inputCls} />
        </Field>
        <Field label="GP CO-INVEST EQUITY">
          <input type="number" value={gpEquity} onChange={(e) => setGpEquity(e.target.value)} className={inputCls} />
        </Field>
        <Field label="TOTAL CASH DISTRIBUTED">
          <input type="number" value={distributions} onChange={(e) => setDistributions(e.target.value)} className={inputCls} />
        </Field>
        <Field label="HOLD PERIOD (YEARS)">
          <input type="number" value={years} onChange={(e) => setYears(e.target.value)} className={inputCls} />
        </Field>
        <Field label="PREFERRED RETURN %">
          <input type="number" value={prefPct} onChange={(e) => setPrefPct(e.target.value)} className={inputCls} />
        </Field>
        <Field label="GP PROMOTE / CARRY %">
          <input type="number" value={carryPct} onChange={(e) => setCarryPct(e.target.value)} className={inputCls} />
        </Field>
        <Field label="GP CATCH-UP % (0 = NONE)">
          <input type="number" value={catchUpPct} onChange={(e) => setCatchUpPct(e.target.value)} className={inputCls} />
        </Field>
      </div>

      {tiers.length > 0 && (
        <ResultBox>
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="text-left text-white/50 border-b border-white/10">
                <th className="py-2">TIER</th>
                <th className="py-2 text-right">LP</th>
                <th className="py-2 text-right">GP EQUITY</th>
                <th className="py-2 text-right">GP PROMOTE</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.name} className="border-b border-white/5">
                  <td className="py-2">{t.name}</td>
                  <td className="py-2 text-right">{money(t.lp)}</td>
                  <td className="py-2 text-right">{money(t.gpEquity)}</td>
                  <td className="py-2 text-right">{money(t.promote)}</td>
                </tr>
              ))}
              <tr className="text-accent">
                <td className="py-2">TOTAL</td>
                <td className="py-2 text-right">{money(totals.lp)}</td>
                <td className="py-2 text-right">{money(totals.gpEquity)}</td>
                <td className="py-2 text-right">{money(totals.promote)}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-4 grid md:grid-cols-3 gap-4 font-mono text-xs">
            <div>
              LP equity multiple: <span className="text-accent">{lp ? (totals.lp / lp).toFixed(2) : "—"}x</span>
            </div>
            <div>
              GP total (equity + promote): <span className="text-accent">{money(totals.gpEquity + totals.promote)}</span>
            </div>
            <div>
              GP equity multiple incl. promote:{" "}
              <span className="text-accent">{gp ? ((totals.gpEquity + totals.promote) / gp).toFixed(2) + "x" : "—"}</span>
            </div>
          </div>
        </ResultBox>
      )}
    </div>
  );
}
