import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata = {
  title: "Terms of Service — Cabbge",
  description: "Terms governing use of the Cabbge AI marketing platform.",
};

/**
 * Terms of Service — draft for Indian SaaS targeting residential real-estate
 * developers. Plain-English where possible, defensible where it matters.
 * Jurisdiction set to Karnataka because Bangalore is the default registered-
 * office choice for Indian SaaS; update if the operating entity is elsewhere.
 *
 * Meaningful review by Indian counsel is required before production use.
 */
export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="2026-04-24">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Cabbge platform, website, APIs, and related services (collectively, the &quot;Service&quot;) provided by Cabbge (&quot;Cabbge&quot;, &quot;we&quot;, &quot;us&quot;). By creating an account, subscribing to a paid plan, or otherwise using the Service, you (the &quot;Customer&quot;) agree to be bound by these Terms.
      </p>
      <p>
        If you are accepting these Terms on behalf of an entity, you represent and warrant that you have the authority to bind that entity. &quot;You&quot; then refers to both you and that entity.
      </p>

      <LegalSection title="1. The Service">
        <p>
          Cabbge is a software-as-a-service platform for Indian residential real-estate developers. It helps you measure how AI search engines (including ChatGPT, Google Gemini, and similar tools) represent your brand, audit your website for SEO and AI-readability issues, generate optimised content, verify RERA registrations against state portals, and track your presence on property portals. A complete and current list of features is available on our pricing page.
        </p>
        <p>
          The Service is a commercial tool intended for authorised marketing, product, and compliance personnel of residential real-estate developers. Individual home buyers are not the intended users.
        </p>
      </LegalSection>

      <LegalSection title="2. Accounts and Access">
        <p>
          You must create an account to use the Service. You agree to provide accurate and current information, to keep your credentials confidential, and to notify us immediately at <a href="mailto:security@cabbge.com" className="text-[#7CB342] hover:underline">security@cabbge.com</a> of any unauthorised access. You are responsible for all activity that occurs under your account.
        </p>
        <p>
          We may suspend or terminate accounts that we reasonably believe are used for unauthorised activity, that violate these Terms, or whose payment is materially overdue.
        </p>
      </LegalSection>

      <LegalSection title="3. Subscription Plans, Credits, and Billing">
        <p>
          The Service is offered on paid subscription tiers. Each tier includes a monthly credit allowance, caps on projects, cities, crawl pages, articles, and other usage metrics. Current tiers and limits are published on the pricing page and may be updated from time to time with at least 30 days&apos; notice for material changes that affect paying customers.
        </p>
        <p>
          Subscriptions renew automatically at the end of each billing cycle unless cancelled. Payment is collected in advance by our merchant-of-record payment processor, Dodo Payments, who handles card processing, GST invoicing, and regulatory compliance on our behalf. You can cancel anytime from your account settings; cancellation takes effect at the end of the then-current billing cycle.
        </p>
        <p>
          Credit usage is soft-capped: when you exceed your monthly credit pool, the Service will continue to operate but additional usage is billed at ₹4 per credit in addition to the subscription fee. Overage charges appear on the next monthly invoice.
        </p>
        <p>
          Prices exclude GST. Cabbge (or our merchant of record, as applicable) will collect GST as required under Indian law and issue tax invoices to Indian customers.
        </p>
        <p>
          Refunds. Subscription fees are non-refundable once charged. If the Service is materially unavailable for more than 24 continuous hours due to our fault in a given billing cycle, we will credit your next invoice pro rata on written request.
        </p>
      </LegalSection>

      <LegalSection title="4. Customer Data and Your Content">
        <p>
          &quot;Customer Data&quot; means information you submit to the Service (including your company profile, project data, website URLs, brand context, uploaded documents, and generated content). You retain all right, title, and interest in Customer Data. You grant Cabbge a limited, non-exclusive, worldwide licence to process Customer Data solely to operate and improve the Service, to provide support, and to meet our legal obligations.
        </p>
        <p>
          You represent and warrant that (a) you have the right to provide Customer Data to the Service, (b) the Customer Data does not infringe any third-party rights, and (c) the websites you ask Cabbge to scan or crawl are owned by you or by brands you are authorised to measure.
        </p>
        <p>
          See our <a href="/privacy" className="text-[#7CB342] hover:underline">Privacy Policy</a> for how we collect, use, and retain data, and our <a href="/dpa" className="text-[#7CB342] hover:underline">Data Processing Agreement</a> for the contractual terms that govern our processing of personal data on your behalf.
        </p>
      </LegalSection>

      <LegalSection title="5. Acceptable Use">
        <p>You will not, and will not permit anyone else to:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>use the Service to infringe intellectual-property or privacy rights;</li>
          <li>use the Service to publish content that is false, defamatory, or misleading about competitors;</li>
          <li>reverse-engineer, scrape, or copy the Service for competitive purposes;</li>
          <li>attempt to bypass rate limits, credit caps, or tier enforcement;</li>
          <li>use the Service to target critical infrastructure, government systems, or any site you do not have authority to measure;</li>
          <li>resell, white-label, or make the Service available to third parties as a service without a written agreement.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. RERA and Regulatory Information">
        <p>
          Cabbge extracts, displays, and cross-references RERA (Real Estate Regulatory Authority) registration numbers from publicly available sources, including your own website, state RERA registries, and AI-search responses. This information is provided for informational purposes only and is not legal advice.
        </p>
        <p>
          State RERA registries are the authoritative source of truth for RERA status. Cabbge does not guarantee that the data returned by any state portal is accurate, complete, or up to date at the moment you view it. You are solely responsible for ensuring your own RERA compliance and for the accuracy of RERA information you publish or use commercially.
        </p>
        <p>
          The AI Accuracy Audit feature identifies discrepancies between statements made by AI search engines about your brand and the facts scraped from your own website. The audit is indicative, not definitive. You should independently verify any issue before taking action.
        </p>
      </LegalSection>

      <LegalSection title="7. AI-Generated Content">
        <p>
          The Service uses large language models and web-search tools provided by OpenAI, Google, and similar vendors. AI-generated content (including articles, schema markup, portal listing copy, and analyses) is produced on your behalf but may contain errors, omissions, or model artefacts. You are responsible for reviewing and editing AI output before publishing it. Cabbge does not warrant that AI-generated content is factually correct, free of errors, or fit for any specific legal, advertising, or compliance purpose.
        </p>
        <p>
          As between you and Cabbge, you own AI-generated content produced under your account to the extent ownership can be conferred. Cabbge retains no rights in your published output.
        </p>
      </LegalSection>

      <LegalSection title="8. Service Availability">
        <p>
          We target 99.5% monthly uptime measured at the application layer. Planned maintenance is typically announced at least 24 hours in advance and scheduled outside Indian business hours where possible.
        </p>
        <p>
          The Service depends on third-party providers including cloud hosting, database, large-language-model APIs, web-search APIs, and payments. Outages at these providers may cause the Service to be degraded or unavailable. During such periods, features that depend on a provider may return empty results, error messages, or cached data. We will make reasonable efforts to communicate significant provider outages.
        </p>
      </LegalSection>

      <LegalSection title="9. Intellectual Property">
        <p>
          The Service, including all software, interfaces, content we publish, and documentation, is the property of Cabbge and its licensors and is protected by copyright and other intellectual-property laws. Cabbge grants you a limited, revocable, non-transferable right to access and use the Service during your subscription.
        </p>
        <p>
          Feedback you provide about the Service may be used by Cabbge without obligation or compensation, provided it is not attributed to you personally.
        </p>
      </LegalSection>

      <LegalSection title="10. Confidentiality">
        <p>
          Each party agrees to protect the other&apos;s confidential information (including Customer Data, pricing, and non-public technical details) with the same degree of care it uses for its own confidential information, and no less than reasonable care. Confidentiality obligations survive termination for three years, except Customer Data which remains confidential indefinitely.
        </p>
      </LegalSection>

      <LegalSection title="11. Warranties and Disclaimers">
        <p className="uppercase text-[12px] tracking-wide text-zinc-400">
          Except as expressly stated in these Terms, the Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, non-infringement, or accuracy of AI-generated outputs.
        </p>
        <p>
          Cabbge does not warrant that the Service will improve your search rankings, AI visibility, conversion rates, or any other commercial outcome. Results depend on many factors outside our control.
        </p>
      </LegalSection>

      <LegalSection title="12. Limitation of Liability">
        <p className="uppercase text-[12px] tracking-wide text-zinc-400">
          To the maximum extent permitted by applicable law, neither party will be liable for indirect, incidental, consequential, special, or punitive damages, or for lost profits, lost revenue, lost data, or business interruption, arising out of or relating to the Service or these Terms, even if advised of the possibility of such damages.
        </p>
        <p className="uppercase text-[12px] tracking-wide text-zinc-400">
          Each party&apos;s total aggregate liability arising out of or relating to these Terms and the Service is capped at the amount you paid Cabbge in the 12 months preceding the event giving rise to the claim. Liability for fraud, wilful misconduct, death or personal injury, or amounts owed to Cabbge is not capped.
        </p>
      </LegalSection>

      <LegalSection title="13. Indemnification">
        <p>
          You will indemnify, defend, and hold Cabbge harmless from third-party claims arising out of (a) Customer Data you provide, (b) your use of the Service in breach of these Terms, or (c) AI-generated content you publish without review.
        </p>
        <p>
          Cabbge will indemnify, defend, and hold you harmless from third-party claims alleging that the Service (as provided by us and used as permitted) infringes their intellectual-property rights, subject to standard control and cooperation conditions. This is Cabbge&apos;s sole liability and your sole remedy for infringement claims.
        </p>
      </LegalSection>

      <LegalSection title="14. Term and Termination">
        <p>
          These Terms apply from the date you first use the Service and continue until terminated. Either party may terminate for convenience at the end of the then-current billing cycle. Either party may terminate for cause if the other party materially breaches these Terms and fails to cure within 30 days of written notice.
        </p>
        <p>
          On termination, your right to use the Service ends. We will make Customer Data available for export for 30 days after termination; after that period we may delete it. See our <a href="/dpa" className="text-[#7CB342] hover:underline">DPA</a> for specific retention and deletion obligations.
        </p>
      </LegalSection>

      <LegalSection title="15. Changes to the Terms">
        <p>
          We may update these Terms from time to time. For material changes that affect your rights or obligations, we will give at least 30 days&apos; notice before the change takes effect, by email or in-product notice. If you continue to use the Service after the effective date, you accept the updated Terms.
        </p>
      </LegalSection>

      <LegalSection title="16. Governing Law and Jurisdiction">
        <p>
          These Terms are governed by the laws of India. Disputes arising out of or relating to these Terms will be submitted to the exclusive jurisdiction of the courts in Bengaluru, Karnataka, subject to mandatory consumer-protection rules that may apply in the customer&apos;s own jurisdiction.
        </p>
      </LegalSection>

      <LegalSection title="17. Contact">
        <p>
          Questions about these Terms can be directed to <a href="mailto:legal@cabbge.com" className="text-[#7CB342] hover:underline">legal@cabbge.com</a>. For security reports: <a href="mailto:security@cabbge.com" className="text-[#7CB342] hover:underline">security@cabbge.com</a>. For privacy requests: <a href="mailto:privacy@cabbge.com" className="text-[#7CB342] hover:underline">privacy@cabbge.com</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
