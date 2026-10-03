import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy — BrickOS" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="October 2026"
      intro="This policy explains what information BrickOS, operated by TheCoopDAO, collects, how it's used, and who it's shared with. We don't sell your personal information."
      sections={[
        {
          title: "What we collect",
          body: [
            "Account information: your name, email address, and password (stored as a salted hash by our authentication provider; we never see your password).",
            "Content you enter: the leads, leases, tenants, vendors, work orders, inspections, investor and commitment details, files you upload for analysis, and text you give to AI agents. This may include other people's names, emails, phone numbers, and addresses, which you're responsible for having the right to use.",
            "Billing information: payments are handled by Stripe. We receive your Stripe customer ID, plan, subscription status, and billing dates. We never receive or store your full card number.",
            "Usage and technical data: standard server logs, such as IP address, browser type, pages requested, and errors, used to run and secure the service.",
          ],
        },
        {
          title: "How we use it",
          body: [
            "To provide and secure the service, authenticate you, process payments, run the agents you use, send service emails (account confirmation, billing, renewal and follow-up reminders, and messages you trigger such as vendor dispatches), provide support, and improve BrickOS. We don't use your content to advertise to you or to anyone else.",
          ],
        },
        {
          title: "Who we share it with",
          body: [
            "We use a small number of service providers to operate BrickOS, and they process data on our behalf: Supabase (database and authentication), Vercel (hosting), Stripe (payments), Resend (email delivery), and Anthropic (the AI model behind AI agents).",
            "When you run an AI agent, the text you enter into that agent is sent to Anthropic to generate the response. Anthropic's commercial terms govern their handling of that data. Don't enter information into an AI agent that you aren't comfortable sending to a processor.",
            "We may disclose information if required by law or to protect the rights and safety of our users or the service. If BrickOS is acquired or merges, information may transfer as part of that transaction, and we'd notify you.",
          ],
        },
        {
          title: "How your data is protected",
          body: [
            "Each customer's data is isolated at the database level: row-level security rules ensure an account can read and change only its own records, and access to specific agents' data requires holding that agent. Our providers encrypt data in transit and at rest. No system is perfectly secure, so please use a strong, unique password.",
          ],
        },
        {
          title: "Cookies",
          body: [
            "We use only essential cookies, which keep you signed in and secure your session. We don't use advertising or cross-site tracking cookies.",
          ],
        },
        {
          title: "Retention and deletion",
          body: [
            "We keep your account and content while your account is open. You can delete individual records inside the app, and you can email us to export or delete your account and associated data. We may retain limited records as needed for billing, tax, security, and legal obligations.",
          ],
        },
        {
          title: "Your choices and rights",
          body: [
            "You can access and update your information in the app, cancel your subscription at any time from your dashboard, and ask us to export or delete your data. Depending on where you live, you may have additional rights under privacy laws, such as access, correction, deletion, and portability. Email us and we'll respond within a reasonable time.",
          ],
        },
        {
          title: "Children",
          body: ["BrickOS is for business use by adults and is not directed to anyone under 18."],
        },
        {
          title: "Changes",
          body: [
            "We may update this policy. If a change is material, we'll notify you by email or in the app. The date at the top shows when it was last updated.",
          ],
        },
      ]}
    />
  );
}
