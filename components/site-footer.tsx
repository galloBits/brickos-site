import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-[1280px] px-6 md:px-10 py-10 border-t border-white/[0.06] font-mono text-[11px] opacity-60 flex flex-wrap items-center justify-between gap-4">
      <span>© 2026 BrickOS is a TheCoopDAO company · hello@thecoopdao.xyz</span>
      <span className="flex gap-6">
        <Link href="/terms" className="hover:text-accent transition">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-accent transition">
          Privacy
        </Link>
      </span>
    </footer>
  );
}
