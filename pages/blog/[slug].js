import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import SEO from "../../components/SEO";
import Breadcrumbs from "../../components/Breadcrumbs";
import ProseContent from "../../components/ProseContent";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { getPostBySlug, BLOG_POSTS } from "../../lib/blogPosts";
import { articleSchema, breadcrumbSchema, combineSchemas } from "../../lib/structuredData";
import {
  Clock, Calendar, ArrowLeft, ArrowRight, User, Tag,
} from "lucide-react";

function renderMarkdownContent(content) {
  const lines = content.trim().split("\n");
  const elements = [];
  let listItems = [];
  let listType = null;

  const parseInline = (text) =>
    text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary font-medium hover:underline">$1</a>');

  const flushList = () => {
    if (listItems.length === 0) return;
    const ListTag = listType === "ol" ? "ol" : "ul";
    const listClass =
      listType === "ol"
        ? "list-decimal pl-6 space-y-2 mb-6 text-muted-foreground dark:text-muted-foreground"
        : "list-disc pl-6 space-y-2 mb-6 text-muted-foreground dark:text-muted-foreground marker:text-primary";
    elements.push(
      <ListTag key={`list-${elements.length}`} className={listClass}>
        {listItems.map((item, i) => (
          <li key={i} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: parseInline(item) }} />
        ))}
      </ListTag>
    );
    listItems = [];
    listType = null;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h2
          key={idx}
          id={trimmed.slice(3).toLowerCase().replace(/\s+/g, "-")}
          className="text-2xl font-bold mt-12 mb-4 pb-3 border-b border-border dark:border-border text-foreground dark:text-foreground scroll-mt-24"
        >
          {trimmed.slice(3)}
        </h2>
      );
    } else if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={idx} className="text-xl font-semibold mt-8 mb-3 text-foreground dark:text-foreground">
          {trimmed.slice(4)}
        </h3>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listItems.push(trimmed.replace(/^\d+\.\s/, ""));
    } else if (trimmed.startsWith("- ")) {
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listItems.push(trimmed.slice(2));
    } else {
      flushList();
      elements.push(
        <p
          key={idx}
          className="text-muted-foreground dark:text-muted-foreground leading-relaxed mb-5 text-[1.05rem]"
          dangerouslySetInnerHTML={{ __html: parseInline(trimmed) }}
        />
      );
    }
  });
  flushList();
  return elements;
}

function extractHeadings(content) {
  return content
    .trim()
    .split("\n")
    .filter((l) => l.trim().startsWith("## "))
    .map((l) => l.trim().slice(3));
}

export async function getStaticPaths() {
  return {
    paths: BLOG_POSTS.map((p) => ({ params: { slug: p.slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) return { notFound: true };
  return { props: { post } };
}

export default function BlogPostPage({ post }) {
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Blog", href: "/blog" },
    { name: post.title, href: `/blog/${post.slug}` },
  ];

  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);
  const headings = extractHeadings(post.content);

  const schemas = combineSchemas(
    articleSchema({
      title: post.title,
      description: post.description,
      slug: post.slug,
      datePublished: post.datePublished,
      dateModified: post.dateModified,
    }),
    breadcrumbSchema(breadcrumbs)
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={post.title}
        description={post.description}
        url={`/blog/${post.slug}`}
        type="article"
        structuredData={schemas.length === 1 ? schemas[0] : schemas}
      />
      <Navbar />

      {/* Article hero */}
      <section className="relative border-b bg-gradient-to-br from-brand-navy via-primary to-brand-navy text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-sky/20 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-12 md:py-16 relative max-w-4xl">
          <Breadcrumbs items={breadcrumbs} variant="light" className="mb-6" />
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-semibold text-brand-sky">
              <Tag className="h-3.5 w-3.5" />
              {post.category}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-white/70">
              <Clock className="h-4 w-4" />
              {post.readTime} read
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-5">
            {post.title}
          </h1>
          <p className="text-lg text-white/80 leading-relaxed mb-6">{post.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4" />
              ConvertMastery Team
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Published {post.datePublished}
            </span>
            <span>· Updated {post.dateModified}</span>
          </div>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 py-10 md:py-14">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* Article body */}
          <article className="lg:col-span-8">
            <Card className="border-border dark:border-border shadow-sm">
              <CardContent className="pt-8 pb-8 md:pt-10 md:pb-10 px-6 md:px-10">
                <ProseContent>{renderMarkdownContent(post.content)}</ProseContent>
              </CardContent>
            </Card>

            <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8 border-t border-border dark:border-border">
              <Link
                href="/blog"
                className="inline-flex items-center text-sm font-medium text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to all guides
              </Link>
              <Link href="/convert">
                <Button variant="outline" size="sm">
                  Try Image Converter
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            {headings.length > 0 && (
              <Card className="border-border dark:border-border shadow-sm sticky top-24">
                <CardContent className="pt-6 pb-6">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    On this page
                  </h2>
                  <ul className="space-y-2">
                    {headings.map((heading) => (
                      <li key={heading}>
                        <a
                          href={`#${heading.toLowerCase().replace(/\s+/g, "-")}`}
                          className="text-sm text-muted-foreground dark:text-muted-foreground hover:text-primary transition-colors line-clamp-2"
                        >
                          {heading}
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card className="border-border dark:border-border shadow-sm">
              <CardContent className="pt-6 pb-6">
                <h2 className="font-semibold text-foreground dark:text-foreground mb-4">More guides</h2>
                <ul className="space-y-4">
                  {relatedPosts.map((related) => (
                    <li key={related.slug}>
                      <Link
                        href={`/blog/${related.slug}`}
                        className="group block"
                      >
                        <p className="text-sm font-medium text-foreground dark:text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {related.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{related.readTime} read</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-sm">
              <CardContent className="pt-6 pb-6">
                <h2 className="font-semibold text-foreground dark:text-foreground mb-2">Popular tools</h2>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/heic-to-jpg" className="text-primary hover:underline">HEIC to JPG</Link></li>
                  <li><Link href="/compress" className="text-primary hover:underline">Image Compressor</Link></li>
                  <li><Link href="/merge-pdf" className="text-primary hover:underline">Merge PDF</Link></li>
                  <li><Link href="/password-generator" className="text-primary hover:underline">Password Generator</Link></li>
                </ul>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
