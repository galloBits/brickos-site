"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { btnCls, Field, inputCls } from "./ui";

const DEFAULT_TASKS = [
  "Schedule move-out inspection",
  "Document unit condition (photos + notes)",
  "Collect keys / change locks",
  "Deep clean",
  "Patch and paint walls",
  "Repair or replace flooring",
  "Check and service appliances",
  "Replace HVAC filter / service HVAC",
  "Pest check / treatment",
  "Final walkthrough",
  "Take listing photos",
  "List unit for rent",
];

type Task = { id: string; title: string; done: boolean; sort_order: number };
type Turnover = {
  id: string;
  property_label: string;
  unit: string | null;
  move_out_date: string | null;
  target_ready_date: string | null;
  turnover_tasks: Task[];
};

export function TurnoverCoordinator() {
  const supabase = useMemo(() => createClient(), []);
  const [turnovers, setTurnovers] = useState<Turnover[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState("");
  const [unit, setUnit] = useState("");
  const [moveOut, setMoveOut] = useState("");
  const [target, setTarget] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("turnovers")
      .select("*, turnover_tasks(*)")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else {
      setError(null);
      setTurnovers(
        (data as Turnover[]).map((t) => ({
          ...t,
          turnover_tasks: [...t.turnover_tasks].sort((a, b) => a.sort_order - b.sort_order),
        })),
      );
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return setError("Please sign in again.");

    const { data: turnover, error } = await supabase
      .from("turnovers")
      .insert({
        user_id: user.id,
        property_label: property,
        unit: unit || null,
        move_out_date: moveOut || null,
        target_ready_date: target || null,
      })
      .select("id")
      .single();
    if (error || !turnover) return setError(error?.message ?? "Could not create turnover");

    const { error: taskError } = await supabase
      .from("turnover_tasks")
      .insert(DEFAULT_TASKS.map((title, i) => ({ turnover_id: turnover.id, title, sort_order: i })));
    if (taskError) return setError(taskError.message);

    setUnit("");
    setMoveOut("");
    setTarget("");
    load();
  }

  async function toggle(task: Task) {
    const { error } = await supabase.from("turnover_tasks").update({ done: !task.done }).eq("id", task.id);
    if (error) return setError(error.message);
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("turnovers").delete().eq("id", id);
    if (error) return setError(error.message);
    load();
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-white/60 max-w-[600px]">
        Start a turnover when a tenant gives notice and work through a standard make-ready checklist so no step gets
        missed and the unit is back on the market as fast as possible.
      </p>

      <form onSubmit={create} className="grid md:grid-cols-5 gap-3 border border-white/10 p-4 bg-white/[0.02]">
        <Field label="PROPERTY *">
          <input required value={property} onChange={(e) => setProperty(e.target.value)} className={inputCls} />
        </Field>
        <Field label="UNIT">
          <input value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls} />
        </Field>
        <Field label="MOVE-OUT DATE">
          <input type="date" value={moveOut} onChange={(e) => setMoveOut(e.target.value)} className={inputCls} />
        </Field>
        <Field label="TARGET READY DATE">
          <input type="date" value={target} onChange={(e) => setTarget(e.target.value)} className={inputCls} />
        </Field>
        <div className="flex items-end">
          <button className={btnCls}>START TURNOVER</button>
        </div>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="space-y-4">
        {turnovers.length === 0 && !error && <p className="text-sm text-white/50">No active turnovers.</p>}
        {turnovers.map((t) => {
          const done = t.turnover_tasks.filter((x) => x.done).length;
          const total = t.turnover_tasks.length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          let dueLabel: string | null = null;
          if (t.target_ready_date) {
            const days = Math.round(
              (Date.parse(`${t.target_ready_date}T00:00:00`) - new Date().setHours(0, 0, 0, 0)) / 86400000,
            );
            dueLabel = days < 0 ? `${Math.abs(days)}d past target` : `${days}d to target`;
          }
          return (
            <div key={t.id} className="border border-white/10 p-4 bg-white/[0.02] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">
                    {t.property_label}
                    {t.unit ? ` #${t.unit}` : ""}
                  </div>
                  <div className="font-mono text-[11px] text-white/50 mt-1">
                    {t.move_out_date ? `Move-out ${new Date(`${t.move_out_date}T00:00:00`).toLocaleDateString()}` : ""}
                    {dueLabel ? ` · ${dueLabel}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-mono text-[11px] ${pct === 100 ? "text-green-400" : "text-accent"}`}>
                    {pct === 100 ? "READY TO LIST" : `${done}/${total} DONE`}
                  </span>
                  <button onClick={() => remove(t.id)} className="font-mono text-xs text-white/40 hover:text-red-400">
                    ✕
                  </button>
                </div>
              </div>
              <div className="h-1.5 bg-white/10">
                <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="grid md:grid-cols-2 gap-x-6 gap-y-1">
                {t.turnover_tasks.map((task) => (
                  <label key={task.id} className="flex items-center gap-2 font-mono text-xs py-1 cursor-pointer">
                    <input type="checkbox" checked={task.done} onChange={() => toggle(task)} />
                    <span className={task.done ? "line-through text-white/40" : ""}>{task.title}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
