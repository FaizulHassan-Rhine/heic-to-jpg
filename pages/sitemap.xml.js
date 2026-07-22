import { SITE_URL } from "../lib/siteConfig";
import { getAllSitemapPaths } from "../lib/seoContent";
import { BLOG_POSTS } from "../lib/blogPosts";

const EXCLUDED = ["/my-orders", "/hermes-ai", "/resume-match"];

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getPriority(path) {
  if (path === "/") return "1.0";
  if (path.startsWith("/blog/")) return "0.6";
  if (
    [
      "/convert",
      "/compress",
      "/heic-to-jpg",
      "/pdf-to-image",
      "/word-counter",
      "/background-remover",
      "/merge-pdf",
      "/compress-pdf",
      "/password-generator",
      "/json-formatter",
      "/hash-generator",
      "/ai-paraphraser",
      "/ai-summarizer",
      "/ai-email-writer",
      "/ai-image-upscaler",
    ].includes(path)
  ) {
    return "0.9";
  }
  if (path.startsWith("/blog")) return "0.7";
  if (path === "/sample-files" || path.startsWith("/sample-files/")) return "0.7";
  if (
    [
      "/about",
      "/contact",
      "/privacy-policy",
      "/terms-and-conditions",
      "/disclaimer",
      "/cookie-policy",
    ].includes(path)
  ) {
    return "0.5";
  }
  return "0.8";
}

export default function Sitemap() {
  return null;
}

export async function getServerSideProps({ res }) {
  const lastmod = new Date().toISOString().split("T")[0];
  const paths = [
    ...getAllSitemapPaths(),
    ...BLOG_POSTS.map((p) => `/blog/${p.slug}`),
  ].filter((p) => !EXCLUDED.includes(p));

  const uniquePaths = [...new Set(paths)].sort();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniquePaths
  .map(
    (path) => `  <url>
    <loc>${escapeXml(`${SITE_URL}${path === "/" ? "/" : path}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${path === "/" ? "daily" : path.startsWith("/blog") ? "monthly" : "weekly"}</changefreq>
    <priority>${getPriority(path)}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate");
  res.write(xml);
  res.end();

  return { props: {} };
}
