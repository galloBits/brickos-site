"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downloadCsv } from "@/lib/csv";
import { btnCls, Field, ghostBtnCls, inputCls, money } from "./ui";

const STATUSES = ["soft", "hard", "funded", "declined"] as const;

type Commitment = {
  id: string;
  investor_name: string;
  investor_email: string | null;
  committed_amount: number;
  funded_amount: number;
  status: string;
};
type Raise = { id: string; name: string; target_amount: number | null; commitments: Commitment[] };

const STATUS_COLOR: Record<string, string> = {
  soft: "text-yellow-300",
  hard: "text-blue-400",
  funded: "text-green-400",
  declined: "text-white/40",
};

export function FundraisingTracker() {
  const supabase = useMemo(() => createClient(), []);
  const [raises, setRaises] = useState<Raise[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [raiseName, setRaiseName] = useState("");
  const [target, setTarget] = useState("");
  const [inv, setInv] = useState({ investor_name: "", investor_email: "", committed_amount: "", status: "soft" });

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("raises")
      .select("id, name, target_amount, commitments(*)")
      .order("created_at", { ascending: false });
    if (error) return setError(error.message);
    setError(null);
    const list = (data as Raise[]).map((r) => ({
      ...r,
      target_amount: r.target_amount === null ? null : Number(r.target_amount),
      commitments: r.commitments.map((c) => ({
        ...c,
        committed_amount: Number(c.committed_amount),
        funded_amount: Number(c.funded_amount),
      })),
    }));
    setRaises(list);
    setSelected((cur) => (cur && list.some((r) => r.id === cur) ? cur : (list[0]?.id ?? null)));
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function createRaise(e: React.FormEvent) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return setError("Please sign in again.");
    const { data, error } = await supabase
      .from("raises")
      .insert({ user_id: user.id, name: raiseName, target_amount: target ? Number(target) : null })
      .select("id")
      .single();
    if (error) return setError(error.message);
    setRaiseName("");
    setTarget("");
    setSelected(data.id);
    load();
  }

  async function addCommitment(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const { error } = await supabase.from("commitments").insert({
      raise_id: selected,
      investor_name: inv.investor_name,
      investor_email: inv.investor_email || null,
      committed_amount: Number(inv.committed_amount) || 0,
      status: inv.status,
    });
    if (error) return setError(error.message);
    setInv({ investor_name: "", investor_email: "", committed_amount: "", status: "soft" });
    load();
  }

  async function updateCommitment(id: string, patch: Partial<Commitment>) {
    const { error } = await supabase.from("commitments").update(patch).eq("id", id);
    if (error) return setError(error.message);
    load();
  }

  async function removeCommitment(id: string) {
    const { error } = await supabase.from("commitments").delete().eq("id", id);
    if (error) return setError(error.message);
    load();
  }

  async function removeRaise(id: string) {
    const { error } = await supabase.from("raises").delete().eq("id", id);
    if (error) return setError(error.message);
    load();
  }

  const raise = raises.find((r) => r.id === selected);
  const live = raise?.commitments.filter((c) => c.status !== "declined") ?? [];
  const soft = live.filter((c) => c.status === "soft").reduce((s, c) => s + c.committed_amount, 0);
  const hard = live.filter((c) => c.status !== "soft").reduce((s, c) => s + c.committed_amount, 0);
  const funded = live.reduce((s, c) => s + c.funded_amount, 0);
  const targetAmt = raise?.target_amount ?? 0;
  const pct = (n: number) => (targetAmt ? Math.min(100, (n / targetAmt) * 100) : 0);

  return (
    <div className="space-y-8">
      <p className="text-sm text-white/60 max-w-[640px]">
        Tracks every investor&apos;s commitment for a raise, from soft circle to funded, against your target.
      </p>

      <form onSubmit={createRaise} className="grid md:grid-cols-3 gap-3 border border-white/10 p-4 bg-white/[0.02]">
        <Field label="NEW RAISE NAME *">
          <input required value={raiseName} onChange={(e) => setRaiseName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="TARGET AMOUNT">
          <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className={inputCls} />
        </Field>
        <div className="flex items-end">
          <button className={btnCls}>CREATE RAISE</button>
        </div>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {raises.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {raises.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className={`px-3 py-1.5 border font-mono text-[11px] ${r.id === selected ? "border-accent text-accent" : "border-white/10 text-white/60"}`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      {raise && (
        <div className="space-y-6">
          <div className="border border-accent/30 bg-accent/5 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-lg font-serif">{raise.name}</div>
              <div className="flex gap-3">
                <button
                  className={ghostBtnCls}
                  onClick={() =>
                    downloadCsv(
                      `${raise.name}-commitments.csv`,
                      ["Investor", "Email", "Status", "Committed", "Funded"],
                      raise.commitments.map((c) => [c.investor_name, c.investor_email ?? "", c.status, c.committed_amount, c.funded_amount]),
                    )
                  }
                >
                  EXPORT CSV
                </button>
                <button onClick={() => removeRaise(raise.id)} className="font-mono text-[11px] text-white/40 hover:text-red-400">
                  Delete raise
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4 font-mono text-xs">
              <div>
                <div className="opacity-60">TARGET</div>
                <div className="text-lg font-serif">{targetAmt ? money(targetAmt) : "—"}</div>
              </div>
              <div>
                <div className="opacity-60">SOFT CIRCLED</div>
                <div className="text-lg font-serif text-yellow-300">{money(soft)}</div>
              </div>
              <div>
                <div className="opacity-60">HARD COMMITTED</div>
                <div className="text-lg font-serif text-blue-400">{money(hard)}</div>
              </div>
              <div>
                <div className="opacity-60">FUNDED</div>
                <div className="text-lg font-serif text-green-400">{money(funded)}</div>
              </div>
            </div>
            {targetAmt > 0 && (
              <div className="space-y-1">
                <div className="h-2 bg-white/10 relative">
                  <div className="absolute inset-y-0 left-0 bg-yellow-300/40" style={{ width: `${pct(soft + hard)}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-blue-400/70" style={{ width: `${pct(hard)}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-green-400" style={{ width: `${pct(funded)}%` }} />
                </div>
                <div className="font-mono text-[11px] opacity-60">
                  {pct(funded).toFixed(0)}% funded · {pct(soft + hard).toFixed(0)}% including soft circles
                </div>
              </div>
            )}
          </div>

          <form onSubmit={addCommitment} className="grid md:grid-cols-5 gap-3">
            <Field label="INVESTOR *">
              <input required value={inv.investor_name} onChange={(e) => setInv({ ...inv, investor_name: e.target.value })} className={inputCls} />
            </Field>
            <Field label="EMAIL">
              <input type="email" value={inv.investor_email} onChange={(e) => setInv({ ...inv, investor_email: e.target.value })} className={inputCls} />
            </Field>
            <Field label="AMOUNT">
              <input type="number" value={inv.committed_amount} onChange={(e) => setInv({ ...inv, committed_amount: e.target.value })} className={inputCls} />
            </Field>
            <Field label="STATUS">
              <select value={inv.status} onChange={(e) => setInv({ ...inv, status: e.target.value })} className={inputCls}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <div className="flex items-end">
              <button className={btnCls}>ADD INVESTOR</button>
            </div>
          </form>

          <div className="border border-white/10 overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="text-left text-white/50 border-b border-white/10">
                  <th className="p-3">INVESTOR</th>
                  <th className="p-3">STATUS</th>
                  <th className="p-3 text-right">COMMITTED</th>
                  <th className="p-3 text-right">FUNDED</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {raise.commitments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-3 text-white/50">
                      No investors yet.
                    </td>
                  </tr>
                )}
                {raise.commitments.map((c) => (
                  <tr key={c.id} className="border-b border-white/5">
                    <td className="p-3">
                      {c.investor_name}
                      {c.investor_email && <div className="text-white/40">{c.investor_email}</div>}
                    </td>
                    <td className="p-3">
                      <select
                        value={c.status}
                        onChange={(e) => updateCommitment(c.id, { status: e.target.value })}
                        className={`${inputCls} max-w-[110px] ${STATUS_COLOR[c.status]}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-right">{money(c.committed_amount)}</td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        defaultValue={c.funded_amount}
                        onBlur={(e) => {
                          const v = Number(e.target.value) || 0;
                          if (v !== c.funded_amount) updateCommitment(c.id, { funded_amount: v });
                        }}
                        className={`${inputCls} max-w-[130px] text-right`}
                      />
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => removeCommitment(c.id)} className="text-white/40 hover:text-red-400">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
