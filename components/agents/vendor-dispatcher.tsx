"use client";

import { useState } from "react";
import { formatDateTime, ghostBtnCls } from "./ui";
import { PRIORITY_COLOR, VendorPanel, useMaintenanceData } from "./maintenance-shared";

export function VendorDispatcher() {
  const { supabase, vendors, orders, error, setError, reload } = useMaintenanceData();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function dispatch(workOrderId: string) {
    setBusyId(workOrderId);
    setNotice(null);
    setError("");
    try {
      const res = await fetch("/api/agents/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Dispatch failed");
      setNotice(`Sent to ${body.sentTo}. The vendor's reply will come to your account email.`);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dispatch failed");
    } finally {
      setBusyId(null);
    }
  }

  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const dispatchable = orders.filter((o) => o.vendor_id && o.status !== "done");

  return (
    <div className="space-y-8">
      <p className="text-sm text-white/60 max-w-[600px]">
        Emails assigned work orders to the vendor with the job details; their reply goes straight to your inbox. Create
        and assign work orders in Work Order Router.
      </p>

      {notice && <p className="text-accent text-sm">{notice}</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="space-y-2">
        <div className="font-mono text-[10px] tracking-widest opacity-60">ASSIGNED WORK ORDERS</div>
        {dispatchable.length === 0 && !error && (
          <p className="text-sm text-white/50">Nothing to dispatch — assign a vendor to a work order first.</p>
        )}
        {dispatchable.map((o) => {
          const vendor = o.vendor_id ? vendorById.get(o.vendor_id) : undefined;
          return (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 border border-white/10 p-4 bg-white/[0.02]">
              <div>
                <div className="text-sm font-bold">
                  {o.title}{" "}
                  <span className={`font-mono text-[10px] border px-1.5 py-0.5 ml-2 ${PRIORITY_COLOR[o.priority]}`}>
                    {o.priority.toUpperCase()}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-white/50 mt-1">
                  {o.property_label}
                  {o.unit ? ` #${o.unit}` : ""} → {vendor?.name ?? "?"}
                  {vendor?.email ? ` (${vendor.email})` : " (no email on file)"}
                </div>
                {o.dispatched_at && (
                  <div className="font-mono text-[10px] text-accent/80 mt-1">
                    Dispatched {formatDateTime(o.dispatched_at)}
                  </div>
                )}
              </div>
              <button
                disabled={busyId === o.id || !vendor?.email}
                onClick={() => dispatch(o.id)}
                className={ghostBtnCls}
              >
                {busyId === o.id ? "SENDING…" : o.dispatched_at ? "RE-SEND EMAIL" : "DISPATCH BY EMAIL"}
              </button>
            </div>
          );
        })}
      </div>

      <VendorPanel supabase={supabase} vendors={vendors} onChanged={reload} onError={setError} />
    </div>
  );
}
