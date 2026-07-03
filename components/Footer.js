import Link from "next/link";
import NextImage from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { FOOTER_LINKS } from "../lib/siteConfig";
import { getSeoByPath } from "../lib/seoContent";

const ToolSeoContent = dynamic(() => import("./ToolSeoContent"), { ssr: true });

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
      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <NextImage
                  src="/logo.png"
                  alt="ConvertMastery logo"
                  width={32}
                  height={32}
                  className="h-8 w-8"
                />
                <span className="font-bold text-lg">ConvertMastery</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Free online file conversion, compression, PDF, and privacy tools. Fast, secure, and privacy-first.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-sm mb-4 text-foreground">Company</h2>
              <ul className="space-y-2">
                {FOOTER_LINKS.company.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-semibold text-sm mb-4 text-foreground">Legal</h2>
              <ul className="space-y-2">
                {FOOTER_LINKS.legal.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-semibold text-sm mb-4 text-foreground">Popular Tools</h2>
              <ul className="space-y-2">
                <li><Link href="/convert" className="text-sm text-muted-foreground hover:text-primary transition-colors">Image Converter</Link></li>
                <li><Link href="/compress" className="text-sm text-muted-foreground hover:text-primary transition-colors">Image Compressor</Link></li>
                <li><Link href="/heic-to-jpg" className="text-sm text-muted-foreground hover:text-primary transition-colors">HEIC to JPG</Link></li>
                <li><Link href="/merge-pdf" className="text-sm text-muted-foreground hover:text-primary transition-colors">Merge PDF</Link></li>
                <li><Link href="/password-generator" className="text-sm text-muted-foreground hover:text-primary transition-colors">Password Generator</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ConvertMastery. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
