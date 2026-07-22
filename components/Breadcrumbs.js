import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Breadcrumbs({ items, variant = "default", className = "" }) {
  if (!items?.length) return null;

  const isLight = variant === "light";

  return (
    <nav aria-label="Breadcrumb" className={cn("px-0", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, i) => (
          <li key={item.href || item.name} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  isLight ? "text-white/50" : "text-muted-foreground"
                )}
                aria-hidden
              />
            )}
            {item.href && i < items.length - 1 ? (
              <Link
                href={item.href}
                className={cn(
                  "transition-colors",
                  isLight
                    ? "text-white/70 hover:text-white"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                {item.name}
              </Link>
            ) : (
              <span
                className={cn(
                  i === items.length - 1 &&
                    (isLight ? "text-white font-medium" : "text-foreground font-medium")
                )}
                aria-current={i === items.length - 1 ? "page" : undefined}
              >
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
