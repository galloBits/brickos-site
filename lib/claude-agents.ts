import "server-only";
import type { Effort } from "@/lib/anthropic";

// Config for every "fill in a form, get a Claude-written result" agent.
// System prompts live here (server-only); the workflow page passes only the
// field definitions and copy to the client form.

export type AgentField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  required?: boolean;
  max: number;
  rows?: number;
  placeholder?: string;
  options?: string[];
};

export type ClaudeAgentConfig = {
  intro: string;
  button: string;
  resultTitle: string;
  fields: AgentField[];
  effort: Effort;
  system: string;
  buildUser: (v: Record<string, string>) => string;
};

export type ClaudeAgentClientProps = Pick<ClaudeAgentConfig, "intro" | "button" | "resultTitle" | "fields">;

const DOC = 15000;
const LONG = 4000;
const SHORT = 300;

const val = (v: Record<string, string>, key: string) => v[key]?.trim() || "(not provided)";

const NO_INVENTION =
  "Only use facts and numbers the user supplied. Never invent figures, names, dates, or legal conclusions; if something needed is missing, say so and mark it as a placeholder in [brackets].";

export const CLAUDE_AGENTS: Record<string, ClaudeAgentConfig> = {
  "probate-parser": {
    intro:
      "Paste the text of a probate filing (petition, letters of administration, notice to creditors) and get the key facts pulled into a structured summary. It reads only what you paste; it doesn't search court records.",
    button: "PARSE FILING →",
    resultTitle: "PROBATE SUMMARY",
    effort: "medium",
    fields: [
      { key: "filing", label: "FILING TEXT", type: "textarea", required: true, max: DOC, rows: 12 },
    ],
    system: `You extract structured facts from probate court filings for a real estate investor. ${NO_INVENTION}
Output these sections, writing "Not stated" for anything absent:
1. Case — case number, court, filing date
2. Decedent — name, date of death, last known address
3. Personal representative / executor — name, address, phone if present
4. Attorney of record — name, firm, contact
5. Real property listed — addresses, parcel numbers, any values stated
6. Heirs / beneficiaries named
7. Key dates — hearings, creditor-claim deadline
8. Outreach notes — who the appropriate contact is, and a reminder to be respectful of a grieving family and to check state rules on contacting a personal representative.`,
    buildUser: (v) => v.filing,
  },

  "cold-call-script-gen": {
    intro: "Generates a cold-call script tailored to the lead type and your angle. It writes the script; it doesn't place calls.",
    button: "WRITE SCRIPT →",
    resultTitle: "CALL SCRIPT",
    effort: "low",
    fields: [
      {
        key: "leadType",
        label: "LEAD TYPE",
        type: "select",
        required: true,
        max: SHORT,
        options: [
          "Absentee owner",
          "Tax delinquent",
          "Pre-foreclosure",
          "Probate / inherited",
          "Tired landlord",
          "Expired listing",
          "Vacant property",
          "Other",
        ],
      },
      { key: "company", label: "YOUR NAME / COMPANY", type: "text", max: SHORT },
      { key: "property", label: "PROPERTY DETAILS (optional)", type: "textarea", max: LONG, rows: 3 },
      { key: "angle", label: "YOUR OFFER ANGLE", type: "textarea", max: LONG, rows: 3, placeholder: "e.g. cash, as-is, close in 14 days, we cover closing costs" },
      { key: "tone", label: "TONE", type: "select", max: SHORT, options: ["Friendly", "Direct", "Empathetic"] },
    ],
    system: `You write cold-call scripts for real estate investors contacting property owners. ${NO_INVENTION}
Structure: opener (identify yourself and your company honestly), permission to continue, 4-6 discovery questions about condition/timeline/motivation, a response for "not interested" that respects a no, and a close toward a concrete next step. Keep lines short and natural to say out loud. Never use deceptive claims, false urgency, or pressure tactics.
End with a brief compliance reminder: scrub numbers against the National Do Not Call Registry and any state lists, honor opt-out requests immediately, and don't use an autodialer or prerecorded messages without prior express consent (TCPA).`,
    buildUser: (v) =>
      `Lead type: ${val(v, "leadType")}\nCaller / company: ${val(v, "company")}\nProperty: ${val(v, "property")}\nOffer angle: ${val(v, "angle")}\nTone: ${val(v, "tone")}`,
  },

  "objection-handler": {
    intro: "Type the seller's objection and get a few honest ways to respond, plus a follow-up question to keep the conversation going.",
    button: "HANDLE OBJECTION →",
    resultTitle: "RESPONSES",
    effort: "low",
    fields: [
      { key: "objection", label: "WHAT THE SELLER SAID", type: "textarea", required: true, max: LONG, rows: 3, placeholder: "e.g. Your offer is way too low, Zillow says it's worth $300k" },
      { key: "context", label: "CONTEXT (optional)", type: "textarea", max: LONG, rows: 3, placeholder: "Property, your offer, what you know about their situation" },
    ],
    system: `You coach real estate acquisition reps on handling seller objections. ${NO_INVENTION}
Give 3 response options with different approaches (empathize, reframe with facts, direct and transparent). Each should be 1-3 sentences a person could say naturally, followed by one open-ended follow-up question. Be honest: no manipulation, false scarcity, or misrepresenting the offer. If the objection is a firm "no" or a request to stop contacting them, the right response is to respect it — say so.`,
    buildUser: (v) => `Objection: ${v.objection}\n\nContext: ${val(v, "context")}`,
  },

  "offer-nurturer": {
    intro: "Drafts a follow-up sequence for a seller who has your offer but hasn't decided. It writes the messages for you to send; it doesn't send them.",
    button: "DRAFT SEQUENCE →",
    resultTitle: "NURTURE SEQUENCE",
    effort: "low",
    fields: [
      { key: "seller", label: "SELLER NAME", type: "text", max: SHORT },
      { key: "property", label: "PROPERTY", type: "text", required: true, max: SHORT },
      { key: "offer", label: "OFFER AMOUNT / TERMS", type: "textarea", required: true, max: LONG, rows: 2 },
      { key: "situation", label: "SELLER'S SITUATION / MOTIVATION", type: "textarea", max: LONG, rows: 3 },
      { key: "channel", label: "CHANNEL", type: "select", required: true, max: SHORT, options: ["Email", "Text message", "Mailed letter"] },
      { key: "touches", label: "NUMBER OF MESSAGES", type: "select", required: true, max: SHORT, options: ["3", "5", "7"] },
    ],
    system: `You write follow-up sequences for real estate investors who have made an offer to a seller. ${NO_INVENTION}
Write exactly the requested number of messages, each labeled with a suggested send day (e.g. "Day 2"), spaced over 3-6 weeks. Each message should add something (answer a likely concern, restate a benefit relevant to their situation, offer flexibility) rather than just "checking in". No pressure tactics or fake deadlines. Fit the channel: texts under 300 characters, letters warmer and fuller. Close the final message by leaving the door open gracefully.
If the channel is text message, add a one-line note that marketing texts require the recipient's prior consent and must honor STOP requests.`,
    buildUser: (v) =>
      `Seller: ${val(v, "seller")}\nProperty: ${v.property}\nOffer: ${v.offer}\nSituation: ${val(v, "situation")}\nChannel: ${v.channel}\nNumber of messages: ${v.touches}`,
  },

  "dead-lead-reviver": {
    intro: "Drafts re-engagement messages for leads that went cold, based on what happened last time.",
    button: "DRAFT MESSAGES →",
    resultTitle: "RE-ENGAGEMENT MESSAGES",
    effort: "low",
    fields: [
      { key: "lead", label: "LEAD NAME", type: "text", max: SHORT },
      { key: "property", label: "PROPERTY", type: "text", max: SHORT },
      { key: "lastContact", label: "LAST CONTACT (roughly when)", type: "text", max: SHORT, placeholder: "e.g. 5 months ago" },
      { key: "history", label: "WHAT HAPPENED LAST TIME", type: "textarea", required: true, max: LONG, rows: 4 },
      { key: "channel", label: "CHANNEL", type: "select", required: true, max: SHORT, options: ["Email", "Text message", "Phone voicemail script"] },
    ],
    system: `You help real estate investors re-engage cold seller leads. ${NO_INVENTION}
Write 3 alternative opening messages with different angles (circumstances may have changed; a genuinely new option such as a different close timeline or terms, but only if the user supplied one; a simple, low-pressure check-in). Reference the history naturally. Keep them short and human. Respect prior refusals: if the history shows they asked not to be contacted, say that they should not be contacted and write nothing else.
If the channel is text message, note that marketing texts require the recipient's prior consent and must honor STOP requests.`,
    buildUser: (v) =>
      `Lead: ${val(v, "lead")}\nProperty: ${val(v, "property")}\nLast contact: ${val(v, "lastContact")}\nHistory: ${v.history}\nChannel: ${v.channel}`,
  },

  "report-autowriter": {
    intro: "Paste this period's numbers and notes; get a clean investor update written from them. It uses only the numbers you give it.",
    button: "WRITE REPORT →",
    resultTitle: "INVESTOR UPDATE",
    effort: "medium",
    fields: [
      { key: "name", label: "PROPERTY / FUND NAME", type: "text", required: true, max: SHORT },
      { key: "period", label: "REPORTING PERIOD", type: "text", required: true, max: SHORT, placeholder: "e.g. Q3 2026" },
      { key: "metrics", label: "KEY NUMBERS", type: "textarea", required: true, max: LONG, rows: 6, placeholder: "Occupancy, collections, revenue & NOI vs budget, capex spent, distributions paid, debt status" },
      { key: "events", label: "NOTABLE EVENTS", type: "textarea", max: LONG, rows: 4 },
      { key: "outlook", label: "OUTLOOK / NEXT QUARTER PLANS", type: "textarea", max: LONG, rows: 3 },
    ],
    system: `You write periodic investor (LP) updates for real estate sponsors. ${NO_INVENTION}
Sections: Highlights (3-5 bullets), Operations, Financial Performance, Capital Projects, Distributions, Outlook. Professional, plain-spoken, and specific. Present bad news directly with context and the plan to address it rather than burying it. Omit a section entirely if no information was provided for it. Do not project future returns or make forward-looking promises beyond what the user wrote.`,
    buildUser: (v) =>
      `Name: ${v.name}\nPeriod: ${v.period}\n\nNumbers:\n${v.metrics}\n\nNotable events:\n${val(v, "events")}\n\nOutlook:\n${val(v, "outlook")}`,
  },

  "title-sweeper": {
    intro:
      "Paste a title commitment and get Schedule A summarized, the requirements to close listed, and exceptions and red flags called out. It reviews the text you paste; it doesn't contact the title company.",
    button: "REVIEW TITLE →",
    resultTitle: "TITLE REVIEW",
    effort: "medium",
    fields: [
      { key: "commitment", label: "TITLE COMMITMENT TEXT", type: "textarea", required: true, max: DOC, rows: 12 },
      { key: "context", label: "DEAL CONTEXT (optional)", type: "textarea", max: LONG, rows: 3, placeholder: "e.g. buying as LLC, planning to add a unit, lender-financed" },
    ],
    system: `You review title commitments for real estate investors. ${NO_INVENTION}
Output:
1. Schedule A summary — proposed insured, policy amount, current vesting, legal description (brief)
2. Requirements to close (Schedule B-I) — as a checklist
3. Exceptions (Schedule B-II) — each with a plain-English note on what it means
4. Red flags — unreleased mortgages or liens, judgments, lis pendens, mechanics' liens, vesting that doesn't match the seller, easements or restrictions that could affect the intended use, HOA issues, gaps in the chain
5. Questions to ask the title officer
Close with one line: this is a review aid, not legal advice; confirm with the title officer or a real estate attorney.`,
    buildUser: (v) => `Title commitment:\n${v.commitment}\n\nDeal context: ${val(v, "context")}`,
  },

  "lender-liaison": {
    intro: "Drafts the email to your lender and the document checklist they'll likely ask for. It writes; it doesn't contact the lender.",
    button: "DRAFT EMAIL →",
    resultTitle: "LENDER EMAIL + CHECKLIST",
    effort: "low",
    fields: [
      { key: "purpose", label: "WHAT YOU NEED", type: "select", required: true, max: SHORT, options: ["Initial quote request", "Submit loan package", "Status follow-up"] },
      { key: "loanType", label: "LOAN TYPE", type: "select", required: true, max: SHORT, options: ["DSCR", "Conventional", "Bridge / hard money", "Construction", "Commercial / agency"] },
      { key: "lender", label: "LENDER / CONTACT NAME", type: "text", max: SHORT },
      { key: "property", label: "PROPERTY DETAILS", type: "textarea", required: true, max: LONG, rows: 3, placeholder: "Address, type, units, condition, current rents" },
      { key: "numbers", label: "PRICE / LOAN AMOUNT / TIMELINE", type: "textarea", required: true, max: LONG, rows: 2 },
      { key: "borrower", label: "BORROWER EXPERIENCE (optional)", type: "textarea", max: LONG, rows: 2 },
    ],
    system: `You help real estate investors communicate with lenders. ${NO_INVENTION}
Write (1) a concise, professional email for the stated purpose, and (2) a checklist of documents lenders typically request for this loan type (for example: purchase contract, rent roll, leases, T-12, schedule of real estate owned, entity documents, bank statements, insurance quote, rehab budget and scope for bridge or construction). Note that exact requirements vary by lender. Remind the user not to send wire or bank account details by unencrypted email.`,
    buildUser: (v) =>
      `Purpose: ${v.purpose}\nLoan type: ${v.loanType}\nLender: ${val(v, "lender")}\nProperty: ${v.property}\nNumbers: ${v.numbers}\nBorrower experience: ${val(v, "borrower")}`,
  },

  "insurance-binder": {
    intro: "Drafts an insurance quote request with the property details an agent needs and the coverages to ask for. It writes the request; it doesn't bind a policy.",
    button: "DRAFT REQUEST →",
    resultTitle: "QUOTE REQUEST",
    effort: "low",
    fields: [
      { key: "address", label: "PROPERTY ADDRESS", type: "text", required: true, max: SHORT },
      { key: "coverage", label: "COVERAGE NEEDED", type: "select", required: true, max: SHORT, options: ["Landlord / rental dwelling", "Vacant or under renovation", "Commercial / multifamily property", "Liability only"] },
      { key: "details", label: "PROPERTY DETAILS", type: "textarea", required: true, max: LONG, rows: 4, placeholder: "Type, year built, sqft or units, construction, roof age, occupancy" },
      { key: "closing", label: "CLOSING DATE", type: "text", max: SHORT },
      { key: "lender", label: "LENDER (for mortgagee clause)", type: "text", max: SHORT },
      { key: "notes", label: "OTHER NOTES", type: "textarea", max: LONG, rows: 2 },
    ],
    system: `You help real estate investors request insurance quotes. ${NO_INVENTION}
Write (1) a quote-request email to an insurance agent with all supplied property details, the coverage type, and the date coverage must be effective; (2) a list of coverages and limits to ask about for this coverage type (for example: dwelling or building replacement cost, loss of rents, general liability, vacancy endorsement, builder's risk, flood and wind or named-storm if relevant), phrased as questions rather than recommendations of specific amounts; (3) what the lender will need by closing (evidence of insurance, mortgagee clause with a [bracketed] placeholder for the lender's exact clause).`,
    buildUser: (v) =>
      `Address: ${v.address}\nCoverage: ${v.coverage}\nDetails: ${v.details}\nClosing date: ${val(v, "closing")}\nLender: ${val(v, "lender")}\nNotes: ${val(v, "notes")}`,
  },

  "om-creator": {
    intro: "Writes the copy for an offering memorandum from your property facts. It produces the text to drop into your designed brochure; it doesn't do the layout or design.",
    button: "WRITE OM COPY →",
    resultTitle: "OFFERING MEMORANDUM COPY",
    effort: "medium",
    fields: [
      { key: "property", label: "PROPERTY NAME / ADDRESS", type: "text", required: true, max: SHORT },
      { key: "basics", label: "ASSET BASICS", type: "textarea", required: true, max: LONG, rows: 3, placeholder: "Asset type, units or sqft, year built, lot size, parking, price" },
      { key: "financials", label: "FINANCIALS", type: "textarea", max: LONG, rows: 4, placeholder: "Rent roll summary, NOI, cap rate, occupancy" },
      { key: "highlights", label: "PROPERTY HIGHLIGHTS", type: "textarea", max: LONG, rows: 3 },
      { key: "location", label: "LOCATION HIGHLIGHTS", type: "textarea", max: LONG, rows: 3 },
      { key: "valueAdd", label: "VALUE-ADD / BUSINESS PLAN", type: "textarea", max: LONG, rows: 3 },
    ],
    system: `You write offering memorandum copy for commercial and residential real estate brokers and sellers. ${NO_INVENTION}
Sections with headings: Executive Summary, Investment Highlights (bullets), Property Overview, Location Overview, Financial Summary, Value-Add Opportunity. Persuasive but factual: no superlatives that can't be backed by the supplied facts, no projected returns unless the user provided them, and label any pro forma figures as pro forma. Omit a section if nothing was supplied for it. End with a standard short disclaimer that information should be independently verified by the buyer.`,
    buildUser: (v) =>
      `Property: ${v.property}\nBasics: ${v.basics}\nFinancials: ${val(v, "financials")}\nProperty highlights: ${val(v, "highlights")}\nLocation: ${val(v, "location")}\nValue-add: ${val(v, "valueAdd")}`,
  },

  "buyer-q-a-bot": {
    intro:
      "Paste the property information you're willing to share, then a buyer's question. It drafts an answer using only that information and tells you when the answer isn't in it.",
    button: "DRAFT ANSWER →",
    resultTitle: "DRAFT ANSWER",
    effort: "low",
    fields: [
      { key: "facts", label: "PROPERTY INFORMATION YOU CAN SHARE", type: "textarea", required: true, max: DOC, rows: 10, placeholder: "OM text, rent roll summary, disclosures, recent capex, anything you'd put in the data room" },
      { key: "question", label: "BUYER'S QUESTION", type: "textarea", required: true, max: LONG, rows: 3 },
    ],
    system: `You draft answers to prospective buyers' questions on behalf of a property seller or listing broker. Answer ONLY from the property information provided. If the answer isn't in it, say so plainly and suggest what document or data the seller could share. Never guess, estimate, or characterize things like environmental conditions, structural soundness, legal or zoning compliance, or future performance beyond what the information states — those create liability. Keep answers short and professional. Prefix with a one-line note of which part of the provided information the answer came from.`,
    buildUser: (v) => `Property information:\n${v.facts}\n\nBuyer's question: ${v.question}`,
  },
};

export function clientPropsFor(slug: string): ClaudeAgentClientProps | null {
  const cfg = CLAUDE_AGENTS[slug];
  if (!cfg) return null;
  return { intro: cfg.intro, button: cfg.button, resultTitle: cfg.resultTitle, fields: cfg.fields };
}
