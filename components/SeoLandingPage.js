import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SEO from "./SEO";
import ToolSeoContent from "./ToolSeoContent";
import Breadcrumbs from "./Breadcrumbs";
import { ToolPageHeader } from "./ToolPageShell";
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
      category: content.applicationCategory || "UtilityApplication",
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
      <main className="flex-1">
        <div className="container mx-auto px-4 pt-6 max-w-4xl">
          <Breadcrumbs items={breadcrumbs} />
        </div>
        <section className="container mx-auto px-4 py-10 md:py-12 max-w-4xl">
          <ToolPageHeader title={content.h1} description={content.intro} badge="Free online tool">
            <div className="pt-2">
              <Link href={content.toolPath}>
                <Button size="lg" className="h-12 px-8">
                  Open Free Tool
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </ToolPageHeader>
        </section>
        <ToolSeoContent content={content} showBreadcrumbs={false} />
      </main>
      <Footer />
    </div>
  );
}
