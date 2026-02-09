import { useState, useCallback, useRef, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useDropzone } from "react-dropzone";
import {
  Loader2, CheckCircle, AlertCircle, FileText, Trash2, Upload,
  Download, RotateCcw, Eye, EyeOff, FileType
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast, { Toaster } from "react-hot-toast";
import { cn } from "@/lib/utils";
import Head from "next/head";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const ACCEPTED_TYPES = {
  "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

// Load html2pdf from CDN to avoid webpack/npm issues
const loadHtml2Pdf = () => {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.html2pdf) {
      resolve(window.html2pdf);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js";
    script.onload = () => resolve(window.html2pdf);
    script.onerror = () => reject(new Error("Failed to load PDF library"));
    document.head.appendChild(script);
  });
};

export default function DocToPdf() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState(null);
  const [totalUploads, setTotalUploads] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [parsedDocs, setParsedDocs] = useState({});
  const [previewOpen, setPreviewOpen] = useState({});
  const previewRefs = useRef({});

  // Preload html2pdf
  useEffect(() => {
    loadHtml2Pdf().catch(() => {});
  }, []);

  const resetAll = () => {
    setFiles([]);
    setResults({});
    setParsedDocs({});
    setPreviewOpen({});
    setTotalCompleted(0);
    setTotalUploads(0);
    setProcessing(false);
    setProcessingFile(null);
  };

  const handleFilesAdded = (newFiles) => {
    if (files.length + newFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} documents allowed at a time.`);
      return;
    }

    const oversized = [];
    const valid = [];

    newFiles.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        oversized.push(file.name);
      } else {
        valid.push(file);
      }
    });

    if (oversized.length > 0) {
      toast.error(`${oversized.join(", ")} exceed${oversized.length > 1 ? "" : "s"} 20MB limit`);
    }

    if (valid.length === 0) return;

    setFiles((prev) => [...prev, ...valid]);
    setTotalUploads((prev) => prev + valid.length);

    // Parse each file
    valid.forEach((file) => parseDocument(file));
  };

  const parseDocument = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-document", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Parse failed");
      }

      const data = await response.json();
      setParsedDocs((prev) => ({
        ...prev,
        [file.name + file.lastModified]: data,
      }));
    } catch (error) {
      console.error("Parse error:", error);
      setParsedDocs((prev) => ({
        ...prev,
        [file.name + file.lastModified]: { error: error.message },
      }));
    }
  };

  const getFileKey = (file) => file.name + file.lastModified;

  const convertToPdf = async (file) => {
    const key = getFileKey(file);
    const parsed = parsedDocs[key];

    if (!parsed || parsed.error) {
      throw new Error(parsed?.error || "Document not parsed yet");
    }

    try {
      const html2pdf = await loadHtml2Pdf();

      // Create a visible container (must be in the visible DOM for html2canvas)
      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.top = "0";
      wrapper.style.left = "0";
      wrapper.style.width = "210mm";
      wrapper.style.zIndex = "-9999";
      wrapper.style.opacity = "0";
      wrapper.style.pointerEvents = "none";
      wrapper.style.overflow = "hidden";

      const container = document.createElement("div");
      container.style.width = "210mm";
      container.style.padding = "20mm";
      container.style.background = "white";
      container.style.color = "#333";
      container.style.fontFamily = "'Times New Roman', serif";
      container.style.fontSize = "12pt";
      container.style.lineHeight = "1.6";
      container.innerHTML = parsed.html;

      wrapper.appendChild(container);
      document.body.appendChild(wrapper);

      // Wait for DOM to render
      await new Promise((resolve) => setTimeout(resolve, 300));

      const opt = {
        margin: [10, 15, 10, 15],
        filename: file.name.replace(/\.[^.]+$/, "") + ".pdf",
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          width: container.scrollWidth,
          height: container.scrollHeight,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      };

      const pdfBlob = await html2pdf()
        .set(opt)
        .from(container)
        .toPdf()
        .get("pdf")
        .then((pdf) => {
          return pdf.output("blob");
        });

      document.body.removeChild(wrapper);

      return pdfBlob;
    } catch (error) {
      console.error("PDF conversion error:", error);
      // Clean up if error
      const leftover = document.querySelector('[style*="z-index: -9999"]');
      if (leftover) leftover.remove();
      throw new Error("Failed to convert to PDF: " + error.message);
    }
  };

  const convertAll = async () => {
    if (files.length === 0) {
      toast.error("Please upload documents first");
      return;
    }

    setProcessing(true);
    setTotalCompleted(0);
    let completed = 0;

    for (const file of files) {
      const key = getFileKey(file);

      // Skip already completed
      if (results[key]?.status === "done") {
        completed++;
        continue;
      }

      setProcessingFile(file.name);
      setResults((prev) => ({
        ...prev,
        [key]: { status: "processing" },
      }));

      try {
        const pdfBlob = await convertToPdf(file);
        completed++;
        setTotalCompleted(completed);
        setResults((prev) => ({
          ...prev,
          [key]: {
            status: "done",
            blob: pdfBlob,
            size: pdfBlob.size,
            name: file.name.replace(/\.[^.]+$/, "") + ".pdf",
          },
        }));
      } catch (error) {
        setResults((prev) => ({
          ...prev,
          [key]: { status: "error", error: error.message },
        }));
      }
    }

    setProcessing(false);
    setProcessingFile(null);
    if (completed > 0) {
      toast.success(`${completed} document${completed > 1 ? "s" : ""} converted to PDF!`);
    }
  };

  const downloadPdf = (key) => {
    const result = results[key];
    if (!result?.blob) return;

    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    Object.keys(results).forEach((key) => {
      if (results[key]?.status === "done") {
        downloadPdf(key);
      }
    });
  };

  const removeFile = (index) => {
    const file = files[index];
    const key = getFileKey(file);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResults((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setParsedDocs((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setPreviewOpen((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setTotalUploads((prev) => Math.max(0, prev - 1));
  };

  const resetFileResult = (index) => {
    const file = files[index];
    const key = getFileKey(file);
    setResults((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const togglePreview = (key) => {
    setPreviewOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.toLowerCase().split(".").pop();
    if (ext === "docx" || ext === "doc") return "📄";
    if (ext === "txt") return "📝";
    return "📁";
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFilesAdded,
    accept: ACCEPTED_TYPES,
    maxFiles: MAX_FILES,
  });

  const completedResults = Object.values(results).filter((r) => r.status === "done").length;
  const progress = files.length > 0 ? (completedResults / files.length) * 100 : 0;

  return (
    <>
      <Head>
        <title>Document to PDF - ConvertMastery</title>
        <meta name="description" content="Convert TXT and DOCX documents to PDF for free. Fast, accurate, and easy to use." />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <Toaster position="top-center" />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Document to PDF Converter
            </h1>
            <p className="text-gray-500">
              Convert your TXT and DOCX files to PDF format with preserved formatting
            </p>
          </div>

          {/* Upload + Stats Row */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Upload Zone */}
            <div className="flex-1">
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
                  isDragActive
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 hover:border-green-400 hover:bg-green-50/50"
                )}
              >
                <input {...getInputProps()} />
                <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                <p className="text-lg font-medium text-gray-600">
                  {isDragActive ? "Drop documents here..." : "Drag & drop documents here"}
                </p>
                <p className="text-sm text-gray-400 mt-1">or click to browse</p>
                <p className="text-xs text-gray-400 mt-2">
                  Supported: TXT, DOCX • Max {MAX_FILES} files • Max 20MB each
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-row md:flex-col gap-3 md:w-48">
              <Card className="flex-1">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Uploaded</p>
                  <p className="text-2xl font-bold text-gray-800">{totalUploads}</p>
                </CardContent>
              </Card>
              <Card className="flex-1">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{totalCompleted}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6">
              <Button
                onClick={convertAll}
                disabled={processing || files.length === 0}
                className="bg-green-700 hover:bg-green-800 text-white px-6"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Converting {processingFile}...
                  </>
                ) : (
                  "Convert All to PDF"
                )}
              </Button>

              {completedResults > 0 && (
                <Button
                  onClick={downloadAll}
                  variant="outline"
                  className="border-green-600 text-green-700 hover:bg-green-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download All ({completedResults})
                </Button>
              )}

              <Button onClick={resetAll} variant="outline" className="text-gray-600">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset All
              </Button>
            </div>
          )}

          {/* Progress Bar */}
          {processing && (
            <div className="mb-6">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-gray-500 mt-1 text-center">
                {completedResults} of {files.length} completed
              </p>
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Uploaded Documents</h2>
              <div className="space-y-3">
                {files.map((file, index) => {
                  const key = getFileKey(file);
                  const result = results[key];
                  const parsed = parsedDocs[key];
                  const isPreviewOpen = previewOpen[key];

                  return (
                    <Card
                      key={key}
                      className={cn(
                        "overflow-hidden transition-all",
                        result?.status === "done" && "border-green-200 bg-green-50/30",
                        result?.status === "error" && "border-red-200 bg-red-50/30",
                        result?.status === "processing" && "border-blue-200 bg-blue-50/30"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* File Icon */}
                          <div className="text-3xl flex-shrink-0">
                            {getFileIcon(file.name)}
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{file.name}</p>
                            <p className="text-sm text-gray-500">
                              {(file.size / 1024).toFixed(2)} KB
                              {file.name.toLowerCase().endsWith(".docx") && (
                                <span className="ml-2 text-blue-500">DOCX</span>
                              )}
                              {file.name.toLowerCase().endsWith(".txt") && (
                                <span className="ml-2 text-gray-500">TXT</span>
                              )}
                            </p>
                            {parsed?.error && (
                              <p className="text-xs text-red-500 mt-1">Parse error: {parsed.error}</p>
                            )}
                            {result?.status === "error" && (
                              <p className="text-xs text-red-500 mt-1">{result.error}</p>
                            )}
                            {result?.status === "done" && (
                              <p className="text-xs text-green-600 mt-1">
                                PDF size: {(result.size / 1024).toFixed(2)} KB
                              </p>
                            )}
                          </div>

                          {/* Status & Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {result?.status === "processing" && (
                              <Badge className="bg-blue-100 text-blue-700">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Converting
                              </Badge>
                            )}
                            {result?.status === "done" && (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Done
                              </Badge>
                            )}
                            {result?.status === "error" && (
                              <Badge className="bg-red-100 text-red-700">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Error
                              </Badge>
                            )}

                            {/* Preview Button */}
                            {parsed && !parsed.error && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => togglePreview(key)}
                                title={isPreviewOpen ? "Hide preview" : "Show preview"}
                              >
                                {isPreviewOpen ? (
                                  <EyeOff className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-500" />
                                )}
                              </Button>
                            )}

                            {/* Download */}
                            {result?.status === "done" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => downloadPdf(key)}
                                title="Download PDF"
                              >
                                <Download className="h-4 w-4 text-green-600" />
                              </Button>
                            )}

                            {/* Reset */}
                            {result && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => resetFileResult(index)}
                                title="Reset"
                              >
                                <RotateCcw className="h-4 w-4 text-gray-500" />
                              </Button>
                            )}

                            {/* Remove */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFile(index)}
                              title="Remove"
                              disabled={processing}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>

                        {/* Preview */}
                        {isPreviewOpen && parsed && !parsed.error && (
                          <>
                            <Separator className="my-3" />
                            <div className="max-h-64 overflow-y-auto border rounded-lg p-4 bg-white">
                              <div
                                dangerouslySetInnerHTML={{ __html: parsed.html }}
                                className="prose prose-sm max-w-none"
                              />
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {files.length === 0 && (
            <div className="text-center py-16">
              <FileType className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-500">No documents uploaded</h3>
              <p className="text-gray-400 mt-1">Upload TXT or DOCX files to convert them to PDF</p>
            </div>
          )}

          {/* Info Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto text-green-600 mb-3" />
                <h3 className="font-semibold mb-2">TXT Files</h3>
                <p className="text-sm text-gray-500">
                  Convert plain text files to well-formatted PDFs with clean typography
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2">DOCX Files</h3>
                <p className="text-sm text-gray-500">
                  Convert Word documents with formatting, headings, lists, and tables preserved
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Download className="h-8 w-8 mx-auto text-purple-600 mb-3" />
                <h3 className="font-semibold mb-2">Instant Download</h3>
                <p className="text-sm text-gray-500">
                  Download individual PDFs or all at once after conversion
                </p>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}

