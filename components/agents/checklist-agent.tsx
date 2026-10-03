"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CHECKLIST_TEMPLATES, addDays } from "@/lib/checklist-templates";
import { btnCls, Field, formatDate, inputCls } from "./ui";

type Item = { id: string; title: string; done: boolean; due_date: string | null; sort_order: number };
type Checklist = { id: string; label: string; key_date: string | null; checklist_items: Item[] };

function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function ChecklistAgent({ slug }: { slug: string }) {
  const template = CHECKLIST_TEMPLATES[slug];
  const supabase = useMemo(() => createClient(), []);
  const [lists, setLists] = useState<Checklist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [keyDate, setKeyDate] = useState("");
  const [newItem, setNewItem] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("checklists")
      .select("id, label, key_date, checklist_items(*)")
      .eq("agent_slug", slug)
      .order("created_at", { ascending: false });
    if (error) return setError(error.message);
    setError(null);
    setLists(
      (data as Checklist[]).map((l) => ({
        ...l,
        checklist_items: [...l.checklist_items].sort((a, b) => a.sort_order - b.sort_order),
      })),
    );
  }, [supabase, slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return setError("Please sign in again.");

    const { data: list, error } = await supabase
      .from("checklists")
      .insert({ user_id: user.id, agent_slug: slug, label, key_date: keyDate || null })
      .select("id")
      .single();
    if (error || !list) return setError(error?.message ?? "Could not create checklist");

    const { error: itemsError } = await supabase.from("checklist_items").insert(
      template.items.map((it, i) => ({
        checklist_id: list.id,
        title: it.title,
        sort_order: i,
        due_date: keyDate && it.offsetDays !== undefined ? addDays(keyDate, it.offsetDays) : null,
      })),
    );
    if (itemsError) return setError(itemsError.message);

    setLabel("");
    setKeyDate("");
    load();
  }

  async function toggle(item: Item) {
    const { error } = await supabase.from("checklist_items").update({ done: !item.done }).eq("id", item.id);
    if (error) return setError(error.message);
    load();
  }

  async function addItem(list: Checklist) {
    const title = newItem[list.id]?.trim();
    if (!title) return;
    const nextOrder = list.checklist_items.reduce((m, i) => Math.max(m, i.sort_order), -1) + 1;
    const { error } = await supabase
      .from("checklist_items")
      .insert({ checklist_id: list.id, title, sort_order: nextOrder });
    if (error) return setError(error.message);
    setNewItem((cur) => ({ ...cur, [list.id]: "" }));
    load();
  }

  async function removeItem(id: string) {
    const { error } = await supabase.from("checklist_items").delete().eq("id", id);
    if (error) return setError(error.message);
    load();
  }

  async function removeList(id: string) {
    const { error } = await supabase.from("checklists").delete().eq("id", id);
    if (error) return setError(error.message);
    load();
  }

  if (!template) return null;
  const today = todayIso();

  return (
    <div className="space-y-8">
      <p className="text-sm text-white/60 max-w-[640px]">{template.intro}</p>

      <form onSubmit={create} className="grid md:grid-cols-3 gap-3 border border-white/10 p-4 bg-white/[0.02]">
        <Field label={`${template.labelName} *`}>
          <input required value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} />
        </Field>
        {template.keyDateLabel && (
          <Field label={template.keyDateLabel}>
            <input type="date" value={keyDate} onChange={(e) => setKeyDate(e.target.value)} className={inputCls} />
          </Field>
        )}
        <div className="flex items-end">
          <button className={btnCls}>{template.createButton}</button>
        </div>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="space-y-4">
        {lists.length === 0 && !error && <p className="text-sm text-white/50">Nothing started yet.</p>}
        {lists.map((list) => {
          const done = list.checklist_items.filter((i) => i.done).length;
          const total = list.checklist_items.length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const overdue = list.checklist_items.filter((i) => !i.done && i.due_date && i.due_date < today).length;
          return (
            <div key={list.id} className="border border-white/10 p-4 bg-white/[0.02] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">{list.label}</div>
                  {list.key_date && template.keyDateLabel && (
                    <div className="font-mono text-[11px] text-white/50 mt-1">
                      {template.keyDateLabel.toLowerCase()}: {formatDate(list.key_date)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {overdue > 0 && <span className="font-mono text-[11px] text-red-400">{overdue} OVERDUE</span>}
                  <span className={`font-mono text-[11px] ${pct === 100 ? "text-green-400" : "text-accent"}`}>
                    {done}/{total} DONE
                  </span>
                  <button onClick={() => removeList(list.id)} className="font-mono text-xs text-white/40 hover:text-red-400">
                    ✕
                  </button>
                </div>
              </div>
              <div className="h-1.5 bg-white/10">
                <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="space-y-1">
                {list.checklist_items.map((item) => {
                  const late = !item.done && item.due_date && item.due_date < today;
                  return (
                    <div key={item.id} className="group flex items-center gap-3 font-mono text-xs py-1">
                      <input type="checkbox" checked={item.done} onChange={() => toggle(item)} />
                      <span className={`flex-1 ${item.done ? "line-through text-white/40" : ""}`}>{item.title}</span>
                      {item.due_date && (
                        <span className={late ? "text-red-400" : "text-white/40"}>{formatDate(item.due_date)}</span>
                      )}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-white/0 group-hover:text-white/40 hover:!text-red-400"
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-1">
                <input
                  placeholder="Add an item"
                  value={newItem[list.id] ?? ""}
                  onChange={(e) => setNewItem((cur) => ({ ...cur, [list.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem(list);
                    }
                  }}
                  className={`${inputCls} max-w-[360px]`}
                />
                <button onClick={() => addItem(list)} className="font-mono text-[11px] text-accent hover:underline">
                  + Add
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
