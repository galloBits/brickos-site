"use client";

import { useState } from "react";
import { Field, inputCls, money, ResultBox } from "./ui";

export function ValuationEngine() {
  const [monthlyRent, setMonthlyRent] = useState("24000");
  const [otherIncome, setOtherIncome] = useState("800");
  const [vacancyPct, setVacancyPct] = useState("6");
  const [expenseMode, setExpenseMode] = useState<"amount" | "ratio">("ratio");
  const [expenses, setExpenses] = useState("");
  const [expenseRatio, setExpenseRatio] = useState("42");
  const [capRate, setCapRate] = useState("6.5");
  const [units, setUnits] = useState("20");
  const [askingPrice, setAskingPrice] = useState("");

  const gpi = ((Number(monthlyRent) || 0) + (Number(otherIncome) || 0)) * 12;
  const egi = gpi * (1 - (Number(vacancyPct) || 0) / 100);
  const opex = expenseMode === "amount" ? Number(expenses) || 0 : egi * ((Number(expenseRatio) || 0) / 100);
  const noi = egi - opex;
  const cap = Number(capRate) || 0;
  const value = cap > 0 ? noi / (cap / 100) : 0;
  const unitCount = Number(units) || 0;
  const asking = Number(askingPrice) || 0;

  const sensitivity = [-1, -0.5, 0, 0.5, 1]
    .map((d) => cap + d)
    .filter((c) => c > 0)
    .map((c) => ({ cap: c, value: noi / (c / 100) }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/60 max-w-[600px]">
        Income-approach valuation: builds NOI from rents, vacancy and expenses, then values the property at your cap
        rate with a sensitivity range.
      </p>

      <div className="grid md:grid-cols-4 gap-4">
        <Field label="MONTHLY GROSS RENT">
          <input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} className={inputCls} />
        </Field>
        <Field label="MONTHLY OTHER INCOME">
          <input type="number" value={otherIncome} onChange={(e) => setOtherIncome(e.target.value)} className={inputCls} />
        </Field>
        <Field label="VACANCY & CREDIT LOSS %">
          <input type="number" value={vacancyPct} onChange={(e) => setVacancyPct(e.target.value)} className={inputCls} />
        </Field>
        <Field label="EXPENSES AS">
          <select value={expenseMode} onChange={(e) => setExpenseMode(e.target.value as "amount" | "ratio")} className={inputCls}>
            <option value="ratio">% of effective income</option>
            <option value="amount">Annual dollar amount</option>
          </select>
        </Field>
        {expenseMode === "ratio" ? (
          <Field label="EXPENSE RATIO %">
            <input type="number" value={expenseRatio} onChange={(e) => setExpenseRatio(e.target.value)} className={inputCls} />
          </Field>
        ) : (
          <Field label="ANNUAL OPERATING EXPENSES">
            <input type="number" value={expenses} onChange={(e) => setExpenses(e.target.value)} className={inputCls} />
          </Field>
        )}
        <Field label="CAP RATE %">
          <input type="number" step="0.05" value={capRate} onChange={(e) => setCapRate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="UNITS (OPTIONAL)">
          <input type="number" value={units} onChange={(e) => setUnits(e.target.value)} className={inputCls} />
        </Field>
        <Field label="ASKING PRICE (OPTIONAL)">
          <input type="number" value={askingPrice} onChange={(e) => setAskingPrice(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <ResultBox>
        <div className="grid md:grid-cols-4 gap-6 font-mono text-xs">
          <div>
            <div className="opacity-60">GROSS POTENTIAL INCOME</div>
            <div className="text-lg font-serif">{money(gpi)}</div>
          </div>
          <div>
            <div className="opacity-60">EFFECTIVE GROSS INCOME</div>
            <div className="text-lg font-serif">{money(egi)}</div>
          </div>
          <div>
            <div className="opacity-60">OPERATING EXPENSES</div>
            <div className="text-lg font-serif">{money(opex)}</div>
          </div>
          <div>
            <div className="opacity-60">NOI</div>
            <div className="text-lg font-serif">{money(noi)}</div>
          </div>
        </div>
        <div className="mt-6">
          <div className="font-mono text-[10px] tracking-widest opacity-60">VALUE AT {cap}% CAP</div>
          <div className="text-4xl font-serif text-accent">{money(value)}</div>
          {unitCount > 0 && value > 0 && (
            <div className="font-mono text-xs opacity-70 mt-1">{money(value / unitCount)} per unit</div>
          )}
          {asking > 0 && (
            <div className="font-mono text-xs opacity-70 mt-1">
              Asking price implies a {((noi / asking) * 100).toFixed(2)}% cap rate
              {value > 0 && ` (${asking > value ? "above" : "below"} your value by ${money(Math.abs(asking - value))})`}
            </div>
          )}
        </div>
        {sensitivity.length > 0 && noi > 0 && (
          <div className="mt-6 grid grid-cols-5 gap-2 font-mono text-[11px]">
            {sensitivity.map((s) => (
              <div key={s.cap} className={`border p-2 text-center ${s.cap === cap ? "border-accent text-accent" : "border-white/10"}`}>
                <div className="opacity-60">{s.cap.toFixed(2)}%</div>
                <div>{money(s.value)}</div>
              </div>
            ))}
          </div>
        )}
      </ResultBox>
    </div>
  );
}
