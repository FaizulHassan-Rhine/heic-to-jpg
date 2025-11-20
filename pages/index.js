import { useState } from "react";
import Dropzone from "../components/Dropzone";
import JSZip from "jszip";
import { Loader2, CheckCircle, Download, X, AlertCircle } from "lucide-react";

export default function Home() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [format, setFormat] = useState("jpg-high");
  const [totalUploads, setTotalUploads] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);

  // Reset previous results when uploading new batch
  const resetResults = () => {
    setFiles([]);
    setResults({});
    setProcessing(false);
  };

  // Track uploads when files are added
  const handleFilesAdded = (newFiles) => {
    setFiles(newFiles);
    setTotalUploads((prev) => prev + newFiles.length);
  };

  // Remove a single file from the list
  const removeFile = (fileName) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
    setResults((prev) => {
      const updated = { ...prev };
      delete updated[fileName];
      return updated;
    });
  };

  const convertAll = async () => {
    setProcessing(true);

    const updated = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      updated[file.name] = { status: "processing", percent: 0 };
      setResults({ ...updated });

      // Smooth progress simulation
      let p = 0;
      const timer = setInterval(() => {
        p += Math.random() * 15;
        if (p >= 95) p = 95;
        updated[file.name].percent = Math.floor(p);
        setResults({ ...updated });
      }, 200);

      // SEND REQUEST TO API
      const form = new FormData();
      form.append("file", file);
      form.append("format", format);

      try {
        const res = await fetch("/api/convert-single", {
          method: "POST",
          body: form,
        });

        clearInterval(timer);

        if (!res.ok) {
          throw new Error("Conversion failed");
        }

        const out = await res.arrayBuffer();
        const ext = res.headers.get("X-Output-Extension");
        const blob = new Blob([out]);

        updated[file.name] = {
          status: "done",
          percent: 100,
          ext,
          blob,
          size: blob.size,
        };

        setResults({ ...updated });
        setTotalCompleted((prev) => prev + 1);
      } catch (error) {
        clearInterval(timer);
        updated[file.name] = {
          status: "error",
          percent: 0,
        };
        setResults({ ...updated });
        console.error("Conversion error:", error);
      }
    }

    setProcessing(false);
  };

  const downloadAll = async () => {
    const zip = new JSZip();

    for (const name in results) {
      const r = results[name];
      if (r.status === "done") {
        const outName = name.replace(/\.(heic|HEIC)$/i, `.${r.ext}`);
        zip.file(outName, r.blob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = "converted.zip";
    a.click();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">

      <h1 className="text-3xl font-bold text-center mb-8">
        HEIC → JPG / WebP Converter
      </h1>

      {/* Statistics Display */}
      <div className="mb-6 flex justify-center gap-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-3 rounded-lg shadow">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Uploaded</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalUploads}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 px-6 py-3 rounded-lg shadow">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Completed</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalCompleted}</p>
        </div>
      </div>

      <Dropzone setFiles={handleFilesAdded} resetResults={resetResults} />

      {/* QUALITY OPTIONS */}
      <div className="mt-6 text-center">
        <p className="font-semibold mb-2">Output Format</p>

        <div className="flex justify-center gap-4">
          <label className="border-2 border-gray-300 rounded-md p-2 cursor-pointer">
            <input
              type="radio"
              name="format"
              defaultChecked
              onChange={() => setFormat("jpg-high")}
            />{" "}
            High-Res JPG (95%)
          </label>

          <label className="border-2 border-gray-300 rounded-md p-2 cursor-pointer">
            <input
              type="radio"
              name="format"
              onChange={() => setFormat("jpg-balanced")}
            />{" "}
            Balanced JPG (80%)
          </label>

          <label className="border-2 border-gray-300 rounded-md p-2 cursor-pointer">
            <input
              type="radio"
              name="format"
              onChange={() => setFormat("webp-high")}
            />{" "}
            High-Res WebP (90%)
          </label>

          <label className="border-2 border-gray-300 rounded-md p-2 cursor-pointer">
            <input
              type="radio"
              name="format"
              onChange={() => setFormat("webp-balanced")}
            />{" "}
            Balanced WebP (80%)
          </label>
        </div>
      </div>

      {/* Convert Button */}
      {files.length > 0 && (
        <div className="text-center mt-8">
          <button
            onClick={convertAll}
            disabled={processing}
            className="px-6 py-3 bg-primary text-white rounded-lg shadow hover:bg-primary/80"
          >
            {processing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" /> Converting...
              </span>
            ) : (
              "Convert All"
            )}
          </button>
        </div>
      )}

      {/* FILE STATUS LIST */}
      <div className="mt-10 space-y-4">
        {files.map((file) => {
          const result = results[file.name];
          const percent = result?.percent ?? 0;

          return (
            <div key={file.name} className="p-4 bg-white shadow rounded-lg relative">
              {/* Remove Button */}
              <button
                onClick={() => removeFile(file.name)}
                disabled={processing}
                className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Remove file"
              >
                <X size={16} />
              </button>

              <p className="font-semibold pr-8">{file.name}</p>

              <p className="text-sm text-gray-600">
                {!result && "Pending"}
                {result?.status === "processing" &&
                  `Converting... ${percent}%`}
                {result?.status === "done" &&
                  `Done — ${(result.size / 1024).toFixed(2)} KB`}
                {result?.status === "error" &&
                  "Error — Conversion failed"}
              </p>

              {/* Progress Bar */}
              {result?.status === "processing" && (
                <div className="w-full bg-gray-200 h-2 rounded mt-3">
                  <div
                    className="bg-primary h-2 rounded transition-all duration-200"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              )}

              {result?.status === "done" && (
                <CheckCircle size={22} className="text-green-600 mt-3" />
              )}

              {result?.status === "error" && (
                <AlertCircle size={22} className="text-red-600 mt-3" />
              )}
            </div>
          );
        })}
      </div>

      {/* Download ZIP */}
      {files.length > 0 &&
        Object.values(results).filter((x) => x.status === "done").length ===
          files.length && (
          <div className="text-center mt-10">
            <button
              onClick={downloadAll}
              className="px-6 py-3 bg-green-600 text-white rounded-lg flex gap-2 items-center hover:bg-green-700 mx-auto"
            >
              <Download /> Download All (ZIP)
            </button>
          </div>
        )}
    </div>
  );
}
