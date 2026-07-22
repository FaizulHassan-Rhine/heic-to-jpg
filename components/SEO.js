import Head from "next/head";
import { SITE_URL, SITE_NAME, SITE_OG_IMAGE, SITE_TWITTER } from "../lib/siteConfig";

const siteUrl = SITE_URL;
const siteName = SITE_NAME;
const defaultDescription =
  "Free online file converter, AI paraphraser, summarizer, email writer, and image upscaler. Image, video, PDF, and privacy tools — fast, private, no signup required.";

export default function SEO({
  title,
  description = defaultDescription,
  keywords,
  image = SITE_OG_IMAGE,
  url,
  type = "website",
  noindex = false,
  structuredData,
}) {
  const fullTitle = title
    ? `${title} | ${siteName}`
    : `${siteName} - Free File Converter, AI Tools & PDF Utilities`;
  const canonicalUrl = url ? `${siteUrl}${url}` : siteUrl;
  const ogImage = image?.startsWith("http") ? image : `${siteUrl}${image || ""}`;
  const defaultKeywords =
    "file converter, AI paraphraser, AI summarizer, AI email writer, AI image upscaler, image converter, video converter, document converter, PDF tools, HEIC converter, password generator, free online tools, privacy-first";
  const metaKeywords = keywords ? `${defaultKeywords}, ${keywords}` : defaultKeywords;

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={metaKeywords} />
      <meta name="author" content={siteName} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:creator" content={SITE_TWITTER} />

      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#1C4D8D" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content={siteName} />
      <meta name="application-name" content={siteName} />
      <meta name="msapplication-TileColor" content="#0F2854" />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (Array.isArray(structuredData) ? structuredData : [structuredData]).map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </Head>
  );
}

