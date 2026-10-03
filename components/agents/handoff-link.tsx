import Link from "next/link";
import type { ReactNode } from "react";
import { handoffUrl, type HandoffValue } from "@/lib/handoff";

export function HandoffLink({
  slug,
  params,
  children,
}: {
  slug: string;
  params: Record<string, HandoffValue>;
  children: ReactNode;
}) {
  return (
    <Link
      href={handoffUrl(slug, params)}
      className="inline-flex items-center px-3 py-1.5 border border-accent/40 text-accent font-mono text-[11px] tracking-wide hover:bg-accent/10 transition"
    >
      {children} →
    </Link>
  );
}
