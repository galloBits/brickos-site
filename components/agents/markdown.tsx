"use client";

import ReactMarkdown from "react-markdown";

// Renders AI output as formatted text instead of raw ** and ## symbols.
// react-markdown doesn't render raw HTML and strips unsafe URL schemes, so
// model output can't inject markup or javascript: links.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed text-white/90 space-y-3">
      <ReactMarkdown
        components={{
          h1: (p) => <h3 className="font-serif text-xl pt-2 text-white" {...p} />,
          h2: (p) => <h3 className="font-serif text-lg pt-2 text-white" {...p} />,
          h3: (p) => <h4 className="font-mono text-xs tracking-widest uppercase pt-2 text-accent" {...p} />,
          h4: (p) => <h4 className="font-mono text-xs tracking-widest uppercase pt-2 text-accent" {...p} />,
          p: (p) => <p {...p} />,
          ul: (p) => <ul className="list-disc pl-5 space-y-1" {...p} />,
          ol: (p) => <ol className="list-decimal pl-5 space-y-1" {...p} />,
          strong: (p) => <strong className="font-bold text-white" {...p} />,
          hr: () => <hr className="border-white/10" />,
          blockquote: (p) => <blockquote className="border-l-2 border-accent/40 pl-3 text-white/70" {...p} />,
          code: (p) => <code className="font-mono text-[12px] bg-white/10 px-1" {...p} />,
          a: (p) => <a className="text-accent underline" target="_blank" rel="noopener noreferrer" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
