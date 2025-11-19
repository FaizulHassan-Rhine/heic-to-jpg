import { useDropzone } from "react-dropzone";
import { useCallback } from "react";

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
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "image/heic": [".heic", ".HEIC"] },
    multiple: true,
    onDrop,
  });

  return (
    <div
      {...getRootProps()}
      className="border-2 border-dashed border-gray-400 dark:border-gray-700 p-10 rounded-xl text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
    >
      <input {...getInputProps()} />
      <p className="text-lg font-semibold">Drag & Drop HEIC images here</p>
      <p className="text-gray-500 text-sm">or click to select</p>
    </div>
  );
}
