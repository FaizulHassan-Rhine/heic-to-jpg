import "../styles/globals.css";
import Head from "next/head";
import { Analytics } from "@vercel/analytics/next"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://convertmastery.com";
const siteName = "ConvertMastery";
const siteDescription = "Convert and compress your images with ease. Free, fast, and secure. Support for HEIC, JPG, PNG, and WebP formats.";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>ConvertMastery - Free Image Converter &amp; Compressor</title>
        <meta name="description" content={siteDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:title" content="ConvertMastery - Free Image Converter &amp; Compressor" />
        <meta property="og:description" content={siteDescription} />
        <meta property="og:image" content={`${siteUrl}/logo.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content={siteName} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={siteUrl} />
        <meta name="twitter:title" content="ConvertMastery - Free Image Converter &amp; Compressor" />
        <meta name="twitter:description" content={siteDescription} />
        <meta name="twitter:image" content={`${siteUrl}/logo.png`} />
        
        {/* Additional Meta Tags */}
        <meta name="keywords" content="image converter, image compressor, HEIC converter, JPG converter, PNG converter, WebP converter, free image tools" />
        <meta name="author" content={siteName} />
        <meta name="robots" content="index, follow" />
        
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@100;200;300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Component {...pageProps} />
      {process.env.VERCEL && <Analytics />}
    </>
  );
}
