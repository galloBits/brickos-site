import type { ReactNode } from "react";

export const inputCls =
  "w-full bg-black border border-white/10 px-3 py-2 font-mono text-xs outline-none focus:border-accent/50";

export const btnCls =
  "px-5 py-2.5 font-mono text-[11px] tracking-widest text-black font-bold bg-accent hover:brightness-110 transition disabled:opacity-50";

export const ghostBtnCls =
  "px-4 py-2 font-mono text-[11px] tracking-widest border border-white/15 hover:border-accent hover:text-accent transition disabled:opacity-50";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] tracking-widest opacity-60">{label}</span>
      {children}
    </label>
  );
}

export function ResultBox({ children }: { children: ReactNode }) {
  return <div className="border border-accent/30 bg-accent/5 p-6">{children}</div>;
}

export function money(n: number, digits = 0) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
