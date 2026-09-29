"use client";

import { useState } from "react";
import { parseTable, toNumber } from "@/lib/csv";
import { ghostBtnCls, money } from "./ui";

const SAMPLE_ROLL = `unit,tenant,expected_rent
101,Alvarez,1450
102,Kim,1500
103,Patel,1395
104,Johnson,1600`;

const SAMPLE_PAYMENTS = `unit,amount
101,1450
102,1200
103,1395
103,50
105,900`;

type Row = { unit: string; tenant: string; expected: number; received: number; variance: number; status: string };

function reconcile(rollText: string, payText: string) {
  const roll = parseTable(rollText);
  const pay = parseTable(payText);

  const rentCol = roll.headers.includes("expected_rent") ? "expected_rent" : roll.headers.includes("rent") ? "rent" : null;
  if (!roll.headers.includes("unit") || !rentCol) {
    return { error: "Rent roll needs columns: unit, expected_rent (tenant is optional)." };
  }
  if (!pay.headers.includes("unit") || !pay.headers.includes("amount")) {
    return { error: "Payments need columns: unit, amount." };
  }

  const received = new Map<string, number>();
  for (const p of pay.rows) {
    const unit = p.unit.trim();
    received.set(unit, (received.get(unit) ?? 0) + toNumber(p.amount));
  }

  const rollUnits = new Set<string>();
  const rows: Row[] = roll.rows.map((r) => {
    const unit = r.unit.trim();
    rollUnits.add(unit);
    const expected = toNumber(r[rentCol]);
    const got = received.get(unit) ?? 0;
    const variance = got - expected;
    const status = got === 0 ? "NO PAYMENT" : variance < -0.005 ? "SHORT" : variance > 0.005 ? "OVER" : "PAID";
    return { unit, tenant: r.tenant ?? "", expected, received: got, variance, status };
  });

  const unmatched = Array.from(received.entries())
    .filter(([unit]) => !rollUnits.has(unit))
    .map(([unit, amount]) => ({ unit, amount }));

  return { rows, unmatched };
}

const STATUS_COLOR: Record<string, string> = {
  PAID: "text-green-400",
  SHORT: "text-orange-400",
  "NO PAYMENT": "text-red-400",
  OVER: "text-blue-400",
};

export function RentRollReconciler() {
  const [rollText, setRollText] = useState("");
  const [payText, setPayText] = useState("");

  const result = rollText.trim() && payText.trim() ? reconcile(rollText, payText) : null;

  function loadFile(file: File | undefined, set: (v: string) => void) {
    if (!file) return;
    file.text().then(set);
  }

  const totals =
    result && "rows" in result && result.rows
      ? result.rows.reduce(
          (t, r) => ({ expected: t.expected + r.expected, received: t.received + r.received }),
          { expected: 0, received: 0 },
        )
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/60 max-w-[560px]">
          Paste or upload two CSVs — your rent roll and the payments actually received — and see every unit that&apos;s
          short, over, or unpaid.
        </p>
        <button
          className={ghostBtnCls}
          onClick={() => {
            setRollText(SAMPLE_ROLL);
            setPayText(SAMPLE_PAYMENTS);
          }}
        >
          LOAD SAMPLE DATA
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] tracking-widest opacity-60">RENT ROLL (unit, tenant, expected_rent)</span>
            <input type="file" accept=".csv,text/csv" onChange={(e) => loadFile(e.target.files?.[0], setRollText)} className="text-[10px] w-[160px]" />
          </div>
          <textarea
            rows={9}
            value={rollText}
            onChange={(e) => setRollText(e.target.value)}
            className="w-full bg-black border border-white/10 px-3 py-2 font-mono text-xs outline-none focus:border-accent/50"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] tracking-widest opacity-60">PAYMENTS RECEIVED (unit, amount)</span>
            <input type="file" accept=".csv,text/csv" onChange={(e) => loadFile(e.target.files?.[0], setPayText)} className="text-[10px] w-[160px]" />
          </div>
          <textarea
            rows={9}
            value={payText}
            onChange={(e) => setPayText(e.target.value)}
            className="w-full bg-black border border-white/10 px-3 py-2 font-mono text-xs outline-none focus:border-accent/50"
          />
        </div>
      </div>

      {result && "error" in result && <p className="text-red-400 text-sm">{result.error}</p>}

      {result && "rows" in result && result.rows && totals && (
        <div className="space-y-4">
          <div className="border border-white/10 overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="text-left text-white/50 border-b border-white/10">
                  <th className="p-3">UNIT</th>
                  <th className="p-3">TENANT</th>
                  <th className="p-3 text-right">EXPECTED</th>
                  <th className="p-3 text-right">RECEIVED</th>
                  <th className="p-3 text-right">VARIANCE</th>
                  <th className="p-3">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.unit} className="border-b border-white/5">
                    <td className="p-3">{r.unit}</td>
                    <td className="p-3 text-white/60">{r.tenant}</td>
                    <td className="p-3 text-right">{money(r.expected, 2)}</td>
                    <td className="p-3 text-right">{money(r.received, 2)}</td>
                    <td className="p-3 text-right">{money(r.variance, 2)}</td>
                    <td className={`p-3 ${STATUS_COLOR[r.status]}`}>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-accent/30 bg-accent/5 p-4 font-mono text-xs flex flex-wrap gap-x-8 gap-y-1">
            <span>Expected: {money(totals.expected, 2)}</span>
            <span>Received: {money(totals.received, 2)}</span>
            <span className="text-accent">Collection rate: {totals.expected ? ((totals.received / totals.expected) * 100).toFixed(1) : "0"}%</span>
          </div>

          {result.unmatched && result.unmatched.length > 0 && (
            <div className="border border-orange-400/30 bg-orange-400/5 p-4 font-mono text-xs">
              <div className="mb-2 tracking-widest opacity-70">PAYMENTS FOR UNITS NOT ON THE RENT ROLL</div>
              {result.unmatched.map((u) => (
                <div key={u.unit}>
                  Unit {u.unit}: {money(u.amount, 2)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
