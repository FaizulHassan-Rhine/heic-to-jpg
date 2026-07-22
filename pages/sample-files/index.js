import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import SEO from "../../components/SEO";
import Breadcrumbs from "../../components/Breadcrumbs";
import { Button } from "../../components/ui/button";
import { breadcrumbSchema, combineSchemas } from "../../lib/structuredData";
import { SITE_URL } from "../../lib/siteConfig";
import { getSampleFormatSummaries } from "../../lib/sampleFiles";
import { ArrowRight, Download, FileImage, Images } from "lucide-react";

const FORMATS = getSampleFormatSummaries();

export default function SampleFilesIndexPage() {
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Sample Files", href: "/sample-files" },
  ];

  const schemas = combineSchemas(breadcrumbSchema(breadcrumbs), {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Free Sample Image Files",
    description:
      "Download free JPG, PNG, WebP, AVIF, and HEIC sample images to test ConvertMastery converters.",
    url: `${SITE_URL}/sample-files`,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Free Sample Image Files – JPG, PNG, WebP, AVIF, HEIC"
        description="Download free sample JPG, PNG, WebP, AVIF, and HEIC images to test image converters, compressors, and AI upscalers. No signup required."
        url="/sample-files"
        structuredData={schemas}
      />
      <Navbar />

      <section className="relative border-b bg-gradient-to-br from-[#0F2854] via-[#1C4D8D] to-[#0F2854] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(189,232,245,0.25),_transparent_60%)]" />
        <div className="container mx-auto px-4 py-14 md:py-20 relative">
          <Breadcrumbs items={breadcrumbs} variant="light" className="mb-6" />
          <div className="flex items-center gap-2 text-[#BDE8F5] mb-4">
            <Images className="h-5 w-5" />
            <span className="text-sm font-medium">Free downloads</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 max-w-2xl">
            Sample Image Files
          </h1>
          <p className="text-lg text-white/80 max-w-2xl leading-relaxed">
            Browse free JPG, PNG, WebP, AVIF, and HEIC samples to try ConvertMastery converters
            and compressors — download instantly, no account needed.
          </p>
          <div className="mt-8">
            <Link href="/convert">
              <Button
                size="lg"
                className="h-12 px-8 bg-white text-[#0F2854] hover:bg-[#BDE8F5] hover:text-[#0F2854]"
              >
                Open Image Converter
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 py-12 md:py-16 max-w-5xl">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Browse by format</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Pick a format to preview samples, download files, or copy a direct link for testing.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FORMATS.map((format) => (
            <Link
              key={format.slug}
              href={`/sample-files/${format.slug}`}
              className="group block rounded-2xl border border-border bg-card overflow-hidden transition-all duration-200 hover:border-brand-mid/50 hover:shadow-lg hover:shadow-brand-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                {format.previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={format.previewSrc}
                    alt={`${format.label} sample preview`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-navy/90 to-primary/80 text-white">
                    <FileImage className="h-10 w-10 opacity-80" />
                    <span className="text-sm font-medium opacity-90">Preview unavailable</span>
                  </div>
                )}
                <span className="absolute top-3 left-3 rounded-md bg-[#0F2854]/85 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {format.label}
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {format.label} samples
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                  {format.description}
                </p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Download className="h-3.5 w-3.5" />
                    {format.count} files · {format.totalSizeLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-primary">
                    Browse
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-16 rounded-2xl border border-border bg-gradient-to-br from-brand-sky/40 via-card to-card dark:from-accent/40 p-8 md:p-10">
          <h2 className="text-xl font-bold text-foreground">Ready to convert?</h2>
          <p className="mt-2 text-muted-foreground max-w-xl">
            Download a sample, then drop it into our free converter — files stay in your browser when possible.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/convert">
              <Button>Image Converter</Button>
            </Link>
            <Link href="/heic-to-jpg">
              <Button variant="outline">HEIC to JPG</Button>
            </Link>
            <Link href="/compress">
              <Button variant="outline">Compress Images</Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
