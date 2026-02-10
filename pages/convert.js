import { useState } from "react";
import Dropzone from "../components/Dropzone";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import JSZip from "jszip";
import {
  Loader2, CheckCircle, Download, AlertCircle, FileImage,
  RefreshCw, Trash2, Upload, RotateCcw, Image as ImageIcon,
  Settings2, ArrowRight
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { cn } from "@/lib/utils";
import toast, { Toaster } from "react-hot-toast";
import Head from "next/head";

// ─────────────────────────── HELPERS ───────────────────────────

const formatSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getFileType = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  if (['heic'].includes(ext)) return 'heic';
  if (['jpg', 'jpeg'].includes(ext)) return 'jpg';
  if (['png'].includes(ext)) return 'png';
  if (['webp'].includes(ext)) return 'webp';
  return 'unknown';
};

// ─────────────────────────── COMPONENT ───────────────────────────

export default function ConvertImage() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [previewUrls, setPreviewUrls] = useState({});

  // Settings
  const [targetFormat, setTargetFormat] = useState("jpg"); // jpg, png, webp
  const [quality, setQuality] = useState("high"); // high, balanced

  // ── File Handling ──

  const handleFilesAdded = (newFiles) => {
    // Filter oversized
    const valid = [];
    newFiles.forEach(f => {
      if (f.size > 20 * 1024 * 1024) toast.error(`"${f.name}" is too large (>20MB)`);
      else valid.push(f);
    });

    if (valid.length === 0) return;

    // Generate previews
    const newPreviews = {};
    valid.forEach(f => {
      const type = getFileType(f.name);
      // HEIC previews are hard client-side without libs, so skip for now (or handle if lib exists)
      if (type !== 'heic' && f.type.startsWith("image/")) {
        newPreviews[f.name] = URL.createObjectURL(f);
      }
    });

    setFiles(prev => [...prev, ...valid]);
    setPreviewUrls(prev => ({ ...prev, ...newPreviews }));
  };

  const removeFile = (name) => {
    setFiles(prev => prev.filter(f => f.name !== name));
    setResults(prev => {
      const n = { ...prev };
      delete n[name];
      return n;
    });
    if (previewUrls[name]) {
      URL.revokeObjectURL(previewUrls[name]);
      setPreviewUrls(prev => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }
  };

  // ── Conversion Logic ──

  const convertSingle = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    // Construct format string expected by API (e.g., "jpg-high")
    // Previous API uses "jpg-high", "webp-balanced" etc.
    // PNG doesn't typically have quality suffix in the previous code map, but "png" is enough.

    let formatString = targetFormat;
    if (targetFormat !== 'png') {
      formatString = `${targetFormat}-${quality}`;
    }

    formData.append("format", formatString);
    formData.append("inputType", getFileType(file.name));

    try {
      const res = await fetch("/api/convert-single", {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error("Failed");

      const blob = await res.blob();
      const ext = res.headers.get("X-Output-Extension") || targetFormat;

      return {
        status: "done",
        blob,
        size: blob.size,
        ext,
        saved: Math.max(0, file.size - blob.size),
        percent: Math.round(((file.size - blob.size) / file.size) * 100)
      };

    } catch (e) {
      console.error(e);
      return { status: "error" };
    }
  };

  const processAll = async () => {
    setProcessing(true);
    const newResults = { ...results };

    // Mark all pending
    for (const f of files) {
      if (!newResults[f.name]) {
        newResults[f.name] = { status: "processing" };
      }
    }
    setResults({ ...newResults });

    // Process in batches
    const pending = files.filter(f => !results[f.name] || results[f.name].status === "error");

    for (let i = 0; i < pending.length; i += 3) {
      const batch = pending.slice(i, i + 3);
      await Promise.all(batch.map(async (file) => {
        const res = await convertSingle(file);
        setResults(prev => ({ ...prev, [file.name]: res }));
      }));
    }

    setProcessing(false);
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    let count = 0;
    files.forEach(f => {
      const res = results[f.name];
      if (res?.status === "done") {
        const name = f.name.substring(0, f.name.lastIndexOf(".")) + "." + res.ext;
        zip.file(name, res.blob);
        count++;
      }
    });

    if (count === 0) return;
    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = "converted_images.zip";
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Head>
        <title>Convert Images - ConvertMastery</title>
      </Head>
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
            Convert Images
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Transform HEIC, JPG, PNG, WEBP files instantly.
            Mass conversion with high quality.
          </p>
        </div>

        {/* Main Workspace */}
        <div className="grid gap-8">

          {/* 1. Upload */}
          <Card className="border-2 border-dashed border-gray-300 hover:border-purple-500 bg-white shadow-sm transition-all">
            <CardContent className="p-0">
              <Dropzone
                setFiles={handleFilesAdded}
                className="p-10"
                title="Upload Images to Convert"
                description="JPG, PNG, WebP, HEIC, TIFF • Max 10MB each"
              // Removed inputType restriction to allow any image
              />
            </CardContent>
          </Card>

          {/* 2. Controls & List */}
          {files.length > 0 && (
            <div className="grid md:grid-cols-[300px_1fr] gap-6 items-start">

              {/* Sidebar: Settings */}
              <Card className="md:sticky md:top-24 h-fit">
                <CardContent className="p-5 space-y-6">
                  <div className="flex items-center gap-2 font-semibold text-lg text-gray-800">
                    <Settings2 className="w-5 h-5" /> Output Settings
                  </div>

                  {/* Format Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-600">Target Format</label>
                    <div className="grid grid-cols-1 gap-2">
                      {['jpg', 'png', 'webp'].map(fmt => (
                        <button
                          key={fmt}
                          onClick={() => setTargetFormat(fmt)}
                          className={cn(
                            "flex items-center justify-between px-3 py-3 text-sm rounded-lg border-2 transition-all uppercase font-medium",
                            targetFormat === fmt ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm" : "border-gray-200 hover:border-gray-300 text-gray-600"
                          )}
                        >
                          {fmt}
                          {targetFormat === fmt && <CheckCircle className="w-4 h-4 ml-2" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality Selection */}
                  {targetFormat !== 'png' && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-600">Quality</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setQuality("high")}
                          className={cn("px-2 py-2 text-sm rounded-lg border-2 transition-all", quality === "high" ? "border-purple-500 bg-purple-50 text-purple-700 font-medium" : "border-gray-200 hover:border-gray-300")}
                        >
                          High
                        </button>
                        <button
                          onClick={() => setQuality("balanced")}
                          className={cn("px-2 py-2 text-sm rounded-lg border-2 transition-all", quality === "balanced" ? "border-purple-500 bg-purple-50 text-purple-700 font-medium" : "border-gray-200 hover:border-gray-300")}
                        >
                          Balanced
                        </button>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <Button
                    onClick={processAll}
                    disabled={processing}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white h-11"
                  >
                    {processing ? (
                      <> <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Converting... </>
                    ) : (
                      <> <RefreshCw className="w-4 h-4 mr-2" /> Convert All </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Main: File List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                    Files ({files.length})
                  </h3>
                  {Object.values(results).some(r => r.status === "done") && (
                    <Button variant="outline" size="sm" onClick={downloadAll}>
                      <Download className="w-4 h-4 mr-2" /> Download All
                    </Button>
                  )}
                </div>

                {files.map((file, idx) => {
                  const res = results[file.name];
                  const preview = previewUrls[file.name];

                  return (
                    <Card key={file.name + idx} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center p-3 gap-4">
                        {/* Preview */}
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden relative border">
                          {preview ? (
                            <img src={preview} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-xs font-bold text-gray-400 uppercase">
                              {file.name.split('.').pop()}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium truncate pr-4 text-gray-900">{file.name}</h4>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              {res?.status === "done" && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => {
                                  const url = URL.createObjectURL(res.blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = file.name.substring(0, file.name.lastIndexOf(".")) + "." + res.ext;
                                  a.click();
                                }}>
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => removeFile(file.name)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm mt-1">
                            <Badge variant="secondary" className="font-normal text-gray-500 bg-gray-100 hover:bg-gray-100">
                              {formatSize(file.size)}
                            </Badge>

                            <ArrowRight className="w-3 h-3 text-gray-300" />

                            {res?.status === "done" ? (
                              <>
                                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">
                                  {formatSize(res.size)}
                                </Badge>
                                {res.percent > 0 && (
                                  <span className="text-xs font-bold text-green-600 ml-1">
                                    (-{res.percent}%)
                                  </span>
                                )}
                                <Badge variant="outline" className="border-purple-200 text-purple-700 uppercase">
                                  {res.ext}
                                </Badge>
                              </>
                            ) : (
                              <Badge variant="outline" className="text-gray-400 border-dashed border-gray-300 uppercase">
                                To {targetFormat}
                              </Badge>
                            )}

                            {res?.status === "error" && (
                              <Badge variant="destructive">Error</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {res?.status === "processing" && (
                        <div className="h-1 bg-purple-100 w-full">
                          <div className="h-full bg-purple-500 animate-pulse w-full"></div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
