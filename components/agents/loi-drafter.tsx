"use client";

import { useState } from "react";

export function LoiDrafter() {
  const [buyer, setBuyer] = useState("");
  const [seller, setSeller] = useState("");
  const [address, setAddress] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [earnestMoney, setEarnestMoney] = useState("");
  const [closingDays, setClosingDays] = useState("30");
  const [contingencies, setContingencies] = useState("Inspection, clear title, financing");
  const [copied, setCopied] = useState(false);

  const letter = `LETTER OF INTENT

Date: ${new Date().toLocaleDateString()}

Buyer: ${buyer || "[Buyer Name]"}
Seller: ${seller || "[Seller Name]"}
Property: ${address || "[Property Address]"}

This Letter of Intent outlines the preliminary terms under which Buyer proposes to purchase the above property. This is not a binding contract; a formal Purchase and Sale Agreement will follow if terms are accepted.

1. PURCHASE PRICE: $${offerPrice || "[Amount]"}
2. EARNEST MONEY DEPOSIT: $${earnestMoney || "[Amount]"}, to be deposited with an escrow/title company within 3 business days of acceptance.
3. CLOSING: Within ${closingDays || "[N]"} days of acceptance of this offer.
4. CONTINGENCIES: ${contingencies || "None stated"}.
5. This offer is subject to review and revision by both parties' legal counsel prior to execution of a binding agreement.

Buyer: ____________________________          Date: __________
Seller: ___________________________          Date: __________

This document is a template generated for discussion purposes only and does not constitute legal advice. Have a licensed attorney review before use.`;

  async function copyLetter() {
    await navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-4">
        {[
          { label: "BUYER NAME", value: buyer, set: setBuyer },
          { label: "SELLER NAME", value: seller, set: setSeller },
          { label: "PROPERTY ADDRESS", value: address, set: setAddress },
          { label: "OFFER PRICE", value: offerPrice, set: setOfferPrice },
          { label: "EARNEST MONEY", value: earnestMoney, set: setEarnestMoney },
          { label: "CLOSING (DAYS)", value: closingDays, set: setClosingDays },
        ].map((f) => (
          <label key={f.label} className="flex flex-col gap-2">
            <span className="font-mono text-[10px] tracking-widest opacity-60">{f.label}</span>
            <input
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              className="bg-black border border-white/10 px-4 py-2.5 font-mono text-sm outline-none focus:border-accent/50"
            />
          </label>
        ))}
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-widest opacity-60">CONTINGENCIES</span>
          <textarea
            value={contingencies}
            onChange={(e) => setContingencies(e.target.value)}
            rows={3}
            className="bg-black border border-white/10 px-4 py-2.5 font-mono text-sm outline-none focus:border-accent/50 resize-none"
          />
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] tracking-widest opacity-60">PREVIEW</span>
          <button onClick={copyLetter} className="font-mono text-[11px] text-accent hover:underline">
            {copied ? "Copied ✓" : "Copy to clipboard"}
          </button>
        </div>
        <pre className="border border-white/10 bg-white/[0.02] p-4 text-[11px] leading-relaxed whitespace-pre-wrap font-mono text-white/80 max-h-[600px] overflow-y-auto">
          {letter}
        </pre>
      </div>
    </div>
  );
}
