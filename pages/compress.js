import { useState, useEffect } from "react";
import { useAuth } from "../lib/authContext";
import { useSettings } from "../lib/useSettings";
import { generateFileThumbnails } from "../lib/thumbnailUtils";
import { blobToBase64, extractBase64 } from "../lib/fileUtils";
import Dropzone from "../components/Dropzone";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AuthModal from "../components/AuthModal";
import JSZip from "jszip";
import {
  Loader2, CheckCircle, Download, AlertCircle, FileImage,
  Zap, RefreshCw, Trash2, Upload, RotateCcw, Image as ImageIcon,
  Settings2, ArrowRight, Minimize2, Scale, Eye, X, ChevronDown, ChevronUp, Lock
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import SEO from "../components/SEO";

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
  const { user, trackUsage } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [previewUrls, setPreviewUrls] = useState({});
  const [dimensions, setDimensions] = useState({}); // { [filename]: { w, h } }
  const [viewingFile, setViewingFile] = useState(null); // { file, result, beforeUrl, afterUrl, beforeDimensions, afterDimensions }
  const [selectedFile, setSelectedFile] = useState(null); // filename of selected file

  // Default settings (used when no file is selected or as defaults for new files)
  const defaultSettings = {
    resizeMode: "percentage",
    compressionPreset: "balanced",
    quality: 85,
    targetFileSize: "",
    useTargetSize: false,
    progressiveJpeg: false,
    optimizePalette: true,
    stripMetadata: false,
    losslessCompression: false,
    convertFormat: false,
    targetFormat: "jpg",
    smartCrop: false,
    percentageValue: 80,
    pixelSubMode: "fixedRatio",
    targetWidth: 1920,
    targetHeight: 1080,
    ratioValue: 0.8,
  };

  // Per-file settings: { [filename]: { resizeMode, quality, ... } }
  const [fileSettings, setFileSettings] = useState({});

  // Global settings (for batch operations when no file is selected)
  const [resizeMode, setResizeMode] = useState("percentage"); // percentage, pixel, ratio
  const [compressionPreset, setCompressionPreset] = useState("balanced"); // maximum, balanced, high
  const [quality, setQuality] = useState(85); // 0-100 for JPEG/WebP quality
  const [targetFileSize, setTargetFileSize] = useState(""); // Target size in KB/MB
  const [useTargetSize, setUseTargetSize] = useState(false);
  const [progressiveJpeg, setProgressiveJpeg] = useState(false);
  const [optimizePalette, setOptimizePalette] = useState(true); // For PNG
  const [stripMetadata, setStripMetadata] = useState(false);
  const [losslessCompression, setLosslessCompression] = useState(false);
  const [convertFormat, setConvertFormat] = useState(false);
  const [targetFormat, setTargetFormat] = useState("jpg"); // jpg, png, webp
  const [smartCrop, setSmartCrop] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);

  // Mode: Percentage
  const [percentageValue, setPercentageValue] = useState(80);

  // Mode: Pixel
  const [pixelSubMode, setPixelSubMode] = useState("fixedRatio"); // fixedRatio, custom
  const [targetWidth, setTargetWidth] = useState(1920);
  const [targetHeight, setTargetHeight] = useState(1080);

  // Mode: Ratio
  const [ratioValue, setRatioValue] = useState(0.8);

  // Get current settings (for selected file or global)
  const getCurrentSettings = () => {
    if (selectedFile && fileSettings[selectedFile]) {
      return fileSettings[selectedFile];
    }
    return {
      resizeMode,
      compressionPreset,
      quality,
      targetFileSize,
      useTargetSize,
      progressiveJpeg,
      optimizePalette,
      stripMetadata,
      losslessCompression,
      convertFormat,
      targetFormat,
      smartCrop,
      percentageValue,
      pixelSubMode,
      targetWidth,
      targetHeight,
      ratioValue,
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
      if (updates.resizeMode !== undefined) setResizeMode(updates.resizeMode);
      if (updates.compressionPreset !== undefined) setCompressionPreset(updates.compressionPreset);
      if (updates.quality !== undefined) setQuality(updates.quality);
      if (updates.targetFileSize !== undefined) setTargetFileSize(updates.targetFileSize);
      if (updates.useTargetSize !== undefined) setUseTargetSize(updates.useTargetSize);
      if (updates.progressiveJpeg !== undefined) setProgressiveJpeg(updates.progressiveJpeg);
      if (updates.optimizePalette !== undefined) setOptimizePalette(updates.optimizePalette);
      if (updates.stripMetadata !== undefined) setStripMetadata(updates.stripMetadata);
      if (updates.losslessCompression !== undefined) setLosslessCompression(updates.losslessCompression);
      if (updates.convertFormat !== undefined) setConvertFormat(updates.convertFormat);
      if (updates.targetFormat !== undefined) setTargetFormat(updates.targetFormat);
      if (updates.smartCrop !== undefined) setSmartCrop(updates.smartCrop);
      if (updates.percentageValue !== undefined) setPercentageValue(updates.percentageValue);
      if (updates.pixelSubMode !== undefined) setPixelSubMode(updates.pixelSubMode);
      if (updates.targetWidth !== undefined) setTargetWidth(updates.targetWidth);
      if (updates.targetHeight !== undefined) setTargetHeight(updates.targetHeight);
      if (updates.ratioValue !== undefined) setRatioValue(updates.ratioValue);
    }
  };

  // ── File Handling ──

  const handleFilesAdded = (newFiles) => {
    // CRITICAL: Block if settings not loaded yet - MUST wait for database
    if (settingsLoading || !settings || !settings.image) {
      toast.error("Settings are loading from database. Please wait a moment and try again.");
      console.error("Settings not loaded from database:", { settingsLoading, settings: !!settings, hasImageSettings: !!settings?.image });
      return;
    }

    // Get values directly from database - no fallbacks
    const maxSize = settings.image.maxSize;
    const maxFiles = settings.image.maxFiles;
    
    // Safety check - if database values are missing, block upload
    if (!maxSize || !maxFiles) {
      toast.error("Upload limits not configured. Please contact support.");
      console.error("Database settings incomplete:", { maxSize, maxFiles });
      return;
    }

    // Check total file count - STRICT validation
    const totalFiles = files.length + newFiles.length;
    if (totalFiles > maxFiles) {
      const excess = totalFiles - maxFiles;
      toast.error(`Maximum ${maxFiles} files allowed. You have ${files.length} files and trying to add ${newFiles.length} (${excess} too many). Please remove some files first.`);
      return;
    }

    // Also check individual file count in this batch
    if (newFiles.length > maxFiles) {
      toast.error(`Cannot upload more than ${maxFiles} files at once. You selected ${newFiles.length} files.`);
      return;
    }

    // Filter oversized files
    const valid = [];
    const oversized = [];
    newFiles.forEach(f => {
      if (f.size > maxSize) {
        const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
        oversized.push(f.name);
        toast.error(`"${f.name}" is too large (max ${maxSizeMB}MB)`);
      } else {
        valid.push(f);
      }
    });

    if (valid.length === 0) {
      if (oversized.length > 0) {
        toast.error(`All selected files exceed the maximum size limit.`);
      }
      return;
    }

    // Final check: ensure we don't exceed limit after adding valid files
    if (files.length + valid.length > maxFiles) {
      const allowed = maxFiles - files.length;
      toast.error(`Can only add ${allowed} more file${allowed !== 1 ? 's' : ''}. You tried to add ${valid.length}.`);
      return;
    }

    // ABSOLUTE FINAL CHECK - prevent any addition if limit would be exceeded
    const finalTotal = files.length + valid.length;
    if (finalTotal > maxFiles) {
      toast.error(`Cannot add files. Maximum ${maxFiles} files allowed. Current: ${files.length}, Trying to add: ${valid.length}`);
      return;
    }

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

    // Only add files if we're still under the limit
    if (files.length + valid.length <= maxFiles) {
      setFiles(prev => [...prev, ...valid]);
      setPreviewUrls(prev => ({ ...prev, ...newPreviews }));
    } else {
      toast.error(`Cannot add files. Maximum ${maxFiles} files allowed.`);
    }
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
    setDimensions(prev => {
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

  // ── Estimates ──

  const getEstimatedDimensions = (originalW, originalH, settings = null) => {
    if (!originalW || !originalH) return null;
    const currentSettings = settings || getCurrentSettings();

    if (currentSettings.resizeMode === "percentage") {
      const s = currentSettings.percentageValue / 100;
      return { w: Math.round(originalW * s), h: Math.round(originalH * s) };
    }

    if (currentSettings.resizeMode === "ratio") {
      return { w: Math.round(originalW * currentSettings.ratioValue), h: Math.round(originalH * currentSettings.ratioValue) };
    }

    if (currentSettings.resizeMode === "pixel") {
      if (currentSettings.pixelSubMode === "custom") {
        return { w: currentSettings.targetWidth, h: currentSettings.targetHeight };
      } else {
        // Fixed ratio based on target width
        // Calculate height based on aspect ratio
        const ratio = originalH / originalW;
        return { w: currentSettings.targetWidth, h: Math.round(currentSettings.targetWidth * ratio) };
      }
    }

    return { w: originalW, h: originalH };
  };

  // ── Compression Logic ──

  const compressSingle = async (file, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);

    // Use per-file settings ONLY if user explicitly customized this file
    // Otherwise, always use current global settings
    const settings = fileSettings[file.name] || {
      resizeMode,
      compressionPreset,
      quality,
      percentageValue,
      ratioValue,
      pixelSubMode,
      targetWidth,
      targetHeight,
      progressiveJpeg,
      optimizePalette,
      stripMetadata,
      losslessCompression,
      useTargetSize,
      targetFileSize,
      convertFormat,
      targetFormat,
      smartCrop,
    };

    // API expects: compressionType (percentage|ratio|pixel), compressionValue, pixelWidth, pixelHeight

    // Apply preset if selected
    let finalQuality = settings.quality;
    if (settings.compressionPreset === "maximum") {
      finalQuality = 60;
    } else if (settings.compressionPreset === "balanced") {
      finalQuality = 85;
    } else if (settings.compressionPreset === "high") {
      finalQuality = 95;
    }

    if (settings.resizeMode === "percentage") {
      formData.append("compressionType", "percentage");
      formData.append("compressionValue", settings.percentageValue);
    } else if (settings.resizeMode === "ratio") {
      formData.append("compressionType", "ratio");
      formData.append("compressionValue", Math.round(settings.ratioValue * 100));
    } else if (settings.resizeMode === "pixel") {
      formData.append("compressionType", "pixel");
      const dims = getEstimatedDimensions(dimensions[file.name]?.w || 1920, dimensions[file.name]?.h || 1080, settings);
      formData.append("pixelWidth", dims.w);
      formData.append("pixelHeight", dims.h);
    }

    formData.append("quality", finalQuality.toString());
    formData.append("progressiveJpeg", settings.progressiveJpeg.toString());
    formData.append("optimizePalette", settings.optimizePalette.toString());
    formData.append("stripMetadata", settings.stripMetadata.toString());
    formData.append("losslessCompression", settings.losslessCompression.toString());
    if (settings.useTargetSize && settings.targetFileSize) {
      formData.append("targetFileSize", settings.targetFileSize);
    }
    formData.append("convertFormat", settings.convertFormat.toString());
    if (settings.convertFormat) {
      formData.append("targetFormat", settings.targetFormat);
    }
    formData.append("smartCrop", settings.smartCrop.toString());

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

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Compression failed:", res.status, errorText);
        throw new Error(errorText || "Compression failed");
      }

      const blob = await res.blob();
      // Get extension from API header; fallback to the file's original extension
      const fileExt = file.name.split('.').pop().toLowerCase();
      const ext = res.headers.get("X-Output-Extension") || fileExt || "jpg";

      return {
        status: "done",
        blob,
        size: blob.size,
        ext,
        saved: Math.max(0, file.size - blob.size),
        percent: Math.round(((file.size - blob.size) / file.size) * 100)
      };

    } catch (e) {
      console.error("Compression error:", e);
      return { status: "error", error: e.message || "Compression failed" };
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
        const res = await compressSingle(file, progressTracker);
        setResults(prev => ({ ...prev, [file.name]: res }));
        if (res.status === "done") {
          successCount++;
          // Collect file information
          const inputExt = file.name.split('.').pop()?.toLowerCase() || '';
          const outputExt = res.ext || inputExt;
          
          // Generate thumbnails for input and output
          const thumbnails = await generateFileThumbnails(file, res.blob).catch(() => ({}));
          
          // Convert thumbnails from data URL to pure base64 for storage
          const inputThumbnailBase64 = extractBase64(thumbnails.inputThumbnail);
          const outputThumbnailBase64 = extractBase64(thumbnails.outputThumbnail);
          
          // Convert output blob to base64 for storage (limit to 10MB to avoid MongoDB 16MB limit)
          let outputFileData = null;
          const maxFileSize = 10 * 1024 * 1024; // 10MB
          if (res.blob && res.blob.size <= maxFileSize) {
            try {
              const dataUrl = await blobToBase64(res.blob);
              outputFileData = extractBase64(dataUrl);
            } catch (error) {
              console.warn("Failed to convert file to base64:", error);
            }
          } else if (res.blob && res.blob.size > maxFileSize) {
            console.warn(`File ${file.name} is too large (${res.blob.size} bytes) to store. Max size: ${maxFileSize} bytes`);
          }
          
          processedFiles.push({
            inputName: file.name,
            inputSize: file.size,
            inputFormat: inputExt,
            outputName: res.name || file.name.replace(/\.[^.]+$/, `_min.${outputExt}`),
            outputSize: res.size || 0,
            outputFormat: outputExt,
            inputThumbnail: inputThumbnailBase64,
            outputThumbnail: outputThumbnailBase64,
            outputFileData: outputFileData,
          });
        }
      }));
    }

    // Track usage after all compressions complete (for both logged-in and anonymous users)
    if (successCount > 0 && trackUsage) {
      console.log("Tracking usage - processedFiles:", processedFiles);
      console.log("Tracking usage - successCount:", successCount);
      console.log("Tracking usage - user:", user ? "logged-in" : "anonymous");
      trackUsage("/compress", successCount, successCount, {
        tool: "Image Compressor",
        filesProcessed: successCount,
      }, processedFiles);
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
    // Always use the original file object for best quality, not cached preview
    const beforeUrl = URL.createObjectURL(file);
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
      createdBeforeUrl: true // Always track that we created the before URL
    });
  };

  const closeViewModal = () => {
    if (viewingFile) {
      // Revoke the after URL (compressed image) as it's created here
      if (viewingFile.afterUrl) {
        URL.revokeObjectURL(viewingFile.afterUrl);
      }
      // Always revoke before URL since we always create it now
      if (viewingFile.beforeUrl) {
        URL.revokeObjectURL(viewingFile.beforeUrl);
      }
    }
    setViewingFile(null);
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://convertmastery.com";
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Image Compressor - ConvertMastery",
    "description": "Free online image compressor. Reduce file size while maintaining quality. Support for JPG, PNG, WebP. Fast, secure, privacy-first. Sign up to access advanced features like target file size, progressive JPEG, and save files in My Orders.",
    "url": `${siteUrl}/compress`,
    "applicationCategory": "UtilityApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Image Compression",
      "Quality Control",
      "Target File Size",
      "Progressive JPEG",
      "Metadata Stripping",
      "Lossless Compression",
      "Batch Processing"
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SEO
        title="Free Image Compressor - Reduce Image File Size Online"
        description="Compress images to reduce file size while maintaining quality. Support for JPG, PNG, WebP formats. Fast, secure, privacy-first. Sign up to unlock advanced features like target file size, progressive JPEG, and save all your compressed files in My Orders."
        keywords="image compressor, compress images, reduce image size, image optimizer, JPG compressor, PNG compressor, WebP compressor, free image compression, online image compressor"
        url="/compress"
        structuredData={structuredData}
      />
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
            Compress Images
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto mb-4">
            Reduce image size by smart scaling and optimization.
          </p>
          {!user && (
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 max-w-2xl mx-auto mt-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold text-primary">Sign up for free</span> to unlock advanced features like target file size, progressive JPEG, WEBP format, and save all your compressed files in <span className="font-semibold">My Orders</span> for easy access later.
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-8">

          {/* Upload */}
          <CollapsibleDropzone
            files={files}
            setFiles={handleFilesAdded}
            disabled={settingsLoading || !settings}
            onDisabledClick={() => {
              if (settingsLoading) {
                toast.error("Loading upload settings... Please wait.");
              } else if (!settings) {
                toast.error("Settings not available. Please refresh the page.");
              } else {
                const maxFiles = settings.image?.maxFiles;
                toast.error(`Maximum ${maxFiles} files allowed. You have ${files.length} files.`);
              }
            }}
            maxFiles={settings?.image?.maxFiles}
            currentFileCount={files.length}
            title="Upload Images to Compress"
            description={settings && settings.image ? `JPG, PNG, WebP, HEIC, TIFF • Max ${Math.round(settings.image.maxSize / (1024 * 1024))}MB each • Up to ${settings.image.maxFiles} files` : "Loading settings from database..."}
            accept={{
              "image/jpeg": [".jpg", ".jpeg", ".JPG", ".JPEG"],
              "image/png": [".png", ".PNG"],
              "image/webp": [".webp", ".WEBP"],
              "image/gif": [".gif", ".GIF"],
              "image/bmp": [".bmp", ".BMP"],
              "image/tiff": [".tiff", ".tif", ".TIFF", ".TIF"]
            }}
            borderColor="border-gray-300"
            hoverColor="hover:border-blue-500"
          />

          {/* Workspace */}
          {files.length > 0 && (
            <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-start">

              {/* Sidebar: Settings */}
              <Card className="lg:sticky lg:top-24 h-fit border-0 shadow-lg ring-1 ring-gray-100">
                <CardContent className="p-6 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
                      <Settings2 className="w-6 h-6 text-blue-600" /> Settings
                    </div>
                    {selectedFile && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedFile(null)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear Selection
                      </Button>
                    )}
                  </div>
                  {selectedFile && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="text-xs text-blue-600 font-medium mb-1">Editing Settings For:</div>
                      <div className="text-sm font-semibold text-blue-900 truncate">{selectedFile}</div>
                    </div>
                  )}
                  {!selectedFile && files.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                      <div className="text-xs text-gray-600 font-medium mb-1">Global Settings</div>
                      <div className="text-sm text-gray-500">Click a file to edit individual settings</div>
                    </div>
                  )}

                  {/* Compression Presets */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Compression Preset</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "maximum", label: "Maximum", desc: "Smallest size", quality: 60 },
                        { id: "balanced", label: "Balanced", desc: "Recommended", quality: 85 },
                        { id: "high", label: "High Quality", desc: "Best quality", quality: 95 },
                      ].map(preset => {
                        const current = getCurrentSettings();
                        return (
                          <button
                            key={preset.id}
                            onClick={() => {
                              updateCurrentSettings({ compressionPreset: preset.id, quality: preset.quality });
                            }}
                            className={cn(
                              "p-3 rounded-lg border-2 transition-all text-center",
                              current.compressionPreset === preset.id
                                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                                : "border-gray-200 hover:border-gray-300 text-gray-600"
                            )}
                          >
                            <div className="font-semibold text-sm">{preset.label}</div>
                            <div className="text-xs opacity-70">{preset.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quality Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold text-gray-700">Quality</label>
                      <span className="text-sm font-bold text-blue-600">{getCurrentSettings().quality}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={getCurrentSettings().quality}
                      onChange={(e) => updateCurrentSettings({ quality: Number(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>

                  {/* Target File Size */}
                  <div className="space-y-2">
                    <label 
                      className={cn(
                        "flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer transition-all relative",
                        !user && "opacity-75"
                      )}
                      style={!user ? { filter: 'blur(0.5px)' } : {}}
                      onClick={(e) => {
                        if (!user) {
                          e.preventDefault();
                          toast.error("Please sign in to use target file size");
                          setAuthModalMode("login");
                          setAuthModalOpen(true);
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={getCurrentSettings().useTargetSize}
                        onChange={(e) => {
                          if (!user) {
                            e.preventDefault();
                            e.target.checked = false;
                            toast.error("Please sign in to use target file size");
                            setAuthModalMode("login");
                            setAuthModalOpen(true);
                            return;
                          }
                          updateCurrentSettings({ useTargetSize: e.target.checked });
                        }}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Target File Size</span>
                      {!user && (
                        <Lock className="w-4 h-4 text-gray-600 ml-auto" />
                      )}
                    </label>
                    {getCurrentSettings().useTargetSize && (
                      <input
                        type="text"
                        placeholder="e.g., 500KB or 2MB"
                        value={getCurrentSettings().targetFileSize}
                        onChange={(e) => updateCurrentSettings({ targetFileSize: e.target.value })}
                        className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>

                  {/* Mode Tabs */}
                  <div className="space-y-4">
                    <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Resizing Mode</label>
                    <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl">
                      {['percentage', 'pixel', 'ratio'].map(mode => {
                        const current = getCurrentSettings();
                        return (
                          <button
                            key={mode}
                            onClick={() => updateCurrentSettings({ resizeMode: mode })}
                            className={cn(
                              "py-2 text-sm rounded-lg transition-all font-medium capitalize",
                              current.resizeMode === mode ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                            )}
                          >
                            {mode}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dynamic Controls */}
                  <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 space-y-4">
                    {(() => {
                      const current = getCurrentSettings();
                      if (current.resizeMode === "percentage") {
                        return (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">Scale</span>
                              <span className="text-lg font-bold text-blue-600">{current.percentageValue}%</span>
                            </div>
                            <input
                              type="range" min="1" max="100" step="1"
                              value={current.percentageValue}
                              onChange={(e) => updateCurrentSettings({ percentageValue: Number(e.target.value) })}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <p className="text-xs text-gray-500">
                              Scaling down to {current.percentageValue}% of original dimensions.
                            </p>
                          </div>
                        );
                      } else if (current.resizeMode === "ratio") {
                        return (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">Ratio</span>
                              <span className="text-lg font-bold text-blue-600">{current.ratioValue.toFixed(2)}x</span>
                            </div>
                            <input
                              type="range" min="0.01" max="1.00" step="0.01"
                              value={current.ratioValue}
                              onChange={(e) => updateCurrentSettings({ ratioValue: Number(e.target.value) })}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <p className="text-xs text-gray-500">
                              Multiply dimensions by {current.ratioValue}.
                            </p>
                          </div>
                        );
                      } else if (current.resizeMode === "pixel") {
                        return (
                          <div className="space-y-5">
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateCurrentSettings({ pixelSubMode: "fixedRatio" })}
                                className={cn("flex-1 py-1.5 text-xs rounded border transition-all", current.pixelSubMode === "fixedRatio" ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold" : "border-gray-200 text-gray-600")}
                              >
                                Fixed Ratio
                              </button>
                              <button
                                onClick={() => updateCurrentSettings({ pixelSubMode: "custom" })}
                                className={cn("flex-1 py-1.5 text-xs rounded border transition-all", current.pixelSubMode === "custom" ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold" : "border-gray-200 text-gray-600")}
                              >
                                Custom W/H
                              </button>
                            </div>

                            <div className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 uppercase">Width (px)</label>
                                <input
                                  type="number"
                                  value={current.targetWidth}
                                  onChange={(e) => updateCurrentSettings({ targetWidth: Number(e.target.value) })}
                                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                />
                              </div>

                              {current.pixelSubMode === "custom" && (
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-gray-500 uppercase">Height (px)</label>
                                  <input
                                    type="number"
                                    value={current.targetHeight}
                                    onChange={(e) => updateCurrentSettings({ targetHeight: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                  />
                                </div>
                              )}
                              {current.pixelSubMode === "fixedRatio" && (
                                <p className="text-xs text-gray-400 italic">
                                  Height will be calculated automatically to maintain aspect ratio.
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Advanced Options Dropdown */}
                  <div className="space-y-2 border-t pt-4">
                    <button
                      onClick={() => setAdvancedOptionsOpen(!advancedOptionsOpen)}
                      className="w-full flex items-center justify-between p-3 border-2 rounded-lg hover:bg-gray-50 transition-all"
                    >
                      <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        Advanced Options
                      </span>
                      {advancedOptionsOpen ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </button>

                    {advancedOptionsOpen && (
                      <div className="space-y-3 border-2 rounded-lg p-4 bg-gray-50">
                        <label 
                          className={cn(
                            "flex items-center gap-3 p-2 border rounded-lg hover:bg-white cursor-pointer transition-all bg-white relative",
                            !user && "opacity-75"
                          )}
                          style={!user ? { filter: 'blur(0.5px)' } : {}}
                          onClick={(e) => {
                            if (!user) {
                              e.preventDefault();
                              toast.error("Please sign in to use advanced options");
                              setAuthModalMode("login");
                              setAuthModalOpen(true);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={getCurrentSettings().progressiveJpeg}
                            onChange={(e) => {
                              if (!user) {
                                e.preventDefault();
                                e.target.checked = false;
                                toast.error("Please sign in to use advanced options");
                                setAuthModalMode("login");
                                setAuthModalOpen(true);
                                return;
                              }
                              updateCurrentSettings({ progressiveJpeg: e.target.checked });
                            }}
                            className="w-4 h-4 accent-blue-600"
                          />
                          <span className="text-sm font-medium text-gray-700">Progressive JPEG</span>
                          {!user && (
                            <Lock className="w-4 h-4 text-gray-600 ml-auto" />
                          )}
                        </label>

                        <label 
                          className={cn(
                            "flex items-center gap-3 p-2 border rounded-lg hover:bg-white cursor-pointer transition-all bg-white relative",
                            !user && "opacity-75"
                          )}
                          style={!user ? { filter: 'blur(0.5px)' } : {}}
                          onClick={(e) => {
                            if (!user) {
                              e.preventDefault();
                              toast.error("Please sign in to use advanced options");
                              setAuthModalMode("login");
                              setAuthModalOpen(true);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={getCurrentSettings().optimizePalette}
                            onChange={(e) => {
                              if (!user) {
                                e.preventDefault();
                                e.target.checked = false;
                                toast.error("Please sign in to use advanced options");
                                setAuthModalMode("login");
                                setAuthModalOpen(true);
                                return;
                              }
                              updateCurrentSettings({ optimizePalette: e.target.checked });
                            }}
                            className="w-4 h-4 accent-blue-600"
                          />
                          <span className="text-sm font-medium text-gray-700">Optimize Palette (PNG)</span>
                          {!user && (
                            <Lock className="w-4 h-4 text-gray-600 ml-auto" />
                          )}
                        </label>

                        <label 
                          className={cn(
                            "flex items-center gap-3 p-2 border rounded-lg hover:bg-white cursor-pointer transition-all bg-white relative",
                            !user && "opacity-75"
                          )}
                          style={!user ? { filter: 'blur(0.5px)' } : {}}
                          onClick={(e) => {
                            if (!user) {
                              e.preventDefault();
                              toast.error("Please sign in to use advanced options");
                              setAuthModalMode("login");
                              setAuthModalOpen(true);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={getCurrentSettings().stripMetadata}
                            onChange={(e) => {
                              if (!user) {
                                e.preventDefault();
                                e.target.checked = false;
                                toast.error("Please sign in to use advanced options");
                                setAuthModalMode("login");
                                setAuthModalOpen(true);
                                return;
                              }
                              updateCurrentSettings({ stripMetadata: e.target.checked });
                            }}
                            className="w-4 h-4 accent-blue-600"
                          />
                          <span className="text-sm font-medium text-gray-700">Strip Metadata</span>
                          {!user && (
                            <Lock className="w-4 h-4 text-gray-600 ml-auto" />
                          )}
                        </label>

                        <label 
                          className={cn(
                            "flex items-center gap-3 p-2 border rounded-lg hover:bg-white cursor-pointer transition-all bg-white relative",
                            !user && "opacity-75"
                          )}
                          style={!user ? { filter: 'blur(0.5px)' } : {}}
                          onClick={(e) => {
                            if (!user) {
                              e.preventDefault();
                              toast.error("Please sign in to use advanced options");
                              setAuthModalMode("login");
                              setAuthModalOpen(true);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={getCurrentSettings().losslessCompression}
                            onChange={(e) => {
                              if (!user) {
                                e.preventDefault();
                                e.target.checked = false;
                                toast.error("Please sign in to use advanced options");
                                setAuthModalMode("login");
                                setAuthModalOpen(true);
                                return;
                              }
                              updateCurrentSettings({ losslessCompression: e.target.checked });
                            }}
                            className="w-4 h-4 accent-blue-600"
                          />
                          <span className="text-sm font-medium text-gray-700">Lossless Compression</span>
                          {!user && (
                            <Lock className="w-4 h-4 text-gray-600 ml-auto" />
                          )}
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Format Conversion */}
                  <div className="space-y-2 border-t pt-4">
                    <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={getCurrentSettings().convertFormat}
                        onChange={(e) => updateCurrentSettings({ convertFormat: e.target.checked })}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Convert Format</span>
                    </label>
                    {getCurrentSettings().convertFormat && (
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2 border border-gray-200">
                        <label className="text-xs font-semibold text-gray-500 uppercase">Target Format</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['jpg', 'png', 'webp'].map(fmt => {
                            const current = getCurrentSettings();
                            const requiresAuth = fmt === "webp" && !user;
                            return (
                              <button
                                key={fmt}
                                onClick={() => {
                                  // Require authentication for WEBP format
                                  if (fmt === "webp" && !user) {
                                    toast.error("Please sign in to use WEBP format");
                                    setAuthModalMode("login");
                                    setAuthModalOpen(true);
                                    return;
                                  }
                                  updateCurrentSettings({ targetFormat: fmt });
                                }}
                                className={cn(
                                  "px-2 py-2 text-xs rounded-lg border-2 transition-all uppercase font-medium relative",
                                  current.targetFormat === fmt
                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                    : "border-gray-200 hover:border-gray-300 text-gray-600",
                                  requiresAuth && "opacity-75"
                                )}
                                style={requiresAuth ? { filter: 'blur(0.5px)' } : {}}
                              >
                                {fmt}
                                {requiresAuth && (
                                  <Lock className="w-4 h-4 text-gray-600 absolute top-1 right-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Smart Crop */}
                  <div className="space-y-2 border-t pt-4">
                    <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={getCurrentSettings().smartCrop}
                        onChange={(e) => updateCurrentSettings({ smartCrop: e.target.checked })}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Smart Crop (Auto-remove whitespace)</span>
                    </label>
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
                        <label className="flex items-center gap-2 px-3 py-1.5 border rounded-md hover:bg-gray-50 cursor-pointer transition-all text-sm">
                          <input
                            type="checkbox"
                            checked={comparisonMode}
                            onChange={(e) => setComparisonMode(e.target.checked)}
                            className="w-4 h-4 accent-blue-600"
                          />
                          <span>Comparison Grid</span>
                        </label>
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

                {/* Comparison Grid View */}
                {comparisonMode && Object.values(results).some(r => r.status === "done") && (
                  <Card className="border border-gray-200 mb-5">
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg text-gray-800 mb-4">Before & After Comparison</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {files.map((file, idx) => {
                          const res = results[file.name];
                          const preview = previewUrls[file.name];
                          if (res?.status !== "done") return null;
                          
                          const afterUrl = URL.createObjectURL(res.blob);
                          
                          return (
                            <div key={file.name + idx} className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="relative w-full aspect-square border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                                  {preview && (
                                    <img 
                                      src={preview} 
                                      alt="Before" 
                                      className="w-full h-full object-cover" 
                                      style={{ imageRendering: 'auto' }}
                                    />
                                  )}
                                  <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                                    BEFORE
                                  </div>
                                </div>
                                <div className="relative w-full aspect-square border-2 border-blue-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                                  <img 
                                    src={afterUrl} 
                                    alt="After" 
                                    className="w-full h-full object-cover" 
                                    style={{ imageRendering: 'auto' }}
                                    onLoad={() => {
                                      // URL will be cleaned up when component unmounts
                                    }}
                                  />
                                  <div className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                                    AFTER
                                  </div>
                                </div>
                              </div>
                              <div className="text-center text-xs">
                                <div className={cn(
                                  "font-semibold",
                                  res.percent > 0 ? "text-green-600" : res.percent < 0 ? "text-red-600" : "text-gray-600"
                                )}>
                                  {res.percent !== 0 ? `${res.percent > 0 ? '-' : '+'}${Math.abs(res.percent)}%` : '0%'}
                                </div>
                                <div className="text-gray-500">{formatSize(res.size)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {files.map((file, idx) => {
                  const res = results[file.name];
                  const preview = previewUrls[file.name];
                  const dims = dimensions[file.name];
                  const isSelected = selectedFile === file.name;
                  const fileSettingsForThis = fileSettings[file.name] || {};
                  const estDims = getEstimatedDimensions(dims?.w, dims?.h, fileSettingsForThis);
                  const estSize = estDims ? calculateEstimatedSize(file.size, dims?.w, dims?.h, estDims.w, estDims.h) : null;
                  const estReduction = estSize ? Math.round(((file.size - estSize) / file.size) * 100) : 0;

                  return (
                    <Card 
                      key={file.name + idx} 
                      className={cn(
                        "overflow-hidden border-2 shadow-sm hover:shadow-md transition-all group cursor-pointer",
                        isSelected 
                          ? "border-blue-500 bg-blue-50/30 shadow-md" 
                          : "border-gray-200 hover:border-blue-300"
                      )}
                      onClick={() => setSelectedFile(file.name)}
                    >
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
                                    className="h-8 w-8 text-green-600 bg-green-50 hover:bg-green-100" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const url = URL.createObjectURL(res.blob);
                                      const a = document.createElement("a");
                                      a.href = url;
                                      const baseName = file.name.substring(0, file.name.lastIndexOf("."));
                                      a.download = baseName + "_min." + res.ext;
                                      a.click();
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
                                className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50" 
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
                                <span className={cn(
                                  "font-bold text-xs",
                                  res.percent > 0 ? "text-green-600" : res.percent < 0 ? "text-red-600" : "text-gray-600"
                                )}>
                                  {res.percent !== 0 ? `${res.percent > 0 ? '-' : '+'}${Math.abs(res.percent)}%` : '0%'}
                                </span>
                              </>
                            ) : res?.status === "error" ? (
                              <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
                                Error: {res.error || "Compression failed"}
                              </Badge>
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
            className="bg-white rounded-lg shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-auto"
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
                  <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center min-h-[400px]">
                    <img 
                      src={viewingFile.beforeUrl} 
                      alt="Before" 
                      className="max-w-full max-h-[80vh] w-auto h-auto object-contain"
                      loading="eager"
                      decoding="async"
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
                  <div className="border-2 border-blue-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center min-h-[400px]">
                    <img 
                      src={viewingFile.afterUrl} 
                      alt="After" 
                      className="max-w-full max-h-[80vh] w-auto h-auto object-contain"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <div className="space-y-2 text-sm">
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </div>
  );
}
