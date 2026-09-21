"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto max-w-[420px] px-6 py-20">
      <h1 className="font-serif text-3xl mb-6">Create your account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-widest opacity-60">NAME</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="bg-black border border-white/10 px-4 py-3 font-mono text-sm outline-none focus:border-accent/50"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-widest opacity-60">EMAIL *</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-black border border-white/10 px-4 py-3 font-mono text-sm outline-none focus:border-accent/50"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-widest opacity-60">PASSWORD *</span>
          <input
            required
            minLength={8}
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
          {loading ? "CREATING ACCOUNT…" : "CREATE ACCOUNT →"}
        </button>
      </form>
      <p className="mt-6 text-sm text-white/60">
        Already a member?{" "}
        <a href="/login" className="text-accent underline">
          Log in
        </a>
      </p>
    </main>
  );
}
