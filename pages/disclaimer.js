import PolicyPage from "../components/PolicyPage";
import Link from "next/link";

export default function DisclaimerPage() {
  return (
    <PolicyPage
      title="Disclaimer – ConvertMastery"
      description="Disclaimer for ConvertMastery tools including security checkers and temporary email services."
      path="/disclaimer"
      h1="Disclaimer"
      subtitle="Important limitations and responsible-use guidelines for our tools."
      lastUpdated="July 3, 2026"
    >
      <h2>General Disclaimer</h2>
      <p>
        The information and tools on ConvertMastery are provided for general informational and
        utility purposes only. We make no warranties, express or implied, regarding accuracy,
        reliability, or fitness for a particular purpose.
      </p>

      <h2>File Conversion &amp; Compression</h2>
      <p>
        Conversion and compression results may vary by file type, size, and settings. Always verify
        output files before deleting originals or submitting to official portals. We are not liable
        for data loss or quality degradation.
      </p>

      <h2>Security &amp; Privacy Tools</h2>
      <p>The following tools provide informational results only:</p>
      <ul>
        <li><Link href="/fake-email-generator">Fake Email Generator</Link> — For legitimate testing and spam reduction only. Not for fraud, ban evasion, or terms-of-service violations.</li>
        <li><Link href="/data-breach-checker">Data Breach Checker</Link> — Results depend on third-party breach databases and may be incomplete. Absence of results does not guarantee security.</li>
        <li><Link href="/whois-checker">Whois Checker</Link> — WHOIS data is public registry information and may be redacted. Not legal advice.</li>
        <li><Link href="/api-status-checker">API Status Checker</Link> — Only test endpoints you are authorized to probe. Results reflect a single point-in-time check.</li>
        <li><Link href="/website-security-score">Website Security Score</Link> — A configuration snapshot, not a guarantee of safety.</li>
        <li><Link href="/ip-lookup">IP Lookup</Link> — Geolocation is approximate.</li>
        <li><Link href="/email-reputation-checker">Email Reputation Checker</Link> — Validation signals only; not definitive deliverability proof.</li>
      </ul>

      <h2>No Professional Advice</h2>
      <p>
        Nothing on ConvertMastery constitutes legal, financial, medical, or professional security advice.
        Consult qualified professionals for critical decisions.
      </p>

      <h2>Third-Party Links &amp; Ads</h2>
      <p>
        Our site may contain links to third-party websites and advertisements served by Google AdSense
        and other vendors. We do not endorse and are not responsible for third-party content.
      </p>

      <h2>Responsible Use</h2>
      <p>
        You agree to use all tools responsibly and lawfully. Do not use ConvertMastery for spam,
        abuse, illegal activity, or misleading behavior. See our{" "}
        <Link href="/terms-and-conditions">Terms and Conditions</Link>.
      </p>

      <h2>Contact</h2>
      <p>
        Report concerns to <a href="mailto:contact@convertmastery.com">contact@convertmastery.com</a>.
      </p>
    </PolicyPage>
  );
}
