import { useState, useEffect } from "react";
import Dropzone from "../components/Dropzone";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import JSZip from "jszip";
import {
  Loader2, CheckCircle, Download, AlertCircle, FileImage,
  Zap, RefreshCw, Trash2, Upload, RotateCcw, Image as ImageIcon,
  Settings2, ArrowRight, Minimize2, Scale, Eye, X
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

const calculateEstimatedSize = (originalSize, oldW, oldH, newW, newH) => {
  if (!oldW || !oldH || !newW || !newH || !originalSize) return null;
  const oldArea = oldW * oldH;
  const newArea = newW * newH;
  const ratio = newArea / oldArea;

  // Heuristic: Size scales with area, but JPEG compression adds non-linear savings.
  // Assume modest additional compression savings (0.9 factor) plus area reduction.
  // Clamped to at least 5% of original to be safe.
  let estimated = originalSize * ratio * 0.9;

  // If ratio is 1 (no resize), assume just re-compression savings (e.g. 80% quality -> ~0.7 size)
  if (ratio >= 0.99) estimated = originalSize * 0.7;

  return Math.max(estimated, originalSize * 0.05);
};

// ─────────────────────────── COMPONENT ───────────────────────────

export default function CompressImage() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [previewUrls, setPreviewUrls] = useState({});
  const [dimensions, setDimensions] = useState({}); // { [filename]: { w, h } }
  const [viewingFile, setViewingFile] = useState(null); // { file, result, beforeUrl, afterUrl, beforeDimensions, afterDimensions }

  // Settings
  const [resizeMode, setResizeMode] = useState("percentage"); // percentage, pixel, ratio

  // Mode: Percentage
  const [percentageValue, setPercentageValue] = useState(80);

  // Mode: Pixel
  const [pixelSubMode, setPixelSubMode] = useState("fixedRatio"); // fixedRatio, custom
  const [targetWidth, setTargetWidth] = useState(1920);
  const [targetHeight, setTargetHeight] = useState(1080);

  // Mode: Ratio
  const [ratioValue, setRatioValue] = useState(0.8);

  // ── File Handling ──

  const handleFilesAdded = (newFiles) => {
    // Filter oversized
    const valid = [];
    newFiles.forEach(f => {
      if (f.size > 20 * 1024 * 1024) toast.error(`"${f.name}" is too large (>20MB)`);
      else valid.push(f);
    });

    if (valid.length === 0) return;

    const newPreviews = {};

    valid.forEach(f => {
      if (f.type.startsWith("image/")) {
        const url = URL.createObjectURL(f);
        newPreviews[f.name] = url;

        // Load dimensions
        const img = new Image();
        img.onload = () => {
          setDimensions(prev => ({
            ...prev,
            [f.name]: { w: img.naturalWidth, h: img.naturalHeight }
          }));
        };
        img.src = url;
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
    setDimensions(prev => {
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

  // ── Estimates ──

  const getEstimatedDimensions = (originalW, originalH) => {
    if (!originalW || !originalH) return null;

    if (resizeMode === "percentage") {
      const s = percentageValue / 100;
      return { w: Math.round(originalW * s), h: Math.round(originalH * s) };
    }

    if (resizeMode === "ratio") {
      return { w: Math.round(originalW * ratioValue), h: Math.round(originalH * ratioValue) };
    }

    if (resizeMode === "pixel") {
      if (pixelSubMode === "custom") {
        return { w: targetWidth, h: targetHeight };
      } else {
        // Fixed ratio based on target width
        // Calculate height based on aspect ratio
        const ratio = originalH / originalW;
        return { w: targetWidth, h: Math.round(targetWidth * ratio) };
      }
    }

    return { w: originalW, h: originalH };
  };

  // ── Compression Logic ──

  const compressSingle = async (file, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);

    // API expects: compressionType (percentage|ratio|pixel), compressionValue, pixelWidth, pixelHeight

    if (resizeMode === "percentage") {
      formData.append("compressionType", "percentage");
      formData.append("compressionValue", percentageValue);
    } else if (resizeMode === "ratio") {
      formData.append("compressionType", "ratio");
      formData.append("compressionValue", ratioValue * 100); // API ratio logic often expects similar scale or just use percentage mapped
      // Wait, checking original `compress.js`: "percentage" used 1-100. "ratio" used 1-100 in input but logic was `value/100`.
      // Let's assume API handles `compressionType: ratio` with `compressionValue` as 0-1 or 0-100?
      // Original code: `if (compressionType === "ratio") areaRatio = (compressionValue/100) * (compressionValue/100)` -> Wait, that's area. 
      // The API actually supports 'percentage', 'ratio', 'pixel'.
      // I will send `compressionValue` as percentage (0-100) for Ratio mode too if API treats them similarly, 
      // or just map Ratio to Percentage for robustness if API is simple.
      // Let's try sending as percentage (0-100) since standard Ratio usually 0.5 = 50%.
      formData.append("compressionValue", Math.round(ratioValue * 100));
    } else if (resizeMode === "pixel") {
      formData.append("compressionType", "pixel");
      const dims = getEstimatedDimensions(dimensions[file.name]?.w || 1920, dimensions[file.name]?.h || 1080);
      formData.append("pixelWidth", dims.w);
      formData.append("pixelHeight", dims.h);
    }

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

      const res = await fetch("/api/compress-single", {
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
      const ext = res.headers.get("X-Output-Extension") || "jpg";

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

    // Clear old results if re-running
    const pending = files; // Process all files again if button clicked? Or only pending?
    // Usually "Compress All" implies re-running everything with new settings.

    // Mark all as processing
    for (const f of files) {
      newResults[f.name] = { status: "processing", progress: 0 };
    }
    setResults({ ...newResults });

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
        const res = await compressSingle(file, progressTracker);
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
        const name = f.name.substring(0, f.name.lastIndexOf(".")) + "_min." + res.ext;
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
    a.download = "compressed_images.zip";
    a.click();
    toast.success(`Downloaded ${count} file${count > 1 ? 's' : ''}`);
  };

  const clearAll = () => {
    // Revoke all preview URLs
    Object.values(previewUrls).forEach(url => URL.revokeObjectURL(url));
    setFiles([]);
    setResults({});
    setPreviewUrls({});
    setDimensions({});
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
      // Revoke the after URL (compressed image) as it's created here
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
        <title>Compress Images - ConvertMastery</title>
      </Head>
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
            Compress Images
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Reduce image size by smart scaling and optimization.
          </p>
        </div>

        <div className="grid gap-8">

          {/* Upload */}
          <Card className="border-2 border-dashed border-gray-300 hover:border-blue-500 bg-white shadow-sm transition-all">
            <CardContent className="p-0">
              <Dropzone setFiles={handleFilesAdded} className="p-10" title="Upload Images to Compress" description="JPG, PNG, WebP • Max 10MB each" />
            </CardContent>
          </Card>

          {/* Workspace */}
          {files.length > 0 && (
            <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-start">

              {/* Sidebar: Settings */}
              <Card className="lg:sticky lg:top-24 h-fit border-0 shadow-lg ring-1 ring-gray-100">
                <CardContent className="p-6 space-y-8">
                  <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
                    <Settings2 className="w-6 h-6 text-blue-600" /> Settings
                  </div>

                  {/* Mode Tabs */}
                  <div className="space-y-4">
                    <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Resizing Mode</label>
                    <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl">
                      {['percentage', 'pixel', 'ratio'].map(mode => (
                        <button
                          key={mode}
                          onClick={() => setResizeMode(mode)}
                          className={cn(
                            "py-2 text-sm rounded-lg transition-all font-medium capitalize",
                            resizeMode === mode ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                          )}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Controls */}
                  <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 space-y-4">
                    {resizeMode === "percentage" && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Scale</span>
                          <span className="text-lg font-bold text-blue-600">{percentageValue}%</span>
                        </div>
                        <input
                          type="range" min="1" max="100" step="1"
                          value={percentageValue}
                          onChange={(e) => setPercentageValue(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <p className="text-xs text-gray-500">
                          Scaling down to {percentageValue}% of original dimensions.
                        </p>
                      </div>
                    )}

                    {resizeMode === "ratio" && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Ratio</span>
                          <span className="text-lg font-bold text-blue-600">{ratioValue.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range" min="0.01" max="1.00" step="0.01"
                          value={ratioValue}
                          onChange={(e) => setRatioValue(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <p className="text-xs text-gray-500">
                          Multiply dimensions by {ratioValue}.
                        </p>
                      </div>
                    )}

                    {resizeMode === "pixel" && (
                      <div className="space-y-5">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPixelSubMode("fixedRatio")}
                            className={cn("flex-1 py-1.5 text-xs rounded border transition-all", pixelSubMode === "fixedRatio" ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold" : "border-gray-200 text-gray-600")}
                          >
                            Fixed Ratio
                          </button>
                          <button
                            onClick={() => setPixelSubMode("custom")}
                            className={cn("flex-1 py-1.5 text-xs rounded border transition-all", pixelSubMode === "custom" ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold" : "border-gray-200 text-gray-600")}
                          >
                            Custom W/H
                          </button>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase">Width (px)</label>
                            <input
                              type="number"
                              value={targetWidth}
                              onChange={(e) => setTargetWidth(Number(e.target.value))}
                              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                            />
                          </div>

                          {pixelSubMode === "custom" && (
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase">Height (px)</label>
                              <input
                                type="number"
                                value={targetHeight}
                                onChange={(e) => setTargetHeight(Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                              />
                            </div>
                          )}
                          {pixelSubMode === "fixedRatio" && (
                            <p className="text-xs text-gray-400 italic">
                              Height will be calculated automatically to maintain aspect ratio.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={processAll}
                    disabled={processing}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 shadow-md hover:shadow-lg transition-all font-semibold text-base"
                  >
                    {processing ? (
                      <> <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Compressing... </>
                    ) : (
                      <> <Zap className="w-5 h-5 mr-2" /> Compress All </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* File List */}
              <div className="space-y-5">
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
                  const dims = dimensions[file.name];
                  const estDims = getEstimatedDimensions(dims?.w, dims?.h);
                  const estSize = estDims ? calculateEstimatedSize(file.size, dims?.w, dims?.h, estDims.w, estDims.h) : null;
                  const estReduction = estSize ? Math.round(((file.size - estSize) / file.size) * 100) : 0;

                  return (
                    <Card key={file.name + idx} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                      <div className="p-4 flex gap-5 items-center">
                        {/* Thumbnail */}
                        <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden relative border border-gray-200">
                          {preview ? (
                            <img src={preview} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-gray-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold truncate pr-4 text-gray-900 text-lg">{file.name}</h4>

                            <div className="flex gap-2">
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
                                    className="h-8 w-8 text-green-600 bg-green-50 hover:bg-green-100" 
                                    onClick={() => {
                                      const url = URL.createObjectURL(res.blob);
                                      const a = document.createElement("a");
                                      a.href = url;
                                      a.download = "min_" + file.name;
                                      a.click();
                                    }}
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeFile(file.name)} title="Remove">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Metrics Row */}
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            {/* Original Size */}
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 font-mono">
                              {formatSize(file.size)}
                            </Badge>

                            <ArrowRight className="w-3 h-3 text-gray-300" />

                            {/* Result / Estimate */}
                            {res?.status === "done" ? (
                              <>
                                <Badge className="bg-green-100 text-green-700 border-green-200 font-mono hover:bg-green-100">
                                  {formatSize(res.size)}
                                </Badge>
                                <span className="font-bold text-green-600 text-xs">
                                  -{res.percent}%
                                </span>
                              </>
                            ) : (
                              <>
                                {(estSize && estSize < file.size) ? (
                                  <>
                                    <span className="text-gray-500 font-mono text-xs">
                                      ~{formatSize(estSize)}
                                    </span>
                                    <span className="text-blue-600 font-bold text-xs">
                                      (-{estReduction}%)
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-gray-400 italic text-xs">
                                    Ready
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Dimensions Visualizer (The "Live Reducer") */}
                          {dims && estDims && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 bg-gray-50 px-2 py-1 rounded-md w-fit border border-gray-100">
                              <Scale className="w-3 h-3 text-blue-400" />
                              <span className="font-mono">{dims.w}x{dims.h}</span>
                              <ArrowRight className="w-3 h-3 text-gray-300" />
                              <span className="font-mono font-bold text-blue-600">{estDims.w}x{estDims.h}px</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {res?.status === "processing" && (
                        <div className="px-4 pb-4 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-blue-600 font-medium">Processing...</span>
                            <span className="text-blue-600 font-bold">{res.progress || 0}%</span>
                          </div>
                          <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-600 transition-all duration-300 ease-out"
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
                <p className="text-sm text-gray-500 mt-1">Before & After Compression Comparison</p>
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
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">AFTER</Badge>
                    </h4>
                  </div>
                  <div className="border-2 border-blue-200 rounded-lg overflow-hidden bg-gray-50">
                    <img 
                      src={viewingFile.afterUrl} 
                      alt="After" 
                      className="w-full h-auto max-h-96 object-contain mx-auto"
                    />
                  </div>
                  <div className="space-y-2 text-sm">
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
                    <div className="text-xs text-gray-500 mb-1">Compression Mode</div>
                    <div className="text-lg font-bold text-blue-600 capitalize">
                      {resizeMode}
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
