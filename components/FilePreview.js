import { Image, X } from "lucide-react";

export default function FilePreview({ files, remove }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      {files.map((file, i) => (
        <div key={i} className="relative bg-white dark:bg-gray-800 p-3 rounded-lg shadow">
          <button
            onClick={() => remove(i)}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
          >
            <X size={14} />
          </button>

          <div className="flex flex-col items-center">
            <Image className="text-primary mb-2" size={38} />
            <p className="text-sm truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
      ))}
    </div>
  );
}
