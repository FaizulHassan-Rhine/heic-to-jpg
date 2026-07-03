import Head from "next/head";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://convertmastery.com";
const siteName = "ConvertMastery";
const defaultDescription = "Free online file converter and compressor. Image, video, document, and audio tools. Security and privacy: password generator, IP lookup, whois, metadata remover, fake email, URL shortener, QR code. Sign up to save files in My Orders.";

export default function SEO({
  title,
  description = defaultDescription,
  keywords,
  image = `${siteUrl}/logo.png`,
  url,
  type = "website",
  noindex = false,
  structuredData,
}) {
  const fullTitle = title ? `${title} | ${siteName}` : `${siteName} - Free File Converter & Compressor`;
  const canonicalUrl = url ? `${siteUrl}${url}` : siteUrl;
  const defaultKeywords = "file converter, image converter, video converter, document converter, audio converter, file compressor, HEIC converter, password generator, IP lookup, whois checker, metadata remover, fake email, URL shortener, QR code, PDF tools, security tools, privacy tools, free online tools, privacy-first, secure file conversion";
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
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:creator" content="@convertmastery" />

      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#3b82f6" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content={siteName} />
      <meta name="application-name" content={siteName} />
      <meta name="msapplication-TileColor" content="#3b82f6" />

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

