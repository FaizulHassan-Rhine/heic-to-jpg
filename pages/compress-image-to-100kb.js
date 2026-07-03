import SeoLandingPage from "../components/SeoLandingPage";
import { LANDING_PAGE_SEO } from "../lib/seoContent";

export default function Compress100kbPage() {
  return <SeoLandingPage content={LANDING_PAGE_SEO["compress-image-to-100kb"]} />;
}
