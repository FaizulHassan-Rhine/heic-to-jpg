import { useState, useRef, useEffect } from "react";
import { useAuth } from "../lib/authContext";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import Dropzone from "../components/Dropzone";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
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
import toast from "react-hot-toast";

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
  const { user, trackUsage } = useAuth();
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

  const compressSingle = async (file, onProgress) => {
    const ffmpeg = await getFFmpeg((p) => {
      if (onProgress) onProgress.callback(p);
      else setCompressProgress(p);
    });
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

    const processedFiles = [];
    for (const file of files) {
      if (results[file.name]?.status === "done") continue;

      setProcessingFile(file.name);
      setResults(prev => ({ ...prev, [file.name]: { status: "processing", progress: 0 } }));

      try {
        const progressTracker = {
          current: 0,
          callback: (progress) => {
            setResults(prev => ({
              ...prev,
              [file.name]: { ...prev[file.name], progress: Math.round(progress) }
            }));
            setCompressProgress(progress);
          }
        };
        const res = await compressSingle(file, progressTracker);
        setResults(prev => ({ ...prev, [file.name]: res }));
        
        // Collect file information
        if (res.status === "done") {
          const inputExt = file.name.split('.').pop()?.toLowerCase() || '';
          processedFiles.push({
            inputName: file.name,
            inputSize: file.size,
            inputFormat: inputExt,
            outputName: file.name.replace(/\.[^.]+$/, "_compressed.mp4"),
            outputSize: res.size || 0,
            outputFormat: "mp4",
          });
        }
      } catch (e) {
        console.error(e);
        setResults(prev => ({ ...prev, [file.name]: { status: "error", error: "Failed" } }));
      }
    }

    // Track usage after all compressions complete
    const successCount = processedFiles.length;
    if (successCount > 0 && user && trackUsage) {
      trackUsage("/video-compress", successCount, successCount, {
        tool: "Video Compressor",
        filesProcessed: successCount,
      }, processedFiles);
    }

    setProcessing(false);
    setProcessingFile(null);
    setCompressProgress(0);
  };

  return (
    <ToolPageShell containerClassName="max-w-6xl">
        <ToolPageHeader
          title="Compress Video"
          description="Reduce video size securely in your browser."
        />

        <div className="grid gap-8">
          <CollapsibleDropzone
            files={files}
            setFiles={handleFilesAdded}
            title="Upload Video to Compress"
            description="MP4, MOV, MKV, WebM • Max 500MB"
            accept={{ 'video/*': [] }}
          />

          {files.length > 0 && (
            <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-start">

              {/* Settings Sidebar */}
              <Card className="lg:sticky lg:top-24 h-fit border-0 shadow-lg ring-1 ring-gray-100">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-2 font-bold text-xl text-foreground">
                    <Settings2 className="w-6 h-6 text-primary" /> Compression
                  </div>

                  {/* Quality */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Quality</label>
                    <div className="grid grid-cols-2 gap-2">
                      {QUALITY_PRESETS.map(p => (
                        <button
                          key={p.value}
                          onClick={() => setQuality(p.value)}
                          className={cn(
                            "p-2 text-sm rounded-lg transition-all font-medium border text-left",
                            quality === p.value
                              ? "bg-brand-sky/50 border-brand-mid/30 text-brand-navy ring-1 ring-brand-mid/40"
                              : "bg-card border-border text-muted-foreground hover:bg-muted/40"
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
                    <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Resolution</label>
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      className="w-full p-2.5 bg-card border border-border rounded-lg text-foreground focus:ring-2 focus:ring-brand-mid outline-none"
                    >
                      {RESOLUTION_PRESETS.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Options */}
                  <div className="p-3 bg-muted/40 rounded-xl border border-border">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={removeAudio}
                        onChange={(e) => setRemoveAudio(e.target.checked)}
                        className="w-4 h-4 accent-primary"
                      />
                      <div>
                        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <VolumeX className="w-3 h-3" /> Remove Audio
                        </span>
                        <span className="text-xs text-muted-foreground block">Reduces size further</span>
                      </div>
                    </label>
                  </div>

                  <Button
                    onClick={processAll}
                    disabled={processing || (ffmpegLoading && !ffmpegReady)}
                    className="w-full bg-gradient-to-r from-primary to-brand-navy hover:from-brand-navy hover:to-brand-navy text-white h-12 shadow-lg hover:shadow-xl transition-all font-semibold text-base"
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
                    <h3 className="font-bold text-2xl text-foreground">Files</h3>
                    <p className="text-muted-foreground text-sm mt-1">Videos to process</p>
                  </div>
                </div>

                {files.map((file, idx) => {
                  const res = results[file.name];

                  return (
                    <Card key={file.name + idx} className="overflow-hidden border border-border shadow-sm hover:shadow-md transition-all">
                      <div className="p-4 flex gap-5 items-center">
                        <div className="w-16 h-16 bg-brand-sky/50 rounded-xl flex items-center justify-center flex-shrink-0 border border-brand-mid/30">
                          <FileVideo className="w-8 h-8 text-brand-mid" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold truncate pr-4 text-foreground text-lg">{file.name}</h4>

                            <div className="flex gap-2">
                              {res?.status === "done" && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary bg-brand-sky/50 hover:bg-brand-sky" onClick={() => {
                                  const url = URL.createObjectURL(res.blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = file.name.split('.')[0] + "_c.mp4";
                                  a.click();
                                }}>
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50" onClick={() => removeFile(file.name)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <Badge variant="secondary" className="bg-muted text-muted-foreground border-border font-mono">
                              {formatSize(file.size)}
                            </Badge>
                            <ArrowRight className="w-3 h-3 text-muted-foreground/50" />

                            {res?.status === "done" ? (
                              <>
                                <Badge className="bg-brand-sky text-brand-navy border-brand-mid/30 hover:bg-brand-sky font-mono">
                                  {formatSize(res.size)}
                                </Badge>
                                <span className="text-primary font-bold text-xs">(-{res.savedPercent}%)</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground italic text-xs">
                                {res?.status === "processing" ? "Processing..." :
                                  res?.status === "pending" ? "Pending" :
                                    res?.status === "error" ? "Error" : "Ready"}
                              </span>
                            )}
                          </div>
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
              </div>
            </div>
          )}
        </div>
    </ToolPageShell>
  );
}
