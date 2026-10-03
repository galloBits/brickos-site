"use client";

import { useState } from "react";
import { downloadCsv, toNumber } from "@/lib/csv";
import { CsvWorkbench, normalizeAddress, normalizeName, ResultsTable, type CsvField } from "./csv-workbench";
import { SendLeadsButton, type Lead } from "./lead-actions";
import { ghostBtnCls, inputCls, money } from "./ui";

const LIST_SOURCE_NOTE =
  "Most county assessor and treasurer offices sell or publish these lists as CSV or Excel downloads; save as CSV and upload here. This tool doesn't pull data from county websites for you.";

// ------------------------------------------------------------ Absentee Mapper

const ABSENTEE_FIELDS: CsvField[] = [
  { key: "owner", label: "OWNER NAME", required: true, aliases: ["owner_name", "owner1", "owner_1", "name"] },
  { key: "property_address", label: "PROPERTY ADDRESS", required: true, aliases: ["situs_address", "site_address", "situs", "property_address", "address"] },
  { key: "property_state", label: "PROPERTY STATE", aliases: ["situs_state", "site_state", "property_state"] },
  { key: "mailing_address", label: "MAILING ADDRESS", required: true, aliases: ["mail_address", "mailing_address", "owner_address", "mailing"] },
  { key: "mailing_city", label: "MAILING CITY", aliases: ["mail_city", "mailing_city"] },
  { key: "mailing_state", label: "MAILING STATE", aliases: ["mail_state", "mailing_state"] },
];

const ABSENTEE_SAMPLE = `owner_name,situs_address,situs_state,mail_address,mail_city,mail_state
John Carter,412 Oak Street,AZ,412 Oak St,Phoenix,AZ
Maria Lopez,88 Pine Ave,AZ,1450 W Main St,Mesa,AZ
Sunbelt Homes LLC,1020 Cedar Dr,AZ,PO Box 3321,Dallas,TX
Robert Nguyen,77 Elm Ct,AZ,9 Harbor View Rd,San Diego,CA
Amy Patel,301 Birch Lane,AZ,301 Birch Ln,Phoenix,AZ`;

export function AbsenteeMapper() {
  const [outOfStateOnly, setOutOfStateOnly] = useState(false);
  return (
    <CsvWorkbench
      fields={ABSENTEE_FIELDS}
      sample={ABSENTEE_SAMPLE}
      intro={
        <>
          <p>Upload a county parcel list and find absentee owners: properties where the owner&apos;s mailing address differs from the property itself. Out-of-state owners are flagged when your file has state columns.</p>
          <p className="text-white/40">{LIST_SOURCE_NOTE}</p>
        </>
      }
    >
      {(rows) => {
        const results = rows
          .filter((r) => r.mailing_address.trim())
          .map((r) => {
            const absentee = normalizeAddress(r.property_address) !== normalizeAddress(r.mailing_address);
            const outOfState =
              !!r.property_state && !!r.mailing_state && r.property_state.trim().toUpperCase() !== r.mailing_state.trim().toUpperCase();
            return { r, absentee, outOfState };
          })
          .filter((x) => x.absentee && (!outOfStateOnly || x.outOfState));
        const table = results.map(({ r, outOfState }) => [
          r.owner,
          r.property_address,
          [r.mailing_address, r.mailing_city, r.mailing_state].filter(Boolean).join(", "),
          outOfState ? "YES" : "",
        ]);
        const headers = ["Owner", "Property", "Mailing address", "Out of state"];
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-mono text-xs">
                <span className="text-accent">{results.length.toLocaleString()}</span> absentee owners out of{" "}
                {rows.length.toLocaleString()} parcels
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 font-mono text-[11px]">
                  <input type="checkbox" checked={outOfStateOnly} onChange={(e) => setOutOfStateOnly(e.target.checked)} />
                  Out-of-state only
                </label>
                <button className={ghostBtnCls} onClick={() => downloadCsv("absentee-owners.csv", headers, table)}>
                  EXPORT CSV
                </button>
              </div>
            </div>
            <ResultsTable
              headers={headers}
              rows={table}
              leads={results.map(({ r, outOfState }): Lead => ({
                name: r.owner,
                property: r.property_address,
                notes: `Absentee owner${outOfState ? " (out of state)" : ""}. Mails to ${[r.mailing_address, r.mailing_city, r.mailing_state].filter(Boolean).join(", ")}.`,
              }))}
            />
          </div>
        );
      }}
    </CsvWorkbench>
  );
}

// ----------------------------------------------------- Tax Delinquent Hunter

const TAX_FIELDS: CsvField[] = [
  { key: "owner", label: "OWNER NAME", aliases: ["owner_name", "owner1", "name"] },
  { key: "property_address", label: "PROPERTY ADDRESS", required: true, aliases: ["situs_address", "site_address", "property_address", "address", "parcel"] },
  { key: "amount_due", label: "AMOUNT OWED", required: true, aliases: ["amount_due", "total_due", "taxes_due", "delinquent_amount", "balance", "amount"] },
  { key: "years", label: "YEARS DELINQUENT", aliases: ["years_delinquent", "years", "tax_years", "yrs"] },
  { key: "value", label: "ASSESSED / MARKET VALUE", aliases: ["assessed_value", "market_value", "total_value", "value"] },
];

const TAX_SAMPLE = `owner_name,property_address,amount_due,years_delinquent,assessed_value
Harold Simms,215 Walnut St,18450,4,142000
Green Acres Trust,900 County Rd 12,3200,1,310000
Linda Moss,56 Maple Ave,9875,3,98000
Dennis Park,1402 Grove St,650,1,176000
Estate of Ruth Kane,33 Willow Way,22300,5,121000`;

export function TaxDelinquentHunter() {
  const [minOwed, setMinOwed] = useState("0");
  const [minYears, setMinYears] = useState("0");
  const [sortBy, setSortBy] = useState<"score" | "amount" | "years" | "ratio">("score");
  return (
    <CsvWorkbench
      fields={TAX_FIELDS}
      sample={TAX_SAMPLE}
      intro={
        <>
          <p>Upload your county&apos;s delinquent tax list and rank the properties most likely to be motivated sellers: most years behind, largest balances, and highest debt relative to value.</p>
          <p className="text-white/40">{LIST_SOURCE_NOTE}</p>
        </>
      }
    >
      {(rows) => {
        const results = rows
          .map((r) => {
            const owed = toNumber(r.amount_due);
            const years = toNumber(r.years);
            const value = toNumber(r.value);
            const ratio = value > 0 ? owed / value : 0;
            // Years behind weighs most, then balance-to-value, then raw balance.
            const score = years * 10 + ratio * 100 + Math.log10(owed + 1);
            return { r, owed, years, value, ratio, score };
          })
          .filter((x) => x.owed >= (Number(minOwed) || 0) && x.years >= (Number(minYears) || 0))
          .sort((a, b) =>
            sortBy === "amount" ? b.owed - a.owed : sortBy === "years" ? b.years - a.years : sortBy === "ratio" ? b.ratio - a.ratio : b.score - a.score,
          );
        const headers = ["Owner", "Property", "Owed", "Years", "Value", "Owed / value"];
        const table = results.map((x) => [
          x.r.owner,
          x.r.property_address,
          money(x.owed),
          x.years || "",
          x.value ? money(x.value) : "",
          x.ratio ? `${(x.ratio * 100).toFixed(1)}%` : "",
        ]);
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] tracking-widest opacity-60">MIN OWED</span>
                <input type="number" value={minOwed} onChange={(e) => setMinOwed(e.target.value)} className={`${inputCls} w-[120px]`} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] tracking-widest opacity-60">MIN YEARS</span>
                <input type="number" value={minYears} onChange={(e) => setMinYears(e.target.value)} className={`${inputCls} w-[100px]`} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] tracking-widest opacity-60">SORT BY</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className={`${inputCls} w-[180px]`}>
                  <option value="score">Best opportunities</option>
                  <option value="years">Years delinquent</option>
                  <option value="amount">Amount owed</option>
                  <option value="ratio">Owed / value</option>
                </select>
              </label>
              <button
                className={ghostBtnCls}
                onClick={() =>
                  downloadCsv(
                    "tax-delinquent.csv",
                    ["Owner", "Property", "Owed", "Years", "Value", "Owed / value %"],
                    results.map((x) => [x.r.owner, x.r.property_address, x.owed, x.years, x.value, x.ratio ? (x.ratio * 100).toFixed(1) : ""]),
                  )
                }
              >
                EXPORT CSV
              </button>
            </div>
            <div className="font-mono text-xs">
              <span className="text-accent">{results.length.toLocaleString()}</span> of {rows.length.toLocaleString()} properties match
            </div>
            <ResultsTable
              headers={headers}
              rows={table}
              leads={results.map((x): Lead => ({
                name: x.r.owner,
                property: x.r.property_address,
                notes: `Tax delinquent: ${money(x.owed)} owed${x.years ? `, ${x.years} yr${x.years === 1 ? "" : "s"} behind` : ""}${x.value ? `, assessed ${money(x.value)}` : ""}.`,
              }))}
            />
          </div>
        );
      }}
    </CsvWorkbench>
  );
}

// -------------------------------------------------------- Portfolio Stalker

const PORTFOLIO_FIELDS: CsvField[] = [
  { key: "owner", label: "OWNER NAME", required: true, aliases: ["owner_name", "owner1", "name"] },
  { key: "property_address", label: "PROPERTY ADDRESS", required: true, aliases: ["situs_address", "site_address", "property_address", "address"] },
  { key: "mailing_address", label: "MAILING ADDRESS", aliases: ["mail_address", "mailing_address", "owner_address"] },
];

const PORTFOLIO_SAMPLE = `owner_name,situs_address,mail_address
Sunbelt Homes LLC,1020 Cedar Dr,PO Box 3321
Sunbelt Homes L.L.C.,44 Aspen Way,PO Box 3321
Sunbelt Homes LLC,812 Poplar St,PO Box 3321
Maria Lopez,88 Pine Ave,1450 W Main St
Maria Lopez,90 Pine Ave,1450 W Main St
Desert Rentals Inc,5 Mesa Blvd,PO Box 3321
Robert Nguyen,77 Elm Ct,9 Harbor View Rd`;

export function PortfolioStalker() {
  const [minCount, setMinCount] = useState("2");
  const [groupBy, setGroupBy] = useState<"owner" | "mailing">("owner");
  const [open, setOpen] = useState<string | null>(null);
  return (
    <CsvWorkbench
      fields={PORTFOLIO_FIELDS}
      sample={PORTFOLIO_SAMPLE}
      intro={
        <>
          <p>Upload a parcel list and find owners who hold multiple properties. Grouping by mailing address can also connect differently named entities run by the same person.</p>
          <p className="text-white/40">{LIST_SOURCE_NOTE}</p>
        </>
      }
    >
      {(rows) => {
        const groups = new Map<string, { names: Set<string>; properties: string[] }>();
        for (const r of rows) {
          const key = groupBy === "mailing" ? normalizeAddress(r.mailing_address) : normalizeName(r.owner);
          if (!key) continue;
          const g = groups.get(key) ?? { names: new Set<string>(), properties: [] };
          g.names.add(r.owner.trim());
          g.properties.push(r.property_address);
          groups.set(key, g);
        }
        const min = Math.max(2, Number(minCount) || 2);
        const results = Array.from(groups.entries())
          .filter(([, g]) => g.properties.length >= min)
          .sort((a, b) => b[1].properties.length - a[1].properties.length);
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] tracking-widest opacity-60">MIN PROPERTIES</span>
                <input type="number" min={2} value={minCount} onChange={(e) => setMinCount(e.target.value)} className={`${inputCls} w-[100px]`} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] tracking-widest opacity-60">GROUP BY</span>
                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as "owner" | "mailing")} className={`${inputCls} w-[180px]`}>
                  <option value="owner">Owner name</option>
                  <option value="mailing">Mailing address</option>
                </select>
              </label>
              <button
                className={ghostBtnCls}
                onClick={() =>
                  downloadCsv(
                    "portfolio-owners.csv",
                    ["Owner name(s)", "Group key", "Property count", "Properties"],
                    results.map(([key, g]) => [Array.from(g.names).join(" / "), key, g.properties.length, g.properties.join("; ")]),
                  )
                }
              >
                EXPORT CSV
              </button>
            </div>
            {groupBy === "mailing" && !rows.some((r) => r.mailing_address.trim()) && (
              <p className="text-orange-400 text-sm">Your file has no mailing address column mapped.</p>
            )}
            <div className="font-mono text-xs">
              <span className="text-accent">{results.length.toLocaleString()}</span> owners with {min}+ properties
            </div>
            <SendLeadsButton
              leads={results.map(([, g]): Lead => ({
                name: Array.from(g.names)[0] ?? "Unknown owner",
                property: `${g.properties[0]}${g.properties.length > 1 ? ` (+${g.properties.length - 1} more)` : ""}`,
                notes: `Owns ${g.properties.length} properties: ${g.properties.slice(0, 6).join("; ")}${g.properties.length > 6 ? "; …" : ""}.`,
              }))}
            />
            <div className="space-y-1">
              {results.slice(0, 300).map(([key, g]) => (
                <div key={key} className="border border-white/10 bg-white/[0.02]">
                  <button onClick={() => setOpen(open === key ? null : key)} className="w-full flex justify-between p-3 text-left font-mono text-xs">
                    <span>{Array.from(g.names).join(" / ")}</span>
                    <span className="text-accent">{g.properties.length} properties</span>
                  </button>
                  {open === key && (
                    <div className="border-t border-white/10 p-3 font-mono text-[11px] text-white/60 space-y-0.5">
                      {g.properties.map((p, i) => (
                        <div key={i}>{p}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }}
    </CsvWorkbench>
  );
}

// --------------------------------------------------- Pre-Foreclosure Radar

const PREFC_FIELDS: CsvField[] = [
  { key: "owner", label: "OWNER / BORROWER", aliases: ["owner_name", "borrower", "grantor", "owner", "name"] },
  { key: "property_address", label: "PROPERTY ADDRESS", required: true, aliases: ["property_address", "situs_address", "address"] },
  { key: "filing_type", label: "FILING TYPE", aliases: ["filing_type", "doc_type", "document_type", "type"] },
  { key: "filing_date", label: "FILING DATE", aliases: ["filing_date", "recording_date", "recorded", "date_filed"] },
  { key: "sale_date", label: "AUCTION / SALE DATE", aliases: ["sale_date", "auction_date", "trustee_sale_date", "sale"] },
  { key: "amount", label: "DEFAULT / LOAN AMOUNT", aliases: ["default_amount", "loan_balance", "judgment_amount", "unpaid_balance", "amount"] },
  { key: "value", label: "ESTIMATED VALUE", aliases: ["est_value", "estimated_value", "market_value", "assessed_value", "value"] },
];

function isoFromToday(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const PREFC_SAMPLE = `borrower,property_address,doc_type,recording_date,sale_date,unpaid_balance,est_value
Kevin Brooks,17 Juniper Rd,Notice of Trustee Sale,${isoFromToday(-40)},${isoFromToday(12)},186000,265000
Tanya Wells,450 Ridge Ave,Lis Pendens,${isoFromToday(-20)},,142000,150000
Marcus Hill,8 Canyon Ct,Notice of Default,${isoFromToday(-60)},${isoFromToday(45)},201000,340000
Grace Kim,1220 Vista Dr,Notice of Trustee Sale,${isoFromToday(-70)},${isoFromToday(-3)},99000,210000`;

function daysUntil(dateStr: string): number | null {
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function PreForeclosureRadar() {
  const [hidePast, setHidePast] = useState(true);
  return (
    <CsvWorkbench
      fields={PREFC_FIELDS}
      sample={PREFC_SAMPLE}
      intro={
        <>
          <p>Upload a list of pre-foreclosure filings (notices of default, lis pendens, trustee sale notices) and see them ordered by how soon the auction is, with estimated equity where your file has both value and balance.</p>
          <p className="text-white/40">These notices are recorded with the county recorder or court clerk; many counties and list vendors export them as CSV. This tool doesn&apos;t monitor new filings for you.</p>
        </>
      }
    >
      {(rows) => {
        const results = rows
          .map((r) => {
            const days = r.sale_date ? daysUntil(r.sale_date) : null;
            const amount = toNumber(r.amount);
            const value = toNumber(r.value);
            return { r, days, amount, value, equity: amount && value ? value - amount : null };
          })
          .filter((x) => !(hidePast && x.days !== null && x.days < 0))
          .sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity));
        const urgent = results.filter((x) => x.days !== null && x.days >= 0 && x.days <= 30).length;
        const headers = ["Owner", "Property", "Filing", "Auction", "Days left", "Balance", "Value", "Value − balance"];
        const table = results.map((x) => [
          x.r.owner,
          x.r.property_address,
          x.r.filing_type,
          x.r.sale_date,
          x.days === null ? "" : x.days,
          x.amount ? money(x.amount) : "",
          x.value ? money(x.value) : "",
          x.equity === null ? "" : money(x.equity),
        ]);
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-mono text-xs">
                <span className="text-red-400">{urgent}</span> auctions within 30 days · {results.length.toLocaleString()} filings shown
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 font-mono text-[11px]">
                  <input type="checkbox" checked={hidePast} onChange={(e) => setHidePast(e.target.checked)} />
                  Hide past auctions
                </label>
                <button
                  className={ghostBtnCls}
                  onClick={() =>
                    downloadCsv(
                      "pre-foreclosures.csv",
                      headers,
                      results.map((x) => [x.r.owner, x.r.property_address, x.r.filing_type, x.r.sale_date, x.days ?? "", x.amount, x.value, x.equity ?? ""]),
                    )
                  }
                >
                  EXPORT CSV
                </button>
              </div>
            </div>
            <p className="font-mono text-[11px] text-white/40">
              &quot;Value − balance&quot; is only a real equity estimate if your balance column is the full loan balance, not just the amount in arrears.
            </p>
            <ResultsTable
              headers={headers}
              rows={table}
              leads={results.map((x): Lead => ({
                name: x.r.owner,
                property: x.r.property_address,
                notes: `Pre-foreclosure${x.r.filing_type ? ` (${x.r.filing_type})` : ""}${x.r.sale_date ? `, auction ${x.r.sale_date}` : ""}${x.amount ? `, balance ${money(x.amount)}` : ""}.`,
              }))}
            />
          </div>
        );
      }}
    </CsvWorkbench>
  );
}

// ------------------------------------------------------------ LLC Unmasker

const LLC_FIELDS: CsvField[] = [
  { key: "owner", label: "OWNER NAME", required: true, aliases: ["owner_name", "owner1", "name"] },
  { key: "property_address", label: "PROPERTY ADDRESS", required: true, aliases: ["situs_address", "site_address", "property_address", "address"] },
  { key: "mailing_address", label: "MAILING ADDRESS", aliases: ["mail_address", "mailing_address", "owner_address"] },
  { key: "state", label: "STATE OF REGISTRATION (if known)", aliases: ["state", "mail_state", "situs_state"] },
];

const ENTITY_TYPES: [RegExp, string][] = [
  [/\b(LLC|PLLC|L L C)\b/, "LLC"],
  [/\b(INC|CORP|CO|LTD)\b/, "Corporation"],
  [/\b(LP|LLP|LLLP|PARTNERS|PARTNERSHIP)\b/, "Partnership"],
  [/\b(TRUST|TRUSTEE|TR)\b/, "Trust"],
  [/\b(HOLDINGS|PROPERTIES|INVESTMENTS|GROUP|VENTURES|CAPITAL|REALTY|ENTERPRISES|ASSOCIATES|FUND)\b/, "Other entity"],
];

function entityType(name: string): string | null {
  const n = normalizeName(name);
  for (const [re, type] of ENTITY_TYPES) if (re.test(n)) return type;
  return null;
}

function lookupUrl(name: string, state: string) {
  const q = encodeURIComponent(name.trim());
  const st = state.trim().toLowerCase();
  return /^[a-z]{2}$/.test(st)
    ? `https://opencorporates.com/companies?q=${q}&jurisdiction_code=us_${st}`
    : `https://opencorporates.com/companies?q=${q}`;
}

const LLC_SAMPLE = `owner_name,situs_address,mail_address,mail_state
Sunbelt Homes LLC,1020 Cedar Dr,PO Box 3321,TX
Sunbelt Homes L.L.C.,44 Aspen Way,PO Box 3321,TX
Desert Rentals Inc,5 Mesa Blvd,PO Box 3321,TX
Kane Family Trust,33 Willow Way,33 Willow Way,AZ
Maria Lopez,88 Pine Ave,1450 W Main St,AZ
Copper Ridge Holdings LP,700 Summit Rd,12 Commerce Pkwy,DE`;

export function LlcUnmasker() {
  const [type, setType] = useState("all");
  return (
    <CsvWorkbench
      fields={LLC_FIELDS}
      sample={LLC_SAMPLE}
      intro={
        <>
          <p>Upload a parcel list to find properties held by LLCs, corporations, partnerships and trusts. It groups entities that share a mailing address (often the same principal) and gives you a business-registry lookup link for each entity.</p>
          <p className="text-white/40">
            It does not automatically identify the person behind an LLC. That needs the state registry filing (via the lookup link) or a paid skip-tracing data provider.
          </p>
        </>
      }
    >
      {(rows) => {
        const entities = new Map<string, { name: string; type: string; state: string; mailing: Set<string>; properties: string[] }>();
        for (const r of rows) {
          const t = entityType(r.owner);
          if (!t) continue;
          const key = normalizeName(r.owner);
          const e = entities.get(key) ?? { name: r.owner.trim(), type: t, state: r.state, mailing: new Set<string>(), properties: [] };
          if (r.mailing_address.trim()) e.mailing.add(normalizeAddress(r.mailing_address));
          e.properties.push(r.property_address);
          entities.set(key, e);
        }

        const byMailing = new Map<string, string[]>();
        entities.forEach((e) =>
          e.mailing.forEach((m) => {
            const list = byMailing.get(m) ?? [];
            list.push(e.name);
            byMailing.set(m, list);
          }),
        );
        const linked = Array.from(byMailing.entries()).filter(([, names]) => names.length > 1);

        const list = Array.from(entities.values())
          .filter((e) => type === "all" || e.type === type)
          .sort((a, b) => b.properties.length - a.properties.length);

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="font-mono text-xs">
                <span className="text-accent">{entities.size.toLocaleString()}</span> entity owners across {rows.length.toLocaleString()} parcels
              </div>
              <div className="flex items-end gap-4">
                <select value={type} onChange={(e) => setType(e.target.value)} className={`${inputCls} w-[160px]`}>
                  <option value="all">All entity types</option>
                  {ENTITY_TYPES.map(([, t]) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <button
                  className={ghostBtnCls}
                  onClick={() =>
                    downloadCsv(
                      "entity-owners.csv",
                      ["Entity", "Type", "Property count", "Properties", "Mailing addresses", "Lookup"],
                      list.map((e) => [e.name, e.type, e.properties.length, e.properties.join("; "), Array.from(e.mailing).join("; "), lookupUrl(e.name, e.state)]),
                    )
                  }
                >
                  EXPORT CSV
                </button>
              </div>
            </div>

            {linked.length > 0 && (
              <div className="border border-accent/30 bg-accent/5 p-4 font-mono text-[11px] space-y-1">
                <div className="tracking-widest opacity-60 mb-1">ENTITIES SHARING A MAILING ADDRESS</div>
                {linked.map(([mail, names]) => (
                  <div key={mail}>
                    <span className="text-accent">{mail}</span>: {names.join(", ")}
                  </div>
                ))}
              </div>
            )}

            <SendLeadsButton
              leads={list.map((e): Lead => ({
                name: e.name,
                property: `${e.properties[0]}${e.properties.length > 1 ? ` (+${e.properties.length - 1} more)` : ""}`,
                notes: `${e.type}-owned (${e.properties.length} propert${e.properties.length === 1 ? "y" : "ies"}). Owner behind the entity not yet identified.`,
              }))}
            />
            <div className="border border-white/10 overflow-x-auto">
              <table className="w-full font-mono text-[11px]">
                <thead>
                  <tr className="text-left text-white/50 border-b border-white/10">
                    <th className="p-2">ENTITY</th>
                    <th className="p-2">TYPE</th>
                    <th className="p-2 text-right">PROPERTIES</th>
                    <th className="p-2">LOOKUP</th>
                  </tr>
                </thead>
                <tbody>
                  {list.slice(0, 500).map((e) => (
                    <tr key={e.name} className="border-b border-white/5">
                      <td className="p-2">{e.name}</td>
                      <td className="p-2 text-white/60">{e.type}</td>
                      <td className="p-2 text-right">{e.properties.length}</td>
                      <td className="p-2">
                        <a href={lookupUrl(e.name, e.state)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                          Search registry ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }}
    </CsvWorkbench>
  );
}
