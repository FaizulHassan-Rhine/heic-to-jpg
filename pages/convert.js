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
import ToolFileRow from "../components/ToolFileRow";
import AuthModal from "../components/AuthModal";
import JSZip from "jszip";
import {
  Loader2, CheckCircle, Download, AlertCircle, FileImage,
  RefreshCw, Trash2, RotateCcw, Image as ImageIcon,
  Settings2, ArrowRight, Eye, X, ChevronDown, ChevronUp, Lock
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
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

const getFileType = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  if (['heic', 'heif'].includes(ext)) return 'heic';
  if (['jpg', 'jpeg'].includes(ext)) return 'jpg';
  if (['png'].includes(ext)) return 'png';
  if (['webp'].includes(ext)) return 'webp';
  if (['avif'].includes(ext)) return 'avif';
  if (['ico'].includes(ext)) return 'ico';
  if (['gif'].includes(ext)) return 'gif';
  if (['bmp'].includes(ext)) return 'bmp';
  if (['tiff', 'tif'].includes(ext)) return 'tiff';
  return 'unknown';
};

/**
 * Decode AVIF (and other browser-supported images) to PNG via canvas.
 * Needed because some AVIF brands (e.g. "avis") fail in Sharp/libheif on the server.
 */
const decodeImageFileToPng = async (file) => {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Fallback: HTMLImageElement
    const url = URL.createObjectURL(file);
    try {
      bitmap = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Browser cannot decode this image"));
        img.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const width = bitmap.width || bitmap.naturalWidth;
  const height = bitmap.height || bitmap.naturalHeight;
  if (!width || !height) {
    throw new Error("Could not read image dimensions");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(bitmap, 0, 0);
  if (typeof bitmap.close === "function") bitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to encode PNG"))),
      "image/png"
    );
  });

  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${base}.png`, { type: "image/png" });
};

/** Formats the server Sharp build may fail to decode — pre-convert in the browser */
const needsBrowserDecode = (file) => {
  const type = getFileType(file.name);
  if (type === "avif") return true;
  if (file.type === "image/avif") return true;
  return false;
};

/** Safe base name for ZIP download (no path chars; .zip added later). */
const sanitizeZipBaseName = (raw) => {
  const trimmed = (raw ?? "").trim() || "converted_images";
  const withoutZip = trimmed.replace(/\.zip$/i, "");
  const safe = withoutZip.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, " ");
  return safe.slice(0, 200) || "converted_images";
};

// ─────────────────────────── COMPONENT ───────────────────────────

export default function ConvertImage() {
  const { user, trackUsage } = useAuth();
  const { settings } = useSettings();
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
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [zipFileName, setZipFileName] = useState("converted_images");

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
    const maxSize = settings.image.maxSize;
    const maxFiles = settings.image.maxFiles;
    
    // Safety check - if database values are missing, block upload
    if (!maxSize || !maxFiles) {
      toast.error("Upload limits not configured. Please contact support.");
      console.error("Database settings incomplete:", { maxSize, maxFiles });
      return;
    }
    
    // Debug logging for troubleshooting
    console.log("File upload validation:", {
      currentFiles: files.length,
      newFiles: newFiles.length,
      maxFiles: maxFiles,
      total: files.length + newFiles.length,
      willExceed: files.length + newFiles.length > maxFiles,
      settings: settings.image
    });

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

    // AVIF: decode in browser first — Sharp often rejects "avis"/some camera AVIFs
    let uploadFile = file;
    let uploadInputType = getFileType(file.name);
    if (needsBrowserDecode(file)) {
      try {
        uploadFile = await decodeImageFileToPng(file);
        uploadInputType = "png";
      } catch (decodeErr) {
        console.warn("Browser AVIF decode failed:", decodeErr);
        throw new Error(
          "Could not read this AVIF in the browser. Open it in Chrome/Edge, or convert to PNG/JPG first."
        );
      }
    }

    formData.append("file", uploadFile);

    // Send format and quality separately for better API handling
    formData.append("format", settings.targetFormat);
    formData.append("quality", settings.quality.toString());
    formData.append("inputType", uploadInputType);
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

      if (!res.ok) {
        let message = "Conversion failed";
        try {
          const errJson = await res.json();
          if (errJson?.error) message = errJson.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }

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
      return { status: "error", error: e.message || "Conversion failed" };
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
        
        // Track usage if conversion was successful (for both logged-in and anonymous users)
        if (res.status === "done") {
          successCount++;
          if (trackUsage) {
          // Collect file information
          const inputExt = file.name.split('.').pop()?.toLowerCase() || '';
          const outputExt = res.ext || inputExt;
          const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          
          // Generate thumbnails for input and output
          const thumbnails = await generateFileThumbnails(file, res.blob).catch((error) => {
            console.warn("Thumbnail generation failed:", error);
            return {};
          });
          
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
          
          const fileInfo = {
            inputName: file.name,
            inputSize: file.size,
            inputFormat: inputExt,
            outputName: `${baseName}.${outputExt}`,
            outputSize: res.size || res.blob?.size || 0,
            outputFormat: outputExt,
            inputThumbnail: inputThumbnailBase64,
            outputThumbnail: outputThumbnailBase64,
            outputFileData: outputFileData,
          };
          
          processedFiles.push(fileInfo);
          }
        }
      }));
    }

    // Track usage after all conversions complete (for both logged-in and anonymous users)
    if (successCount > 0 && trackUsage) {
      console.log("Tracking usage - processedFiles:", processedFiles);
      console.log("Tracking usage - successCount:", successCount);
      console.log("Tracking usage - user:", user ? "logged-in" : "anonymous");
      trackUsage("/convert", successCount, successCount, {
        tool: "Image Converter",
        filesProcessed: successCount,
      }, processedFiles);
    }

    const failedCount = pending.length - successCount;
    if (successCount > 0 && failedCount === 0) {
      notify.success(
        "Conversion complete",
        successCount === 1 ? "Ready to download." : `${successCount} files ready.`
      );
    } else if (successCount > 0 && failedCount > 0) {
      notify.warning(
        "Partially complete",
        `${successCount} ok · ${failedCount} failed`
      );
    } else if (pending.length > 0) {
      notify.error(
        "Conversion failed",
        "Check the file list for details."
      );
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
    a.download = `${sanitizeZipBaseName(zipFileName)}.zip`;
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
    setZipFileName("converted_images");
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
      // Revoke the after URL (converted image) as it's created here
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
          title="Convert Images"
          description="Transform HEIC, JPG, PNG, WEBP files instantly. Mass conversion with high quality."
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

        {/* Main Workspace */}
        <div className="grid gap-8">

          {/* 1. Upload */}
          <CollapsibleDropzone
            files={files}
            setFiles={handleFilesAdded}
            disabled={false}
            onDisabledClick={() => {
              const maxFiles = settings.image.maxFiles;
              toast.error(`Maximum ${maxFiles} files allowed. You have ${files.length} files.`);
            }}
            maxFiles={settings?.image?.maxFiles}
            currentFileCount={files.length}
            title="Upload Images to Convert"
            description={`JPG, PNG, WebP, AVIF, ICO, HEIC, TIFF • Max ${Math.round(settings.image.maxSize / (1024 * 1024))}MB each • Up to ${settings.image.maxFiles} files`}
            accept={{
              "image/jpeg": [".jpg", ".jpeg", ".JPG", ".JPEG"],
              "image/png": [".png", ".PNG"],
              "image/webp": [".webp", ".WEBP"],
              "image/avif": [".avif", ".AVIF"],
              "image/x-icon": [".ico", ".ICO"],
              "image/vnd.microsoft.icon": [".ico", ".ICO"],
              "image/heic": [".heic", ".HEIC"],
              "image/gif": [".gif", ".GIF"],
              "image/bmp": [".bmp", ".BMP"],
              "image/tiff": [".tiff", ".tif", ".TIFF", ".TIF"]
            }}
          />

          {/* 2. Controls & List */}
          {files.length > 0 && (
            <ToolWorkspace sidebarWidth="360px">

              {/* Sidebar: Settings */}
              <ToolSettingsPanel
                title="Output Settings"
                headerExtra={
                  selectedFile ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedFile(null)}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 whitespace-nowrap flex-shrink-0 h-7 px-2"
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

                  {/* Format Presets */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground">Format Preset</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "custom", label: "Custom", icon: "⚙️" },
                        { id: "web", label: "Web", icon: "🌐" },
                        { id: "print", label: "Print", icon: "🖨️" },
                        { id: "social", label: "Social", icon: "📱" },
                      ].map(preset => {
                        const current = getCurrentSettings();
                        // Check database feature flag - if false, requires auth
                        const isFree = preset.id === "social" 
                          ? (settings?.features?.imageConverter?.socialPreset ?? false)
                          : true; // Web and Print are always free
                        const requiresAuth = preset.id === "social" && !isFree && !user;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => {
                              // Require authentication if feature is locked and user not logged in
                              if (preset.id === "social" && !isFree && !user) {
                                toast.error("Please sign in to use Social preset");
                                setAuthModalMode("login");
                                setAuthModalOpen(true);
                                return;
                              }

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
                              "p-2 rounded-lg border-2 transition-all text-center text-xs relative",
                              current.formatPreset === preset.id
                                ? "border-primary bg-brand-sky/50 text-brand-navy shadow-sm"
                                : "border-border hover:border-border text-muted-foreground",
                              requiresAuth && "opacity-75"
                            )}
                            style={requiresAuth ? { filter: 'blur(0.5px)' } : {}}
                          >
                            <div className="text-lg mb-1">{preset.icon}</div>
                            <div className="font-medium">{preset.label}</div>
                            {requiresAuth && (
                              <div className="absolute top-1 right-1 z-10">
                                <Lock className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Format Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground">Target Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['jpg', 'png', 'webp', 'avif', 'ico'].map(fmt => {
                        const current = getCurrentSettings();
                        return (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => {
                              updateCurrentSettings({ targetFormat: fmt, formatPreset: "custom" });
                            }}
                            className={cn(
                              "flex items-center justify-between px-3 py-3 text-sm rounded-lg border-2 transition-all uppercase font-medium",
                              current.targetFormat === fmt ? "border-primary bg-brand-sky/50 text-brand-navy shadow-sm" : "border-border hover:border-border text-muted-foreground"
                            )}
                          >
                            {fmt}
                            {current.targetFormat === fmt && <CheckCircle className="w-4 h-4 ml-2 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    {getCurrentSettings().targetFormat === "ico" && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        ICO exports standard favicon sizes (16, 32, 48px). Best for browser icons.
                      </p>
                    )}
                    {getCurrentSettings().targetFormat === "avif" && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        AVIF offers strong compression for modern browsers. Quality slider applies.
                      </p>
                    )}
                  </div>

                  {/* Quality Slider */}
                  {getCurrentSettings().targetFormat !== "ico" && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-muted-foreground">Quality</label>
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
                    {getCurrentSettings().targetFormat === 'png' && (
                      <p className="text-xs text-muted-foreground italic">PNG uses lossless compression</p>
                    )}
                  </div>
                  )}

                  {/* Format-Specific Options */}
                  {getCurrentSettings().targetFormat === 'png' && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/40 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={getCurrentSettings().preserveTransparency}
                          onChange={(e) => updateCurrentSettings({ preserveTransparency: e.target.checked })}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm font-medium text-foreground">Preserve Transparency</span>
                      </label>
                    </div>
                  )}

                  {getCurrentSettings().targetFormat === 'jpg' && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/40 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={getCurrentSettings().progressiveJpeg}
                          onChange={(e) => updateCurrentSettings({ progressiveJpeg: e.target.checked })}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm font-medium text-foreground">Progressive JPEG</span>
                      </label>
                    </div>
                  )}

                  {/* Rotation */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground">Rotation</label>
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
                                ? "border-primary bg-brand-sky/50 text-brand-navy"
                                : "border-border hover:border-border text-muted-foreground"
                            )}
                          >
                            {angle}°
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Advanced Options Dropdown */}
                  <div className="space-y-2">
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
                      const resizeFree = settings?.features?.imageConverter?.advancedOptions?.resize ?? false;
                      const preserveMetadataFree = settings?.features?.imageConverter?.advancedOptions?.preserveMetadata ?? false;
                      const watermarkFree = settings?.features?.imageConverter?.advancedOptions?.watermark ?? false;
                      const customFileNamesFree = settings?.features?.imageConverter?.advancedOptions?.customFileNames ?? false;
                      const showPreviewFree = settings?.features?.imageConverter?.advancedOptions?.showPreview ?? false;
                      
                      return (
                        <div className="space-y-3 border-2 rounded-lg p-4 bg-muted/40">
                          {/* Resize Option */}
                          <div className="space-y-3">
                            {(() => {
                              const requiresAuth = !resizeFree && !user;
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
                                    checked={getCurrentSettings().resizeEnabled}
                                    onChange={(e) => {
                                      if (requiresAuth) {
                                        e.preventDefault();
                                        e.target.checked = false;
                                        toast.error("Please sign in to use advanced options");
                                        setAuthModalMode("login");
                                        setAuthModalOpen(true);
                                        return;
                                      }
                                      updateCurrentSettings({ resizeEnabled: e.target.checked });
                                    }}
                                    className="w-4 h-4 accent-primary"
                                  />
                                  <span className="text-sm font-medium text-foreground">Resize During Conversion</span>
                                  {requiresAuth && (
                                    <Lock className="w-4 h-4 text-muted-foreground ml-auto" />
                                  )}
                                </label>
                              );
                            })()}
                          {getCurrentSettings().resizeEnabled && (
                            <div className="bg-card rounded-lg p-3 space-y-3 border border-border">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Width (px)</label>
                                  <input
                                    type="number"
                                    value={getCurrentSettings().resizeWidth}
                                    onChange={(e) => updateCurrentSettings({ resizeWidth: Number(e.target.value) })}
                                    className="input-theme"
                                    min="1"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Height (px)</label>
                                  <input
                                    type="number"
                                    value={getCurrentSettings().resizeHeight}
                                    onChange={(e) => updateCurrentSettings({ resizeHeight: Number(e.target.value) })}
                                    className="input-theme"
                                    min="1"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Resize Mode</label>
                                <select
                                  value={getCurrentSettings().resizeMode}
                                  onChange={(e) => updateCurrentSettings({ resizeMode: e.target.value })}
                                  className="input-theme"
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
                            {(() => {
                              const requiresAuth = !preserveMetadataFree && !user;
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
                                    checked={getCurrentSettings().preserveMetadata}
                                    onChange={(e) => {
                                      if (requiresAuth) {
                                        e.preventDefault();
                                        e.target.checked = false;
                                        toast.error("Please sign in to use advanced options");
                                        setAuthModalMode("login");
                                        setAuthModalOpen(true);
                                        return;
                                      }
                                      updateCurrentSettings({ preserveMetadata: e.target.checked });
                                    }}
                                    className="w-4 h-4 accent-primary"
                                  />
                                  <span className="text-sm font-medium text-foreground">Preserve EXIF Metadata</span>
                                  {requiresAuth && (
                                    <Lock className="w-4 h-4 text-muted-foreground ml-auto" />
                                  )}
                                </label>
                              );
                            })()}
                          </div>

                          {/* Watermark */}
                          <div className="space-y-2">
                            {(() => {
                              const requiresAuth = !watermarkFree && !user;
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
                                    checked={getCurrentSettings().watermarkEnabled}
                                    onChange={(e) => {
                                      if (requiresAuth) {
                                        e.preventDefault();
                                        e.target.checked = false;
                                        toast.error("Please sign in to use advanced options");
                                        setAuthModalMode("login");
                                        setAuthModalOpen(true);
                                        return;
                                      }
                                      updateCurrentSettings({ watermarkEnabled: e.target.checked });
                                    }}
                                    className="w-4 h-4 accent-primary"
                                  />
                                  <span className="text-sm font-medium text-foreground">Add Watermark</span>
                                  {requiresAuth && (
                                    <Lock className="w-4 h-4 text-muted-foreground ml-auto" />
                                  )}
                                </label>
                              );
                            })()}
                          {getCurrentSettings().watermarkEnabled && (
                            <div className="bg-card rounded-lg p-3 space-y-2 border border-border">
                              <input
                                type="text"
                                placeholder="Watermark text"
                                value={getCurrentSettings().watermarkText}
                                onChange={(e) => updateCurrentSettings({ watermarkText: e.target.value })}
                                className="input-theme"
                              />
                              <select
                                value={getCurrentSettings().watermarkPosition}
                                onChange={(e) => updateCurrentSettings({ watermarkPosition: e.target.value })}
                                className="input-theme"
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
                            {(() => {
                              const requiresAuth = !customFileNamesFree && !user;
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
                                    checked={batchRename}
                                    onChange={(e) => {
                                      if (requiresAuth) {
                                        e.preventDefault();
                                        e.target.checked = false;
                                        toast.error("Please sign in to use advanced options");
                                        setAuthModalMode("login");
                                        setAuthModalOpen(true);
                                        return;
                                      }
                                      setBatchRename(e.target.checked);
                                    }}
                                    className="w-4 h-4 accent-primary"
                                  />
                                  <span className="text-sm font-medium text-foreground">Custom File Names</span>
                                  {requiresAuth && (
                                    <Lock className="w-4 h-4 text-muted-foreground ml-auto" />
                                  )}
                                </label>
                              );
                            })()}
                          {batchRename && (
                            <div className="bg-card rounded-lg p-3 space-y-2 border border-border">
                              <input
                                type="text"
                                placeholder="{original} or image_{index}"
                                value={renamePattern}
                                onChange={(e) => setRenamePattern(e.target.value)}
                                className="w-full px-2 py-1 text-sm border rounded-md font-mono text-xs"
                              />
                              <p className="text-xs text-muted-foreground">
                                Use {"{original}"} for original name, {"{index}"} for number
                              </p>
                            </div>
                          )}
                        </div>

                          {/* Preview Toggle */}
                          <div className="space-y-2">
                            {(() => {
                              const requiresAuth = !showPreviewFree && !user;
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
                                    checked={showPreview}
                                    onChange={(e) => {
                                      if (requiresAuth) {
                                        e.preventDefault();
                                        e.target.checked = false;
                                        toast.error("Please sign in to use advanced options");
                                        setAuthModalMode("login");
                                        setAuthModalOpen(true);
                                        return;
                                      }
                                      setShowPreview(e.target.checked);
                                    }}
                                    className="w-4 h-4 accent-primary"
                                  />
                                  <span className="text-sm font-medium text-foreground">Show Preview Before Conversion</span>
                                  {requiresAuth && (
                                    <Lock className="w-4 h-4 text-muted-foreground ml-auto" />
                                  )}
                                </label>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

              </ToolSettingsPanel>

              {/* Main: File List */}
              <ToolFilesPanel
                title="Files"
                total={files.length}
                completed={Object.values(results).filter((r) => r.status === "done").length}
                processing={Object.values(results).filter((r) => r.status === "processing").length}
                actions={
                  <>
                    {Object.values(results).some((r) => r.status === "done") && (
                      <div className="w-full rounded-xl border border-border bg-muted/40 p-3.5">
                        <label
                          htmlFor="zip-file-name"
                          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          ZIP file name
                        </label>
                        <input
                          id="zip-file-name"
                          type="text"
                          value={zipFileName}
                          onChange={(e) => setZipFileName(e.target.value)}
                          placeholder="converted_images"
                          autoComplete="off"
                          className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-brand-mid focus:outline-none focus:ring-2 focus:ring-brand-mid/20"
                        />
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          Saved as <span className="rounded bg-card px-1 font-mono text-[0.8rem] text-muted-foreground ring-1 ring-border">.zip</span>
                          {" — "}edit before Download All
                        </p>
                      </div>
                    )}
                    <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end">
                      <Button
                        size="sm"
                        onClick={processAll}
                        disabled={processing}
                        className="h-9 rounded-lg bg-primary px-4 font-semibold text-primary-foreground shadow-sm hover:bg-brand-navy disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        {processing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Converting...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" /> Convert All
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
                  </>
                }
              >
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
                          ? "border-primary bg-brand-sky/30 shadow-md" 
                          : "border-border hover:border-brand-mid"
                      )}
                      onClick={() => setSelectedFile(file.name)}
                    >
                      <div className="flex items-center p-3 gap-4">
                        {/* Preview */}
                        <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0 overflow-hidden relative border">
                          {preview ? (
                            <img src={preview} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-xs font-bold text-muted-foreground uppercase">
                              {file.name.split('.').pop()}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium truncate pr-4 text-foreground">{file.name}</h4>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
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
                                    className="h-8 w-8 text-primary" 
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
                                className="h-8 w-8 text-muted-foreground hover:text-red-500" 
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
                            <Badge variant="secondary" className="font-normal text-muted-foreground bg-muted hover:bg-muted">
                              {formatSize(file.size)}
                            </Badge>

                            <ArrowRight className="w-3 h-3 text-muted-foreground/50" />

                            {res?.status === "done" ? (
                              <>
                                <Badge className="bg-brand-sky text-brand-navy hover:bg-brand-sky border-brand-mid/30">
                                  {formatSize(res.size)}
                                </Badge>
                                {res.percent !== 0 && (
                                  <span className={cn(
                                    "text-xs font-bold ml-1",
                                    res.percent > 0 ? "text-primary" : "text-red-600"
                                  )}>
                                    ({res.percent > 0 ? '-' : '+'}{Math.abs(res.percent)}%)
                                  </span>
                                )}
                                <Badge variant="outline" className="border-brand-mid/30 text-brand-navy uppercase">
                                  {res.ext}
                                </Badge>
                              </>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground border-dashed border-border uppercase">
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

    {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {/* View Modal - Before/After Comparison */}
      {viewingFile && (
        <div 
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={closeViewModal}
        >
          <div 
            className="bg-card rounded-lg shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex justify-between items-center z-10">
              <div>
                <h3 className="text-xl font-bold text-foreground">{viewingFile.file.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">Before & After Comparison</p>
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
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <Badge variant="secondary" className="bg-muted">BEFORE</Badge>
                    </h4>
                  </div>
                  <div className="border-2 border-border rounded-lg overflow-hidden bg-muted/40 flex items-center justify-center min-h-[400px]">
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
                      <span className="text-muted-foreground">Format:</span>
                      <Badge variant="outline" className="uppercase">
                        {getFileType(viewingFile.file.name)}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size:</span>
                      <span className="font-medium">{formatSize(viewingFile.file.size)}</span>
                    </div>
                    {viewingFile.beforeDimensions && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dimensions:</span>
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
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <Badge className="bg-brand-sky text-brand-navy border-brand-mid/30">AFTER</Badge>
                    </h4>
                  </div>
                  <div className="border-2 border-brand-mid/30 rounded-lg overflow-hidden bg-muted/40 flex items-center justify-center min-h-[400px]">
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
                      <span className="text-muted-foreground">Format:</span>
                      <Badge className="bg-brand-sky text-brand-navy border-brand-mid/30 uppercase">
                        {viewingFile.result.ext}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size:</span>
                      <span className={cn(
                        "font-medium",
                        viewingFile.result.percent > 0 ? "text-primary" : viewingFile.result.percent < 0 ? "text-red-600" : "text-muted-foreground"
                      )}>
                        {formatSize(viewingFile.result.size)}
                        {viewingFile.result.percent !== 0 && (
                          <span className={cn(
                            "ml-2",
                            viewingFile.result.percent > 0 ? "text-primary" : "text-red-600"
                          )}>
                            ({viewingFile.result.percent > 0 ? '-' : '+'}{Math.abs(viewingFile.result.percent)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    {viewingFile.afterDimensions && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dimensions:</span>
                        <span className="font-medium">
                          {viewingFile.afterDimensions.width} × {viewingFile.afterDimensions.height}px
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="border-t border-border pt-4 mt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-muted/40 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Size Change</div>
                    <div className={cn(
                      "text-lg font-bold",
                      viewingFile.result.percent > 0 ? "text-primary" : viewingFile.result.percent < 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {viewingFile.result.percent !== 0 
                        ? `${viewingFile.result.percent > 0 ? '-' : '+'}${Math.abs(viewingFile.result.percent)}%` 
                        : '0%'}
                    </div>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Saved</div>
                    <div className="text-lg font-bold text-primary">
                      {formatSize(viewingFile.result.saved)}
                    </div>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Quality</div>
                    <div className="text-lg font-bold text-primary capitalize">
                      {quality}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
