import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Upload, Plus } from "lucide-react";
import Dropzone from "./Dropzone";
import { cn } from "@/lib/utils";

export default function CollapsibleDropzone({
  files = [],
  setFiles,
  resetResults,
  accept,
  title,
  description,
  limitsText,
  disabled,
  onDisabledClick,
  className,
  borderColor = "border-border/80",
  hoverColor = "hover:border-primary/50",
  maxFiles,
  currentFileCount,
}) {
  const [isExpanded, setIsExpanded] = useState(files.length === 0);
  const [userManuallyExpanded, setUserManuallyExpanded] = useState(false);
  const prevFileCountRef = useRef(files.length);
  const hasFiles = files.length > 0;

  useEffect(() => {
    const count = files.length;
    const prev = prevFileCountRef.current;

    if (count === 0) {
      setIsExpanded(true);
      setUserManuallyExpanded(false);
      prevFileCountRef.current = 0;
    } else if (count > prev) {
      if (!userManuallyExpanded) {
        const timer = setTimeout(() => setIsExpanded(false), 800);
        prevFileCountRef.current = count;
        return () => clearTimeout(timer);
      }
      prevFileCountRef.current = count;
    } else {
      prevFileCountRef.current = count;
    }
  }, [files.length, userManuallyExpanded]);

  const handleManualExpand = () => {
    setUserManuallyExpanded(true);
    setIsExpanded(true);
  };

  const handleManualCollapse = () => {
    setUserManuallyExpanded(false);
    setIsExpanded(false);
  };

  const collapsed = hasFiles && !isExpanded;

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-dashed bg-card overflow-hidden transition-all duration-300",
        hasFiles ? borderColor : "border-brand-mid/40 bg-brand-sky/10",
        collapsed && hoverColor,
        className
      )}
    >
      {/* Collapsed bar */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          collapsed ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
        )}
        aria-hidden={!collapsed}
      >
        <div
          role="button"
          tabIndex={collapsed ? 0 : -1}
          aria-expanded={isExpanded}
          aria-label={`${title || "Upload files"}. ${files.length} file${files.length !== 1 ? "s" : ""} uploaded. Click to add more.`}
          onClick={handleManualExpand}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleManualExpand();
            }
          }}
          className="flex items-center justify-between cursor-pointer p-3 sm:p-3.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm flex-shrink-0">
              <Upload className="w-5 h-5" aria-hidden />
            </div>
            <div className="text-left min-w-0">
              <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {title || "Upload Files"}
              </div>
              <div className="text-xs text-muted-foreground">
                {files.length} file{files.length !== 1 ? "s" : ""} uploaded • Click to add more
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleManualExpand();
              }}
              className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Add more files"
            >
              <Plus className="w-4 h-4" />
            </button>
            <ChevronDown
              className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors"
              aria-hidden
            />
          </div>
        </div>
      </div>

      {/* Expanded dropzone */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          !hasFiles || isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}
        aria-hidden={collapsed}
      >
        {hasFiles && (
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-primary" aria-hidden />
              <span className="font-medium">
                {files.length} file{files.length !== 1 ? "s" : ""} ready
              </span>
            </div>
            <button
              type="button"
              onClick={handleManualCollapse}
              className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Minimize upload area"
              aria-expanded={isExpanded}
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className={hasFiles ? "px-3 pb-3" : "p-0"}>
          <Dropzone
            setFiles={setFiles}
            resetResults={resetResults}
            accept={accept}
            title={title}
            description={description}
            limitsText={limitsText}
            disabled={disabled}
            onDisabledClick={onDisabledClick}
            compact={hasFiles}
            browseLabel={hasFiles ? "Add more files" : "Browse files"}
            className={
              hasFiles
                ? "border-0 bg-transparent hover:bg-brand-sky/15 min-h-[120px]"
                : "border-0 rounded-none bg-transparent hover:bg-brand-sky/25"
            }
            maxFiles={maxFiles}
            currentFileCount={currentFileCount}
          />
        </div>
      </div>
    </div>
  );
}
