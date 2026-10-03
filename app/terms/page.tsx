import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of Service — BrickOS" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="October 2026"
      intro="These Terms govern your use of BrickOS, operated by TheCoopDAO (“we”, “us”). By creating an account or using BrickOS you agree to them. If you don't agree, don't use the service."
      sections={[
        {
          title: "The service",
          body: [
            "BrickOS provides software tools and AI-assisted drafting for real estate investors and operators: calculators, trackers, checklists, document generators, and AI writers. Each agent's page describes what it does. Some agents listed in the catalog are still in development and are labeled as such; having access to one means it will activate when it is released.",
            "BrickOS does not make offers, send communications to third parties on your behalf (other than emails you explicitly trigger, such as dispatching a work order), move money, or file anything with a court, lender, title company, or government agency.",
          ],
        },
        {
          title: "Accounts",
          body: [
            "You must provide accurate information, keep your login credentials secure, and are responsible for activity under your account. One subscription covers one workspace; don't share your login with people outside your business.",
          ],
        },
        {
          title: "Subscriptions, billing, and cancellation",
          body: [
            "Paid access is billed monthly in advance through Stripe. Current prices are shown on the pricing page: individual agents, bundles, and the Full BrickOS plan. Prices exclude any applicable taxes. We may change prices going forward, with notice before your next billing date.",
            "You can cancel at any time from the Manage Billing button on your dashboard. Cancellation takes effect at the end of your current billing period, and you keep access until then. We don't provide prorated refunds for partial months unless required by law. If you believe you were charged in error, email us and we'll review it promptly.",
            "If a payment fails, we may suspend access to paid agents until it is resolved.",
          ],
        },
        {
          title: "AI-generated content",
          body: [
            "Some agents use third-party AI models to draft or analyze text. AI output can be incomplete or wrong. It is a starting point, not a finished product: review everything before relying on or sending it.",
            "Nothing in BrickOS is legal, tax, accounting, investment, or lending advice. Document templates (letters of intent, leases, notices) are general-purpose and may not satisfy the requirements of your state or locality. Have a licensed professional review anything with legal or financial consequences, including title, loan, lease, tax, and securities matters.",
            "Calculators produce estimates from the numbers you enter. We don't guarantee accuracy of results, market data, comps, valuations, or investment outcomes, and we don't guarantee that you will find, win, or profit from any deal.",
          ],
        },
        {
          title: "Your responsibilities and acceptable use",
          body: [
            "You are responsible for complying with the laws that apply to your business, including fair housing and anti-discrimination laws, the Telephone Consumer Protection Act and Do Not Call rules, CAN-SPAM, state real estate licensing and wholesaling rules, landlord-tenant law, and securities laws that apply to raising capital. BrickOS agents that draft calls, texts, or emails produce drafts only; you decide whether and how to contact anyone and are responsible for consent and opt-out compliance.",
            "Don't use BrickOS to harass or deceive anyone, to violate any law or a third party's rights, to scrape websites in violation of their terms, to attempt to access other customers' data, or to interfere with the service.",
            "Don't enter Social Security numbers, bank account or card numbers, or other highly sensitive personal data into any agent. Only enter information you have the right to use.",
          ],
        },
        {
          title: "Your data",
          body: [
            "You own the content you put into BrickOS. You give us the limited permission needed to store it, process it, and provide the service to you, including sending relevant text to our AI provider when you run an AI agent. How we handle data is described in our Privacy Policy.",
          ],
        },
        {
          title: "Availability and changes",
          body: [
            "We work to keep BrickOS available but don't promise uninterrupted service. We may add, change, or retire features. If we remove a paid feature you are subscribed to, we'll tell you and you can cancel.",
          ],
        },
        {
          title: "Disclaimers and limitation of liability",
          body: [
            "BrickOS is provided “as is” and “as available” without warranties of any kind, to the extent permitted by law. To the maximum extent permitted by law, TheCoopDAO is not liable for indirect, incidental, special, or consequential damages, or for lost deals, lost profits, vacancies, or investor disputes, and our total liability for any claim is limited to the amount you paid us in the three months before the claim arose.",
          ],
        },
        {
          title: "Termination",
          body: [
            "You can stop using BrickOS and cancel at any time. We may suspend or terminate accounts that violate these Terms or that put the service or other customers at risk. After cancellation, you may request an export of your data within 30 days.",
          ],
        },
        {
          title: "Changes to these Terms",
          body: [
            "We may update these Terms. If a change is material, we'll notify you by email or in the app before it takes effect. Continuing to use BrickOS after that means you accept the updated Terms.",
          ],
        },
      ]}
    />
  );
}
