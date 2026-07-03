import { imageToolsSeo } from "./imageTools";
import { documentToolsSeo } from "./documentTools";
import { securityToolsSeo } from "./securityTools";
import { videoToolsSeo, audioToolsSeo, utilityToolsSeo, mapsToolsSeo } from "./otherTools";
import { PRIVACY_CLIENT_SIDE } from "./shared";

export const ALL_TOOL_SEO = {
  ...imageToolsSeo,
  ...documentToolsSeo,
  ...securityToolsSeo,
  ...videoToolsSeo,
  ...audioToolsSeo,
  ...utilityToolsSeo,
  ...mapsToolsSeo,
};

/** SEO landing pages that point to actual tools */
export const LANDING_PAGE_SEO = {
  "heic-to-jpg": {
    id: "heic-to-jpg",
    path: "/heic-to-jpg",
    toolPath: "/convert",
    title: "HEIC to JPG Converter – Convert iPhone Photos Free",
    description: "Convert HEIC to JPG online for free. Open iPhone photos on Windows and Android. Fast HEIC to JPEG converter on ConvertMastery.",
    h1: "HEIC to JPG Converter",
    intro: "iPhone and iPad save photos in HEIC format by default. While HEIC offers better compression, many devices and apps only accept JPG. ConvertMastery converts HEIC to JPG instantly in your browser—no upload to cloud servers, no software install.",
    howToUse: [
      "Open our Image Converter (preset to HEIC → JPG).",
      "Upload your HEIC files from iPhone or Mac.",
      "Set JPG quality (85% is a good default).",
      "Download JPG files individually or as ZIP.",
    ],
    supportedFormats: "HEIC, HEIF input. JPG/JPEG output.",
    privacySecurity: "Conversion runs locally in your browser. Your photos never leave your device.",
    useCases: [
      "Share iPhone photos with Windows users.",
      "Upload images to websites that reject HEIC.",
      "Email photos without compatibility issues.",
      "Batch convert an entire camera roll export.",
    ],
    relatedTools: [
      { href: "/convert", label: "Image Converter" },
      { href: "/compress", label: "Image Compressor" },
      { href: "/webp-to-jpg", label: "WebP to JPG" },
      { href: "/png-to-jpg", label: "PNG to JPG" },
    ],
    faqs: [
      { q: "Why does my iPhone use HEIC?", a: "Apple uses HEIC for smaller file sizes at similar quality. It is not universally supported outside Apple ecosystem." },
      { q: "Will I lose quality converting HEIC to JPG?", a: "JPG is lossy, but at high quality settings the difference is minimal for most uses." },
      { q: "Can I convert multiple HEIC files?", a: "Yes. Batch conversion with ZIP download is supported." },
    ],
  },
  "jpg-to-webp": {
    id: "jpg-to-webp",
    path: "/jpg-to-webp",
    toolPath: "/convert",
    title: "JPG to WebP Converter – Smaller Images for the Web",
    description: "Convert JPG to WebP online. Reduce image size for faster websites. Free JPG to WebP converter on ConvertMastery.",
    h1: "JPG to WebP Converter",
    intro: "WebP images are typically 25–35% smaller than JPG at similar visual quality, improving page speed and Core Web Vitals. Convert JPG photos to WebP for blogs, e-commerce, and landing pages.",
    howToUse: ["Go to Image Converter.", "Upload JPG files.", "Select WebP as output.", "Download optimized WebP images."],
    supportedFormats: "JPG, JPEG input. WebP output.",
    privacySecurity: "Browser-based conversion. Files stay on your device.",
    useCases: ["Website image optimization.", "Blog featured images.", "E-commerce product photos."],
    relatedTools: [
      { href: "/webp-to-jpg", label: "WebP to JPG" },
      { href: "/compress", label: "Image Compressor" },
      { href: "/convert", label: "Image Converter" },
    ],
    faqs: [
      { q: "Do all browsers support WebP?", a: "All modern browsers support WebP. Legacy IE does not." },
    ],
  },
  "png-to-jpg": {
    id: "png-to-jpg",
    path: "/png-to-jpg",
    toolPath: "/convert",
    title: "PNG to JPG Converter – Reduce PNG File Size",
    description: "Convert PNG to JPG online. Shrink large PNG screenshots and graphics. Free on ConvertMastery.",
    h1: "PNG to JPG Converter",
    intro: "PNG is lossless but often much larger than JPG. Convert photographs and screenshots to JPG when transparency is not needed.",
    howToUse: ["Upload PNG files.", "Choose JPG output and quality.", "Download smaller JPG files."],
    supportedFormats: "PNG input. JPG output.",
    privacySecurity: "Local browser processing.",
    useCases: ["Shrink screenshot file sizes.", "Email-friendly image attachments.", "Social media uploads."],
    relatedTools: [
      { href: "/jpg-to-webp", label: "JPG to WebP" },
      { href: "/compress", label: "Image Compressor" },
    ],
    faqs: [
      { q: "Will transparency be preserved?", a: "No. JPG does not support transparency. Use PNG if you need alpha channel." },
    ],
  },
  "webp-to-jpg": {
    id: "webp-to-jpg",
    path: "/webp-to-jpg",
    toolPath: "/convert",
    title: "WebP to JPG Converter – Open WebP Images Anywhere",
    description: "Convert WebP to JPG online. Open WebP images on older software. Free WebP to JPG on ConvertMastery.",
    h1: "WebP to JPG Converter",
    intro: "WebP is efficient but not every editor or printer supports it. Convert WebP to universally compatible JPG in one step.",
    howToUse: ["Upload WebP images.", "Select JPG output.", "Download."],
    supportedFormats: "WebP input. JPG output.",
    privacySecurity: "Browser-based, no server upload.",
    useCases: ["Open WebP in older photo editors.", "Print WebP images.", "Share with non-technical users."],
    relatedTools: [{ href: "/jpg-to-webp", label: "JPG to WebP" }, { href: "/convert", label: "Image Converter" }],
    faqs: [],
  },
  "compress-image-to-100kb": {
    id: "compress-image-to-100kb",
    path: "/compress-image-to-100kb",
    toolPath: "/compress",
    title: "Compress Image to 100KB – Free Online",
    description: "Compress images to 100KB or less for forms and uploads. Free image size reducer on ConvertMastery.",
    h1: "Compress Image to 100 KB",
    intro: "Many government portals, job applications, and university forms require images under 100 KB. Our compressor targets exact file sizes while preserving readable quality.",
    howToUse: ["Open Image Compressor.", "Upload your image.", "Enable target file size and set 100 KB.", "Compress and download."],
    supportedFormats: "JPG, PNG, WebP.",
    privacySecurity: "Processed locally in your browser.",
    useCases: ["Passport photo size limits.", "Online exam registration.", "Government form uploads."],
    relatedTools: [
      { href: "/compress-image-to-200kb", label: "Compress to 200 KB" },
      { href: "/compress", label: "Image Compressor" },
    ],
    faqs: [
      { q: "Can every image reach 100 KB?", a: "Very high-resolution images may need resizing first. Enable resize for best results." },
    ],
  },
  "compress-image-to-200kb": {
    id: "compress-image-to-200kb",
    path: "/compress-image-to-200kb",
    toolPath: "/compress",
    title: "Compress Image to 200KB – Free Online",
    description: "Compress images to 200KB for email and web uploads. Free on ConvertMastery.",
    h1: "Compress Image to 200 KB",
    intro: "Hit common 200 KB upload limits without visible quality loss. Ideal for resumes, ID scans, and thumbnail uploads.",
    howToUse: ["Upload image to Compressor.", "Set target size to 200 KB.", "Download result."],
    supportedFormats: "JPG, PNG, WebP.",
    privacySecurity: "Browser-based compression.",
    useCases: ["Resume photo uploads.", "Thumbnail requirements.", "Email attachment limits."],
    relatedTools: [
      { href: "/compress-image-to-100kb", label: "Compress to 100 KB" },
      { href: "/compress", label: "Image Compressor" },
    ],
    faqs: [],
  },
  "pdf-compressor": {
    id: "pdf-compressor",
    path: "/pdf-compressor",
    toolPath: "/compress-pdf",
    title: "PDF Compressor – Reduce PDF Size Free",
    description: "Compress PDF files online. Shrink PDFs for email and uploads. Free PDF compressor on ConvertMastery.",
    h1: "PDF Compressor Online",
    intro: "Reduce PDF file size for email attachments, cloud storage, and web uploads. Our PDF compressor optimizes images and structure inside your document.",
    howToUse: ["Upload PDF.", "Choose compression level.", "Download smaller PDF."],
    supportedFormats: "PDF input and output.",
    privacySecurity: "Client-side PDF compression in your browser.",
    useCases: ["Email large reports.", "Upload to size-limited portals.", "Archive storage savings."],
    relatedTools: [
      { href: "/compress-pdf", label: "Compress PDF Tool" },
      { href: "/merge-pdf", label: "Merge PDF" },
      { href: "/split-pdf", label: "Split PDF" },
    ],
    faqs: [],
  },
  "qr-code-generator": {
    id: "qr-code-generator",
    path: "/qr-code-generator",
    toolPath: "/qr-barcode",
    title: "QR Code Generator – Create QR Codes Free",
    description: "Generate QR codes for URLs, Wi-Fi, and text. Free QR code generator on ConvertMastery.",
    h1: "QR Code Generator",
    intro: "Create custom QR codes for marketing, menus, business cards, and events. Download high-resolution PNG for print or digital use.",
    howToUse: ["Enter URL or text.", "Customize colors and size.", "Download QR code image."],
    supportedFormats: "URL, text, Wi-Fi, vCard. PNG/SVG output.",
    privacySecurity: "Generated locally. No data stored.",
    useCases: ["Restaurant menus.", "Product packaging.", "Event registration.", "Business cards."],
    relatedTools: [{ href: "/qr-barcode", label: "QR & Barcode Tool" }, { href: "/url-shortener", label: "URL Shortener" }],
    faqs: [
      { q: "Are QR codes free forever?", a: "Yes. Static QR codes you generate do not expire." },
    ],
  },
};

export const STATIC_PAGE_SEO = {
  "/": {
    skipGlobal: true,
  },
  "/about": {
    path: "/about",
    title: "About ConvertMastery – Free Online File Tools",
    description: "Learn about ConvertMastery, our mission to provide free, privacy-first file conversion and security tools online.",
    h1: "About ConvertMastery",
  },
  "/contact": {
    path: "/contact",
    title: "Contact ConvertMastery",
    description: "Contact the ConvertMastery team for support, feedback, and partnership inquiries.",
    h1: "Contact Us",
  },
  "/privacy-policy": {
    path: "/privacy-policy",
    title: "Privacy Policy – ConvertMastery",
    description: "ConvertMastery privacy policy. How we handle data, cookies, Google AdSense, Google Analytics, and your rights.",
    h1: "Privacy Policy",
  },
  "/terms-and-conditions": {
    path: "/terms-and-conditions",
    title: "Terms and Conditions – ConvertMastery",
    description: "Terms and conditions for using ConvertMastery free online tools and services.",
    h1: "Terms and Conditions",
  },
  "/disclaimer": {
    path: "/disclaimer",
    title: "Disclaimer – ConvertMastery",
    description: "Disclaimer for ConvertMastery tools including security checkers and temporary email services.",
    h1: "Disclaimer",
  },
  "/cookie-policy": {
    path: "/cookie-policy",
    title: "Cookie Policy – ConvertMastery",
    description: "Cookie policy for ConvertMastery. Learn about cookies, Google AdSense, and how to manage preferences.",
    h1: "Cookie Policy",
  },
  "/guide": {
    path: "/guide",
    title: "ConvertMastery Guide – How to Use All Tools",
    description: "Complete guide to ConvertMastery tools. Learn how to convert, compress, and secure your files online.",
    h1: "ConvertMastery Guide",
  },
  "/blog": {
    path: "/blog",
    title: "Blog & Guides – ConvertMastery",
    description: "Tips and guides for file conversion, image compression, PDF tools, and online privacy.",
    h1: "Blog & Guides",
  },
};

export function getSeoByPath(pathname) {
  const path = pathname?.split("?")[0]?.replace(/\/$/, "") || "/";
  const normalized = path === "" ? "/" : path;

  if (ALL_TOOL_SEO[normalized.slice(1)]) {
    return { type: "tool", ...ALL_TOOL_SEO[normalized.slice(1)] };
  }

  const toolByPath = Object.values(ALL_TOOL_SEO).find((t) => t.path === normalized);
  if (toolByPath) return { type: "tool", ...toolByPath };

  const landing = LANDING_PAGE_SEO[normalized.slice(1)];
  if (landing) return { type: "landing", ...landing };

  const staticPage = STATIC_PAGE_SEO[normalized];
  if (staticPage && !staticPage.skipGlobal) return { type: "static", ...staticPage };

  return null;
}

export function getAllSitemapPaths() {
  const toolPaths = Object.values(ALL_TOOL_SEO).map((t) => t.path);
  const landingPaths = Object.values(LANDING_PAGE_SEO).map((t) => t.path);
  const staticPaths = [
    "/",
    "/about",
    "/contact",
    "/privacy-policy",
    "/terms-and-conditions",
    "/disclaimer",
    "/cookie-policy",
    "/guide",
    "/blog",
  ];
  return [...new Set([...staticPaths, ...toolPaths, ...landingPaths])];
}
