import { cn } from "@/lib/utils";

/**
 * Two-column workspace: settings sidebar + files panel.
 * Default sidebar width matches Convert Images (360px).
 */
export default function ToolWorkspace({
  children,
  className,
  sidebarWidth = "360px",
}) {
  return (
    <div
      className={cn(
        "grid gap-6 md:gap-8 items-start md:grid-cols-[var(--tool-sidebar)_1fr]",
        className
      )}
      style={{ "--tool-sidebar": sidebarWidth }}
    >
      {children}
    </div>
  );
}
