import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SEO from "./SEO";
import Breadcrumbs from "./Breadcrumbs";
import ProseContent from "./ProseContent";
import { Card, CardContent } from "./ui/card";
import { breadcrumbSchema } from "../lib/structuredData";
import { COMPANY_PAGES, LEGAL_PAGES } from "../lib/legalPages";
import { SITE_EMAIL } from "../lib/siteConfig";
import { Calendar, Mail, MessageSquare, Shield, ChevronRight, List } from "lucide-react";
import { cn } from "@/lib/utils";

function SidebarNav({ currentPath, title, links, compact = false }) {
  return (
    <nav aria-label={title} className="space-y-0.5">
      <p
        className={cn(
          "font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2",
          compact ? "text-[10px] px-2" : "text-[11px] px-3 mb-3"
        )}
      >
        {title}
      </p>
      {links.map((item) => {
        const Icon = item.icon;
        const active = currentPath === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-start transition-all border",
              compact
                ? "gap-2 rounded-lg px-2 py-1.5 text-xs"
                : "gap-3 rounded-xl px-3 py-2.5 text-sm",
              active
                ? "bg-brand-sky/60 text-primary font-semibold border-brand-mid/30 shadow-sm"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground border-transparent"
            )}
            aria-current={active ? "page" : undefined}
          >
            <span
              className={cn(
                "shrink-0 flex items-center justify-center rounded-md",
                compact ? "mt-0.5 h-6 w-6" : "mt-0.5 h-8 w-8 rounded-lg",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className={compact ? "h-3 w-3" : "h-4 w-4"} aria-hidden />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className={cn("block leading-snug", compact && "text-[12px]")}>{item.label}</span>
              {!compact && (
                <span
                  className={cn(
                    "block text-xs mt-0.5 font-normal leading-snug",
                    active ? "text-primary/70" : "text-muted-foreground"
                  )}
                >
                  {item.description}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function TableOfContents({ items, className }) {
  if (!items?.length) return null;
  return (
    <nav aria-label="On this page" className={className}>
      <div className="flex items-center gap-1.5 mb-3">
        <List className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          On this page
        </p>
      </div>
      <ol className="relative space-y-0 border-l border-border ml-1">
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="group flex gap-1.5 -ml-px border-l-2 border-transparent pl-2.5 py-1 text-[12px] text-muted-foreground hover:text-primary hover:border-primary transition-colors"
            >
              <span className="font-mono text-[9px] tabular-nums text-muted-foreground/60 group-hover:text-primary/70 mt-0.5 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="leading-snug">{item.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default function PolicyPage({
  title,
  description,
  path,
  h1,
  subtitle,
  lastUpdated,
  toc,
  children,
}) {
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: h1, href: path },
  ];

  const isContact = path === "/contact";
  const isLegal = LEGAL_PAGES.some((p) => p.href === path);
  const hasToc = Boolean(toc?.length);

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <SEO
        title={title}
        description={description}
        url={path}
        structuredData={breadcrumbSchema(breadcrumbs)}
      />
      <Navbar />

      <section className="relative border-b bg-gradient-to-br from-brand-navy via-primary to-brand-navy text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-sky/25 via-transparent to-transparent" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
          aria-hidden
        />
        <div className="container mx-auto px-4 py-12 md:py-16 relative">
          <Breadcrumbs items={breadcrumbs} variant="light" className="mb-2" />
          <div className="max-w-3xl mt-4">
            {isLegal && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium text-brand-sky mb-4">
                Legal
              </span>
            )}
            {lastUpdated && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium text-brand-sky mb-4 ml-2">
                <Calendar className="h-3.5 w-3.5" />
                Last updated {lastUpdated}
              </span>
            )}
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{h1}</h1>
            {subtitle && (
              <p className="text-lg text-white/80 leading-relaxed max-w-2xl">{subtitle}</p>
            )}
          </div>
        </div>
      </section>

      {isLegal && (
        <div className="lg:hidden border-b border-border bg-card">
          <div className="container mx-auto px-4 py-3 flex gap-2 overflow-x-auto [scrollbar-width:none]">
            {LEGAL_PAGES.map((item) => {
              const active = path === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/40"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile / tablet: compact section jump list */}
      {hasToc && (
        <div className="xl:hidden border-b border-border bg-card/80">
          <div className="container mx-auto px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
              On this page
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 py-10 md:py-14 max-w-[1400px]">
        <div
          className={cn(
            "grid gap-5 lg:gap-6",
            hasToc ? "lg:grid-cols-12 xl:grid-cols-12" : "lg:grid-cols-12"
          )}
        >
          {/* Left: site pages — compact but readable */}
          <aside className="hidden lg:block lg:col-span-3 xl:col-span-3 space-y-4">
            <Card className="border-border shadow-sm sticky top-24 overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-brand-navy via-primary to-brand-mid" />
              <CardContent className="pt-5 pb-5 px-3.5">
                <SidebarNav currentPath={path} title="Company" links={COMPANY_PAGES} compact />
                <div className="my-3.5 border-t border-border" />
                <SidebarNav currentPath={path} title="Legal" links={LEGAL_PAGES} compact />
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-br from-brand-sky/50 to-card shadow-sm">
              <CardContent className="pt-4 pb-4 px-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                  <h2 className="text-xs font-semibold text-foreground">Privacy-first</h2>
                </div>
                <p className="text-[11px] text-muted-foreground mb-2.5 leading-snug">
                  Files process on the fly. No permanent file archive.
                </p>
                <Link
                  href="/privacy-policy"
                  className="inline-flex items-center text-[11px] font-medium text-primary hover:underline"
                >
                  Privacy Policy
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </Link>
              </CardContent>
            </Card>
          </aside>

          {/* Center: document — dominant width */}
          <div
            className={cn(
              "min-w-0",
              hasToc ? "lg:col-span-9 xl:col-span-7" : "lg:col-span-9"
            )}
          >
            {isContact && (
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                <Card className="border-border shadow-sm hover:border-primary/30 transition-colors">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="font-semibold text-foreground">Email us</h2>
                    </div>
                    <a
                      href={`mailto:${SITE_EMAIL}`}
                      className="text-primary font-medium hover:underline break-all"
                    >
                      {SITE_EMAIL}
                    </a>
                    <p className="text-sm text-muted-foreground mt-2">
                      Response within 2–3 business days
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm hover:border-primary/30 transition-colors">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="font-semibold text-foreground">Support tips</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Include the tool name, browser, and steps to reproduce. Screenshots help us fix
                      issues faster.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="border-border shadow-md overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-brand-navy via-primary to-brand-mid" />
              <CardContent className="pt-8 pb-10 md:pt-10 md:pb-12 px-5 sm:px-8 md:px-10">
                <ProseContent>{children}</ProseContent>
              </CardContent>
            </Card>
          </div>

          {/* Right: page TOC — compact */}
          {hasToc && (
            <aside className="hidden xl:block xl:col-span-2">
              <Card className="border-border shadow-sm sticky top-24 overflow-hidden">
                <CardContent className="pt-4 pb-4 px-3">
                  <TableOfContents items={toc} />
                </CardContent>
              </Card>
            </aside>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
