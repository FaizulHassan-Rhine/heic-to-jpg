/**
 * Single source of truth for all tools and categories.
 * Used by Navbar, landing page (index), documentation (guide), and SEO.
 */

// Main menu categories (Image, Document, AI, Security)
export const MAIN_CATEGORIES = [
  {
    label: "Image Tools",
    paths: ["/convert", "/compress", "/image-to-pdf", "/extract-text", "/background-remover", "/favicon-generator", "/sample-files", "/sample-files/[format]"],
    items: [
      { href: "/convert", label: "Image Converter", popular: true, iconKey: "Image" },
      { href: "/compress", label: "Image Compressor", popular: true, iconKey: "Minimize2" },
      { href: "/image-to-pdf", label: "Image to PDF", iconKey: "FileImage" },
      { href: "/favicon-generator", label: "Favicon Generator", popular: true, iconKey: "Image" },
      { href: "/extract-text", label: "Extract Text (OCR)", iconKey: "ScanLine" },
      { href: "/background-remover", label: "Background Remover", popular: true, iconKey: "Image" },
      { href: "/sample-files", label: "Sample Files", iconKey: "FileImage" },
    ],
  },
  {
    label: "Document Tools",
    paths: ["/doc-to-pdf", "/pdf-to-doc", "/pdf-to-image", "/scanner", "/merge-pdf", "/compress-pdf", "/pdf-unlock-protect", "/split-pdf", "/resume-match", "/grammer-checker", "/word-counter"],
    items: [
      { href: "/grammer-checker", label: "Grammer Checker", popular: true, iconKey: "Type" },
      { href: "/word-counter", label: "Word Counter", popular: true, iconKey: "Type" },
      { href: "/resume-match", label: "Resume Match", popular: true, iconKey: "FileText", newTab: true },
      { href: "/doc-to-pdf", label: "Doc to PDF", popular: true, iconKey: "FileText" },
      { href: "/pdf-to-doc", label: "PDF to DOCX/TXT", iconKey: "Type" },
      { href: "/pdf-to-image", label: "PDF to JPG/PNG", popular: true, iconKey: "FileImage" },
      { href: "/merge-pdf", label: "Merge PDF", iconKey: "Merge" },
      { href: "/split-pdf", label: "Split PDF", iconKey: "Minimize2" },
      { href: "/compress-pdf", label: "Compress PDF", iconKey: "Minimize2" },
      { href: "/pdf-unlock-protect", label: "PDF Unlock/Protect", popular: true, iconKey: "Lock" },
      { href: "/scanner", label: "Document Scanner", popular: true, iconKey: "ScanLine" },
    ],
  },
  {
    label: "AI Tools",
    paths: [
      "/ai-paraphraser",
      "/ai-summarizer",
      "/ai-email-writer",
      "/ai-image-upscaler",
      "/hermes-ai",
    ],
    items: [
      { href: "/ai-paraphraser", label: "AI Paraphraser", popular: true, iconKey: "Sparkles" },
      { href: "/ai-summarizer", label: "AI Summarizer", popular: true, iconKey: "Sparkles" },
      { href: "/ai-email-writer", label: "AI Email Writer", popular: true, iconKey: "Sparkles" },
      { href: "/ai-image-upscaler", label: "AI Image Upscaler", popular: true, iconKey: "Image" },
      { href: "/hermes-ai", label: "Hermes AI Chat", popular: true, iconKey: "Sparkles" },
    ],
  },
  {
    label: "Security and Privacy",
    paths: [
      "/password-generator", "/password-strength-checker", "/hash-generator", "/ip-lookup", "/whois-checker",
      "/metadata-remover", "/fake-email-generator", "/website-security-score", "/email-reputation-checker",
      "/phone-validator", "/data-breach-checker", "/api-status-checker",
    ],
    items: [
      { href: "/password-generator", label: "Password Generator", popular: true, iconKey: "Lock" },
      { href: "/password-strength-checker", label: "Password Strength Checker", iconKey: "Shield" },
      { href: "/hash-generator", label: "Hash Generator", popular: true, iconKey: "Hash" },
      { href: "/ip-lookup", label: "IP Address Lookup", iconKey: "Globe" },
      { href: "/whois-checker", label: "Whois Checker", popular: true, iconKey: "Globe" },
      { href: "/metadata-remover", label: "Metadata Remover", iconKey: "FileImage" },
      { href: "/fake-email-generator", label: "Fake Email Generator", popular: true, iconKey: "Mail" },
      { href: "/website-security-score", label: "Website Security Score", popular: true, iconKey: "Shield" },
      { href: "/email-reputation-checker", label: "Email Reputation Checker", iconKey: "Mail" },
      { href: "/phone-validator", label: "Phone Validator", iconKey: "Phone" },
      { href: "/data-breach-checker", label: "Data Breach Checker", popular: true, iconKey: "Database" },
      { href: "/api-status-checker", label: "API Status Checker", popular: true, iconKey: "Server" },
    ],
  },
];

// Other Tools mega menu sections
export const OTHER_TOOLS_SECTIONS = [
  {
    title: "Video Tools",
    paths: ["/video-convert", "/video-compress", "/video-trim"],
    items: [
      { href: "/video-convert", label: "Video Converter", popular: true, iconKey: "Video" },
      { href: "/video-compress", label: "Video Compressor", iconKey: "Minimize2" },
      { href: "/video-trim", label: "Video Trimmer", iconKey: "ScanLine" },
    ],
  },
  {
    title: "Audio Tools",
    paths: ["/audio-convert", "/text-to-speech", "/speech-to-text"],
    items: [
      { href: "/audio-convert", label: "Audio Converter", iconKey: "Music" },
      { href: "/text-to-speech", label: "Text to Speech", iconKey: "Type" },
      { href: "/speech-to-text", label: "Speech to Text", popular: true, iconKey: "Music" },
    ],
  },
  {
    title: "Utilities",
    paths: [
      "/qr-barcode", "/url-shortener", "/file-to-zip", "/calculators", "/resume-builder",
      "/color-picker", "/json-formatter", "/base64-converter",
    ],
    items: [
      { href: "/resume-builder", label: "Resume / CV Builder", popular: true, iconKey: "FileText" },
      { href: "/calculators", label: "Calculators & Converters", popular: true, iconKey: "Calculator" },
      { href: "/color-picker", label: "Color Picker", popular: true, iconKey: "Pipette" },
      { href: "/json-formatter", label: "JSON Formatter", popular: true, iconKey: "Braces" },
      { href: "/base64-converter", label: "Base64 Encode/Decode", popular: true, iconKey: "Binary" },
      { href: "/qr-barcode", label: "QR & Barcode", popular: true, iconKey: "QrCode" },
      { href: "/url-shortener", label: "URL Shortener", iconKey: "Link2" },
      { href: "/file-to-zip", label: "File to ZIP", popular: true, iconKey: "Archive" },
    ],
  },
  {
    title: "Maps & Location",
    paths: ["/radius-map", "/coordinates-finder", "/address-to-latlong", "/embed-map-generator", "/distance-calculator"],
    items: [
      { href: "/radius-map", label: "Radius Map Tool", iconKey: "MapPin" },
      { href: "/coordinates-finder", label: "Coordinates Finder", iconKey: "MapPin" },
      { href: "/address-to-latlong", label: "Address → Lat Long Converter", iconKey: "MapPin" },
      { href: "/embed-map-generator", label: "Embed Map Generator", popular: true, iconKey: "MapPin" },
      { href: "/distance-calculator", label: "Distance Calculator", popular: true, iconKey: "MapPin" },
    ],
  },
];

// All paths for "Other Tools" (for active state detection)
export const OTHER_TOOLS_PATHS = OTHER_TOOLS_SECTIONS.flatMap((section) => section.paths);

// Combined categories for mobile menu and for landing/docs
export const TOOL_CATEGORIES = [
  ...MAIN_CATEGORIES,
  {
    label: "Other Tools",
    paths: OTHER_TOOLS_PATHS,
    items: OTHER_TOOLS_SECTIONS.flatMap((section) => section.items),
  },
];

// Flat list of all tools for SEO and sitemaps
export const ALL_TOOLS = [
  ...MAIN_CATEGORIES.flatMap((c) => c.items),
  ...OTHER_TOOLS_SECTIONS.flatMap((s) => s.items),
];

// Category names for SEO keywords and structured data
export const CATEGORY_NAMES = [
  "Image Tools",
  "Document Tools",
  "AI Tools",
  "Video Tools",
  "Audio Tools",
  "Utilities",
  "Maps & Location",
  "Security and Privacy",
];
