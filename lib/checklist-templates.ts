// Templates for the checklist-style agents. offsetDays is relative to the
// checklist's key date (negative = before it); items without an offset, or
// checklists created without a key date, get no due date.

export type ChecklistTemplate = {
  intro: string;
  labelName: string;
  keyDateLabel: string | null;
  createButton: string;
  items: { title: string; offsetDays?: number }[];
};

export const CHECKLIST_TEMPLATES: Record<string, ChecklistTemplate> = {
  "due-diligence-list": {
    intro:
      "Starts a due diligence checklist for a deal, with each task dated back from your DD deadline so nothing slips before your contingency expires.",
    labelName: "DEAL / PROPERTY",
    keyDateLabel: "DUE DILIGENCE DEADLINE",
    createButton: "START DUE DILIGENCE",
    items: [
      { title: "Order title commitment", offsetDays: -21 },
      { title: "Order survey", offsetDays: -21 },
      { title: "Property inspection", offsetDays: -18 },
      { title: "Specialty inspections (roof, sewer scope, HVAC)", offsetDays: -15 },
      { title: "Review title commitment and exceptions", offsetDays: -14 },
      { title: "Review rent roll and all leases", offsetDays: -14 },
      { title: "Verify zoning, permits, and certificates of occupancy", offsetDays: -14 },
      { title: "Environmental review (Phase I for commercial)", offsetDays: -14 },
      { title: "Review trailing 12-month operating statement", offsetDays: -12 },
      { title: "Verify rents against bank deposits", offsetDays: -12 },
      { title: "Collect 12 months of utility bills", offsetDays: -12 },
      { title: "HOA documents and budget (if applicable)", offsetDays: -12 },
      { title: "Tenant estoppel certificates", offsetDays: -10 },
      { title: "Get insurance quotes", offsetDays: -10 },
      { title: "Go / no-go decision", offsetDays: 0 },
    ],
  },
  "closing-checklist": {
    intro: "Tracks everything between contract and keys, dated back from your closing date.",
    labelName: "DEAL / PROPERTY",
    keyDateLabel: "CLOSING DATE",
    createButton: "START CLOSING CHECKLIST",
    items: [
      { title: "Earnest money deposited", offsetDays: -28 },
      { title: "Loan application submitted", offsetDays: -28 },
      { title: "Appraisal ordered", offsetDays: -25 },
      { title: "Title commitment received", offsetDays: -21 },
      { title: "Insurance bound; evidence sent to lender", offsetDays: -7 },
      { title: "Clear to close from lender", offsetDays: -5 },
      { title: "Settlement statement reviewed", offsetDays: -3 },
      { title: "Wire instructions verified by phone with title company", offsetDays: -2 },
      { title: "Final walkthrough", offsetDays: -1 },
      { title: "Funds wired", offsetDays: 0 },
      { title: "Closing documents signed", offsetDays: 0 },
      { title: "Keys, codes, and access received", offsetDays: 0 },
      { title: "Utilities transferred", offsetDays: 1 },
      { title: "Tenants notified of new owner and payment instructions", offsetDays: 3 },
    ],
  },
  "inspection-scheduler": {
    intro: "Schedules every inspection back from your inspection contingency deadline, with time left to negotiate repairs.",
    labelName: "DEAL / PROPERTY",
    keyDateLabel: "INSPECTION CONTINGENCY DEADLINE",
    createButton: "SCHEDULE INSPECTIONS",
    items: [
      { title: "General property inspection", offsetDays: -10 },
      { title: "Termite / wood-destroying organism inspection", offsetDays: -10 },
      { title: "Roof inspection", offsetDays: -9 },
      { title: "Sewer scope", offsetDays: -9 },
      { title: "HVAC inspection", offsetDays: -8 },
      { title: "Electrical inspection", offsetDays: -8 },
      { title: "Structural / foundation (if flagged)", offsetDays: -6 },
      { title: "All reports received and reviewed", offsetDays: -4 },
      { title: "Repair or credit request sent to seller", offsetDays: -3 },
      { title: "Contingency release or termination notice delivered", offsetDays: 0 },
    ],
  },
  "data-room-builder": {
    intro:
      "Builds the standard sale data room index and tracks which documents you've collected. It tracks the list; upload the files to your own data room or drive.",
    labelName: "PROPERTY",
    keyDateLabel: null,
    createButton: "BUILD DATA ROOM INDEX",
    items: [
      { title: "1. Offering memorandum" },
      { title: "2. Current rent roll" },
      { title: "3. Trailing 12-month operating statement" },
      { title: "4. Prior 2 years' operating statements" },
      { title: "5. Leases and amendments" },
      { title: "6. Tenant ledgers and delinquency report" },
      { title: "7. Service and vendor contracts" },
      { title: "8. Utility bills (12 months)" },
      { title: "9. Property tax bills" },
      { title: "10. Insurance policy and loss runs" },
      { title: "11. Capital expenditure history" },
      { title: "12. Site plan, floor plans, and survey" },
      { title: "Title policy" },
      { title: "Environmental reports" },
      { title: "Permits and certificates of occupancy" },
      { title: "Warranties" },
      { title: "Personal property inventory" },
    ],
  },
  "audit-prep": {
    intro: "Checklist of what an auditor or CPA will ask for, dated back from the audit or review date.",
    labelName: "ENTITY / PROPERTY",
    keyDateLabel: "AUDIT / REVIEW DATE",
    createButton: "START AUDIT PREP",
    items: [
      { title: "Bank statements for all accounts", offsetDays: -21 },
      { title: "Bank reconciliations", offsetDays: -21 },
      { title: "General ledger", offsetDays: -18 },
      { title: "Rent roll at period end", offsetDays: -18 },
      { title: "Security deposit reconciliation", offsetDays: -14 },
      { title: "Accounts receivable aging", offsetDays: -14 },
      { title: "Accounts payable and accrued expenses", offsetDays: -14 },
      { title: "Fixed asset and capex schedule", offsetDays: -14 },
      { title: "Loan statements and debt schedule", offsetDays: -14 },
      { title: "Property tax and insurance invoices", offsetDays: -10 },
      { title: "Management agreement and fee calculation", offsetDays: -10 },
      { title: "Contribution and distribution records", offsetDays: -10 },
      { title: "Prior-year financials and tax return", offsetDays: -10 },
      { title: "Management representation letter", offsetDays: -2 },
    ],
  },
  "disposition-sequencer": {
    intro: "Lays out a full sale timeline working back from your target closing date.",
    labelName: "PROPERTY",
    keyDateLabel: "TARGET CLOSING DATE",
    createButton: "BUILD SALE TIMELINE",
    items: [
      { title: "Get broker opinions of value", offsetDays: -150 },
      { title: "Select listing broker", offsetDays: -135 },
      { title: "Assemble data room", offsetDays: -120 },
      { title: "Finish deferred maintenance and curb appeal", offsetDays: -110 },
      { title: "Finalize offering memorandum", offsetDays: -100 },
      { title: "Launch marketing", offsetDays: -90 },
      { title: "Call-for-offers deadline", offsetDays: -65 },
      { title: "Select buyer and negotiate LOI", offsetDays: -60 },
      { title: "Execute purchase and sale agreement", offsetDays: -55 },
      { title: "Notify lender of payoff / check prepayment terms", offsetDays: -45 },
      { title: "Buyer due diligence period ends", offsetDays: -30 },
      { title: "If doing a 1031: engage a qualified intermediary", offsetDays: -20 },
      { title: "Buyer financing commitment", offsetDays: -20 },
      { title: "Tenant estoppels delivered", offsetDays: -15 },
      { title: "Closing", offsetDays: 0 },
    ],
  },
  "k-1-organizer": {
    intro:
      "Tracks the K-1 process for a tax year against the deadline (March 15 for calendar-year partnerships). Add one item per investor to track delivery.",
    labelName: "ENTITY + TAX YEAR",
    keyDateLabel: "K-1 DEADLINE",
    createButton: "START K-1 TRACKER",
    items: [
      { title: "Close the books and collect year-end financials", offsetDays: -60 },
      { title: "Send books and capital account detail to CPA", offsetDays: -45 },
      { title: "Review draft return and allocations", offsetDays: -20 },
      { title: "Final K-1s received from CPA", offsetDays: -10 },
      { title: "All K-1s delivered to investors", offsetDays: 0 },
    ],
  },
};

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
