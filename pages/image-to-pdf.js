import { useState, useEffect } from "react";
import { useAuth } from "../lib/authContext";
import { generateThumbnail } from "../lib/thumbnailUtils";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import Dropzone from "../components/Dropzone";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
import { PDFDocument } from "pdf-lib";
import {
  Loader2, FileImage, Trash2, Download, Settings2, FileText
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

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
    setCombinedPdfBlob(null); // clear so user converts again
  };

  const removeFile = (name) => {
    setFiles(prev => prev.filter(f => f.name !== name));
    setCombinedPdfBlob(null); // clear combined PDF when files change
    if (previewUrls[name]) {
      URL.revokeObjectURL(previewUrls[name]);
      setPreviewUrls(prev => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }
  };

  // ── Conversion Logic: single image → single PDF, multiple images → single PDF ──

  const [combinedPdfBlob, setCombinedPdfBlob] = useState(null);
  const [convertProgress, setConvertProgress] = useState(0); // 0..100 for overall

  // Build one PDF with all images as pages (one page per image)
  const convertAllToSinglePdf = async (fileList) => {
    const pdfDoc = await PDFDocument.create();
    const total = fileList.length;
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

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setConvertProgress(Math.round(((i + 0.5) / total) * 100));

      const imageBytes = await file.arrayBuffer();
      let image;
      if (file.type === "image/jpeg" || file.type === "image/jpg") {
        image = await pdfDoc.embedJpg(imageBytes);
      } else if (file.type === "image/png") {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        try {
          image = await pdfDoc.embedPng(imageBytes);
        } catch (e) {
          throw new Error(`"${file.name}": format not supported. Use JPG or PNG.`);
        }
      }

      if (pageSize === "Fit") {
        const page = pdfDoc.addPage([image.width + margin * 2, image.height + margin * 2]);
        page.drawImage(image, {
          x: margin,
          y: margin,
          width: image.width,
          height: image.height,
        });
      } else {
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        const availableWidth = pageWidth - margin * 2;
        const availableHeight = pageHeight - margin * 2;
        const scale = Math.min(availableWidth / image.width, availableHeight / image.height);
        const dims = image.scale(scale);
        const x = margin + (availableWidth - dims.width) / 2;
        const y = margin + (availableHeight - dims.height) / 2;
        page.drawImage(image, { x, y, width: dims.width, height: dims.height });
      }
    }

    setConvertProgress(100);
    const pdfBytes = await pdfDoc.save();
    return new Blob([pdfBytes], { type: "application/pdf" });
  };

  const processAll = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setCombinedPdfBlob(null);
    setConvertProgress(0);

    try {
      const blob = await convertAllToSinglePdf(files);
      setCombinedPdfBlob(blob);

      const processedFiles = [];
      for (const file of files) {
        const inputExt = file.name.split(".").pop()?.toLowerCase() || "";
        const inputThumbnail = await generateThumbnail(file).catch(() => null);
        processedFiles.push({
          inputName: file.name,
          inputSize: file.size,
          inputFormat: inputExt,
          outputName: "document.pdf",
          outputSize: blob.size,
          outputFormat: "pdf",
          inputThumbnail: inputThumbnail || null,
          outputThumbnail: null,
        });
      }

      const successCount = files.length;
      if (successCount > 0 && user && trackUsage) {
        trackUsage("/image-to-pdf", successCount, successCount, {
          tool: "Image to PDF",
          filesProcessed: successCount,
        }, processedFiles);
      }
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Conversion failed.");
    } finally {
      setProcessing(false);
      setConvertProgress(0);
    }
  };

  const downloadPdf = () => {
    if (!combinedPdfBlob) return;
    const url = URL.createObjectURL(combinedPdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = files.length === 1
      ? (files[0].name.replace(/\.[^.]+$/, "") || "image") + ".pdf"
      : "images-to-pdf.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ToolPageShell containerClassName="max-w-6xl">
        <ToolPageHeader
          title="Image to PDF"
          description="Convert your images into professional PDF documents."
        />

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
          />

          {files.length > 0 && (
            <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-start">

              {/* Settings Sidebar */}
              <Card className="lg:sticky lg:top-24 h-fit border-0 shadow-lg ring-1 ring-gray-100">
                <CardContent className="p-6 space-y-8">
                  <div className="flex items-center gap-2 font-bold text-xl text-foreground">
                    <Settings2 className="w-6 h-6 text-primary" /> PDF Settings
                  </div>

                  {/* Page Size */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Page Size</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['A4', 'Letter', 'Fit'].map(size => (
                        <button
                          key={size}
                          onClick={() => setPageSize(size)}
                          className={cn(
                            "py-2 text-sm rounded-lg transition-all font-medium border",
                            pageSize === size
                              ? "bg-brand-sky/50 border-brand-mid/30 text-brand-navy font-semibold"
                              : "bg-card border-border text-muted-foreground hover:bg-muted/40"
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
                      <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Orientation</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Portrait', 'Landscape'].map(mode => (
                          <button
                            key={mode}
                            onClick={() => setOrientation(mode)}
                            className={cn(
                              "py-2 text-sm rounded-lg transition-all font-medium border",
                              orientation === mode
                                ? "bg-brand-sky/50 border-brand-mid/30 text-brand-navy font-semibold"
                                : "bg-card border-border text-muted-foreground hover:bg-muted/40"
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
                    <label className="text-sm font-semibold text-foreground uppercase tracking-wider">Margins</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[0, 20, 50].map(m => (
                        <button
                          key={m}
                          onClick={() => setMargin(m)}
                          className={cn(
                            "py-2 text-sm rounded-lg transition-all font-medium border",
                            margin === m
                              ? "bg-brand-sky/50 border-brand-mid/30 text-brand-navy font-semibold"
                              : "bg-card border-border text-muted-foreground hover:bg-muted/40"
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
                    className="w-full bg-gradient-to-r from-primary to-brand-navy hover:from-brand-navy hover:to-brand-navy text-white h-12 shadow-lg hover:shadow-xl transition-all font-semibold text-base"
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
                    <h3 className="font-bold text-2xl text-foreground">Files</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      {files.length === 1 ? "1 image → 1 PDF" : `${files.length} images → 1 PDF`}. Review order and convert.
                    </p>
                  </div>
                  {combinedPdfBlob && (
                    <Button
                      onClick={downloadPdf}
                      className="h-10 bg-gradient-to-r from-primary to-brand-navy hover:from-brand-navy hover:to-brand-navy text-white shadow-lg"
                    >
                      <Download className="w-4 h-4 mr-2" /> Download PDF
                    </Button>
                  )}
                </div>

                {processing && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm text-brand-navy font-medium">
                      <span>Combining {files.length} image{files.length === 1 ? "" : "s"} into 1 PDF...</span>
                      <span>{convertProgress}%</span>
                    </div>
                    <div className="h-2 bg-brand-sky rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-brand-navy transition-all duration-300"
                        style={{ width: `${convertProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {files.map((file, idx) => {
                  const preview = previewUrls[file.name];
                  return (
                    <Card key={file.name + idx} className="overflow-hidden border border-border shadow-sm hover:shadow-md transition-all group">
                      <div className="p-4 flex gap-5 items-center">
                        <div className="w-20 h-20 bg-muted rounded-xl flex-shrink-0 overflow-hidden relative border border-border">
                          {preview ? (
                            <img src={preview} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <FileImage className="w-8 h-8 text-muted-foreground/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          )}
                          {files.length > 1 && (
                            <span className="absolute top-1 left-1 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold truncate pr-4 text-foreground text-lg">{file.name}</h4>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-muted-foreground hover:bg-muted/40 flex-shrink-0" onClick={() => removeFile(file.name)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <Badge variant="secondary" className="bg-muted text-muted-foreground border-border font-mono">
                              {formatSize(file.size)}
                            </Badge>
                            {files.length > 1 && (
                              <span className="text-muted-foreground text-xs">Page {idx + 1} in PDF</span>
                            )}
                            {!combinedPdfBlob && !processing && (
                              <span className="text-muted-foreground italic text-xs">Ready to convert</span>
                            )}
                            {combinedPdfBlob && (
                              <Badge className="bg-brand-sky text-brand-navy border-brand-mid/30">
                                In PDF
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
    </ToolPageShell>
  );
}
