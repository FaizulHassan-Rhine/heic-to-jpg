"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "./select";

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

function pad(n) {
  return String(n).padStart(2, "0");
}

export function DateTimePicker({ value, onChange, className, placeholder = "Select date & time", disabled }) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  const [datePart, timePart] = value && value.includes("T")
    ? value.split("T")
    : [null, "12:00"];
  const [viewDate, setViewDate] = React.useState(() => {
    if (datePart) {
      const d = new Date(datePart + "T12:00:00");
      return isNaN(d.getTime()) ? new Date() : d;
    }
    return new Date();
  });
  const [hour, setHour] = React.useState(() => {
    if (timePart && /^\d{1,2}:\d{2}$/.test(timePart)) return parseInt(timePart.split(":")[0], 10);
    return 12;
  });
  const [minute, setMinute] = React.useState(() => {
    if (timePart && /^\d{1,2}:\d{2}$/.test(timePart)) return parseInt(timePart.split(":")[1], 10);
    return 0;
  });

  React.useEffect(() => {
    if (value && value.includes("T")) {
      const [dp, tp] = value.split("T");
      if (dp) {
        const d = new Date(dp + "T12:00:00");
        if (!isNaN(d.getTime())) setViewDate(d);
      }
      if (tp && /^\d{1,2}:\d{2}$/.test(tp)) {
        const [h, m] = tp.split(":").map(Number);
        setHour(h);
        setMinute(m);
      }
    }
  }, [value]);

  const displayLabel = value ? (() => {
    if (!datePart) return value;
    const d = new Date(datePart + "T12:00:00");
    if (isNaN(d.getTime())) return value;
    const dateStr = `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
    const t = timePart || "12:00";
    const [h, m] = t.split(":").map(Number);
    const h12 = h % 12 || 12;
    const ampm = h < 12 ? "AM" : "PM";
    return `${dateStr} ${h12}:${pad(m)} ${ampm}`;
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

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = getDaysInMonth(year, month);

  const selectDay = (d) => {
    if (!d) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const timeStr = `${pad(hour)}:${pad(minute)}`;
    onChange?.({ target: { value: `${dateStr}T${timeStr}` } });
  };

  const apply = () => {
    const dateStr = `${viewDate.getFullYear()}-${pad(viewDate.getMonth() + 1)}-${pad(viewDate.getDate())}`;
    const timeStr = `${pad(hour)}:${pad(minute)}`;
    onChange?.({ target: { value: `${dateStr}T${timeStr}` } });
    setOpen(false);
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const currentDateStr = `${year}-${String(month + 1).padStart(2, "0")}`;

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
          <Calendar className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          {displayLabel}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[300px] rounded-lg border border-border dark:border-border bg-card dark:bg-card p-3 shadow-lg">
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
          <div className="grid grid-cols-7 gap-0.5 mb-3">
            {DAYS.map((d) => (
              <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                {d}
              </div>
            ))}
            {days.map((d, i) => {
              if (d === null) return <div key={`e-${i}`} />;
              const str = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const isSelected = datePart === str;
              const isToday = todayStr === str;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setViewDate(new Date(year, month, d));
                    const timeStr = `${pad(hour)}:${pad(minute)}`;
                    onChange?.({ target: { value: `${str}T${timeStr}` } });
                  }}
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
          <div className="flex gap-2 items-center justify-center mb-3 pt-2 border-t border-border dark:border-border">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="flex-1 min-w-0">
              {hours.map((h) => (
                <option key={h} value={h}>{pad(h)}</option>
              ))}
            </Select>
            <span className="text-muted-foreground">:</span>
            <Select value={minute} onChange={(e) => setMinute(Number(e.target.value))} className="flex-1 min-w-0">
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
