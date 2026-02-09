import { useState, useRef, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  Loader2, CheckCircle, AlertCircle, Film, Trash2, Upload,
  Download, RotateCcw, Play, FileVideo
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast, { Toaster } from "react-hot-toast";
import { cn } from "@/lib/utils";
import Head from "next/head";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

const VIDEO_INPUT_TYPES = [
  "video/mp4", "video/webm", "video/x-matroska", "video/avi",
  "video/quicktime", "video/x-flv", "video/ogg", "video/3gpp",
  "video/x-msvideo", "video/x-ms-wmv",
];

const OUTPUT_FORMATS = [
  { value: "mp4", label: "MP4", desc: "Most compatible" },
  { value: "webm", label: "WebM", desc: "Web optimized" },
  { value: "avi", label: "AVI", desc: "Classic format" },
  { value: "mkv", label: "MKV", desc: "High quality" },
  { value: "ogv", label: "OGV", desc: "Open format" },
  { value: "gif", label: "GIF", desc: "Animated image" },
  { value: "mov", label: "MOV", desc: "Apple QuickTime" },
];

// Helper to load FFmpeg
let ffmpegInstance = null;
let ffmpegLoading = false;

const getFFmpeg = async (onProgress) => {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  if (ffmpegLoading) {
    // Wait for existing load
    while (ffmpegLoading) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return ffmpegInstance;
  }

  ffmpegLoading = true;

  try {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");

    const ffmpeg = new FFmpeg();

    ffmpeg.on("progress", ({ progress, time }) => {
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
    ffmpegLoading = false;
  }
};

export default function VideoConvert() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState(null);
  const [outputFormat, setOutputFormat] = useState("mp4");
  const [totalUploads, setTotalUploads] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
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

    // Create preview URLs
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
      await getFFmpeg((p) => setConversionProgress(p));
      setFfmpegReady(true);
      toast.success("Video processor ready!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setFfmpegLoading(false);
    }
  };

  const convertVideo = async (file) => {
    const ffmpeg = await getFFmpeg((p) => setConversionProgress(p));
    const { fetchFile } = await import("@ffmpeg/util");

    const inputExt = file.name.split(".").pop().toLowerCase();
    const inputName = `input.${inputExt}`;
    const outputName = `output.${outputFormat}`;

    // Write input file
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // Build FFmpeg command based on output format
    let args = ["-i", inputName];

    if (outputFormat === "gif") {
      args.push("-vf", "fps=10,scale=480:-1:flags=lanczos", "-loop", "0");
    } else if (outputFormat === "mp4") {
      args.push("-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart");
    } else if (outputFormat === "webm") {
      args.push("-c:v", "libvpx", "-c:a", "libvorbis", "-quality", "good");
    } else if (outputFormat === "mkv") {
      args.push("-c:v", "libx264", "-c:a", "aac");
    } else if (outputFormat === "avi") {
      args.push("-c:v", "mpeg4", "-c:a", "mp3");
    } else if (outputFormat === "ogv") {
      args.push("-c:v", "libtheora", "-c:a", "libvorbis");
    } else if (outputFormat === "mov") {
      args.push("-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart");
    }

    args.push(outputName);

    await ffmpeg.exec(args);

    // Read output
    const data = await ffmpeg.readFile(outputName);

    // Determine MIME type
    const mimeTypes = {
      mp4: "video/mp4",
      webm: "video/webm",
      avi: "video/x-msvideo",
      mkv: "video/x-matroska",
      ogv: "video/ogg",
      gif: "image/gif",
      mov: "video/quicktime",
    };

    const blob = new Blob([data.buffer], { type: mimeTypes[outputFormat] || "video/mp4" });

    // Cleanup
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    return blob;
  };

  const convertAll = async () => {
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
      setConversionProgress(0);
      setResults((prev) => ({ ...prev, [key]: { status: "processing" } }));

      try {
        const blob = await convertVideo(file);
        completed++;
        setTotalCompleted(completed);

        const newName = file.name.replace(/\.[^.]+$/, "") + "." + outputFormat;
        setResults((prev) => ({
          ...prev,
          [key]: {
            status: "done",
            blob,
            size: blob.size,
            name: newName,
          },
        }));
      } catch (error) {
        console.error("Convert error:", error);
        setResults((prev) => ({
          ...prev,
          [key]: { status: "error", error: error.message || "Conversion failed" },
        }));
      }
    }

    setProcessing(false);
    setProcessingFile(null);
    setConversionProgress(0);
    if (completed > 0) {
      toast.success(`${completed} video${completed > 1 ? "s" : ""} converted!`);
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
    setConversionProgress(0);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const completedCount = Object.values(results).filter((r) => r.status === "done").length;

  return (
    <>
      <Head>
        <title>Video Converter - ConvertMastery</title>
        <meta name="description" content="Convert videos between formats for free. Supports MP4, WebM, AVI, MKV, MOV, GIF and more. Runs in your browser." />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <Toaster position="top-center" />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Video Converter</h1>
            <p className="text-gray-500">Convert videos between formats — runs entirely in your browser</p>
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
                  Max {MAX_FILES} files • Max 500MB each • MP4, WebM, AVI, MOV, MKV, FLV, OGV, 3GP
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

          {/* Output Format Selection */}
          {files.length > 0 && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <label className="text-sm font-medium text-gray-700 mb-3 block">Output Format</label>
                <div className="flex flex-wrap gap-2">
                  {OUTPUT_FORMATS.map((fmt) => (
                    <button
                      key={fmt.value}
                      onClick={() => setOutputFormat(fmt.value)}
                      disabled={processing}
                      className={cn(
                        "px-4 py-2.5 rounded-lg border-2 transition-all text-left",
                        outputFormat === fmt.value
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <span className="text-sm font-semibold text-gray-800 block">{fmt.label}</span>
                      <span className="text-[10px] text-gray-400">{fmt.desc}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
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
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Load Video Processor
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={convertAll}
                disabled={processing || files.length === 0}
                className="bg-green-700 hover:bg-green-800 text-white px-6"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Converting {processingFile}...
                  </>
                ) : (
                  <>
                    <Film className="h-4 w-4 mr-2" />
                    Convert All to {outputFormat.toUpperCase()}
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
              <Progress value={conversionProgress} className="h-2" />
              <p className="text-sm text-gray-500 mt-1 text-center">
                {conversionProgress}% — Converting {processingFile}
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
                          {/* Video Preview */}
                          <div className="w-20 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {previewUrls[key] ? (
                              <video
                                src={previewUrls[key]}
                                className="w-full h-full object-cover"
                                muted
                              />
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
                                <span className="text-green-600 ml-2">
                                  → {formatSize(result.size)} ({result.name.split(".").pop().toUpperCase()})
                                </span>
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
                                {conversionProgress}%
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
              <Film className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-500">No videos uploaded</h3>
              <p className="text-gray-400 mt-1">Upload videos to convert them to another format</p>
            </div>
          )}

          {/* Info */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Film className="h-8 w-8 mx-auto text-green-600 mb-3" />
                <h3 className="font-semibold mb-2">7+ Formats</h3>
                <p className="text-sm text-gray-500">MP4, WebM, AVI, MKV, MOV, OGV, GIF</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Play className="h-8 w-8 mx-auto text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2">Browser-Based</h3>
                <p className="text-sm text-gray-500">No uploads to any server. 100% in your browser.</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Download className="h-8 w-8 mx-auto text-purple-600 mb-3" />
                <h3 className="font-semibold mb-2">Instant Download</h3>
                <p className="text-sm text-gray-500">Download converted videos immediately</p>
              </CardContent>
            </Card>
          </div>

          {/* Notice */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <strong>Note:</strong> Video processing runs in your browser using WebAssembly. Large videos may take a while and use significant memory. For best results, use Chrome or Edge with at least 4GB RAM.
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}

