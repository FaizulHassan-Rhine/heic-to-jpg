import { useState, useCallback, useRef, useEffect } from "react";
import Head from "next/head";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { cn } from "@/lib/utils";
import toast, { Toaster } from "react-hot-toast";
import {
    Upload,
    FileText,
    Trash2,
    Download,
    Loader2,
    ChevronUp,
    ChevronDown,
    RotateCw,
    GripVertical,
    FilePlus,
    Merge,
    Eye,
    ArrowUpDown,
    CheckCircle,
    X,
    FileUp,
} from "lucide-react";

const MAX_FILES = 20;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file

// ─────────────────────────── HELPERS ───────────────────────────

function formatFileSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
}

// Parse page range string like "1-5,10-15" into array of page numbers
function parsePageRange(rangeStr, maxPages) {
    if (!rangeStr || rangeStr.trim() === "") {
        return Array.from({ length: maxPages }, (_, i) => i);
    }
    const pages = new Set();
    const parts = rangeStr.split(",");
    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes("-")) {
            const [start, end] = trimmed.split("-").map((s) => parseInt(s.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
                    pages.add(i - 1); // Convert to 0-based index
                }
            }
        } else {
            const page = parseInt(trimmed);
            if (!isNaN(page) && page >= 1 && page <= maxPages) {
                pages.add(page - 1); // Convert to 0-based index
            }
        }
    }
    return Array.from(pages).sort((a, b) => a - b);
}

// Render a single PDF page to a canvas and return a data URL thumbnail
async function renderPdfPageThumbnail(pdfDoc, pageNum, scale = 0.4) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.7);
}

// ─────────────────────────── MAIN COMPONENT ───────────────────────────

export default function MergePdf() {
    const [pdfEntries, setPdfEntries] = useState([]);
    // Each entry: { id, file, name, size, pageCount, thumbnails: [dataURL], rotation: 0 }
    const [merging, setMerging] = useState(false);
    const [mergeProgress, setMergeProgress] = useState(0);
    const [mergedBlob, setMergedBlob] = useState(null);
    const [mergedSize, setMergedSize] = useState(0);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const fileInputRef = useRef(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [dragSourceIndex, setDragSourceIndex] = useState(null);
    const [pageRanges, setPageRanges] = useState({}); // { [entryId]: "1-5,10-15" }
    const [rotations, setRotations] = useState({}); // { [entryId]: 0, 90, 180, 270 }
    const [addPageNumbers, setAddPageNumbers] = useState(false);
    const [splitMode, setSplitMode] = useState(false); // Split instead of merge

    // Total page count
    const totalPages = pdfEntries.reduce((sum, e) => sum + (e.pageCount || 0), 0);

    // ── Load PDF files ──
    const loadPdfFiles = useCallback(async (files) => {
        setLoadingFiles(true);
        let pdfjsLib;
        try {
            // Use the same loading strategy as pdf-to-doc.js for consistency
            if (window.pdfjsLib) {
                pdfjsLib = window.pdfjsLib;
            } else {
                pdfjsLib = await import("pdfjs-dist/build/pdf.js");
                pdfjsLib.GlobalWorkerOptions.workerSrc =
                    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
                window.pdfjsLib = pdfjsLib;
            }
        } catch (e) {
            console.error("PDF.js load error", e);
            toast.error("Failed to initialize PDF processor");
            setLoadingFiles(false);
            return;
        }

        const newEntries = [];

        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                toast.error(`"${file.name}" exceeds 50MB limit`);
                continue;
            }
            if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
                // Allow if mime type is missing but extension is correct
                if (!file.name.toLowerCase().endsWith(".pdf")) {
                    toast.error(`"${file.name}" is not a PDF file`);
                    continue;
                }
            }

            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
                const pageCount = pdf.numPages;

                // Generate thumbnail for first page
                const firstThumb = await renderPdfPageThumbnail(pdf, 1, 0.35);

                newEntries.push({
                    id: Date.now() + Math.random(),
                    file,
                    name: file.name,
                    size: file.size,
                    pageCount,
                    thumbnails: [firstThumb],
                    rotation: 0,
                });
            } catch (err) {
                console.error("Failed to load PDF:", err);
                toast.error(`Failed to load "${file.name}"`);
            }
        }

        if (newEntries.length > 0) {
            setPdfEntries((prev) => {
                const combined = [...prev, ...newEntries];
                if (combined.length > MAX_FILES) {
                    toast.error(`Maximum ${MAX_FILES} PDF files allowed`);
                    return combined.slice(0, MAX_FILES);
                }
                return combined;
            });
            setMergedBlob(null);
            toast.success(`Added ${newEntries.length} PDF${newEntries.length > 1 ? "s" : ""}`);
        }

        setLoadingFiles(false);
    }, []);

    // ── Drag & Drop on the upload zone ──
    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            const files = Array.from(e.dataTransfer.files);
            if (files.length) loadPdfFiles(files);
        },
        [loadPdfFiles]
    );

    const handleFileInput = useCallback(
        (e) => {
            const files = Array.from(e.target.files);
            if (files.length) loadPdfFiles(files);
            e.target.value = "";
        },
        [loadPdfFiles]
    );

    // ── Reorder ──
    const moveEntry = (idx, dir) => {
        setPdfEntries((prev) => {
            const next = [...prev];
            const newIdx = idx + dir;
            if (newIdx < 0 || newIdx >= next.length) return prev;
            [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
            return next;
        });
        setMergedBlob(null);
    };

    // ── Remove ──
    const removeEntry = (idx) => {
        setPdfEntries((prev) => prev.filter((_, i) => i !== idx));
        setMergedBlob(null);
    };

    // ── Clear all ──
    const clearAll = () => {
        setPdfEntries([]);
        setMergedBlob(null);
        setMergeProgress(0);
    };

    // ── Drag reorder between cards ──
    const handleDragStart = (e, idx) => {
        setDragSourceIndex(idx);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", idx.toString());
    };

    const handleDragOver = (e, idx) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverIndex(idx);
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleCardDrop = (e, targetIdx) => {
        e.preventDefault();
        setDragOverIndex(null);
        const sourceIdx = dragSourceIndex;
        if (sourceIdx === null || sourceIdx === targetIdx) return;

        setPdfEntries((prev) => {
            const next = [...prev];
            const [moved] = next.splice(sourceIdx, 1);
            next.splice(targetIdx, 0, moved);
            return next;
        });
        setDragSourceIndex(null);
        setMergedBlob(null);
    };

    // ── Merge ──
    const handleMerge = async () => {
        if (splitMode) {
            handleSplit();
            return;
        }

        if (pdfEntries.length < 2) {
            toast.error("Please add at least 2 PDF files to merge");
            return;
        }

        setMerging(true);
        setMergeProgress(0);
        setMergedBlob(null);

        try {
            const { PDFDocument, rgb } = await import("pdf-lib");
            const mergedPdf = await PDFDocument.create();
            let pageNumber = 1;

            for (let i = 0; i < pdfEntries.length; i++) {
                const entry = pdfEntries[i];
                const arrayBuffer = await entry.file.arrayBuffer();
                const sourcePdf = await PDFDocument.load(arrayBuffer, {
                    ignoreEncryption: true,
                });
                
                // Get page range for this entry
                const rangeStr = pageRanges[entry.id] || "";
                const pageIndices = parsePageRange(rangeStr, entry.pageCount);
                const pages = await mergedPdf.copyPages(sourcePdf, pageIndices);
                
                pages.forEach((page, idx) => {
                    const addedPage = mergedPdf.addPage(page);
                    const rotation = rotations[entry.id] || 0;
                    if (rotation !== 0) {
                        addedPage.setRotation(addedPage.getRotation().angle + rotation);
                    }
                    
                    // Add page numbers if requested
                    if (addPageNumbers) {
                        const { width, height } = addedPage.getSize();
                        addedPage.drawText(`${pageNumber}`, {
                            x: width - 30,
                            y: 20,
                            size: 10,
                            color: rgb(0.5, 0.5, 0.5),
                        });
                    }
                    pageNumber++;
                });
                
                setMergeProgress(Math.round(((i + 1) / pdfEntries.length) * 100));
            }

            const pdfBytes = await mergedPdf.save();
            const blob = new Blob([pdfBytes], { type: "application/pdf" });
            setMergedBlob(blob);
            setMergedSize(blob.size);
            toast.success("PDFs merged successfully!");
        } catch (err) {
            console.error("Merge error:", err);
            toast.error("Failed to merge PDFs: " + (err.message || "Unknown error"));
        }

        setMerging(false);
    };

    // ── Split PDF ──
    const handleSplit = async () => {
        if (pdfEntries.length === 0) {
            toast.error("Please add a PDF file to split");
            return;
        }

        setMerging(true);
        setMergeProgress(0);

        try {
            const { PDFDocument } = await import("pdf-lib");
            let processed = 0;

            for (const entry of pdfEntries) {
                const arrayBuffer = await entry.file.arrayBuffer();
                const sourcePdf = await PDFDocument.load(arrayBuffer, {
                    ignoreEncryption: true,
                });

                // Split each page into separate PDF
                for (let i = 0; i < entry.pageCount; i++) {
                    const newPdf = await PDFDocument.create();
                    const [copiedPage] = await newPdf.copyPages(sourcePdf, [i]);
                    newPdf.addPage(copiedPage);
                    const pdfBytes = await newPdf.save();
                    const blob = new Blob([pdfBytes], { type: "application/pdf" });
                    
                    // Download immediately
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${entry.name.replace(/\.pdf$/i, "")}-page-${i + 1}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                }

                processed++;
                setMergeProgress(Math.round((processed / pdfEntries.length) * 100));
            }

            toast.success(`Split ${pdfEntries.length} PDF${pdfEntries.length > 1 ? "s" : ""} into individual pages!`);
        } catch (err) {
            console.error("Split error:", err);
            toast.error("Failed to split PDFs: " + (err.message || "Unknown error"));
        }

        setMerging(false);
    };

    // ── Download ──
    const handleDownload = () => {
        if (!mergedBlob) return;
        const url = URL.createObjectURL(mergedBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "merged-document.pdf";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Download started!");
    };

    return (
        <>
            <Head>
                <title>Merge PDF - ConvertMastery</title>
                <meta
                    name="description"
                    content="Combine multiple PDF files into a single document. Free, fast, and private PDF merger — all processing happens in your browser."
                />
            </Head>

            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />
                <Toaster position="top-center" />

                <main className="flex-1">
                    <div className="container mx-auto px-4 py-8 max-w-5xl">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
                                <Merge className="w-3.5 h-3.5" />
                                100% Client-side • No upload to server
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                                Merge PDF
                            </h1>
                            <p className="text-muted-foreground max-w-lg mx-auto">
                                Combine multiple PDF files into a single document. Drag to
                                reorder, then merge — all processed locally in your browser.
                            </p>
                        </div>

                        {/* Upload Area */}
                        <div
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => !loadingFiles && fileInputRef.current?.click()}
                            className={cn(
                                "w-full border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer mb-8",
                                "flex flex-col items-center justify-center py-12 px-8",
                                "bg-gradient-to-br from-background to-muted/20",
                                "hover:border-primary/50 hover:bg-gradient-to-br hover:from-primary/5 hover:to-primary/10",
                                "hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.005]",
                                "group",
                                loadingFiles && "opacity-60 pointer-events-none"
                            )}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,application/pdf"
                                multiple
                                onChange={handleFileInput}
                                className="hidden"
                            />
                            <div className="mb-4 p-4 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 group-hover:from-primary/20 group-hover:to-primary/30 transition-all duration-300 group-hover:scale-110">
                                {loadingFiles ? (
                                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                ) : (
                                    <FileUp className="h-8 w-8 text-primary" />
                                )}
                            </div>
                            <p className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
                                {loadingFiles ? "Loading PDF files..." : "Drop PDF files here"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                or click to browse • Max {MAX_FILES} files, 50MB each
                            </p>
                        </div>

                        {/* Stats Bar */}
                        {pdfEntries.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                                <div className="flex items-center gap-4">
                                    <Badge variant="secondary" className="text-sm px-3 py-1">
                                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                                        {pdfEntries.length} PDF{pdfEntries.length !== 1 ? "s" : ""}
                                    </Badge>
                                    <Badge variant="outline" className="text-sm px-3 py-1">
                                        {totalPages} total page{totalPages !== 1 ? "s" : ""}
                                    </Badge>
                                    <Badge variant="outline" className="text-sm px-3 py-1">
                                        {formatFileSize(
                                            pdfEntries.reduce((s, e) => s + e.size, 0)
                                        )}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="gap-1.5"
                                    >
                                        <FilePlus className="w-3.5 h-3.5" />
                                        Add More
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={clearAll}
                                        className="gap-1.5 text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Clear All
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* PDF List */}
                        {pdfEntries.length > 0 && (
                            <div className="space-y-3 mb-8">
                                <div className="flex items-center gap-2 mb-2">
                                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                        Drag to reorder or use arrow buttons
                                    </span>
                                </div>

                                {pdfEntries.map((entry, idx) => (
                                    <div
                                        key={entry.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, idx)}
                                        onDragOver={(e) => handleDragOver(e, idx)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleCardDrop(e, idx)}
                                        onDragEnd={() => {
                                            setDragOverIndex(null);
                                            setDragSourceIndex(null);
                                        }}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-xl border-2 bg-card transition-all duration-200",
                                            "hover:shadow-md hover:border-primary/20",
                                            dragOverIndex === idx &&
                                            "border-primary bg-primary/5 shadow-lg shadow-primary/10",
                                            dragSourceIndex === idx && "opacity-50"
                                        )}
                                    >
                                        {/* Drag Handle */}
                                        <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                                            <GripVertical className="w-5 h-5" />
                                        </div>

                                        {/* Order Number */}
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <span className="text-sm font-bold text-primary">
                                                {idx + 1}
                                            </span>
                                        </div>

                                        {/* Thumbnail */}
                                        <div className="w-14 h-18 flex-shrink-0 rounded-lg overflow-hidden border bg-white shadow-sm">
                                            {entry.thumbnails?.[0] ? (
                                                <img
                                                    src={entry.thumbnails[0]}
                                                    alt={`${entry.name} preview`}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-muted">
                                                    <FileText className="w-6 h-6 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>

                                        {/* File Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">
                                                {entry.name}
                                                {rotations[entry.id] && rotations[entry.id] !== 0 && (
                                                    <span className="ml-2 text-xs text-muted-foreground">
                                                        ({rotations[entry.id]}°)
                                                    </span>
                                                )}
                                            </p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-xs text-muted-foreground">
                                                    {entry.pageCount} page
                                                    {entry.pageCount !== 1 ? "s" : ""}
                                                </span>
                                                <span className="text-xs text-muted-foreground">•</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatFileSize(entry.size)}
                                                </span>
                                            </div>
                                            {/* Page Range Input */}
                                            <div className="mt-2">
                                                <input
                                                    type="text"
                                                    placeholder="All pages (e.g., 1-5,10-15)"
                                                    value={pageRanges[entry.id] || ""}
                                                    onChange={(e) => setPageRanges(prev => ({
                                                        ...prev,
                                                        [entry.id]: e.target.value
                                                    }))}
                                                    disabled={merging}
                                                    className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                                                />
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                disabled={idx === 0}
                                                onClick={() => moveEntry(idx, -1)}
                                                title="Move up"
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                disabled={idx === pdfEntries.length - 1}
                                                onClick={() => moveEntry(idx, 1)}
                                                title="Move down"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => setRotations(prev => ({
                                                    ...prev,
                                                    [entry.id]: ((prev[entry.id] || 0) + 90) % 360
                                                }))}
                                                title="Rotate"
                                            >
                                                <RotateCw className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => removeEntry(idx)}
                                                title="Remove"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Options */}
                        {pdfEntries.length > 0 && (
                            <Card className="mb-6">
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={splitMode}
                                                onChange={(e) => setSplitMode(e.target.checked)}
                                                disabled={merging}
                                                className="w-4 h-4 accent-primary"
                                            />
                                            <span className="text-sm font-medium">Split Mode (One PDF per page)</span>
                                        </label>
                                    </div>
                                    {!splitMode && (
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={addPageNumbers}
                                                    onChange={(e) => setAddPageNumbers(e.target.checked)}
                                                    disabled={merging}
                                                    className="w-4 h-4 accent-primary"
                                                />
                                                <span className="text-sm font-medium">Add Page Numbers</span>
                                            </label>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Merge/Split Button */}
                        {pdfEntries.length >= (splitMode ? 1 : 2) && (
                            <div className="flex flex-col items-center gap-4 mb-8">
                                {/* Progress */}
                                {merging && (
                                    <div className="w-full max-w-md">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                            <span className="text-sm font-medium">
                                                {splitMode ? "Splitting PDFs..." : "Merging PDFs..."} {mergeProgress}%
                                            </span>
                                        </div>
                                        <Progress value={mergeProgress} className="h-2" />
                                    </div>
                                )}

                                {!mergedBlob && (
                                    <Button
                                        size="lg"
                                        onClick={handleMerge}
                                        disabled={merging}
                                        className="gap-2 px-10 shadow-lg shadow-primary/20 text-base"
                                    >
                                        {merging ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                {splitMode ? "Splitting..." : "Merging..."}
                                            </>
                                        ) : (
                                            <>
                                                {splitMode ? (
                                                    <>
                                                        <FileText className="w-4 h-4" />
                                                        Split {pdfEntries.length} PDF{pdfEntries.length > 1 ? "s" : ""}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Merge className="w-4 h-4" />
                                                        Merge {pdfEntries.length} PDFs into One
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </Button>
                                )}

                                {/* Success / Download */}
                                {mergedBlob && (
                                    <Card className="w-full max-w-md border-2 border-primary/30 bg-primary/5">
                                        <CardContent className="p-6">
                                            <div className="text-center space-y-4">
                                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/20">
                                                    <CheckCircle className="w-7 h-7 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg">
                                                        Merge Complete!
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {pdfEntries.length} files • {totalPages} pages •{" "}
                                                        {formatFileSize(mergedSize)}
                                                    </p>
                                                </div>
                                                <div className="flex gap-3 justify-center">
                                                    <Button
                                                        size="lg"
                                                        onClick={handleDownload}
                                                        className="gap-2 px-8 shadow-lg shadow-primary/20"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Download Merged PDF
                                                    </Button>
                                                </div>
                                                <button
                                                    onClick={() => setMergedBlob(null)}
                                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    Merge again with different order
                                                </button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}

                        {/* Empty State */}
                        {pdfEntries.length === 0 && !loadingFiles && (
                            <div className="mt-12 grid md:grid-cols-3 gap-6">
                                {[
                                    {
                                        icon: Merge,
                                        title: "Combine PDFs",
                                        desc: "Merge multiple PDF files into a single document in seconds",
                                    },
                                    {
                                        icon: ArrowUpDown,
                                        title: "Reorder Pages",
                                        desc: "Drag and drop to arrange your PDF files in the right order",
                                    },
                                    {
                                        icon: Download,
                                        title: "Instant Download",
                                        desc: "Download your merged PDF immediately — no email or signup required",
                                    },
                                ].map((f, i) => {
                                    const Icon = f.icon;
                                    return (
                                        <div
                                            key={i}
                                            className="text-center p-6 rounded-2xl border bg-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
                                        >
                                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                                                <Icon className="w-5 h-5 text-primary" />
                                            </div>
                                            <h3 className="font-bold mb-1">{f.title}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {f.desc}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Single file hint */}
                        {pdfEntries.length === 1 && (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">
                                    Add at least one more PDF to merge
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-3 gap-1.5"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <FilePlus className="w-4 h-4" />
                                    Add Another PDF
                                </Button>
                            </div>
                        )}
                    </div>
                </main>

                <Footer />
            </div>
        </>
    );
}
