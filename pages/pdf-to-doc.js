import { useState, useRef } from "react";
import { useAuth } from "../lib/authContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Dropzone from "../components/Dropzone";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
import {
  Loader2, CheckCircle, AlertCircle, FileText, Trash2, Upload,
  Download, RotateCcw, Eye, EyeOff, FileType, Copy, ArrowRight,
  Settings2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import Head from "next/head";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const RENDER_SCALE = 2;

const formatSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Load pdfjs-dist in browser only
let pdfjsLib = null;
const getPdfJs = async () => {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import("pdfjs-dist/build/pdf.js");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  return pdfjsLib;
};

export default function PdfToDoc() {
  const { user, trackUsage } = useAuth();
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState(null);
  const [outputFormat, setOutputFormat] = useState("docx");
  const [parsedDocs, setParsedDocs] = useState({});
  const [previewOpen, setPreviewOpen] = useState({});
  const [pageRanges, setPageRanges] = useState({}); // { [fileKey]: "1-5,10-15" }

  const getFileKey = (file) => file.name + file.size + file.lastModified;

  // ── File Handling ──

  const handleFilesAdded = (newFiles) => {
    if (files.length + newFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} PDFs allowed.`);
      return;
    }

    const valid = [];
    newFiles.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" is too large (>20MB)`);
      } else if (!file.name.toLowerCase().endsWith(".pdf")) {
        toast.error(`"${file.name}" — only PDF files accepted`);
      } else {
        valid.push(file);
      }
    });

    if (valid.length === 0) return;
    setFiles((prev) => [...prev, ...valid]);
    valid.forEach((file) => parsePdfClientSide(file));
  };

  const removeFile = (name) => {
    const file = files.find((f) => f.name === name);
    if (file) {
      const key = getFileKey(file);
      setResults((prev) => { const n = { ...prev }; delete n[key]; return n; });
      setParsedDocs((prev) => { const n = { ...prev }; delete n[key]; return n; });
      setPreviewOpen((prev) => { const n = { ...prev }; delete n[key]; return n; });
    }
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  // ─── Client-side PDF parsing ───
  const parsePdfClientSide = async (file) => {
    const key = getFileKey(file);
    try {
      const pdfjs = await getPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const numPages = pdf.numPages;

      let fullText = "";
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const lines = {};
        textContent.items.forEach((item) => {
          const y = Math.round(item.transform[5]);
          if (!lines[y]) lines[y] = [];
          lines[y].push({ x: item.transform[4], str: item.str });
        });
        const sortedYs = Object.keys(lines).sort((a, b) => b - a);
        for (const y of sortedYs) {
          const lineItems = lines[y].sort((a, b) => a.x - b.x);
          fullText += lineItems.map((item) => item.str).join(" ") + "\n";
        }
        fullText += "\n";
      }

      setParsedDocs((prev) => ({
        ...prev,
        [key]: { numPages, text: fullText.trim() },
      }));
    } catch (error) {
      console.error("Client PDF parse error:", error);
      setParsedDocs((prev) => ({ ...prev, [key]: { error: error.message } }));
    }
  };

  // ─── Render a single PDF page to JPEG via canvas ───
  const renderPageToImage = async (pdf, pageNum) => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    const arrayBuffer = await blob.arrayBuffer();
    return { data: new Uint8Array(arrayBuffer), width: viewport.width, height: viewport.height };
  };

  // ─── Convert to TXT ───
  const convertToTxt = async (file) => {
    const key = getFileKey(file);
    const parsed = parsedDocs[key];
    if (!parsed || parsed.error) throw new Error(parsed?.error || "Not parsed yet");
    
    // If page range is specified, extract only those pages
    const rangeStr = pageRanges[key] || "";
    if (rangeStr.trim() !== "") {
      const pdfjs = await getPdfJs();
      const freshBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(freshBuffer) }).promise;
      const numPages = pdf.numPages;
      const pagesToConvert = parsePageRange(rangeStr, numPages);
      
      let extractedText = "";
      for (const pageNum of pagesToConvert) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const lines = {};
        textContent.items.forEach((item) => {
          const y = Math.round(item.transform[5]);
          if (!lines[y]) lines[y] = [];
          lines[y].push({ x: item.transform[4], str: item.str });
        });
        const sortedYs = Object.keys(lines).sort((a, b) => b - a);
        for (const y of sortedYs) {
          const lineItems = lines[y].sort((a, b) => a.x - b.x);
          extractedText += lineItems.map((item) => item.str).join(" ") + "\n";
        }
        extractedText += "\n";
      }
      const blob = new Blob([extractedText.trim()], { type: "text/plain;charset=utf-8" });
      return { blob, name: file.name.replace(/\.pdf$/i, "") + ".txt" };
    }
    
    const blob = new Blob([parsed.text || ""], { type: "text/plain;charset=utf-8" });
    return { blob, name: file.name.replace(/\.pdf$/i, "") + ".txt" };
  };

  // Parse page range string like "1-5,10-15" into array of page numbers
  const parsePageRange = (rangeStr, maxPages) => {
    if (!rangeStr || rangeStr.trim() === "") {
      return Array.from({ length: maxPages }, (_, i) => i + 1);
    }
    const pages = new Set();
    const parts = rangeStr.split(",");
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [start, end] = trimmed.split("-").map((s) => parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
            pages.add(i);
          }
        }
      } else {
        const page = parseInt(trimmed);
        if (!isNaN(page) && page >= 1 && page <= maxPages) {
          pages.add(page);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  // ─── Convert to DOCX with page images ───
  const convertToDocx = async (file) => {
    const key = getFileKey(file);
    const parsed = parsedDocs[key];
    if (!parsed || parsed.error) throw new Error(parsed?.error || "Not parsed yet");

    const pdfjs = await getPdfJs();
    const freshBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(freshBuffer) }).promise;
    const numPages = pdf.numPages;
    
    // Get page range for this file
    const rangeStr = pageRanges[key] || "";
    const pagesToConvert = parsePageRange(rangeStr, numPages);

    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    const imageRels = [];
    const bodyXml = [];

    for (let idx = 0; idx < pagesToConvert.length; idx++) {
      const pageNum = pagesToConvert[idx];
      toast.loading(`Rendering page ${idx + 1}/${pagesToConvert.length}...`, { id: "render-progress" });
      const img = await renderPageToImage(pdf, pageNum);
      const imgFileName = `image${idx + 1}.jpeg`;
      const rId = `rId${idx + 2}`;
      zip.folder("word").folder("media").file(imgFileName, img.data);
      imageRels.push(`<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imgFileName}"/>`);
      const maxWidthEmu = 5486400;
      const aspectRatio = img.height / img.width;
      const cxEmu = maxWidthEmu;
      const cyEmu = Math.round(maxWidthEmu * aspectRatio);
      bodyXml.push(`<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cxEmu}" cy="${cyEmu}"/><wp:docPr id="${idx + 1}" name="Page ${pageNum}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${idx + 1}" name="Page ${pageNum}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cxEmu}" cy="${cyEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`);
      if (idx < pagesToConvert.length - 1) {
        bodyXml.push(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`);
      }
    }
    toast.dismiss("render-progress");

    zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
    zip.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.folder("word").folder("_rels").file("document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${imageRels.join("")}</Relationships>`);
    zip.folder("word").file("document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${bodyXml.join("")}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`);

    const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    return { blob, name: file.name.replace(/\.pdf$/i, "") + ".docx" };
  };

  // ─── Convert All ───
  const convertAll = async () => {
    if (files.length === 0) {
      toast.error("Please upload PDFs first");
      return;
    }

    const unparsed = files.filter((f) => {
      const p = parsedDocs[getFileKey(f)];
      return !p || p.error;
    });
    if (unparsed.length > 0) {
      toast.error("Some files are still parsing or have errors.");
      return;
    }

    setProcessing(true);
    const processedFiles = [];

    for (const file of files) {
      const key = getFileKey(file);
      if (results[key]?.status === "done") continue;

      setProcessingFile(file.name);
      setResults((prev) => ({ ...prev, [key]: { status: "processing", progress: 0 } }));

      try {
        let result;
        if (outputFormat === "txt") {
          // Simulate progress for TXT
          const progressInterval = setInterval(() => {
            setResults(prev => {
              const current = prev[key]?.progress || 0;
              if (current < 90) {
                return {
                  ...prev,
                  [key]: { ...prev[key], progress: Math.min(current + Math.random() * 20, 90) }
                };
              }
              return prev;
            });
          }, 100);
          result = await convertToTxt(file);
          clearInterval(progressInterval);
        } else {
          // For DOCX, update progress during page rendering
          const progressInterval = setInterval(() => {
            setResults(prev => {
              const current = prev[key]?.progress || 0;
              if (current < 90) {
                return {
                  ...prev,
                  [key]: { ...prev[key], progress: Math.min(current + Math.random() * 10, 90) }
                };
              }
              return prev;
            });
          }, 200);
          result = await convertToDocx(file);
          clearInterval(progressInterval);
        }

        setResults((prev) => ({
          ...prev,
          [key]: { status: "done", blob: result.blob, size: result.blob.size, name: result.name, progress: 100 },
        }));
        
        // Collect file information
        processedFiles.push({
          inputName: file.name,
          inputSize: file.size,
          inputFormat: "pdf",
          outputName: result.name,
          outputSize: result.blob.size,
          outputFormat: outputFormat,
        });
        
        // Reset progress after showing 100%
        setTimeout(() => {
          setResults(prev => ({
            ...prev,
            [key]: { ...prev[key], progress: undefined }
          }));
        }, 300);
      } catch (error) {
        console.error("Convert error:", error);
        setResults((prev) => ({ ...prev, [key]: { status: "error", error: error.message } }));
      }
    }

    const completed = processedFiles.length;
    
    // Track usage after all conversions complete
    if (completed > 0 && user && trackUsage) {
      trackUsage("/pdf-to-doc", completed, completed, {
        tool: "PDF to DOCX/TXT",
        filesProcessed: completed,
      }, processedFiles);
    }

    setProcessing(false);
    setProcessingFile(null);
    if (completed > 0) {
      toast.success("Conversion complete!");
    }
  };

  const downloadFile = (key) => {
    const result = results[key];
    if (!result?.blob) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    Object.keys(results).forEach((key) => {
      if (results[key]?.status === "done") downloadFile(key);
    });
  };

  const copyText = (key) => {
    const parsed = parsedDocs[key];
    if (!parsed?.text) return;
    navigator.clipboard.writeText(parsed.text);
    toast.success("Text copied to clipboard!");
  };

  const togglePreview = (key) => {
    setPreviewOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetAll = () => {
    setFiles([]);
    setResults({});
    setParsedDocs({});
    setPreviewOpen({});
    setProcessing(false);
    setProcessingFile(null);
  };

  const completedCount = Object.values(results).filter((r) => r.status === "done").length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Head>
        <title>PDF to DOCX/TXT - ConvertMastery</title>
        <meta name="description" content="Convert PDF files to DOCX or TXT. Extracts text and images preserving layout." />
      </Head>
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
            PDF to DOCX / TXT
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Convert PDFs to Word with images preserved, or extract plain text.
          </p>
        </div>

        <div className="grid gap-8">
          {/* Upload Dropzone */}
          <CollapsibleDropzone
            files={files}
            setFiles={handleFilesAdded}
            accept={{ "application/pdf": [".pdf"] }}
            title="Upload PDF Files"
            description="PDF only • Max 10 files • Max 20MB each"
            borderColor="border-gray-300"
            hoverColor="hover:border-emerald-500"
          />

          {/* Workspace: Sidebar + File List */}
          {files.length > 0 && (
            <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-start">

              {/* Settings Sidebar */}
              <Card className="lg:sticky lg:top-24 h-fit border-0 shadow-lg ring-1 ring-gray-100">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
                    <Settings2 className="w-6 h-6 text-emerald-600" /> Output Settings
                  </div>

                  {/* Output Format */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Output Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setOutputFormat("docx")}
                        disabled={processing}
                        className={cn(
                          "p-3 rounded-lg transition-all font-medium border text-center",
                          outputFormat === "docx"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <FileType className={cn("w-5 h-5 mx-auto mb-1", outputFormat === "docx" ? "text-emerald-600" : "text-gray-400")} />
                        <div className="font-semibold text-sm">DOCX</div>
                        <div className="text-[10px] opacity-70 font-normal">With images</div>
                      </button>
                      <button
                        onClick={() => setOutputFormat("txt")}
                        disabled={processing}
                        className={cn(
                          "p-3 rounded-lg transition-all font-medium border text-center",
                          outputFormat === "txt"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <FileText className={cn("w-5 h-5 mx-auto mb-1", outputFormat === "txt" ? "text-emerald-600" : "text-gray-400")} />
                        <div className="font-semibold text-sm">TXT</div>
                        <div className="text-[10px] opacity-70 font-normal">Text only</div>
                      </button>
                    </div>
                  </div>

                  <Separator />

                  <Button
                    onClick={convertAll}
                    disabled={processing || files.length === 0}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white h-12 shadow-lg hover:shadow-xl transition-all font-semibold text-base"
                  >
                    {processing ? (
                      <> <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Converting... </>
                    ) : (
                      <> <FileText className="w-5 h-5 mr-2" /> Convert All </>
                    )}
                  </Button>

                  <Button
                    onClick={resetAll}
                    variant="outline"
                    className="w-full text-gray-500"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Reset All
                  </Button>
                </CardContent>
              </Card>

              {/* File List */}
              <div className="space-y-5">
                <div className="flex justify-between items-end border-b pb-4">
                  <div>
                    <h3 className="font-bold text-2xl text-gray-800">Files</h3>
                    <p className="text-gray-500 text-sm mt-1">PDFs to convert to {outputFormat.toUpperCase()}</p>
                  </div>
                  {completedCount > 0 && (
                    <Button variant="outline" size="sm" onClick={downloadAll} className="h-9">
                      <Download className="w-4 h-4 mr-2" /> Download All ({completedCount})
                    </Button>
                  )}
                </div>

                {files.map((file, idx) => {
                  const key = getFileKey(file);
                  const res = results[key];
                  const parsed = parsedDocs[key];
                  const isParsing = !parsed;
                  const isPreviewOpen = previewOpen[key];

                  return (
                    <Card key={key} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                      <div className="p-4 flex gap-5 items-center">
                        {/* Icon */}
                        <div className="w-16 h-16 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-emerald-100">
                          <FileText className="w-8 h-8 text-emerald-400" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold truncate pr-4 text-gray-900 text-lg">{file.name}</h4>

                            <div className="flex gap-1">
                              {parsed && !parsed.error && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-emerald-600" onClick={() => togglePreview(key)} title="Toggle text preview">
                                  {isPreviewOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                              )}
                              {parsed && !parsed.error && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-emerald-600" onClick={() => copyText(key)} title="Copy text">
                                  <Copy className="w-4 h-4" />
                                </Button>
                              )}
                              {res?.status === "done" && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-100" onClick={() => downloadFile(key)}>
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

                            {isParsing && (
                              <span className="text-yellow-600 text-xs font-medium flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" /> Parsing...
                              </span>
                            )}

                            {parsed && !parsed.error && (
                              <>
                                <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                                  {parsed.numPages} page{parsed.numPages !== 1 ? "s" : ""}
                                </Badge>
                                <div className="flex items-center gap-2 mt-2">
                                  <input
                                    type="text"
                                    placeholder="All pages (e.g., 1-5,10-15)"
                                    value={pageRanges[key] || ""}
                                    onChange={(e) => setPageRanges((prev) => ({ ...prev, [key]: e.target.value }))}
                                    disabled={processing}
                                    className="flex-1 px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                  />
                                </div>
                              </>
                            )}

                            {res?.status === "done" && (
                              <>
                                <ArrowRight className="w-3 h-3 text-gray-300" />
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-bold uppercase">
                                  {res.name.split(".").pop()}
                                </Badge>
                                <span className="text-gray-500 text-xs font-mono">{formatSize(res.size)}</span>
                              </>
                            )}

                            {res?.status === "error" && (
                              <Badge variant="destructive">Error</Badge>
                            )}

                            {parsed?.error && (
                              <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
                                Parse error
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Text Preview */}
                      {isPreviewOpen && parsed && !parsed.error && (
                        <div className="px-4 pb-4">
                          <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50 text-sm text-gray-700 font-mono whitespace-pre-wrap">
                            {parsed.text.slice(0, 500) + (parsed.text.length > 500 ? "..." : "")}
                          </div>
                        </div>
                      )}

                      {/* Processing bar */}
                      {res?.status === "processing" && (
                        <div className="px-4 pb-4 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-emerald-600 font-medium">Processing...</span>
                            <span className="text-emerald-600 font-bold">{Math.round(res.progress || 0)}%</span>
                          </div>
                          <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 transition-all duration-300 ease-out"
                              style={{ width: `${res.progress || 0}%` }}
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
      </main>
      <Footer />
    </div>
  );
}
