import { useState } from "react";
import { useAuth } from "../lib/authContext";
import Dropzone from "../components/Dropzone";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
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
import toast from "react-hot-toast";
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
  const { user, trackUsage } = useAuth();
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [previewUrls, setPreviewUrls] = useState({});
  const [viewingFile, setViewingFile] = useState(null); // { file, result, beforeUrl, afterUrl, beforeDimensions, afterDimensions }
  const [selectedFile, setSelectedFile] = useState(null); // filename of selected file

  // Default settings (used when no file is selected or as defaults for new files)
  const defaultSettings = {
    targetFormat: "jpg",
    quality: 85,
    preserveMetadata: false,
    rotation: 0,
    resizeEnabled: false,
    resizeWidth: 1920,
    resizeHeight: 1080,
    resizeMode: "fit",
    preserveTransparency: true,
    progressiveJpeg: false,
    formatPreset: "custom",
    watermarkEnabled: false,
    watermarkText: "",
    watermarkPosition: "bottom-right",
  };

  // Per-file settings: { [filename]: { targetFormat, quality, ... } }
  const [fileSettings, setFileSettings] = useState({});

  // Global settings (for batch operations when no file is selected)
  const [targetFormat, setTargetFormat] = useState("jpg");
  const [quality, setQuality] = useState(85);
  const [preserveMetadata, setPreserveMetadata] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [resizeEnabled, setResizeEnabled] = useState(false);
  const [resizeWidth, setResizeWidth] = useState(1920);
  const [resizeHeight, setResizeHeight] = useState(1080);
  const [resizeMode, setResizeMode] = useState("fit");
  const [preserveTransparency, setPreserveTransparency] = useState(true);
  const [progressiveJpeg, setProgressiveJpeg] = useState(false);
  const [formatPreset, setFormatPreset] = useState("custom");
  const [batchRename, setBatchRename] = useState(false);
  const [renamePattern, setRenamePattern] = useState("{original}");
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkPosition, setWatermarkPosition] = useState("bottom-right");
  const [showPreview, setShowPreview] = useState(false);

  // Get current settings (for selected file or global)
  const getCurrentSettings = () => {
    if (selectedFile && fileSettings[selectedFile]) {
      return fileSettings[selectedFile];
    }
    return {
      targetFormat,
      quality,
      preserveMetadata,
      rotation,
      resizeEnabled,
      resizeWidth,
      resizeHeight,
      resizeMode,
      preserveTransparency,
      progressiveJpeg,
      formatPreset,
      watermarkEnabled,
      watermarkText,
      watermarkPosition,
    };
  };

  // Update current settings (for selected file or global)
  const updateCurrentSettings = (updates) => {
    if (selectedFile) {
      setFileSettings(prev => ({
        ...prev,
        [selectedFile]: {
          ...defaultSettings,
          ...(prev[selectedFile] || {}),
          ...updates
        }
      }));
    } else {
      // Update global settings
      if (updates.targetFormat !== undefined) setTargetFormat(updates.targetFormat);
      if (updates.quality !== undefined) setQuality(updates.quality);
      if (updates.preserveMetadata !== undefined) setPreserveMetadata(updates.preserveMetadata);
      if (updates.rotation !== undefined) setRotation(updates.rotation);
      if (updates.resizeEnabled !== undefined) setResizeEnabled(updates.resizeEnabled);
      if (updates.resizeWidth !== undefined) setResizeWidth(updates.resizeWidth);
      if (updates.resizeHeight !== undefined) setResizeHeight(updates.resizeHeight);
      if (updates.resizeMode !== undefined) setResizeMode(updates.resizeMode);
      if (updates.preserveTransparency !== undefined) setPreserveTransparency(updates.preserveTransparency);
      if (updates.progressiveJpeg !== undefined) setProgressiveJpeg(updates.progressiveJpeg);
      if (updates.formatPreset !== undefined) setFormatPreset(updates.formatPreset);
      if (updates.watermarkEnabled !== undefined) setWatermarkEnabled(updates.watermarkEnabled);
      if (updates.watermarkText !== undefined) setWatermarkText(updates.watermarkText);
      if (updates.watermarkPosition !== undefined) setWatermarkPosition(updates.watermarkPosition);
    }
  };

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
    setFileSettings(prev => {
      const n = { ...prev };
      delete n[name];
      return n;
    });
    if (selectedFile === name) {
      setSelectedFile(null);
    }
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

    // Use per-file settings ONLY if the user explicitly customized this file
    // (fileSettings entry only exists if user clicked the file and changed its settings)
    // Otherwise, always use current global settings
    const settings = fileSettings[file.name] || {
      targetFormat,
      quality,
      preserveMetadata,
      rotation,
      resizeEnabled,
      resizeWidth,
      resizeHeight,
      resizeMode,
      preserveTransparency,
      progressiveJpeg,
      watermarkEnabled,
      watermarkText,
      watermarkPosition,
    };

    // Send format and quality separately for better API handling
    formData.append("format", settings.targetFormat);
    formData.append("quality", settings.quality.toString());
    formData.append("inputType", getFileType(file.name));
    formData.append("preserveMetadata", settings.preserveMetadata.toString());
    formData.append("rotation", settings.rotation.toString());
    formData.append("preserveTransparency", settings.preserveTransparency.toString());
    formData.append("progressiveJpeg", settings.progressiveJpeg.toString());
    
    if (settings.resizeEnabled) {
      formData.append("resizeEnabled", "true");
      formData.append("resizeWidth", settings.resizeWidth.toString());
      formData.append("resizeHeight", settings.resizeHeight.toString());
      formData.append("resizeMode", settings.resizeMode);
    }

    if (settings.watermarkEnabled && settings.watermarkText) {
      formData.append("watermarkEnabled", "true");
      formData.append("watermarkText", settings.watermarkText);
      formData.append("watermarkPosition", settings.watermarkPosition);
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
      const ext = res.headers.get("X-Output-Extension") || settings.targetFormat;

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
    let successCount = 0;
    const processedFiles = [];

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
        
        // Track usage if conversion was successful
        if (res.status === "done" && user && trackUsage) {
          successCount++;
          // Collect file information
          const inputExt = file.name.split('.').pop()?.toLowerCase() || '';
          const outputExt = res.ext || inputExt;
          const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          const fileInfo = {
            inputName: file.name,
            inputSize: file.size,
            inputFormat: inputExt,
            outputName: `${baseName}.${outputExt}`,
            outputSize: res.size || res.blob?.size || 0,
            outputFormat: outputExt,
          };
          console.log("Adding file info:", fileInfo);
          processedFiles.push(fileInfo);
        }
      }));
    }

    // Track usage after all conversions complete
    if (successCount > 0 && user && trackUsage) {
      console.log("Tracking usage - processedFiles:", processedFiles);
      console.log("Tracking usage - successCount:", successCount);
      trackUsage("/convert", successCount, successCount, {
        tool: "Image Converter",
        filesProcessed: successCount,
      }, processedFiles);
    }

    setProcessing(false);
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    let count = 0;
    files.forEach((f, index) => {
      const res = results[f.name];
      if (res?.status === "done") {
        let name;
        if (batchRename && renamePattern) {
          const originalName = f.name.substring(0, f.name.lastIndexOf("."));
          name = renamePattern
            .replace(/{original}/g, originalName)
            .replace(/{index}/g, (index + 1).toString())
            .replace(/{format}/g, res.ext) + "." + res.ext;
        } else {
          name = f.name.substring(0, f.name.lastIndexOf(".")) + "." + res.ext;
        }
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
    setSelectedFile(null);
    setFileSettings({});
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
          <CollapsibleDropzone
            files={files}
            setFiles={handleFilesAdded}
            title="Upload Images to Convert"
            description="JPG, PNG, WebP, HEIC, TIFF • Max 10MB each"
            accept={{
              "image/jpeg": [".jpg", ".jpeg", ".JPG", ".JPEG"],
              "image/png": [".png", ".PNG"],
              "image/webp": [".webp", ".WEBP"],
              "image/heic": [".heic", ".HEIC"],
              "image/gif": [".gif", ".GIF"],
              "image/bmp": [".bmp", ".BMP"],
              "image/tiff": [".tiff", ".tif", ".TIFF", ".TIF"]
            }}
            borderColor="border-gray-300"
            hoverColor="hover:border-purple-500"
          />

          {/* 2. Controls & List */}
          {files.length > 0 && (
            <div className="grid md:grid-cols-[300px_1fr] gap-6 items-start">

              {/* Sidebar: Settings */}
              <Card className="md:sticky md:top-24 h-fit overflow-hidden">
                <CardContent className="p-5 space-y-6">
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex items-center gap-2 font-semibold text-lg text-gray-800 flex-1 min-w-0">
                      <Settings2 className="w-5 h-5 flex-shrink-0" /> 
                      <span className="truncate">Output Settings</span>
                    </div>
                    {selectedFile && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedFile(null)}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 whitespace-nowrap flex-shrink-0 h-7 px-2"
                      >
                        Clear Selection
                      </Button>
                    )}
                  </div>
                  {selectedFile && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                      <div className="text-xs text-purple-600 font-medium mb-1">Editing Settings For:</div>
                      <div className="text-sm font-semibold text-purple-900 truncate">{selectedFile}</div>
                    </div>
                  )}
                  {!selectedFile && files.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                      <div className="text-xs text-gray-600 font-medium mb-1">Global Settings</div>
                      <div className="text-sm text-gray-500">Click a file to edit individual settings</div>
                    </div>
                  )}

                  {/* Format Presets */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-600">Format Preset</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "custom", label: "Custom", icon: "⚙️" },
                        { id: "web", label: "Web", icon: "🌐" },
                        { id: "print", label: "Print", icon: "🖨️" },
                        { id: "social", label: "Social", icon: "📱" },
                      ].map(preset => {
                        const current = getCurrentSettings();
                        return (
                          <button
                            key={preset.id}
                            onClick={() => {
                              if (preset.id === "web") {
                                updateCurrentSettings({
                                  formatPreset: preset.id,
                                  targetFormat: "webp",
                                  quality: 80,
                                  resizeEnabled: true,
                                  resizeWidth: 1920,
                                  resizeMode: "fit",
                                });
                              } else if (preset.id === "print") {
                                updateCurrentSettings({
                                  formatPreset: preset.id,
                                  targetFormat: "jpg",
                                  quality: 95,
                                  resizeEnabled: false,
                                });
                              } else if (preset.id === "social") {
                                updateCurrentSettings({
                                  formatPreset: preset.id,
                                  targetFormat: "jpg",
                                  quality: 85,
                                  resizeEnabled: true,
                                  resizeWidth: 1080,
                                  resizeMode: "fit",
                                });
                              } else {
                                updateCurrentSettings({ formatPreset: preset.id });
                              }
                            }}
                            className={cn(
                              "p-2 rounded-lg border-2 transition-all text-center text-xs",
                              current.formatPreset === preset.id
                                ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm"
                                : "border-gray-200 hover:border-gray-300 text-gray-600"
                            )}
                          >
                            <div className="text-lg mb-1">{preset.icon}</div>
                            <div className="font-medium">{preset.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Format Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-600">Target Format</label>
                    <div className="grid grid-cols-1 gap-2">
                      {['jpg', 'png', 'webp'].map(fmt => {
                        const current = getCurrentSettings();
                        return (
                          <button
                            key={fmt}
                            onClick={() => {
                              updateCurrentSettings({ targetFormat: fmt, formatPreset: "custom" });
                            }}
                            className={cn(
                              "flex items-center justify-between px-3 py-3 text-sm rounded-lg border-2 transition-all uppercase font-medium",
                              current.targetFormat === fmt ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm" : "border-gray-200 hover:border-gray-300 text-gray-600"
                            )}
                          >
                            {fmt}
                            {current.targetFormat === fmt && <CheckCircle className="w-4 h-4 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quality Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-gray-600">Quality</label>
                      <span className="text-sm font-bold text-purple-600">{getCurrentSettings().quality}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={getCurrentSettings().quality}
                      onChange={(e) => updateCurrentSettings({ quality: Number(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                    {getCurrentSettings().targetFormat === 'png' && (
                      <p className="text-xs text-gray-500 italic">PNG uses lossless compression</p>
                    )}
                  </div>

                  {/* Format-Specific Options */}
                  {getCurrentSettings().targetFormat === 'png' && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={getCurrentSettings().preserveTransparency}
                          onChange={(e) => updateCurrentSettings({ preserveTransparency: e.target.checked })}
                          className="w-4 h-4 accent-purple-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Preserve Transparency</span>
                      </label>
                    </div>
                  )}

                  {getCurrentSettings().targetFormat === 'jpg' && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={getCurrentSettings().progressiveJpeg}
                          onChange={(e) => updateCurrentSettings({ progressiveJpeg: e.target.checked })}
                          className="w-4 h-4 accent-purple-600"
                        />
                        <span className="text-sm font-medium text-gray-700">Progressive JPEG</span>
                      </label>
                    </div>
                  )}

                  {/* Rotation */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-600">Rotation</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 90, 180, 270].map((angle) => {
                        const current = getCurrentSettings();
                        return (
                          <button
                            key={angle}
                            onClick={() => updateCurrentSettings({ rotation: angle })}
                            className={cn(
                              "px-3 py-2 text-sm rounded-lg border-2 transition-all font-medium",
                              current.rotation === angle
                                ? "border-purple-500 bg-purple-50 text-purple-700"
                                : "border-gray-200 hover:border-gray-300 text-gray-600"
                            )}
                          >
                            {angle}°
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resize Option */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={getCurrentSettings().resizeEnabled}
                        onChange={(e) => updateCurrentSettings({ resizeEnabled: e.target.checked })}
                        className="w-4 h-4 accent-purple-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Resize During Conversion</span>
                    </label>
                    {getCurrentSettings().resizeEnabled && (
                      <div className="bg-gray-50 rounded-lg p-3 space-y-3 border border-gray-200">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Width (px)</label>
                            <input
                              type="number"
                              value={getCurrentSettings().resizeWidth}
                              onChange={(e) => updateCurrentSettings({ resizeWidth: Number(e.target.value) })}
                              className="w-full px-2 py-1 text-sm border rounded-md"
                              min="1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Height (px)</label>
                            <input
                              type="number"
                              value={getCurrentSettings().resizeHeight}
                              onChange={(e) => updateCurrentSettings({ resizeHeight: Number(e.target.value) })}
                              className="w-full px-2 py-1 text-sm border rounded-md"
                              min="1"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Resize Mode</label>
                          <select
                            value={getCurrentSettings().resizeMode}
                            onChange={(e) => updateCurrentSettings({ resizeMode: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded-md"
                          >
                            <option value="fit">Fit (maintain aspect)</option>
                            <option value="fill">Fill (crop to fit)</option>
                            <option value="exact">Exact (may distort)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metadata Option */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={getCurrentSettings().preserveMetadata}
                        onChange={(e) => updateCurrentSettings({ preserveMetadata: e.target.checked })}
                        className="w-4 h-4 accent-purple-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Preserve EXIF Metadata</span>
                    </label>
                  </div>

                  {/* Watermark */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={getCurrentSettings().watermarkEnabled}
                        onChange={(e) => updateCurrentSettings({ watermarkEnabled: e.target.checked })}
                        className="w-4 h-4 accent-purple-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Add Watermark</span>
                    </label>
                    {getCurrentSettings().watermarkEnabled && (
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-200">
                        <input
                          type="text"
                          placeholder="Watermark text"
                          value={getCurrentSettings().watermarkText}
                          onChange={(e) => updateCurrentSettings({ watermarkText: e.target.value })}
                          className="w-full px-2 py-1 text-sm border rounded-md"
                        />
                        <select
                          value={getCurrentSettings().watermarkPosition}
                          onChange={(e) => updateCurrentSettings({ watermarkPosition: e.target.value })}
                          className="w-full px-2 py-1 text-sm border rounded-md"
                        >
                          <option value="top-left">Top Left</option>
                          <option value="top-right">Top Right</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="bottom-right">Bottom Right</option>
                          <option value="center">Center</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Batch Rename */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={batchRename}
                        onChange={(e) => setBatchRename(e.target.checked)}
                        className="w-4 h-4 accent-purple-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Custom File Names</span>
                    </label>
                    {batchRename && (
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-200">
                        <input
                          type="text"
                          placeholder="{original} or image_{index}"
                          value={renamePattern}
                          onChange={(e) => setRenamePattern(e.target.value)}
                          className="w-full px-2 py-1 text-sm border rounded-md font-mono text-xs"
                        />
                        <p className="text-xs text-gray-500">
                          Use {"{original}"} for original name, {"{index}"} for number
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Preview Toggle */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={showPreview}
                        onChange={(e) => setShowPreview(e.target.checked)}
                        className="w-4 h-4 accent-purple-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Show Preview Before Conversion</span>
                    </label>
                  </div>

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
                  const isSelected = selectedFile === file.name;
                  const fileSettingsForThis = fileSettings[file.name] || { targetFormat };

                  return (
                    <Card 
                      key={file.name + idx} 
                      className={cn(
                        "overflow-hidden border-2 shadow-sm hover:shadow-md transition-all cursor-pointer",
                        isSelected 
                          ? "border-purple-500 bg-purple-50/30 shadow-md" 
                          : "border-gray-200 hover:border-purple-300"
                      )}
                      onClick={() => setSelectedFile(file.name)}
                    >
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openViewModal(file, res);
                                    }}
                                    title="View before/after"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-green-600" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const url = URL.createObjectURL(res.blob);
                                      const a = document.createElement("a");
                                      a.href = url;
                                      let downloadName;
                                      if (batchRename && renamePattern) {
                                        const originalName = file.name.substring(0, file.name.lastIndexOf("."));
                                        const fileIndex = files.findIndex(f => f.name === file.name);
                                        downloadName = renamePattern
                                          .replace(/{original}/g, originalName)
                                          .replace(/{index}/g, (fileIndex + 1).toString())
                                          .replace(/{format}/g, res.ext) + "." + res.ext;
                                      } else {
                                        downloadName = file.name.substring(0, file.name.lastIndexOf(".")) + "." + res.ext;
                                      }
                                      a.download = downloadName;
                                      a.click();
                                      URL.revokeObjectURL(url);
                                    }}
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-gray-400 hover:text-red-500" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile(file.name);
                                }} 
                                title="Remove"
                              >
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
                                {res.percent !== 0 && (
                                  <span className={cn(
                                    "text-xs font-bold ml-1",
                                    res.percent > 0 ? "text-green-600" : "text-red-600"
                                  )}>
                                    ({res.percent > 0 ? '-' : '+'}{Math.abs(res.percent)}%)
                                  </span>
                                )}
                                <Badge variant="outline" className="border-purple-200 text-purple-700 uppercase">
                                  {res.ext}
                                </Badge>
                              </>
                            ) : (
                              <Badge variant="outline" className="text-gray-400 border-dashed border-gray-300 uppercase">
                                To {fileSettingsForThis.targetFormat}
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
                      <span className={cn(
                        "font-medium",
                        viewingFile.result.percent > 0 ? "text-green-600" : viewingFile.result.percent < 0 ? "text-red-600" : "text-gray-600"
                      )}>
                        {formatSize(viewingFile.result.size)}
                        {viewingFile.result.percent !== 0 && (
                          <span className={cn(
                            "ml-2",
                            viewingFile.result.percent > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            ({viewingFile.result.percent > 0 ? '-' : '+'}{Math.abs(viewingFile.result.percent)}%)
                          </span>
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
                    <div className="text-xs text-gray-500 mb-1">Size Change</div>
                    <div className={cn(
                      "text-lg font-bold",
                      viewingFile.result.percent > 0 ? "text-green-600" : viewingFile.result.percent < 0 ? "text-red-600" : "text-gray-600"
                    )}>
                      {viewingFile.result.percent !== 0 
                        ? `${viewingFile.result.percent > 0 ? '-' : '+'}${Math.abs(viewingFile.result.percent)}%` 
                        : '0%'}
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
