import { useState } from "react";
import Dropzone from "../components/Dropzone";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import JSZip from "jszip";
import { Loader2, CheckCircle, Download, AlertCircle, FileImage, Zap, RefreshCw, Trash2, Upload, RotateCcw } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast, { Toaster } from "react-hot-toast";

// Calculate estimated new file size based on compression settings
const calculateEstimatedSize = (originalSize, dimensions, compressionType, compressionValue, pixelWidth, pixelHeight) => {
  if (!dimensions) return null;
  
  let areaRatio = 1;
  
  if (compressionType === "percentage") {
    const dimensionRatio = compressionValue / 100;
    areaRatio = dimensionRatio * dimensionRatio;
  } else if (compressionType === "ratio") {
    const ratio = compressionValue / 100;
    areaRatio = ratio * ratio;
  } else if (compressionType === "pixel") {
    const originalArea = dimensions.width * dimensions.height;
    const newArea = pixelWidth * pixelHeight;
    if (originalArea > 0) {
      areaRatio = newArea / originalArea;
    }
  }
  
  const compressionEfficiency = areaRatio < 0.5 ? 0.85 : 0.9;
  const estimatedSize = originalSize * areaRatio * compressionEfficiency;
  
  return Math.max(estimatedSize, originalSize * 0.05);
};

export default function Compress() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [totalUploads, setTotalUploads] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [previewUrls, setPreviewUrls] = useState({});
  const [imageDimensions, setImageDimensions] = useState({});
  
  // Compression settings
  const [compressionType, setCompressionType] = useState("percentage");
  const [compressionValue, setCompressionValue] = useState(80);
  const [pixelWidth, setPixelWidth] = useState(1920);
  const [pixelHeight, setPixelHeight] = useState(1080);

  // Reset previous results when uploading new batch
  const resetResults = () => {
    setFiles([]);
    setResults({});
    setProcessing(false);
  };

  // Track uploads when files are added
  const handleFilesAdded = (newFiles) => {
    const MAX_FILES = 20;
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB (local limit)
    
    // Check if adding these files would exceed the limit
    if (newFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} images allowed at a time. Please select ${MAX_FILES} or fewer images.`);
      return;
    }
    
    // Check individual file sizes
    const oversizedFiles = [];
    const validFiles = [];
    
    newFiles.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        oversizedFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });
    
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.join(", ");
      toast.error(`File size limit is 20MB (4.5MB on Vercel). The following files are too large: ${fileNames}`);
      if (validFiles.length === 0) {
        return; // Don't proceed if all files are too large
      }
    }
    
    setFiles(validFiles);
    setTotalUploads((prev) => prev + validFiles.length);
    
    const newPreviewUrls = {};
    
    validFiles.forEach((file) => {
      const hasImageMimeType = file.type && file.type.startsWith('image/');
      const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|heic|bmp|svg)$/i.test(file.name);
      const isImage = hasImageMimeType || hasImageExtension;
      const isHeic = /\.(heic|HEIC)$/i.test(file.name);
      
      // Skip creating preview URL for HEIC files as browsers can't display them
      if (isImage && !isHeic) {
        try {
          const url = URL.createObjectURL(file);
          if (url) {
            newPreviewUrls[file.name] = url;
            
            const img = new Image();
            img.onload = () => {
              setImageDimensions((prev) => ({
                ...prev,
                [file.name]: {
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                },
              }));
            };
            img.onerror = () => {
              console.warn(`Failed to load preview for ${file.name}`);
            };
            img.src = url;
          }
        } catch (error) {
          console.error(`Failed to create preview URL for ${file.name}:`, error);
        }
      }
    });
    
    setPreviewUrls((prev) => {
      Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
      return newPreviewUrls;
    });
  };

  // Remove a single file from the list
  const removeFile = (fileName) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
    setResults((prev) => {
      const updated = { ...prev };
      delete updated[fileName];
      return updated;
    });
    setPreviewUrls((prev) => {
      if (prev[fileName]) {
        URL.revokeObjectURL(prev[fileName]);
        const updated = { ...prev };
        delete updated[fileName];
        return updated;
      }
      return prev;
    });
    setImageDimensions((prev) => {
      const updated = { ...prev };
      delete updated[fileName];
      return updated;
    });
  };

  // Compress all files
  const compressAll = async () => {
    setProcessing(true);
    const updated = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      updated[file.name] = { status: "processing", percent: 0 };
      setResults({ ...updated });

      let p = 0;
      const timer = setInterval(() => {
        p += Math.random() * 15;
        if (p >= 95) p = 95;
        updated[file.name].percent = Math.floor(p);
        setResults({ ...updated });
      }, 200);

      const form = new FormData();
      form.append("file", file);
      form.append("compressionType", compressionType);
      form.append("compressionValue", compressionValue);
      form.append("pixelWidth", pixelWidth);
      form.append("pixelHeight", pixelHeight);

      try {
        const res = await fetch("/api/compress-single", {
          method: "POST",
          body: form,
        });

        clearInterval(timer);

        if (!res.ok) {
          throw new Error("Compression failed");
        }

        const out = await res.arrayBuffer();
        const ext = res.headers.get("X-Output-Extension");
        const blob = new Blob([out]);

        updated[file.name] = {
          status: "done",
          percent: 100,
          ext,
          blob,
          size: blob.size,
        };

        setResults({ ...updated });
        setTotalCompleted((prev) => prev + 1);
      } catch (error) {
        clearInterval(timer);
        updated[file.name] = {
          status: "error",
          percent: 0,
        };
        setResults({ ...updated });
        console.error("Compression error:", error);
      }
    }

    setProcessing(false);
  };

  // Reprocess a single failed file
  const reprocessFile = async (fileName) => {
    const file = files.find((f) => f.name === fileName);
    if (!file) return;

    const updated = { ...results };
    updated[fileName] = { status: "processing", percent: 0 };
    setResults(updated);

    let p = 0;
    const timer = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 95) p = 95;
      updated[fileName].percent = Math.floor(p);
      setResults({ ...updated });
    }, 200);

    const form = new FormData();
    form.append("file", file);
    form.append("compressionType", compressionType);
    form.append("compressionValue", compressionValue);
    form.append("pixelWidth", pixelWidth);
    form.append("pixelHeight", pixelHeight);

    try {
      const res = await fetch("/api/compress-single", {
        method: "POST",
        body: form,
      });

      clearInterval(timer);

      if (!res.ok) {
        throw new Error("Compression failed");
      }

      const out = await res.arrayBuffer();
      const ext = res.headers.get("X-Output-Extension");
      const blob = new Blob([out]);

      updated[fileName] = {
        status: "done",
        percent: 100,
        ext,
        blob,
        size: blob.size,
      };

      setResults({ ...updated });
      setTotalCompleted((prev) => prev + 1);
    } catch (error) {
      clearInterval(timer);
      updated[fileName] = {
        status: "error",
        percent: 0,
      };
      setResults({ ...updated });
      console.error("Compression error:", error);
    }
  };

  // Clean all files and results
  const cleanAll = () => {
    Object.values(previewUrls).forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setResults({});
    setPreviewUrls({});
    setImageDimensions({});
    setProcessing(false);
    setTotalUploads(0);
    setTotalCompleted(0);
  };

  // Reset compression settings and results (keep files)
  const resetCompression = () => {
    setResults({});
    setProcessing(false);
    setTotalCompleted(0);
    setCompressionType("percentage");
    setCompressionValue(80);
    setPixelWidth(1920);
    setPixelHeight(1080);
  };

  // Reset individual file result
  const resetFileResult = (fileName) => {
    setResults((prev) => {
      const updated = { ...prev };
      if (updated[fileName]?.status === "done") {
        setTotalCompleted((count) => Math.max(0, count - 1));
      }
      delete updated[fileName];
      return updated;
    });
  };

  // Download single file
  const downloadSingleFile = (fileName) => {
    const result = results[fileName];
    if (!result || result.status !== "done") return;

    const file = files.find((f) => f.name === fileName);
    if (!file) return;

    // Replace extension with output extension
    const outName = fileName.replace(/\.(heic|HEIC|jpg|JPG|jpeg|JPEG|png|PNG|webp|WEBP)$/i, `.${result.ext}`);
    
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = outName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
    const zip = new JSZip();

    for (const name in results) {
      const r = results[name];
      if (r.status === "done") {
        const outName = name.replace(/\.(heic|HEIC|jpg|JPG|jpeg|JPEG|png|PNG|webp|WEBP)$/i, `.${r.ext}`);
        zip.file(outName, r.blob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = "compressed.zip";
    a.click();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="top-center" />
      <Navbar />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 space-y-32">
          <section id="compressor" className="space-y-8 py-8">
            {/* Upload Box and Statistics - Top Row */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Dropzone - Left Side */}
              <div className="flex-1">
                <Dropzone 
                  setFiles={handleFilesAdded} 
                  resetResults={resetResults}
                  inputType={null}
                />
              </div>
              
              {/* Statistics - Right Side (Small Boxes) */}
              <div className="flex flex-col gap-4 md:w-48">
                <Card className="border-2 hover:border-primary/50 transition-all duration-200 hover:shadow-lg bg-gradient-to-br from-background to-primary/5">
                  <CardContent className="pt-4 pb-4 px-4">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mb-2">
                        <Upload className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Total Uploaded
                      </p>
                      <p className="text-2xl font-bold text-primary">{totalUploads}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 hover:border-primary/50 transition-all duration-200 hover:shadow-lg bg-gradient-to-br from-background to-green-500/5">
                  <CardContent className="pt-4 pb-4 px-4">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-500/10 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Total Completed
                      </p>
                      <p className="text-2xl font-bold text-green-600">{totalCompleted}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Compression Settings - Horizontal Flex Row */}
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                <CardTitle className="text-2xl">Compression Settings</CardTitle>
                <CardDescription className="text-base">
                  Choose how you want to compress your images
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <RadioGroup
                  value={compressionType}
                  onValueChange={setCompressionType}
                  className="flex flex-col md:flex-row gap-4"
                >
                  <div className="flex-1 flex items-center space-x-4 p-5 border-2 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 has-[:checked]:border-primary has-[:checked]:bg-gradient-to-r has-[:checked]:from-primary/10 has-[:checked]:to-primary/5 has-[:checked]:shadow-md">
                    <RadioGroupItem value="percentage" id="percentage" />
                    <label htmlFor="percentage" className="flex-1 cursor-pointer">
                      <div className="font-semibold text-base">Percentage</div>
                      <div className="text-sm text-muted-foreground mt-1">Resize by percentage (1-100%)</div>
                    </label>
                  </div>
                  <div className="flex-1 flex items-center space-x-4 p-5 border-2 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 has-[:checked]:border-primary has-[:checked]:bg-gradient-to-r has-[:checked]:from-primary/10 has-[:checked]:to-primary/5 has-[:checked]:shadow-md">
                    <RadioGroupItem value="ratio" id="ratio" />
                    <label htmlFor="ratio" className="flex-1 cursor-pointer">
                      <div className="font-semibold text-base">Ratio</div>
                      <div className="text-sm text-muted-foreground mt-1">Resize by ratio (0.1 to 1.0)</div>
                    </label>
                  </div>
                  <div className="flex-1 flex items-center space-x-4 p-5 border-2 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 has-[:checked]:border-primary has-[:checked]:bg-gradient-to-r has-[:checked]:from-primary/10 has-[:checked]:to-primary/5 has-[:checked]:shadow-md">
                    <RadioGroupItem value="pixel" id="pixel" />
                    <label htmlFor="pixel" className="flex-1 cursor-pointer">
                      <div className="font-semibold text-base">Pixel Dimensions</div>
                      <div className="text-sm text-muted-foreground mt-1">Resize to specific width and height</div>
                    </label>
                  </div>
                </RadioGroup>

                {/* Compression Value Input */}
                {compressionType === "percentage" && (
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <span>Percentage</span>
                      <span className="text-primary font-bold text-lg">{compressionValue}%</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={compressionValue}
                        onChange={(e) => setCompressionValue(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={compressionValue}
                        onChange={(e) => setCompressionValue(parseFloat(e.target.value) || 80)}
                        className="w-24 px-3 py-2 border-2 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <span className="text-sm font-medium text-muted-foreground">%</span>
                    </div>
                  </div>
                )}

                {compressionType === "ratio" && (
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <span>Ratio</span>
                      <span className="text-primary font-bold text-lg">{(compressionValue / 100).toFixed(1)}</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={compressionValue / 100}
                        onChange={(e) => setCompressionValue(parseFloat(e.target.value) * 100)}
                        className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <input
                        type="number"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={(compressionValue / 100).toFixed(1)}
                        onChange={(e) => setCompressionValue((parseFloat(e.target.value) || 0.8) * 100)}
                        className="w-24 px-3 py-2 border-2 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>
                )}

                {compressionType === "pixel" && (
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                    <label className="text-sm font-semibold">Pixel Dimensions</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Width (px)</label>
                        <input
                          type="number"
                          min="1"
                          value={pixelWidth}
                          onChange={(e) => setPixelWidth(parseInt(e.target.value) || 1920)}
                          className="w-full px-3 py-2 border-2 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Height (px)</label>
                        <input
                          type="number"
                          min="1"
                          value={pixelHeight}
                          onChange={(e) => setPixelHeight(parseInt(e.target.value) || 1080)}
                          className="w-full px-3 py-2 border-2 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compress Button and Reset */}
            {files.length > 0 && (
              <div className="flex justify-center gap-4">
                <Button
                  onClick={compressAll}
                  disabled={processing}
                  size="lg"
                  className="min-w-[220px] h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Compressing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-5 w-5" />
                      Compress All
                    </>
                  )}
                </Button>
                <Button
                  onClick={resetCompression}
                  disabled={processing}
                  variant="outline"
                  size="lg"
                  className="min-w-[180px] h-12 text-base font-semibold border-2 hover:bg-muted/50 transition-all duration-200"
                >
                  <RotateCcw className="mr-2 h-5 w-5" />
                  Reset
                </Button>
              </div>
            )}

            {/* FILE STATUS LIST */}
            {files.length > 0 && (
              <div className="space-y-4">
                <Separator />
                <div className="flex items-center gap-3">
                  <div className="h-1 w-12 bg-gradient-to-r from-primary to-transparent rounded-full"></div>
                  <h2 className="text-2xl font-bold">Files</h2>
                </div>
                <div className="space-y-3">
                  {files.map((file) => {
                    const result = results[file.name];
                    const percent = result?.percent ?? 0;
                    const previewUrl = previewUrls[file.name];
                    const fileSizeKB = (file.size / 1024).toFixed(2);
                    const dimensions = imageDimensions[file.name];

                    return (
                      <Card key={file.name} className="relative border-2 hover:border-primary/30 hover:shadow-md transition-all duration-200">
                        <CardContent className="p-4">
                          {/* Buttons - Right Side */}
                          <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center gap-2">
                            {/* Reset Button */}
                            {result && (result.status === "done" || result.status === "error") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => resetFileResult(file.name)}
                                disabled={processing}
                                className="h-8 w-8 hover:bg-orange-50 hover:text-orange-600"
                                title="Reset file result"
                              >
                                <RotateCcw className="h-4 w-4 text-orange-600" />
                              </Button>
                            )}
                            {/* Remove Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFile(file.name)}
                              disabled={processing}
                              className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                              title="Remove file"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>

                          <div className={`flex items-center gap-4 ${result && (result.status === "done" || result.status === "error") ? "pr-24" : "pr-12"}`}>
                            <div className="flex-shrink-0">
                              {previewUrl && !/\.(heic|HEIC)$/i.test(file.name) ? (
                                <img
                                  src={previewUrl}
                                  alt={file.name}
                                  className="w-16 h-16 object-cover rounded-lg border-2 shadow-sm"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border-2">
                                  <FileImage className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate text-sm">{file.name}</p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {/* Original and Estimated Size */}
                                {!result && dimensions && (() => {
                                  const estimatedSize = calculateEstimatedSize(
                                    file.size,
                                    dimensions,
                                    compressionType,
                                    compressionValue,
                                    pixelWidth,
                                    pixelHeight
                                  );
                                  const estimatedSizeKB = estimatedSize ? (estimatedSize / 1024).toFixed(2) : null;
                                  const reduction = estimatedSize ? ((1 - estimatedSize / file.size) * 100).toFixed(1) : null;
                                  
                                  return (
                                    <>
                                      <span className="text-xs font-medium text-muted-foreground">
                                        {fileSizeKB} KB
                                      </span>
                                      {estimatedSizeKB && (
                                        <>
                                          <span className="text-xs text-muted-foreground">→</span>
                                          <span className="text-xs font-semibold text-primary">
                                            ~{estimatedSizeKB} KB
                                          </span>
                                          {reduction && parseFloat(reduction) > 0 && (
                                            <span className="text-xs font-medium text-green-600">
                                              (-{reduction}%)
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </>
                                  );
                                })()}
                                
                                {/* Show only original size if no dimensions available */}
                                {!result && !dimensions && (
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {fileSizeKB} KB
                                  </span>
                                )}
                                
                                {dimensions && (
                                  <span className="text-xs font-medium text-muted-foreground">
                                    • {dimensions.width} × {dimensions.height} px
                                  </span>
                                )}
                                {!result && (
                                  <Badge variant="secondary" className="text-xs">Pending</Badge>
                                )}
                                {result?.status === "processing" && (
                                  <Badge variant="default" className="text-xs">
                                    Compressing... {percent}%
                                  </Badge>
                                )}
                                {result?.status === "done" && (
                                  <>
                                    <Badge variant="default" className="bg-green-600 text-xs">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Done
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {fileSizeKB} KB → {(result.size / 1024).toFixed(2)} KB
                                    </span>
                                    {(() => {
                                      const actualReduction = ((1 - result.size / file.size) * 100).toFixed(1);
                                      return parseFloat(actualReduction) > 0 && (
                                        <span className="text-xs font-medium text-green-600">
                                          (-{actualReduction}%)
                                        </span>
                                      );
                                    })()}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => downloadSingleFile(file.name)}
                                      className="ml-2 h-6 text-xs px-2"
                                      title="Download this file"
                                    >
                                      <Download className="h-3 w-3 mr-1" />
                                      Download
                                    </Button>
                                  </>
                                )}
                                {result?.status === "error" && (
                                  <>
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Error
                                    </Badge>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => reprocessFile(file.name)}
                                      disabled={processing}
                                      className="ml-1 h-6 text-xs px-2"
                                    >
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      Retry
                                    </Button>
                                  </>
                                )}
                              </div>
                              {result?.status === "processing" && (
                                <Progress value={percent} className="h-1.5 mt-2" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Download ZIP and Clean All */}
            {files.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-center gap-4 items-center">
                {Object.values(results).filter((x) => x.status === "done").length > 0 && (
                  <Button
                    onClick={downloadAll}
                    size="lg"
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 min-w-[200px] h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Download All (ZIP)
                  </Button>
                )}
                <Button
                  onClick={cleanAll}
                  size="lg"
                  variant="outline"
                  className="min-w-[200px] h-12 text-base font-semibold border-2 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
                >
                  <Trash2 className="mr-2 h-5 w-5 text-red-600" />
                  Clean All
                </Button>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

