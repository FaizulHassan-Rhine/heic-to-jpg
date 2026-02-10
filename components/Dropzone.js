import { useDropzone } from "react-dropzone";
import { useCallback } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dropzone({
  setFiles,
  resetResults,
  inputType,
  accept, // New prop for custom accept types
  title, // New prop for custom title
  description, // New prop for custom description
  disabled,
  onDisabledClick,
  className
}) {
  const onDrop = useCallback((acceptedFiles) => {
    if (disabled) {
      if (onDisabledClick) onDisabledClick();
      return;
    }

    // Process files (maintain existing HEIC fix logic but make it safe)
    const fixedFiles = acceptedFiles.map((f) => {
      // If manually constructed file, ensure properties exist
      if (!f.type && f.name) {
        const ext = f.name.split('.').pop().toLowerCase();
        const mimeTypes = {
          'heic': 'image/heic',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'webp': 'image/webp',
          'mp4': 'video/mp4',
          'mov': 'video/quicktime',
          'avi': 'video/x-msvideo',
          'mkv': 'video/x-matroska',
          'webm': 'video/webm',
          'gif': 'image/gif',
          'mp3': 'audio/mpeg',
        };
        if (mimeTypes[ext]) {
          return new File([f], f.name, { type: mimeTypes[ext] });
        }
      }
      return f;
    });

    if (resetResults) resetResults();
    setFiles(fixedFiles);
  }, [setFiles, resetResults, disabled, onDisabledClick]);

  // Determine accept types
  const getAcceptObject = () => {
    if (accept) return accept; // Use custom accept if provided

    if (!inputType) return undefined; // Accept all if no specific inputType

    const types = {
      'heic': { "image/heic": [".heic", ".HEIC"] },
      'jpg': { "image/jpeg": [".jpg", ".jpeg", ".JPG", ".JPEG"] },
      'png': { "image/png": [".png", ".PNG"] },
      'webp': { "image/webp": [".webp", ".WEBP"] }
    };
    return types[inputType] || {};
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: getAcceptObject(),
    multiple: true,
    onDrop,
    disabled: disabled,
    noClick: disabled,
  });

  const handleClick = (e) => {
    if (disabled) {
      e.stopPropagation();
      if (onDisabledClick) onDisabledClick();
    }
  };

  // Default values
  const displayTitle = title || "Drag & Drop files here";
  const displayDesc = description || (inputType ? `Please select ${inputType.toUpperCase()} files` : "Support for multiple formats");

  const rootProps = getRootProps();

  return (
    <div
      {...rootProps}
      onClick={disabled ? handleClick : rootProps.onClick}
      className={cn(
        "w-full border-2 border-dashed rounded-xl transition-all duration-200",
        "flex flex-col items-center justify-center text-center",
        "bg-gradient-to-br from-background to-muted/20",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:border-primary/50 hover:bg-gradient-to-br hover:from-primary/5 hover:to-primary/10 hover:shadow-lg hover:shadow-primary/10",
        isDragActive && !disabled
          ? "border-primary bg-gradient-to-br from-primary/10 to-primary/20 shadow-lg shadow-primary/20 scale-[1.02]"
          : "border-border",
        className // Allow custom classes like padding
      )}
    >
      <input {...getInputProps()} />

      <div className="p-4 flex flex-col items-center gap-4">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
          isDragActive ? "bg-primary text-primary-foreground scale-110" : "bg-muted text-muted-foreground"
        )}>
          <Upload className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-semibold tracking-tight">
            {isDragActive ? "Drop files now" : displayTitle}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {displayDesc}
          </p>
        </div>
      </div>
    </div>
  );
}
