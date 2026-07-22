import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Zap, Shield, Download, Image, Video, FileText, Music,
  ArrowRight, CheckCircle, Lock, Clock, Globe, Star,
  FileImage, ScanLine, Type, Minimize2, Merge, QrCode, Link2, Archive,
  Mail, Phone, Database, Server, Calculator, ChevronDown,
  Hash, Pipette, Braces, Binary, Sparkles,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MAIN_CATEGORIES, OTHER_TOOLS_SECTIONS } from "../lib/toolsConfig";
import { organizationSchema, websiteSchema, faqPageSchema, combineSchemas } from "../lib/structuredData";

const ICON_MAP = {
  Image, FileText, Video, Music, QrCode, Link2, Archive, Lock, Shield, Globe,
  Mail, Phone, Database, Server, FileImage, ScanLine, Type, Minimize2, Merge, Calculator,
  Hash, Pipette, Braces, Binary, Sparkles,
};

const POPULAR_TOOLS = [
  { href: "/ai-paraphraser", label: "AI Paraphraser", iconKey: "Sparkles" },
  { href: "/ai-summarizer", label: "AI Summarizer", iconKey: "Sparkles" },
  { href: "/heic-to-jpg", label: "HEIC to JPG", iconKey: "Image" },
  { href: "/convert", label: "Image Converter", iconKey: "Image" },
  { href: "/pdf-to-image", label: "PDF to JPG/PNG", iconKey: "FileImage" },
  { href: "/ai-image-upscaler", label: "AI Upscaler", iconKey: "Sparkles" },
  { href: "/compress", label: "Image Compressor", iconKey: "Minimize2" },
  { href: "/password-generator", label: "Password Generator", iconKey: "Lock" },
];

const HOME_FAQS = [
  { q: "Is ConvertMastery really free?", a: "Yes. Core converters, PDF tools, and AI tools (paraphraser, summarizer, email writer, image upscaler) are free to use. AI text tools include a fair daily quota. Optional sign-in unlocks advanced settings only — we never store your files." },
  { q: "Are my files uploaded to your servers?", a: "Most converters and the AI image upscaler process in your browser. AI text tools send only the text you paste to generate a response — files are not saved to a database or My Orders." },
  { q: "What AI tools do you offer?", a: "Free AI Paraphraser, AI Summarizer (text or PDF extract), AI Email Writer, AI Image Upscaler (browser-based), and Hermes AI chat." },
  { q: "What formats can I convert?", a: "Images (HEIC, JPG, PNG, WebP), videos (MP4, WebM), documents (PDF, DOCX), and audio (MP3, WAV, OGG), plus PDF and security utilities." },
  { q: "Do I need to install software?", a: "No. ConvertMastery runs entirely in your web browser on any modern device." },
];

const LANDING_CATEGORIES = [
  ...MAIN_CATEGORIES.map((c) => ({ label: c.label, href: c.items[0].href, iconKey: c.items[0].iconKey })),
  ...OTHER_TOOLS_SECTIONS.map((s) => ({ label: s.title, href: s.items[0].href, iconKey: s.items[0].iconKey })),
];

const FEATURES = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Process multiple files simultaneously with our optimized engine",
    gradient: "from-brand-mid to-primary",
  },
  {
    icon: Shield,
    title: "100% Private & Secure",
    description: "All processing happens locally in your browser. Your files never leave your device",
    gradient: "from-primary to-brand-navy",
  },
  {
    icon: Download,
    title: "Universal Format Support",
    description: "Support for images, videos, documents, and audio in all major formats",
    gradient: "from-brand-sky to-brand-mid",
  },
  {
    icon: Lock,
    title: "No Upload Required",
    description: "Zero data transmission. Everything processes client-side for maximum privacy",
    gradient: "from-brand-mid to-brand-navy",
  },
  {
    icon: Clock,
    title: "Batch Processing",
    description: "Convert or compress multiple files at once to save time",
    gradient: "from-brand-mid to-primary",
  },
  {
    icon: Globe,
    title: "Works Everywhere",
    description: "No installation needed. Works on any device with a modern browser",
    gradient: "from-primary to-brand-mid",
  },
];

function SectionHeading({ title, subtitle, className }) {
  return (
    <div className={cn("text-center mb-12 md:mb-16", className)}>
      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function FaqAccordion({ faqs }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => {
        const open = openIndex === i;
        return (
          <div
            key={i}
            className={cn(
              "rounded-xl border bg-card transition-all",
              open ? "border-primary/30 shadow-sm shadow-primary/5" : "border-border hover:border-brand-mid/40"
            )}
          >
            <button
              type="button"
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset rounded-xl"
              onClick={() => setOpenIndex(open ? -1 : i)}
              aria-expanded={open}
            >
              <span className="font-semibold text-foreground pr-2">{faq.q}</span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180 text-primary"
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-200 ease-out",
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed m-0">
                  {faq.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const structuredData = combineSchemas(
    organizationSchema(),
    websiteSchema(),
    faqPageSchema(HOME_FAQS)
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Free File Converter, AI Tools & PDF Utilities – ConvertMastery"
        description="Convert and compress files for free. Use AI paraphraser, summarizer, email writer, and image upscaler. Image, video, PDF, and privacy tools — nothing saved to our servers."
        keywords="free file converter, AI paraphraser, AI summarizer, AI email writer, AI image upscaler, image converter, HEIC converter, PDF tools, video converter, password generator, online file tools"
        url="/"
        structuredData={structuredData}
      />
      <Navbar />

      <main className="flex-1">
        {/* Hero — first full viewport */}
        <section
          className="relative flex min-h-[calc(100dvh-4.25rem)] flex-col overflow-hidden bg-gradient-to-br from-background via-brand-sky/40 to-secondary dark:from-background dark:via-muted/40 dark:to-background"
          aria-label="ConvertMastery"
        >
          <div
            className="absolute inset-0 opacity-40 dark:opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
            aria-hidden
          />
          {/* Soft brand atmosphere */}
          <div
            className="pointer-events-none absolute -right-24 -top-16 h-64 w-64 rounded-full bg-brand-sky/50 blur-3xl sm:h-80 sm:w-80 md:right-0"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-20 bottom-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl sm:h-64 sm:w-64"
            aria-hidden
          />

          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-10 md:py-14">
            <div className="mx-auto w-full max-w-3xl text-center">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80 sm:mb-4 sm:text-xs animate-[cm-hero-in_0.55s_ease-out_both]">
                Free online file tools
              </p>

              <h1 className="text-[2.65rem] leading-[1.05] font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-[5.25rem] animate-[cm-hero-in_0.6s_ease-out_0.05s_both]">
                <span className="bg-gradient-to-r from-brand-navy via-primary to-brand-mid bg-clip-text text-transparent dark:from-brand-sky dark:via-brand-mid dark:to-primary">
                  ConvertMastery
                </span>
              </h1>

              <p className="mx-auto mt-3 max-w-[20rem] text-[15px] leading-snug text-muted-foreground sm:mt-5 sm:max-w-xl sm:text-lg sm:leading-relaxed md:text-xl animate-[cm-hero-in_0.6s_ease-out_0.1s_both]">
                Convert &amp; compress in seconds —{" "}
                <span className="font-semibold text-foreground">free &amp; private.</span>
              </p>

              <div className="mt-6 flex w-full max-w-sm flex-col gap-2.5 mx-auto sm:mt-8 sm:max-w-none sm:flex-row sm:justify-center sm:gap-3 animate-[cm-hero-in_0.65s_ease-out_0.15s_both]">
                <Link href="/convert" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="h-12 w-full text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 sm:min-w-[200px]"
                  >
                    Start Converting
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/compress" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 w-full bg-card/70 text-base font-semibold backdrop-blur-sm sm:min-w-[200px]"
                  >
                    Compress Files
                  </Button>
                </Link>
              </div>

              {/* Value strip — compact on mobile, no stacked cards */}
              <div className="mx-auto mt-7 max-w-2xl animate-[cm-hero-in_0.7s_ease-out_0.22s_both] sm:mt-9">
                <div className="flex items-stretch justify-between gap-0 overflow-hidden rounded-2xl border border-brand-mid/25 bg-card/90 px-1 py-3 shadow-sm shadow-primary/5 backdrop-blur-md sm:grid sm:grid-cols-3 sm:gap-0 sm:px-0 sm:py-0">
                  {[
                    { label: "Free forever", sub: "No credit card" },
                    { label: "40+ tools", sub: "One platform" },
                    { label: "In-browser", sub: "Privacy-first" },
                  ].map((stat, i) => (
                    <div
                      key={stat.label}
                      className={cn(
                        "flex flex-1 flex-col items-center justify-center px-2 sm:px-4 sm:py-4",
                        i > 0 && "border-l border-brand-mid/20"
                      )}
                    >
                      <div className="text-[12px] font-bold leading-tight text-brand-navy sm:text-sm">
                        {stat.label}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">
                        {stat.sub}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 hidden flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground sm:mt-6 sm:flex animate-[cm-hero-in_0.7s_ease-out_0.28s_both]">
                {["100% Free", "No install", "Privacy-first"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 flex justify-center pb-4 sm:pb-5 md:pb-7">
            <a
              href="#browse-tools"
              className="inline-flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Scroll to browse tools"
            >
              <span className="text-[10px] font-semibold tracking-[0.16em] uppercase sm:text-xs">
                Explore tools
              </span>
              <ChevronDown className="h-4 w-4 animate-bounce sm:h-5 sm:w-5" aria-hidden />
            </a>
          </div>
        </section>

        {/* Browse by Category */}
        <section id="browse-tools" className="py-20 bg-card border-y border-border/60 scroll-mt-20">
          <div className="container mx-auto px-4">
            <SectionHeading
              title="Browse Tools by Category"
              subtitle="AI, image, document, video, audio, security, and utility tools — all free and online."
            />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
              {[
                ...MAIN_CATEGORIES,
                ...OTHER_TOOLS_SECTIONS.map((s) => ({ label: s.title, items: s.items })),
              ].map((cat) => (
                <Card
                  key={cat.label}
                  className="border border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 group"
                >
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                        {cat.label}
                      </h3>
                    </div>
                    <ul className="space-y-2">
                      {cat.items.slice(0, 6).map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Tools */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <SectionHeading
              title="Popular Tools"
              subtitle="Most-used AI tools, converters, and utilities on ConvertMastery"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {POPULAR_TOOLS.map((tool) => {
                const Icon = ICON_MAP[tool.iconKey] || FileText;
                return (
                  <Link key={tool.href} href={tool.href} className="group">
                    <Card className="border border-border hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 h-full">
                      <CardContent className="pt-6 pb-6 text-center flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-sky/70 dark:bg-accent text-primary group-hover:scale-110 transition-transform">
                          <Icon className="h-6 w-6" aria-hidden />
                        </div>
                        <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                          {tool.label}
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why Trust + Privacy */}
        <section className="py-20 bg-card border-y border-border/60">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-5 tracking-tight">
                  Why Trust ConvertMastery?
                </h2>
                <ul className="space-y-4 text-muted-foreground">
                  <li className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Transparent policies</strong> — clear{" "}
                      <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>,{" "}
                      <Link href="/terms-and-conditions" className="text-primary hover:underline">Terms</Link>, and{" "}
                      <Link href="/disclaimer" className="text-primary hover:underline">Disclaimer</Link>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">No hidden fees</strong> — core tools are free with no credit card required
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Responsible tools</strong> — security utilities include clear disclaimers and acceptable-use guidance
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Helpful content</strong> — every tool includes guides, FAQs, and related resources
                    </span>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-border bg-background p-6 md:p-8">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-sky/70 dark:bg-accent text-primary mb-4">
                  <Shield className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
                  Privacy-First Processing
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Your privacy matters. Most conversions and compressions happen entirely in your browser.
                  Files are not uploaded to our servers for standard image, video, and PDF tools.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  When server processing is needed, files are handled securely and not stored permanently.
                  Read our{" "}
                  <Link href="/privacy-policy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>{" "}
                  for details.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* All-in-One categories */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <SectionHeading
              title="All-in-One Conversion, AI & Privacy Tools"
              subtitle="Convert images, videos, documents, and audio. Rewrite and summarize with AI. Plus security and utility tools — all in one place."
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {LANDING_CATEGORIES.map((cat) => {
                const Icon = ICON_MAP[cat.iconKey] || FileText;
                return (
                  <Link key={cat.href} href={cat.href} className="group">
                    <Card className="border border-border hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 cursor-pointer h-full">
                      <CardContent className="pt-6 pb-6 text-center flex flex-col items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-sky/70 dark:bg-accent text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Icon className="h-7 w-7 group-hover:scale-110 transition-transform" />
                        </div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {cat.label}
                        </h3>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Sign Up Benefits */}
        <section className="py-20 bg-gradient-to-br from-brand-sky/30 via-background to-secondary/50 dark:from-muted/40 dark:via-background dark:to-muted/20 border-y border-border/60">
          <div className="container mx-auto px-4">
            <SectionHeading
              title="Optional Sign-In for Advanced Options"
              subtitle="Tools work without an account. Sign in only if you want extra settings — files are never saved to our servers."
            />
            <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {[
                {
                  icon: Shield,
                  title: "On-the-Fly Processing",
                  desc: "Convert and download in your session. Nothing is stored in a database or My Orders.",
                  gradient: "from-brand-sky to-brand-mid",
                },
                {
                  icon: Star,
                  title: "Advanced Options",
                  desc: "Optional sign-in unlocks watermarking, custom file names, format presets, and more.",
                  gradient: "from-brand-mid to-brand-navy",
                },
                {
                  icon: Zap,
                  title: "Instant Download",
                  desc: "Get your files immediately after processing. No account required for core tools.",
                  gradient: "from-brand-mid to-primary",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.title}
                    className="border border-primary/15 hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 bg-card"
                  >
                    <CardContent className="pt-6 pb-6 text-center">
                      <div
                        className={cn(
                          "inline-flex p-3 rounded-xl bg-gradient-to-br mb-4 shadow-sm",
                          item.gradient
                        )}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-bold text-lg mb-2 text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <SectionHeading
              title="Why Choose ConvertMastery?"
              subtitle="Built for professionals who value speed, security, and simplicity"
            />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={feature.title}
                    className="border border-border hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 group"
                  >
                    <CardContent className="pt-6 pb-6">
                      <div
                        className={cn(
                          "inline-flex p-3 rounded-xl bg-gradient-to-br mb-4 shadow-sm group-hover:scale-105 transition-transform",
                          feature.gradient
                        )}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-bold text-lg mb-2 text-foreground">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="py-20 bg-card border-y border-border/60">
          <div className="container mx-auto px-4 max-w-3xl">
            <SectionHeading title="Frequently Asked Questions" />
            <FaqAccordion faqs={HOME_FAQS} />
            <p className="text-center mt-8 text-muted-foreground text-sm">
              More guides in our{" "}
              <Link href="/blog" className="text-primary hover:underline font-medium">
                Blog &amp; Guides
              </Link>{" "}
              section.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-gradient-to-br from-primary/10 via-brand-sky/20 to-background dark:from-primary/15 dark:via-muted/30 dark:to-background">
          <div className="container mx-auto px-4">
            <Card className="border border-primary/25 bg-card max-w-4xl mx-auto overflow-hidden shadow-xl shadow-primary/10">
              <div className="h-1.5 w-full bg-gradient-to-r from-brand-navy via-primary to-brand-mid" />
              <CardContent className="pt-12 pb-12 px-6 md:px-10 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
                  Ready to Transform Your Files?
                </h2>
                <p className="text-lg text-muted-foreground mb-3 max-w-2xl mx-auto leading-relaxed">
                  Join thousands of users who trust ConvertMastery. Start converting now — it&apos;s free and takes seconds.
                </p>
                <p className="text-sm text-muted-foreground mb-8 max-w-2xl mx-auto">
                  <span className="font-semibold text-primary">Private by design</span> — process on the fly and download instantly. Nothing is saved to our servers.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/convert">
                    <Button
                      size="lg"
                      className="min-w-[200px] h-12 text-base font-semibold shadow-lg shadow-primary/25"
                    >
                      Get Started Free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/guide">
                    <Button size="lg" variant="outline" className="min-w-[200px] h-12 text-base font-semibold">
                      View Documentation
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
