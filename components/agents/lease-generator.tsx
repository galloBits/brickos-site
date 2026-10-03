"use client";

import { useState } from "react";
import { Field, formatDate, inputCls } from "./ui";

export function LeaseGenerator() {
  const [landlord, setLandlord] = useState("");
  const [tenant, setTenant] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [rent, setRent] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [graceDays, setGraceDays] = useState("5");
  const [lateFee, setLateFee] = useState("");
  const [deposit, setDeposit] = useState("");
  const [utilities, setUtilities] = useState("Tenant pays all utilities except water/sewer/trash, which Landlord pays.");
  const [pets, setPets] = useState("No pets without Landlord's prior written consent.");
  const [copied, setCopied] = useState(false);

  const lease = `RESIDENTIAL LEASE AGREEMENT

This Lease Agreement ("Lease") is made on ${formatDate(new Date())} between ${landlord || "[Landlord]"} ("Landlord") and ${tenant || "[Tenant]"} ("Tenant").

1. PREMISES. Landlord leases to Tenant the residential property located at ${address || "[Property Address]"} (the "Premises").

2. TERM. The lease term begins on ${start ? formatDate(start) : "[Start Date]"} and ends on ${end ? formatDate(end) : "[End Date]"}, unless renewed or terminated as provided in this Lease.

3. RENT. Tenant shall pay $${rent || "[Amount]"} per month, due on day ${dueDay || "[N]"} of each month, without demand or deduction.

4. LATE FEE. If rent is not received within ${graceDays || "[N]"} days after the due date, Tenant shall pay a late fee of $${lateFee || "[Amount]"}.

5. SECURITY DEPOSIT. Tenant shall pay a security deposit of $${deposit || "[Amount]"} before taking possession. The deposit will be held and returned, less lawful deductions for unpaid rent and damage beyond normal wear and tear, within the period required by ${state || "[State]"} law.

6. UTILITIES. ${utilities}

7. PETS. ${pets}

8. USE AND OCCUPANCY. The Premises shall be used solely as a private residence by the Tenant(s) named above. Tenant shall not sublet or assign this Lease without Landlord's written consent.

9. MAINTENANCE AND REPAIRS. Tenant shall keep the Premises clean and in good condition and promptly report needed repairs. Landlord shall maintain the structure and major systems in habitable condition as required by law.

10. ENTRY. Landlord may enter the Premises with reasonable advance notice as required by ${state || "[State]"} law, or immediately in an emergency.

11. DEFAULT. If Tenant fails to pay rent or otherwise breaches this Lease, Landlord may pursue the remedies available under ${state || "[State]"} law.

12. GOVERNING LAW. This Lease is governed by the laws of the State of ${state || "[State]"}.

Landlord: ______________________________   Date: ____________
Tenant:   ______________________________   Date: ____________

NOTICE: This is a general-purpose template, not legal advice. Residential lease requirements (required disclosures, deposit limits, late-fee caps, notice periods) vary by state and locality. Have a licensed attorney review before use.`;

  async function copy() {
    await navigator.clipboard.writeText(lease);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-3">
        <Field label="LANDLORD">
          <input value={landlord} onChange={(e) => setLandlord(e.target.value)} className={inputCls} />
        </Field>
        <Field label="TENANT(S)">
          <input value={tenant} onChange={(e) => setTenant(e.target.value)} className={inputCls} />
        </Field>
        <Field label="PROPERTY ADDRESS">
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
        </Field>
        <Field label="STATE">
          <input value={state} onChange={(e) => setState(e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="START DATE">
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
          </Field>
          <Field label="END DATE">
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="MONTHLY RENT">
            <input type="number" value={rent} onChange={(e) => setRent(e.target.value)} className={inputCls} />
          </Field>
          <Field label="RENT DUE DAY">
            <input type="number" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className={inputCls} />
          </Field>
          <Field label="GRACE DAYS">
            <input type="number" value={graceDays} onChange={(e) => setGraceDays(e.target.value)} className={inputCls} />
          </Field>
          <Field label="LATE FEE">
            <input type="number" value={lateFee} onChange={(e) => setLateFee(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="SECURITY DEPOSIT">
          <input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} className={inputCls} />
        </Field>
        <Field label="UTILITIES CLAUSE">
          <textarea rows={2} value={utilities} onChange={(e) => setUtilities(e.target.value)} className={inputCls} />
        </Field>
        <Field label="PETS CLAUSE">
          <textarea rows={2} value={pets} onChange={(e) => setPets(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] tracking-widest opacity-60">PREVIEW</span>
          <button onClick={copy} className="font-mono text-[11px] text-accent hover:underline">
            {copied ? "Copied ✓" : "Copy to clipboard"}
          </button>
        </div>
        <pre className="border border-white/10 bg-white/[0.02] p-4 text-[11px] leading-relaxed whitespace-pre-wrap font-mono text-white/80 max-h-[720px] overflow-y-auto">
          {lease}
        </pre>
      </div>
    </div>
  );
}
