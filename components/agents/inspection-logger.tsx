"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { btnCls, Field, formatDate, inputCls } from "./ui";

const AREAS = [
  "Exterior / grounds",
  "Roof",
  "Living room",
  "Kitchen",
  "Bathrooms",
  "Bedrooms",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Appliances",
  "Smoke / CO detectors",
];
const TYPES = ["Move-in", "Move-out", "Routine", "Annual", "Pre-listing", "Post-repair"];
const CONDITIONS = ["Good", "Fair", "Poor", "N/A"];

type Item = { area: string; condition: string; note: string };
type Inspection = {
  id: string;
  property_label: string;
  unit: string | null;
  inspection_type: string;
  inspected_on: string;
  inspector: string | null;
  overall_condition: string | null;
  items: Item[];
  notes: string | null;
};

const CONDITION_COLOR: Record<string, string> = {
  Good: "text-green-400",
  Fair: "text-yellow-300",
  Poor: "text-red-400",
  "N/A": "text-white/40",
};

const blankItems = (): Item[] => AREAS.map((area) => ({ area, condition: "Good", note: "" }));

export function InspectionLogger() {
  const supabase = useMemo(() => createClient(), []);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [property, setProperty] = useState("");
  const [unit, setUnit] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [inspector, setInspector] = useState("");
  const [items, setItems] = useState<Item[]>(blankItems());
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("inspections").select("*").order("inspected_on", { ascending: false });
    if (error) setError(error.message);
    else {
      setError(null);
      setInspections(data as Inspection[]);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  function updateItem(i: number, patch: Partial<Item>) {
    setItems((cur) => cur.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  const poorCount = items.filter((i) => i.condition === "Poor").length;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return setError("Please sign in again.");

    const overall = poorCount > 0 ? "Needs attention" : items.some((i) => i.condition === "Fair") ? "Fair" : "Good";
    const { error } = await supabase.from("inspections").insert({
      user_id: user.id,
      property_label: property,
      unit: unit || null,
      inspection_type: type,
      inspected_on: date,
      inspector: inspector || null,
      overall_condition: overall,
      items,
      notes: notes || null,
    });
    if (error) return setError(error.message);
    setUnit("");
    setNotes("");
    setItems(blankItems());
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("inspections").delete().eq("id", id);
    if (error) setError(error.message);
    else load();
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-white/60 max-w-[600px]">
        Record a structured inspection — each area rated, with notes — and keep a searchable history per property.
        (Photo attachments aren&apos;t supported yet.)
      </p>

      <form onSubmit={save} className="space-y-4 border border-white/10 p-4 bg-white/[0.02]">
        <div className="grid md:grid-cols-5 gap-3">
          <Field label="PROPERTY *">
            <input required value={property} onChange={(e) => setProperty(e.target.value)} className={inputCls} />
          </Field>
          <Field label="UNIT">
            <input value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls} />
          </Field>
          <Field label="TYPE">
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="DATE">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="INSPECTOR">
            <input value={inspector} onChange={(e) => setInspector(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={it.area} className="grid grid-cols-[160px_110px_1fr] gap-2 items-center">
              <span className="font-mono text-xs">{it.area}</span>
              <select value={it.condition} onChange={(e) => updateItem(i, { condition: e.target.value })} className={inputCls}>
                {CONDITIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input placeholder="Notes" value={it.note} onChange={(e) => updateItem(i, { note: e.target.value })} className={inputCls} />
            </div>
          ))}
        </div>

        <Field label="GENERAL NOTES">
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
        </Field>
        <button className={btnCls}>
          SAVE INSPECTION{poorCount > 0 ? ` (${poorCount} area${poorCount === 1 ? "" : "s"} poor)` : ""}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="space-y-2">
        {inspections.length === 0 && !error && <p className="text-sm text-white/50">No inspections logged yet.</p>}
        {inspections.map((ins) => {
          const poor = ins.items.filter((i) => i.condition === "Poor");
          return (
            <div key={ins.id} className="border border-white/10 bg-white/[0.02]">
              <div className="flex items-stretch">
              <button
                onClick={() => setOpen(open === ins.id ? null : ins.id)}
                className="flex-1 flex flex-wrap items-center justify-between gap-3 p-4 text-left"
              >
                <div>
                  <div className="text-sm font-bold">
                    {ins.property_label}
                    {ins.unit ? ` #${ins.unit}` : ""}{" "}
                    <span className="font-normal text-white/50">— {ins.inspection_type}</span>
                  </div>
                  <div className="font-mono text-[11px] text-white/50 mt-1">
                    {formatDate(ins.inspected_on)}
                    {ins.inspector ? ` · ${ins.inspector}` : ""}
                  </div>
                </div>
                <span className={`font-mono text-[11px] ${poor.length ? "text-red-400" : "text-green-400"}`}>
                  {poor.length ? `${poor.length} POOR` : ins.overall_condition?.toUpperCase()}
                </span>
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Delete the ${ins.inspection_type} inspection for ${ins.property_label}? This can't be undone.`)) remove(ins.id);
                }}
                className="px-4 font-mono text-xs text-white/40 hover:text-red-400 border-l border-white/10"
                aria-label="Delete inspection"
                title="Delete inspection"
              >
                ✕
              </button>
              </div>
              {open === ins.id && (
                <div className="border-t border-white/10 p-4 space-y-1">
                  {ins.items.map((it) => (
                    <div key={it.area} className="font-mono text-xs flex gap-3">
                      <span className="w-[160px] text-white/70">{it.area}</span>
                      <span className={`w-[50px] ${CONDITION_COLOR[it.condition]}`}>{it.condition}</span>
                      <span className="text-white/50">{it.note}</span>
                    </div>
                  ))}
                  {ins.notes && <p className="text-xs text-white/60 pt-2">{ins.notes}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
