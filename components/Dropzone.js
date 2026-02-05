import { useDropzone } from "react-dropzone";
import { useCallback } from "react";
import { Card, CardContent } from "./ui/card";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dropzone({ setFiles, resetResults, inputType, disabled, onDisabledClick }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (disabled) {
      if (onDisabledClick) onDisabledClick();
      return;
    }

    // Fix for HEIC file type in browsers and ensure correct MIME types
    const fixedFiles = acceptedFiles.map((f) => {
      // Determine MIME type from file extension if not set
      let mimeType = f.type;
      if (!mimeType) {
        const ext = f.name.split('.').pop().toLowerCase();
        const mimeTypes = {
          'heic': 'image/heic',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'webp': 'image/webp',
        };
        mimeType = mimeTypes[ext] || f.type;
      }
      
      return new File([f], f.name || `image.${inputType || 'heic'}`, { type: mimeType });
    });

    // Clear previous batch
    resetResults();

    // Replace files with new uploaded ones
    setFiles(fixedFiles);
  }, [setFiles, resetResults, inputType, disabled, onDisabledClick]);

  // Get accept object based on input type
  const getAcceptObject = () => {
    if (!inputType) {
      return {};
    }
    
    if (inputType === 'heic') {
      return { "image/heic": [".heic", ".HEIC"] };
    }
    if (inputType === 'jpg') {
      return { "image/jpeg": [".jpg", ".jpeg", ".JPG", ".JPEG"] };
    }
    if (inputType === 'png') {
      return { "image/png": [".png", ".PNG"] };
    }
    if (inputType === 'webp') {
      return { "image/webp": [".webp", ".WEBP"] };
    }
    return {};
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: getAcceptObject(),
    multiple: true,
    onDrop,
    disabled: disabled,
    noClick: disabled,
  });

  const handleClick = () => {
    if (disabled && onDisabledClick) {
      onDisabledClick();
    }
  };

  const getTypeLabel = () => {
    if (inputType === 'heic') return 'HEIC';
    if (inputType === 'jpg') return 'JPG';
    if (inputType === 'png') return 'PNG';
    if (inputType === 'webp') return 'WebP';
    return 'images';
  };

  const rootProps = getRootProps();
  
  return (
    <div
      {...rootProps}
      onClick={disabled ? handleClick : rootProps.onClick}
      className={cn(
        "w-full border-2 border-dashed rounded-xl transition-all duration-200",
        "flex flex-col items-center justify-center py-20 px-8",
        "bg-gradient-to-br from-background to-muted/20",
        disabled 
          ? "cursor-not-allowed opacity-50" 
          : "cursor-pointer hover:border-primary/50 hover:bg-gradient-to-br hover:from-primary/5 hover:to-primary/10 hover:shadow-lg hover:shadow-primary/10",
        isDragActive && !disabled
          ? "border-primary bg-gradient-to-br from-primary/10 to-primary/20 shadow-lg shadow-primary/20 scale-[1.02]" 
          : "border-border"
      )}
    >
      <input {...getInputProps()} />
      <div className={cn(
        "mb-6 p-4 rounded-full transition-all duration-200",
        isDragActive 
          ? "bg-primary/10 scale-110" 
          : "bg-muted"
      )}>
        <Upload className={cn(
          "h-10 w-10 transition-colors duration-200",
          isDragActive ? "text-primary" : "text-muted-foreground"
        )} />
      </div>
      <p className={cn(
        "text-lg font-semibold mb-2 transition-colors",
        isDragActive && "text-primary"
      )}>
        {isDragActive ? "Drop files here" : `Drag & Drop images here`}
      </p>
      <p className="text-sm text-muted-foreground">
        {inputType ? `Upload ${getTypeLabel()} files` : "Please select an input format first"}
      </p>
    </div>
  );
}
