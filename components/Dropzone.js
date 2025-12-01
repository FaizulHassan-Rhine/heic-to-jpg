import { useDropzone } from "react-dropzone";
import { useCallback } from "react";
import { Card, CardContent } from "./ui/card";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dropzone({ setFiles, resetResults, inputType }) {
  const onDrop = useCallback((acceptedFiles) => {
    // Fix for HEIC file type in browsers
    const fixedFiles = acceptedFiles.map(
      (f) => new File([f], f.name || `image.${inputType || 'heic'}`, { type: f.type })
    );

    // Clear previous batch
    resetResults();

    // Replace files with new uploaded ones
    setFiles(fixedFiles);
  }, [setFiles, resetResults, inputType]);

  // Get accept object based on input type
  const getAcceptObject = () => {
    if (!inputType) return {};
    
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
  });

  const getTypeLabel = () => {
    if (inputType === 'heic') return 'HEIC';
    if (inputType === 'jpg') return 'JPG';
    if (inputType === 'png') return 'PNG';
    if (inputType === 'webp') return 'WebP';
    return 'images';
  };

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "cursor-pointer transition-colors border-dashed",
        isDragActive && "border-primary bg-accent"
      )}
    >
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mb-4 text-muted-foreground" />
        <p className="text-lg font-semibold mb-2">
          {isDragActive ? "Drop files here" : `Drag & Drop ${getTypeLabel()} images here`}
        </p>
        <p className="text-sm text-muted-foreground">
          {inputType ? `Upload ${getTypeLabel()} files` : "Select a conversion type first"}
        </p>
      </CardContent>
    </Card>
  );
}
