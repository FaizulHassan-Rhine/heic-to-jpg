import PolicyPage from "../components/PolicyPage";

export default function ContactPage() {
  return (
    <PolicyPage
      title="Contact ConvertMastery"
      description="Contact the ConvertMastery team for support, feedback, and partnership inquiries."
      path="/contact"
      h1="Contact Us"
      subtitle="Questions, feedback, or support — we'd love to hear from you."
    >
      <p>
        We welcome your questions, feedback, bug reports, and partnership inquiries. Our team
        reviews messages regularly and aims to respond within 2–3 business days.
      </p>

      <h2>General Inquiries</h2>
      <p>
        Email: <a href="mailto:contact@convertmastery.com">contact@convertmastery.com</a>
      </p>

      <h2>Support</h2>
      <p>
        For technical issues with a specific tool, please include the tool name, your browser,
        and a description of the problem. Screenshots help us diagnose issues faster.
      </p>

      <h2>Privacy &amp; Data Requests</h2>
      <p>
        For privacy-related questions or data requests, email{" "}
        <a href="mailto:contact@convertmastery.com">contact@convertmastery.com</a> with the subject
        line &quot;Privacy Request.&quot; See our <a href="/privacy-policy">Privacy Policy</a> for details
        on how we handle data.
      </p>

      <h2>Advertising</h2>
      <p>
        ConvertMastery uses Google AdSense to display advertisements. We do not sell direct
        ad placements. For advertising-related platform questions, refer to Google AdSense policies.
      </p>

      <h2>Abuse Reports</h2>
      <p>
        To report misuse of our tools (spam, fraud, or terms violations), contact us with
        relevant URLs and evidence. We take abuse seriously and may restrict access for violations.
      </p>
    </PolicyPage>
  );
}
