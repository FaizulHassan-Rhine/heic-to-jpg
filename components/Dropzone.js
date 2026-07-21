import { useDropzone } from "react-dropzone";
import { useCallback } from "react";
import { Upload, FolderOpen } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function Dropzone({
  setFiles,
  resetResults,
  inputType,
  accept,
  title,
  description,
  disabled,
  onDisabledClick,
  className,
  maxFiles,
  currentFileCount = 0,
  compact = false,
  browseLabel = "Browse files",
}) {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (disabled) {
        if (onDisabledClick) onDisabledClick();
        return;
      }

      if (maxFiles !== undefined && maxFiles !== null && maxFiles > 0) {
        const totalFiles = currentFileCount + acceptedFiles.length;

        if (totalFiles > maxFiles) {
          const excess = totalFiles - maxFiles;
          toast.error(
            `Maximum ${maxFiles} files allowed. You have ${currentFileCount} files and trying to add ${acceptedFiles.length} (${excess} too many). Please remove some files first.`
          );
          if (onDisabledClick) onDisabledClick();
          return;
        }
        if (acceptedFiles.length > maxFiles) {
          toast.error(
            `Cannot upload more than ${maxFiles} files at once. You selected ${acceptedFiles.length} files.`
          );
          if (onDisabledClick) onDisabledClick();
          return;
        }
      }

      const fixedFiles = acceptedFiles.map((f) => {
        if (!f.type && f.name) {
          const ext = f.name.split(".").pop().toLowerCase();
          const mimeTypes = {
            heic: "image/heic",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            webp: "image/webp",
            mp4: "video/mp4",
            mov: "video/quicktime",
            avi: "video/x-msvideo",
            mkv: "video/x-matroska",
            webm: "video/webm",
            gif: "image/gif",
            mp3: "audio/mpeg",
          };
          if (mimeTypes[ext]) {
            return new File([f], f.name, { type: mimeTypes[ext] });
          }
        }
        return f;
      });

      if (resetResults) resetResults();
      setFiles(fixedFiles);
    },
    [setFiles, resetResults, disabled, onDisabledClick, maxFiles, currentFileCount]
  );

  const getAcceptObject = () => {
    if (accept) return accept;
    if (!inputType) return undefined;
    const types = {
      heic: { "image/heic": [".heic", ".HEIC"] },
      jpg: { "image/jpeg": [".jpg", ".jpeg", ".JPG", ".JPEG"] },
      png: { "image/png": [".png", ".PNG"] },
      webp: { "image/webp": [".webp", ".WEBP"] },
    };
    return types[inputType] || {};
  };

  const onDropRejected = useCallback(
    (rejectedFiles) => {
      if (!rejectedFiles?.length) return;
      let hasTooManyFilesError = false;
      for (const rejection of rejectedFiles) {
        if (rejection.errors?.some((e) => e.code === "too-many-files")) {
          hasTooManyFilesError = true;
          break;
        }
      }
      if (hasTooManyFilesError && maxFiles > 0) {
        toast.error(
          `Cannot upload more than ${maxFiles} files. ${rejectedFiles.length} file${rejectedFiles.length > 1 ? "s" : ""} rejected.`
        );
      } else if (rejectedFiles[0]?.errors?.[0]) {
        toast.error(rejectedFiles[0].errors[0].message || "File upload rejected");
      }
    },
    [maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: getAcceptObject(),
    multiple: true,
    maxFiles: maxFiles !== undefined && maxFiles > 0 ? maxFiles - currentFileCount : undefined,
    onDrop,
    onDropRejected,
    disabled,
    noClick: disabled,
    noKeyboard: false,
  });

  const handleRootClick = (e) => {
    if (disabled) {
      e.stopPropagation();
      if (onDisabledClick) onDisabledClick();
    }
  };

  const handleBrowse = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) {
      if (onDisabledClick) onDisabledClick();
      return;
    }
    open();
  };

  const displayTitle = title || "Drag & drop files here";
  const displayDesc =
    description ||
    (inputType ? `Please select ${inputType.toUpperCase()} files` : "Support for multiple formats");

  const rootProps = getRootProps();

  return (
    <div
      {...rootProps}
      onClick={disabled ? handleRootClick : rootProps.onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-label={isDragActive ? "Drop files now" : displayTitle}
      className={cn(
        "group w-full border-2 border-dashed rounded-xl transition-all duration-200",
        "flex flex-col items-center justify-center text-center",
        "bg-brand-sky/15 dark:bg-muted/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:border-primary/70 hover:bg-brand-sky/30",
        isDragActive && !disabled
          ? "border-primary bg-brand-sky/45 scale-[1.01] shadow-sm shadow-primary/10"
          : "border-brand-mid/35",
        compact
          ? "min-h-[120px] py-5 px-4"
          : "min-h-[160px] sm:min-h-[180px] md:min-h-[200px] py-10 px-5 sm:py-12 md:py-14",
        className
      )}
    >
      <input {...getInputProps()} />

      <div
        className={cn(
          "flex flex-col items-center w-full max-w-md mx-auto",
          compact ? "gap-2.5" : "gap-4"
        )}
      >
        <div
          className={cn(
            "rounded-full flex items-center justify-center transition-all duration-300 ring-4 ring-brand-sky/40",
            compact ? "w-12 h-12" : "w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem]",
            isDragActive
              ? "bg-primary text-primary-foreground scale-105 ring-primary/20"
              : "bg-brand-sky/80 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
          )}
          aria-hidden
        >
          <Upload className={cn(compact ? "w-5 h-5" : "w-7 h-7 sm:w-8 sm:h-8")} strokeWidth={2} />
        </div>

        <div className="space-y-1.5 px-1">
          <h3
            className={cn(
              "font-semibold tracking-tight text-foreground",
              compact ? "text-base" : "text-lg md:text-xl"
            )}
          >
            {isDragActive ? "Drop files now" : displayTitle}
          </h3>
          {!isDragActive && !compact && (
            <p className="text-xs text-primary/80 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Drop files here to upload
            </p>
          )}
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {displayDesc}
          </p>
        </div>

        {!disabled && (
          <Button
            type="button"
            variant={compact ? "outline" : "default"}
            size={compact ? "sm" : "default"}
            onClick={handleBrowse}
            className={cn(
              "mt-1 focus-visible:ring-2 focus-visible:ring-primary/40",
              compact ? "w-full sm:w-auto" : "w-full sm:w-auto min-w-[160px] h-11 text-sm font-semibold"
            )}
          >
            <FolderOpen className="w-4 h-4 mr-2" aria-hidden />
            {browseLabel}
          </Button>
        )}

        {!compact && !isDragActive && (
          <p className="text-xs text-muted-foreground pt-0.5">
            or drag and drop anywhere in this area
          </p>
        )}
      </div>
    </div>
  );
}
