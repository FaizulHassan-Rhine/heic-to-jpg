import PolicyPage from "../components/PolicyPage";
import Link from "next/link";
import { SITE_EMAIL } from "../lib/siteConfig";

const TOC = [
  { id: "general", label: "General Disclaimer" },
  { id: "file-tools", label: "File & PDF Tools" },
  { id: "security-tools", label: "Security & Lookup Tools" },
  { id: "no-advice", label: "No Professional Advice" },
  { id: "third-parties", label: "Third Parties & Ads" },
  { id: "responsible-use", label: "Responsible Use" },
  { id: "contact", label: "Contact" },
];

export default function DisclaimerPage() {
  return (
    <PolicyPage
      title="Disclaimer – ConvertMastery"
      description="Important disclaimers for ConvertMastery file tools, PDF utilities, and informational security checkers. Results are provided as-is."
      path="/disclaimer"
      h1="Disclaimer"
      subtitle="Important limitations of our tools so you can use ConvertMastery responsibly and with clear expectations."
      lastUpdated="July 21, 2026"
      toc={TOC}
    >
      <h2 id="general">General Disclaimer</h2>
      <p>
        ConvertMastery provides free online utilities and informational helpers for convenience.
        Content and tool outputs are offered for general utility purposes only. We make no
        warranties—express or implied—regarding accuracy, completeness, reliability, availability,
        or fitness for a particular purpose.
      </p>
      <p>
        Use of ConvertMastery is at your own risk. Always keep backups of important files and verify
        results before discarding originals or submitting documents to third parties.
      </p>

      <h2 id="file-tools">File Conversion, Compression &amp; PDF Tools</h2>
      <p>
        Output quality and success rates vary by file type, size, encoding, and settings. Conversion
        or compression may introduce quality loss, layout differences, or incomplete results—
        especially with complex documents, fonts, or media.
      </p>
      <ul>
        <li>Preview and open downloads before relying on them for work, school, or official use</li>
        <li>Do not delete originals until you confirm the output meets your needs</li>
        <li>
          Processing is on the fly; download results promptly—we do not keep a permanent personal
          file archive
        </li>
      </ul>
      <p>
        ConvertMastery is not liable for data loss, corruption, missed deadlines, or consequences of
        relying on an incorrect or incomplete output.
      </p>

      <h2 id="security-tools">Security, Privacy &amp; Lookup Tools</h2>
      <p>
        Certain tools return informational signals only. They are <strong>not</strong> a substitute
        for professional security assessments, legal review, or certified penetration testing.
      </p>
      <ul>
        <li>
          <Link href="/fake-email-generator">Temporary / Fake Email Generator</Link> — For legitimate
          testing and reducing inbox spam. Not for fraud, impersonation, ban evasion, or violating
          another service’s terms.
        </li>
        <li>
          <Link href="/data-breach-checker">Data Breach Checker</Link> — Depends on third-party breach
          datasets that may be incomplete or delayed. No match does not prove an address is safe.
        </li>
        <li>
          <Link href="/whois-checker">WHOIS Checker</Link> — Reflects public registry data, which may
          be redacted or outdated. Not legal advice.
        </li>
        <li>
          <Link href="/api-status-checker">API Status Checker</Link> — Only probe endpoints you are
          authorized to test. Results are a single point-in-time snapshot.
        </li>
        <li>
          <Link href="/website-security-score">Website Security Score</Link> — A high-level
          configuration snapshot, not a guarantee of safety or compliance.
        </li>
        <li>
          <Link href="/ip-lookup">IP Lookup</Link> — Geolocation and network metadata are approximate.
        </li>
        <li>
          <Link href="/email-reputation-checker">Email Reputation Checker</Link> — Validation and
          reputation signals only; not definitive proof of deliverability or legitimacy.
        </li>
      </ul>

      <h2 id="no-advice">No Professional Advice</h2>
      <p>
        Nothing on ConvertMastery constitutes legal, financial, medical, tax, or professional
        cybersecurity advice. For decisions with material consequences, consult a qualified
        professional in your jurisdiction.
      </p>

      <h2 id="third-parties">Third-Party Links &amp; Advertisements</h2>
      <p>
        Pages may include links to external sites and advertisements served by partners such as
        Google AdSense. We do not endorse and are not responsible for third-party products, claims,
        privacy practices, or content. Your interactions with advertisers are solely between you and
        those parties.
      </p>

      <h2 id="responsible-use">Responsible Use</h2>
      <p>
        You agree to use ConvertMastery lawfully and ethically. Do not use our tools for spam, abuse,
        illegal activity, unauthorized access, or deceptive conduct. Violations may result in
        suspension of access. See our{" "}
        <Link href="/terms-and-conditions">Terms &amp; Conditions</Link> for full acceptable-use rules.
      </p>

      <h2 id="contact">Contact</h2>
      <p>
        To report misuse or ask about this Disclaimer, email{" "}
        <a href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a>.
      </p>
    </PolicyPage>
  );
}
