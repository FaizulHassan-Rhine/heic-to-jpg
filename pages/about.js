import PolicyPage from "../components/PolicyPage";
import Link from "next/link";

export default function AboutPage() {
  return (
    <PolicyPage
      title="About ConvertMastery – Free Online File & AI Tools"
      description="Learn about ConvertMastery: free AI paraphraser, summarizer, email writer, image upscaler, plus privacy-first file conversion and PDF tools."
      path="/about"
      h1="About ConvertMastery"
      subtitle="Free, privacy-first file tools for everyone — no installs, no hassle."
    >
      <p>
        ConvertMastery is a free online platform for file conversion, compression, PDF management,
        and privacy-focused utility tools. We built ConvertMastery for people who need reliable
        tools without installing software, creating accounts, or uploading sensitive files to unknown servers.
      </p>

      <h2>Our Mission</h2>
      <p>
        Our mission is to make professional-grade file tools accessible to everyone. Whether you are
        converting iPhone HEIC photos, compressing images for a job application, merging PDF contracts,
        or checking password strength, ConvertMastery delivers fast results with a privacy-first approach.
      </p>

      <h2>What We Offer</h2>
      <ul>
        <li><strong>Image tools</strong> — convert, compress, OCR, metadata removal, and background removal</li>
        <li><strong>Document &amp; PDF tools</strong> — DOC to PDF, merge, split, compress, and scan</li>
        <li><strong>Video &amp; audio tools</strong> — convert, compress, trim, text-to-speech, and transcription</li>
        <li><strong>Security &amp; privacy tools</strong> — password generator, breach checker, whois, and more</li>
        <li><strong>Utilities</strong> — QR codes, calculators, resume builder, and map tools</li>
      </ul>

      <h2>Privacy-First Processing</h2>
      <p>
        Many of our tools run entirely in your browser. When server processing is required, files are
        handled securely and not stored permanently. We do not sell your file data. Read our{" "}
        <Link href="/privacy-policy">Privacy Policy</Link> for full details.
      </p>

      <h2>Contact</h2>
      <p>
        Questions, feedback, or partnership inquiries? Visit our{" "}
        <Link href="/contact">Contact page</Link> or email us at{" "}
        <a href="mailto:contact@convertmastery.com">contact@convertmastery.com</a>.
      </p>
    </PolicyPage>
  );
}
