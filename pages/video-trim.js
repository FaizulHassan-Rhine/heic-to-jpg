import { useState, useRef, useCallback, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  Loader2, CheckCircle, AlertCircle, Scissors, Upload,
  Download, RotateCcw, Play, Pause, FileVideo, Volume2, VolumeX
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import toast, { Toaster } from "react-hot-toast";
import { cn } from "@/lib/utils";
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
    ffmpeg.on("log", ({ message }) => console.log("[FFmpeg]", message));
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  } catch (error) {
    throw new Error("Failed to load video processor. Please refresh and try again.");
  } finally {
    ffmpegLoadingState = false;
  }
};

const formatTime = (seconds) => {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const formatTimeDetailed = (seconds) => {
  if (isNaN(seconds)) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const parseTimeInput = (str) => {
  const parts = str.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
};

export default function VideoTrim() {
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [startInput, setStartInput] = useState("00:00");
  const [endInput, setEndInput] = useState("00:00");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(null); // "start", "end", or null
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const timelineRef = useRef(null);

  const handleFileSelect = (files) => {
    const f = files[0];
    if (!f) return;

    if (!f.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error("File exceeds 500MB limit");
      return;
    }

    // Cleanup previous
    if (videoUrl) URL.revokeObjectURL(videoUrl);

    const url = URL.createObjectURL(f);
    setFile(f);
    setVideoUrl(url);
    setResult(null);
    setStartTime(0);
    setEndTime(0);
    setStartInput("00:00");
    setEndInput("00:00");
    setCurrentTime(0);
  };

  const onVideoLoaded = () => {
    const video = videoRef.current;
    if (!video) return;
    const dur = video.duration;
    setDuration(dur);
    setEndTime(dur);
    setEndInput(formatTimeDetailed(dur));
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    // Stop at end time
    if (video.currentTime >= endTime) {
      video.pause();
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      // Start from startTime if at beginning or past endTime
      if (video.currentTime < startTime || video.currentTime >= endTime) {
        video.currentTime = startTime;
      }
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(!isMuted);
  };

  const seekTo = (time) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  };

  // Handle start time input
  const handleStartInputChange = (val) => {
    setStartInput(val);
    const parsed = parseTimeInput(val);
    if (parsed !== null && parsed >= 0 && parsed < endTime) {
      setStartTime(parsed);
    }
  };

  const handleStartInputBlur = () => {
    setStartInput(formatTimeDetailed(startTime));
  };

  // Handle end time input
  const handleEndInputChange = (val) => {
    setEndInput(val);
    const parsed = parseTimeInput(val);
    if (parsed !== null && parsed > startTime && parsed <= duration) {
      setEndTime(parsed);
    }
  };

  const handleEndInputBlur = () => {
    setEndInput(formatTimeDetailed(endTime));
  };

  // Timeline drag handlers
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
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const time = (x / rect.width) * duration;

      if (isDragging === "start") {
        const newStart = Math.max(0, Math.min(time, endTime - 1));
        setStartTime(newStart);
        setStartInput(formatTimeDetailed(newStart));
        seekTo(newStart);
      } else if (isDragging === "end") {
        const newEnd = Math.max(startTime + 1, Math.min(time, duration));
        setEndTime(newEnd);
        setEndInput(formatTimeDetailed(newEnd));
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

  // Click on timeline to seek
  const handleTimelineClick = (e) => {
    if (isDragging) return;
    const timeline = timelineRef.current;
    if (!timeline) return;
    const rect = timeline.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    seekTo(time);
  };

  const loadFFmpeg = async () => {
    setFfmpegLoading(true);
    try {
      await getFFmpeg((p) => setProgress(p));
      setFfmpegReady(true);
      toast.success("Video processor ready!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setFfmpegLoading(false);
    }
  };

  const trimVideo = async () => {
    if (!file) return;

    if (startTime >= endTime) {
      toast.error("Start time must be before end time");
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
    setProgress(0);

    try {
      const ffmpeg = await getFFmpeg((p) => setProgress(p));
      const { fetchFile } = await import("@ffmpeg/util");

      const inputExt = file.name.split(".").pop().toLowerCase();
      const inputName = `input.${inputExt}`;
      const outputName = `output.${inputExt === "mkv" ? "mkv" : "mp4"}`;

      await ffmpeg.writeFile(inputName, await fetchFile(file));

      const durationSec = (endTime - startTime).toFixed(2);

      // Re-encode for precise frame-accurate trimming
      await ffmpeg.exec([
        "-i", inputName,
        "-ss", String(startTime.toFixed(2)),
        "-t", durationSec,
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "fast",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        "-avoid_negative_ts", "make_zero",
        outputName,
      ]);

      const data = await ffmpeg.readFile(outputName);
      const mimeType = inputExt === "webm" ? "video/webm" : "video/mp4";
      const blob = new Blob([data.buffer], { type: mimeType });

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

      const trimmedName = file.name.replace(/\.[^.]+$/, "") + `-trimmed.${inputExt === "mkv" ? "mkv" : "mp4"}`;

      setResult({
        blob,
        size: blob.size,
        name: trimmedName,
        url: URL.createObjectURL(blob),
      });

      toast.success("Video trimmed successfully!");
    } catch (error) {
      console.error("Trim error:", error);
      toast.error("Failed to trim video: " + (error.message || "Unknown error"));
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const downloadResult = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result.url;
    a.download = result.name;
    a.click();
  };

  const resetAll = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setVideoUrl(null);
    setDuration(0);
    setCurrentTime(0);
    setStartTime(0);
    setEndTime(0);
    setStartInput("00:00");
    setEndInput("00:00");
    setResult(null);
    setIsPlaying(false);
    setProcessing(false);
    setProgress(0);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const clipDuration = endTime - startTime;
  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100;
  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <Head>
        <title>Video Trimmer - ConvertMastery</title>
        <meta name="description" content="Trim and cut videos for free. Set start and end points visually. Runs entirely in your browser." />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <Toaster position="top-center" />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Video Trimmer</h1>
            <p className="text-gray-500">Cut and trim your videos — fast, free, and private</p>
          </div>

          {/* Upload */}
          {!file && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 border-gray-300 hover:border-green-400 hover:bg-green-50/50 mb-6"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-xl font-medium text-gray-600">Upload a video to trim</p>
              <p className="text-sm text-gray-400 mt-2">MP4, WebM, AVI, MOV, MKV • Max 500MB</p>
            </div>
          )}

          {/* Video Player & Controls */}
          {file && (
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex items-center justify-between bg-white rounded-lg p-3 border">
                <div className="flex items-center gap-3">
                  <FileVideo className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[300px]">{file.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatSize(file.size)} • {formatTimeDetailed(duration)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={resetAll} variant="ghost" size="sm">
                    <RotateCcw className="h-4 w-4 mr-1" />
                    New Video
                  </Button>
                </div>
              </div>

              {/* Video Preview */}
              <Card className="overflow-hidden">
                <div className="bg-black relative">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full max-h-[450px] mx-auto"
                    onLoadedMetadata={onVideoLoaded}
                    onTimeUpdate={onTimeUpdate}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  />
                </div>

                <CardContent className="p-4">
                  {/* Playback Controls */}
                  <div className="flex items-center gap-3 mb-4">
                    <Button
                      onClick={togglePlay}
                      size="icon"
                      className="bg-green-600 hover:bg-green-700 text-white h-10 w-10 rounded-full"
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                    </Button>
                    <Button onClick={toggleMute} variant="ghost" size="icon" className="h-10 w-10">
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                    <span className="text-sm text-gray-600 font-mono">
                      {formatTimeDetailed(currentTime)} / {formatTimeDetailed(duration)}
                    </span>
                  </div>

                  {/* Timeline */}
                  <div className="mb-4">
                    <div
                      ref={timelineRef}
                      className="relative h-12 bg-gray-200 rounded-lg overflow-hidden cursor-pointer select-none"
                      onClick={handleTimelineClick}
                    >
                      {/* Selected range */}
                      <div
                        className="absolute top-0 bottom-0 bg-green-200/60"
                        style={{
                          left: `${startPercent}%`,
                          width: `${endPercent - startPercent}%`,
                        }}
                      />

                      {/* Unselected areas - dimmed */}
                      <div
                        className="absolute top-0 bottom-0 bg-gray-400/40"
                        style={{ left: 0, width: `${startPercent}%` }}
                      />
                      <div
                        className="absolute top-0 bottom-0 bg-gray-400/40"
                        style={{ left: `${endPercent}%`, width: `${100 - endPercent}%` }}
                      />

                      {/* Start handle */}
                      <div
                        className="absolute top-0 bottom-0 w-3 bg-green-600 cursor-ew-resize z-20 flex items-center justify-center hover:bg-green-700 transition-colors rounded-l"
                        style={{ left: `calc(${startPercent}% - 6px)` }}
                        onMouseDown={(e) => handleTimelineMouseDown(e, "start")}
                      >
                        <div className="w-0.5 h-6 bg-white rounded-full" />
                      </div>

                      {/* End handle */}
                      <div
                        className="absolute top-0 bottom-0 w-3 bg-green-600 cursor-ew-resize z-20 flex items-center justify-center hover:bg-green-700 transition-colors rounded-r"
                        style={{ left: `calc(${endPercent}% - 6px)` }}
                        onMouseDown={(e) => handleTimelineMouseDown(e, "end")}
                      >
                        <div className="w-0.5 h-6 bg-white rounded-full" />
                      </div>

                      {/* Current time indicator */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30"
                        style={{ left: `${currentPercent}%` }}
                      >
                        <div className="w-3 h-3 bg-red-500 rounded-full -ml-[5px] -mt-1" />
                      </div>
                    </div>
                  </div>

                  {/* Time Inputs */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Start Time</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={startInput}
                          onChange={(e) => handleStartInputChange(e.target.value)}
                          onBlur={handleStartInputBlur}
                          className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="00:00"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setStartTime(currentTime);
                            setStartInput(formatTimeDetailed(currentTime));
                          }}
                          title="Set to current time"
                          className="text-xs flex-shrink-0"
                        >
                          Set
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">End Time</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={endInput}
                          onChange={(e) => handleEndInputChange(e.target.value)}
                          onBlur={handleEndInputBlur}
                          className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="00:00"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEndTime(currentTime);
                            setEndInput(formatTimeDetailed(currentTime));
                          }}
                          title="Set to current time"
                          className="text-xs flex-shrink-0"
                        >
                          Set
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Clip Duration</label>
                      <div className="px-3 py-2 border rounded-lg text-sm font-mono bg-gray-50 text-gray-700">
                        {formatTimeDetailed(clipDuration)}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { seekTo(startTime); }}
                      className="text-xs"
                    >
                      Go to Start
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { seekTo(endTime); }}
                      className="text-xs"
                    >
                      Go to End
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Preview the selected clip
                        seekTo(startTime);
                        videoRef.current?.play();
                        setIsPlaying(true);
                      }}
                      className="text-xs"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Preview Clip
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Trim Button */}
              <div className="flex flex-wrap gap-3">
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
                  onClick={trimVideo}
                  disabled={processing || clipDuration <= 0}
                  className="bg-green-700 hover:bg-green-800 text-white px-8"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Trimming...
                    </>
                  ) : (
                    <>
                      <Scissors className="h-4 w-4 mr-2" />
                      Trim Video
                    </>
                  )}
                </Button>
              </div>

              {/* Progress */}
              {processing && (
                <div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-gray-500 mt-1 text-center">{progress}% complete</p>
                </div>
              )}

              {/* Result */}
              {result && (
                <Card className="border-green-200 bg-green-50/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-green-800">Video trimmed!</p>
                        <p className="text-sm text-gray-600">
                          {result.name} • {formatSize(result.size)}
                          <span className="text-green-600 ml-2">
                            (was {formatSize(file.size)})
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={downloadResult}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>

                    {/* Preview trimmed result */}
                    {result.url && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-2">Preview trimmed video:</p>
                        <video
                          src={result.url}
                          controls
                          className="w-full max-h-[300px] rounded-lg bg-black"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Empty State */}
          {!file && (
            <div className="text-center py-8">
              <Scissors className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-500">Upload a video to get started</h3>
              <p className="text-gray-400 mt-1">Set start and end points, then trim instantly</p>
            </div>
          )}

          {/* Info */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Scissors className="h-8 w-8 mx-auto text-green-600 mb-3" />
                <h3 className="font-semibold mb-2">Visual Timeline</h3>
                <p className="text-sm text-gray-500">Drag handles or type exact times to set your clip range</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Play className="h-8 w-8 mx-auto text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2">Preview First</h3>
                <p className="text-sm text-gray-500">Preview your clip before trimming to get it just right</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Download className="h-8 w-8 mx-auto text-purple-600 mb-3" />
                <h3 className="font-semibold mb-2">Instant Export</h3>
                <p className="text-sm text-gray-500">Uses stream copy — no re-encoding for lightning-fast trims</p>
              </CardContent>
            </Card>
          </div>

          {/* Notice */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <strong>Note:</strong> Video trimming runs in your browser using WebAssembly. Uses stream copy (-c copy) for fast trimming without quality loss. For best results, use Chrome or Edge.
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}

