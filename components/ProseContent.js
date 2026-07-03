export default function ProseContent({ children, className = "" }) {
  return (
    <div
      className={[
        "prose prose-slate dark:prose-invert max-w-none",
        "prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-white",
        "prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-3 prose-h2:border-b prose-h2:border-slate-200 dark:prose-h2:border-slate-700",
        "prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3",
        "prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed",
        "prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline",
        "prose-strong:text-slate-900 dark:prose-strong:text-white",
        "prose-ul:my-4 prose-ol:my-4",
        "prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-li:marker:text-primary",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
