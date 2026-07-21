"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Select({ value, onChange, children, className, placeholder = "Select...", disabled }) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  const options = React.useMemo(() => {
    return React.Children.toArray(children)
      .filter((child) => child?.type === "option")
      .map((child) => ({
        value: child.props.value,
        label: typeof child.props.children === "string" ? child.props.children : String(child.props.value ?? ""),
      }));
  }, [children]);

  const selectedOption = options.find((o) => String(o.value) === String(value));
  const displayLabel = selectedOption?.label ?? placeholder;

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const handleSelect = (opt) => {
    onChange?.({ target: { value: opt.value } });
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "flex w-full min-w-0 items-center justify-between rounded-lg border border-border dark:border-border bg-card dark:bg-card px-3 py-2 text-left text-sm text-foreground dark:text-slate-100 shadow-sm transition-colors",
          "hover:border-border dark:hover:border-slate-600",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
          "disabled:opacity-50 disabled:pointer-events-none",
          open && "ring-2 ring-primary/50 border-primary"
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={cn("h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-border dark:border-border bg-card dark:bg-card py-1 shadow-lg"
          role="listbox"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={String(opt.value) === String(value)}
              onClick={() => handleSelect(opt)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm transition-colors",
                String(opt.value) === String(value)
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground dark:text-slate-100 hover:bg-muted dark:hover:bg-slate-800"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

