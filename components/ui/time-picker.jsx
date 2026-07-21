"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "./select";

function pad(n) {
  return String(n).padStart(2, "0");
}

export function TimePicker({ value, onChange, className, placeholder = "Select time", disabled }) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef(null);
  const [hour, setHour] = React.useState(() => {
    if (value && /^\d{1,2}:\d{2}$/.test(value)) return parseInt(value.split(":")[0], 10);
    return 12;
  });
  const [minute, setMinute] = React.useState(() => {
    if (value && /^\d{1,2}:\d{2}$/.test(value)) return parseInt(value.split(":")[1], 10);
    return 0;
  });

  React.useEffect(() => {
    if (value && /^\d{1,2}:\d{2}$/.test(value)) {
      const [h, m] = value.split(":").map(Number);
      setHour(h);
      setMinute(m);
    }
  }, [value]);

  const displayLabel = value ? (() => {
    const h = value?.split(":")[0];
    const m = value?.split(":")[1];
    if (h == null || m == null) return value;
    const h12 = parseInt(h, 10) % 12 || 12;
    const ampm = parseInt(h, 10) < 12 ? "AM" : "PM";
    return `${h12}:${pad(m)} ${ampm}`;
  })() : placeholder;

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const apply = () => {
    const str = `${pad(hour)}:${pad(minute)}`;
    onChange?.({ target: { value: str } });
    setOpen(false);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

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
          <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          {displayLabel}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] rounded-lg border border-border dark:border-border bg-card dark:bg-card p-3 shadow-lg">
          <div className="flex gap-2 items-center justify-center mb-3">
            <Select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="flex-1">
              {hours.map((h) => (
                <option key={h} value={h}>{pad(h)}</option>
              ))}
            </Select>
            <span className="text-muted-foreground">:</span>
            <Select value={minute} onChange={(e) => setMinute(Number(e.target.value))} className="flex-1">
              {minutes.map((m) => (
                <option key={m} value={m}>{pad(m)}</option>
              ))}
            </Select>
          </div>
          <button
            type="button"
            onClick={apply}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
