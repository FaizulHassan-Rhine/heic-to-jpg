import { useState } from "react";
import Dropzone from "../components/Dropzone";
import FilePreview from "../components/FilePreview";
import { Loader2, Moon, Sun } from "lucide-react";

export default function Home() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(false);

  const remove = (i) => setFiles(files.filter((_, idx) => idx !== i));

  const convert = async () => {
    if (files.length === 0) return alert("Please upload HEIC files.");

    const form = new FormData();
    files.forEach((f) => form.append("files", f));

    setLoading(true);
    const res = await fetch("/api/convert", { method: "POST", body: form });
    const blob = await res.blob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.zip";
    a.click();
    URL.revokeObjectURL(url);

    setLoading(false);
  };

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen p-6">
        <button
          onClick={() => setDark(!dark)}
          className="absolute top-4 right-4 p-2 bg-gray-200 dark:bg-gray-800 rounded-full"
        >
          {dark ? <Sun /> : <Moon />}
        </button>

        <div className="max-w-3xl mx-auto mt-10">
          <h1 className="text-3xl font-bold text-center mb-8">
            HEIC → JPG Bulk Converter
          </h1>

          <Dropzone setFiles={setFiles} />

          {files.length > 0 && (
            <FilePreview files={files} remove={remove} />
          )}

          <div className="text-center mt-8">
            <button
              onClick={convert}
              disabled={loading}
              className="px-6 py-3 rounded-lg bg-primary text-white shadow-lg hover:bg-primary/80 transition"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" /> Converting...
                </span>
              ) : (
                "Convert & Download ZIP"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
