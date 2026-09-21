// Single source of truth for bundles, agents, and pricing.
// Used by: /workflows/[slug] route generation, /pricing checkout, the Stripe
// product seed script, and the Supabase seed migration.

export type Bundle = {
  id: string;
  title: string;
  description: string;
  monthlyPriceCents: number;
  agents: string[]; // agent slugs, in display order
};

export type Agent = {
  slug: string;
  title: string;
  bundleId: string;
  monthlyPriceCents: number;
};

export const AGENT_MONTHLY_PRICE_CENTS = 3900; // $39/mo per agent
export const FULL_OS_MONTHLY_PRICE_CENTS = 69500; // $695/mo, all 58 agents

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const RAW_BUNDLES: { id: string; title: string; description: string; agentTitles: string[] }[] = [
  {
    id: "sourcing",
    title: "Off-Market Sourcing",
    description: "County records → LLC → owner in 40s",
    agentTitles: [
      "County Scraper",
      "LLC Unmasker",
      "Heir Finder",
      "Tax Delinquent Hunter",
      "Absentee Mapper",
      "Skip Tracer V2",
      "Portfolio Stalker",
      "Probate Parser",
      "Pre-Foreclosure Radar",
    ],
  },
  {
    id: "outreach",
    title: "Owner Outreach & Nurture",
    description: "80% fail on follow-up. We don't.",
    agentTitles: [
      "Cold Call Script Gen",
      "SMS Sequencer",
      "Email Warm-Up",
      "Voicemail Drop",
      "Follow-Up Clock",
      "Objection Handler",
      "Offer Nurturer",
      "Dead Lead Reviver",
    ],
  },
  {
    id: "underwriting",
    title: "Underwriting & Offer",
    description: "Comps, rents, rehab in one click",
    agentTitles: [
      "Comp Cruncher",
      "Rent Estimator",
      "Rehab Calculator",
      "MAO Engine",
      "LOI Drafter",
      "Offer Stack Builder",
      "Risk Flag AI",
    ],
  },
  {
    id: "capital",
    title: "Investor Relations",
    description: "LP reports in 72h, no spreadsheets",
    agentTitles: [
      "Capital Call Bot",
      "Distribution Calc",
      "LP Portal Sync",
      "K-1 Organizer",
      "Fundraising Tracker",
      "Report Autowriter",
      "Waterfall Modeler",
    ],
  },
  {
    id: "acquisitions",
    title: "Acquisitions & Closing",
    description: "From PSA to keys, zero slip",
    agentTitles: [
      "Title Sweeper",
      "Due Diligence List",
      "Inspection Scheduler",
      "Lender Liaison",
      "Insurance Binder",
      "Closing Checklist",
    ],
  },
  {
    id: "ops",
    title: "Property Operations",
    description: "Lease renewals never missed again",
    agentTitles: [
      "Rent Roll Reconciler",
      "Lease Renewal Clock",
      "Tenant Screener",
      "Rent Collection",
      "Lease Generator",
      "Vacancy Pricer",
      "Market Surveyor",
      "Utility Auditor",
    ],
  },
  {
    id: "maintenance",
    title: "Maintenance & Compliance",
    description: "No more 2am calls",
    agentTitles: [
      "Work Order Router",
      "Vendor Dispatcher",
      "2AM Call Filter",
      "Inspection Logger",
      "Code Violation Watch",
      "Turnover Coordinator",
    ],
  },
  {
    id: "exit",
    title: "Exit & Data Room",
    description: "12-section data room in 12 minutes",
    agentTitles: [
      "Valuation Engine",
      "Data Room Builder",
      "Buyer Q&A Bot",
      "OM Creator",
      "Audit Prep",
      "Disposition Sequencer",
      "1031 Coordinator",
    ],
  },
];

export const AGENTS: Agent[] = RAW_BUNDLES.flatMap((b) =>
  b.agentTitles.map((title) => ({
    slug: slugify(title),
    title,
    bundleId: b.id,
    monthlyPriceCents: AGENT_MONTHLY_PRICE_CENTS,
  })),
);

export const BUNDLES: Bundle[] = RAW_BUNDLES.map((b) => ({
  id: b.id,
  title: b.title,
  description: b.description,
  monthlyPriceCents: b.agentTitles.length * AGENT_MONTHLY_PRICE_CENTS,
  agents: b.agentTitles.map(slugify),
}));

export function getAgent(slug: string): Agent | undefined {
  return AGENTS.find((a) => a.slug === slug);
}

export function getBundle(id: string): Bundle | undefined {
  return BUNDLES.find((b) => b.id === id);
}

export function getBundleForAgent(agentSlug: string): Bundle | undefined {
  const agent = getAgent(agentSlug);
  if (!agent) return undefined;
  return getBundle(agent.bundleId);
}

export const TOTAL_AGENT_COUNT = AGENTS.length; // 58
