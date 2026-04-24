import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata = {
  title: "Privacy Policy — Cabbge",
  description: "How Cabbge collects, uses, and protects personal data.",
};

/**
 * Privacy Policy — draft aligned with India's Digital Personal Data
 * Protection Act 2023 (DPDP Act). Lists every sub-processor we touch
 * so enterprise procurement can diligence us in one read.
 *
 * Review by Indian privacy counsel required before production use.
 */
export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="2026-04-24">
      <p>
        This Privacy Policy describes how Cabbge (&quot;Cabbge&quot;, &quot;we&quot;, &quot;us&quot;) collects, uses, discloses, and protects personal data when you use our Service. It is written to comply with India&apos;s Digital Personal Data Protection Act 2023 (DPDP Act) and standard global expectations.
      </p>
      <p>
        Cabbge is a business-to-business SaaS product. We process data primarily about (a) the people who sign up to use our Service (you, the customer representative), and (b) the brands, websites, and public content you ask us to analyse. We do not knowingly process personal data about individual home buyers.
      </p>

      <LegalSection title="1. Data Controller and Contact">
        <p>
          Cabbge acts as the data fiduciary (controller) for personal data about our own customers, and as a data processor for personal data contained in Customer Data you submit.
        </p>
        <p>
          For privacy questions, requests, or complaints, contact our Privacy Officer at <a href="mailto:privacy@cabbge.com" className="text-[#7CB342] hover:underline">privacy@cabbge.com</a>. We will respond within 30 days.
        </p>
      </LegalSection>

      <LegalSection title="2. What We Collect">
        <p><strong>Account and billing data</strong> — name, work email, phone (optional), company name, billing address, GSTIN, subscription tier, payment status. Card numbers are handled by our payment processor and never touch Cabbge servers.</p>
        <p><strong>Customer-submitted data</strong> — company profile, project data (names, locations, RERA numbers, price ranges, configurations, amenities), website URLs, brand context, uploaded PDFs, brand voice / positioning documents, and content you generate inside the platform.</p>
        <p><strong>Scan data</strong> — results of AI visibility scans, audit scores, site-crawl output, backlink estimates, portal coverage checks, RERA verification results, review-monitor output, and derivative analyses (golden prompts, volatility, citation drift, hallucination audits).</p>
        <p><strong>Usage data</strong> — API request logs, feature-interaction events, IP address, browser / device metadata, session identifiers. We use this for product analytics, security, debugging, and rate-limiting.</p>
        <p><strong>Support and communications data</strong> — emails, WhatsApp messages, and chat conversations between you and us.</p>
      </LegalSection>

      <LegalSection title="3. What We Don&apos;t Collect">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>We do not collect personal data about individual home buyers, leads, or end consumers of your projects. You should not upload customer contact lists to Cabbge.</li>
          <li>We do not process payment card numbers directly. Card data is handled by Dodo Payments under their PCI-DSS compliant infrastructure.</li>
          <li>We do not sell personal data to third parties. Ever.</li>
          <li>We do not collect special-category data (health, biometric, financial beyond billing basics, etc.) and you should not submit any.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Lawful Basis and Purposes">
        <p>We process data on these bases:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li><strong>Performance of contract</strong> — to provide the Service you signed up for.</li>
          <li><strong>Legitimate interest</strong> — to improve the Service, prevent abuse, secure the platform, and communicate with you about your account.</li>
          <li><strong>Consent</strong> — for optional communications (product updates, newsletters) that you can opt out of at any time.</li>
          <li><strong>Legal obligation</strong> — to retain billing records, comply with tax authorities, and respond to lawful government requests.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Sub-Processors">
        <p>
          We use the following trusted sub-processors to deliver the Service. Each has its own security posture and privacy commitments. Customer Data is processed within these systems only as needed to operate the Service.
        </p>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-zinc-900/80 border-b border-white/[0.06]">
                <th className="text-left px-3 py-2 text-zinc-400 font-semibold">Sub-processor</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-semibold">Purpose</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-semibold">Data type</th>
                <th className="text-left px-3 py-2 text-zinc-400 font-semibold">Region</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              <tr>
                <td className="px-3 py-2 text-zinc-200">Supabase</td>
                <td className="px-3 py-2 text-zinc-300">Database and authentication</td>
                <td className="px-3 py-2 text-zinc-300">All Customer Data, account data</td>
                <td className="px-3 py-2 text-zinc-300">AWS ap-south-1 (Mumbai)</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-zinc-200">Vercel</td>
                <td className="px-3 py-2 text-zinc-300">Application hosting and edge network</td>
                <td className="px-3 py-2 text-zinc-300">Request logs, in-transit data</td>
                <td className="px-3 py-2 text-zinc-300">Global edge + primary region in Mumbai</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-zinc-200">OpenAI</td>
                <td className="px-3 py-2 text-zinc-300">Language-model and web-search APIs</td>
                <td className="px-3 py-2 text-zinc-300">Prompts derived from Customer Data; no training on our API data</td>
                <td className="px-3 py-2 text-zinc-300">United States</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-zinc-200">Google (Gemini)</td>
                <td className="px-3 py-2 text-zinc-300">Language-model and grounded-search APIs</td>
                <td className="px-3 py-2 text-zinc-300">Prompts derived from Customer Data</td>
                <td className="px-3 py-2 text-zinc-300">United States / Global</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-zinc-200">Google PageSpeed Insights</td>
                <td className="px-3 py-2 text-zinc-300">Performance and SEO audits</td>
                <td className="px-3 py-2 text-zinc-300">Public URLs only</td>
                <td className="px-3 py-2 text-zinc-300">Global</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-zinc-200">Dodo Payments</td>
                <td className="px-3 py-2 text-zinc-300">Payment processing and merchant of record</td>
                <td className="px-3 py-2 text-zinc-300">Billing information, card data</td>
                <td className="px-3 py-2 text-zinc-300">United States / Global</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-zinc-200">Anthropic (optional)</td>
                <td className="px-3 py-2 text-zinc-300">Backup language-model provider</td>
                <td className="px-3 py-2 text-zinc-300">Prompts derived from Customer Data</td>
                <td className="px-3 py-2 text-zinc-300">United States</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          We will provide at least 30 days&apos; notice of material changes to this sub-processor list to paying customers with an active subscription.
        </p>
      </LegalSection>

      <LegalSection title="6. AI Providers and Training">
        <p>
          We use OpenAI and Google Gemini APIs under commercial agreements that prohibit the use of your prompts or completions to train their public models. OpenAI&apos;s API data is retained for up to 30 days for abuse-monitoring and is then deleted, except where you opt out via Zero Data Retention (ZDR). Google Gemini operates similarly under its commercial API terms.
        </p>
        <p>
          Cabbge does not train any model on Customer Data. Machine-learning features of the Service are powered by commercial third-party models that we invoke on your behalf.
        </p>
      </LegalSection>

      <LegalSection title="7. Cross-Border Transfers">
        <p>
          Some of our sub-processors operate in the United States and other jurisdictions. Data transfers are made under the provider&apos;s published data-transfer safeguards, including Standard Contractual Clauses where applicable. For DPDP-regulated data, we rely on the absence of a central-government restriction on the relevant country and on the provider&apos;s contractual commitments.
        </p>
      </LegalSection>

      <LegalSection title="8. Retention">
        <p>
          We retain data only as long as needed to provide the Service and meet our legal obligations:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li><strong>Customer Data</strong> — for the lifetime of your subscription, plus 30 days after termination to allow export.</li>
          <li><strong>Scan history</strong> — retained for the lifetime of your subscription so volatility and drift metrics remain meaningful.</li>
          <li><strong>Billing records</strong> — retained for at least seven years to comply with Indian tax and audit requirements.</li>
          <li><strong>Logs and operational telemetry</strong> — typically rotated within 90 days.</li>
          <li><strong>Support communications</strong> — retained for three years for dispute-resolution.</li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Your Rights">
        <p>Under the DPDP Act and applicable privacy laws, you have the right to:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Access your personal data and request a copy.</li>
          <li>Correct inaccurate or out-of-date personal data.</li>
          <li>Request erasure of personal data, subject to our legal retention obligations.</li>
          <li>Withdraw consent for non-essential processing at any time.</li>
          <li>Nominate another person to exercise your rights in the event of incapacity or death.</li>
          <li>Lodge a complaint with the Data Protection Board of India.</li>
        </ul>
        <p>
          To exercise any of these rights, email <a href="mailto:privacy@cabbge.com" className="text-[#7CB342] hover:underline">privacy@cabbge.com</a>. We will verify your identity and respond within 30 days.
        </p>
      </LegalSection>

      <LegalSection title="10. Security">
        <p>
          We apply industry-standard technical and organisational measures to protect personal data, including:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Transport encryption (TLS 1.2+) for all data in transit.</li>
          <li>Encryption at rest within our database and object storage (AES-256 by sub-processor default).</li>
          <li>Least-privilege access controls for team members.</li>
          <li>Row-level security policies so customers can only read and modify their own data.</li>
          <li>Secret management via Vercel environment variables with access scoped per project.</li>
          <li>Regular review of dependencies for published vulnerabilities.</li>
        </ul>
        <p>
          No system is perfectly secure. If you believe you have found a security issue, email <a href="mailto:security@cabbge.com" className="text-[#7CB342] hover:underline">security@cabbge.com</a>. We commit to acknowledging reports within 72 hours and will notify affected customers without undue delay in the event of a confirmed personal-data breach, in line with DPDP Act timelines.
        </p>
      </LegalSection>

      <LegalSection title="11. Cookies">
        <p>
          Cabbge uses cookies strictly necessary for authentication and session management (e.g. keeping you signed in, remembering demo-mode state). We do not use third-party advertising cookies on the application. The public website may use privacy-preserving analytics that do not identify individual users.
        </p>
      </LegalSection>

      <LegalSection title="12. Children">
        <p>
          The Service is not intended for anyone under 18. We do not knowingly collect data from children. If you believe a minor has submitted personal data, contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection title="13. Changes to this Policy">
        <p>
          We may update this Privacy Policy. Material changes will be announced by email or in-product notice at least 30 days before they take effect for paying customers. The &quot;Last updated&quot; date at the top reflects the current version.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>
          Privacy Officer: <a href="mailto:privacy@cabbge.com" className="text-[#7CB342] hover:underline">privacy@cabbge.com</a><br />
          Security reports: <a href="mailto:security@cabbge.com" className="text-[#7CB342] hover:underline">security@cabbge.com</a><br />
          General legal: <a href="mailto:legal@cabbge.com" className="text-[#7CB342] hover:underline">legal@cabbge.com</a>
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
