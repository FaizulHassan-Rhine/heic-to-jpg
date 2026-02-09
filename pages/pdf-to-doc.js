import { useState, useRef } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  Loader2, CheckCircle, AlertCircle, FileText, Trash2, Upload,
  Download, RotateCcw, Eye, EyeOff, FileType, Copy, ImageIcon
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
const RENDER_SCALE = 2; // 2x for sharp images

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
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState(null);
  const [outputFormat, setOutputFormat] = useState("docx"); // "txt" or "docx"
  const [totalUploads, setTotalUploads] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [parsedDocs, setParsedDocs] = useState({});
  const [previewOpen, setPreviewOpen] = useState({});
  const fileInputRef = useRef(null);

  const getFileKey = (file) => file.name + file.size + file.lastModified;

  const handleFilesAdded = (newFiles) => {
    const fileArray = Array.from(newFiles);

    if (files.length + fileArray.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} PDFs allowed at a time.`);
      return;
    }

    const oversized = [];
    const invalid = [];
    const valid = [];

    fileArray.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        oversized.push(file.name);
      } else if (!file.name.toLowerCase().endsWith(".pdf")) {
        invalid.push(file.name);
      } else {
        valid.push(file);
      }
    });

    if (oversized.length > 0) {
      toast.error(`${oversized.join(", ")} exceed${oversized.length > 1 ? "" : "s"} 20MB limit`);
    }
    if (invalid.length > 0) {
      toast.error(`${invalid.join(", ")} — only PDF files accepted`);
    }
    if (valid.length === 0) return;

    setFiles((prev) => [...prev, ...valid]);
    setTotalUploads((prev) => prev + valid.length);

    // Parse each PDF client-side
    valid.forEach((file) => parsePdfClientSide(file));
  };

  // ─── Client-side PDF parsing with pdfjs-dist ───
  const parsePdfClientSide = async (file) => {
    const key = getFileKey(file);
    try {
      const pdfjs = await getPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const numPages = pdf.numPages;

      // Extract text from all pages
      let fullText = "";
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const lines = {};
        // Group text items by their Y position to reconstruct lines
        textContent.items.forEach((item) => {
          const y = Math.round(item.transform[5]);
          if (!lines[y]) lines[y] = [];
          lines[y].push({ x: item.transform[4], str: item.str });
        });
        // Sort by Y descending (top of page first), then X ascending
        const sortedYs = Object.keys(lines).sort((a, b) => b - a);
        for (const y of sortedYs) {
          const lineItems = lines[y].sort((a, b) => a.x - b.x);
          fullText += lineItems.map((item) => item.str).join(" ") + "\n";
        }
        fullText += "\n";
      }

      setParsedDocs((prev) => ({
        ...prev,
        [key]: {
          numPages,
          text: fullText.trim(),
        },
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

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Convert to JPEG blob
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    const arrayBuffer = await blob.arrayBuffer();

    return {
      data: new Uint8Array(arrayBuffer),
      width: viewport.width,
      height: viewport.height,
    };
  };

  // ─── Convert to TXT (text only) ───
  const convertToTxt = (file) => {
    const key = getFileKey(file);
    const parsed = parsedDocs[key];
    if (!parsed || parsed.error) throw new Error(parsed?.error || "Not parsed yet");

    const blob = new Blob([parsed.text || ""], { type: "text/plain;charset=utf-8" });
    return { blob, name: file.name.replace(/\.pdf$/i, "") + ".txt" };
  };

  // ─── Convert to DOCX with page images ───
  const convertToDocx = async (file) => {
    const key = getFileKey(file);
    const parsed = parsedDocs[key];
    if (!parsed || parsed.error) throw new Error(parsed?.error || "Not parsed yet");

    // Re-read file fresh to avoid detached ArrayBuffer issue
    const pdfjs = await getPdfJs();
    const freshBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(freshBuffer) }).promise;
    const numPages = pdf.numPages;

    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();

    const imageRels = [];
    const bodyXml = [];

    // ─── Render each page and collect images ───
    for (let i = 1; i <= numPages; i++) {
      toast.loading(`Rendering page ${i}/${numPages}...`, { id: "render-progress" });

      const img = await renderPageToImage(pdf, i);
      const imgFileName = `image${i}.jpeg`;
      const rId = `rId${i + 1}`; // rId1 is reserved for styles

      // Save image in the zip
      zip.folder("word").folder("media").file(imgFileName, img.data);

      imageRels.push(
        `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imgFileName}"/>`
      );

      // A4 usable width ≈ 6 inches = 5486400 EMU; calculate proportional height
      const maxWidthEmu = 5486400;
      const aspectRatio = img.height / img.width;
      const cxEmu = maxWidthEmu;
      const cyEmu = Math.round(maxWidthEmu * aspectRatio);

      bodyXml.push(`
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="${cxEmu}" cy="${cyEmu}"/>
            <wp:docPr id="${i}" name="Page ${i}"/>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:nvPicPr>
                    <pic:cNvPr id="${i}" name="Page ${i}"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="${rId}"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="${cxEmu}" cy="${cyEmu}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>`);

      // Page break after each page (except last)
      if (i < numPages) {
        bodyXml.push(`
    <w:p>
      <w:r>
        <w:br w:type="page"/>
      </w:r>
    </w:p>`);
      }
    }

    toast.dismiss("render-progress");

    // ─── Build OOXML structure ───

    // [Content_Types].xml
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
    );

    // _rels/.rels
    zip.folder("_rels").file(
      ".rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    );

    // word/_rels/document.xml.rels
    zip.folder("word").folder("_rels").file(
      "document.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${imageRels.join("\n  ")}
</Relationships>`
    );

    // word/document.xml
    zip.folder("word").file(
      "document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${bodyXml.join("\n")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/>
    </w:sectPr>
  </w:body>
</w:document>`
    );

    const blob = await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    return { blob, name: file.name.replace(/\.pdf$/i, "") + ".docx" };
  };

  // ─── Convert All ───
  const convertAll = async () => {
    if (files.length === 0) {
      toast.error("Please upload PDFs first");
      return;
    }

    // Check all files are parsed
    const unparsed = files.filter((f) => {
      const p = parsedDocs[getFileKey(f)];
      return !p || p.error;
    });
    if (unparsed.length > 0) {
      toast.error("Some files are still parsing or have errors. Please wait or remove them.");
      return;
    }

    setProcessing(true);
    setTotalCompleted(0);
    let completed = 0;

    for (const file of files) {
      const key = getFileKey(file);

      if (results[key]?.status === "done") {
        completed++;
        continue;
      }

      setProcessingFile(file.name);
      setResults((prev) => ({ ...prev, [key]: { status: "processing" } }));

      try {
        let result;
        if (outputFormat === "txt") {
          result = convertToTxt(file);
        } else {
          result = await convertToDocx(file);
        }

        completed++;
        setTotalCompleted(completed);
        setResults((prev) => ({
          ...prev,
          [key]: {
            status: "done",
            blob: result.blob,
            size: result.blob.size,
            name: result.name,
          },
        }));
      } catch (error) {
        console.error("Convert error:", error);
        setResults((prev) => ({
          ...prev,
          [key]: { status: "error", error: error.message },
        }));
      }
    }

    setProcessing(false);
    setProcessingFile(null);
    if (completed > 0) {
      toast.success(`${completed} PDF${completed > 1 ? "s" : ""} converted!`);
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

  const removeFile = (index) => {
    const file = files[index];
    const key = getFileKey(file);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResults((prev) => { const n = { ...prev }; delete n[key]; return n; });
    setParsedDocs((prev) => { const n = { ...prev }; delete n[key]; return n; });
    setPreviewOpen((prev) => { const n = { ...prev }; delete n[key]; return n; });
    setTotalUploads((prev) => Math.max(0, prev - 1));
  };

  const resetAll = () => {
    setFiles([]);
    setResults({});
    setParsedDocs({});
    setPreviewOpen({});
    setTotalUploads(0);
    setTotalCompleted(0);
    setProcessing(false);
    setProcessingFile(null);
  };

  const togglePreview = (key) => {
    setPreviewOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const completedCount = Object.values(results).filter((r) => r.status === "done").length;
  const progress = files.length > 0 ? (completedCount / files.length) * 100 : 0;

  return (
    <>
      <Head>
        <title>PDF to DOCX/TXT - ConvertMastery</title>
        <meta name="description" content="Convert PDF files to DOCX or TXT. Extracts text and images from PDFs preserving layout." />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <Toaster position="top-center" />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">PDF to DOCX / TXT</h1>
            <p className="text-gray-500">
              Convert PDFs to Word with images preserved, or extract plain text
            </p>
          </div>

          {/* Upload + Stats */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 border-gray-300 hover:border-green-400 hover:bg-green-50/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesAdded(e.target.files)}
                />
                <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                <p className="text-lg font-medium text-gray-600">
                  Drag & drop PDF files or click to browse
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Max {MAX_FILES} files • Max 20MB each • PDF only
                </p>
              </div>
            </div>
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

          {/* Output Format + Actions */}
          {files.length > 0 && (
            <>
              <Card className="mb-6">
                <CardContent className="p-4">
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Output Format</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setOutputFormat("docx")}
                      disabled={processing}
                      className={cn(
                        "flex-1 p-4 rounded-lg border-2 text-center transition-all",
                        outputFormat === "docx"
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <FileType className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                      <span className="text-sm font-semibold text-gray-800 block">DOCX</span>
                      <span className="text-[10px] text-gray-400">Word document with images</span>
                    </button>
                    <button
                      onClick={() => setOutputFormat("txt")}
                      disabled={processing}
                      className={cn(
                        "flex-1 p-4 rounded-lg border-2 text-center transition-all",
                        outputFormat === "txt"
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <FileText className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                      <span className="text-sm font-semibold text-gray-800 block">TXT</span>
                      <span className="text-[10px] text-gray-400">Plain text only</span>
                    </button>
                  </div>
                </CardContent>
              </Card>

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
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Convert All to {outputFormat.toUpperCase()}
                    </>
                  )}
                </Button>

                {completedCount > 0 && (
                  <Button
                    onClick={downloadAll}
                    variant="outline"
                    className="border-green-600 text-green-700 hover:bg-green-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download All ({completedCount})
                  </Button>
                )}

                <Button onClick={resetAll} variant="outline" className="text-gray-600">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset All
                </Button>
              </div>
            </>
          )}

          {/* Progress */}
          {processing && (
            <div className="mb-6">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-gray-500 mt-1 text-center">
                {completedCount} of {files.length} completed
              </p>
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">Uploaded PDFs</h2>
              <div className="space-y-3">
                {files.map((file, index) => {
                  const key = getFileKey(file);
                  const result = results[key];
                  const parsed = parsedDocs[key];
                  const isPreviewOpen = previewOpen[key];
                  const isParsing = !parsed;

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
                          <div className="text-3xl flex-shrink-0">📄</div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{file.name}</p>
                            <p className="text-sm text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB
                              {isParsing && (
                                <span className="ml-2 text-yellow-500">
                                  <Loader2 className="h-3 w-3 inline animate-spin mr-1" />
                                  Parsing...
                                </span>
                              )}
                              {parsed && !parsed.error && (
                                <span className="ml-2 text-blue-500">
                                  {parsed.numPages} page{parsed.numPages !== 1 ? "s" : ""}
                                </span>
                              )}
                              {result?.status === "done" && (
                                <span className="text-green-600 ml-2">
                                  → {(result.size / 1024 / 1024).toFixed(2)} MB ({result.name.split(".").pop().toUpperCase()})
                                </span>
                              )}
                            </p>
                            {parsed?.error && (
                              <p className="text-xs text-red-500 mt-1">Parse error: {parsed.error}</p>
                            )}
                            {result?.status === "error" && (
                              <p className="text-xs text-red-500 mt-1">{result.error}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
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

                            {parsed && !parsed.error && (
                              <Button variant="ghost" size="icon" onClick={() => togglePreview(key)}
                                title={isPreviewOpen ? "Hide text preview" : "Show text preview"}>
                                {isPreviewOpen ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                              </Button>
                            )}

                            {parsed && !parsed.error && (
                              <Button variant="ghost" size="icon" onClick={() => copyText(key)} title="Copy text">
                                <Copy className="h-4 w-4 text-gray-500" />
                              </Button>
                            )}

                            {result?.status === "done" && (
                              <Button variant="ghost" size="icon" onClick={() => downloadFile(key)} title="Download">
                                <Download className="h-4 w-4 text-green-600" />
                              </Button>
                            )}

                            <Button variant="ghost" size="icon" onClick={() => removeFile(index)} disabled={processing} title="Remove">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>

                        {isPreviewOpen && parsed && !parsed.error && (
                          <>
                            <Separator className="my-3" />
                            <div className="max-h-64 overflow-y-auto border rounded-lg p-4 bg-white">
                              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                                {parsed.text}
                              </pre>
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
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-500">No PDFs uploaded</h3>
              <p className="text-gray-400 mt-1">Upload PDF files to convert them to DOCX or TXT</p>
            </div>
          )}

          {/* Info Cards */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <FileType className="h-8 w-8 mx-auto text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2">PDF to DOCX</h3>
                <p className="text-sm text-gray-500">Converts each page as a high-quality image inside Word — text, images, and layout all preserved</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 mx-auto text-green-600 mb-3" />
                <h3 className="font-semibold mb-2">PDF to TXT</h3>
                <p className="text-sm text-gray-500">Extract clean plain text from any PDF document</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Copy className="h-8 w-8 mx-auto text-purple-600 mb-3" />
                <h3 className="font-semibold mb-2">Copy & Preview</h3>
                <p className="text-sm text-gray-500">Preview extracted text and copy to clipboard instantly</p>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
