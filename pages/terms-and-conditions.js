import PolicyPage from "../components/PolicyPage";
import Link from "next/link";
import { SITE_EMAIL } from "../lib/siteConfig";

const TOC = [
  { id: "agreement", label: "Agreement to Terms" },
  { id: "services", label: "Description of Services" },
  { id: "acceptable-use", label: "Acceptable Use" },
  { id: "accounts", label: "Accounts" },
  { id: "files-content", label: "Your Files & Content" },
  { id: "intellectual-property", label: "Intellectual Property" },
  { id: "advertising", label: "Advertising" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "liability", label: "Limitation of Liability" },
  { id: "termination", label: "Suspension & Termination" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms and Conditions – ConvertMastery"
      description="Terms and conditions for using ConvertMastery’s free online conversion, PDF, and utility tools. Acceptable use, accounts, liability, and more."
      path="/terms-and-conditions"
      h1="Terms & Conditions"
      subtitle="The rules that govern your use of ConvertMastery—clear, fair, and written for everyday users and professionals alike."
      lastUpdated="July 21, 2026"
      toc={TOC}
    >
      <h2 id="agreement">Agreement to These Terms</h2>
      <p>
        These Terms &amp; Conditions (“Terms”) form a binding agreement between you and ConvertMastery
        regarding your access to and use of <strong>convertmastery.com</strong> and our tools
        (collectively, the “Services”). By accessing or using the Services, you agree to these Terms
        and to our <Link href="/privacy-policy">Privacy Policy</Link> and{" "}
        <Link href="/disclaimer">Disclaimer</Link>.
      </p>
      <p>If you do not agree, do not use ConvertMastery.</p>

      <h2 id="services">Description of Services</h2>
      <p>
        ConvertMastery provides free online utilities such as image and document conversion,
        compression, PDF helpers, and related informational tools. Features may change, be limited,
        or temporarily unavailable as we maintain and improve the platform.
      </p>
      <p>
        Processing is generally <strong>on the fly</strong>: you upload or select a file, receive a
        result for download, and we do not operate a permanent personal file archive. You are
        responsible for saving outputs you need.
      </p>

      <h2 id="acceptable-use">Acceptable Use</h2>
      <p>You may use the Services for lawful personal or commercial purposes. You agree not to:</p>
      <ul>
        <li>Violate any applicable law, regulation, or third-party right</li>
        <li>Upload or process content you do not have the right to use</li>
        <li>Distribute malware, spam, phishing material, or other harmful content</li>
        <li>
          Probe, scan, or attack systems or networks without authorization (including misuse of
          security-related tools on ConvertMastery)
        </li>
        <li>Harass, defraud, impersonate, or mislead others</li>
        <li>
          Abuse temporary email, reputation, or similar utilities for spam, ban evasion, fraud, or
          other deceptive practices
        </li>
        <li>Attempt to disrupt, overload, or reverse engineer the Services in bad faith</li>
        <li>Use automated scraping in a way that harms site availability or violates these Terms</li>
      </ul>

      <h2 id="accounts">Optional Accounts</h2>
      <p>
        Some advanced options may require an optional account. You must provide accurate information
        and keep your credentials confidential. You are responsible for activity under your account.
        Notify us promptly if you suspect unauthorized access.
      </p>

      <h2 id="files-content">Your Files &amp; Content</h2>
      <p>
        You retain ownership of files and content you process. By using a tool, you grant ConvertMastery
        a limited, temporary license to process that material solely to provide the requested
        output. We do not claim ownership of your files.
      </p>
      <p>
        You represent that you have all rights needed to upload and process the material you submit,
        and that doing so does not violate law or third-party rights.
      </p>

      <h2 id="intellectual-property">Intellectual Property</h2>
      <p>
        The ConvertMastery name, logo, website design, documentation, and software interfaces are
        protected by intellectual property laws. You may not copy, modify, or redistribute our
        branding or proprietary interface materials without prior written permission, except as
        allowed by law (for example, fair use of public pages for commentary).
      </p>

      <h2 id="advertising">Advertising</h2>
      <p>
        The Services may display third-party advertisements (including via Google AdSense). We do not
        control and are not responsible for advertiser content, offers, or websites. See our{" "}
        <Link href="/cookie-policy">Cookie Policy</Link> for how advertising technologies work.
      </p>

      <h2 id="disclaimers">Disclaimer of Warranties</h2>
      <p>
        THE SERVICES ARE PROVIDED <strong>“AS IS”</strong> AND <strong>“AS AVAILABLE”</strong> WITHOUT
        WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES
        OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
      </p>
      <p>
        We do not warrant that results will be uninterrupted, error-free, complete, or suitable for
        any particular purpose (including official submissions). Always verify outputs before relying
        on them. Additional limitations appear in our <Link href="/disclaimer">Disclaimer</Link>.
      </p>

      <h2 id="liability">Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, CONVERTMASTERY AND ITS OPERATORS SHALL NOT BE LIABLE
        FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOSS OF DATA,
        PROFITS, OR BUSINESS OPPORTUNITY, ARISING FROM YOUR USE OF THE SERVICES—EVEN IF ADVISED OF
        THE POSSIBILITY OF SUCH DAMAGES.
      </p>
      <p>
        Where liability cannot be excluded, it is limited to the greater of (a) the amount you paid
        us for the Services in the three months before the claim (if any), or (b) fifty U.S. dollars
        (USD $50).
      </p>

      <h2 id="termination">Suspension &amp; Termination</h2>
      <p>
        We may suspend or terminate access to the Services—including accounts—if we reasonably
        believe you have violated these Terms, abused the platform, or created risk for other users
        or our infrastructure. You may stop using the Services at any time.
      </p>

      <h2 id="changes">Changes to These Terms</h2>
      <p>
        We may update these Terms periodically. The “Last updated” date will reflect changes.
        Continued use after an update constitutes acceptance of the revised Terms.
      </p>

      <h2 id="contact">Contact</h2>
      <p>
        Questions about these Terms? Contact{" "}
        <a href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a> or use our{" "}
        <Link href="/contact">Contact</Link> page.
      </p>
    </PolicyPage>
  );
}
