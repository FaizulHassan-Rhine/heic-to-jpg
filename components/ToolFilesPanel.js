import { Card, CardContent } from "./ui/card";
import { cn } from "@/lib/utils";

/**
 * Files area: stats header + action buttons + file list children.
 */
export default function ToolFilesPanel({
  title = "Files",
  total = 0,
  completed = 0,
  processing = 0,
  showStats = true,
  actions,
  children,
  className,
  headerExtra,
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <Card className="border border-border shadow-sm overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              {showStats && (
                <div className="flex flex-nowrap items-center gap-x-3 sm:gap-x-5 text-sm">
                  <Stat label="Total" value={total} tone="muted" />
                  <Stat label="Completed" value={completed} tone="sky" />
                  <Stat label="Processing" value={processing} tone="mid" />
                </div>
              )}
              {headerExtra}
            </div>
            {actions && (
              <div className="flex w-full shrink-0 flex-col gap-3 xl:w-auto xl:max-w-none xl:items-end">
                {actions}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const tones = {
    muted:
      "border-border bg-muted/50 text-foreground",
    sky:
      "border-brand-mid/30 bg-brand-sky/50 text-brand-navy",
    mid:
      "border-primary/25 bg-primary/10 text-primary",
  };
  return (
    <div className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap sm:gap-2">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span
        className={cn(
          "inline-flex min-w-[1.75rem] items-center justify-center rounded-full border px-2.5 py-0.5 text-sm font-semibold tabular-nums",
          tones[tone] || tones.muted
        )}
      >
        {value}
      </span>
    </div>
  );
}
