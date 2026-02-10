import { useState, useRef, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Dropzone from "../components/Dropzone";
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
import toast, { Toaster } from "react-hot-toast";
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

const getFFmpeg = async (onProgress) => {
  if (ffmpegInstance && ffmpegInstance.loaded) return ffmpegInstance;
  if (ffmpegLoadingState) {
    while (ffmpegLoadingState) await new Promise((r) => setTimeout(r, 100));
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
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to load video processor.");
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

  const convertSingle = async (file) => {
    const ffmpeg = await getFFmpeg((p) => setProgress(p));
    const { fetchFile } = await import("@ffmpeg/util");

    // Determine extensions
    const ext = targetFormat.toLowerCase();
    const inputExt = file.name.split('.').pop();
    const inputName = `input_${Date.now()}.${inputExt}`;
    const outputName = `output_${Date.now()}.${ext}`;

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // Build Arguments
    let args = ["-i", inputName];

    if (ext === "mp3") {
      // Audio extraction
      args.push("-vn", "-acodec", "libmp3lame", "-q:a", "2");
    } else if (ext === "gif") {
      // GIF conversion
      args.push("-vf", "fps=10,scale=320:-1:flags=lanczos", "-c:v", "gif");
    } else {
      // Video conversion
      if (muteAudio) args.push("-an");
      else args.push("-c:a", "aac"); // Standard AAC for most containers

      // Target Codecs defaults
      if (ext === "mp4") args.push("-c:v", "libx264", "-preset", "fast", "-movflags", "+faststart");
      else if (ext === "webm") args.push("-c:v", "libvpx-vp9", "-c:a", "libvorbis");
      else if (ext === "mkv") args.push("-c:v", "libx264"); // MKV supports almost anything
      else if (ext === "avi") args.push("-c:v", "libx264"); // AVI with H264
      else if (ext === "mov") args.push("-c:v", "libx264");
    }

    args.push(outputName);

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

    return {
      status: "done",
      blob,
      size: blob.size,
      ext: ext
    };
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

    for (const file of files) {
      if (results[file.name]?.status === "done") continue;

      setProcessingFile(file.name);
      setResults(prev => ({ ...prev, [file.name]: { status: "processing" } }));
      setProgress(0);

      try {
        const res = await convertSingle(file);
        setResults(prev => ({ ...prev, [file.name]: res }));
      } catch (e) {
        console.error(e);
        setResults(prev => ({ ...prev, [file.name]: { status: "error", error: "Failed" } }));
      }
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
          <Card className="border-2 border-dashed border-gray-300 hover:border-purple-500 bg-white shadow-sm transition-all">
            <CardContent className="p-0">
              <Dropzone setFiles={handleFilesAdded} className="p-10" />
            </CardContent>
          </Card>

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
                              <Badge variant="destructive">Error</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {res?.status === "processing" && (
                        <div className="relative h-1 bg-gray-100 w-full mt-0">
                          <div
                            className="absolute top-0 left-0 h-full bg-purple-600 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
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
