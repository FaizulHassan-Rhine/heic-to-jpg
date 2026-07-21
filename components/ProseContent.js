import { cn } from "@/lib/utils";

/**
 * Legal / policy document typography — explicit styles (no typography plugin required).
 */
export default function ProseContent({ children, className }) {
  return (
    <div
      className={cn(
        "legal-prose max-w-none text-[15px] sm:text-base leading-relaxed text-muted-foreground",
        "[&>p]:mb-5 [&>p]:leading-relaxed",
        "[&>p:first-of-type]:text-base sm:[&>p:first-of-type]:text-lg [&>p:first-of-type]:text-foreground/80",
        "[&>h2]:mt-10 [&>h2]:mb-4 [&>h2]:scroll-mt-28 [&>h2]:pb-3 [&>h2]:border-b [&>h2]:border-border",
        "[&>h2]:text-xl sm:[&>h2]:text-2xl [&>h2]:font-bold [&>h2]:tracking-tight [&>h2]:text-foreground",
        "[&>h3]:mt-7 [&>h3]:mb-3 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-foreground",
        "[&>ul]:my-5 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-2",
        "[&>ol]:my-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-2",
        "[&>li]:leading-relaxed [&>li]:marker:text-primary",
        "[&>ul_ul]:mt-2 [&>ul_ul]:mb-0",
        "[&_a]:text-primary [&_a]:font-medium [&_a]:underline-offset-2 hover:[&_a]:underline",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&>hr]:my-10 [&>hr]:border-border",
        className
      )}
    >
      {children}
    </div>
  );
}
