import { Settings2 } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { cn } from "@/lib/utils";

/**
 * Sticky settings card: title, scrollable body, optional pinned footer.
 */
export default function ToolSettingsPanel({
  title = "Output Settings",
  icon: Icon = Settings2,
  headerExtra,
  notice,
  children,
  footer,
  className,
  bodyClassName,
}) {
  return (
    <Card
      className={cn(
        "flex h-fit max-h-[min(92vh,calc(100vh-5.5rem))] flex-col overflow-hidden border border-border shadow-sm md:sticky md:top-24",
        className
      )}
    >
      <CardContent className="flex min-h-0 flex-1 flex-col gap-0 p-0">
        <div className="shrink-0 space-y-3 border-b border-border px-5 pb-4 pt-5">
          <div className="flex items-center gap-2 w-full">
            <div className="flex items-center gap-2 font-semibold text-lg text-foreground flex-1 min-w-0">
              <Icon className="w-5 h-5 flex-shrink-0 text-primary" aria-hidden />
              <span className="truncate">{title}</span>
            </div>
            {headerExtra}
          </div>
          {notice}
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-4",
            "[scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground)/0.35)_transparent]",
            "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-track]:bg-transparent",
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-border bg-card px-5 py-4">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ToolSettingsNotice({ title, children, variant = "muted" }) {
  return (
    <div
      className={cn(
        "rounded-lg p-3 border",
        variant === "sky"
          ? "bg-brand-sky/50 border-brand-mid/30"
          : "bg-muted/40 border-border"
      )}
    >
      {title && (
        <div
          className={cn(
            "text-xs font-medium mb-1",
            variant === "sky" ? "text-primary" : "text-muted-foreground"
          )}
        >
          {title}
        </div>
      )}
      <div
        className={cn(
          "text-sm",
          variant === "sky" ? "font-semibold text-brand-navy truncate" : "text-muted-foreground"
        )}
      >
        {children}
      </div>
    </div>
  );
}
