import Link from "next/link";
import { Card, CardContent } from "./ui/card";
import { ArrowRight } from "lucide-react";

export default function ToolSeoContent({ content, showBreadcrumbs = true }) {
  if (!content) return null;

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: content.h1, href: content.path },
  ];

  return (
    <section className="border-t bg-slate-50 dark:bg-slate-900/50" aria-label="Tool information">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {showBreadcrumbs && (
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{content.h1}</span>
          </nav>
        )}

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4 not-prose">
            About {content.h1}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg mb-8">
            {content.intro}
          </p>

          {content.useCases?.length > 0 && (
            <>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-10 mb-4">When to Use This Tool</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                {content.h1} is designed for everyday tasks where speed and simplicity matter. Whether you are
                handling a single file or working through a batch, ConvertMastery keeps the workflow straightforward
                with clear settings and instant downloads.
              </p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                {content.useCases.join(" ")} These are among the most common reasons users choose this tool on ConvertMastery.
              </p>
            </>
          )}

          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-10 mb-4">Tips for Best Results</h3>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            For the best outcome, start with a high-quality source file when possible. If you are preparing images for
            the web, consider converting to WebP or compressing after conversion. For documents, review the output
            before deleting originals. When privacy matters, prefer settings that strip metadata and use browser-based
            processing when available.
          </p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
            ConvertMastery is updated regularly to support modern formats and browsers. If you need help, visit our{" "}
            <Link href="/guide" className="text-primary hover:underline">documentation guide</Link> or browse related
            tools linked below. Free account sign-up unlocks advanced options and My Orders for saving results.
          </p>

          {content.disclaimer && (
            <Card className="mb-8 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-amber-900 dark:text-amber-200 m-0">
                  <strong>Important:</strong> {content.disclaimer}
                </p>
              </CardContent>
            </Card>
          )}

          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-10 mb-4">How to Use</h3>
          <ol className="list-decimal pl-6 space-y-2 text-slate-600 dark:text-slate-300">
            {content.howToUse?.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-10 mb-4">Supported Formats</h3>
          <p className="text-slate-600 dark:text-slate-300">{content.supportedFormats}</p>

          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-10 mb-4">Privacy &amp; Security</h3>
          <p className="text-slate-600 dark:text-slate-300">{content.privacySecurity}</p>

          {content.useCases?.length > 0 && (
            <>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-10 mb-4">Common Use Cases</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300">
                {content.useCases.map((uc, i) => (
                  <li key={i}>{uc}</li>
                ))}
              </ul>
            </>
          )}

          {content.relatedTools?.length > 0 && (
            <>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-10 mb-4">Related Tools</h3>
              <div className="grid sm:grid-cols-2 gap-3 not-prose">
                {content.relatedTools.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="flex items-center justify-between p-4 rounded-lg border bg-white dark:bg-slate-800 hover:border-primary/50 transition-colors group"
                  >
                    <span className="font-medium text-slate-900 dark:text-white group-hover:text-primary">
                      {tool.label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            </>
          )}

          {content.faqs?.length > 0 && (
            <>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mt-10 mb-4">Frequently Asked Questions</h3>
              <div className="space-y-4 not-prose">
                {content.faqs.map((faq, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4 pb-4">
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{faq.q}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 m-0">{faq.a}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
