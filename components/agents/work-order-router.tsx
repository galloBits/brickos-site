"use client";

import { useState } from "react";
import { btnCls, Field, inputCls } from "./ui";
import { PRIORITY_COLOR, TRADES, VendorPanel, useMaintenanceData } from "./maintenance-shared";

const STATUSES = ["open", "assigned", "dispatched", "in_progress", "done"];

export function WorkOrderRouter() {
  const { supabase, vendors, orders, error, setError, reload } = useMaintenanceData();
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({
    property_label: "",
    unit: "",
    title: "",
    description: "",
    trade: TRADES[0],
    priority: "normal",
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return setError("Please sign in again.");

    // Route to the first vendor on file for this trade.
    const match = vendors.find((v) => v.trade.toLowerCase() === form.trade.toLowerCase());
    const { error } = await supabase.from("work_orders").insert({
      user_id: user.id,
      property_label: form.property_label,
      unit: form.unit || null,
      title: form.title,
      description: form.description || null,
      trade: form.trade,
      priority: form.priority,
      vendor_id: match?.id ?? null,
      status: match ? "assigned" : "open",
    });
    if (error) return setError(error.message);

    setNotice(
      match
        ? `Routed to ${match.name} (${match.trade}).`
        : `No vendor on file for ${form.trade} — add one below, then assign it manually.`,
    );
    setForm((f) => ({ ...f, unit: "", title: "", description: "" }));
    reload();
  }

  async function update(id: string, patch: Record<string, unknown>) {
    const { error } = await supabase.from("work_orders").update(patch).eq("id", id);
    if (error) return setError(error.message);
    reload();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("work_orders").delete().eq("id", id);
    if (error) return setError(error.message);
    reload();
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-8">
      <p className="text-sm text-white/60 max-w-[600px]">
        Log a maintenance request and it&apos;s automatically routed to the vendor you have on file for that trade. To
        email the work order to the vendor, use Vendor Dispatcher.
      </p>

      <form onSubmit={create} className="grid md:grid-cols-3 gap-3 border border-white/10 p-4 bg-white/[0.02]">
        <Field label="PROPERTY *">
          <input required value={form.property_label} onChange={set("property_label")} className={inputCls} />
        </Field>
        <Field label="UNIT">
          <input value={form.unit} onChange={set("unit")} className={inputCls} />
        </Field>
        <Field label="ISSUE TITLE *">
          <input required value={form.title} onChange={set("title")} placeholder="e.g. Water heater leaking" className={inputCls} />
        </Field>
        <Field label="TRADE">
          <select value={form.trade} onChange={set("trade")} className={inputCls}>
            {TRADES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="PRIORITY">
          <select value={form.priority} onChange={set("priority")} className={inputCls}>
            <option value="low">low</option>
            <option value="normal">normal</option>
            <option value="urgent">urgent</option>
            <option value="emergency">emergency</option>
          </select>
        </Field>
        <div className="flex items-end">
          <button className={btnCls}>CREATE &amp; ROUTE</button>
        </div>
        <div className="md:col-span-3">
          <Field label="DETAILS">
            <textarea rows={2} value={form.description} onChange={set("description")} className={inputCls} />
          </Field>
        </div>
      </form>

      {notice && <p className="text-accent text-sm">{notice}</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="space-y-2">
        {orders.length === 0 && !error && <p className="text-sm text-white/50">No work orders yet.</p>}
        {orders.map((o) => (
          <div key={o.id} className="border border-white/10 p-4 bg-white/[0.02] space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold">{o.title}</div>
                <div className="font-mono text-[11px] text-white/50 mt-1">
                  {o.property_label}
                  {o.unit ? ` #${o.unit}` : ""} · {o.trade}
                </div>
                {o.description && <div className="text-xs text-white/60 mt-2">{o.description}</div>}
              </div>
              <span className={`font-mono text-[10px] border px-2 py-1 ${PRIORITY_COLOR[o.priority]}`}>
                {o.priority.toUpperCase()}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={o.vendor_id ?? ""}
                onChange={(e) =>
                  update(o.id, {
                    vendor_id: e.target.value || null,
                    status: e.target.value ? (o.status === "open" ? "assigned" : o.status) : "open",
                  })
                }
                className={`${inputCls} max-w-[220px]`}
              >
                <option value="">Unassigned</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.trade})
                  </option>
                ))}
              </select>
              <select value={o.status} onChange={(e) => update(o.id, { status: e.target.value })} className={`${inputCls} max-w-[160px]`}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
              <button onClick={() => remove(o.id)} className="font-mono text-xs text-white/40 hover:text-red-400 ml-auto">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <VendorPanel supabase={supabase} vendors={vendors} onChanged={reload} onError={setError} />
    </div>
  );
}
