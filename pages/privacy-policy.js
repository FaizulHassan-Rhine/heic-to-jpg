import PolicyPage from "../components/PolicyPage";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      title="Privacy Policy – ConvertMastery"
      description="ConvertMastery privacy policy. How we handle data, cookies, Google AdSense, Google Analytics, and your rights."
      path="/privacy-policy"
      h1="Privacy Policy"
      subtitle="How ConvertMastery collects, uses, and protects your information."
      lastUpdated="July 3, 2026"
    >
      <p>
        ConvertMastery (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates convertmastery.com and provides
        free online file conversion and utility tools. This Privacy Policy explains how we collect,
        use, and protect information when you use our website.
      </p>

      <h2>Information We Collect</h2>
      <h3>Information you provide</h3>
      <ul>
        <li>Account information (email, display name) if you sign up</li>
        <li>Contact form and support email correspondence</li>
        <li>Usage data related to saved orders when logged in</li>
      </ul>
      <h3>Automatically collected information</h3>
      <ul>
        <li>IP address, browser type, device type, and operating system</li>
        <li>Pages visited, time on site, and referral URLs</li>
        <li>Cookies and similar technologies (see our <Link href="/cookie-policy">Cookie Policy</Link>)</li>
      </ul>
      <h3>File data</h3>
      <p>
        Many tools process files locally in your browser. For tools that require server processing,
        files are processed in memory and not permanently stored unless you explicitly save to My Orders
        while logged in.
      </p>

      <h2>Google AdSense &amp; Advertising</h2>
      <p>
        We use <strong>Google AdSense</strong> to display advertisements on ConvertMastery. Google and its
        partners may use cookies and web beacons to serve ads based on your prior visits to this website
        or other websites. This may include <strong>personalized advertising</strong> (interest-based ads).
      </p>
      <p>
        Third-party vendors, including Google, use cookies to serve ads. Google&apos;s use of advertising
        cookies enables it and its partners to serve ads based on your visit to our site and/or other
        sites on the Internet.
      </p>
      <p>
        <strong>Opt out of personalized advertising:</strong> Visit{" "}
        <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
          Google Ads Settings
        </a>{" "}
        to disable personalized ads. You may also visit{" "}
        <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer">
          aboutads.info
        </a>{" "}
        to opt out of third-party vendor use of cookies for personalized advertising.
      </p>

      <h2>Google Analytics</h2>
      <p>
        We use <strong>Google Analytics</strong> to understand how visitors use our site. Google Analytics
        collects information such as pages visited, session duration, and general geographic region.
        This data helps us improve our tools and content. Google Analytics uses cookies. Learn more at{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          Google Privacy Policy
        </a>.
      </p>

      <h2>How We Use Information</h2>
      <ul>
        <li>Provide, maintain, and improve our tools and services</li>
        <li>Authenticate users and manage My Orders</li>
        <li>Analyze usage patterns and fix bugs</li>
        <li>Display relevant advertisements through Google AdSense</li>
        <li>Respond to support requests and enforce our terms</li>
        <li>Comply with legal obligations</li>
      </ul>

      <h2>Third-Party Services</h2>
      <p>We may use third-party services including:</p>
      <ul>
        <li>Google AdSense (advertising)</li>
        <li>Google Analytics (analytics)</li>
        <li>Firebase (authentication)</li>
        <li>Vercel (hosting and analytics)</li>
        <li>External APIs for specific tools (whois, breach checks, etc.)</li>
      </ul>
      <p>
        These third parties have their own privacy policies. We encourage you to review them.
      </p>

      <h2>Data Retention</h2>
      <p>
        We retain account and order data while your account is active. Analytics and log data are
        retained for a limited period consistent with operational needs. Server-processed files are
        not retained after processing completes unless saved to My Orders.
      </p>

      <h2>Your Rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct, delete, or restrict
        processing of your personal data. Contact us at{" "}
        <a href="mailto:contact@convertmastery.com">contact@convertmastery.com</a> to exercise these rights.
      </p>

      <h2>Children&apos;s Privacy</h2>
      <p>
        ConvertMastery is not directed at children under 13. We do not knowingly collect personal
        information from children.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Changes will be posted on this page
        with an updated date.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this Privacy Policy? Contact{" "}
        <a href="mailto:contact@convertmastery.com">contact@convertmastery.com</a>.
      </p>
    </PolicyPage>
  );
}
