import { useState, useCallback, useRef } from "react";
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
    Minimize2,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    Settings2,
    FileOutput,
} from "lucide-react";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function formatFileSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function CompressPdf() {
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [level, setLevel] = useState("recommended");
    const fileInputRef = useRef(null);

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
        setResult(null);
        setProgress(0);
        e.target.value = ""; // Reset input
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

            // 3. Process Pages
            for (let i = 1; i <= numPages; i++) {
                // Update progress
                setProgress(Math.round(((i - 1) / numPages) * 100));

                const page = await pdf.getPage(i);
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

            // 4. Save
            const pdfBytes = await newPdf.save();
            const resultBlob = new Blob([pdfBytes], { type: "application/pdf" });

            const savedBytes = file.size - resultBlob.size;
            const savedPercent = Math.round((savedBytes / file.size) * 100);

            setResult({
                blob: resultBlob,
                size: resultBlob.size,
                originalSize: file.size,
                savedPercent: savedPercent > 0 ? savedPercent : 0,
            });

            setProgress(100);
            toast.success("Compression successful!");

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
            <Head>
                <title>Compress PDF - ConvertMastery</title>
                <meta name="description" content="Compress PDF files locally in your browser. Reduce file size without uploading to a server." />
            </Head>

            <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <Toaster position="top-center" />

                <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
                            Compress PDF
                        </h1>
                        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                            Reduce PDF file size significantly while maintaining readability.
                            Secure client-side processing.
                        </p>
                    </div>

                    <div className="space-y-8">
                        {/* Upload Area */}
                        {!file && !result && (
                            <Card
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50/10 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                            >
                                <CardContent className="flex flex-col items-center justify-center py-16">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                                        <Minimize2 className="w-10 h-10 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2 text-gray-800">
                                        Drop PDF file here
                                    </h3>
                                    <p className="text-gray-500 mb-6">or click to browse local files</p>
                                    <Button size="lg" className="bg-green-600 hover:bg-green-700">
                                        Select PDF File
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {/* Selected File & Settings */}
                        {file && !result && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                {/* File Card */}
                                <Card className="border-l-4 border-l-green-500">
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-6 h-6 text-red-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-lg truncate">{file.name}</h3>
                                            <p className="text-gray-500">{formatFileSize(file.size)}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setFile(null)}
                                            disabled={processing}
                                            className="text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Settings */}
                                <Card>
                                    <CardContent className="p-6">
                                        <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-800">
                                            <Settings2 className="w-5 h-5 text-gray-500" />
                                            Compression Intensity
                                        </h3>
                                        <div className="grid md:grid-cols-3 gap-4">
                                            {Object.entries(compressionSettings).map(([key, setting]) => (
                                                <div
                                                    key={key}
                                                    onClick={() => !processing && setLevel(key)}
                                                    className={cn(
                                                        "cursor-pointer rounded-xl border-2 p-4 transition-all hover:bg-gray-50",
                                                        level === key
                                                            ? "border-green-500 bg-green-50/50 shadow-sm"
                                                            : "border-gray-200"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-full h-2 rounded-full mb-3",
                                                        key === "recommended" ? "bg-green-400" : key === "quality" ? "bg-blue-400" : "bg-orange-400"
                                                    )} />
                                                    <div className="font-semibold text-gray-900 mb-1">
                                                        {setting.label}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{setting.desc}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Action */}
                                <div className="flex flex-col items-center gap-6 pt-4">
                                    {processing && (
                                        <div className="w-full max-w-md space-y-2">
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-green-700">Compressing PDF...</span>
                                                <span className="text-gray-600">{progress}%</span>
                                            </div>
                                            <Progress value={progress} className="h-3" />
                                            <p className="text-xs text-center text-gray-400">
                                                This may take a moment for large files
                                            </p>
                                        </div>
                                    )}

                                    <Button
                                        size="lg"
                                        className="w-full md:w-auto px-12 py-6 text-lg bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200"
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
                                <Card className="overflow-hidden border-2 border-green-100 shadow-xl shadow-green-100">
                                    <div className="bg-green-50/50 p-8 text-center border-b border-green-100">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                            <CheckCircle className="w-8 h-8 text-green-500" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                            Compression Successful!
                                        </h2>
                                        <p className="text-gray-600">
                                            We've reduced your file size by
                                            <strong className="text-green-600 ml-1">{result.savedPercent}%</strong>
                                        </p>
                                    </div>

                                    <CardContent className="p-8">
                                        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
                                            {/* Before */}
                                            <div className="text-center opacity-60">
                                                <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Original</div>
                                                <div className="text-2xl font-bold line-through decorations-red-500 decoration-2">
                                                    {formatFileSize(result.originalSize)}
                                                </div>
                                            </div>

                                            <ArrowRight className="w-6 h-6 text-green-400 hidden md:block" />

                                            {/* After */}
                                            <div className="text-center scale-110 transform origin-center">
                                                <div className="text-xs uppercase tracking-wider text-green-600 mb-1 font-bold">Compressed</div>
                                                <div className="text-3xl font-bold text-gray-900">
                                                    {formatFileSize(result.size)}
                                                </div>
                                                <Badge variant="outline" className="mt-2 border-green-500 text-green-700 bg-green-50">
                                                    New Size
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                            <Button
                                                size="lg"
                                                onClick={downloadResult}
                                                className="bg-green-600 hover:bg-green-700 px-8 h-12 text-base shadow-md shadow-green-200"
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
                </main>

                <Footer />
            </div>
        </>
    );
}
