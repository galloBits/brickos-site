"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(searchParams.get("next") ?? "/dashboard");
  }

  return (
    <main className="mx-auto max-w-[420px] px-6 py-20">
      <h1 className="font-serif text-3xl mb-6">Log in</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-widest opacity-60">EMAIL</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-black border border-white/10 px-4 py-3 font-mono text-sm outline-none focus:border-accent/50"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-widest opacity-60">PASSWORD</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-black border border-white/10 px-4 py-3 font-mono text-sm outline-none focus:border-accent/50"
          />
        </label>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 text-black font-bold font-mono text-xs tracking-widest bg-accent hover:brightness-110 transition disabled:opacity-50"
        >
          {loading ? "LOGGING IN…" : "LOG IN →"}
        </button>
      </form>
      <p className="mt-6 text-sm text-white/60">
        New here?{" "}
        <a href="/signup" className="text-accent underline">
          Create an account
        </a>
      </p>
    </main>
  );
}
