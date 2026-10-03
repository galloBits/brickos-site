"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addDays } from "@/lib/checklist-templates";
import { btnCls, Field, formatDate, inputCls } from "./ui";

const STAGES = ["new", "contacted", "negotiating", "offer_sent", "under_contract", "dead"] as const;
const INACTIVE = new Set(["under_contract", "dead"]);

type FollowUp = {
  id: string;
  lead_name: string;
  phone: string | null;
  email: string | null;
  property_label: string | null;
  stage: string;
  cadence_days: number;
  next_follow_up: string;
  last_contacted_at: string | null;
  notes: string | null;
};

function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function FollowUpClock() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<FollowUp[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [touchNote, setTouchNote] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    lead_name: "",
    phone: "",
    email: "",
    property_label: "",
    cadence_days: "7",
    next_follow_up: todayIso(),
  });

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("follow_ups").select("*").order("next_follow_up", { ascending: true });
    if (error) return setError(error.message);
    setError(null);
    setRows(data as FollowUp[]);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return setError("Please sign in again.");
    const { error } = await supabase.from("follow_ups").insert({
      user_id: user.id,
      lead_name: form.lead_name,
      phone: form.phone || null,
      email: form.email || null,
      property_label: form.property_label || null,
      cadence_days: Math.min(365, Math.max(1, Number(form.cadence_days) || 7)),
      next_follow_up: form.next_follow_up || todayIso(),
    });
    if (error) return setError(error.message);
    setForm({ ...form, lead_name: "", phone: "", email: "", property_label: "" });
    load();
  }

  async function logContact(row: FollowUp) {
    const note = touchNote[row.id]?.trim();
    const today = todayIso();
    const stamp = `${today}: ${note || "contacted"}`;
    const { error } = await supabase
      .from("follow_ups")
      .update({
        last_contacted_at: new Date().toISOString(),
        next_follow_up: addDays(today, row.cadence_days),
        stage: row.stage === "new" ? "contacted" : row.stage,
        notes: row.notes ? `${stamp}\n${row.notes}` : stamp,
      })
      .eq("id", row.id);
    if (error) return setError(error.message);
    setTouchNote((cur) => ({ ...cur, [row.id]: "" }));
    load();
  }

  async function update(id: string, patch: Partial<FollowUp>) {
    const { error } = await supabase.from("follow_ups").update(patch).eq("id", id);
    if (error) return setError(error.message);
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("follow_ups").delete().eq("id", id);
    if (error) return setError(error.message);
    load();
  }

  const today = todayIso();
  const active = rows.filter((r) => !INACTIVE.has(r.stage));
  const dueCount = active.filter((r) => r.next_follow_up <= today).length;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-8">
      <p className="text-sm text-white/60 max-w-[640px]">
        Keeps every seller lead on a follow-up cadence so none go cold. Log each contact and the next date is set
        automatically. You also get a daily email listing who&apos;s due.
      </p>

      <form onSubmit={add} className="grid md:grid-cols-4 gap-3 border border-white/10 p-4 bg-white/[0.02]">
        <Field label="LEAD NAME *">
          <input required value={form.lead_name} onChange={set("lead_name")} className={inputCls} />
        </Field>
        <Field label="PHONE">
          <input value={form.phone} onChange={set("phone")} className={inputCls} />
        </Field>
        <Field label="EMAIL">
          <input type="email" value={form.email} onChange={set("email")} className={inputCls} />
        </Field>
        <Field label="PROPERTY">
          <input value={form.property_label} onChange={set("property_label")} className={inputCls} />
        </Field>
        <Field label="FOLLOW UP EVERY (DAYS)">
          <input type="number" min={1} max={365} value={form.cadence_days} onChange={set("cadence_days")} className={inputCls} />
        </Field>
        <Field label="FIRST FOLLOW-UP">
          <input type="date" value={form.next_follow_up} onChange={set("next_follow_up")} className={inputCls} />
        </Field>
        <div className="flex items-end">
          <button className={btnCls}>ADD LEAD</button>
        </div>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {rows.length > 0 && (
        <div className="font-mono text-xs">
          <span className={dueCount ? "text-orange-400" : "text-green-400"}>{dueCount} due today or overdue</span>
          <span className="text-white/40"> · {active.length} active leads</span>
        </div>
      )}

      <div className="space-y-2">
        {rows.length === 0 && !error && <p className="text-sm text-white/50">No leads yet.</p>}
        {rows.map((r) => {
          const inactive = INACTIVE.has(r.stage);
          const overdue = !inactive && r.next_follow_up < today;
          const dueToday = !inactive && r.next_follow_up === today;
          return (
            <div key={r.id} className={`border p-4 bg-white/[0.02] space-y-3 ${inactive ? "border-white/5 opacity-60" : "border-white/10"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">
                    {r.lead_name}
                    {r.property_label && <span className="font-normal text-white/50"> — {r.property_label}</span>}
                  </div>
                  <div className="font-mono text-[11px] text-white/50 mt-1">
                    {[r.phone, r.email].filter(Boolean).join(" · ") || "no contact info"} · every {r.cadence_days}d
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!inactive && (
                    <span
                      className={`font-mono text-[11px] border px-2 py-1 ${
                        overdue ? "text-red-400 border-red-400/40" : dueToday ? "text-orange-400 border-orange-400/40" : "text-white/50 border-white/15"
                      }`}
                    >
                      {overdue ? "OVERDUE " : dueToday ? "DUE TODAY " : "NEXT "}
                      {formatDate(r.next_follow_up)}
                    </span>
                  )}
                  <select value={r.stage} onChange={(e) => update(r.id, { stage: e.target.value })} className={`${inputCls} max-w-[150px]`}>
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => remove(r.id)} className="font-mono text-xs text-white/40 hover:text-red-400">
                    ✕
                  </button>
                </div>
              </div>
              {!inactive && (
                <div className="flex gap-2">
                  <input
                    placeholder="What happened on this contact? (optional)"
                    value={touchNote[r.id] ?? ""}
                    onChange={(e) => setTouchNote((cur) => ({ ...cur, [r.id]: e.target.value }))}
                    className={inputCls}
                  />
                  <button onClick={() => logContact(r)} className="whitespace-nowrap font-mono text-[11px] text-accent hover:underline">
                    LOG CONTACT
                  </button>
                </div>
              )}
              {r.notes && (
                <pre className="whitespace-pre-wrap font-mono text-[11px] text-white/50 max-h-[120px] overflow-y-auto">{r.notes}</pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
