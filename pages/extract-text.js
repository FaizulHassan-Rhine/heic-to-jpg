import { useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useDropzone } from "react-dropzone";
import { Loader2, CheckCircle, Copy, AlertCircle, FileImage, Trash2, Upload, Download, RotateCcw } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast, { Toaster } from "react-hot-toast";
import { cn } from "@/lib/utils";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ExtractText() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState(null);
  const [totalUploads, setTotalUploads] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [previewUrls, setPreviewUrls] = useState({});

  const resetResults = () => {
    setResults({});
    setTotalCompleted(0);
    setProcessing(false);
    setProcessingFile(null);
  };

  const handleFilesAdded = (newFiles) => {
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
      toast.error(`File size limit is 10MB. The following files are too large: ${fileNames}`);
      if (validFiles.length === 0) {
        return;
      }
    }
    
    setFiles(validFiles);
    setTotalUploads((prev) => prev + validFiles.length);
    
    // Create preview URLs (skip HEIC as browsers can't display them)
    const newPreviewUrls = {};
    validFiles.forEach((file) => {
      const isHeic = /\.(heic|HEIC)$/i.test(file.name);
      // Skip creating preview URL for HEIC files as browsers can't display them
      if (!isHeic) {
        newPreviewUrls[file.name] = URL.createObjectURL(file);
      }
    });
    setPreviewUrls((prev) => ({ ...prev, ...newPreviewUrls }));
    
    resetResults();
  };

  const onDrop = useCallback((acceptedFiles) => {
    handleFilesAdded(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic", ".HEIC", ".JPG", ".JPEG", ".PNG", ".WEBP"]
    },
    multiple: true,
    onDrop,
  });

  const extractTextFromImage = async (file) => {
    try {
      // Use OCR.space free API directly from client (no npm packages needed)
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
        headers: {
          'apikey': 'helloworld', // Free tier - can be any string
        },
      });

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.OCRExitCode !== 1) {
        throw new Error(data.ErrorMessage?.[0] || 'OCR processing failed');
      }

      // Extract text from all parsed results
      let extractedText = '';
      if (data.ParsedResults && data.ParsedResults.length > 0) {
        extractedText = data.ParsedResults
          .map(result => result.ParsedText || '')
          .join('\n\n')
          .trim();
      }

      if (!extractedText) {
        return 'No text found in image';
      }

      return extractedText;
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error('Failed to extract text from image: ' + error.message);
    }
  };

  const extractAll = async () => {
    if (files.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    setProcessing(true);
    setTotalCompleted(0);
    const newResults = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProcessingFile(file.name);

      try {
        const text = await extractTextFromImage(file);
        newResults[file.name] = {
          text,
          status: 'success',
          error: null
        };
        setResults({ ...newResults });
        setTotalCompleted(i + 1);
      } catch (error) {
        newResults[file.name] = {
          text: '',
          status: 'error',
          error: error.message || 'Failed to extract text'
        };
        setResults({ ...newResults });
        toast.error(`Failed to extract text from ${file.name}`);
      }
    }

    setProcessing(false);
    setProcessingFile(null);
    toast.success("Text extraction completed!");
  };

  const removeFile = (fileName) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
    setResults((prev) => {
      const newResults = { ...prev };
      delete newResults[fileName];
      return newResults;
    });
    
    // Revoke preview URL
    if (previewUrls[fileName]) {
      URL.revokeObjectURL(previewUrls[fileName]);
      setPreviewUrls((prev) => {
        const newUrls = { ...prev };
        delete newUrls[fileName];
        return newUrls;
      });
    }
    
    setTotalUploads((prev) => Math.max(0, prev - 1));
  };

  const resetFileResult = (fileName) => {
    setResults((prev) => {
      const newResults = { ...prev };
      delete newResults[fileName];
      return newResults;
    });
    setTotalCompleted((prev) => Math.max(0, prev - 1));
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Text copied to clipboard!");
  };

  const downloadText = (fileName, text) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.split('.')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Text downloaded!");
  };

  const downloadAllText = () => {
    const allText = files
      .map((file) => {
        const result = results[file.name];
        if (result && result.status === 'success' && result.text) {
          return `=== ${file.name} ===\n\n${result.text}\n\n`;
        }
        return null;
      })
      .filter(Boolean)
      .join('\n');

    if (!allText) {
      toast.error("No text to download");
      return;
    }

    const blob = new Blob([allText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted-text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("All text downloaded!");
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const completedCount = Object.keys(results).filter(
    (name) => results[name]?.status === 'success'
  ).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <Toaster position="top-center" />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Extract Text from Images</h1>
            <p className="text-muted-foreground">
              Upload images and extract text using OCR (Optical Character Recognition)
            </p>
          </div>

          {/* Upload Section */}
          <div className="flex gap-4 items-start">
            <Card className="flex-1">
              <CardContent className="p-6">
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50"
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  {isDragActive ? (
                    <p className="text-lg font-medium">Drop images here...</p>
                  ) : (
                    <>
                      <p className="text-lg font-medium mb-2">
                        Drag & drop images here, or click to select
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Supported formats: JPG, PNG, WebP, HEIC (Max {MAX_FILES} images, 10MB each)
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <div className="flex flex-col gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{totalUploads}</p>
                    <p className="text-xs text-muted-foreground">Total Uploaded</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{completedCount}</p>
                    <p className="text-xs text-muted-foreground">Total Completed</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          {files.length > 0 && (
            <div className="flex gap-4 justify-center">
              <Button
                onClick={extractAll}
                disabled={processing}
                size="lg"
                className="min-w-[200px]"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  "Extract Text from All"
                )}
              </Button>
              {completedCount > 0 && (
                <Button
                  onClick={downloadAllText}
                  variant="outline"
                  size="lg"
                  className="min-w-[200px]"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download All Text
                </Button>
              )}
            </div>
          )}

          {/* Processing Status */}
          {processing && processingFile && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Processing: {processingFile}</p>
                    <Progress 
                      value={(totalCompleted / files.length) * 100} 
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <h2 className="text-2xl font-bold">Uploaded Images</h2>
              <div className="grid gap-4">
                {files.map((file) => {
                  const result = results[file.name];
                  const previewUrl = previewUrls[file.name];
                  
                  return (
                    <Card key={file.name} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex gap-4 p-4">
                          {/* Image Preview */}
                          <div className="flex-shrink-0">
                            {previewUrl && !/\.(heic|HEIC)$/i.test(file.name) ? (
                              <img
                                src={previewUrl}
                                alt={file.name}
                                className="w-24 h-24 object-cover rounded border"
                              />
                            ) : (
                              <div className="w-24 h-24 bg-muted rounded border flex items-center justify-center">
                                <FileImage className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{file.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatFileSize(file.size)}
                                </p>
                              </div>

                              {/* Status Badge */}
                              <div className="flex-shrink-0 flex items-center gap-2">
                                {result?.status === 'success' && (
                                  <Badge variant="default" className="bg-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Extracted
                                  </Badge>
                                )}
                                {result?.status === 'error' && (
                                  <Badge variant="destructive">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Error
                                  </Badge>
                                )}
                                {processing && processingFile === file.name && (
                                  <Badge variant="secondary">
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Processing
                                  </Badge>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-2">
                                  {result && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => resetFileResult(file.name)}
                                      title="Reset"
                                    >
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeFile(file.name)}
                                    title="Remove"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Extracted Text */}
                            {result?.status === 'success' && result.text && (
                              <div className="mt-4 space-y-2">
                                <div className="bg-muted rounded-lg p-4 max-h-48 overflow-y-auto">
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {result.text || "No text found"}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyText(result.text)}
                                  >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadText(file.name, result.text)}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Error Message */}
                            {result?.status === 'error' && (
                              <div className="mt-4">
                                <p className="text-sm text-destructive">
                                  {result.error || "Failed to extract text"}
                                </p>
                              </div>
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

          {/* Empty State */}
          {files.length === 0 && !processing && (
            <Card>
              <CardContent className="p-12 text-center">
                <FileImage className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No images uploaded</p>
                <p className="text-sm text-muted-foreground">
                  Upload images to extract text using OCR
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

