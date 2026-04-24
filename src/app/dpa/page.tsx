import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata = {
  title: "Data Processing Agreement — Cabbge",
  description: "Cabbge's DPA for enterprise customers processing personal data through the Service.",
};

/**
 * Data Processing Agreement — the document enterprise procurement teams
 * ask for during diligence. Pre-signed template; customers with
 * material custom requirements can request a signed counterpart via
 * legal@cabbge.com.
 *
 * Review by Indian privacy counsel required before first enterprise
 * contract execution.
 */
export default function DpaPage() {
  return (
    <LegalLayout title="Data Processing Agreement" lastUpdated="2026-04-24">
      <p>
        This Data Processing Agreement (&quot;DPA&quot;) supplements the Terms of Service between Cabbge (&quot;Processor&quot;) and the customer identified in the active subscription (&quot;Controller&quot; or &quot;you&quot;). It governs the processing of personal data that Controller submits to the Cabbge Service.
      </p>
      <p>
        By subscribing to Cabbge, Controller accepts this DPA. Enterprise customers requiring a signed counterpart with negotiated terms may request one from <a href="mailto:legal@cabbge.com" className="text-[#7CB342] hover:underline">legal@cabbge.com</a>.
      </p>

      <LegalSection title="1. Definitions">
        <p>
          Terms in initial capitals have the meanings set out in India&apos;s Digital Personal Data Protection Act 2023 (&quot;DPDP Act&quot;) or, where relevant, equivalent concepts under GDPR. &quot;Personal Data&quot;, &quot;Processing&quot;, &quot;Data Fiduciary&quot;, and &quot;Data Processor&quot; have the meanings given in the DPDP Act.
        </p>
      </LegalSection>

      <LegalSection title="2. Subject Matter, Nature, and Purpose">
        <p>
          <strong>Subject matter</strong>: Cabbge processes personal data on Controller&apos;s behalf solely to provide the Service as described in the Terms.
        </p>
        <p>
          <strong>Nature of processing</strong>: storage, retrieval, analysis, use for machine-learning inference, transmission to sub-processors, and production of derivative outputs (scan results, audits, generated content).
        </p>
        <p>
          <strong>Purpose</strong>: to deliver the features of the Service — audit, AI visibility analysis, RERA verification, portal coverage checks, review monitoring, content generation, and related services.
        </p>
        <p>
          <strong>Duration</strong>: for the period of the subscription, plus a 30-day post-termination export window, plus any legally mandated retention.
        </p>
      </LegalSection>

      <LegalSection title="3. Types of Personal Data and Data Subjects">
        <p>Categories of data subjects include:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Controller&apos;s own employees and contractors who use the Service (e.g. name, work email, role).</li>
          <li>Individuals referenced incidentally in Controller-provided content (e.g. a brand voice document that mentions a spokesperson).</li>
        </ul>
        <p>Types of personal data processed:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Contact identifiers (name, work email, phone).</li>
          <li>Employment information (company, job title).</li>
          <li>Account and session data.</li>
          <li>Any personal data Controller voluntarily uploads inside project descriptions, brand context, or generated content.</li>
        </ul>
        <p>
          Cabbge does not process sensitive personal data in the ordinary course. Controller must not upload special-category data (health, biometric, payment-card, government ID etc.) unless a separate, signed, in-writing agreement specifies terms.
        </p>
      </LegalSection>

      <LegalSection title="4. Obligations of Cabbge (Processor)">
        <p>Cabbge undertakes to:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Process personal data only on documented instructions from Controller, including those set out in the Terms and this DPA.</li>
          <li>Ensure persons authorised to process personal data have committed to confidentiality.</li>
          <li>Implement appropriate technical and organisational security measures as set out in Section 8.</li>
          <li>Respect the sub-processor conditions set out in Section 5.</li>
          <li>Assist Controller in responding to data-subject rights requests under the DPDP Act.</li>
          <li>Assist Controller with data-protection impact assessments and consultations with regulators, where applicable.</li>
          <li>Delete or return personal data at Controller&apos;s choice at the end of provision of services, subject to legal retention requirements.</li>
          <li>Make available information reasonably necessary to demonstrate compliance with this DPA.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Sub-Processors">
        <p>
          Controller grants general written authorisation for Cabbge to engage the sub-processors listed in the <a href="/privacy" className="text-[#7CB342] hover:underline">Privacy Policy</a>. Cabbge will:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Impose data-protection obligations on each sub-processor that are at least as protective as those in this DPA.</li>
          <li>Remain responsible for a sub-processor&apos;s performance.</li>
          <li>Give at least 30 days&apos; notice before adding or replacing a sub-processor.</li>
          <li>If Controller reasonably objects to a new sub-processor within 30 days, Cabbge will either address the concern or allow Controller to terminate the affected portion of the subscription without penalty.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Cross-Border Transfers">
        <p>
          Some sub-processors operate outside India. Transfers rely on the provider&apos;s published transfer safeguards (e.g. Standard Contractual Clauses) and on Cabbge&apos;s commercial contracts with those providers. Controller authorises these transfers for the purpose of operating the Service.
        </p>
      </LegalSection>

      <LegalSection title="7. Data-Subject Rights">
        <p>
          If Cabbge receives a rights request (access, correction, erasure, nomination) directly from a data subject whose personal data we process on Controller&apos;s behalf, we will forward it to Controller without undue delay and assist Controller in responding. Cabbge does not respond to such requests directly without Controller&apos;s instruction, except where required by law.
        </p>
      </LegalSection>

      <LegalSection title="8. Security Measures">
        <p>Cabbge implements, at a minimum, the following technical and organisational measures:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li><strong>Transport security</strong>: TLS 1.2+ for all API and browser traffic.</li>
          <li><strong>At-rest encryption</strong>: AES-256 by default through our database and object-storage sub-processors.</li>
          <li><strong>Access control</strong>: role-based access for team members; production data accessible only to personnel with a documented need; all access logged.</li>
          <li><strong>Row-level security</strong>: customer data is logically isolated per owner; queries enforce tenant boundaries.</li>
          <li><strong>Secrets management</strong>: API keys and credentials stored only in hosted environment-variable stores; never committed to source control.</li>
          <li><strong>Change management</strong>: code changes reviewed before merge; deploys logged via Vercel.</li>
          <li><strong>Dependency hygiene</strong>: third-party libraries reviewed against published vulnerability feeds.</li>
          <li><strong>Incident response</strong>: breach notification workflow capable of meeting DPDP Act timelines.</li>
          <li><strong>Backups</strong>: managed by our database sub-processor; restorable on request.</li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Personal-Data Breach">
        <p>
          Cabbge will notify Controller of a personal-data breach affecting Controller&apos;s personal data without undue delay, and within 72 hours of confirmation wherever practicable. Notification will include, to the extent known: the nature of the breach; the categories and approximate number of records affected; the likely consequences; and the measures taken or proposed in response.
        </p>
      </LegalSection>

      <LegalSection title="10. Audit Rights">
        <p>
          On written request with reasonable notice, and no more than once per calendar year (except where required by a regulator or following a breach), Controller may audit Cabbge&apos;s compliance with this DPA. Cabbge will respond to audit questionnaires, make available relevant policies, and provide commercially reasonable evidence of its security controls.
        </p>
        <p>
          On-site audits are at Controller&apos;s expense, require 30 days&apos; advance notice, must avoid disruption to Cabbge&apos;s other customers, and must respect the confidentiality of third-party information.
        </p>
      </LegalSection>

      <LegalSection title="11. Deletion and Return">
        <p>
          On termination of the subscription, Cabbge will make Customer Data available for export for 30 days. After that period, Cabbge will delete Customer Data from active systems within a further 30 days. Residual copies in backups are retained per sub-processor backup cycles (typically 30-90 days) and are then rotated out.
        </p>
        <p>
          Aggregated, anonymised data that cannot identify a data subject or Controller may be retained indefinitely for service improvement.
        </p>
      </LegalSection>

      <LegalSection title="12. Liability">
        <p>
          Liability under this DPA is capped and allocated as set out in the Terms of Service. Controller remains responsible for the lawfulness of the personal data it provides and for obtaining any required consents from data subjects.
        </p>
      </LegalSection>

      <LegalSection title="13. Conflict">
        <p>
          In the event of conflict between this DPA and the Terms of Service, this DPA controls with respect to the processing of personal data.
        </p>
      </LegalSection>

      <LegalSection title="14. Governing Law">
        <p>
          This DPA is governed by the laws of India and subject to the exclusive jurisdiction of the courts in Bengaluru, Karnataka.
        </p>
      </LegalSection>

      <LegalSection title="15. Requesting a Signed Counterpart">
        <p>
          Enterprise customers may request a physically or electronically signed counterpart of this DPA, including any necessary custom provisions, by emailing <a href="mailto:legal@cabbge.com" className="text-[#7CB342] hover:underline">legal@cabbge.com</a>. We aim to return executed DPAs within five business days.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
