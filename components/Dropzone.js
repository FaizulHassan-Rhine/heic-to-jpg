import { useDropzone } from "react-dropzone";
import { useCallback } from "react";
import { Card, CardContent } from "./ui/card";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dropzone({ setFiles, resetResults }) {
  const onDrop = useCallback((acceptedFiles) => {
    // Fix for HEIC file type in browsers
    const fixedFiles = acceptedFiles.map(
      (f) => new File([f], f.name || "image.heic", { type: f.type })
    );

    // Clear previous batch
    resetResults();

    // Replace files with new uploaded ones
    setFiles(fixedFiles);
  }, [setFiles, resetResults]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/heic": [".heic", ".HEIC"] },
    multiple: true,
    onDrop,
  });

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
          {isDragActive ? "Drop files here" : "Drag & Drop HEIC images here"}
        </p>
        <p className="text-sm text-muted-foreground">or click to select</p>
      </CardContent>
    </Card>
  );
}
