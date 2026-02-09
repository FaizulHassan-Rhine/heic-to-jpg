import { useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useDropzone } from "react-dropzone";
import { Loader2, CheckCircle, AlertCircle, FileImage, Trash2, Upload, Download, RotateCcw } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast, { Toaster } from "react-hot-toast";
import { cn } from "@/lib/utils";

const MAX_FILES = 20;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function ImageToPdf() {
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
      toast.error(`File size limit is 20MB. The following files are too large: ${fileNames}`);
      if (validFiles.length === 0) {
        return;
      }
    }
    
    setFiles(validFiles);
    setTotalUploads((prev) => prev + validFiles.length);
    
    // Create preview URLs
    const newPreviewUrls = {};
    validFiles.forEach((file) => {
      newPreviewUrls[file.name] = URL.createObjectURL(file);
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

  // Helper: convert any image file to JPEG via canvas
  const fileToJpegBytes = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(
          async (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
              reject(new Error('Failed to create JPEG blob'));
              return;
            }
            const ab = await blob.arrayBuffer();
            resolve({ bytes: new Uint8Array(ab), width: img.width, height: img.height });
          },
          'image/jpeg',
          0.95
        );
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  };

  const convertImageToPdf = async (file) => {
    try {
      const { PDFDocument } = await import('pdf-lib');
      
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      
      // Always convert via canvas to JPEG for maximum compatibility
      const { bytes, width, height } = await fileToJpegBytes(file);
      
      // Embed the JPEG image
      const image = await pdfDoc.embedJpg(bytes);
      
      // Add a page with the same dimensions as the image
      const page = pdfDoc.addPage([width, height]);
      
      // Draw the image on the page
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });
      
      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      return pdfBlob;
    } catch (error) {
      console.error('PDF conversion error:', error);
      throw new Error('Failed to convert image to PDF: ' + error.message);
    }
  };

  const convertAll = async () => {
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
        const pdfBlob = await convertImageToPdf(file);
        newResults[file.name] = {
          pdfBlob,
          status: 'success',
          error: null,
          size: pdfBlob.size
        };
        setResults({ ...newResults });
        setTotalCompleted(i + 1);
      } catch (error) {
        newResults[file.name] = {
          pdfBlob: null,
          status: 'error',
          error: error.message || 'Failed to convert image to PDF',
          size: 0
        };
        setResults({ ...newResults });
        toast.error(`Failed to convert ${file.name}`);
      }
    }

    setProcessing(false);
    setProcessingFile(null);
    toast.success("PDF conversion completed!");
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

  const downloadPdf = (fileName, pdfBlob) => {
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.split('.')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("PDF downloaded!");
  };

  const downloadAllPdfs = async () => {
    // Download each PDF individually
    for (const file of files) {
      const result = results[file.name];
      if (result && result.status === 'success' && result.pdfBlob) {
        downloadPdf(file.name, result.pdfBlob);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between downloads
      }
    }
    
    toast.success("All PDFs downloaded!");
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
            <h1 className="text-4xl font-bold">Convert Images to PDF</h1>
            <p className="text-muted-foreground">
              Upload images and convert them to PDF format
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
                        Supported formats: JPG, PNG, WebP, HEIC (Max {MAX_FILES} images, 20MB each)
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
                  "Convert All to PDF"
                )}
              </Button>
              {completedCount > 0 && (
                <Button
                  onClick={downloadAllPdfs}
                  variant="outline"
                  size="lg"
                  className="min-w-[200px]"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download All PDFs
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
                            {previewUrl && (
                              <img
                                src={previewUrl}
                                alt={file.name}
                                className="w-24 h-24 object-cover rounded border"
                              />
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
                                {result?.status === 'success' && result.size && (
                                  <p className="text-sm text-muted-foreground">
                                    PDF: {formatFileSize(result.size)}
                                  </p>
                                )}
                              </div>

                              {/* Status Badge */}
                              <div className="flex-shrink-0 flex items-center gap-2">
                                {result?.status === 'success' && (
                                  <Badge variant="default" className="bg-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Converted
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
                                  {result?.status === 'success' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => downloadPdf(file.name, result.pdfBlob)}
                                      title="Download PDF"
                                    >
                                      <Download className="h-4 w-4" />
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

                            {/* Error Message */}
                            {result?.status === 'error' && (
                              <div className="mt-4">
                                <p className="text-sm text-destructive">
                                  {result.error || "Failed to convert to PDF"}
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
                  Upload images to convert them to PDF format
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

