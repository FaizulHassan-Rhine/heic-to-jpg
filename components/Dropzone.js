import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";

export default function Dropzone({ setFiles }) {
  const onDrop = useCallback((acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/heic": [".heic", ".HEIC"] },
    multiple: true,
    onDrop
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-10 cursor-pointer transition
        ${isDragActive ? "border-primary bg-primary/10" : "border-gray-400 dark:border-gray-700"}
      `}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center text-center">
        <UploadCloud size={50} className="text-primary mb-3" />
        <p className="text-lg font-semibold">Drag & Drop HEIC images here</p>
        <p className="text-gray-500 mt-2">or click to select files</p>
      </div>
    </div>
  );
}
