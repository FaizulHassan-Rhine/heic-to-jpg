import { useState, useRef } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  Loader2, CheckCircle, AlertCircle, Film, Trash2, Upload,
  Download, RotateCcw, Minimize2, FileVideo, Gauge, Monitor
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import toast, { Toaster } from "react-hot-toast";
import { cn } from "@/lib/utils";
import Head from "next/head";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

const QUALITY_PRESETS = [
  { value: "high", label: "High Quality", crf: 23, desc: "Minimal compression, best quality" },
  { value: "medium", label: "Medium", crf: 28, desc: "Balanced quality and size" },
  { value: "low", label: "Small Size", crf: 35, desc: "Maximum compression" },
  { value: "tiny", label: "Tiny", crf: 42, desc: "Smallest file, lower quality" },
];

const RESOLUTION_PRESETS = [
  { value: "original", label: "Original", scale: null },
  { value: "1080p", label: "1080p", scale: "1920:-2" },
  { value: "720p", label: "720p", scale: "1280:-2" },
  { value: "480p", label: "480p", scale: "854:-2" },
  { value: "360p", label: "360p", scale: "640:-2" },
];

// Shared FFmpeg instance
let ffmpegInstance = null;
let ffmpegLoadingState = false;

const getFFmpeg = async (onProgress) => {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  if (ffmpegLoadingState) {
    while (ffmpegLoadingState) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return ffmpegInstance;
  }

  ffmpegLoadingState = true;

  try {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");

    const ffmpeg = new FFmpeg();

    ffmpeg.on("progress", ({ progress }) => {
      if (onProgress) onProgress(Math.round(progress * 100));
    });

    ffmpeg.on("log", ({ message }) => {
      console.log("[FFmpeg]", message);
    });

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  } catch (error) {
    console.error("FFmpeg load error:", error);
    throw new Error("Failed to load video processor. Please refresh and try again.");
  } finally {
    ffmpegLoadingState = false;
  }
};

export default function VideoCompress() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState(null);
  const [quality, setQuality] = useState("medium");
  const [resolution, setResolution] = useState("original");
  const [removeAudio, setRemoveAudio] = useState(false);
  const [totalUploads, setTotalUploads] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);
  const [previewUrls, setPreviewUrls] = useState({});
  const fileInputRef = useRef(null);

  const getFileKey = (file) => file.name + file.size + file.lastModified;

  const handleFilesAdded = (newFiles) => {
    const fileArray = Array.from(newFiles);

    if (files.length + fileArray.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} videos allowed at a time.`);
      return;
    }

    const oversized = [];
    const valid = [];

    fileArray.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        oversized.push(file.name);
      } else if (!file.type.startsWith("video/")) {
        toast.error(`${file.name} is not a video file`);
      } else {
        valid.push(file);
      }
    });

    if (oversized.length > 0) {
      toast.error(`${oversized.join(", ")} exceed${oversized.length > 1 ? "" : "s"} 500MB limit`);
    }

    if (valid.length === 0) return;

    const newPreviews = {};
    valid.forEach((file) => {
      const key = getFileKey(file);
      newPreviews[key] = URL.createObjectURL(file);
    });

    setPreviewUrls((prev) => ({ ...prev, ...newPreviews }));
    setFiles((prev) => [...prev, ...valid]);
    setTotalUploads((prev) => prev + valid.length);
  };

  const loadFFmpeg = async () => {
    setFfmpegLoading(true);
    try {
      await getFFmpeg((p) => setCompressProgress(p));
      setFfmpegReady(true);
      toast.success("Video processor ready!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setFfmpegLoading(false);
    }
  };

  const compressVideo = async (file) => {
    const ffmpeg = await getFFmpeg((p) => setCompressProgress(p));
    const { fetchFile } = await import("@ffmpeg/util");

    const inputExt = file.name.split(".").pop().toLowerCase();
    const inputName = `input.${inputExt}`;
    const outputName = "output.mp4";

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    const preset = QUALITY_PRESETS.find((p) => p.value === quality);
    const crf = preset?.crf || 28;

    // Build FFmpeg args
    let args = ["-i", inputName];

    // Video codec + CRF
    args.push("-c:v", "libx264", "-crf", String(crf), "-preset", "fast");

    // Resolution
    const resPreset = RESOLUTION_PRESETS.find((r) => r.value === resolution);
    if (resPreset?.scale) {
      args.push("-vf", `scale=${resPreset.scale}`);
    }

    // Audio
    if (removeAudio) {
      args.push("-an");
    } else {
      args.push("-c:a", "aac", "-b:a", "128k");
    }

    args.push("-movflags", "+faststart", outputName);

    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: "video/mp4" });

    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    return blob;
  };

  const compressAll = async () => {
    if (files.length === 0) {
      toast.error("Please upload videos first");
      return;
    }

    if (!ffmpegReady) {
      toast.loading("Loading video processor...");
      try {
        await loadFFmpeg();
      } catch {
        return;
      }
      toast.dismiss();
    }

    setProcessing(true);
    setTotalCompleted(0);
    let completed = 0;

    for (const file of files) {
      const key = getFileKey(file);

      if (results[key]?.status === "done") {
        completed++;
        continue;
      }

      setProcessingFile(file.name);
      setCompressProgress(0);
      setResults((prev) => ({ ...prev, [key]: { status: "processing" } }));

      try {
        const blob = await compressVideo(file);
        completed++;
        setTotalCompleted(completed);

        const savedPercent = ((1 - blob.size / file.size) * 100).toFixed(1);

        setResults((prev) => ({
          ...prev,
          [key]: {
            status: "done",
            blob,
            size: blob.size,
            originalSize: file.size,
            savedPercent,
            name: file.name.replace(/\.[^.]+$/, "") + "-compressed.mp4",
          },
        }));
      } catch (error) {
        console.error("Compress error:", error);
        setResults((prev) => ({
          ...prev,
          [key]: { status: "error", error: error.message || "Compression failed" },
        }));
      }
    }

    setProcessing(false);
    setProcessingFile(null);
    setCompressProgress(0);
    if (completed > 0) {
      toast.success(`${completed} video${completed > 1 ? "s" : ""} compressed!`);
    }
  };

  const downloadFile = (key) => {
    const result = results[key];
    if (!result?.blob) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const removeFile = (index) => {
    const file = files[index];
    const key = getFileKey(file);
    if (previewUrls[key]) URL.revokeObjectURL(previewUrls[key]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResults((prev) => { const n = { ...prev }; delete n[key]; return n; });
    setPreviewUrls((prev) => { const n = { ...prev }; delete n[key]; return n; });
    setTotalUploads((prev) => Math.max(0, prev - 1));
  };

  const resetAll = () => {
    Object.values(previewUrls).forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setResults({});
    setPreviewUrls({});
    setTotalUploads(0);
    setTotalCompleted(0);
    setProcessing(false);
    setProcessingFile(null);
    setCompressProgress(0);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const completedCount = Object.values(results).filter((r) => r.status === "done").length;

  return (
    <>
      <Head>
        <title>Video Compressor - ConvertMastery</title>
        <meta name="description" content="Compress videos for free. Reduce file size with adjustable quality and resolution. Runs in your browser." />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <Toaster position="top-center" />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Video Compressor</h1>
            <p className="text-gray-500">Reduce video file size while preserving quality — 100% in your browser</p>
          </div>

          {/* Upload + Stats */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 border-gray-300 hover:border-green-400 hover:bg-green-50/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesAdded(e.target.files)}
                />
                <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                <p className="text-lg font-medium text-gray-600">Drag & drop videos or click to browse</p>
                <p className="text-xs text-gray-400 mt-2">
                  Max {MAX_FILES} files • Max 500MB each
                </p>
              </div>
            </div>
            <div className="flex flex-row md:flex-col gap-3 md:w-48">
              <Card className="flex-1">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Uploaded</p>
                  <p className="text-2xl font-bold text-gray-800">{totalUploads}</p>
                </CardContent>
              </Card>
              <Card className="flex-1">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{totalCompleted}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Compression Settings */}
          {files.length > 0 && (
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {/* Quality */}
              <Card>
                <CardContent className="p-4">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
                    <Gauge className="h-4 w-4" />
                    Quality
                  </label>
                  <div className="space-y-2">
                    {QUALITY_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setQuality(preset.value)}
                        disabled={processing}
                        className={cn(
                          "w-full p-2.5 rounded-lg border-2 text-left transition-all",
                          quality === preset.value
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <span className="text-sm font-medium text-gray-800 block">{preset.label}</span>
                        <span className="text-[10px] text-gray-400">{preset.desc}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Resolution */}
              <Card>
                <CardContent className="p-4">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
                    <Monitor className="h-4 w-4" />
                    Resolution
                  </label>
                  <div className="space-y-2">
                    {RESOLUTION_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setResolution(preset.value)}
                        disabled={processing}
                        className={cn(
                          "w-full p-2.5 rounded-lg border-2 text-left transition-all",
                          resolution === preset.value
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <span className="text-sm font-medium text-gray-800">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Options */}
              <Card>
                <CardContent className="p-4">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
                    <Minimize2 className="h-4 w-4" />
                    Options
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-2.5 border-2 rounded-lg border-gray-200 hover:border-gray-300 transition-all">
                    <input
                      type="checkbox"
                      checked={removeAudio}
                      onChange={(e) => setRemoveAudio(e.target.checked)}
                      disabled={processing}
                      className="w-4 h-4 accent-green-600 rounded"
                    />
                    <div>
                      <span className="text-sm text-gray-700 block">Remove Audio</span>
                      <span className="text-[10px] text-gray-400">Significantly reduces file size</span>
                    </div>
                  </label>

                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-xs font-medium text-gray-600 mb-2">Estimated Compression</h4>
                    <div className="space-y-1 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Quality:</span>
                        <span className="font-medium">
                          {quality === "high" && "~20% reduction"}
                          {quality === "medium" && "~40% reduction"}
                          {quality === "low" && "~60% reduction"}
                          {quality === "tiny" && "~75% reduction"}
                        </span>
                      </div>
                      {resolution !== "original" && (
                        <div className="flex justify-between">
                          <span>Resolution:</span>
                          <span className="font-medium">Additional ~{
                            resolution === "720p" ? "20" :
                            resolution === "480p" ? "40" :
                            resolution === "360p" ? "60" : "10"
                          }% reduction</span>
                        </div>
                      )}
                      {removeAudio && (
                        <div className="flex justify-between">
                          <span>No audio:</span>
                          <span className="font-medium">~10-20% reduction</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Action Buttons */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6">
              {!ffmpegReady && !processing && (
                <Button
                  onClick={loadFFmpeg}
                  disabled={ffmpegLoading}
                  variant="outline"
                  className="border-blue-500 text-blue-600"
                >
                  {ffmpegLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading Processor...
                    </>
                  ) : (
                    "Load Video Processor"
                  )}
                </Button>
              )}

              <Button
                onClick={compressAll}
                disabled={processing || files.length === 0}
                className="bg-green-700 hover:bg-green-800 text-white px-6"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Compressing {processingFile}...
                  </>
                ) : (
                  <>
                    <Minimize2 className="h-4 w-4 mr-2" />
                    Compress All Videos
                  </>
                )}
              </Button>

              <Button onClick={resetAll} variant="outline" className="text-gray-600">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset All
              </Button>
            </div>
          )}

          {/* Progress */}
          {processing && (
            <div className="mb-6">
              <Progress value={compressProgress} className="h-2" />
              <p className="text-sm text-gray-500 mt-1 text-center">
                {compressProgress}% — Compressing {processingFile}
              </p>
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Uploaded Videos</h2>
              <div className="space-y-3">
                {files.map((file, index) => {
                  const key = getFileKey(file);
                  const result = results[key];

                  return (
                    <Card
                      key={key}
                      className={cn(
                        "overflow-hidden transition-all",
                        result?.status === "done" && "border-green-200 bg-green-50/30",
                        result?.status === "error" && "border-red-200 bg-red-50/30",
                        result?.status === "processing" && "border-blue-200 bg-blue-50/30"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Preview */}
                          <div className="w-20 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {previewUrls[key] ? (
                              <video src={previewUrls[key]} className="w-full h-full object-cover" muted />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileVideo className="h-6 w-6 text-gray-300" />
                              </div>
                            )}
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{file.name}</p>
                            <p className="text-sm text-gray-500">
                              {formatSize(file.size)}
                              {result?.status === "done" && (
                                <>
                                  <span className="text-green-600 ml-2">
                                    → {formatSize(result.size)}
                                  </span>
                                  <span className="text-green-700 font-semibold ml-1">
                                    ({result.savedPercent}% smaller)
                                  </span>
                                </>
                              )}
                            </p>
                            {result?.status === "error" && (
                              <p className="text-xs text-red-500 mt-1">{result.error}</p>
                            )}
                          </div>

                          {/* Status & Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {result?.status === "processing" && (
                              <Badge className="bg-blue-100 text-blue-700">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                {compressProgress}%
                              </Badge>
                            )}
                            {result?.status === "done" && (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Done
                              </Badge>
                            )}
                            {result?.status === "error" && (
                              <Badge className="bg-red-100 text-red-700">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Error
                              </Badge>
                            )}

                            {result?.status === "done" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => downloadFile(key)}
                                title="Download"
                              >
                                <Download className="h-4 w-4 text-green-600" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFile(index)}
                              disabled={processing}
                              title="Remove"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {files.length === 0 && (
            <div className="text-center py-16">
              <Minimize2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-500">No videos uploaded</h3>
              <p className="text-gray-400 mt-1">Upload videos to compress and reduce their file size</p>
            </div>
          )}

          {/* Info */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Minimize2 className="h-8 w-8 mx-auto text-green-600 mb-3" />
                <h3 className="font-semibold mb-2">Smart Compression</h3>
                <p className="text-sm text-gray-500">Choose quality presets or fine-tune resolution settings</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Monitor className="h-8 w-8 mx-auto text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2">Resolution Control</h3>
                <p className="text-sm text-gray-500">Downscale to 1080p, 720p, 480p, or 360p</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Film className="h-8 w-8 mx-auto text-purple-600 mb-3" />
                <h3 className="font-semibold mb-2">100% Private</h3>
                <p className="text-sm text-gray-500">Videos never leave your browser — processed locally</p>
              </CardContent>
            </Card>
          </div>

          {/* Notice */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <strong>Note:</strong> Video compression runs in your browser using WebAssembly. Processing time depends on video size and your device performance. For best results, use Chrome or Edge with at least 4GB RAM.
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}

