import PolicyPage from "../components/PolicyPage";
import Link from "next/link";

export default function CookiePolicyPage() {
  return (
    <PolicyPage
      title="Cookie Policy – ConvertMastery"
      description="Cookie policy for ConvertMastery. Learn about cookies, Google AdSense, and how to manage preferences."
      path="/cookie-policy"
      h1="Cookie Policy"
      subtitle="How we use cookies, Google AdSense, and analytics on ConvertMastery."
      lastUpdated="July 3, 2026"
    >
      <p>
        This Cookie Policy explains how ConvertMastery uses cookies and similar technologies when
        you visit convertmastery.com.
      </p>

      <h2>What Are Cookies?</h2>
      <p>
        Cookies are small text files stored on your device when you visit a website. They help
        websites remember preferences, analyze traffic, and display relevant advertisements.
      </p>

      <h2>How We Use Cookies</h2>
      <h3>Essential Cookies</h3>
      <p>
        Required for basic site functionality, authentication, and security. These cannot be disabled
        without affecting site operation.
      </p>
      <h3>Analytics Cookies</h3>
      <p>
        We use <strong>Google Analytics</strong> cookies to understand how visitors interact with our
        site (pages viewed, session duration, general location). This helps us improve our tools.
      </p>
      <h3>Advertising Cookies</h3>
      <p>
        We use <strong>Google AdSense</strong> which sets cookies to:
      </p>
      <ul>
        <li>Serve advertisements on our site</li>
        <li>Enable personalized ads based on your browsing history</li>
        <li>Measure ad performance and prevent fraud</li>
        <li>Limit how many times you see an ad</li>
      </ul>
      <p>
        Google and its advertising partners may use cookies and web beacons when ads are served on
        our website. Third-party vendors may also place cookies for advertising purposes.
      </p>

      <h2>Managing Cookies</h2>
      <p>You can control cookies through:</p>
      <ul>
        <li>
          <strong>Browser settings</strong> — Most browsers let you block or delete cookies
        </li>
        <li>
          <strong>Google Ads Settings</strong> —{" "}
          <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
            google.com/settings/ads
          </a>{" "}
          to opt out of personalized Google ads
        </li>
        <li>
          <strong>NAI opt-out</strong> —{" "}
          <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer">
            optout.networkadvertising.org
          </a>
        </li>
        <li>
          <strong>aboutads.info</strong> —{" "}
          <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer">
            optout.aboutads.info
          </a>{" "}
          for third-party personalized advertising opt-out
        </li>
      </ul>
      <p>
        Note: Blocking cookies may affect site functionality and ad relevance.
      </p>

      <h2>Other Tracking Technologies</h2>
      <p>
        We may use local storage, session storage, and similar technologies for app state and
        authentication. Vercel Analytics may collect anonymized usage metrics.
      </p>

      <h2>More Information</h2>
      <p>
        See our <Link href="/privacy-policy">Privacy Policy</Link> for how we handle personal data.
        Contact <a href="mailto:contact@convertmastery.com">contact@convertmastery.com</a> with questions.
      </p>
    </PolicyPage>
  );
}
