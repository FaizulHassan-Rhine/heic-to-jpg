import PolicyPage from "../components/PolicyPage";
import Link from "next/link";

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms and Conditions – ConvertMastery"
      description="Terms and conditions for using ConvertMastery free online tools and services."
      path="/terms-and-conditions"
      h1="Terms and Conditions"
      subtitle="Rules and guidelines for using ConvertMastery tools and services."
      lastUpdated="July 3, 2026"
    >
      <p>
        By accessing or using ConvertMastery (convertmastery.com), you agree to these Terms and
        Conditions. If you do not agree, please do not use our services.
      </p>

      <h2>Use of Services</h2>
      <p>
        ConvertMastery provides free online tools for file conversion, compression, and utilities.
        You may use our tools for lawful personal and commercial purposes. You must not use our
        services to:
      </p>
      <ul>
        <li>Violate any applicable law or regulation</li>
        <li>Infringe intellectual property or privacy rights of others</li>
        <li>Distribute malware, spam, or harmful content</li>
        <li>Circumvent security measures on systems you do not own or have authorization to test</li>
        <li>Harass, defraud, or mislead others</li>
        <li>Abuse temporary email or security tools for spam, ban evasion, or fraud</li>
      </ul>

      <h2>Account Registration</h2>
      <p>
        Optional account registration provides access to My Orders and premium features. You are
        responsible for maintaining the confidentiality of your account credentials.
      </p>

      <h2>Intellectual Property</h2>
      <p>
        ConvertMastery content, branding, and tool interfaces are owned by ConvertMastery. You
        retain ownership of files you process. We do not claim ownership of your content.
      </p>

      <h2>Disclaimer of Warranties</h2>
      <p>
        Services are provided &quot;as is&quot; without warranties of any kind. We do not guarantee
        uninterrupted, error-free, or perfectly accurate results. See our{" "}
        <Link href="/disclaimer">Disclaimer</Link> for more details.
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, ConvertMastery shall not be liable for indirect,
        incidental, or consequential damages arising from use of our tools, including data loss
        or conversion errors.
      </p>

      <h2>Advertising</h2>
      <p>
        Our site displays third-party advertisements through Google AdSense. We are not responsible
        for the content of third-party ads. See our <Link href="/privacy-policy">Privacy Policy</Link> and{" "}
        <Link href="/cookie-policy">Cookie Policy</Link>.
      </p>

      <h2>Termination</h2>
      <p>
        We may suspend or terminate access for violations of these terms or abusive behavior.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these Terms at any time. Continued use after changes constitutes acceptance.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Contact <a href="mailto:contact@convertmastery.com">contact@convertmastery.com</a>.
      </p>
    </PolicyPage>
  );
}
