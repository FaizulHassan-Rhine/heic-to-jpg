export const BLOG_POSTS = [
  {
    slug: "how-to-convert-heic-to-jpg",
    title: "How to Convert HEIC to JPG on Any Device",
    description:
      "Step-by-step guide to converting iPhone HEIC photos to JPG for Windows, email, and web uploads using free online tools.",
    category: "File Conversion",
    datePublished: "2026-06-15",
    dateModified: "2026-07-01",
    readTime: "6 min",
    content: `
## Why HEIC Files Need Converting

Apple devices save photos in HEIC (High Efficiency Image Container) format by default. HEIC offers excellent compression, but many Windows apps, websites, and email clients still expect JPG.

## Method 1: Online Converter (Fastest)

1. Open ConvertMastery Image Converter or our dedicated HEIC to JPG page.
2. Upload your HEIC files.
3. Select JPG as the output format.
4. Download converted files.

Browser-based conversion keeps photos on your device—nothing is uploaded to cloud servers.

## Method 2: Change iPhone Camera Settings

Go to Settings → Camera → Formats → select "Most Compatible" to shoot JPG instead of HEIC going forward. This does not convert existing photos.

## Quality Tips

- Use 85% quality for a good balance of size and clarity.
- Batch convert an entire folder with ZIP download.
- Strip EXIF metadata if sharing publicly.

## Related Tools

- [Image Compressor](/compress) — shrink JPG file size after conversion
- [Metadata Remover](/metadata-remover) — remove GPS and camera data
    `,
  },
  {
    slug: "compress-images-without-losing-quality",
    title: "How to Compress Images Without Losing Quality",
    description:
      "Learn practical techniques to reduce image file size for websites, email, and forms while keeping photos sharp.",
    category: "Image Compression",
    datePublished: "2026-06-20",
    dateModified: "2026-07-01",
    readTime: "7 min",
    content: `
## Why Image Compression Matters

Large images slow websites, fail upload limits, and fill storage. Smart compression reduces bytes while preserving visual quality.

## Choose the Right Format

- **JPG** — best for photographs
- **PNG** — logos and graphics needing transparency
- **WebP** — modern format, 25–35% smaller than JPG at similar quality

## Compression Techniques

### 1. Quality Settings
Lowering quality from 100% to 85% often cuts file size dramatically with little visible change.

### 2. Resize Dimensions
A 4000px photo displayed at 800px on a website wastes bandwidth. Resize to actual display size.

### 3. Target File Size
For forms requiring 100 KB or 200 KB limits, use target-size compression mode.

### 4. Strip Metadata
EXIF data can add kilobytes and expose location info. Remove it during compression.

## Tools on ConvertMastery

- [Image Compressor](/compress) — full control with presets
- [Compress to 100 KB](/compress-image-to-100kb) — portal-friendly size
- [JPG to WebP](/jpg-to-webp) — web performance optimization
    `,
  },
  {
    slug: "merge-and-split-pdf-guide",
    title: "How to Merge and Split PDF Files Online",
    description:
      "Complete guide to combining multiple PDFs into one file and extracting pages with free online PDF tools.",
    category: "PDF Tools",
    datePublished: "2026-06-25",
    dateModified: "2026-07-01",
    readTime: "5 min",
    content: `
## Merging PDFs

Need one file from many? PDF merge combines invoices, chapters, or scans.

1. Open [Merge PDF](/merge-pdf).
2. Upload two or more PDF files.
3. Drag to reorder.
4. Click Merge and download.

## Splitting PDFs

Extract specific pages or split every page into separate files.

1. Open [Split PDF](/split-pdf).
2. Upload your PDF.
3. Select pages or ranges.
4. Download individual files or a ZIP.

## Compressing After Merge

Merged files can be large. Run the result through [Compress PDF](/compress-pdf) before emailing.

## Privacy Note

ConvertMastery processes PDFs in your browser when possible. Your documents stay on your device.
    `,
  },
  {
    slug: "protect-your-privacy-online",
    title: "Protect Your Privacy Online: Passwords, Breaches & Metadata",
    description:
      "Practical privacy tips using password managers, breach checking, metadata removal, and responsible use of temporary email.",
    category: "Privacy & Security",
    datePublished: "2026-07-01",
    dateModified: "2026-07-03",
    readTime: "8 min",
    content: `
## Use Strong, Unique Passwords

Every account should have a unique password. Use our [Password Generator](/password-generator) and store credentials in a reputable password manager.

## Check for Data Breaches

If your email appears in a breach, change affected passwords immediately and enable two-factor authentication. Try our [Data Breach Checker](/data-breach-checker)—only for emails you own.

## Remove Photo Metadata

Photos can contain GPS coordinates and device info. Before sharing publicly, use [Metadata Remover](/metadata-remover).

## Temporary Email: Use Responsibly

Disposable email reduces spam for legitimate sign-ups and testing. Never use it for banking or critical accounts. See our [Disclaimer](/disclaimer) for acceptable use.

## Verify Websites Before Entering Data

Use [Website Security Score](/website-security-score) and [Whois Checker](/whois-checker) as informational tools—not guarantees of safety.

## Browser-Based Processing

ConvertMastery processes many files locally. Prefer tools that keep data on your device when handling sensitive content.
    `,
  },
];

export function getPostBySlug(slug) {
  return BLOG_POSTS.find((p) => p.slug === slug) || null;
}
