import PolicyPage from "../components/PolicyPage";
import Link from "next/link";
import { SITE_EMAIL } from "../lib/siteConfig";

const TOC = [
  { id: "what-are-cookies", label: "What Are Cookies?" },
  { id: "how-we-use", label: "How We Use Cookies" },
  { id: "analytics", label: "Analytics Cookies" },
  { id: "advertising", label: "Advertising Cookies" },
  { id: "managing", label: "Managing Cookies" },
  { id: "other-tech", label: "Other Technologies" },
  { id: "more", label: "More Information" },
];

export default function CookiePolicyPage() {
  return (
    <PolicyPage
      title="Cookie Policy – ConvertMastery"
      description="How ConvertMastery uses cookies and similar technologies, including Google AdSense and Analytics, and how you can manage your preferences."
      path="/cookie-policy"
      h1="Cookie Policy"
      subtitle="Transparent details on cookies, analytics, and advertising technologies used on convertmastery.com."
      lastUpdated="July 21, 2026"
      toc={TOC}
    >
      <p>
        This Cookie Policy explains how ConvertMastery (“we,” “us”) uses cookies and similar
        technologies when you visit <strong>convertmastery.com</strong>. It should be read together
        with our <Link href="/privacy-policy">Privacy Policy</Link>.
      </p>

      <h2 id="what-are-cookies">What Are Cookies?</h2>
      <p>
        Cookies are small text files placed on your device by a website. They help sites remember
        preferences, keep you signed in, measure traffic, and—where enabled—support advertising.
        Similar technologies include local storage, session storage, and pixels (web beacons).
      </p>

      <h2 id="how-we-use">How We Use Cookies</h2>
      <h3>Essential / functional</h3>
      <p>
        These cookies (and related storage) support core site functions such as security, load
        balancing, remembering basic preferences, and optional authentication state. Without them,
        parts of ConvertMastery may not work reliably.
      </p>

      <h3 id="analytics">Analytics</h3>
      <p>
        We use <strong>Google Analytics</strong> (and may use hosting analytics such as Vercel
        Analytics) to understand aggregate usage—popular tools, approximate geography, and session
        patterns—so we can improve performance and content. Analytics cookies help distinguish
        visits in an anonymized or aggregated way; they are not used to read the contents of your
        uploaded files.
      </p>

      <h3 id="advertising">Advertising (Google AdSense)</h3>
      <p>
        We use <strong>Google AdSense</strong> to display ads that help keep ConvertMastery free.
        Google and its advertising partners may set cookies to:
      </p>
      <ul>
        <li>Serve and measure advertisements on our pages</li>
        <li>Enable personalized ads based on your activity on this site and/or other sites</li>
        <li>Limit how often you see the same creative and help detect fraud or abuse</li>
      </ul>
      <p>
        Third-party vendors, including Google, use cookies to serve ads based on your prior visits
        to our website or other websites on the internet.
      </p>

      <h2 id="managing">Managing Cookies &amp; Ad Preferences</h2>
      <p>You can control cookies and personalized advertising in several ways:</p>
      <ul>
        <li>
          <strong>Browser controls</strong> — Most browsers let you block, delete, or limit cookies.
          Check your browser’s help section for steps.
        </li>
        <li>
          <strong>Google Ads Settings</strong> —{" "}
          <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
            google.com/settings/ads
          </a>{" "}
          to manage personalized Google ads.
        </li>
        <li>
          <strong>Industry opt-outs</strong> —{" "}
          <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer">
            aboutads.info
          </a>{" "}
          and{" "}
          <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer">
            networkadvertising.org
          </a>
          .
        </li>
      </ul>
      <p>
        Blocking cookies may reduce ad relevance and, in some cases, affect sign-in or preference
        features. Core conversion tools are designed to remain usable.
      </p>

      <h2 id="other-tech">Other Tracking &amp; Storage Technologies</h2>
      <p>
        ConvertMastery may use browser local storage or session storage for tool state (for example,
        UI preferences during a session). These are not always classified as “cookies” but serve a
        similar functional role. We do not use file contents stored in your session for advertising
        profiling.
      </p>

      <h2 id="more">More Information</h2>
      <p>
        For how we handle personal data more broadly, see the{" "}
        <Link href="/privacy-policy">Privacy Policy</Link>. Questions about cookies on ConvertMastery?
        Email <a href={`mailto:${SITE_EMAIL}`}>{SITE_EMAIL}</a>.
      </p>
    </PolicyPage>
  );
}
