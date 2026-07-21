"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  const startPad = first.getDay();
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

export function DatePicker({ value, onChange, className, placeholder = "Select date", disabled }) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef(null);
  const [viewDate, setViewDate] = React.useState(() => {
    if (value) {
      const d = new Date(value + "T12:00:00");
      return isNaN(d.getTime()) ? new Date() : d;
    }
    return new Date();
  });

  const displayLabel = value ? (() => {
    const d = new Date(value + "T12:00:00");
    if (isNaN(d.getTime())) return value;
    return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
  })() : placeholder;

  React.useEffect(() => {
    if (value) {
      const d = new Date(value + "T12:00:00");
      if (!isNaN(d.getTime())) setViewDate(d);
    }
  }, [value]);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = getDaysInMonth(year, month);

  const selectDay = (d) => {
    if (!d) return;
    const str = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    onChange?.({ target: { value: str } });
    setOpen(false);
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

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
          open && "ring-2 ring-primary/50 border-primary",
          !value && "text-muted-foreground dark:text-muted-foreground"
        )}
      >
        <span className="truncate flex items-center gap-2">
          <Calendar className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          {displayLabel}
        </span>
        <ChevronDown className={cn("h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] rounded-lg border border-border dark:border-border bg-card dark:bg-card p-3 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="p-1.5 rounded-lg hover:bg-muted dark:hover:bg-slate-800 text-muted-foreground dark:text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-foreground dark:text-foreground">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="p-1.5 rounded-lg hover:bg-muted dark:hover:bg-slate-800 text-muted-foreground dark:text-muted-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                {d}
              </div>
            ))}
            {days.map((d, i) => {
              if (d === null) return <div key={`e-${i}`} />;
              const str = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const isSelected = value === str;
              const isToday = todayStr === str;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => selectDay(d)}
                  className={cn(
                    "py-1.5 rounded-md text-sm transition-colors",
                    isSelected && "bg-primary text-primary-foreground font-medium",
                    !isSelected && isToday && "bg-primary/20 text-primary font-medium",
                    !isSelected && !isToday && "hover:bg-muted dark:hover:bg-slate-800 text-foreground dark:text-slate-100"
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between gap-2 pt-2 border-t border-border dark:border-border">
            <button
              type="button"
              onClick={() => { onChange?.({ target: { value: "" } }); setOpen(false); }}
              className="text-xs text-muted-foreground hover:text-foreground dark:hover:text-muted-foreground"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => { selectDay(today.getDate()); }}
              className="text-xs text-primary font-medium hover:underline"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
