import { useRouter } from "next/router";
import SEO from "./SEO";
import { getSeoByPath } from "../lib/seoContent";
import {
  softwareApplicationSchema,
  faqPageSchema,
  breadcrumbSchema,
  combineSchemas,
} from "../lib/structuredData";

const PAGES_WITH_OWN_SEO = ["/", "/hermes-ai", "/resume-match"];
const NOINDEX_PREFIXES = ["/admin", "/my-orders"];

export default function GlobalSeo() {
  const router = useRouter();
  const pathname = router.pathname;
  const asPath = (router.asPath || pathname).split("?")[0].replace(/\/$/, "") || "/";

  if (NOINDEX_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return (
      <SEO
        title={pathname.startsWith("/admin") ? "Admin" : "My Orders"}
        description="Private ConvertMastery page."
        url={pathname}
        noindex
      />
    );
  }

  if (PAGES_WITH_OWN_SEO.includes(pathname)) return null;
  if (pathname.startsWith("/blog/") && pathname !== "/blog") return null;
  if (pathname.startsWith("/sample-files")) return null;

  const seo = getSeoByPath(asPath);
  // Landing pages (SeoLandingPage) and static pages ship their own <SEO />
  if (!seo || seo.type !== "tool") return null;

  const breadcrumbs = [{ name: "Home", href: "/" }];
  if (seo.category) {
    breadcrumbs.push({
      name: seo.category,
      href: seo.categoryPath || seo.path,
    });
  }
  breadcrumbs.push({ name: seo.h1, href: seo.path });

  const schemas = combineSchemas(
    softwareApplicationSchema({
      name: seo.h1,
      description: seo.description,
      url: seo.path,
      category: seo.applicationCategory || "UtilityApplication",
    }),
    faqPageSchema(seo.faqs),
    breadcrumbSchema(breadcrumbs)
  );

  return (
    <SEO
      title={seo.title}
      description={seo.description}
      url={seo.path}
      structuredData={schemas.length === 1 ? schemas[0] : schemas}
    />
  );
}
