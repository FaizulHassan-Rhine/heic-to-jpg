/** Free sample images for testing converters — files live in /public/images/samples */

export const SAMPLE_FORMATS = [
  {
    slug: "jpg",
    folder: "JPG",
    label: "JPG",
    ext: "jpg",
    mime: "image/jpeg",
    description:
      "JPEG sample photos for testing image converters, compressors, and quality settings.",
    canPreview: true,
    convertPath: "/convert?from=jpg&to=png",
    convertLabel: "Convert JPG",
    related: [
      { href: "/convert", label: "Image Converter" },
      { href: "/compress", label: "Compress Images" },
      { href: "/ai-image-upscaler", label: "AI Image Upscaler" },
      { href: "/jpg-to-webp", label: "JPG to WebP" },
    ],
  },
  {
    slug: "png",
    folder: "PNG",
    label: "PNG",
    ext: "png",
    mime: "image/png",
    description:
      "PNG samples with transparency-friendly photography — great for PNG to JPG and compression tests.",
    canPreview: true,
    convertPath: "/convert?from=png&to=jpg",
    convertLabel: "Convert PNG",
    related: [
      { href: "/convert", label: "Image Converter" },
      { href: "/png-to-jpg", label: "PNG to JPG" },
      { href: "/ai-image-upscaler", label: "AI Image Upscaler" },
      { href: "/compress", label: "Compress Images" },
    ],
  },
  {
    slug: "webp",
    folder: "WebP",
    label: "WebP",
    ext: "webp",
    mime: "image/webp",
    description:
      "Modern WebP samples for checking browser support and converting WebP to JPG or PNG.",
    canPreview: true,
    convertPath: "/webp-to-jpg",
    convertLabel: "WebP to JPG",
    related: [
      { href: "/convert", label: "Image Converter" },
      { href: "/webp-to-jpg", label: "WebP to JPG" },
      { href: "/ai-image-upscaler", label: "AI Image Upscaler" },
      { href: "/compress", label: "Compress Images" },
    ],
  },
  {
    slug: "avif",
    folder: "AVIF",
    label: "AVIF",
    ext: "avif",
    mime: "image/avif",
    description:
      "AVIF samples for next-gen image conversion and size comparisons against JPG and WebP.",
    canPreview: true,
    convertPath: "/convert?from=avif&to=jpg",
    convertLabel: "Convert AVIF",
    related: [
      { href: "/convert", label: "Image Converter" },
      { href: "/compress", label: "Compress Images" },
    ],
  },
  {
    slug: "heic",
    folder: "HEIC",
    label: "HEIC",
    ext: "heic",
    mime: "image/heic",
    description:
      "Apple HEIC samples for testing HEIC to JPG conversion. Previews are shown as JPG thumbnails — download the original .heic to convert.",
    canPreview: true,
    usesJpgThumb: true,
    convertPath: "/heic-to-jpg",
    convertLabel: "HEIC to JPG",
    related: [
      { href: "/heic-to-jpg", label: "HEIC to JPG" },
      { href: "/convert", label: "Image Converter" },
    ],
  },
];

/** Generated from public/images/samples — update when adding files */
const FILES_BY_FOLDER = {
  JPG: [
    { name: "clary-garcia-KKk9kT78TxY-unsplash.jpg", size: 1412136 },
    { name: "elisabeth-arnold-oPmIQeKYeqc-unsplash.jpg", size: 582044 },
    { name: "jamshaid-mughal-rjbNlX7l2vU-unsplash.jpg", size: 662967 },
    { name: "octavio-fossatti-wW177LpJYV0-unsplash.jpg", size: 332098 },
    { name: "them-snapshots-uIA8XUS8vzQ-unsplash.jpg", size: 856921 },
  ],
  PNG: [
    { name: "charlesdeluvio-zqhe4qjVTJI-unsplash.png", size: 3866237 },
    { name: "daniel-shapiro-9ntUBN_wACE-unsplash.png", size: 2499702 },
    { name: "david-clode-N1fh1_TmwPE-unsplash.png", size: 4999701 },
    { name: "tobias-rademacher-LPi4gHZrL1w-unsplash.png", size: 2320539 },
    { name: "vika-chartier-5YZ6pU3xdK0-unsplash (1).png", size: 2299586 },
  ],
  WebP: [
    { name: "ahmetyuksek-amalfi-10329298_1280.webp", size: 239468 },
    { name: "akirevarga-bee-10368436_1280.webp", size: 44616 },
    { name: "ruslansikunov-rose-10268182_1280.webp", size: 30034 },
    { name: "wolfgang_hasselmann-antelope-10348361_1280.webp", size: 93506 },
    { name: "wolfgang_hasselmann-cygnet-10361421_1280.webp", size: 73536 },
  ],
  AVIF: [
    { name: "Mountain.avif", size: 35402 },
    { name: "night.avif", size: 157332 },
    { name: "premium_photo.avif", size: 317873 },
    { name: "river.avif", size: 66354 },
    { name: "wild.avif", size: 265223 },
  ],
  HEIC: [
    { name: "chef-with-trumpet.heic", size: 1618040 },
    { name: "classic-car.heic", size: 1960764 },
    { name: "desert.heic", size: 351970 },
    { name: "greyhounds-looking-for-a-table.heic", size: 1721433 },
    { name: "shelf-christmas-decoration.heic", size: 1442278 },
  ],
};

function titleFromFilename(name) {
  let base = name.replace(/\.[^.]+$/, "");
  base = base.replace(/\s*\(\d+\)\s*$/, "");
  base = base.replace(/-unsplash$/i, "");
  // Drop Unsplash-style photo ids (may include underscores)
  base = base.replace(/-[A-Za-z0-9_]{8,}$/i, "");
  // Drop trailing stock / dimension ids (e.g. 10329298_1280)
  base = base.replace(/[-_]?\d{5,}(?:_\d+)?$/g, "");
  return (
    base
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase()) || name
  );
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getFormatBySlug(slug) {
  return SAMPLE_FORMATS.find((f) => f.slug === slug.toLowerCase()) || null;
}

export function getSampleFiles(slug) {
  const format = getFormatBySlug(slug);
  if (!format) return [];
  const files = FILES_BY_FOLDER[format.folder] || [];
  return files.map((file, i) => {
    const src = `/images/samples/${format.folder}/${encodeURIComponent(file.name)}`;
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const previewSrc = format.usesJpgThumb
      ? `/images/samples/${format.folder}/previews/${encodeURIComponent(baseName)}.jpg`
      : src;
    return {
      id: `${format.slug}-${i + 1}`,
      name: file.name,
      displayName: titleFromFilename(file.name),
      size: file.size,
      sizeLabel: formatFileSize(file.size),
      src,
      previewSrc,
      downloadName: file.name,
      format: format.slug,
      formatLabel: format.label,
      canPreview: Boolean(previewSrc),
      usesJpgThumb: Boolean(format.usesJpgThumb),
    };
  });
}

export function getAllSampleFormatSlugs() {
  return SAMPLE_FORMATS.map((f) => f.slug);
}

export function getSampleFormatSummaries() {
  return SAMPLE_FORMATS.map((format) => {
    const files = getSampleFiles(format.slug);
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    return {
      ...format,
      count: files.length,
      totalSizeLabel: formatFileSize(totalBytes),
      previewSrc: files[0]?.previewSrc || null,
    };
  });
}

export function getSampleSitemapPaths() {
  return ["/sample-files", ...SAMPLE_FORMATS.map((f) => `/sample-files/${f.slug}`)];
}
