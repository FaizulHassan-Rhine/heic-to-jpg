import { useState } from "react";
import Dropzone from "../components/Dropzone";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import JSZip from "jszip";
import { Loader2, CheckCircle, Download, AlertCircle, FileImage, RefreshCw, Trash2, Upload, RotateCcw } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast, { Toaster } from "react-hot-toast";

// Helper function to detect file type
const getFileType = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  if (['heic'].includes(ext)) return 'heic';
  if (['jpg', 'jpeg'].includes(ext)) return 'jpg';
  if (['png'].includes(ext)) return 'png';
  if (['webp'].includes(ext)) return 'webp';
  return null;
};

// Get available output formats based on input type
const getAvailableFormats = (fileType) => {
  if (fileType === 'heic') {
    return [
      { value: 'jpg-high', label: 'High-Res JPG', quality: '95%' },
      { value: 'jpg-balanced', label: 'Balanced JPG', quality: '80%' },
      { value: 'webp-high', label: 'High-Res WebP', quality: '90%' },
      { value: 'webp-balanced', label: 'Balanced WebP', quality: '80%' },
    ];
  }
  if (fileType === 'jpg') {
    return [
      { value: 'webp-high', label: 'High-Res WebP', quality: '90%' },
      { value: 'webp-balanced', label: 'Balanced WebP', quality: '80%' },
      { value: 'png', label: 'PNG', quality: 'Lossless' },
    ];
  }
  if (fileType === 'png') {
    return [
      { value: 'jpg-high', label: 'High-Res JPG', quality: '95%' },
      { value: 'jpg-balanced', label: 'Balanced JPG', quality: '80%' },
      { value: 'webp-high', label: 'High-Res WebP', quality: '90%' },
      { value: 'webp-balanced', label: 'Balanced WebP', quality: '80%' },
    ];
  }
  if (fileType === 'webp') {
    return [
      { value: 'jpg-high', label: 'High-Res JPG', quality: '95%' },
      { value: 'jpg-balanced', label: 'Balanced JPG', quality: '80%' },
      { value: 'png', label: 'PNG', quality: 'Lossless' },
    ];
  }
  return [];
};

// Conversion type options
const conversionTypes = [
  {
    id: 'heic',
    label: 'HEIC',
    description: 'Convert HEIC images',
    outputs: ['JPG', 'WebP'],
    icon: '📱'
  },
  {
    id: 'jpg',
    label: 'JPG',
    description: 'Convert JPG images',
    outputs: ['WebP', 'PNG'],
    icon: '🖼️'
  },
  {
    id: 'png',
    label: 'PNG',
    description: 'Convert PNG images',
    outputs: ['JPG', 'WebP'],
    icon: '🖼️'
  },
  {
    id: 'webp',
    label: 'WebP',
    description: 'Convert WebP images',
    outputs: ['JPG', 'PNG'],
    icon: '🖼️'
  },
];

export default function Convert() {
  const [selectedInputType, setSelectedInputType] = useState(null);
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [format, setFormat] = useState("jpg-high");
  const [totalUploads, setTotalUploads] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [previewUrls, setPreviewUrls] = useState({});
  const [imageDimensions, setImageDimensions] = useState({});

  // Reset previous results when uploading new batch
  const resetResults = () => {
    setFiles([]);
    setResults({});
    setProcessing(false);
  };

  // Track uploads when files are added
  const handleFilesAdded = (newFiles) => {
    const MAX_FILES = 50;
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
    
    // Create preview URLs for all files
    const newPreviewUrls = {};
    
    validFiles.forEach((file) => {
      const hasImageMimeType = file.type && file.type.startsWith('image/');
      const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|heic|bmp|svg)$/i.test(file.name);
      const isImage = hasImageMimeType || hasImageExtension;
      
      if (isImage) {
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
    
    // Set default format based on selected input type
    if (selectedInputType && newFiles.length > 0) {
      const availableFormats = getAvailableFormats(selectedInputType);
      if (availableFormats.length > 0) {
        setFormat(availableFormats[0].value);
      }
    }
  };

  // Handle conversion type selection
  const handleConversionTypeSelect = (type) => {
    // Clean up preview URLs when switching formats
    Object.values(previewUrls).forEach((url) => URL.revokeObjectURL(url));
    setSelectedInputType(type);
    setFiles([]);
    setResults({});
    setPreviewUrls({});
    setImageDimensions({});
    setProcessing(false);
    const availableFormats = getAvailableFormats(type);
    if (availableFormats.length > 0) {
      setFormat(availableFormats[0].value);
    }
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

  const convertAll = async () => {
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
      form.append("format", format);
      form.append("inputType", getFileType(file.name) || "heic");

      try {
        const res = await fetch("/api/convert-single", {
          method: "POST",
          body: form,
        });

        clearInterval(timer);

        if (!res.ok) {
          throw new Error("Conversion failed");
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
        console.error("Conversion error:", error);
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
    form.append("format", format);
    form.append("inputType", getFileType(file.name) || "heic");

    try {
      const res = await fetch("/api/convert-single", {
        method: "POST",
        body: form,
      });

      clearInterval(timer);

      if (!res.ok) {
        throw new Error("Conversion failed");
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
      console.error("Conversion error:", error);
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
    a.download = "converted.zip";
    a.click();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="top-center" />
      <Navbar />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 space-y-32">
          <section id="converter" className="space-y-8 py-8">
            {/* Upload Box and Statistics - Top Row */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Dropzone - Left Side */}
              <div className="flex-1">
                <Dropzone 
                  setFiles={handleFilesAdded} 
                  resetResults={resetResults}
                  inputType={selectedInputType}
                  disabled={!selectedInputType}
                  onDisabledClick={() => toast.error("Please select an input format first")}
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

            {/* Input Type Selection - Below Upload Box */}
            <Card className="border-2 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                <CardTitle className="text-2xl">Select Input Format</CardTitle>
                <CardDescription className="text-base">
                  {selectedInputType ? "Selected format: " + selectedInputType.toUpperCase() + " - Click another to change" : "Choose what type of images you want to convert"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-4 gap-4">
                  {conversionTypes.map((type) => {
                    const availableFormats = getAvailableFormats(type.id);
                    const isSelected = selectedInputType === type.id;
                    return (
                      <div
                        key={type.id}
                        onClick={() => handleConversionTypeSelect(type.id)}
                        className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 group ${
                          isSelected
                            ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg ring-2 ring-primary/20"
                            : "hover:border-primary hover:bg-gradient-to-br hover:from-primary/5 hover:to-transparent hover:shadow-lg"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <h3 className={`font-bold text-lg mb-2 ${isSelected ? "text-primary" : ""}`}>{type.label}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {type.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {type.outputs.map((output) => (
                            <Badge 
                              key={output} 
                              variant={isSelected ? "default" : "secondary"} 
                              className="text-xs"
                            >
                              → {output}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Output Format Selection - Show after files are uploaded */}
            {files.length > 0 && selectedInputType && (() => {
              const availableFormats = getAvailableFormats(selectedInputType);
              
              if (availableFormats.length === 0) {
                return (
                  <Card className="border-2">
                    <CardContent className="pt-6 pb-6">
                      <p className="text-center text-muted-foreground">
                        Unsupported file type. Please upload HEIC, JPG, PNG, or WebP images.
                      </p>
                    </CardContent>
                  </Card>
                );
              }
              
              return (
                <Card className="border-2 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
                    <CardTitle className="text-2xl">Choose Output Format</CardTitle>
                    <CardDescription className="text-base">
                      Select the format and quality for your converted images
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <RadioGroup
                      value={format}
                      onValueChange={setFormat}
                      className={`grid gap-4 ${availableFormats.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}
                    >
                      {availableFormats.map((fmt) => (
                        <div
                          key={fmt.value}
                          className="flex items-center space-x-3 p-5 border-2 rounded-lg cursor-pointer hover:border-primary/50 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 has-[:checked]:border-primary has-[:checked]:bg-gradient-to-r has-[:checked]:from-primary/10 has-[:checked]:to-primary/5 has-[:checked]:shadow-md"
                        >
                          <RadioGroupItem value={fmt.value} id={fmt.value} />
                          <label htmlFor={fmt.value} className="flex-1 cursor-pointer">
                            <div className="font-semibold text-base">{fmt.label}</div>
                            <div className="text-sm text-muted-foreground mt-1">{fmt.quality} Quality</div>
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Convert Button */}
            {files.length > 0 && (
              <div className="flex justify-center">
                <Button
                  onClick={convertAll}
                  disabled={processing}
                  size="lg"
                  className="min-w-[200px]"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    "Convert All"
                  )}
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
                            {/* Image Preview */}
                            <div className="flex-shrink-0">
                              {previewUrl ? (
                                <img
                                  src={previewUrl}
                                  alt={file.name}
                                  className="w-16 h-16 object-cover rounded-md border"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center border">
                                  <FileImage className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            {/* File Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-sm">{file.name}</p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-xs text-muted-foreground">
                                  {fileSizeKB} KB
                                </span>
                                {!result && (
                                  <Badge variant="secondary" className="text-xs">Pending</Badge>
                                )}
                                {result?.status === "processing" && (
                                  <Badge variant="default" className="text-xs">
                                    Converting... {percent}%
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
                                      const reduction = ((1 - result.size / file.size) * 100).toFixed(1);
                                      return parseFloat(reduction) > 0 && (
                                        <span className="text-xs font-medium text-green-600">
                                          (-{reduction}%)
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

                              {/* Progress Bar */}
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
                    className="bg-green-600 hover:bg-green-700 min-w-[200px]"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download All (ZIP)
                  </Button>
                )}
                <Button
                  onClick={cleanAll}
                  size="lg"
                  variant="outline"
                  className="min-w-[200px]"
                >
                  <Trash2 className="mr-2 h-4 w-4 text-red-600" />
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

