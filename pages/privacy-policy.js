import PolicyPage from "../components/PolicyPage";
import Link from "next/link";
import { SITE_EMAIL } from "../lib/siteConfig";

const TOC = [
  { id: "introduction", label: "Introduction" },
  { id: "information-we-collect", label: "Information We Collect" },
  { id: "how-we-use", label: "How We Use Information" },
  { id: "file-processing", label: "File Processing" },
  { id: "advertising", label: "Advertising (AdSense)" },
  { id: "analytics", label: "Analytics" },
  { id: "third-parties", label: "Third-Party Services" },
  { id: "retention", label: "Data Retention" },
  { id: "your-rights", label: "Your Rights" },
  { id: "children", label: "Children’s Privacy" },
  { id: "changes", label: "Policy Changes" },
  { id: "contact", label: "Contact Us" },
];

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      title="Privacy Policy – ConvertMastery"
      description="Learn how ConvertMastery collects, uses, and protects your information. Covers on-the-fly file processing, cookies, Google AdSense, Analytics, and your privacy rights."
      path="/privacy-policy"
      h1="Privacy Policy"
      subtitle="A clear explanation of what we collect, why we collect it, and how your files stay private while you use our tools."
      lastUpdated="July 21, 2026"
      toc={TOC}
    >
      <h2 id="introduction">Introduction</h2>
      <p>
        ConvertMastery (“we,” “us,” or “our”) operates{" "}
        <strong>convertmastery.com</strong> and related free online tools for file conversion,
        compression, PDF utilities, and related helpers. This Privacy Policy describes how we
        handle information when you visit our website or use our services.
      </p>
      <p>
        By using ConvertMastery, you acknowledge this policy. If you do not agree, please discontinue
        use of the site. For cookies and advertising technologies, also see our{" "}
        <Link href="/cookie-policy">Cookie Policy</Link>.
      </p>

      <h2 id="information-we-collect">Information We Collect</h2>
      <h3>Information you provide</h3>
      <ul>
        <li>
          <strong>Account details</strong> — If you create an optional account, we may store your
          email address and display name so you can sign in and unlock advanced tool options.
        </li>
        <li>
          <strong>Support messages</strong> — Content you send via our contact form or email,
          including any details you share about a bug or request.
        </li>
        <li>
          <strong>Preferences</strong> — Settings you choose in the product (for example, output
          format or quality), typically stored in your browser session or local storage.
        </li>
      </ul>

      <h3>Information collected automatically</h3>
      <ul>
        <li>IP address, approximate region, browser type, device type, and operating system</li>
        <li>Pages visited, referring URLs, and general interaction patterns</li>
        <li>
          Cookies and similar technologies, as described in our{" "}
          <Link href="/cookie-policy">Cookie Policy</Link>
        </li>
      </ul>

      <h2 id="how-we-use">How We Use Information</h2>
      <p>We use the information above to:</p>
      <ul>
        <li>Operate, maintain, and improve ConvertMastery tools and pages</li>
        <li>Authenticate optional signed-in users and apply account-related preferences</li>
        <li>Diagnose errors, measure performance, and understand feature usage</li>
        <li>Display advertisements through partners such as Google AdSense</li>
        <li>Respond to support requests and enforce our Terms</li>
        <li>Comply with applicable law and protect the security of our services</li>
      </ul>
      <p>
        We do <strong>not</strong> sell your personal information. We do not use the contents of your
        uploaded files for advertising profiling.
      </p>

      <h2 id="file-processing">File Processing &amp; Privacy</h2>
      <p>
        ConvertMastery is designed for <strong>on-the-fly processing</strong>. Depending on the tool:
      </p>
      <ul>
        <li>
          Some tools run entirely in your browser so your file may never leave your device for the
          core conversion step.
        </li>
        <li>
          Other tools briefly send a file to our servers (or a processing endpoint) only long enough
          to complete your request. Processed results are intended for <strong>immediate download</strong>.
        </li>
      </ul>
      <p>
        We do <strong>not</strong> maintain a permanent “My Orders” style file archive of your uploads
        or outputs. You should download results before leaving the page. Do not upload highly
        sensitive documents unless you understand and accept the risks of transmitting them over the
        internet.
      </p>

      <h2 id="advertising">Google AdSense &amp; Advertising</h2>
      <p>
        We use <strong>Google AdSense</strong> to fund free access to ConvertMastery. Google and its
        partners may use cookies and similar technologies to serve ads based on your visits to this
        site and/or other sites. This may include personalized (interest-based) advertising.
      </p>
      <p>
        <strong>Opt out of personalized ads:</strong> Visit{" "}
        <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
          Google Ads Settings
        </a>{" "}
        or{" "}
        <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer">
          aboutads.info
        </a>
        . You can also manage cookies in your browser (see the Cookie Policy). Blocking ads or
        cookies may change how the site appears, but core tools remain available.
      </p>

      <h2 id="analytics">Google Analytics</h2>
      <p>
        We use <strong>Google Analytics</strong> to understand aggregate traffic—such as popular
        tools, session length, and general geography—so we can prioritize improvements. Analytics
        uses cookies. Learn more in the{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Google Privacy Policy
        </a>
        .
      </p>

      <h2 id="third-parties">Third-Party Services</h2>
      <p>Depending on the feature you use, we may rely on providers such as:</p>
      <ul>
        <li>Google AdSense (advertising)</li>
        <li>Google Analytics (usage analytics)</li>
        <li>Firebase (optional authentication)</li>
        <li>Hosting and infrastructure providers (for example, Vercel)</li>
        <li>Specialized APIs for tools such as WHOIS, breach lookups, or similar utilities</li>
      </ul>
      <p>
        Those providers process data under their own policies. We encourage you to review them when
        relevant to your use of a specific tool.
      </p>

      <h2 id="retention">Data Retention</h2>
      <ul>
        <li>
          <strong>Accounts</strong> — Retained while your account remains active, and for a
          reasonable period afterward if needed for security or legal reasons.
        </li>
        <li>
          <strong>Support correspondence</strong> — Kept as needed to resolve your request and
          improve support quality.
        </li>
        <li>
          <strong>Logs &amp; analytics</strong> — Retained for limited operational periods.
        </li>
        <li>
          <strong>Uploaded files</strong> — Not kept as a user-facing archive; server-side
          processing is transient and oriented toward completing your immediate request.
        </li>
      </ul>

      <h2 id="your-rights">Your Rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, delete, or restrict
        processing of personal data we hold about you, and to object to certain processing. To make
        a request, email{" "}
        <a href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a>. We may need to verify your identity
        before fulfilling a request.
      </p>

      <h2 id="children">Children’s Privacy</h2>
      <p>
        ConvertMastery is not directed to children under 13 (or the equivalent minimum age in your
        jurisdiction). We do not knowingly collect personal information from children. If you believe
        a child has provided us data, contact us and we will take appropriate steps.
      </p>

      <h2 id="changes">Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy to reflect product, legal, or operational changes. The
        “Last updated” date at the top of this page will change when we do. Continued use after an
        update means you accept the revised policy.
      </p>

      <h2 id="contact">Contact Us</h2>
      <p>
        Questions about privacy at ConvertMastery? Write to{" "}
        <a href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a> or visit our{" "}
        <Link href="/contact">Contact</Link> page.
      </p>
    </PolicyPage>
  );
}
