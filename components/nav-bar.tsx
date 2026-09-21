import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/[0.08] bg-black/85">
      <div className="mx-auto max-w-[1280px] px-6 md:px-10 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center font-black text-sm text-black bg-accent">
            B
          </div>
          <div className="leading-none">
            <div className="font-bold tracking-tight text-[15px]">BrickOS</div>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-8 font-mono text-[11px] tracking-widest">
          <Link href="/#agents" className="opacity-70 hover:opacity-100 transition">
            Agents
          </Link>
          <Link href="/pricing" className="opacity-70 hover:opacity-100 transition">
            Pricing
          </Link>
          {user ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 border border-white/15 hover:border-accent hover:text-accent transition"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="opacity-70 hover:opacity-100 transition">
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 border border-white/15 hover:border-accent hover:text-accent transition"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
