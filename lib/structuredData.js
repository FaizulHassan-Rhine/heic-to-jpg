import { SITE_URL, SITE_NAME, SITE_LOGO, SITE_EMAIL, SITE_OG_IMAGE } from "./siteConfig";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: SITE_LOGO,
    email: SITE_EMAIL,
    sameAs: [],
    description:
      "ConvertMastery provides free online file conversion, AI paraphrasing, summarization, email writing, image upscaling, PDF, and privacy tools.",
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Free online file converter, AI tools (paraphraser, summarizer, email writer, image upscaler), PDF utilities, and privacy tools.",
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/guide?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function softwareApplicationSchema({ name, description, url, category = "UtilityApplication" }) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    url: `${SITE_URL}${url}`,
    applicationCategory: category,
    operatingSystem: "Web Browser",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

export function faqPageSchema(faqs) {
  if (!faqs?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.href ? `${SITE_URL}${item.href}` : undefined,
    })),
  };
}

export function articleSchema({ title, description, slug, datePublished, dateModified, image }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: `${SITE_URL}/blog/${slug}`,
    datePublished,
    dateModified: dateModified || datePublished,
    image: image ? (image.startsWith("http") ? image : `${SITE_URL}${image}`) : SITE_OG_IMAGE,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: SITE_LOGO },
    },
    mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
  };
}

export function combineSchemas(...schemas) {
  return schemas.filter(Boolean);
}
