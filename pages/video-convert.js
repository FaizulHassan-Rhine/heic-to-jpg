import { useState, useRef, useEffect } from "react";
import { useAuth } from "../lib/authContext";
import { generateFileThumbnails } from "../lib/thumbnailUtils";
import { blobToBase64, extractBase64 } from "../lib/fileUtils";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Dropzone from "../components/Dropzone";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
import {
  Loader2, CheckCircle, AlertCircle, Film, Trash2, Upload,
  Download, RotateCcw, FileVideo, FileAudio, FileImage,
  Settings2, ArrowRight, VolumeX, Music
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import Head from "next/head";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

const FORMATS = [
  { value: "MP4", label: "MP4", icon: FileVideo, desc: "Universal" },
  { value: "MOV", label: "MOV", icon: FileVideo, desc: "Apple QuickTime" },
  { value: "AVI", label: "AVI", icon: FileVideo, desc: "Legacy Windows" },
  { value: "MKV", label: "MKV", icon: FileVideo, desc: "Modern Container" },
  { value: "WEBM", label: "WebM", icon: FileVideo, desc: "Web Standard" },
  { value: "GIF", label: "GIF", icon: FileImage, desc: "Animated Image" },
  { value: "MP3", label: "MP3", icon: FileAudio, desc: "Audio Only" },
];

// Shared FFmpeg instance (Video Tools)
let ffmpegInstance = null;
let ffmpegLoadingState = false;

// Store current progress callback
let currentProgressCallback = null;

const getFFmpeg = async (onProgress) => {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    // Store the callback for this conversion
    if (onProgress) {
      currentProgressCallback = onProgress;
    }
    return ffmpegInstance;
  }
  if (ffmpegLoadingState) {
    while (ffmpegLoadingState) await new Promise((r) => setTimeout(r, 100));
    if (onProgress) {
      currentProgressCallback = onProgress;
    }
    return ffmpegInstance;
  }
  ffmpegLoadingState = true;
  try {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");
    const ffmpeg = new FFmpeg();
    
    // Set up progress handler
    ffmpeg.on("progress", ({ progress }) => {
      const progressPercent = Math.round(progress * 100);
      if (currentProgressCallback) {
        try {
          currentProgressCallback(progressPercent);
        } catch (e) {
          console.error("Progress callback error:", e);
        }
      }
    });
    
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ffmpeg;
    if (onProgress) {
      currentProgressCallback = onProgress;
    }
    return ffmpeg;
  } catch (error) {
    console.error("FFmpeg load error:", error);
    throw new Error("Failed to load video processor. Please refresh the page and try again.");
  } finally {
    ffmpegLoadingState = false;
  }
};

const formatSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getFileKey = (file) => file.name + file.size + file.lastModified;

export default function VideoConvert() {
  const { user, trackUsage } = useAuth();
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);

  // Settings
  const [targetFormat, setTargetFormat] = useState("MP4");
  const [muteAudio, setMuteAudio] = useState(false);

  const handleFilesAdded = (newFiles) => {
    if (files.length + newFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} videos allowed.`);
      return;
    }
    const valid = [];
    newFiles.forEach(f => {
      if (f.size > MAX_FILE_SIZE) toast.error(`"${f.name}" is too large (>500MB)`);
      else if (!f.type.startsWith("video/")) toast.error(`"${f.name}" is not a video`);
      else valid.push(f);
    });
    if (valid.length === 0) return;
    setFiles(prev => [...prev, ...valid]);
  };

  const removeFile = (name) => {
    setFiles(prev => prev.filter(f => f.name !== name));
    setResults(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const loadFFmpeg = async () => {
    setFfmpegLoading(true);
    try {
      await getFFmpeg((p) => setProgress(p));
      setFfmpegReady(true);
      toast.success("Engine ready!");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setFfmpegLoading(false);
    }
  };

  const convertSingle = async (file, onProgress) => {
    try {
      // Set up progress callback
      const progressHandler = onProgress ? onProgress.callback : null;
      const ffmpeg = await getFFmpeg(progressHandler);
      const { fetchFile } = await import("@ffmpeg/util");

      // Determine extensions
      const ext = targetFormat.toLowerCase();
      const inputExt = file.name.split('.').pop();
      const inputName = `input_${Date.now()}.${inputExt}`;
      const outputName = `output_${Date.now()}.${ext}`;

      // Write input file
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Build Arguments
      let args = ["-i", inputName];

      if (ext === "mp3") {
        // Audio extraction
        args.push("-vn", "-acodec", "libmp3lame", "-q:a", "2", "-b:a", "192k");
      } else if (ext === "gif") {
        // GIF conversion - simpler approach for browser FFmpeg
        args.push("-vf", "fps=10,scale=320:-1:flags=lanczos", "-c:v", "gif");
      } else {
        // Video conversion
        if (muteAudio) {
          args.push("-an");
        } else {
          // Audio codec selection
          if (ext === "webm") {
            args.push("-c:a", "libopus", "-b:a", "128k");
          } else {
            args.push("-c:a", "aac", "-b:a", "128k");
          }
        }

        // Video codec selection - use codecs available in browser FFmpeg
        if (ext === "mp4") {
          args.push("-c:v", "libx264", "-preset", "fast", "-crf", "23", "-movflags", "+faststart");
        } else if (ext === "webm") {
          // Use libvpx (VP8) instead of VP9 for better browser compatibility
          args.push("-c:v", "libvpx", "-crf", "30", "-b:v", "1M");
        } else if (ext === "mkv") {
          args.push("-c:v", "libx264", "-preset", "fast", "-crf", "23");
        } else if (ext === "avi") {
          args.push("-c:v", "libx264", "-preset", "fast", "-crf", "23");
        } else if (ext === "mov") {
          args.push("-c:v", "libx264", "-preset", "fast", "-crf", "23", "-movflags", "+faststart");
        }
      }

      args.push(outputName);

      // Execute conversion
      await ffmpeg.exec(args);

      // Read result
      const data = await ffmpeg.readFile(outputName);

      // Determine MIME type
      const mimeMap = {
        mp4: "video/mp4", webm: "video/webm", avi: "video/x-msvideo",
        mkv: "video/x-matroska", mov: "video/quicktime", gif: "image/gif", mp3: "audio/mpeg"
      };

      const blob = new Blob([data.buffer], { type: mimeMap[ext] || "application/octet-stream" });

      // Cleanup
      try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);
      } catch (e) { } // ignore cleanup errors

      // Clear progress callback
      currentProgressCallback = null;

      return {
        status: "done",
        blob,
        size: blob.size,
        ext: ext
      };
    } catch (error) {
      // Clear progress callback on error
      currentProgressCallback = null;
      console.error("Conversion error:", error);
      throw new Error(error.message || "Conversion failed. Please try a different format or check the file.");
    }
  };

  const processAll = async () => {
    if (!ffmpegReady) {
      await loadFFmpeg();
      if (!ffmpegInstance) return;
    }

    setProcessing(true);
    const newResults = { ...results };
    for (const f of files) {
      if (!newResults[f.name] || newResults[f.name].status === "error") {
        newResults[f.name] = { status: "pending" };
      }
    }
    setResults(newResults);

    let successCount = 0;
    const processedFiles = [];
    for (const file of files) {
      if (results[file.name]?.status === "done") continue;

      setProcessingFile(file.name);
      setResults(prev => ({ ...prev, [file.name]: { status: "processing", progress: 0 } }));
      setProgress(0);

      try {
        const progressTracker = {
          current: 0,
          callback: (progress) => {
            setResults(prev => ({
              ...prev,
              [file.name]: { ...prev[file.name], progress: Math.round(progress) }
            }));
            setProgress(progress);
          }
        };
        const res = await convertSingle(file, progressTracker);
        setResults(prev => ({ ...prev, [file.name]: { ...res, progress: 100 } }));
        
        if (res.status === "done" && user && trackUsage) {
          successCount++;
          // Collect file information
          const inputExt = file.name.split('.').pop()?.toLowerCase() || '';
          const outputExt = targetFormat.toLowerCase() || inputExt;
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
        
        // Reset progress after showing 100%
        setTimeout(() => {
          setResults(prev => ({ 
            ...prev, 
            [file.name]: res 
          }));
        }, 300);
      } catch (e) {
        console.error("Conversion error for", file.name, ":", e);
        const errorMessage = e.message || "Conversion failed. The file might be corrupted or the format is not supported.";
        setResults(prev => ({ 
          ...prev, 
          [file.name]: { 
            status: "error", 
            error: errorMessage.length > 50 ? errorMessage.substring(0, 50) + "..." : errorMessage
          } 
        }));
        toast.error(`${file.name}: ${errorMessage}`);
      }
    }

    // Track usage after all conversions complete
    if (successCount > 0 && user && trackUsage) {
      trackUsage("/video-convert", successCount, successCount, {
        tool: "Video Converter",
        filesProcessed: successCount,
      }, processedFiles);
    }

    setProcessing(false);
    setProcessingFile(null);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Head>
        <title>Video Converter - ConvertMastery</title>
      </Head>
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
            Convert Video
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Change video formats easily in your browser.
          </p>
        </div>

        <div className="grid gap-8">
          <CollapsibleDropzone
            files={files}
            setFiles={handleFilesAdded}
            title="Upload Videos to Convert"
            description="MP4, MOV, AVI, MKV, WebM • Max 500MB each"
            accept={{
              "video/mp4": [".mp4", ".MP4"],
              "video/quicktime": [".mov", ".MOV"],
              "video/x-msvideo": [".avi", ".AVI"],
              "video/x-matroska": [".mkv", ".MKV"],
              "video/webm": [".webm", ".WEBM"]
            }}
            borderColor="border-gray-300"
            hoverColor="hover:border-purple-500"
          />

          {files.length > 0 && (
            <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-start">

              {/* Settings Sidebar */}
              <Card className="lg:sticky lg:top-24 h-fit border-0 shadow-lg ring-1 ring-gray-100">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
                    <Settings2 className="w-6 h-6 text-purple-600" /> Convert Settings
                  </div>

                  {/* Format Grid */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Target Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      {FORMATS.map(f => {
                        const Icon = f.icon;
                        return (
                          <button
                            key={f.value}
                            onClick={() => setTargetFormat(f.value)}
                            className={cn(
                              "p-2 text-sm rounded-lg transition-all font-medium border text-left flex items-start gap-2",
                              targetFormat === f.value
                                ? "bg-purple-50 border-purple-200 text-purple-700 ring-1 ring-purple-200"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", targetFormat === f.value ? "text-purple-600" : "text-gray-400")} />
                            <div>
                              <div className="font-semibold">{f.label}</div>
                              <div className="text-[10px] opacity-70 font-normal">{f.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Options */}
                  {targetFormat !== "MP3" && targetFormat !== "GIF" && (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={muteAudio}
                          onChange={(e) => setMuteAudio(e.target.checked)}
                          className="w-4 h-4 accent-purple-600"
                        />
                        <div>
                          <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <VolumeX className="w-3 h-3" /> Mute Audio
                          </span>
                        </div>
                      </label>
                    </div>
                  )}

                  <Button
                    onClick={processAll}
                    disabled={processing || (ffmpegLoading && !ffmpegReady)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 shadow-md hover:shadow-lg transition-all font-semibold text-base"
                  >
                    {processing ? (
                      <> <Loader2 className="w-5 h-5 mr-2 animate-spin" /> stop </>
                    ) : ffmpegLoading ? (
                      <> <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading Core... </>
                    ) : (
                      <> <RotateCcw className="w-5 h-5 mr-2" /> Convert All </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* File List */}
              <div className="space-y-5">
                <div className="flex justify-between items-end border-b pb-4">
                  <div>
                    <h3 className="font-bold text-2xl text-gray-800">Files</h3>
                    <p className="text-gray-500 text-sm mt-1">Videos to convert</p>
                  </div>
                </div>

                {files.map((file, idx) => {
                  const res = results[file.name];
                  const isMp3 = res?.ext === "mp3" || targetFormat === "MP3";

                  return (
                    <Card key={file.name + idx} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all">
                      <div className="p-4 flex gap-5 items-center">
                        <div className="w-16 h-16 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-purple-100">
                          {isMp3 ? <FileAudio className="w-8 h-8 text-purple-400" /> : <Film className="w-8 h-8 text-purple-400" />}
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold truncate pr-4 text-gray-900 text-lg">{file.name}</h4>

                            <div className="flex gap-2">
                              {res?.status === "done" && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-purple-600 bg-purple-50 hover:bg-purple-100" onClick={() => {
                                  const url = URL.createObjectURL(res.blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = file.name.substring(0, file.name.lastIndexOf(".")) + "." + res.ext;
                                  a.click();
                                }}>
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeFile(file.name)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 font-mono">
                              {formatSize(file.size)}
                            </Badge>
                            <ArrowRight className="w-3 h-3 text-gray-300" />

                            {res?.status === "done" ? (
                              <>
                                <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 font-bold uppercase">
                                  {res.ext}
                                </Badge>
                                <span className="text-gray-500 text-xs font-mono">{formatSize(res.size)}</span>
                              </>
                            ) : (
                              <span className="text-purple-600 font-medium text-xs bg-purple-50 px-2 py-0.5 rounded">
                                To {targetFormat}
                              </span>
                            )}

                            {res?.status === "error" && (
                              <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
                                {res.error || "Error"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {res?.status === "processing" && (
                        <div className="px-4 pb-4 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-purple-600 font-medium">Processing...</span>
                            <span className="text-purple-600 font-bold">{res.progress || 0}%</span>
                          </div>
                          <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-600 transition-all duration-300 ease-out"
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
    </div>
  );
}
