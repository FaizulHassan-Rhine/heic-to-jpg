import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import SEO from "../../components/SEO";
import Breadcrumbs from "../../components/Breadcrumbs";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { BLOG_POSTS } from "../../lib/blogPosts";
import { breadcrumbSchema } from "../../lib/structuredData";
import {
  Clock, ArrowRight, BookOpen, Sparkles, FileImage, Shield, FileText,
} from "lucide-react";

const CATEGORY_ICONS = {
  "File Conversion": FileImage,
  "Image Compression": FileImage,
  "PDF Tools": FileText,
  "Privacy & Security": Shield,
};

const CATEGORIES = [...new Set(BLOG_POSTS.map((p) => p.category))];

export default function BlogIndexPage() {
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Blog & Guides", href: "/blog" },
  ];

  const [featured, ...rest] = BLOG_POSTS;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <SEO
        title="Blog & Guides – File Conversion, PDF & Privacy Tips"
        description="Tips and guides for file conversion, image compression, PDF tools, and online privacy from ConvertMastery."
        url="/blog"
        structuredData={breadcrumbSchema(breadcrumbs)}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative border-b bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/25 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-14 md:py-20 relative">
          <Breadcrumbs items={breadcrumbs} variant="light" className="mb-6" />
          <div className="flex items-center gap-2 text-primary-foreground/80 mb-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-slate-300">ConvertMastery Guides</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 max-w-2xl">
            Blog &amp; Guides
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
            Practical tutorials for file conversion, image compression, PDF workflows, and protecting your privacy online.
          </p>
          <div className="flex flex-wrap gap-2 mt-8">
            {CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat] || FileText;
              return (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-200"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 py-12 md:py-16">
        {/* Featured post */}
        {featured && (
          <section className="mb-14">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Featured guide</h2>
            </div>
            <Link href={`/blog/${featured.slug}`}>
              <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl hover:border-primary/40 transition-all group">
                <div className="grid md:grid-cols-5">
                  <div className="md:col-span-2 bg-gradient-to-br from-primary/20 via-primary/10 to-slate-100 dark:to-slate-900 p-8 md:p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-semibold mb-4">
                      {featured.category}
                    </span>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {featured.readTime} read
                    </p>
                  </div>
                  <CardContent className="md:col-span-3 pt-8 pb-8 px-8 md:px-10 flex flex-col justify-center">
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors mb-3">
                      {featured.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                      {featured.description}
                    </p>
                    <span className="inline-flex items-center text-sm font-semibold text-primary">
                      Read full guide
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </CardContent>
                </div>
              </Card>
            </Link>
          </section>
        )}

        {/* Post grid */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">All guides</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {rest.map((post) => {
              const Icon = CATEGORY_ICONS[post.category] || FileText;
              return (
                <Link key={post.slug} href={`/blog/${post.slug}`}>
                  <Card className="h-full border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-primary/40 transition-all group">
                    <CardContent className="pt-6 pb-6 px-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                          <Icon className="h-3.5 w-3.5" />
                          {post.category}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {post.readTime}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors mb-2 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-4">
                        {post.description}
                      </p>
                      <span className="inline-flex items-center text-sm font-medium text-primary">
                        Read article
                        <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16">
          <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-white to-primary/5 dark:from-primary/15 dark:via-slate-900 dark:to-primary/10 shadow-sm">
            <CardContent className="pt-10 pb-10 px-8 text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                Ready to try the tools?
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-lg mx-auto">
                Put what you learned into practice with our free online converters and privacy tools.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/convert">
                  <Button size="lg">Image Converter</Button>
                </Link>
                <Link href="/guide">
                  <Button size="lg" variant="outline">All Tools</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}
