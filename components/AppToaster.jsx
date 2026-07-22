import { useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { Check, X, AlertTriangle, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  success: {
    icon: Check,
    rail: "bg-gradient-to-b from-primary via-brand-mid to-primary",
    iconBg: "bg-gradient-to-br from-primary to-primary-hover text-white",
  },
  error: {
    icon: X,
    rail: "bg-gradient-to-b from-destructive via-primary to-destructive",
    iconBg: "bg-gradient-to-br from-destructive to-primary-hover text-white",
  },
  warning: {
    icon: AlertTriangle,
    rail: "bg-gradient-to-b from-brand-mid via-primary to-brand-mid",
    iconBg: "bg-gradient-to-br from-brand-mid to-primary-hover text-white",
  },
  info: {
    icon: Info,
    rail: "bg-gradient-to-b from-primary via-brand-mid to-primary",
    iconBg: "bg-gradient-to-br from-primary to-primary-hover text-white",
  },
  loading: {
    icon: Loader2,
    rail: "bg-gradient-to-b from-primary via-brand-mid to-primary",
    iconBg: "bg-gradient-to-br from-primary to-primary-hover text-white",
  },
};

function ToastCard({ t, type = "info", title, message }) {
  const tone = TONES[type] || TONES.info;
  const Icon = tone.icon;

  return (
    <div
      className={cn(
        "pointer-events-auto relative w-[min(100vw-1.5rem,20rem)] overflow-hidden rounded-xl",
        "border border-border bg-card text-card-foreground backdrop-blur-xl",
        "shadow-lg shadow-brand-navy/20 dark:shadow-black/50",
        t.visible ? "cm-toast-enter" : "cm-toast-leave"
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-sky/40 via-transparent to-transparent dark:from-primary/10"
        aria-hidden
      />
      <div className={cn("absolute inset-y-0 left-0 w-1", tone.rail)} aria-hidden />

      <div className="relative flex items-start gap-2.5 py-3 pl-3.5 pr-2.5">
        <div
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            tone.iconBg
          )}
        >
          <Icon
            className={cn("h-3.5 w-3.5", type === "loading" && "animate-spin")}
            strokeWidth={2.5}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-foreground">{title}</p>
          {message ? (
            <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground line-clamp-2">
              {message}
            </p>
          ) : null}
        </div>

        {type !== "loading" && (
          <button
            type="button"
            onClick={() => toast.dismiss(t.id)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        )}
      </div>

      {type !== "loading" && t.visible && (
        <div className="relative h-0.5 w-full bg-muted">
          <div className="cm-toast-progress absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-brand-mid to-primary" />
        </div>
      )}
    </div>
  );
}

function messageToText(message) {
  if (message == null) return "";
  if (typeof message === "string") return message;
  if (typeof message === "number") return String(message);
  if (Array.isArray(message)) return message.map(messageToText).filter(Boolean).join(" ");
  // react-hot-toast sometimes passes a render fn / element — fall back
  return "";
}

export function showAppToast({
  type = "info",
  title,
  message,
  duration,
  id,
} = {}) {
  const ms =
    duration ??
    (type === "error" ? 5500 : type === "loading" ? Infinity : 4800);

  return toast.custom(
    (t) => <ToastCard t={t} type={type} title={title} message={message} />,
    {
      id,
      duration: ms,
      position: "top-right",
    }
  );
}

let toastPatched = false;

/**
 * Route every toast.success / toast.error / etc. through the branded card UI.
 * Runs once for the whole app (all pages).
 */
export function patchGlobalToasts() {
  if (typeof window === "undefined" || toastPatched) return;
  toastPatched = true;

  const branded = (type, fallbackTitle) => (message, opts = {}) => {
    // Support toast.success(msg, { id }) and toast.success(msg, { duration })
    const text = messageToText(message);
    const description =
      typeof opts === "object" && opts && typeof opts.description === "string"
        ? opts.description
        : undefined;

    // Single-line toasts: use the string as the title (not "Success" + body)
    const title = text || fallbackTitle;
    const body = description || undefined;

    return showAppToast({
      type,
      title,
      message: body,
      duration: opts.duration,
      id: opts.id,
    });
  };

  toast.success = branded("success", "Success");
  toast.error = branded("error", "Something went wrong");
  toast.loading = branded("loading", "Please wait");
  // react-hot-toast has no toast.warning/info by default — add for site-wide use
  toast.warning = branded("warning", "Notice");
  toast.info = branded("info", "Notice");
}

/**
 * Global toaster — mounts once in _app.js so every page shares the same UI.
 */
export default function AppToaster() {
  useEffect(() => {
    patchGlobalToasts();
  }, []);

  return (
    <Toaster
      position="top-right"
      gutter={14}
      containerStyle={{ top: 18, right: 18, zIndex: 99999 }}
      toastOptions={{ duration: 4800 }}
    >
      {(t) => {
        // Branded custom cards (notify + patched toast.*)
        if (t.type === "custom") {
          return typeof t.message === "function" ? t.message(t) : t.message;
        }

        // Fallback for any unpatched toast types
        const type =
          t.type === "success"
            ? "success"
            : t.type === "error"
              ? "error"
              : t.type === "loading"
                ? "loading"
                : "info";

        const text = messageToText(t.message);

        return (
          <ToastCard
            t={t}
            type={type}
            title={text || "Notice"}
            message={undefined}
          />
        );
      }}
    </Toaster>
  );
}
