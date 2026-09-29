"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { btnCls, Field, inputCls, money } from "./ui";

type Lease = {
  id: string;
  property_label: string;
  unit: string | null;
  tenant_name: string;
  tenant_email: string | null;
  lease_start: string | null;
  lease_end: string;
  monthly_rent: number | null;
  notes: string | null;
};

function daysUntil(dateStr: string) {
  const end = Date.parse(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end - today.getTime()) / 86400000);
}

function badge(days: number) {
  if (days < 0) return { text: `EXPIRED ${Math.abs(days)}d ago`, cls: "text-red-400 border-red-400/40" };
  if (days <= 30) return { text: `${days}d left`, cls: "text-red-400 border-red-400/40" };
  if (days <= 60) return { text: `${days}d left`, cls: "text-orange-400 border-orange-400/40" };
  if (days <= 90) return { text: `${days}d left`, cls: "text-yellow-300 border-yellow-300/40" };
  return { text: `${days}d left`, cls: "text-white/50 border-white/15" };
}

export function LeaseRenewalClock() {
  const supabase = useMemo(() => createClient(), []);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    property_label: "",
    unit: "",
    tenant_name: "",
    tenant_email: "",
    lease_start: "",
    lease_end: "",
    monthly_rent: "",
  });

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("leases").select("*").order("lease_end", { ascending: true });
    if (error) setError(error.message);
    else {
      setError(null);
      setLeases(data as Lease[]);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Please sign in again.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("leases").insert({
      user_id: user.id,
      property_label: form.property_label,
      unit: form.unit || null,
      tenant_name: form.tenant_name,
      tenant_email: form.tenant_email || null,
      lease_start: form.lease_start || null,
      lease_end: form.lease_end,
      monthly_rent: form.monthly_rent ? Number(form.monthly_rent) : null,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setForm({ property_label: form.property_label, unit: "", tenant_name: "", tenant_email: "", lease_start: "", lease_end: "", monthly_rent: "" });
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("leases").delete().eq("id", id);
    if (error) setError(error.message);
    else load();
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-8">
      <p className="text-sm text-white/60 max-w-[600px]">
        Track every lease end date. You&apos;ll get an email at your account address when a lease is 90, 60, and 30 days
        from expiring.
      </p>

      <form onSubmit={add} className="grid md:grid-cols-4 gap-3 border border-white/10 p-4 bg-white/[0.02]">
        <Field label="PROPERTY *">
          <input required value={form.property_label} onChange={set("property_label")} className={inputCls} />
        </Field>
        <Field label="UNIT">
          <input value={form.unit} onChange={set("unit")} className={inputCls} />
        </Field>
        <Field label="TENANT *">
          <input required value={form.tenant_name} onChange={set("tenant_name")} className={inputCls} />
        </Field>
        <Field label="TENANT EMAIL">
          <input type="email" value={form.tenant_email} onChange={set("tenant_email")} className={inputCls} />
        </Field>
        <Field label="LEASE START">
          <input type="date" value={form.lease_start} onChange={set("lease_start")} className={inputCls} />
        </Field>
        <Field label="LEASE END *">
          <input required type="date" value={form.lease_end} onChange={set("lease_end")} className={inputCls} />
        </Field>
        <Field label="MONTHLY RENT">
          <input type="number" value={form.monthly_rent} onChange={set("monthly_rent")} className={inputCls} />
        </Field>
        <div className="flex items-end">
          <button disabled={saving} className={btnCls}>
            {saving ? "SAVING…" : "ADD LEASE"}
          </button>
        </div>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="space-y-2">
        {leases.length === 0 && !error && <p className="text-sm text-white/50">No leases tracked yet.</p>}
        {leases.map((l) => {
          const b = badge(daysUntil(l.lease_end));
          return (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 border border-white/10 p-4 bg-white/[0.02]">
              <div>
                <div className="text-sm font-bold">
                  {l.tenant_name} <span className="font-normal text-white/50">— {l.property_label}{l.unit ? ` #${l.unit}` : ""}</span>
                </div>
                <div className="font-mono text-[11px] text-white/50 mt-1">
                  Ends {new Date(`${l.lease_end}T00:00:00`).toLocaleDateString()}
                  {l.monthly_rent ? ` · ${money(l.monthly_rent)}/mo` : ""}
                  {l.tenant_email ? ` · ${l.tenant_email}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`font-mono text-[11px] border px-2 py-1 ${b.cls}`}>{b.text}</span>
                <button onClick={() => remove(l.id)} className="font-mono text-xs text-white/40 hover:text-red-400">
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
