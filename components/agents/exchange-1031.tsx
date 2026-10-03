"use client";

import { useState } from "react";
import { addDays } from "@/lib/checklist-templates";
import { Field, inputCls, money, ResultBox } from "./ui";

type Candidate = { name: string; price: string };

function daysFromToday(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((Date.parse(`${iso}T00:00:00`) - today.getTime()) / 86400000);
}

function fmt(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

export function Exchange1031() {
  const [saleDate, setSaleDate] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [debtPaidOff, setDebtPaidOff] = useState("");
  const [cashProceeds, setCashProceeds] = useState("");
  const [returnDue, setReturnDue] = useState("");
  const [newDebt, setNewDebt] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([
    { name: "", price: "" },
    { name: "", price: "" },
    { name: "", price: "" },
  ]);

  const day45 = saleDate ? addDays(saleDate, 45) : null;
  const day180 = saleDate ? addDays(saleDate, 180) : null;
  const exchangeEnd = day180 && returnDue && returnDue < day180 ? returnDue : day180;

  const relinquished = Number(salePrice) || 0;
  const identified = candidates.filter((c) => Number(c.price) > 0);
  const identifiedTotal = identified.reduce((s, c) => s + Number(c.price), 0);
  const threeRuleOk = identified.length <= 3;
  const twoHundredOk = relinquished > 0 && identifiedTotal <= relinquished * 2;

  const debt = Number(debtPaidOff) || 0;
  const cash = Number(cashProceeds) || 0;
  const replacementNeeded = relinquished;
  const newLoan = Number(newDebt) || 0;
  const debtShortfall = Math.max(0, debt - newLoan);

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/60 max-w-[640px]">
        Calculates your 1031 exchange deadlines and checks your identified properties against the identification
        rules. It tracks dates and targets only. A qualified intermediary must hold the proceeds, and this is not tax
        advice; confirm everything with your QI and CPA.
      </p>

      <div className="grid md:grid-cols-3 gap-4">
        <Field label="RELINQUISHED PROPERTY CLOSING DATE">
          <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="NET SALE PRICE (after selling costs)">
          <input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className={inputCls} />
        </Field>
        <Field label="TAX RETURN DUE DATE (incl. extensions, optional)">
          <input type="date" value={returnDue} onChange={(e) => setReturnDue(e.target.value)} className={inputCls} />
        </Field>
        <Field label="MORTGAGE PAID OFF AT SALE">
          <input type="number" value={debtPaidOff} onChange={(e) => setDebtPaidOff(e.target.value)} className={inputCls} />
        </Field>
        <Field label="CASH PROCEEDS HELD BY QI">
          <input type="number" value={cashProceeds} onChange={(e) => setCashProceeds(e.target.value)} className={inputCls} />
        </Field>
        <Field label="NEW LOAN ON REPLACEMENT (planned)">
          <input type="number" value={newDebt} onChange={(e) => setNewDebt(e.target.value)} className={inputCls} />
        </Field>
      </div>

      {day45 && exchangeEnd && (
        <ResultBox>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="font-mono text-[10px] tracking-widest opacity-60">IDENTIFICATION DEADLINE (DAY 45)</div>
              <div className="text-2xl font-serif text-accent">{fmt(day45)}</div>
              <div className="font-mono text-xs opacity-70">
                {daysFromToday(day45) >= 0 ? `${daysFromToday(day45)} days left` : `passed ${-daysFromToday(day45)} days ago`}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-widest opacity-60">
                EXCHANGE MUST CLOSE BY {exchangeEnd === day180 ? "(DAY 180)" : "(TAX RETURN DUE DATE)"}
              </div>
              <div className="text-2xl font-serif text-accent">{fmt(exchangeEnd)}</div>
              <div className="font-mono text-xs opacity-70">
                {daysFromToday(exchangeEnd) >= 0
                  ? `${daysFromToday(exchangeEnd)} days left`
                  : `passed ${-daysFromToday(exchangeEnd)} days ago`}
              </div>
            </div>
          </div>
          <p className="font-mono text-[11px] opacity-60 mt-4">
            These are calendar days. They don&apos;t extend for weekends or holidays.
          </p>
        </ResultBox>
      )}

      <div>
        <div className="font-mono text-[10px] tracking-widest opacity-60 mb-3">IDENTIFIED REPLACEMENT PROPERTIES</div>
        <div className="space-y-2">
          {candidates.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_180px_auto] gap-2 max-w-[560px]">
              <input
                placeholder="Property"
                value={c.name}
                onChange={(e) => setCandidates((cur) => cur.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))}
                className={inputCls}
              />
              <input
                placeholder="Price"
                type="number"
                value={c.price}
                onChange={(e) => setCandidates((cur) => cur.map((x, idx) => (idx === i ? { ...x, price: e.target.value } : x)))}
                className={inputCls}
              />
              <button onClick={() => setCandidates((cur) => cur.filter((_, idx) => idx !== i))} className="font-mono text-xs text-white/40 hover:text-red-400">
                ✕
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setCandidates((cur) => [...cur, { name: "", price: "" }])} className="mt-3 font-mono text-[11px] text-accent hover:underline">
          + Add property
        </button>
      </div>

      {identified.length > 0 && (
        <div className="border border-white/10 p-4 space-y-2 font-mono text-xs">
          <div className={threeRuleOk ? "text-green-400" : "text-white/60"}>
            {threeRuleOk ? "✓" : "✕"} 3-property rule: {identified.length} identified (up to 3 of any value allowed)
          </div>
          <div className={twoHundredOk ? "text-green-400" : "text-white/60"}>
            {twoHundredOk ? "✓" : "✕"} 200% rule: {money(identifiedTotal)} identified vs. {money(relinquished * 2)} limit
          </div>
          <div className={threeRuleOk || twoHundredOk ? "text-green-400" : "text-red-400"}>
            {threeRuleOk || twoHundredOk
              ? "Your identification satisfies at least one rule."
              : "Your identification satisfies neither rule. Talk to your QI before the day-45 deadline."}
          </div>
        </div>
      )}

      {relinquished > 0 && (
        <div className="border border-white/10 p-4 space-y-2 font-mono text-xs">
          <div className="tracking-widest opacity-60 mb-1">TO DEFER ALL GAIN, GENERALLY:</div>
          <div>Buy replacement property worth at least {money(replacementNeeded)}</div>
          <div>Reinvest all {cash ? money(cash) : "cash"} held by the QI</div>
          <div>
            Replace the {money(debt)} of paid-off debt with new debt or added cash
            {debtShortfall > 0 && ` (planned new loan leaves ${money(debtShortfall)} to cover with added cash)`}
          </div>
          <div className="opacity-60 pt-1">Anything short of this may be taxable &quot;boot&quot;. Your CPA calculates the actual amount.</div>
        </div>
      )}
    </div>
  );
}
