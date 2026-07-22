import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import SEO from "../../components/SEO";
import Breadcrumbs from "../../components/Breadcrumbs";
import { Button } from "../../components/ui/button";
import { breadcrumbSchema, combineSchemas } from "../../lib/structuredData";
import { SITE_URL } from "../../lib/siteConfig";
import {
  getAllSampleFormatSlugs,
  getFormatBySlug,
  getSampleFiles,
} from "../../lib/sampleFiles";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  FileImage,
  Link2,
} from "lucide-react";

function SampleCard({ file }) {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const preview = !imgError && file.previewSrc ? file.previewSrc : null;

  const absoluteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${file.src}`
      : `${SITE_URL}${file.src}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={file.displayName}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setImgError(true)}
            />
            {file.usesJpgThumb && (
              <span className="absolute top-3 left-3 rounded-md bg-[#0F2854]/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                {file.formatLabel}
              </span>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-brand-navy via-primary to-brand-mid text-white p-6 text-center">
            <FileImage className="h-12 w-12 opacity-90" />
            <div>
              <p className="font-semibold">{file.formatLabel} file</p>
              <p className="mt-1 text-sm text-white/75">Preview unavailable — download to convert</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-semibold text-foreground leading-snug line-clamp-2">
          {file.displayName}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground truncate" title={file.name}>
          {file.name}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{file.sizeLabel}</p>
        <div className="mt-auto pt-4 flex flex-wrap gap-2">
          <a href={file.src} download={file.downloadName}>
            <Button size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </a>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function SampleFormatPage({ format, files }) {
  const router = useRouter();

  if (router.isFallback || !format) {
    return null;
  }

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Sample Files", href: "/sample-files" },
    { name: `${format.label} Samples`, href: `/sample-files/${format.slug}` },
  ];

  const schemas = combineSchemas(breadcrumbSchema(breadcrumbs), {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Free ${format.label} Sample Files`,
    description: format.description,
    url: `${SITE_URL}/sample-files/${format.slug}`,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={`Free ${format.label} Sample Files to Download – ConvertMastery`}
        description={`Download free ${format.label} sample images for testing converters, compressors, and AI upscalers. ${format.description}`}
        url={`/sample-files/${format.slug}`}
        structuredData={schemas}
      />
      <Navbar />

      <section className="relative border-b bg-gradient-to-br from-[#0F2854] via-[#1C4D8D] to-[#0F2854] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(189,232,245,0.25),_transparent_60%)]" />
        <div className="container mx-auto px-4 py-12 md:py-16 relative max-w-5xl">
          <Breadcrumbs items={breadcrumbs} variant="light" className="mb-6" />
          <Link
            href="/sample-files"
            className="inline-flex items-center gap-1.5 text-sm text-[#BDE8F5] hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            All formats
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Free {format.label} Sample Files
          </h1>
          <p className="text-lg text-white/80 max-w-2xl leading-relaxed">{format.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={format.convertPath}>
              <Button
                size="lg"
                className="h-11 px-6 bg-white text-[#0F2854] hover:bg-[#BDE8F5] hover:text-[#0F2854]"
              >
                {format.convertLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <span className="inline-flex items-center gap-2 rounded-md bg-white/10 border border-white/20 px-3 py-2 text-sm text-white/90">
              <Link2 className="h-3.5 w-3.5" />
              {files.length} files
            </span>
          </div>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 py-12 md:py-16 max-w-5xl">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map((file) => (
            <SampleCard key={file.id} file={file} />
          ))}
        </div>

        <section className="mt-14">
          <h2 className="text-lg font-semibold text-foreground mb-4">Related tools</h2>
          <div className="flex flex-wrap gap-2">
            {format.related.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant="outline" size="sm">
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        </section>

        <nav className="mt-12 flex flex-wrap gap-2 border-t border-border pt-8" aria-label="Other formats">
          {getAllSampleFormatSlugs()
            .filter((s) => s !== format.slug)
            .map((slug) => {
              const other = getFormatBySlug(slug);
              return (
                <Link key={slug} href={`/sample-files/${slug}`}>
                  <Button variant="ghost" size="sm">
                    {other.label} samples
                  </Button>
                </Link>
              );
            })}
        </nav>
      </main>

      <Footer />
    </div>
  );
}

export async function getStaticPaths() {
  return {
    paths: getAllSampleFormatSlugs().map((format) => ({ params: { format } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const format = getFormatBySlug(params.format);
  if (!format) {
    return { notFound: true };
  }

  const {
    related,
    convertPath,
    convertLabel,
    canPreview,
    description,
    label,
    slug,
  } = format;

  return {
    props: {
      format: { slug, label, description, canPreview, convertPath, convertLabel, related },
      files: getSampleFiles(slug),
    },
  };
}
