import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SEO from "./SEO";
import ToolSeoContent from "./ToolSeoContent";
import Breadcrumbs from "./Breadcrumbs";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import {
  softwareApplicationSchema,
  faqPageSchema,
  breadcrumbSchema,
  combineSchemas,
} from "../lib/structuredData";

export default function SeoLandingPage({ content }) {
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: content.h1, href: content.path },
  ];

  const schemas = combineSchemas(
    softwareApplicationSchema({
      name: content.h1,
      description: content.description,
      url: content.path,
    }),
    faqPageSchema(content.faqs),
    breadcrumbSchema(breadcrumbs)
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={content.title}
        description={content.description}
        url={content.path}
        structuredData={schemas.length === 1 ? schemas[0] : schemas}
      />
      <Navbar />
      <Breadcrumbs items={breadcrumbs} />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-12 max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {content.h1}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
            {content.intro}
          </p>
          <Link href={content.toolPath}>
            <Button size="lg" className="h-12 px-8">
              Open Free Tool
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </section>
        <ToolSeoContent content={content} showBreadcrumbs={false} />
      </main>
      <Footer />
    </div>
  );
}
