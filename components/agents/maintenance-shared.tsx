"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { btnCls, Field, inputCls } from "./ui";

export const TRADES = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "General repair",
  "Appliance",
  "Roofing",
  "Pest control",
  "Landscaping",
  "Locksmith",
  "Cleaning",
  "Painting",
  "Other",
];

export type Vendor = { id: string; name: string; trade: string; email: string | null; phone: string | null };

export type WorkOrder = {
  id: string;
  property_label: string;
  unit: string | null;
  title: string;
  description: string | null;
  trade: string;
  priority: string;
  status: string;
  vendor_id: string | null;
  dispatched_at: string | null;
  created_at: string;
};

export const PRIORITY_COLOR: Record<string, string> = {
  low: "text-white/50 border-white/15",
  normal: "text-white/70 border-white/20",
  urgent: "text-orange-400 border-orange-400/40",
  emergency: "text-red-400 border-red-400/40",
};

export function useMaintenanceData() {
  const supabase = useMemo(() => createClient(), []);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [v, o] = await Promise.all([
      supabase.from("vendors").select("*").order("created_at", { ascending: true }),
      supabase.from("work_orders").select("*").order("created_at", { ascending: false }),
    ]);
    const err = v.error ?? o.error;
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setVendors(v.data as Vendor[]);
    setOrders(o.data as WorkOrder[]);
  }, [supabase]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { supabase, vendors, orders, error, setError, reload };
}

export function VendorPanel({
  supabase,
  vendors,
  onChanged,
  onError,
}: {
  supabase: ReturnType<typeof createClient>;
  vendors: Vendor[];
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [trade, setTrade] = useState(TRADES[0]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return onError("Please sign in again.");
    const { error } = await supabase
      .from("vendors")
      .insert({ user_id: user.id, name, trade, email: email || null, phone: phone || null });
    if (error) return onError(error.message);
    setName("");
    setEmail("");
    setPhone("");
    onChanged();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("vendors").delete().eq("id", id);
    if (error) return onError(error.message);
    onChanged();
  }

  return (
    <div className="border border-white/10 p-4 bg-white/[0.02] space-y-4">
      <div className="font-mono text-[10px] tracking-widest opacity-60">YOUR VENDORS</div>
      <form onSubmit={add} className="grid md:grid-cols-5 gap-3">
        <Field label="NAME *">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="TRADE">
          <select value={trade} onChange={(e) => setTrade(e.target.value)} className={inputCls}>
            {TRADES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="EMAIL">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </Field>
        <Field label="PHONE">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </Field>
        <div className="flex items-end">
          <button className={btnCls}>ADD VENDOR</button>
        </div>
      </form>
      <div className="space-y-1">
        {vendors.length === 0 && <p className="text-xs text-white/50">No vendors yet — add at least one per trade you use.</p>}
        {vendors.map((v) => (
          <div key={v.id} className="flex items-center justify-between font-mono text-xs py-1 border-b border-white/5">
            <span>
              {v.name} <span className="text-white/40">· {v.trade}</span>
              {v.email && <span className="text-white/40"> · {v.email}</span>}
              {v.phone && <span className="text-white/40"> · {v.phone}</span>}
            </span>
            <button onClick={() => remove(v.id)} className="text-white/40 hover:text-red-400">
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
