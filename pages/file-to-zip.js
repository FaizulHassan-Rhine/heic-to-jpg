import { useState, useEffect } from "react";
import { useAuth } from "../lib/authContext";
import { useSettings } from "../lib/useSettings";
import { formatMaxMb } from "../lib/formatMaxMb";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import AuthModal from "../components/AuthModal";
import {
  Loader2, CheckCircle, Download, AlertCircle, FileText,
  Trash2, Upload, Archive, Settings2, Lock, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─────────────────────────── HELPERS ───────────────────────────

const formatSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// ─────────────────────────── COMPONENT ───────────────────────────

export default function FileToZip() {
  const { user, trackUsage } = useAuth();
  const { settings } = useSettings();
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [zipBlob, setZipBlob] = useState(null);
  const [zipSize, setZipSize] = useState(0);
  const [compressionLevel, setCompressionLevel] = useState(6); // 0-9, default 6 (balanced)
  const [archiveFormat, setArchiveFormat] = useState("zip"); // zip, tar, tar.gz, tar.br
  const [preserveStructure, setPreserveStructure] = useState(true);
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");

  // Calculate total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  // Handle files added
  const handleFilesAdded = (newFiles) => {
    const maxSize = settings.general.maxSize;
    const maxFiles = settings.general.maxFiles;

    if (!maxSize || !maxFiles) {
      toast.error("Upload limits not configured. Please contact support.");
      console.error("Database settings incomplete:", { maxSize, maxFiles });
      return;
    }

    // Check total file count
    const totalFiles = files.length + newFiles.length;
    if (totalFiles > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed. You have ${files.length} files.`);
      return;
    }

    // Check individual file sizes
    const validFiles = [];
    for (const file of newFiles) {
      if (file.size > maxSize) {
        toast.error(`"${file.name}" exceeds ${formatSize(maxSize)} limit`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file(s) added`);
    }
  };

  // Create archive file using server-side API for better compression
  const createArchive = async () => {
    if (files.length === 0) {
      toast.error("Please add files to create an archive");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setZipBlob(null);
    setZipSize(0);

    try {
      // Create FormData
      const formData = new FormData();
      
      // Add all files
      files.forEach((file) => {
        formData.append("files", file);
      });

      // Add settings
      formData.append("format", archiveFormat);
      formData.append("compressionLevel", compressionLevel.toString());
      formData.append("preserveStructure", preserveStructure.toString());

      // Track upload progress
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const uploadProgress = (e.loaded / e.total) * 50; // First 50% for upload
          setProgress(uploadProgress);
        }
      });

      xhr.addEventListener("load", async () => {
        if (xhr.status === 200) {
          const blob = xhr.response;
          setZipBlob(blob);
          setZipSize(blob.size);
          setProgress(100);
          
          const formatName = archiveFormat.toUpperCase();
          toast.success(`${formatName} archive created successfully!`);
          
          // Track usage
          if (user && trackUsage) {
            trackUsage("/file-to-zip", files.length, 1, {
              tool: "File to Archive",
              filesProcessed: files.length,
              format: archiveFormat,
              compressionLevel,
            });
          }
        } else {
          // When responseType is 'blob', we need to read the blob as text for error messages
          try {
            const blob = xhr.response;
            if (blob && blob instanceof Blob) {
              const text = await blob.text();
              const error = JSON.parse(text || '{}');
              toast.error(error.error || "Failed to create archive");
            } else {
              toast.error(`Failed to create archive (Status: ${xhr.status})`);
            }
          } catch (err) {
            toast.error(`Failed to create archive (Status: ${xhr.status})`);
          }
        }
        setProcessing(false);
      });

      xhr.addEventListener("error", () => {
        toast.error("Network error. Please try again.");
        setProcessing(false);
      });

      xhr.addEventListener("abort", () => {
        toast.error("Upload cancelled");
        setProcessing(false);
      });

      // Simulate compression progress (50-100%)
      const progressInterval = setInterval(() => {
        if (xhr.readyState < 4) {
          setProgress((prev) => {
            if (prev < 50) return prev + 1;
            if (prev < 90) return prev + 0.5;
            return prev;
          });
        } else {
          clearInterval(progressInterval);
        }
      }, 100);

      xhr.open("POST", "/api/file-to-archive");
      xhr.responseType = "blob";
      xhr.send(formData);
    } catch (error) {
      console.error("Archive creation error:", error);
      toast.error("Failed to create archive. Please try again.");
      setProcessing(false);
    }
  };

  // Download archive
  const downloadArchive = () => {
    if (!zipBlob) return;

    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `archive-${new Date().getTime()}.${archiveFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear all
  const clearAll = () => {
    setFiles([]);
    setZipBlob(null);
    setZipSize(0);
    setProgress(0);
    toast.success("Cleared all files");
  };

  // Remove single file
  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Compression level descriptions
  const compressionLevels = [
    { value: 0, label: "No Compression", desc: "Fastest, largest file" },
    { value: 1, label: "Fast", desc: "Quick compression" },
    { value: 3, label: "Fast (Balanced)", desc: "Good speed/size balance" },
    { value: 6, label: "Default", desc: "Recommended balance" },
    { value: 9, label: "Maximum", desc: "Smallest file, slower" },
  ];

  return (
    <>
    <ToolPageShell containerClassName="max-w-7xl">
        <div className="space-y-8">
          {/* Header */}
          <ToolPageHeader
            title="File to Archive"
            description="Combine multiple files (images, documents, PDFs) into compressed archives. Support for ZIP, TAR, TAR.GZ, and RAR formats with advanced compression."
          />

          {/* Upload Area */}
          <CollapsibleDropzone
            files={files}
            setFiles={handleFilesAdded}
            disabled={false}
            onDisabledClick={() => {
              const maxFiles = settings.general.maxFiles;
              toast.error(`Maximum ${maxFiles} files allowed. You have ${files.length} files.`);
            }}
            maxFiles={settings?.general?.maxFiles}
            currentFileCount={files.length}
            title="Upload Files to Archive"
            description="All file types"
            limitsText={`Max ${formatMaxMb(settings.general.maxSize)}MB each • Up to ${settings.general.maxFiles} files`}
            accept={{
              "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", ".heic"],
              "application/pdf": [".pdf"],
              "application/msword": [".doc"],
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
              "application/vnd.ms-excel": [".xls"],
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
              "application/vnd.ms-powerpoint": [".ppt"],
              "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
              "text/*": [".txt", ".csv", ".json", ".xml", ".html", ".css", ".js"],
              "video/*": [".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm"],
              "audio/*": [".mp3", ".wav", ".ogg", ".flac", ".aac"],
            }}
          />

          {/* Files List & Settings */}
          {files.length > 0 && (
            <div className="grid lg:grid-cols-[400px_1fr] gap-8 items-start">
              {/* Settings Sidebar */}
              <Card className="lg:sticky lg:top-24 h-fit border-0 shadow-lg ring-1 ring-gray-100">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-2 font-bold text-xl text-foreground">
                    <Settings2 className="w-6 h-6 text-primary" /> Settings
                  </div>

                  {/* Archive Format */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground uppercase tracking-wider">
                      Archive Format
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "zip", label: "ZIP", desc: "Universal, good compression" },
                        { value: "tar", label: "TAR", desc: "No compression, fastest" },
                        { value: "tar.gz", label: "TAR.GZ", desc: "Best compression (GZIP)" },
                        { value: "rar", label: "RAR", desc: "Excellent compression" },
                      ].map((format) => (
                        <button
                          key={format.value}
                          onClick={() => setArchiveFormat(format.value)}
                          className={cn(
                            "p-3 rounded-lg border-2 transition-all text-left",
                            archiveFormat === format.value
                              ? "border-primary bg-brand-sky/50 text-brand-navy shadow-sm"
                              : "border-border hover:border-border text-muted-foreground"
                          )}
                        >
                          <div className="font-semibold text-sm">{format.label}</div>
                          <div className="text-xs opacity-70">{format.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Compression Level */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground uppercase tracking-wider">
                      Compression Level
                    </label>
                    <div className="space-y-2">
                      {compressionLevels.map((level) => (
                        <button
                          key={level.value}
                          onClick={() => setCompressionLevel(level.value)}
                          className={cn(
                            "w-full p-3 rounded-lg border-2 transition-all text-left",
                            compressionLevel === level.value
                              ? "border-primary bg-brand-sky/50 text-brand-navy shadow-sm"
                              : "border-border hover:border-border text-muted-foreground"
                          )}
                        >
                          <div className="font-semibold text-sm">{level.label}</div>
                          <div className="text-xs opacity-70">{level.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Advanced Options */}
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

                    {advancedOptionsOpen && (
                      <div className="space-y-3 border-2 rounded-lg p-4 bg-muted/40">
                        {/* Preserve Folder Structure */}
                        <label className="flex items-center gap-3 p-2 border rounded-lg hover:bg-card cursor-pointer transition-all bg-card">
                          <input
                            type="checkbox"
                            checked={preserveStructure}
                            onChange={(e) => setPreserveStructure(e.target.checked)}
                            className="w-4 h-4 accent-primary"
                          />
                          <span className="text-sm font-medium text-foreground">
                            Preserve Folder Structure
                          </span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Files:</span>
                      <span className="font-semibold text-foreground">{files.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Size:</span>
                      <span className="font-semibold text-foreground">{formatSize(totalSize)}</span>
                    </div>
                    {zipSize > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Archive Size:</span>
                          <span className="font-semibold text-primary">{formatSize(zipSize)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Compression:</span>
                          <span className="font-semibold text-primary">
                            {totalSize > 0
                              ? `${Math.round(((totalSize - zipSize) / totalSize) * 100)}%`
                              : "0%"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Saved:</span>
                          <span className="font-semibold text-primary">
                            {formatSize(Math.max(0, totalSize - zipSize))}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Create Archive Button */}
                  <Button
                    onClick={createArchive}
                    disabled={processing || files.length === 0}
                    className="w-full bg-gradient-to-r from-primary to-brand-navy hover:from-brand-navy hover:to-brand-navy text-white h-12 shadow-lg hover:shadow-xl transition-all font-semibold text-base"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating Archive...
                      </>
                    ) : (
                      <>
                        <Archive className="w-5 h-5 mr-2" /> Create Archive
                      </>
                    )}
                  </Button>

                  {/* Download Button */}
                  {zipBlob && (
                    <Button
                      onClick={downloadArchive}
                      className="w-full bg-gradient-to-r from-primary to-brand-navy hover:from-brand-navy hover:to-brand-navy text-white h-12 shadow-lg hover:shadow-xl transition-all font-semibold text-base"
                    >
                      <Download className="w-5 h-5 mr-2" /> Download {archiveFormat.toUpperCase()}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Files List */}
              <div className="space-y-4">
                {/* Progress Bar */}
                {processing && (
                  <Card className="border border-border">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Creating {archiveFormat.toUpperCase()} archive...</span>
                          <span className="font-semibold text-foreground">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Files */}
                <Card className="border border-border">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-xl text-foreground flex items-center gap-2">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        Files ({files.length})
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAll}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Clear All
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {file.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatSize(file.size)}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
    </ToolPageShell>

    {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </>
  );
}

