import { Children } from "react";
import { cn } from "@/lib/utils";

/**
 * Two-column workspace: settings sidebar + files panel.
 * Mobile stacks in normal page flow; desktop uses a sticky sidebar grid.
 * minmax(0, …) + min-w-0 prevent children from forcing horizontal overflow.
 */
export default function ToolWorkspace({
  children,
  className,
  sidebarWidth = "360px",
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full flex-col gap-6 overflow-x-hidden",
        "md:grid md:grid-cols-[minmax(0,var(--tool-sidebar))_minmax(0,1fr)] md:items-start md:gap-8 md:overflow-x-visible",
        className
      )}
      style={{ "--tool-sidebar": sidebarWidth }}
    >
      {Children.map(children, (child, index) => (
        <div key={index} className="w-full min-w-0 max-w-full">
          {child}
        </div>
      ))}
    </div>
  );
}
