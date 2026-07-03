import SeoLandingPage from "../components/SeoLandingPage";
import { LANDING_PAGE_SEO } from "../lib/seoContent";

export default function QrCodeGeneratorPage() {
  return <SeoLandingPage content={LANDING_PAGE_SEO["qr-code-generator"]} />;
}
