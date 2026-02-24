import { useState, useCallback, useRef } from "react";
import { useAuth } from "../lib/authContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Select } from "../components/ui/select";
import { cn } from "../lib/utils";
import toast from "react-hot-toast";
import {
  Upload,
  FileText,
  Download,
  Loader2,
  Scissors,
  CheckCircle,
  FileArchive,
} from "lucide-react";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Parse "1-3, 5, 7-10" into [[0,1,2], [4], [6,7,8,9]] (0-based indices), maxPages = 10
function parseCustomRanges(rangeStr, maxPages) {
  if (!rangeStr || !String(rangeStr).trim()) return null;
  const result = [];
  const parts = String(rangeStr).split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes("-")) {
      const [a, b] = trimmed.split("-").map((s) => parseInt(s.trim(), 10));
      if (isNaN(a) || isNaN(b)) continue;
      const start = Math.max(1, Math.min(a, maxPages));
      const end = Math.max(1, Math.min(b, maxPages));
      const indices = [];
      for (let i = start; i <= end; i++) indices.push(i - 1);
      if (indices.length) result.push(indices);
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= maxPages) result.push([p - 1]);
    }
  }
  return result.length ? result : null;
}

const SPLIT_MODE_EVERY_N = "everyN";
const SPLIT_MODE_CUSTOM = "custom";

export default function SplitPdf() {
  const { user, trackUsage } = useAuth();
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(null); // null = loading, 0 = error/unknown, >0 = known
  const [splitMode, setSplitMode] = useState(SPLIT_MODE_EVERY_N);
  const [pagesPerFile, setPagesPerFile] = useState(1);
  const [customRanges, setCustomRanges] = useState(""); // e.g. "1-3, 5, 7-10"
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [zipBlob, setZipBlob] = useState(null);
  const [splitCount, setSplitCount] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) {
      toast.error("File exceeds 50MB limit");
      return;
    }
    if (!selected.type.includes("pdf") && !selected.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a PDF file");
      return;
    }
    setFile(selected);
    setZipBlob(null);
    setProgress(0);
    setPageCount(null); // loading
    setSplitCount(0);
    // Get page count via PDF.js (same engine we use for split, handles images)
    (async () => {
      try {
        let pdfjsLib = typeof window !== "undefined" && window.pdfjsLib;
        if (!pdfjsLib) {
          pdfjsLib = await import("pdfjs-dist/build/pdf.js");
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          if (typeof window !== "undefined") window.pdfjsLib = pdfjsLib;
        }
        const arrayBuffer = await selected.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        setPageCount(pdf.numPages);
      } catch {
        setPageCount(0);
      }
    })();
    e.target.value = "";
  };

  const loadPdfJs = useCallback(async () => {
    if (typeof window !== "undefined" && window.pdfjsLib) return window.pdfjsLib;
    const pdfjsLib = await import("pdfjs-dist/build/pdf.js");
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    if (typeof window !== "undefined") window.pdfjsLib = pdfjsLib;
    return pdfjsLib;
  }, []);

  const splitPdf = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(0);
    setZipBlob(null);

    try {
      const JSZip = (await import("jszip")).default;
      const { PDFDocument } = await import("pdf-lib");
      const pdfjsLib = await loadPdfJs();

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const totalPages = pdf.numPages;
      if (totalPages === 0) {
        toast.error("This PDF has no pages.");
        return;
      }

      const baseName = file.name.replace(/\.[^.]+$/, "");
      const zip = new JSZip();

      let pageGroups; // array of arrays of 0-based page indices
      if (splitMode === SPLIT_MODE_CUSTOM && customRanges.trim()) {
        pageGroups = parseCustomRanges(customRanges, totalPages);
        if (!pageGroups || pageGroups.length === 0) {
          toast.error("Invalid custom ranges. Use e.g. 1-3, 5, 7-10");
          setProcessing(false);
          return;
        }
      } else {
        const numSplits = Math.ceil(totalPages / pagesPerFile);
        pageGroups = [];
        for (let s = 0; s < numSplits; s++) {
          const startPage = s * pagesPerFile;
          const endPage = Math.min(startPage + pagesPerFile, totalPages);
          pageGroups.push(Array.from({ length: endPage - startPage }, (_, i) => startPage + i));
        }
      }

      // Scale for rendering (2 = good quality, preserves images)
      const scale = 2;
      const quality = 0.92;

      for (let i = 0; i < pageGroups.length; i++) {
        const pageIndices = pageGroups[i];
        if (pageIndices.length === 0) continue;

        const newPdf = await PDFDocument.create();

        for (let j = 0; j < pageIndices.length; j++) {
          const pageNum = pageIndices[j] + 1; // pdfjs is 1-based
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport }).promise;

          const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
          const imgBuffer = await blob.arrayBuffer();
          const img = await newPdf.embedJpg(imgBuffer);
          const newPage = newPdf.addPage([img.width, img.height]);
          newPage.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        }

        const pdfBytes = await newPdf.save();
        const partName = pageGroups.length > 1 ? `${baseName}_part${i + 1}.pdf` : `${baseName}.pdf`;
        zip.file(partName, pdfBytes);

        setProgress(Math.round(((i + 1) / pageGroups.length) * 100));
      }

      const outCount = pageGroups.filter((g) => g.length > 0).length;
      const zipBlobOut = await zip.generateAsync({ type: "blob" });
      setZipBlob(zipBlobOut);
      setSplitCount(outCount);
      setProgress(100);
      toast.success(`Split into ${outCount} file(s). Download the ZIP.`);

      if (user && trackUsage) {
        trackUsage("/split-pdf", 1, outCount, {
          tool: "Split PDF",
          filesProcessed: 1,
          outputCount: outCount,
        });
      }
    } catch (error) {
      console.error("Split error:", error);
      const msg = error?.message || "";
      if (msg.includes("password") || msg.includes("encrypt") || msg.includes("Password")) {
        toast.error("This PDF is password-protected. Use PDF Unlock/Protect first to remove the password.");
      } else {
        toast.error("Failed to split PDF: " + (msg || "Unknown error"));
      }
    } finally {
      setProcessing(false);
    }
  }, [file, splitMode, pagesPerFile, customRanges, user, trackUsage, loadPdfJs]);

  const downloadZip = () => {
    if (!zipBlob) return;
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file?.name?.replace(/\.[^.]+$/, "") + "_split.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <SEO
        title="Split PDF - Split PDF by Pages Online Free"
        description="Split a PDF into multiple files by page count. One PDF per page or group pages. Free, client-side, no upload to server."
        keywords="split PDF, split PDF by pages, PDF splitter, divide PDF, extract PDF pages"
        url="/split-pdf"
      />
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Split PDF
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Split one PDF into multiple files by pages. Choose how many pages per output file.
            </p>
          </div>

          <div className="space-y-6">
            {!file && (
              <Card
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all"
              >
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Scissors className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    Choose a PDF file
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    Max 50MB. Processed in your browser.
                  </p>
                  <Button size="lg">Select PDF</Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </CardContent>
              </Card>
            )}

            {file && !zipBlob && (
              <>
                <Card className="border border-slate-200 dark:border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {formatFileSize(file.size)}
                          {pageCount === null && " · Detecting pages…"}
                          {pageCount !== null && pageCount > 0 && ` · ${pageCount} page${pageCount !== 1 ? "s" : ""}`}
                          {pageCount === 0 && " · Could not read pages (try PDF Unlock if protected)"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFile(null);
                          setPageCount(null);
                          setZipBlob(null);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Always show split options when a file is selected */}
                <Card className="border border-slate-200 dark:border-slate-700">
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Split by
                      </label>
                      <div className="flex gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="splitMode"
                            checked={splitMode === SPLIT_MODE_EVERY_N}
                            onChange={() => setSplitMode(SPLIT_MODE_EVERY_N)}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm">Every N pages</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="splitMode"
                            checked={splitMode === SPLIT_MODE_CUSTOM}
                            onChange={() => setSplitMode(SPLIT_MODE_CUSTOM)}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm">Custom ranges</span>
                        </label>
                      </div>

                      {splitMode === SPLIT_MODE_EVERY_N && (
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Pages per output file
                          </label>
                          <Select
                            value={pagesPerFile}
                            onChange={(e) => setPagesPerFile(Number(e.target.value))}
                            placeholder="Select..."
                          >
                            <option value={1}>1 (one PDF per page)</option>
                            {pageCount != null && pageCount > 0 && (
                              <>
                                {[2, 3, 4, 5, 10].filter((n) => n <= pageCount).map((n) => (
                                  <option key={n} value={n}>
                                    {n} pages per file
                                  </option>
                                ))}
                                {pageCount > 10 && (
                                  <option value={pageCount}>All in one file</option>
                                )}
                              </>
                            )}
                          </Select>
                          {pageCount != null && pageCount > 0 && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Result: {Math.ceil(pageCount / pagesPerFile)} PDF file(s)
                            </p>
                          )}
                        </div>
                      )}

                      {splitMode === SPLIT_MODE_CUSTOM && (
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Page ranges (one PDF per range)
                          </label>
                          <input
                            type="text"
                            value={customRanges}
                            onChange={(e) => setCustomRanges(e.target.value)}
                            placeholder="e.g. 1-3, 5, 7-10, 15"
                            className="input-theme placeholder:text-slate-400"
                          />
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Use commas between ranges. Examples: 1-5 (pages 1–5), 1,3,5 (only those pages).
                          </p>
                          {pageCount != null && pageCount > 0 && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              This PDF has {pageCount} page{pageCount !== 1 ? "s" : ""}.
                            </p>
                          )}
                        </div>
                      )}

                      {pageCount === 0 && splitMode === SPLIT_MODE_EVERY_N && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                          Page count unknown. You can still try splitting—we’ll read the PDF when you click Split.
                        </p>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      disabled={processing}
                      onClick={splitPdf}
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Splitting… {progress}%
                        </>
                      ) : (
                        <>
                          <Scissors className="w-5 h-5 mr-2" />
                          Split PDF
                        </>
                      )}
                    </Button>
                    {processing && (
                      <Progress value={progress} className="h-2" />
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {zipBlob && (
              <Card className="border border-slate-200 dark:border-slate-700">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        Split complete
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {splitCount} file(s) in ZIP
                      </p>
                    </div>
                  </div>
                  <Button size="lg" className="w-full" onClick={downloadZip}>
                    <FileArchive className="w-5 h-5 mr-2" />
                    Download ZIP
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => {
                      setFile(null);
                      setZipBlob(null);
                      setPageCount(0);
                      setSplitCount(0);
                    }}
                  >
                    Split another PDF
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
