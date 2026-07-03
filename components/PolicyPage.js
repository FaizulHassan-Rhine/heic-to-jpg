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
import { Calendar, Mail, MessageSquare, Shield, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function SidebarNav({ currentPath, title, links }) {
  return (
    <nav aria-label={title} className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-3">
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
              "flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
              active
                ? "bg-primary/10 text-primary font-medium border border-primary/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
            <span>
              <span className="block">{item.label}</span>
              {!active && (
                <span className="block text-xs text-muted-foreground mt-0.5 font-normal">{item.description}</span>
              )}
            </span>
          </Link>
        );
      })}
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
  children,
}) {
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: h1, href: path },
  ];

  const isContact = path === "/contact";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <SEO
        title={title}
        description={description}
        url={path}
        structuredData={breadcrumbSchema(breadcrumbs)}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative border-b bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-12 md:py-16 relative">
          <Breadcrumbs items={breadcrumbs} variant="light" className="mb-2" />
          <div className="max-w-3xl mt-4">
            {lastUpdated && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium text-slate-200 mb-4">
                <Calendar className="h-3.5 w-3.5" />
                Last updated {lastUpdated}
              </span>
            )}
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{h1}</h1>
            {subtitle && (
              <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">{subtitle}</p>
            )}
          </div>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 py-10 md:py-14">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-8">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm sticky top-24">
              <CardContent className="pt-6 pb-6">
                <SidebarNav currentPath={path} title="Company" links={COMPANY_PAGES} />
                <div className="my-5 border-t border-slate-200 dark:border-slate-700" />
                <SidebarNav currentPath={path} title="Legal" links={LEGAL_PAGES} />
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-sm">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-slate-900 dark:text-white">Privacy-first tools</h2>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Most ConvertMastery tools process files locally in your browser.
                </p>
                <Link
                  href="/privacy-policy"
                  className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  Read our Privacy Policy
                  <ChevronRight className="h-4 w-4 ml-0.5" />
                </Link>
              </CardContent>
            </Card>
          </aside>

          {/* Main content */}
          <div className="lg:col-span-8 xl:col-span-9">
            {isContact && (
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-colors">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="font-semibold text-slate-900 dark:text-white">Email us</h2>
                    </div>
                    <a
                      href={`mailto:${SITE_EMAIL}`}
                      className="text-primary font-medium hover:underline break-all"
                    >
                      {SITE_EMAIL}
                    </a>
                    <p className="text-sm text-muted-foreground mt-2">Response within 2–3 business days</p>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-colors">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="font-semibold text-slate-900 dark:text-white">Support tips</h2>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Include the tool name, browser, and steps to reproduce. Screenshots help us fix issues faster.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardContent className="pt-8 pb-8 md:pt-10 md:pb-10 px-6 md:px-10">
                <ProseContent>{children}</ProseContent>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
