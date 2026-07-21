import { cn } from "@/lib/utils";

/**
 * Privacy note under tool headers — files are processed on the fly, not saved.
 */
export default function ToolSignupBanner({
  onSignUp,
  className,
  message,
}) {
  return (
    <div
      className={cn(
        "mt-5 max-w-2xl mx-auto rounded-xl border border-brand-mid/20 bg-brand-sky/40 dark:bg-accent/60 px-4 py-3.5 text-left sm:text-center",
        className
      )}
      role="note"
    >
      <p className="text-sm text-foreground leading-relaxed">
        {message || (
          <>
            <span className="font-semibold text-primary">Private &amp; on-the-fly.</span>
            {" "}
            Files are processed in your session and never saved to our servers. Download results instantly — nothing is stored in My Orders or a database.
            {onSignUp ? (
              <>
                {" "}
                Optional{" "}
                <button
                  type="button"
                  onClick={onSignUp}
                  className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
                >
                  sign-in
                </button>
                {" "}
                unlocks advanced options only.
              </>
            ) : null}
          </>
        )}
      </p>
    </div>
  );
}
