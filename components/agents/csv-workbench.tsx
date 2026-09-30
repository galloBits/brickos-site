"use client";

import { useMemo, useState, type ReactNode } from "react";
import { parseTable } from "@/lib/csv";
import { ghostBtnCls, inputCls } from "./ui";

export type CsvField = { key: string; label: string; required?: boolean; aliases: string[] };

const MAX_ROWS = 20000;

function autoMap(fields: CsvField[], headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of fields) {
    const candidates = [f.key, ...f.aliases];
    const hit = headers.find((h) => candidates.includes(h)) ?? headers.find((h) => candidates.some((c) => h.includes(c)));
    if (hit) map[f.key] = hit;
  }
  return map;
}

// Paste/upload a CSV, map its columns onto the agent's fields, and hand the
// mapped rows to the agent's render function once every required field is mapped.
export function CsvWorkbench({
  intro,
  fields,
  sample,
  children,
}: {
  intro: ReactNode;
  fields: CsvField[];
  sample: string;
  children: (rows: Record<string, string>[]) => ReactNode;
}) {
  const [text, setText] = useState("");
  const [override, setOverride] = useState<Record<string, string>>({});

  const table = useMemo(() => (text.trim() ? parseTable(text) : null), [text]);
  const headers = table?.headers ?? [];
  const mapping = useMemo(() => ({ ...autoMap(fields, headers), ...override }), [fields, headers, override]);

  const missing = fields.filter((f) => f.required && !mapping[f.key]);
  const tooMany = (table?.rows.length ?? 0) > MAX_ROWS;

  const rows = useMemo(() => {
    if (!table || missing.length || tooMany) return [];
    return table.rows.map((r) => Object.fromEntries(fields.map((f) => [f.key, mapping[f.key] ? (r[mapping[f.key]] ?? "") : ""])));
  }, [table, missing.length, tooMany, fields, mapping]);

  function load(file: File | undefined) {
    if (!file) return;
    setOverride({});
    file.text().then(setText);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-sm text-white/60 max-w-[640px] space-y-2">{intro}</div>
        <button
          className={ghostBtnCls}
          onClick={() => {
            setOverride({});
            setText(sample);
          }}
        >
          LOAD SAMPLE DATA
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-widest opacity-60">PASTE CSV OR UPLOAD A FILE</span>
          <input type="file" accept=".csv,text/csv" onChange={(e) => load(e.target.files?.[0])} className="text-[10px] w-[180px]" />
        </div>
        <textarea
          rows={7}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-black border border-white/10 px-3 py-2 font-mono text-xs outline-none focus:border-accent/50"
        />
      </div>

      {table && headers.length > 0 && (
        <div className="border border-white/10 p-4 bg-white/[0.02]">
          <div className="font-mono text-[10px] tracking-widest opacity-60 mb-3">
            MATCH YOUR COLUMNS ({table.rows.length.toLocaleString()} ROWS)
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {fields.map((f) => (
              <label key={f.key} className="flex flex-col gap-1">
                <span className="font-mono text-[10px] tracking-widest opacity-60">
                  {f.label}
                  {f.required ? " *" : ""}
                </span>
                <select
                  value={mapping[f.key] ?? ""}
                  onChange={(e) => setOverride((cur) => ({ ...cur, [f.key]: e.target.value }))}
                  className={`${inputCls} ${f.required && !mapping[f.key] ? "border-red-400/60" : ""}`}
                >
                  <option value="">— not in file —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}

      {tooMany && <p className="text-red-400 text-sm">That file has more than {MAX_ROWS.toLocaleString()} rows. Split it and run each part separately.</p>}
      {table && missing.length > 0 && (
        <p className="text-orange-400 text-sm">Choose a column for: {missing.map((f) => f.label).join(", ")}.</p>
      )}

      {rows.length > 0 && children(rows)}
    </div>
  );
}

const SUFFIXES: Record<string, string> = {
  STREET: "ST",
  AVENUE: "AVE",
  ROAD: "RD",
  DRIVE: "DR",
  LANE: "LN",
  COURT: "CT",
  BOULEVARD: "BLVD",
  PLACE: "PL",
  CIRCLE: "CIR",
  PARKWAY: "PKWY",
  HIGHWAY: "HWY",
  TERRACE: "TER",
  TRAIL: "TRL",
  NORTH: "N",
  SOUTH: "S",
  EAST: "E",
  WEST: "W",
  APARTMENT: "APT",
  SUITE: "STE",
};

export function normalizeAddress(s: string): string {
  return s
    .toUpperCase()
    .replace(/[.,#]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => SUFFIXES[w] ?? w)
    .join(" ");
}

export function normalizeName(s: string): string {
  return s
    .toUpperCase()
    .replace(/L\.\s?L\.\s?C\.?/g, "LLC")
    .replace(/[.,]/g, " ")
    .replace(/\bINCORPORATED\b/g, "INC")
    .replace(/\bCORPORATION\b/g, "CORP")
    .replace(/\bCOMPANY\b/g, "CO")
    .replace(/\bLIMITED\b/g, "LTD")
    .replace(/\s+/g, " ")
    .trim();
}

export function ResultsTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  const shown = rows.slice(0, 500);
  return (
    <div className="border border-white/10 overflow-x-auto">
      <table className="w-full font-mono text-[11px]">
        <thead>
          <tr className="text-left text-white/50 border-b border-white/10">
            {headers.map((h) => (
              <th key={h} className="p-2 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={i} className="border-b border-white/5">
              {r.map((c, j) => (
                <td key={j} className="p-2 whitespace-nowrap">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > shown.length && (
        <div className="p-2 font-mono text-[11px] text-white/50">
          Showing first {shown.length} of {rows.length.toLocaleString()} — export CSV for all.
        </div>
      )}
    </div>
  );
}
