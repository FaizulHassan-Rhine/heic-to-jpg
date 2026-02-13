import { useState } from "react";
import Dropzone from "../components/Dropzone";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import JSZip from "jszip";
import {
  Loader2, CheckCircle, Download, AlertCircle, FileImage,
  RefreshCw, Trash2, Upload, RotateCcw, Image as ImageIcon,
  Settings2, ArrowRight, Eye, X
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
  const [viewingFile, setViewingFile] = useState(null); // { file, result, beforeUrl, afterUrl, beforeDimensions, afterDimensions }

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

  const convertSingle = async (file, onProgress) => {
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
      // Simulate progress
      const progressInterval = setInterval(() => {
        if (onProgress) {
          const current = onProgress.current || 0;
          if (current < 90) {
            onProgress.current = Math.min(current + Math.random() * 15, 90);
            onProgress.callback(onProgress.current);
          }
        }
      }, 150);

      const res = await fetch("/api/convert-single", {
        method: "POST",
        body: formData
      });

      clearInterval(progressInterval);
      
      if (onProgress) {
        onProgress.current = 100;
        onProgress.callback(100);
      }

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
      if (!newResults[f.name] || newResults[f.name].status === "error") {
        newResults[f.name] = { status: "processing", progress: 0 };
      }
    }
    setResults({ ...newResults });

    // Process in batches
    const pending = files.filter(f => !results[f.name] || results[f.name].status === "error");

    for (let i = 0; i < pending.length; i += 3) {
      const batch = pending.slice(i, i + 3);
      await Promise.all(batch.map(async (file) => {
        const progressTracker = {
          current: 0,
          callback: (progress) => {
            setResults(prev => ({
              ...prev,
              [file.name]: { ...prev[file.name], progress: Math.round(progress) }
            }));
          }
        };
        const res = await convertSingle(file, progressTracker);
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

    if (count === 0) {
      toast.error("No completed files to download");
      return;
    }
    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = "converted_images.zip";
    a.click();
    toast.success(`Downloaded ${count} file${count > 1 ? 's' : ''}`);
  };

  const clearAll = () => {
    // Revoke all preview URLs
    Object.values(previewUrls).forEach(url => URL.revokeObjectURL(url));
    setFiles([]);
    setResults({});
    setPreviewUrls({});
    setViewingFile(null);
    toast.success("All files cleared");
  };

  const getImageDimensions = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = url;
    });
  };

  const openViewModal = async (file, result) => {
    const hasPreview = !!previewUrls[file.name];
    const beforeUrl = previewUrls[file.name] || URL.createObjectURL(file);
    const afterUrl = URL.createObjectURL(result.blob);
    
    const beforeDims = await getImageDimensions(beforeUrl);
    const afterDims = await getImageDimensions(afterUrl);

    setViewingFile({
      file,
      result,
      beforeUrl,
      afterUrl,
      beforeDimensions: beforeDims,
      afterDimensions: afterDims,
      createdBeforeUrl: !hasPreview // Track if we created the before URL
    });
  };

  const closeViewModal = () => {
    if (viewingFile) {
      // Revoke the after URL (converted image) as it's created here
      if (viewingFile.afterUrl) {
        URL.revokeObjectURL(viewingFile.afterUrl);
      }
      // Only revoke before URL if we created it (not from previewUrls)
      if (viewingFile.createdBeforeUrl && viewingFile.beforeUrl) {
        URL.revokeObjectURL(viewingFile.beforeUrl);
      }
    }
    setViewingFile(null);
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
                {/* Header with Stats and Actions */}
                <Card className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                        Files
                      </h3>
                      <div className="flex gap-2">
                        {Object.values(results).some(r => r.status === "done") && (
                          <Button variant="outline" size="sm" onClick={downloadAll}>
                            <Download className="w-4 h-4 mr-2" /> Download All
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={clearAll} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4 mr-2" /> Clear All
                        </Button>
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium">Total:</span>
                        <Badge variant="secondary" className="font-semibold">
                          {files.length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium">Completed:</span>
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 font-semibold">
                          {Object.values(results).filter(r => r.status === "done").length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium">Processing:</span>
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 font-semibold">
                          {Object.values(results).filter(r => r.status === "processing").length}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

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
                                <>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-blue-600 hover:text-blue-700" 
                                    onClick={() => openViewModal(file, res)}
                                    title="View before/after"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-green-600" 
                                    onClick={() => {
                                      const url = URL.createObjectURL(res.blob);
                                      const a = document.createElement("a");
                                      a.href = url;
                                      a.download = file.name.substring(0, file.name.lastIndexOf(".")) + "." + res.ext;
                                      a.click();
                                    }}
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => removeFile(file.name)} title="Remove">
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
                        <div className="px-3 pb-3 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-purple-600 font-medium">Processing...</span>
                            <span className="text-purple-600 font-bold">{res.progress || 0}%</span>
                          </div>
                          <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 transition-all duration-300 ease-out"
                              style={{ width: `${res.progress || 0}%` }}
                            />
                          </div>
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

      {/* View Modal - Before/After Comparison */}
      {viewingFile && (
        <div 
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={closeViewModal}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{viewingFile.file.name}</h3>
                <p className="text-sm text-gray-500 mt-1">Before & After Comparison</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={closeViewModal}
                className="h-8 w-8"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Before Image */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Badge variant="secondary" className="bg-gray-100">BEFORE</Badge>
                    </h4>
                  </div>
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    <img 
                      src={viewingFile.beforeUrl} 
                      alt="Before" 
                      className="w-full h-auto max-h-96 object-contain mx-auto"
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Format:</span>
                      <Badge variant="outline" className="uppercase">
                        {getFileType(viewingFile.file.name)}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Size:</span>
                      <span className="font-medium">{formatSize(viewingFile.file.size)}</span>
                    </div>
                    {viewingFile.beforeDimensions && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dimensions:</span>
                        <span className="font-medium">
                          {viewingFile.beforeDimensions.width} × {viewingFile.beforeDimensions.height}px
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* After Image */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200">AFTER</Badge>
                    </h4>
                  </div>
                  <div className="border-2 border-purple-200 rounded-lg overflow-hidden bg-gray-50">
                    <img 
                      src={viewingFile.afterUrl} 
                      alt="After" 
                      className="w-full h-auto max-h-96 object-contain mx-auto"
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Format:</span>
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200 uppercase">
                        {viewingFile.result.ext}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Size:</span>
                      <span className="font-medium text-green-600">
                        {formatSize(viewingFile.result.size)}
                        {viewingFile.result.percent > 0 && (
                          <span className="ml-2 text-green-600">(-{viewingFile.result.percent}%)</span>
                        )}
                      </span>
                    </div>
                    {viewingFile.afterDimensions && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dimensions:</span>
                        <span className="font-medium">
                          {viewingFile.afterDimensions.width} × {viewingFile.afterDimensions.height}px
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Size Reduction</div>
                    <div className="text-lg font-bold text-green-600">
                      {viewingFile.result.percent > 0 ? `-${viewingFile.result.percent}%` : '0%'}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Saved</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatSize(viewingFile.result.saved)}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-1">Quality</div>
                    <div className="text-lg font-bold text-purple-600 capitalize">
                      {quality}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
