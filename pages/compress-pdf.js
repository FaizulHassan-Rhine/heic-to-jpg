import { useState } from "react";
import { useAuth } from "../lib/authContext";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useSettings } from "../lib/useSettings";
import { formatMaxMb } from "../lib/formatMaxMb";
import {
    FileText,
    Trash2,
    Download,
    Loader2,
    Minimize2,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    Settings2,
    FileOutput,
} from "lucide-react";

function formatFileSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Parse page range string like "1-5,10-15" into array of page numbers
function parsePageRange(rangeStr, maxPages) {
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
}

export default function CompressPdf() {
    const { user, trackUsage } = useAuth();
    const { settings: siteSettings } = useSettings();
    const maxFileSize = siteSettings?.pdf?.maxSize || 20 * 1024 * 1024;
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [level, setLevel] = useState("recommended");
    const [pageRange, setPageRange] = useState(""); // e.g., "1-5,10-15"
    const [removeMetadata, setRemoveMetadata] = useState(false);

    const compressionSettings = {
        extreme: { scale: 1.0, quality: 0.5, label: "Extreme Compression", desc: "Smallest size, lower quality (72 DPI)" },
        recommended: { scale: 2.0, quality: 0.7, label: "Recommended", desc: "Balanced size & good quality (144 DPI)" },
        quality: { scale: 3.0, quality: 0.8, label: "High Quality", desc: "Best readability, larger size (216 DPI)" },
    };

    // Safe PDF.js loader
    const loadPdfLib = async () => {
        if (window.pdfjsLib) return window.pdfjsLib;
        const pdfjsLib = await import("pdfjs-dist/build/pdf.js");
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        window.pdfjsLib = pdfjsLib;
        return pdfjsLib;
    };

    const handleFilesAdded = (selectedFiles) => {
        const selected = selectedFiles?.[0];
        if (!selected) return;

        if (selected.size > maxFileSize) {
            toast.error(`File exceeds ${formatMaxMb(maxFileSize)}MB limit`);
            return;
        }
        if (!selected.type.includes("pdf") && !selected.name.toLowerCase().endsWith(".pdf")) {
            toast.error("Please select a PDF file");
            return;
        }

        setFile(selected);
        setResult(null);
        setProgress(0);
    };

    const compressPdf = async () => {
        if (!file) return;
        setProcessing(true);
        setProgress(0);
        setResult(null);

        const settings = compressionSettings[level];

        try {
            // 1. Load PDF
            const pdfjsLib = await loadPdfLib();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
            const numPages = pdf.numPages;

            // 2. Prepare New PDF
            const { PDFDocument } = await import("pdf-lib");
            const newPdf = await PDFDocument.create();

            // 3. Parse page range
            const pagesToCompress = parsePageRange(pageRange, numPages);
            
            // 4. Process Pages
            for (let idx = 0; idx < pagesToCompress.length; idx++) {
                const pageNum = pagesToCompress[idx];
                // Update progress
                setProgress(Math.round((idx / pagesToCompress.length) * 100));

                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: settings.scale });

                // Render to canvas
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                // White background (important for JPEGs)
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({ canvasContext: ctx, viewport }).promise;

                // Compression happens here: JPEG at low quality
                const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", settings.quality));
                const imgBuffer = await blob.arrayBuffer();

                // Embed image
                const img = await newPdf.embedJpg(imgBuffer);
                const newPage = newPdf.addPage([img.width, img.height]);
                newPage.drawImage(img, {
                    x: 0,
                    y: 0,
                    width: img.width,
                    height: img.height,
                });
            }

            // 5. Remove metadata if requested
            if (removeMetadata) {
                newPdf.setTitle("");
                newPdf.setAuthor("");
                newPdf.setSubject("");
                newPdf.setKeywords([]);
                newPdf.setProducer("");
                newPdf.setCreator("");
            }

            // 6. Save
            const pdfBytes = await newPdf.save();
            const resultBlob = new Blob([pdfBytes], { type: "application/pdf" });

            const savedBytes = file.size - resultBlob.size;
            const savedPercent = Math.round((savedBytes / file.size) * 100);

            const outputName = file.name.replace(/\.[^.]+$/, "_compressed.pdf");
            setResult({
                blob: resultBlob,
                size: resultBlob.size,
                originalSize: file.size,
                savedPercent: savedPercent > 0 ? savedPercent : 0,
            });

            setProgress(100);
            toast.success("Compression successful!");

            // Track usage after successful compression
            if (user && trackUsage) {
              const processedFiles = [{
                inputName: file.name,
                inputSize: file.size,
                inputFormat: "pdf",
                outputName: outputName,
                outputSize: resultBlob.size,
                outputFormat: "pdf",
              }];
              trackUsage("/compress-pdf", 1, 1, {
                tool: "Compress PDF",
                filesProcessed: 1,
              }, processedFiles);
            }

        } catch (error) {
            console.error("Compression error:", error);
            toast.error("Failed to compress PDF: " + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const downloadResult = () => {
        if (!result) return;
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `compressed-${file.name}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
<ToolPageShell containerClassName="max-w-4xl">
                    {/* Header */}
                    <ToolPageHeader
          title="Compress PDF"
          description="Reduce PDF file size significantly while maintaining readability. Secure client-side processing."
        />

                    <div className="space-y-8">
                        {/* Upload Area */}
                        {!file && !result && (
                            <CollapsibleDropzone
                                files={[]}
                                setFiles={handleFilesAdded}
                                title="Upload PDF to Compress"
                                description="PDF"
                                limitsText={`Max 1 file • Max ${formatMaxMb(maxFileSize)}MB`}
                                accept={{ "application/pdf": [".pdf"] }}
                                maxFiles={1}
                                currentFileCount={0}
                            />
                        )}

                        {/* Selected File & Settings */}
                        {file && !result && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                {/* File Card */}
                                <Card className="border-l-4 border-l-primary">
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-6 h-6 text-red-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-lg truncate">{file.name}</h3>
                                            <p className="text-muted-foreground">{formatFileSize(file.size)}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setFile(null)}
                                            disabled={processing}
                                            className="text-muted-foreground hover:text-red-500"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Settings */}
                                <Card>
                                    <CardContent className="p-6 space-y-6">
                                        <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
                                            <Settings2 className="w-5 h-5 text-muted-foreground" />
                                            Compression Settings
                                        </h3>
                                        
                                        {/* Compression Intensity */}
                                        <div>
                                            <label className="text-sm font-semibold text-foreground mb-3 block">Compression Intensity</label>
                                            <div className="grid md:grid-cols-3 gap-4">
                                                {Object.entries(compressionSettings).map(([key, setting]) => (
                                                    <div
                                                        key={key}
                                                        onClick={() => !processing && setLevel(key)}
                                                        className={cn(
                                                            "cursor-pointer rounded-xl border-2 p-4 transition-all hover:bg-muted/40",
                                                            level === key
                                                                ? "border-primary bg-brand-sky/50/50 shadow-sm"
                                                                : "border-border"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-full h-2 rounded-full mb-3",
                                                            key === "recommended" ? "bg-primary" : key === "quality" ? "bg-brand-mid" : "bg-orange-400"
                                                        )} />
                                                        <div className="font-semibold text-foreground mb-1">
                                                            {setting.label}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">{setting.desc}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Page Range */}
                                        <div>
                                            <label className="text-sm font-semibold text-foreground mb-2 block">Page Range (Optional)</label>
                                            <input
                                                type="text"
                                                placeholder="All pages (e.g., 1-5,10-15)"
                                                value={pageRange}
                                                onChange={(e) => setPageRange(e.target.value)}
                                                disabled={processing}
                                                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">Leave empty to compress all pages</p>
                                        </div>

                                        {/* Metadata Removal */}
                                        <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/40 cursor-pointer transition-all"
                                            onClick={() => !processing && setRemoveMetadata(!removeMetadata)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={removeMetadata}
                                                onChange={(e) => setRemoveMetadata(e.target.checked)}
                                                disabled={processing}
                                                className="w-5 h-5 accent-primary"
                                            />
                                            <div>
                                                <span className="font-semibold text-foreground block text-sm">Remove Metadata</span>
                                                <span className="text-xs text-muted-foreground">Remove title, author, and other metadata</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Action */}
                                <div className="flex flex-col items-center gap-6 pt-4">
                                    {processing && (
                                        <div className="w-full max-w-md space-y-2">
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-brand-navy">Compressing PDF...</span>
                                                <span className="text-muted-foreground">{progress}%</span>
                                            </div>
                                            <Progress value={progress} className="h-3" />
                                            <p className="text-xs text-center text-muted-foreground">
                                                This may take a moment for large files
                                            </p>
                                        </div>
                                    )}

                                    <Button
                                        size="lg"
                                        className="w-full md:w-auto px-12 py-6 text-lg bg-gradient-to-r from-primary to-brand-navy hover:from-brand-navy hover:to-brand-navy shadow-lg shadow-primary/20"
                                        onClick={compressPdf}
                                        disabled={processing}
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Minimize2 className="w-5 h-5 mr-2" />
                                                Compress PDF Now
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Results */}
                        {result && (
                            <div className="space-y-6 animate-in zoom-in-95 duration-500">
                                <Card className="overflow-hidden border-2 border-brand-mid/30 shadow-xl shadow-primary/10">
                                    <div className="bg-brand-sky/50/50 p-8 text-center border-b border-brand-mid/30">
                                        <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                            <CheckCircle className="w-8 h-8 text-primary" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-foreground mb-2">
                                            Compression Successful!
                                        </h2>
                                        <p className="text-muted-foreground">
                                            We've reduced your file size by
                                            <strong className="text-primary ml-1">{result.savedPercent}%</strong>
                                        </p>
                                    </div>

                                    <CardContent className="p-8">
                                        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
                                            {/* Before */}
                                            <div className="text-center opacity-60">
                                                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Original</div>
                                                <div className="text-2xl font-bold line-through decorations-red-500 decoration-2">
                                                    {formatFileSize(result.originalSize)}
                                                </div>
                                            </div>

                                            <ArrowRight className="w-6 h-6 text-brand-mid hidden md:block" />

                                            {/* After */}
                                            <div className="text-center scale-110 transform origin-center">
                                                <div className="text-xs uppercase tracking-wider text-primary mb-1 font-bold">Compressed</div>
                                                <div className="text-3xl font-bold text-foreground">
                                                    {formatFileSize(result.size)}
                                                </div>
                                                <Badge variant="outline" className="mt-2 border-primary text-brand-navy bg-brand-sky/50">
                                                    New Size
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                            <Button
                                                size="lg"
                                                onClick={downloadResult}
                                                className="bg-primary hover:bg-primary-hover px-8 h-12 text-base shadow-md shadow-primary/20"
                                            >
                                                <Download className="w-5 h-5 mr-2" />
                                                Download PDF
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="lg"
                                                onClick={() => {
                                                    setFile(null);
                                                    setResult(null);
                                                }}
                                                className="h-12 px-8"
                                            >
                                                Compress Another
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
    </ToolPageShell>
        </>
    );
}
