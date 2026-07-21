import Navbar from "./Navbar";
import Footer from "./Footer";
import { cn } from "@/lib/utils";

/**
 * Shared shell for tool pages — keeps Navbar/Footer/background consistent sitewide.
 */
export default function ToolPageShell({
  children,
  className,
  mainClassName,
  containerClassName = "max-w-7xl",
  wide = false,
}) {
  return (
    <div className={cn("min-h-screen bg-background flex flex-col", className)}>
      <Navbar />
      <main
        className={cn(
          "flex-1 container mx-auto px-4 py-8 md:py-10",
          wide ? "max-w-7xl" : containerClassName,
          mainClassName
        )}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}

/**
 * Consistent tool page title block (Convert Images template).
 */
export function ToolPageHeader({
  title,
  description,
  badge,
  icon: Icon,
  className,
  children,
}) {
  return (
    <div className={cn("text-center mb-8 md:mb-10", className)}>
      {badge && (
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-brand-sky/70 dark:bg-accent text-brand-navy dark:text-foreground text-xs font-medium border border-brand-mid/20">
          {badge}
        </div>
      )}
      {Icon && (
        <div className="flex justify-center mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-sky/70 dark:bg-accent text-primary">
            <Icon className="h-6 w-6" aria-hidden />
          </div>
        </div>
      )}
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {description && (
        <p className="mt-3 text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
