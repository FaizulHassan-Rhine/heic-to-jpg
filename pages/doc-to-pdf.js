import { useState, useRef, useEffect } from "react";
import { useAuth } from "../lib/authContext";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import Dropzone from "../components/Dropzone";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
import {
  Loader2, CheckCircle, AlertCircle, FileText, Trash2,
  Download, RotateCcw, Eye, EyeOff, FileType, Settings2, ArrowRight, Image as ImageIcon
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useSettings } from "../lib/useSettings";
import { formatMaxMb } from "../lib/formatMaxMb";

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
  const { user, trackUsage } = useAuth();
  const { settings } = useSettings();
  const maxFiles = settings?.document?.maxFiles || 10;
  const maxFileSize = settings?.document?.maxSize || 20 * 1024 * 1024;
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState(null);
  const [totalUploads, setTotalUploads] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [parsedDocs, setParsedDocs] = useState({});
  const [previewOpen, setPreviewOpen] = useState({});
  const previewRefs = useRef({});
  
  // PDF Settings
  const [pageSize, setPageSize] = useState("a4"); // a4, letter, legal
  const [orientation, setOrientation] = useState("portrait"); // portrait, landscape
  const [margins, setMargins] = useState({ top: 15, right: 15, bottom: 15, left: 15 }); // in mm

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
    if (files.length + newFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} documents allowed at a time.`);
      return;
    }

    const oversized = [];
    const valid = [];

    newFiles.forEach((file) => {
      if (file.size > maxFileSize) {
        oversized.push(file.name);
      } else {
        valid.push(file);
      }
    });

    if (oversized.length > 0) {
      toast.error(`${oversized.join(", ")} exceed${oversized.length > 1 ? "" : "s"} ${formatMaxMb(maxFileSize)}MB limit`);
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

      // Page size mapping
      const pageSizeMap = {
        a4: [210, 297],
        letter: [216, 279],
        legal: [216, 356],
      };
      
      const [width, height] = pageSizeMap[pageSize] || pageSizeMap.a4;
      const finalWidth = orientation === "landscape" ? height : width;
      const finalHeight = orientation === "landscape" ? width : height;

      const opt = {
        margin: [margins.top, margins.right, margins.bottom, margins.left],
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
        jsPDF: { 
          unit: "mm", 
          format: [finalWidth, finalHeight], 
          orientation: orientation 
        },
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
    const processedFiles = [];

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
        [key]: { status: "processing", progress: 0 },
      }));

      // Simulate progress
      const progressInterval = setInterval(() => {
        setResults(prev => {
          const current = prev[key]?.progress || 0;
          if (current < 90) {
            return {
              ...prev,
              [key]: { ...prev[key], progress: Math.min(current + Math.random() * 15, 90) }
            };
          }
          return prev;
        });
      }, 150);

      try {
        const pdfBlob = await convertToPdf(file);
        clearInterval(progressInterval);
        completed++;
        setTotalCompleted(completed);
        const outputName = file.name.replace(/\.[^.]+$/, "") + ".pdf";
        setResults((prev) => ({
          ...prev,
          [key]: {
            status: "done",
            blob: pdfBlob,
            size: pdfBlob.size,
            name: outputName,
            progress: 100,
          },
        }));
        
        // Collect file information
        const inputExt = file.name.split('.').pop()?.toLowerCase() || '';
        processedFiles.push({
          inputName: file.name,
          inputSize: file.size,
          inputFormat: inputExt,
          outputName: outputName,
          outputSize: pdfBlob.size,
          outputFormat: "pdf",
        });
        
        // Reset progress after showing 100%
        setTimeout(() => {
          setResults(prev => ({
            ...prev,
            [key]: { ...prev[key], progress: undefined }
          }));
        }, 300);
      } catch (error) {
        setResults((prev) => ({
          ...prev,
          [key]: { status: "error", error: error.message },
        }));
      }
    }

    // Track usage after all conversions complete
    if (completed > 0 && user && trackUsage) {
      trackUsage("/doc-to-pdf", completed, completed, {
        tool: "Doc to PDF",
        filesProcessed: completed,
      }, processedFiles);
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

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const completedResults = Object.values(results).filter((r) => r.status === "done").length;
  const progress = files.length > 0 ? (completedResults / files.length) * 100 : 0;

  return (
    <>
<ToolPageShell containerClassName="max-w-6xl">
          {/* Header */}
          <ToolPageHeader
          title="Document to PDF"
          description="Convert your TXT and DOCX files to PDF format with preserved formatting."
        />

          <div className="grid gap-8">
            {/* Upload */}
            <CollapsibleDropzone
              files={files}
              setFiles={handleFilesAdded}
              title="Upload Documents to Convert"
              description="TXT, DOCX"
              limitsText={`Max ${maxFiles} files • Max ${formatMaxMb(maxFileSize)}MB each`}
              accept={ACCEPTED_TYPES}
              maxFiles={maxFiles}
              currentFileCount={files.length}
            />

            {/* Workspace */}
            {files.length > 0 && (
              <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-start">

                {/* Sidebar: Settings */}
                <Card className="lg:sticky lg:top-24 h-fit border-0 shadow-lg ring-1 ring-gray-100">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-center gap-2 font-bold text-xl text-foreground">
                      <Settings2 className="w-6 h-6 text-primary" /> Settings
                    </div>

                    {/* Page Size */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Page Size</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "a4", label: "A4" },
                          { id: "letter", label: "Letter" },
                          { id: "legal", label: "Legal" },
                        ].map((size) => (
                          <button
                            key={size.id}
                            onClick={() => setPageSize(size.id)}
                            disabled={processing}
                            className={cn(
                              "p-2 rounded-lg border text-sm font-medium transition-all",
                              pageSize === size.id
                                ? "bg-brand-sky/50 border-brand-mid/30 text-brand-navy ring-1 ring-brand-mid/40"
                                : "bg-card border-border text-muted-foreground hover:bg-muted/40"
                            )}
                          >
                            {size.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Orientation */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Orientation</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "portrait", label: "Portrait", icon: "📄" },
                          { id: "landscape", label: "Landscape", icon: "📄" },
                        ].map((orient) => (
                          <button
                            key={orient.id}
                            onClick={() => setOrientation(orient.id)}
                            disabled={processing}
                            className={cn(
                              "p-3 rounded-lg border text-sm font-medium transition-all",
                              orientation === orient.id
                                ? "bg-brand-sky/50 border-brand-mid/30 text-brand-navy ring-1 ring-brand-mid/40"
                                : "bg-card border-border text-muted-foreground hover:bg-muted/40"
                            )}
                          >
                            <div className="text-lg mb-1">{orient.icon}</div>
                            {orient.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Margins */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">Margins (mm)</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: "top", label: "Top" },
                          { key: "right", label: "Right" },
                          { key: "bottom", label: "Bottom" },
                          { key: "left", label: "Left" },
                        ].map(({ key, label }) => (
                          <div key={key} className="space-y-1">
                            <label className="text-xs text-muted-foreground">{label}</label>
                            <input
                              type="number"
                              min="0"
                              max="50"
                              value={margins[key]}
                              onChange={(e) =>
                                setMargins((prev) => ({
                                  ...prev,
                                  [key]: parseInt(e.target.value) || 0,
                                }))
                              }
                              disabled={processing}
                              className="w-full px-2 py-1 text-sm border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <Button
                      onClick={convertAll}
                      disabled={processing || files.length === 0}
                      className="w-full bg-gradient-to-r from-primary to-brand-navy hover:from-brand-navy hover:to-brand-navy text-white h-12 shadow-lg hover:shadow-xl transition-all font-semibold text-base"
                    >
                      {processing ? (
                        <> <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Converting... </>
                      ) : (
                        <> <FileText className="w-5 h-5 mr-2" /> Convert All </>
                      )}
                    </Button>

                    {completedResults > 0 && (
                      <Button
                        onClick={downloadAll}
                        variant="outline"
                        className="w-full border-primary text-brand-navy hover:bg-brand-sky/50"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download All ({completedResults})
                      </Button>
                    )}

                    <Button onClick={resetAll} variant="outline" className="w-full text-muted-foreground">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset All
                    </Button>

                    {/* Progress */}
                    {processing && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Progress</span>
                          <span>{completedResults}/{files.length}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* File List */}
                <div className="space-y-5">
                  {/* Header with Stats */}
                  <Card className="border border-border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-xl text-foreground flex items-center gap-2">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          Files
                        </h3>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium">Total:</span>
                          <Badge variant="secondary" className="font-semibold">
                            {files.length}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium">Completed:</span>
                          <Badge className="bg-brand-sky text-brand-navy hover:bg-brand-sky border-brand-mid/30 font-semibold">
                            {completedResults}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium">Processing:</span>
                          <Badge className="bg-brand-sky text-brand-navy hover:bg-brand-sky border-brand-mid/30 font-semibold">
                            {Object.values(results).filter(r => r.status === "processing").length}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {files.map((file, index) => {
                    const key = getFileKey(file);
                    const result = results[key];
                    const parsed = parsedDocs[key];
                    const isPreviewOpen = previewOpen[key];

                    return (
                      <Card
                        key={key}
                        className="overflow-hidden border border-border shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="p-4 flex gap-5 items-center">
                          {/* File Icon */}
                          <div className="w-16 h-16 bg-brand-sky/50 rounded-xl flex items-center justify-center flex-shrink-0 border border-brand-mid/30">
                            <FileText className="w-8 h-8 text-brand-mid" />
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex justify-between items-start">
                              <h4 className="font-semibold truncate pr-4 text-foreground text-lg">{file.name}</h4>

                              <div className="flex gap-2">
                                {/* Preview Button */}
                                {parsed && !parsed.error && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    onClick={() => togglePreview(key)}
                                    title={isPreviewOpen ? "Hide preview" : "Show preview"}
                                  >
                                    {isPreviewOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </Button>
                                )}

                                {/* Download */}
                                {result?.status === "done" && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-primary bg-brand-sky/50 hover:bg-brand-sky"
                                    onClick={() => downloadPdf(key)}
                                    title="Download PDF"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                )}

                                {/* Remove */}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                  onClick={() => removeFile(index)}
                                  title="Remove"
                                  disabled={processing}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <Badge variant="secondary" className="bg-muted text-muted-foreground border-border font-mono">
                                {formatSize(file.size)}
                              </Badge>

                              {parsed?.error && (
                                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
                                  Parse error
                                </Badge>
                              )}

                              {result?.status === "done" && (
                                <>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                                  <Badge className="bg-brand-sky text-brand-navy border-brand-mid/30 hover:bg-brand-sky font-mono">
                                    {formatSize(result.size)}
                                  </Badge>
                                  <Badge variant="outline" className="border-brand-mid/30 text-brand-navy uppercase">
                                    PDF
                                  </Badge>
                                </>
                              )}

                              {result?.status === "error" && (
                                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
                                  {result.error || "Error"}
                                </Badge>
                              )}

                              {!result && !parsed?.error && (
                                <span className="text-muted-foreground italic text-xs">Ready to convert</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Preview */}
                        {isPreviewOpen && parsed && !parsed.error && (
                          <div className="px-4 pb-4">
                            <Separator className="mb-3" />
                            <div className="max-h-64 overflow-y-auto border rounded-lg p-4 bg-card">
                              <div
                                dangerouslySetInnerHTML={{ __html: parsed.html }}
                                className="prose prose-sm max-w-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* Processing Progress */}
                        {result?.status === "processing" && (
                          <div className="px-4 pb-4 space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-primary font-medium">Processing...</span>
                              <span className="text-primary font-bold">{Math.round(result.progress || 0)}%</span>
                            </div>
                            <div className="h-2 bg-brand-sky rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-brand-navy transition-all duration-300 ease-out"
                                style={{ width: `${result.progress || 0}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
    </ToolPageShell>
    </>
  );
}

