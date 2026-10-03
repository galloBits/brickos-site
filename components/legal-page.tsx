import Link from "next/link";

export type LegalSection = { title: string; body: string[] };

export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <main className="mx-auto max-w-[760px] px-6 md:px-10 py-16">
      <h1 className="font-serif text-4xl mb-2">{title}</h1>
      <p className="font-mono text-[11px] opacity-50 mb-8">Last updated: {updated}</p>
      <p className="text-sm leading-[1.7] text-white/70 mb-10">{intro}</p>
      <div className="space-y-8">
        {sections.map((s, i) => (
          <section key={s.title}>
            <h2 className="font-mono text-xs tracking-widest text-white mb-3">
              {i + 1}. {s.title.toUpperCase()}
            </h2>
            <div className="space-y-3 text-sm leading-[1.7] text-white/70">
              {s.body.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-12 text-sm text-white/50">
        Questions? Email{" "}
        <a href="mailto:hello@thecoopdao.xyz" className="text-accent underline">
          hello@thecoopdao.xyz
        </a>
        . See also our{" "}
        <Link href={title.startsWith("Terms") ? "/privacy" : "/terms"} className="text-accent underline">
          {title.startsWith("Terms") ? "Privacy Policy" : "Terms of Service"}
        </Link>
        .
      </p>
    </main>
  );
}
