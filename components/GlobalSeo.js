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

export default function GlobalSeo() {
  const router = useRouter();
  const pathname = router.pathname;

  if (PAGES_WITH_OWN_SEO.includes(pathname)) return null;
  if (pathname.startsWith("/admin")) return null;
  if (pathname.startsWith("/blog/") && pathname !== "/blog") return null;

  const seo = getSeoByPath(pathname);
  if (!seo || seo.type !== "tool") return null;

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: seo.h1, href: seo.path },
  ];

  const schemas = combineSchemas(
    seo.type === "tool" || seo.type === "landing"
      ? softwareApplicationSchema({
          name: seo.h1,
          description: seo.description,
          url: seo.path,
        })
      : null,
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
