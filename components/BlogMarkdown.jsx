/**
 * Lightweight markdown-ish renderer for ConvertMastery blog posts.
 * Supports: ## ### paragraphs, lists, **bold**, [links](url),
 * ![alt](src) / ![alt](src "caption"), > tip/note callouts, ---
 */

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" class="text-[#1C4D8D] dark:text-[#8EC5E8] font-medium underline-offset-2 hover:underline">$1</a>'
    );
}

const IMAGE_RE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/;
const CALLOUT_RE = /^>\s*\*\*(Tip|Note|Warning|Key takeaway):\*\*\s*(.*)$/i;

export function extractHeadings(content) {
  return content
    .trim()
    .split("\n")
    .filter((l) => l.trim().startsWith("## "))
    .map((l) => l.trim().slice(3));
}

export function headingId(heading) {
  return slugify(heading);
}

export default function renderBlogMarkdown(content) {
  const lines = content.trim().split("\n");
  const elements = [];
  let listItems = [];
  let listType = null;

  const flushList = () => {
    if (listItems.length === 0) return;
    const ListTag = listType === "ol" ? "ol" : "ul";
    const listClass =
      listType === "ol"
        ? "list-decimal pl-6 space-y-2.5 mb-7 text-muted-foreground"
        : "list-disc pl-6 space-y-2.5 mb-7 text-muted-foreground marker:text-primary";
    elements.push(
      <ListTag key={`list-${elements.length}`} className={listClass}>
        {listItems.map((item, i) => (
          <li
            key={i}
            className="leading-relaxed"
            dangerouslySetInnerHTML={{ __html: parseInline(item) }}
          />
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

    if (trimmed === "---") {
      flushList();
      elements.push(
        <hr key={idx} className="my-10 border-border" />
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      const title = trimmed.slice(3);
      elements.push(
        <h2
          key={idx}
          id={slugify(title)}
          className="text-2xl font-bold mt-12 mb-4 pb-3 border-b border-border text-foreground scroll-mt-24"
        >
          {title}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={idx} className="text-xl font-semibold mt-8 mb-3 text-foreground">
          {trimmed.slice(4)}
        </h3>
      );
      return;
    }

    const imgMatch = trimmed.match(IMAGE_RE);
    if (imgMatch) {
      flushList();
      const [, alt, src, caption] = imgMatch;
      const isCompact = /qr-example/i.test(src);
      elements.push(
        <figure
          key={idx}
          className={`my-8 overflow-hidden rounded-xl border border-border bg-muted/40 ${
            isCompact ? "max-w-sm mx-auto" : ""
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || caption || "Article illustration"}
            className={
              isCompact
                ? "w-full p-6 bg-white dark:bg-white"
                : "w-full max-h-[420px] object-cover"
            }
            loading="lazy"
          />
          {(caption || alt) && (
            <figcaption className="px-4 py-3 text-sm text-muted-foreground border-t border-border bg-card/80">
              {caption || alt}
            </figcaption>
          )}
        </figure>
      );
      return;
    }

    const calloutMatch = trimmed.match(CALLOUT_RE);
    if (calloutMatch) {
      flushList();
      const label = calloutMatch[1];
      const body = calloutMatch[2];
      const tone =
        /warning/i.test(label)
          ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
          : /note/i.test(label)
            ? "border-brand-mid/40 bg-brand-sky/20 dark:bg-accent/50 text-foreground"
            : "border-primary/30 bg-primary/5 text-foreground";
      elements.push(
        <aside
          key={idx}
          className={`my-7 rounded-xl border px-4 py-3.5 text-[0.98rem] leading-relaxed ${tone}`}
        >
          <p className="m-0" dangerouslySetInnerHTML={{ __html: `<strong>${label}:</strong> ${parseInline(body)}` }} />
        </aside>
      );
      return;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listItems.push(trimmed.replace(/^\d+\.\s/, ""));
      return;
    }

    if (trimmed.startsWith("- ")) {
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listItems.push(trimmed.slice(2));
      return;
    }

    flushList();
    elements.push(
      <p
        key={idx}
        className="text-muted-foreground leading-relaxed mb-5 text-[1.05rem]"
        dangerouslySetInnerHTML={{ __html: parseInline(trimmed) }}
      />
    );
  });

  flushList();
  return elements;
}
