// Tracks which agent slugs have real, working functionality behind them,
// as opposed to being catalog/billing entries only. A page for an entitled
// but not-yet-live agent should say so honestly, never imply it's running.
export const LIVE_AGENT_SLUGS = new Set([
  "comp-cruncher",
  "rent-estimator",
  "rehab-calculator",
  "mao-engine",
  "loi-drafter",
  "offer-stack-builder",
  "risk-flag-ai",
]);

export function isAgentLive(slug: string): boolean {
  return LIVE_AGENT_SLUGS.has(slug);
}
