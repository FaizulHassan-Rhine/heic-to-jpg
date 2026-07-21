import { useState, useEffect } from "react";
import { useAuth } from "../lib/authContext";
import { useSettings } from "../lib/useSettings";
import { generateFileThumbnails } from "../lib/thumbnailUtils";
import { blobToBase64, extractBase64 } from "../lib/fileUtils";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import ToolSignupBanner from "../components/ToolSignupBanner";
import ToolWorkspace from "../components/ToolWorkspace";
import ToolSettingsPanel, { ToolSettingsNotice } from "../components/ToolSettingsPanel";
import ToolFilesPanel from "../components/ToolFilesPanel";
import AuthModal from "../components/AuthModal";
import JSZip from "jszip";
import {
  Loader2, CheckCircle, Download, AlertCircle, FileImage,
  Zap, RefreshCw, Trash2, RotateCcw, Image as ImageIcon,
  Settings2, ArrowRight, Minimize2, Scale, Eye, X, ChevronDown, ChevronUp, Lock
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { notify } from "../lib/notify";

// ─────────────────────────── HELPERS ───────────────────────────

const formatSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/** Parse strings like "500KB", "2MB", "1024" (KB) into bytes */
const parseSizeToBytes = (input) => {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim().toUpperCase().replace(/\s+/g, "");
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(KB|MB|GB|B)?$/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2] || "KB";
  const mult = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 }[unit];
  return Math.round(value * mult);
};

/**
 * Live size estimate from dimensions + quality.
 * Tuned so ~85% quality ≈ 70% of original when dimensions are unchanged.
 */
const calculateEstimatedSize = (
  originalSize,
  oldW,
  oldH,
  newW,
  newH,
  quality = 85,
  { useTargetSize = false, targetFileSize = "", losslessCompression = false } = {}
) => {
  if (!originalSize) return null;

  if (useTargetSize) {
    const targetBytes = parseSizeToBytes(targetFileSize);
    if (targetBytes && targetBytes > 0) {
      return Math.min(targetBytes, originalSize);
    }
  }

  const ow = oldW > 0 ? oldW : 1;
  const oh = oldH > 0 ? oldH : 1;
  const nw = newW > 0 ? newW : ow;
  const nh = newH > 0 ? newH : oh;
  const areaRatio = Math.min((nw * nh) / (ow * oh), 1);

  if (losslessCompression) {
    return Math.max(Math.round(originalSize * areaRatio * 0.92), Math.round(originalSize * 0.02));
  }

  const q = Math.min(100, Math.max(1, Number(quality) || 85)) / 100;
  // ~60% → ~0.46, ~85% → ~0.70, ~95% → ~0.81 of area-scaled size
  const qualityFactor = 0.1 + 0.77 * Math.pow(q, 1.5);
  const estimated = originalSize * areaRatio * qualityFactor;

  return Math.max(Math.round(estimated), Math.round(originalSize * 0.02));
};

// ─────────────────────────── COMPONENT ───────────────────────────

export default function CompressImage() {
  const { user, trackUsage } = useAuth();
  const { settings } = useSettings();
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

  // Get global (non-per-file) settings snapshot
  const getGlobalSettings = () => ({
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
  });

  // Get current settings (for selected file or global)
  const getCurrentSettings = () => {
    if (selectedFile && fileSettings[selectedFile]) {
      return fileSettings[selectedFile];
    }
    return getGlobalSettings();
  };

  // Settings to use for estimating / compressing a specific file
  const getSettingsForFile = (filename) => {
    if (fileSettings[filename]) return fileSettings[filename];
    return getGlobalSettings();
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

    const failedCount = pending.length - successCount;
    if (successCount > 0 && failedCount === 0) {
      notify.success(
        "Compression complete",
        successCount === 1 ? "Ready to download." : `${successCount} files ready.`
      );
    } else if (successCount > 0 && failedCount > 0) {
      notify.warning(
        "Partially complete",
        `${successCount} ok · ${failedCount} failed`
      );
    } else if (pending.length > 0) {
      notify.error(
        "Compression failed",
        "Check the file list for details."
      );
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

  return (
    <>
    <ToolPageShell containerClassName="max-w-7xl">
        <ToolPageHeader
          title="Compress Images"
          description="Reduce image size by smart scaling and optimization."
        >
          {!user && (
            <ToolSignupBanner
              onSignUp={() => {
                setAuthModalMode("signup");
                setAuthModalOpen(true);
              }}
            />
          )}
        </ToolPageHeader>

        <div className="grid gap-8">

          {/* Upload */}
          <CollapsibleDropzone
            files={files}
            setFiles={handleFilesAdded}
            disabled={false}
            onDisabledClick={() => {
              const maxFiles = settings.image?.maxFiles;
              toast.error(`Maximum ${maxFiles} files allowed. You have ${files.length} files.`);
            }}
            maxFiles={settings?.image?.maxFiles}
            currentFileCount={files.length}
            title="Upload Images to Compress"
            description={`JPG, PNG, WebP, HEIC, TIFF • Max ${Math.round(settings.image.maxSize / (1024 * 1024))}MB each • Up to ${settings.image.maxFiles} files`}
            accept={{
              "image/jpeg": [".jpg", ".jpeg", ".JPG", ".JPEG"],
              "image/png": [".png", ".PNG"],
              "image/webp": [".webp", ".WEBP"],
              "image/gif": [".gif", ".GIF"],
              "image/bmp": [".bmp", ".BMP"],
              "image/tiff": [".tiff", ".tif", ".TIFF", ".TIF"]
            }}
          />

          {/* Workspace */}
          {files.length > 0 && (
            <ToolWorkspace sidebarWidth="400px">

              {/* Sidebar: Settings */}
              <ToolSettingsPanel
                title="Settings"
                headerExtra={
                  selectedFile ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedFile(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear Selection
                    </Button>
                  ) : null
                }
                notice={
                  selectedFile ? (
                    <ToolSettingsNotice title="Editing Settings For:" variant="sky">
                      {selectedFile}
                    </ToolSettingsNotice>
                  ) : (
                    <ToolSettingsNotice title="Global Settings">
                      Click a file to edit individual settings
                    </ToolSettingsNotice>
                  )
                }
              >
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Compression Preset</label>
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
                                ? "border-primary bg-brand-sky/50 text-brand-navy shadow-sm"
                                : "border-border hover:border-border text-muted-foreground"
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
                      <label className="text-sm font-semibold text-foreground">Quality</label>
                      <span className="text-sm font-bold text-primary">{getCurrentSettings().quality}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={getCurrentSettings().quality}
                      onChange={(e) => updateCurrentSettings({ quality: Number(e.target.value) })}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>

                  {/* Target File Size */}
                  <div className="space-y-2">
                    <label 
                      className={cn(
                        "flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/40 cursor-pointer transition-all relative",
                        (() => {
                          const targetFileSizeFree = settings?.features?.imageCompress?.targetFileSize ?? false;
                          return !targetFileSizeFree && !user;
                        })() && "opacity-75"
                      )}
                      style={(() => {
                        const targetFileSizeFree = settings?.features?.imageCompress?.targetFileSize ?? false;
                        return !targetFileSizeFree && !user ? { filter: 'blur(0.5px)' } : {};
                      })()}
                      onClick={(e) => {
                        const targetFileSizeFree = settings?.features?.imageCompress?.targetFileSize ?? false;
                        if (!targetFileSizeFree && !user) {
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
                          const targetFileSizeFree = settings?.features?.imageCompress?.targetFileSize ?? false;
                          if (!targetFileSizeFree && !user) {
                            e.preventDefault();
                            e.target.checked = false;
                            toast.error("Please sign in to use target file size");
                            setAuthModalMode("login");
                            setAuthModalOpen(true);
                            return;
                          }
                          updateCurrentSettings({ useTargetSize: e.target.checked });
                        }}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="text-sm font-medium text-foreground">Target File Size</span>
                      {(() => {
                        const targetFileSizeFree = settings?.features?.imageCompress?.targetFileSize ?? false;
                        return !targetFileSizeFree && !user;
                      })() && (
                        <Lock className="w-4 h-4 text-muted-foreground ml-auto" />
                      )}
                    </label>
                    {getCurrentSettings().useTargetSize && (
                      <input
                        type="text"
                        placeholder="e.g., 500KB or 2MB"
                        value={getCurrentSettings().targetFileSize}
                        onChange={(e) => updateCurrentSettings({ targetFileSize: e.target.value })}
                        className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-brand-mid"
                      />
                    )}
                  </div>

                  {/* Mode Tabs */}
                  <div className="space-y-4">
                    <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Resizing Mode</label>
                    <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-xl">
                      {['percentage', 'pixel', 'ratio'].map(mode => {
                        const current = getCurrentSettings();
                        return (
                          <button
                            key={mode}
                            onClick={() => updateCurrentSettings({ resizeMode: mode })}
                            className={cn(
                              "py-2 text-sm rounded-lg transition-all font-medium capitalize",
                              current.resizeMode === mode ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                          >
                            {mode}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dynamic Controls */}
                  <div className="bg-muted/40/50 rounded-xl p-4 border border-border space-y-4">
                    {(() => {
                      const current = getCurrentSettings();
                      if (current.resizeMode === "percentage") {
                        return (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-foreground">Scale</span>
                              <span className="text-lg font-bold text-primary">{current.percentageValue}%</span>
                            </div>
                            <input
                              type="range" min="1" max="100" step="1"
                              value={current.percentageValue}
                              onChange={(e) => updateCurrentSettings({ percentageValue: Number(e.target.value) })}
                              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <p className="text-xs text-muted-foreground">
                              Scaling down to {current.percentageValue}% of original dimensions.
                            </p>
                          </div>
                        );
                      } else if (current.resizeMode === "ratio") {
                        return (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-foreground">Ratio</span>
                              <span className="text-lg font-bold text-primary">{current.ratioValue.toFixed(2)}x</span>
                            </div>
                            <input
                              type="range" min="0.01" max="1.00" step="0.01"
                              value={current.ratioValue}
                              onChange={(e) => updateCurrentSettings({ ratioValue: Number(e.target.value) })}
                              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <p className="text-xs text-muted-foreground">
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
                                className={cn("flex-1 py-1.5 text-xs rounded border transition-all", current.pixelSubMode === "fixedRatio" ? "bg-brand-sky/50 border-brand-mid/30 text-brand-navy font-semibold" : "border-border text-muted-foreground")}
                              >
                                Fixed Ratio
                              </button>
                              <button
                                onClick={() => updateCurrentSettings({ pixelSubMode: "custom" })}
                                className={cn("flex-1 py-1.5 text-xs rounded border transition-all", current.pixelSubMode === "custom" ? "bg-brand-sky/50 border-brand-mid/30 text-brand-navy font-semibold" : "border-border text-muted-foreground")}
                              >
                                Custom W/H
                              </button>
                            </div>

                            <div className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">Width (px)</label>
                                <input
                                  type="number"
                                  value={current.targetWidth}
                                  onChange={(e) => updateCurrentSettings({ targetWidth: Number(e.target.value) })}
                                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-mid outline-none font-mono text-sm"
                                />
                              </div>

                              {current.pixelSubMode === "custom" && (
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-muted-foreground uppercase">Height (px)</label>
                                  <input
                                    type="number"
                                    value={current.targetHeight}
                                    onChange={(e) => updateCurrentSettings({ targetHeight: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-mid outline-none font-mono text-sm"
                                  />
                                </div>
                              )}
                              {current.pixelSubMode === "fixedRatio" && (
                                <p className="text-xs text-muted-foreground italic">
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
                      className="w-full flex items-center justify-between p-3 border-2 rounded-lg hover:bg-muted/40 transition-all"
                    >
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        Advanced Options
                      </span>
                      {advancedOptionsOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>

                    {advancedOptionsOpen && (() => {
                      // Check each sub-feature individually
                      const progressiveJpegFree = settings?.features?.imageCompress?.advancedOptions?.progressiveJpeg ?? false;
                      const optimizePaletteFree = settings?.features?.imageCompress?.advancedOptions?.optimizePalette ?? false;
                      const stripMetadataFree = settings?.features?.imageCompress?.advancedOptions?.stripMetadata ?? false;
                      const losslessCompressionFree = settings?.features?.imageCompress?.advancedOptions?.losslessCompression ?? false;
                      
                      return (
                        <div className="space-y-3 border-2 rounded-lg p-4 bg-muted/40">
                          {(() => {
                            const requiresAuth = !progressiveJpegFree && !user;
                            return (
                              <label 
                                className={cn(
                                  "flex items-center gap-3 p-2 border rounded-lg hover:bg-card cursor-pointer transition-all bg-card relative",
                                  requiresAuth && "opacity-75"
                                )}
                                style={requiresAuth ? { filter: 'blur(0.5px)' } : {}}
                                onClick={(e) => {
                                  if (requiresAuth) {
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
                                    if (requiresAuth) {
                                      e.preventDefault();
                                      e.target.checked = false;
                                      toast.error("Please sign in to use advanced options");
                                      setAuthModalMode("login");
                                      setAuthModalOpen(true);
                                      return;
                                    }
                                    updateCurrentSettings({ progressiveJpeg: e.target.checked });
                                  }}
                                  className="w-4 h-4 accent-primary"
                                />
                                <span className="text-sm font-medium text-foreground">Progressive JPEG</span>
                                {requiresAuth && (
                                  <Lock className="w-4 h-4 text-muted-foreground ml-auto" />
                                )}
                              </label>
                            );
                          })()}

                          {(() => {
                            const requiresAuth = !optimizePaletteFree && !user;
                            return (
                              <label 
                                className={cn(
                                  "flex items-center gap-3 p-2 border rounded-lg hover:bg-card cursor-pointer transition-all bg-card relative",
                                  requiresAuth && "opacity-75"
                                )}
                                style={requiresAuth ? { filter: 'blur(0.5px)' } : {}}
                                onClick={(e) => {
                                  if (requiresAuth) {
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
                                    if (requiresAuth) {
                                      e.preventDefault();
                                      e.target.checked = false;
                                      toast.error("Please sign in to use advanced options");
                                      setAuthModalMode("login");
                                      setAuthModalOpen(true);
                                      return;
                                    }
                                    updateCurrentSettings({ optimizePalette: e.target.checked });
                                  }}
                                  className="w-4 h-4 accent-primary"
                                />
                                <span className="text-sm font-medium text-foreground">Optimize Palette (PNG)</span>
                                {requiresAuth && (
                                  <Lock className="w-4 h-4 text-muted-foreground ml-auto" />
                                )}
                              </label>
                            );
                          })()}

                          {(() => {
                            const requiresAuth = !stripMetadataFree && !user;
                            return (
                              <label 
                                className={cn(
                                  "flex items-center gap-3 p-2 border rounded-lg hover:bg-card cursor-pointer transition-all bg-card relative",
                                  requiresAuth && "opacity-75"
                                )}
                                style={requiresAuth ? { filter: 'blur(0.5px)' } : {}}
                                onClick={(e) => {
                                  if (requiresAuth) {
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
                                    if (requiresAuth) {
                                      e.preventDefault();
                                      e.target.checked = false;
                                      toast.error("Please sign in to use advanced options");
                                      setAuthModalMode("login");
                                      setAuthModalOpen(true);
                                      return;
                                    }
                                    updateCurrentSettings({ stripMetadata: e.target.checked });
                                  }}
                                  className="w-4 h-4 accent-primary"
                                />
                                <span className="text-sm font-medium text-foreground">Strip Metadata</span>
                                {requiresAuth && (
                                  <Lock className="w-4 h-4 text-muted-foreground ml-auto" />
                                )}
                              </label>
                            );
                          })()}

                          {(() => {
                            const requiresAuth = !losslessCompressionFree && !user;
                            return (
                              <label 
                                className={cn(
                                  "flex items-center gap-3 p-2 border rounded-lg hover:bg-card cursor-pointer transition-all bg-card relative",
                                  requiresAuth && "opacity-75"
                                )}
                                style={requiresAuth ? { filter: 'blur(0.5px)' } : {}}
                                onClick={(e) => {
                                  if (requiresAuth) {
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
                                    if (requiresAuth) {
                                      e.preventDefault();
                                      e.target.checked = false;
                                      toast.error("Please sign in to use advanced options");
                                      setAuthModalMode("login");
                                      setAuthModalOpen(true);
                                      return;
                                    }
                                    updateCurrentSettings({ losslessCompression: e.target.checked });
                                  }}
                                  className="w-4 h-4 accent-primary"
                                />
                                <span className="text-sm font-medium text-foreground">Lossless Compression</span>
                                {requiresAuth && (
                                  <Lock className="w-4 h-4 text-muted-foreground ml-auto" />
                                )}
                              </label>
                            );
                          })()}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Format Conversion */}
                  <div className="space-y-2 border-t pt-4">
                    <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/40 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={getCurrentSettings().convertFormat}
                        onChange={(e) => updateCurrentSettings({ convertFormat: e.target.checked })}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="text-sm font-medium text-foreground">Convert Format</span>
                    </label>
                    {getCurrentSettings().convertFormat && (
                      <div className="bg-muted/40 rounded-lg p-3 space-y-2 border border-border">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Target Format</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['jpg', 'png', 'webp'].map(fmt => {
                            const current = getCurrentSettings();
                            // Check database feature flag - if false, requires auth
                            const webpFree = settings?.features?.imageCompress?.webpFormat ?? false;
                            const requiresAuth = fmt === "webp" && !webpFree && !user;
                            return (
                              <button
                                key={fmt}
                                onClick={() => {
                                  // Require authentication if feature is locked and user not logged in
                                  if (fmt === "webp" && !webpFree && !user) {
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
                                    ? "border-primary bg-brand-sky/50 text-brand-navy"
                                    : "border-border hover:border-border text-muted-foreground",
                                  requiresAuth && "opacity-75"
                                )}
                                style={requiresAuth ? { filter: 'blur(0.5px)' } : {}}
                              >
                                {fmt}
                                {requiresAuth && (
                                  <Lock className="w-4 h-4 text-muted-foreground absolute top-1 right-1" />
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
                    <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/40 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={getCurrentSettings().smartCrop}
                        onChange={(e) => updateCurrentSettings({ smartCrop: e.target.checked })}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="text-sm font-medium text-foreground">Smart Crop (Auto-remove whitespace)</span>
                    </label>
                  </div>

              </ToolSettingsPanel>

              <ToolFilesPanel
                title="Files"
                total={files.length}
                completed={Object.values(results).filter((r) => r.status === "done").length}
                processing={Object.values(results).filter((r) => r.status === "processing").length}
                actions={
                  <div className="flex w-full flex-col items-stretch gap-2 sm:items-end">
                    <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">
                      <Button
                        size="sm"
                        onClick={processAll}
                        disabled={processing}
                        className="h-9 rounded-lg bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-brand-navy disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        {processing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Compressing...
                          </>
                        ) : (
                          <>
                            <Zap className="mr-2 h-4 w-4" /> Compress All
                          </>
                        )}
                      </Button>
                      {Object.values(results).some((r) => r.status === "done") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadAll}
                          className="h-9 rounded-lg border-border bg-card font-medium text-foreground shadow-sm hover:bg-muted/40"
                        >
                          <Download className="mr-2 h-4 w-4" /> Download All
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAll}
                        className="h-9 rounded-lg border-red-200 bg-card font-medium text-red-600 shadow-sm hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Clear All
                      </Button>
                    </div>
                    <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 sm:self-end">
                      <input
                        type="checkbox"
                        checked={comparisonMode}
                        onChange={(e) => setComparisonMode(e.target.checked)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span>Comparison Grid</span>
                    </label>
                  </div>
                }
              >
                {/* Comparison Grid View */}
                {comparisonMode && Object.values(results).some(r => r.status === "done") && (
                  <Card className="border border-border mb-5">
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg text-foreground mb-4">Before & After Comparison</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {files.map((file, idx) => {
                          const res = results[file.name];
                          const preview = previewUrls[file.name];
                          if (res?.status !== "done") return null;
                          
                          const afterUrl = URL.createObjectURL(res.blob);
                          
                          return (
                            <div key={file.name + idx} className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="relative w-full aspect-square border-2 border-border rounded-lg overflow-hidden bg-muted/40 flex items-center justify-center">
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
                                <div className="relative w-full aspect-square border-2 border-brand-mid/30 rounded-lg overflow-hidden bg-muted/40 flex items-center justify-center">
                                  <img 
                                    src={afterUrl} 
                                    alt="After" 
                                    className="w-full h-full object-cover" 
                                    style={{ imageRendering: 'auto' }}
                                    onLoad={() => {
                                      // URL will be cleaned up when component unmounts
                                    }}
                                  />
                                  <div className="absolute top-1 left-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded">
                                    AFTER
                                  </div>
                                </div>
                              </div>
                              <div className="text-center text-xs">
                                <div className={cn(
                                  "font-semibold",
                                  res.percent > 0 ? "text-primary" : res.percent < 0 ? "text-red-600" : "text-muted-foreground"
                                )}>
                                  {res.percent !== 0 ? `${res.percent > 0 ? '-' : '+'}${Math.abs(res.percent)}%` : '0%'}
                                </div>
                                <div className="text-muted-foreground">{formatSize(res.size)}</div>
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
                  const fileSettingsForThis = getSettingsForFile(file.name);
                  const estDims = getEstimatedDimensions(
                    dims?.w || 1,
                    dims?.h || 1,
                    fileSettingsForThis
                  );
                  const estSize = calculateEstimatedSize(
                    file.size,
                    dims?.w,
                    dims?.h,
                    estDims?.w,
                    estDims?.h,
                    fileSettingsForThis.quality,
                    {
                      useTargetSize: fileSettingsForThis.useTargetSize,
                      targetFileSize: fileSettingsForThis.targetFileSize,
                      losslessCompression: fileSettingsForThis.losslessCompression,
                    }
                  );
                  const estReduction = estSize
                    ? Math.max(0, Math.round(((file.size - estSize) / file.size) * 100))
                    : 0;

                  return (
                    <Card 
                      key={file.name + idx} 
                      className={cn(
                        "overflow-hidden border-2 shadow-sm hover:shadow-md transition-all group cursor-pointer",
                        isSelected 
                          ? "border-primary bg-brand-sky/50/30 shadow-md" 
                          : "border-border hover:border-blue-300"
                      )}
                      onClick={() => setSelectedFile(file.name)}
                    >
                      <div className="p-4 flex gap-5 items-center">
                        {/* Thumbnail */}
                        <div className="w-20 h-20 bg-muted rounded-xl flex-shrink-0 overflow-hidden relative border border-border">
                          {preview ? (
                            <img src={preview} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-muted-foreground/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold truncate pr-4 text-foreground text-lg">{file.name}</h4>

                            <div className="flex gap-2">
                              {res?.status === "done" && (
                                <>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-primary hover:text-brand-navy" 
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
                                    className="h-8 w-8 text-primary bg-brand-sky/50 hover:bg-brand-sky" 
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
                                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50" 
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
                            <Badge variant="secondary" className="bg-muted text-muted-foreground border-border font-mono">
                              {formatSize(file.size)}
                            </Badge>

                            <ArrowRight className="w-3 h-3 text-muted-foreground/50" />

                            {/* Result / Estimate */}
                            {res?.status === "done" ? (
                              <>
                                <Badge className="bg-brand-sky text-brand-navy border-brand-mid/30 font-mono hover:bg-brand-sky">
                                  {formatSize(res.size)}
                                </Badge>
                                <span className={cn(
                                  "font-bold text-xs",
                                  res.percent > 0 ? "text-primary" : res.percent < 0 ? "text-red-600" : "text-muted-foreground"
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
                                {estSize ? (
                                  <>
                                    <span className="text-muted-foreground font-mono text-xs tabular-nums transition-all">
                                      ~{formatSize(estSize)}
                                    </span>
                                    {estReduction > 0 && (
                                      <span className="text-primary font-bold text-xs tabular-nums">
                                        (-{estReduction}%)
                                      </span>
                                    )}
                                    {estReduction === 0 && estSize >= file.size && (
                                      <span className="text-muted-foreground text-xs">est.</span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">
                                    Ready
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Dimensions Visualizer (The "Live Reducer") */}
                          {dims && estDims && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 bg-muted/40 px-2 py-1 rounded-md w-fit border border-border">
                              <Scale className="w-3 h-3 text-brand-mid" />
                              <span className="font-mono">{dims.w}x{dims.h}</span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                              <span className="font-mono font-bold text-primary">{estDims.w}x{estDims.h}px</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {res?.status === "processing" && (
                        <div className="px-4 pb-4 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-primary font-medium">Processing...</span>
                            <span className="text-primary font-bold">{res.progress || 0}%</span>
                          </div>
                          <div className="h-2 bg-brand-sky rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-primary to-brand-navy transition-all duration-300 ease-out"
                              style={{ width: `${res.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </ToolFilesPanel>
            </ToolWorkspace>
          )}
        </div>
    </ToolPageShell>

    {/* View Modal - Before/After Comparison */}
      {viewingFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4"
          onClick={closeViewModal}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold text-foreground">
                  {viewingFile.file.name}
                </h3>
                <p className="text-sm text-muted-foreground">Before & After Comparison</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={closeViewModal}
                className="h-8 w-8 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-4 sm:p-5">
              <div className="mb-4 grid gap-4 sm:grid-cols-2 sm:gap-5">
                {/* Before Image */}
                <div className="space-y-2.5">
                  <Badge variant="secondary" className="bg-muted text-xs">
                    BEFORE
                  </Badge>
                  <div className="flex h-[280px] items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 sm:h-[340px]">
                    <img
                      src={viewingFile.beforeUrl}
                      alt="Before"
                      className="max-h-full max-w-full object-contain"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Size</span>
                      <span className="font-medium tabular-nums">{formatSize(viewingFile.file.size)}</span>
                    </div>
                    {viewingFile.beforeDimensions && (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Dimensions</span>
                        <span className="font-medium tabular-nums">
                          {viewingFile.beforeDimensions.width} × {viewingFile.beforeDimensions.height}px
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* After Image */}
                <div className="space-y-2.5">
                  <Badge className="bg-brand-sky text-xs text-brand-navy border-brand-mid/30">
                    AFTER
                  </Badge>
                  <div className="flex h-[280px] items-center justify-center overflow-hidden rounded-lg border border-brand-mid/30 bg-muted/40 sm:h-[340px]">
                    <img
                      src={viewingFile.afterUrl}
                      alt="After"
                      className="max-h-full max-w-full object-contain"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Size</span>
                      <span
                        className={cn(
                          "font-medium tabular-nums",
                          viewingFile.result.percent > 0
                            ? "text-primary"
                            : viewingFile.result.percent < 0
                              ? "text-red-600"
                              : "text-muted-foreground"
                        )}
                      >
                        {formatSize(viewingFile.result.size)}
                        {viewingFile.result.percent !== 0 && (
                          <span className="ml-1.5">
                            ({viewingFile.result.percent > 0 ? "-" : "+"}
                            {Math.abs(viewingFile.result.percent)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    {viewingFile.afterDimensions && (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Dimensions</span>
                        <span className="font-medium tabular-nums">
                          {viewingFile.afterDimensions.width} × {viewingFile.afterDimensions.height}px
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
                <div className="rounded-lg bg-muted/40 px-2 py-2.5">
                  <div className="mb-0.5 text-xs text-muted-foreground">Size Change</div>
                  <div
                    className={cn(
                      "text-base font-bold",
                      viewingFile.result.percent > 0
                        ? "text-primary"
                        : viewingFile.result.percent < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                    )}
                  >
                    {viewingFile.result.percent !== 0
                      ? `${viewingFile.result.percent > 0 ? "-" : "+"}${Math.abs(viewingFile.result.percent)}%`
                      : "0%"}
                  </div>
                </div>
                <div className="rounded-lg bg-muted/40 px-2 py-2.5">
                  <div className="mb-0.5 text-xs text-muted-foreground">Saved</div>
                  <div className="text-base font-bold text-primary">{formatSize(viewingFile.result.saved)}</div>
                </div>
                <div className="rounded-lg bg-muted/40 px-2 py-2.5">
                  <div className="mb-0.5 text-xs text-muted-foreground">Mode</div>
                  <div className="truncate text-base font-bold capitalize text-primary">{resizeMode}</div>
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
    </>
  );
}
