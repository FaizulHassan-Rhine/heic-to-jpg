import { PRIVACY_CLIENT_SIDE } from "./shared";

const imageRelated = [
  { href: "/convert", label: "Image Converter" },
  { href: "/compress", label: "Image Compressor" },
  { href: "/image-to-pdf", label: "Image to PDF" },
  { href: "/extract-text", label: "Extract Text (OCR)" },
  { href: "/background-remover", label: "Background Remover" },
  { href: "/ai-image-upscaler", label: "AI Image Upscaler" },
  { href: "/metadata-remover", label: "Metadata Remover" },
];

export const imageToolsSeo = {
  convert: {
    id: "convert",
    path: "/convert",
    title: "Free Image Converter Online – HEIC, JPG, PNG, WebP",
    description:
      "Convert images online for free. Change HEIC to JPG, PNG to WebP, and more. Batch convert with quality control. Private browser-based processing on ConvertMastery.",
    h1: "Free Online Image Converter",
    intro:
      "ConvertMastery Image Converter lets you change image formats in seconds without installing software. Whether you need to convert iPhone HEIC photos to JPG for sharing, turn PNG screenshots into WebP for the web, or batch-convert an entire folder, our tool handles it in your browser with adjustable quality, resize options, and optional metadata stripping.",
    howToUse: [
      "Drag and drop one or more images onto the upload area, or click to browse your files.",
      "Select your target format: JPG, PNG, WebP, or HEIC.",
      "Adjust quality, resize dimensions, rotation, and optional watermark settings.",
      "Click Convert and download individual files or a ZIP archive.",
    ],
    supportedFormats:
      "Input: HEIC, HEIF, JPG, JPEG, PNG, WebP, GIF, BMP, TIFF. Output: JPG, PNG, WebP, HEIC. Batch processing supported.",
    privacySecurity: PRIVACY_CLIENT_SIDE,
    useCases: [
      "Convert iPhone HEIC photos to JPG for email, social media, or Windows compatibility.",
      "Prepare WebP images for faster website loading without sacrificing quality.",
      "Batch-convert product photos for e-commerce listings.",
      "Rotate and resize images during conversion for consistent dimensions.",
    ],
    relatedTools: imageRelated.filter((t) => t.href !== "/convert"),
    faqs: [
      { q: "Is the image converter really free?", a: "Yes. ConvertMastery image conversion is free with no daily limits for standard use." },
      { q: "Are my images uploaded to a server?", a: "No. Conversion runs in your browser. Your files stay on your device." },
      { q: "Can I convert HEIC to JPG?", a: "Yes. HEIC to JPG is one of the most popular conversions on ConvertMastery." },
      { q: "Does converting reduce image quality?", a: "You control output quality. Higher quality settings preserve more detail; lower settings produce smaller files." },
      { q: "Can I convert multiple images at once?", a: "Yes. Upload multiple files and download them individually or as a ZIP." },
    ],
  },
  compress: {
    id: "compress",
    path: "/compress",
    title: "Free Image Compressor Online – Reduce File Size",
    description:
      "Compress images online without losing visible quality. Reduce JPG, PNG, and WebP file size for email, websites, and uploads. Target specific KB sizes. Free on ConvertMastery.",
    h1: "Free Online Image Compressor",
    intro:
      "Large image files slow down websites, bounce emails, and fail upload limits. ConvertMastery Image Compressor reduces file size while keeping your photos sharp. Set a target file size, use smart presets, resize by percentage or pixels, and strip metadata—all in your browser.",
    howToUse: [
      "Upload your JPG, PNG, or WebP images.",
      "Choose a compression preset (balanced, maximum, or custom quality).",
      "Optionally set a target file size in KB or resize dimensions.",
      "Compress and compare before/after file sizes, then download.",
    ],
    supportedFormats: "JPG, JPEG, PNG, WebP. Batch compression supported with per-file settings.",
    privacySecurity: PRIVACY_CLIENT_SIDE,
    useCases: [
      "Shrink photos for email attachments under provider size limits.",
      "Optimize images for faster page load and better Core Web Vitals.",
      "Compress ID scans and documents for online form uploads.",
      "Prepare social media images within platform file-size caps.",
    ],
    relatedTools: imageRelated.filter((t) => t.href !== "/compress"),
    faqs: [
      { q: "How much can I compress an image?", a: "Results vary by image content. Photos often shrink 40–80% with minimal visible loss at balanced settings." },
      { q: "Can I compress to 100 KB or 200 KB?", a: "Yes. Use target file size mode or our dedicated compress-to-100kb and compress-to-200kb landing pages." },
      { q: "Will compression remove EXIF metadata?", a: "You can enable metadata stripping to reduce size and protect location data." },
      { q: "Is batch compression supported?", a: "Yes. Process multiple images and download as a ZIP." },
    ],
  },
  "image-to-pdf": {
    id: "image-to-pdf",
    path: "/image-to-pdf",
    title: "Image to PDF Converter – JPG, PNG to PDF Free",
    description:
      "Convert JPG, PNG, and other images to PDF online. Merge multiple images into one PDF document. Free, fast, and private on ConvertMastery.",
    h1: "Image to PDF Converter",
    intro:
      "Turn photos, scans, and screenshots into professional PDF documents. ConvertMastery Image to PDF supports single or multiple images, page order control, and standard PDF output compatible with all readers and printers.",
    howToUse: [
      "Upload one or more images (JPG, PNG, WebP, etc.).",
      "Arrange page order if needed.",
      "Click Generate PDF and download your document.",
    ],
    supportedFormats: "Input: JPG, PNG, WebP, GIF, BMP. Output: PDF.",
    privacySecurity: PRIVACY_CLIENT_SIDE,
    useCases: [
      "Combine receipt photos into one PDF for expense reports.",
      "Create a PDF portfolio from design mockups.",
      "Convert scanned signatures or forms to PDF for submission.",
      "Package product images into a single shareable document.",
    ],
    relatedTools: [
      { href: "/merge-pdf", label: "Merge PDF" },
      { href: "/compress-pdf", label: "Compress PDF" },
      { href: "/convert", label: "Image Converter" },
      { href: "/scanner", label: "Document Scanner" },
    ],
    faqs: [
      { q: "Can I merge multiple images into one PDF?", a: "Yes. Upload several images and they are combined in order into a single PDF." },
      { q: "What image formats are supported?", a: "JPG, PNG, WebP, GIF, and BMP are supported as input." },
      { q: "Is there a page limit?", a: "Practical limits depend on your browser memory; most users can combine dozens of images." },
    ],
  },
  "extract-text": {
    id: "extract-text",
    path: "/extract-text",
    title: "Extract Text from Image (OCR) – Free Online",
    description:
      "Extract text from images and PDFs with free OCR. Copy text from screenshots, scans, and photos. Private processing on ConvertMastery.",
    h1: "Extract Text from Image (OCR)",
    intro:
      "Optical Character Recognition (OCR) turns non-selectable text in images into editable, copyable content. Upload a screenshot, scan, or photo and extract text for notes, documents, or accessibility workflows.",
    howToUse: [
      "Upload an image or PDF page.",
      "Wait for OCR processing to complete.",
      "Copy the extracted text or download as a text file.",
    ],
    supportedFormats: "JPG, PNG, WebP, PDF (single pages). Output: plain text.",
    privacySecurity: PRIVACY_CLIENT_SIDE,
    useCases: [
      "Copy text from screenshots without retyping.",
      "Digitize printed notes and business cards.",
      "Extract captions from social media images.",
      "Make scanned documents searchable.",
    ],
    relatedTools: [
      { href: "/scanner", label: "Document Scanner" },
      { href: "/pdf-to-doc", label: "PDF to DOCX" },
      { href: "/convert", label: "Image Converter" },
    ],
    faqs: [
      { q: "How accurate is OCR?", a: "Accuracy is best on clear, high-contrast text. Handwriting and low-resolution images may vary." },
      { q: "Does OCR work on PDFs?", a: "Yes, for image-based PDF pages." },
      { q: "Which languages are supported?", a: "English works well by default; results may vary for other languages." },
    ],
  },
  "background-remover": {
    id: "background-remover",
    path: "/background-remover",
    title: "Free Background Remover – Remove Image Background Online",
    description:
      "Remove image backgrounds online for free. Create transparent PNG cutouts for products, profiles, and designs. Browser-based on ConvertMastery.",
    h1: "Free Background Remover",
    intro:
      "Remove backgrounds from portraits, products, and graphics in seconds. ConvertMastery uses AI-powered segmentation in your browser to produce clean transparent PNGs for e-commerce, social media, and design projects.",
    howToUse: [
      "Upload a JPG or PNG image.",
      "Wait for automatic background detection.",
      "Download the result as a transparent PNG.",
    ],
    supportedFormats: "Input: JPG, PNG. Output: PNG with transparency.",
    privacySecurity: PRIVACY_CLIENT_SIDE,
    useCases: [
      "Create product photos with white or transparent backgrounds.",
      "Make profile pictures for LinkedIn or social platforms.",
      "Prepare assets for presentations and marketing materials.",
    ],
    relatedTools: imageRelated,
    faqs: [
      { q: "Is background removal free?", a: "Yes, standard use is free on ConvertMastery." },
      { q: "What file format is the output?", a: "PNG with alpha transparency." },
    ],
  },
  "favicon-generator": {
    id: "favicon-generator",
    path: "/favicon-generator",
    title: "Favicon Generator – Create ICO & PNG Icons Free",
    description: "Generate favicon.ico and multi-size PNG favicons from any image. Free favicon maker on ConvertMastery.",
    h1: "Favicon Generator",
    intro: "Upload a logo and download a ready-to-use favicon pack: classic ICO plus PNG sizes for browsers, Apple touch icons, and PWA manifests.",
    howToUse: ["Upload a square logo or icon.", "Generate the pack.", "Download the ZIP and add files to your site root."],
    supportedFormats: "Input: PNG, JPG, WebP, GIF, SVG. Output: favicon.ico + PNG sizes in ZIP.",
    privacySecurity: PRIVACY_CLIENT_SIDE,
    useCases: ["Brand a new website tab icon.", "Create Apple touch icons.", "Prepare PWA icon assets."],
    relatedTools: [
      { href: "/convert", label: "Image Converter" },
      { href: "/compress", label: "Image Compressor" },
      { href: "/background-remover", label: "Background Remover" },
    ],
    faqs: [
      { q: "What sizes are included?", a: "Common sizes from 16px to 512px plus a multi-resolution ICO." },
    ],
  },
};
