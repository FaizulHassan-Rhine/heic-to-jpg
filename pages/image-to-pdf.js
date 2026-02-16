import { useState, useEffect } from "react";
import { useAuth } from "../lib/authContext";
import { generateThumbnail } from "../lib/thumbnailUtils";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Dropzone from "../components/Dropzone";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
import { PDFDocument } from "pdf-lib";
import {
  Loader2, CheckCircle, AlertCircle, FileImage, Trash2,
  Upload, Download, RotateCcw, Settings2, FileText, ArrowRight
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import Head from "next/head";
import JSZip from "jszip";

const MAX_FILES = 20;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const formatSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default function ImageToPdf() {
  const { user, trackUsage } = useAuth();
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({}); // { [filename]: { status, blob, size, pdfUrl } }
  const [processing, setProcessing] = useState(false);
  const [previewUrls, setPreviewUrls] = useState({});

  // Settings
  const [pageSize, setPageSize] = useState("A4"); // A4, Letter, Fit
  const [orientation, setOrientation] = useState("Portrait"); // Portrait, Landscape
  const [margin, setMargin] = useState(20); // 0, 20, 50

  // ── File Handling ──

  const handleFilesAdded = (newFiles) => {
    if (newFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} images allowed.`);
      return;
    }

    const valid = [];
    newFiles.forEach(f => {
      if (f.size > MAX_FILE_SIZE) toast.error(`"${f.name}" is too large (>20MB)`);
      else valid.push(f);
    });

    if (valid.length === 0) return;

    const newPreviews = {};
    valid.forEach(f => {
      if (f.type.startsWith("image/")) {
        newPreviews[f.name] = URL.createObjectURL(f);
      }
    });

    setFiles(prev => [...prev, ...valid]);
    setPreviewUrls(prev => ({ ...prev, ...newPreviews }));
  };

  const removeFile = (name) => {
    setFiles(prev => prev.filter(f => f.name !== name));
    setResults(prev => {
      const n = { ...prev };
      delete n[name];
      return n;
    });
    if (previewUrls[name]) {
      URL.revokeObjectURL(previewUrls[name]);
      setPreviewUrls(prev => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }
  };

  // ── Conversion Logic ──

  const convertSingle = async (file) => {
    try {
      const pdfDoc = await PDFDocument.create();
      let page;

      // Page sizes in points (72 dpi)
      // A4: 595.28 x 841.89
      // Letter: 612 x 792
      let pageWidth, pageHeight;

      if (pageSize === "A4") {
        pageWidth = 595.28;
        pageHeight = 841.89;
      } else if (pageSize === "Letter") {
        pageWidth = 612;
        pageHeight = 792;
      }

      if (orientation === "Landscape" && pageSize !== "Fit") {
        [pageWidth, pageHeight] = [pageHeight, pageWidth];
      }

      // Embed image
      const imageBytes = await file.arrayBuffer();
      let image;
      if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        image = await pdfDoc.embedJpg(imageBytes);
      } else if (file.type === 'image/png') {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        // Try embedding as PNG if unknown (might fail for WEBP/HEIC if PDFlib doesn't support)
        // Note: pdf-lib only supports JPG and PNG.
        // If WEBP/HEIC, might need canvas conversion first.
        // Assuming user uploads JPG/PNG for now or browser converted them in Dropzone...
        // Wait, my Dropzone doesn't convert automatically yet unless configured. 
        // But let's assume JPG/PNG for simplicity or try PNG embed.
        // If error, we'll catch it.
        try {
          image = await pdfDoc.embedPng(imageBytes);
        } catch (e) {
          throw new Error("Format not supported directly. Please convert to JPG/PNG first.");
        }
      }

      if (pageSize === "Fit") {
        page = pdfDoc.addPage([image.width + margin * 2, image.height + margin * 2]);
        page.drawImage(image, {
          x: margin,
          y: margin,
          width: image.width,
          height: image.height,
        });
      } else {
        page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Calculate scale to fit within margins
        const availableWidth = pageWidth - (margin * 2);
        const availableHeight = pageHeight - (margin * 2);

        const scale = Math.min(
          availableWidth / image.width,
          availableHeight / image.height
        );

        const dims = image.scale(scale);

        // Center content
        const x = margin + (availableWidth - dims.width) / 2;
        const y = margin + (availableHeight - dims.height) / 2;

        page.drawImage(image, {
          x,
          y,
          width: dims.width,
          height: dims.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });

      return {
        status: "done",
        blob,
        size: blob.size,
        ext: "pdf"
      };

    } catch (e) {
      console.error(e);
      return { status: "error", error: e.message };
    }
  };

  const processAll = async () => {
    setProcessing(true);
    const newResults = { ...results };

    // Mark pending
    for (const f of files) {
      if (!newResults[f.name] || newResults[f.name].status === "error") {
        newResults[f.name] = { status: "processing", progress: 0 };
      }
    }
    setResults({ ...newResults });

    const processedFiles = [];
    for (const file of files) {
      // Skip if already done
      if (results[file.name]?.status === "done") continue;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setResults(prev => {
          const current = prev[file.name]?.progress || 0;
          if (current < 90) {
            return {
              ...prev,
              [file.name]: { ...prev[file.name], progress: Math.min(current + Math.random() * 15, 90) }
            };
          }
          return prev;
        });
      }, 150);

      const res = await convertSingle(file);
      
      clearInterval(progressInterval);
      setResults(prev => ({ 
        ...prev, 
        [file.name]: { ...res, progress: 100 } 
      }));
      
      // Collect file information
      if (res.status === "done") {
        const inputExt = file.name.split('.').pop()?.toLowerCase() || '';
        const inputThumbnail = await generateThumbnail(file).catch(() => null);
        processedFiles.push({
          inputName: file.name,
          inputSize: file.size,
          inputFormat: inputExt,
          outputName: res.name || file.name.replace(/\.[^.]+$/, ".pdf"),
          outputSize: res.size || 0,
          outputFormat: "pdf",
          inputThumbnail: inputThumbnail || null,
          outputThumbnail: null,
        });
      }
      
      // Reset to done status after showing 100%
      setTimeout(() => {
        setResults(prev => ({ 
          ...prev, 
          [file.name]: res 
        }));
      }, 300);
    }

    // Track usage after all conversions complete
    const successCount = processedFiles.length;
    if (successCount > 0 && user && trackUsage) {
      trackUsage("/image-to-pdf", successCount, successCount, {
        tool: "Image to PDF",
        filesProcessed: successCount,
      }, processedFiles);
    }

    setProcessing(false);
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    let count = 0;
    files.forEach(f => {
      const res = results[f.name];
      if (res?.status === "done") {
        const name = f.name.substring(0, f.name.lastIndexOf(".")) + ".pdf";
        zip.file(name, res.blob);
        count++;
      }
    });

    if (count === 0) return;
    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = "images_to_pdf.zip";
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Head>
        <title>Image to PDF - ConvertMastery</title>
      </Head>
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
            Image to PDF
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Convert your images into professional PDF documents.
          </p>
        </div>

        <div className="grid gap-8">
          <CollapsibleDropzone
            files={files}
            setFiles={handleFilesAdded}
            title="Select Images for PDF"
            description="Merge standard images into PDF documents"
            accept={{
              "image/jpeg": [".jpg", ".jpeg", ".JPG", ".JPEG"],
              "image/png": [".png", ".PNG"],
              "image/webp": [".webp", ".WEBP"],
              "image/gif": [".gif", ".GIF"],
              "image/bmp": [".bmp", ".BMP"],
              "image/tiff": [".tiff", ".tif", ".TIFF", ".TIF"]
            }}
            borderColor="border-gray-300"
            hoverColor="hover:border-red-500"
          />

          {files.length > 0 && (
            <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-start">

              {/* Settings Sidebar */}
              <Card className="lg:sticky lg:top-24 h-fit border-0 shadow-lg ring-1 ring-gray-100">
                <CardContent className="p-6 space-y-8">
                  <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
                    <Settings2 className="w-6 h-6 text-red-600" /> PDF Settings
                  </div>

                  {/* Page Size */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Page Size</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['A4', 'Letter', 'Fit'].map(size => (
                        <button
                          key={size}
                          onClick={() => setPageSize(size)}
                          className={cn(
                            "py-2 text-sm rounded-lg transition-all font-medium border",
                            pageSize === size
                              ? "bg-red-50 border-red-200 text-red-700 font-semibold"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Orientation */}
                  {pageSize !== 'Fit' && (
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Orientation</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Portrait', 'Landscape'].map(mode => (
                          <button
                            key={mode}
                            onClick={() => setOrientation(mode)}
                            className={cn(
                              "py-2 text-sm rounded-lg transition-all font-medium border",
                              orientation === mode
                                ? "bg-red-50 border-red-200 text-red-700 font-semibold"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Margins */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Margins</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[0, 20, 50].map(m => (
                        <button
                          key={m}
                          onClick={() => setMargin(m)}
                          className={cn(
                            "py-2 text-sm rounded-lg transition-all font-medium border",
                            margin === m
                              ? "bg-red-50 border-red-200 text-red-700 font-semibold"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {m === 0 ? "None" : m === 20 ? "Normal" : "Large"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={processAll}
                    disabled={processing}
                    className="w-full bg-red-600 hover:bg-red-700 text-white h-12 shadow-md hover:shadow-lg transition-all font-semibold text-base"
                  >
                    {processing ? (
                      <> <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Converting... </>
                    ) : (
                      <> <FileText className="w-5 h-5 mr-2" /> Convert All </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* File List */}
              <div className="space-y-5">
                <div className="flex justify-between items-end border-b pb-4">
                  <div>
                    <h3 className="font-bold text-2xl text-gray-800">Files</h3>
                    <p className="text-gray-500 text-sm mt-1">Review and convert to PDF</p>
                  </div>
                  {Object.values(results).some(r => r.status === "done") && (
                    <Button variant="outline" size="sm" onClick={downloadAll} className="h-9">
                      <Download className="w-4 h-4 mr-2" /> Download Zip
                    </Button>
                  )}
                </div>

                {files.map((file, idx) => {
                  const res = results[file.name];
                  const preview = previewUrls[file.name];

                  return (
                    <Card key={file.name + idx} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                      <div className="p-4 flex gap-5 items-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden relative border border-gray-200">
                          {preview ? (
                            <img src={preview} className="w-full h-full object-cover" />
                          ) : (
                            <FileImage className="w-8 h-8 text-gray-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold truncate pr-4 text-gray-900 text-lg">{file.name}</h4>

                            <div className="flex gap-2">
                              {res?.status === "done" && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 bg-red-50 hover:bg-red-100" onClick={() => {
                                  const url = URL.createObjectURL(res.blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = file.name.split('.')[0] + ".pdf";
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
                              <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                                PDF Ready ({formatSize(res.size)})
                              </Badge>
                            ) : (
                              <span className="text-gray-400 italic text-xs">Ready to convert</span>
                            )}

                            {res?.status === "error" && (
                              <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
                                Error: {res.error}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      {res?.status === "processing" && (
                        <div className="px-4 pb-4 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-red-600 font-medium">Processing...</span>
                            <span className="text-red-600 font-bold">{Math.round(res.progress || 0)}%</span>
                          </div>
                          <div className="h-2 bg-red-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-600 transition-all duration-300 ease-out"
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
