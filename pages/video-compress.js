import { useState, useRef, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Dropzone from "../components/Dropzone";
import {
  Loader2, CheckCircle, AlertCircle, Film, Trash2, Upload,
  Download, RotateCcw, Minimize2, FileVideo, Gauge, Monitor,
  Settings2, ArrowRight, VolumeX
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

const QUALITY_PRESETS = [
  { value: "high", label: "High Quality", crf: 23, desc: "Best quality" },
  { value: "medium", label: "Balanced", crf: 28, desc: "Good tradeoff" },
  { value: "low", label: "Small Size", crf: 35, desc: "High compression" },
  { value: "tiny", label: "Tiny", crf: 42, desc: "Smallest file" },
];

const RESOLUTION_PRESETS = [
  { value: "original", label: "Original" },
  { value: "1080p", label: "1080p" },
  { value: "720p", label: "720p" },
  { value: "480p", label: "480p" },
];

// Shared FFmpeg instance
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

export default function VideoCompress() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState(null);
  const [compressProgress, setCompressProgress] = useState(0);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);

  // Settings
  const [quality, setQuality] = useState("medium");
  const [resolution, setResolution] = useState("original");
  const [removeAudio, setRemoveAudio] = useState(false);

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
      await getFFmpeg((p) => setCompressProgress(p));
      setFfmpegReady(true);
      toast.success("Engine ready!");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setFfmpegLoading(false);
    }
  };

  const compressSingle = async (file) => {
    const ffmpeg = await getFFmpeg((p) => setCompressProgress(p));
    const { fetchFile } = await import("@ffmpeg/util");
    const inputName = `input_${Date.now()}.${file.name.split('.').pop()}`;
    const outputName = `output_${Date.now()}.mp4`;

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    const preset = QUALITY_PRESETS.find((p) => p.value === quality);
    const crf = preset?.crf || 28;

    let args = ["-i", inputName, "-c:v", "libx264", "-crf", String(crf), "-preset", "fast"];

    if (resolution !== "original") {
      const scaleMap = { "1080p": "1920:-2", "720p": "1280:-2", "480p": "854:-2", "360p": "640:-2" };
      args.push("-vf", `scale=${scaleMap[resolution]}`);
    }

    if (removeAudio) args.push("-an");
    else args.push("-c:a", "aac", "-b:a", "128k");

    args.push("-movflags", "+faststart", outputName);

    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data.buffer], { type: "video/mp4" });

    // Cleanup
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    return {
      status: "done",
      blob,
      size: blob.size,
      savedPercent: Math.round((1 - blob.size / file.size) * 100)
    };
  };

  const processAll = async () => {
    if (!ffmpegReady) {
      await loadFFmpeg();
      // If failed, return
      if (!ffmpegInstance) return;
    }

    setProcessing(true);
    // Mark pending
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

      try {
        const res = await compressSingle(file);
        setResults(prev => ({ ...prev, [file.name]: res }));
      } catch (e) {
        console.error(e);
        setResults(prev => ({ ...prev, [file.name]: { status: "error", error: "Failed" } }));
      }
    }
    setProcessing(false);
    setProcessingFile(null);
    setCompressProgress(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Head>
        <title>Video Compress - ConvertMastery</title>
      </Head>
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
            Compress Video
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Reduce video size securely in your browser.
          </p>
        </div>

        <div className="grid gap-8">
          <Card className="border-2 border-dashed border-gray-300 hover:border-blue-500 bg-white shadow-sm transition-all">
            <CardContent className="p-0">
              <Dropzone setFiles={handleFilesAdded} className="p-10" accept={{ 'video/*': [] }} title="Upload Video to Compress" description="MP4, MOV, MKV, WebM • Max 500MB" />
            </CardContent>
          </Card>

          {files.length > 0 && (
            <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-start">

              {/* Settings Sidebar */}
              <Card className="lg:sticky lg:top-24 h-fit border-0 shadow-lg ring-1 ring-gray-100">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
                    <Settings2 className="w-6 h-6 text-blue-600" /> Compression
                  </div>

                  {/* Quality */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Quality</label>
                    <div className="grid grid-cols-2 gap-2">
                      {QUALITY_PRESETS.map(p => (
                        <button
                          key={p.value}
                          onClick={() => setQuality(p.value)}
                          className={cn(
                            "p-2 text-sm rounded-lg transition-all font-medium border text-left",
                            quality === p.value
                              ? "bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-200"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          <div className="font-semibold">{p.label}</div>
                          <div className="text-xs opacity-70 font-normal">{p.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resolution */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Resolution</label>
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {RESOLUTION_PRESETS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Options */}
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={removeAudio}
                        onChange={(e) => setRemoveAudio(e.target.checked)}
                        className="w-4 h-4 accent-blue-600"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          <VolumeX className="w-3 h-3" /> Remove Audio
                        </span>
                        <span className="text-xs text-gray-500 block">Reduces size further</span>
                      </div>
                    </label>
                  </div>

                  <Button
                    onClick={processAll}
                    disabled={processing || (ffmpegLoading && !ffmpegReady)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 shadow-md hover:shadow-lg transition-all font-semibold text-base"
                  >
                    {processing ? (
                      <> <Loader2 className="w-5 h-5 mr-2 animate-spin" /> stop </> // Actually usually we can't stop easily
                    ) : ffmpegLoading ? (
                      <> <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading Core... </>
                    ) : (
                      <> <Minimize2 className="w-5 h-5 mr-2" /> Compress Videos </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* File List */}
              <div className="space-y-5">
                <div className="flex justify-between items-end border-b pb-4">
                  <div>
                    <h3 className="font-bold text-2xl text-gray-800">Files</h3>
                    <p className="text-gray-500 text-sm mt-1">Videos to process</p>
                  </div>
                </div>

                {files.map((file, idx) => {
                  const res = results[file.name];

                  return (
                    <Card key={file.name + idx} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all">
                      <div className="p-4 flex gap-5 items-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-100">
                          <FileVideo className="w-8 h-8 text-blue-400" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold truncate pr-4 text-gray-900 text-lg">{file.name}</h4>

                            <div className="flex gap-2">
                              {res?.status === "done" && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 bg-blue-50 hover:bg-blue-100" onClick={() => {
                                  const url = URL.createObjectURL(res.blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = file.name.split('.')[0] + "_c.mp4";
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
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 font-mono">
                                  {formatSize(res.size)}
                                </Badge>
                                <span className="text-green-600 font-bold text-xs">(-{res.savedPercent}%)</span>
                              </>
                            ) : (
                              <span className="text-gray-400 italic text-xs">
                                {res?.status === "processing" ? "Processing..." :
                                  res?.status === "pending" ? "Pending" :
                                    res?.status === "error" ? "Error" : "Ready"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {res?.status === "processing" && (
                        <div className="relative h-1 bg-gray-100 w-full mt-0">
                          <div
                            className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${compressProgress}%` }}
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
