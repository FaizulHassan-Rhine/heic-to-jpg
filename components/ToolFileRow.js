import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";

/**
 * Single file row: thumbnail, name, size, badge, delete.
 */
export default function ToolFileRow({
  name,
  sizeLabel,
  previewUrl,
  badge,
  selected = false,
  onSelect,
  onRemove,
  actions,
  children,
  className,
  asButton = true,
}) {
  const ext = name?.includes(".") ? name.split(".").pop() : "";

  return (
    <Card
      className={cn(
        "overflow-hidden border-2 shadow-sm transition-all",
        selected
          ? "border-primary bg-brand-sky/30 shadow-md"
          : "border-border hover:border-brand-mid hover:shadow-md",
        onSelect && "cursor-pointer",
        className
      )}
      onClick={onSelect}
      role={onSelect && asButton ? "button" : undefined}
      tabIndex={onSelect && asButton ? 0 : undefined}
      onKeyDown={
        onSelect && asButton
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(e);
              }
            }
          : undefined
      }
    >
      <div className="flex items-center p-3 gap-4">
        <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0 overflow-hidden relative border border-border">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-xs font-bold text-muted-foreground uppercase">
              {ext || "FILE"}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <h4 className="font-medium truncate text-foreground">{name}</h4>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {sizeLabel && <span>{sizeLabel}</span>}
                {badge && (
                  <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-0.5 font-semibold uppercase tracking-wide">
                    {badge}
                  </span>
                )}
              </div>
            </div>

            <div
              className="flex items-center gap-1 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {actions}
              {onRemove && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 text-muted-foreground hover:text-red-600 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-primary/40"
                  onClick={onRemove}
                  aria-label={`Remove ${name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          {children}
        </div>
      </div>
    </Card>
  );
}
