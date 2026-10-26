// Tracks which agent slugs have real, working functionality behind them,
// as opposed to being catalog/billing entries only. A page for an entitled
// but not-yet-live agent should say so honestly, never imply it's running.
export const LIVE_AGENT_SLUGS = new Set([
  // Underwriting & Offer
  "comp-cruncher",
  "rent-estimator",
  "rehab-calculator",
  "mao-engine",
  "loi-drafter",
  "offer-stack-builder",
  "risk-flag-ai",
  // Property Operations
  "vacancy-pricer",
  "lease-generator",
  "rent-roll-reconciler",
  "utility-auditor",
  "market-surveyor",
  "lease-renewal-clock",
  // Maintenance & Compliance
  "work-order-router",
  "vendor-dispatcher",
  "inspection-logger",
  "turnover-coordinator",
  // Off-Market Sourcing
  "absentee-mapper",
  "tax-delinquent-hunter",
  "portfolio-stalker",
  "pre-foreclosure-radar",
  "llc-unmasker",
  "probate-parser",
  // Owner Outreach & Nurture
  "cold-call-script-gen",
  "objection-handler",
  "offer-nurturer",
  "dead-lead-reviver",
  "follow-up-clock",
  // Investor Relations
  "capital-call-bot",
  "distribution-calc",
  "waterfall-modeler",
  "fundraising-tracker",
  "report-autowriter",
  "k-1-organizer",
  // Acquisitions & Closing
  "title-sweeper",
  "due-diligence-list",
  "inspection-scheduler",
  "lender-liaison",
  "insurance-binder",
  "closing-checklist",
  // Exit & Data Room
  "valuation-engine",
  "data-room-builder",
  "buyer-q-a-bot",
  "om-creator",
  "audit-prep",
  "disposition-sequencer",
  "1031-coordinator",
]);

export function isAgentLive(slug: string): boolean {
  return LIVE_AGENT_SLUGS.has(slug);
}

// Splits a list of agent slugs into the ones that work today and the ones that
// are still catalog-only. Used to label bundles honestly on the pricing page
// (so a buyer sees what's live before paying) and to block selling a
// not-yet-built agent on its own.
export function splitByLive(slugs: string[]): { live: string[]; comingSoon: string[] } {
  const live: string[] = [];
  const comingSoon: string[] = [];
  for (const slug of slugs) (isAgentLive(slug) ? live : comingSoon).push(slug);
  return { live, comingSoon };
}
