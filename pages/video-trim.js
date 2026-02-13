import { useState, useRef, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Dropzone from "../components/Dropzone";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
import {
  Loader2, CheckCircle, AlertCircle, Scissors, Upload,
  Download, RotateCcw, Play, Pause, FileVideo, Volume2, VolumeX,
  Settings2, Clock, ArrowRight
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { cn } from "@/lib/utils";
import toast, { Toaster } from "react-hot-toast";
import Head from "next/head";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

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
    throw new Error("Failed to load video processor.");
  } finally {
    ffmpegLoadingState = false;
  }
};

const formatTimeDetailed = (seconds) => {
  if (isNaN(seconds)) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  // Always show minutes and seconds
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const formatSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default function VideoTrim() {
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Trim State
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Processing State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(null); // "start", "end", or null

  const videoRef = useRef(null);
  const timelineRef = useRef(null);

  const handleFilesAdded = (files) => {
    const f = files[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) { toast.error("Not a video file"); return; }
    if (f.size > MAX_FILE_SIZE) { toast.error("File exceeds 500MB"); return; }

    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setResult(null);
    setStartTime(0);
    setEndTime(0);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const onVideoLoaded = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setEndTime(video.duration);
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.currentTime >= endTime && isPlaying) {
      video.pause();
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.pause();
    else {
      if (video.currentTime < startTime || video.currentTime >= endTime) {
        video.currentTime = startTime;
      }
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seekTo = (time) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  // Timeline Drag Logic
  const handleTimelineMouseDown = (e, type) => {
    e.preventDefault();
    setIsDragging(type);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      const timeline = timelineRef.current;
      if (!timeline) return;
      const rect = timeline.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(clickX / rect.width, 1));
      const time = percent * duration;

      if (isDragging === "start") {
        const newStart = Math.min(time, endTime - 0.5); // Min 0.5s duration
        setStartTime(newStart);
        seekTo(newStart);
      } else {
        const newEnd = Math.max(time, startTime + 0.5);
        setEndTime(newEnd);
      }
    };
    const handleMouseUp = () => setIsDragging(null);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, duration, startTime, endTime]);

  const loadFFmpeg = async () => {
    setFfmpegLoading(true);
    try {
      await getFFmpeg((p) => setProgress(p));
      setFfmpegReady(true);
      toast.success("Ready to process!");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setFfmpegLoading(false);
    }
  };

  const trimVideo = async () => {
    if (!file) return;
    if (!ffmpegReady) {
      await loadFFmpeg();
      if (!ffmpegInstance) return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      const ffmpeg = await getFFmpeg((p) => setProgress(p));
      const { fetchFile } = await import("@ffmpeg/util");
      const ext = file.name.split('.').pop();
      const inputName = `input.${ext}`;
      const outputName = `output.mp4`; // Always MP4 for consistency

      await ffmpeg.writeFile(inputName, await fetchFile(file));

      await ffmpeg.exec([
        "-i", inputName,
        "-ss", startTime.toFixed(3),
        "-to", endTime.toFixed(3),
        "-c:v", "libx264", "-preset", "fast", "-crf", "22", // Re-encode for accuracy
        "-c:a", "aac",
        outputName
      ]);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data.buffer], { type: "video/mp4" });

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

      setResult({
        blob,
        size: blob.size,
        name: file.name.replace(/\.[^.]+$/, "") + "_trimmed.mp4",
        url: URL.createObjectURL(blob)
      });
      toast.success("Trim Complete!");

    } catch (error) {
      console.error(error);
      toast.error("Trim failed.");
    } finally {
      setProcessing(false);
    }
  };

  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100;
  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Head>
        <title>Video Trim - ConvertMastery</title>
      </Head>
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
            Trim Video
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Cut video clips with frame-level precision.
          </p>
        </div>

        {!file ? (
          <CollapsibleDropzone
            files={file ? [file] : []}
            setFiles={handleFilesAdded}
            title="Upload Video to Trim"
            description="MP4, MOV, AVI, MKV, WebM • Max 500MB"
            accept={{
              "video/mp4": [".mp4", ".MP4"],
              "video/quicktime": [".mov", ".MOV"],
              "video/x-msvideo": [".avi", ".AVI"],
              "video/x-matroska": [".mkv", ".MKV"],
              "video/webm": [".webm", ".WEBM"]
            }}
            borderColor="border-gray-300"
            hoverColor="hover:border-rose-500"
            className="max-w-3xl mx-auto"
          />
        ) : (
          <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
            {/* Main Player Area */}
            <div className="space-y-6">
              <Card className="overflow-hidden border-rose-100 shadow-md">
                <div className="bg-black aspect-video relative flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="max-w-full max-h-[500px]"
                    onLoadedMetadata={onVideoLoaded}
                    onTimeUpdate={onTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                    muted={isMuted}
                    onClick={togglePlay}
                  />
                  {/* Overlay Play Button if Paused */}
                  {!isPlaying && (
                    <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-all group">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-all">
                        <Play className="w-8 h-8 text-white fill-current ml-1" />
                      </div>
                    </button>
                  )}
                </div>

                {/* Timeline Controls */}
                <div className="p-6 bg-white border-t space-y-6">
                  {/* Time Display */}
                  <div className="flex justify-between items-center text-sm font-mono font-medium text-gray-600">
                    <span>{formatTimeDetailed(currentTime)}</span>
                    <span>{formatTimeDetailed(duration)}</span>
                  </div>

                  {/* Timeline Bar */}
                  <div
                    ref={timelineRef}
                    className="relative h-12 bg-gray-100 rounded-lg cursor-pointer select-none ring-1 ring-gray-200"
                    onClick={(e) => {
                      if (isDragging) return;
                      const rect = timelineRef.current.getBoundingClientRect();
                      const p = (e.clientX - rect.left) / rect.width;
                      seekTo(p * duration);
                    }}
                  >
                    {/* Active Range */}
                    <div
                      className="absolute top-0 bottom-0 bg-rose-100/50 border-x border-rose-400"
                      style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 pointer-events-none text-rose-800 text-xs font-bold">
                        DRAG HANDLES
                      </div>
                    </div>

                    {/* Drag Handles */}
                    <div
                      className="absolute top-0 bottom-0 w-4 -ml-2 bg-rose-600 hover:bg-rose-700 cursor-ew-resize rounded z-10 flex items-center justify-center shadow-sm"
                      style={{ left: `${startPercent}%` }}
                      onMouseDown={(e) => handleTimelineMouseDown(e, "start")}
                    >
                      <div className="w-0.5 h-6 bg-white/50 rounded-full" />
                    </div>
                    <div
                      className="absolute top-0 bottom-0 w-4 -ml-2 bg-rose-600 hover:bg-rose-700 cursor-ew-resize rounded z-10 flex items-center justify-center shadow-sm"
                      style={{ left: `${endPercent}%` }}
                      onMouseDown={(e) => handleTimelineMouseDown(e, "end")}
                    >
                      <div className="w-0.5 h-6 bg-white/50 rounded-full" />
                    </div>

                    {/* Playhead */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-gray-800 z-0 pointer-events-none"
                      style={{ left: `${currentPercent}%` }}
                    />
                  </div>

                  <div className="flex gap-2 justify-center">
                    <Button size="icon" variant="outline" onClick={togglePlay}>
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => setIsMuted(!isMuted)}>
                      {isMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Result Card */}
              {result && (
                <Card className="border border-green-200 bg-green-50 shadow-sm">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-green-900">Video Trimmed Successfully!</h4>
                      <p className="text-sm text-green-700 mt-1">{result.name} ({formatSize(result.size)})</p>
                    </div>
                    <Button onClick={() => {
                      const a = document.createElement("a");
                      a.href = result.url;
                      a.download = result.name;
                      a.click();
                    }} className="bg-green-600 text-white hover:bg-green-700 shadow-sm">
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar Controls */}
            <div className="space-y-4">
              <Card className="border-0 shadow-lg ring-1 ring-gray-100 h-fit lg:sticky lg:top-24">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-2 font-bold text-xl text-gray-900 border-b pb-4">
                    <Settings2 className="w-5 h-5 text-rose-600" /> Options
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Start Time</label>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-rose-500" />
                        <span className="font-mono text-lg font-medium text-gray-900">
                          {formatTimeDetailed(startTime)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">End Time</label>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-rose-500" />
                        <span className="font-mono text-lg font-medium text-gray-900">
                          {formatTimeDetailed(endTime)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm px-1">
                      <span className="text-gray-500">Duration:</span>
                      <span className="font-bold text-gray-900">{formatTimeDetailed(endTime - startTime)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={trimVideo}
                    disabled={processing || (ffmpegLoading && !ffmpegReady)}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white h-12 shadow-md hover:shadow-lg transition-all font-semibold"
                  >
                    {processing ? (
                      <> <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Trimming... </>
                    ) : ffmpegLoading ? (
                      <> <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading Core... </>
                    ) : (
                      <> <Scissors className="w-5 h-5 mr-2" /> Trim Video </>
                    )}
                  </Button>

                  <Button onClick={() => setFile(null)} variant="ghost" className="w-full text-gray-500 hover:text-red-500">
                    <RotateCcw className="w-4 h-4 mr-2" /> Pick New Video
                  </Button>
                </CardContent>
              </Card>

              {processing && (
                <Card className="border-rose-100 bg-rose-50 animate-in fade-in slide-in-from-bottom-2">
                  <CardContent className="p-4">
                    <div className="flex justify-between text-xs font-semibold text-rose-700 mb-2">
                      <span>Processing...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-rose-200" indicatorClassName="bg-rose-600" />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
