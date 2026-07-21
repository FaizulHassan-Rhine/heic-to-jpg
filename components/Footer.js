import Link from "next/link";
import NextImage from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { Mail } from "lucide-react";
import { FOOTER_LINKS, SITE_EMAIL, SITE_NAME } from "../lib/siteConfig";
import { getSeoByPath } from "../lib/seoContent";
import { MAIN_CATEGORIES } from "../lib/toolsConfig";

const ToolSeoContent = dynamic(() => import("./ToolSeoContent"), { ssr: true });

const POPULAR_TOOLS = [
  { href: "/convert", label: "Image Converter" },
  { href: "/compress", label: "Image Compressor" },
  { href: "/heic-to-jpg", label: "HEIC to JPG" },
  { href: "/merge-pdf", label: "Merge PDF" },
  { href: "/compress-pdf", label: "Compress PDF" },
  { href: "/password-generator", label: "Password Generator" },
  { href: "/background-remover", label: "Background Remover" },
  { href: "/qr-barcode", label: "QR & Barcode" },
];

export default function Footer() {
  const router = useRouter();
  const seo = getSeoByPath(router.pathname);
  const toolContent = seo?.type === "tool" ? seo : null;

  return (
    <>
      {toolContent?.disclaimer && (
        <div className="border-t border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <div className="container mx-auto px-4 py-4 max-w-4xl">
            <p className="text-sm text-amber-900 dark:text-amber-200 m-0">
              <strong>Responsible use:</strong> {toolContent.disclaimer}
            </p>
          </div>
        </div>
      )}
      {toolContent && <ToolSeoContent content={toolContent} />}

      <div
        className="h-1 w-full bg-gradient-to-r from-brand-navy via-primary to-brand-mid"
        aria-hidden
      />

      <footer className="border-t border-border bg-card text-card-foreground">
        <div className="container mx-auto px-4 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-4 lg:col-span-1">
              <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
                <NextImage
                  src="/logo.png"
                  alt={`${SITE_NAME} logo`}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-md"
                />
                <span className="font-bold text-lg tracking-tight">
                  Convert<span className="text-primary">Mastery</span>
                </span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-xs">
                Free online file conversion, compression, PDF, and privacy tools.
                Fast, secure, and privacy-first — right in your browser.
              </p>
              <a
                href={`mailto:${SITE_EMAIL}`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-sky/60 dark:bg-accent text-primary">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                {SITE_EMAIL}
              </a>
            </div>

            {/* Company */}
            <div>
              <h2 className="font-semibold text-sm mb-4 text-foreground tracking-wide uppercase text-[11px] text-muted-foreground">
                Company
              </h2>
              <ul className="space-y-2.5">
                {FOOTER_LINKS.company.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h2 className="font-semibold text-sm mb-4 tracking-wide uppercase text-[11px] text-muted-foreground">
                Legal
              </h2>
              <ul className="space-y-2.5">
                {FOOTER_LINKS.legal.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h2 className="font-semibold text-sm mb-4 tracking-wide uppercase text-[11px] text-muted-foreground">
                Categories
              </h2>
              <ul className="space-y-2.5">
                {MAIN_CATEGORIES.map((cat) => (
                  <li key={cat.label}>
                    <Link
                      href={cat.items[0]?.href || "/"}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {cat.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/video-convert"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Video & Audio
                  </Link>
                </li>
              </ul>
            </div>

            {/* Popular Tools */}
            <div>
              <h2 className="font-semibold text-sm mb-4 tracking-wide uppercase text-[11px] text-muted-foreground">
                Popular Tools
              </h2>
              <ul className="space-y-2.5">
                {POPULAR_TOOLS.map((tool) => (
                  <li key={tool.href}>
                    <Link
                      href={tool.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {tool.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {FOOTER_LINKS.legal.slice(0, 3).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
