import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../lib/authContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  Download, RotateCcw, QrCode, Barcode, Copy, Palette,
  Type, Maximize2, Loader2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import Head from "next/head";

const QR_SIZES = [128, 200, 256, 300, 400, 512];

const BARCODE_FORMATS = [
  { value: "CODE128", label: "Code 128", desc: "Any text" },
  { value: "EAN13", label: "EAN-13", desc: "13 digits" },
  { value: "EAN8", label: "EAN-8", desc: "8 digits" },
  { value: "UPC", label: "UPC-A", desc: "12 digits" },
  { value: "CODE39", label: "Code 39", desc: "Alphanumeric" },
  { value: "ITF14", label: "ITF-14", desc: "14 digits" },
  { value: "pharmacode", label: "Pharmacode", desc: "3-131070" },
];

const QR_COLORS = [
  { fg: "#000000", bg: "#FFFFFF", label: "Classic" },
  { fg: "#1a1a2e", bg: "#FFFFFF", label: "Dark Navy" },
  { fg: "#e94560", bg: "#FFFFFF", label: "Red" },
  { fg: "#0f3460", bg: "#FFFFFF", label: "Blue" },
  { fg: "#16813d", bg: "#FFFFFF", label: "Green" },
  { fg: "#6c3483", bg: "#FFFFFF", label: "Purple" },
  { fg: "#FFFFFF", bg: "#000000", label: "Inverted" },
  { fg: "#e94560", bg: "#1a1a2e", label: "Neon Red" },
];

export default function QrBarcode() {
  const { user, trackUsage } = useAuth();
  const [mode, setMode] = useState("qr"); // "qr" or "barcode"
  const [inputText, setInputText] = useState("");
  const [qrSize, setQrSize] = useState(256);
  const [qrColor, setQrColor] = useState(QR_COLORS[0]);
  const [customFg, setCustomFg] = useState("#000000");
  const [customBg, setCustomBg] = useState("#FFFFFF");
  const [useCustomColors, setUseCustomColors] = useState(false);
  const [barcodeFormat, setBarcodeFormat] = useState("CODE128");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef(null);
  const barcodeRef = useRef(null);

  const generateQR = useCallback(async () => {
    if (!inputText.trim()) return;

    setIsGenerating(true);
    try {
      const QRCode = (await import("qrcode")).default;
      const fg = useCustomColors ? customFg : qrColor.fg;
      const bg = useCustomColors ? customBg : qrColor.bg;

      const dataUrl = await QRCode.toDataURL(inputText, {
        width: qrSize,
        margin: 2,
        color: {
          dark: fg,
          light: bg,
        },
        errorCorrectionLevel: "M",
      });

      setGeneratedImage(dataUrl);
      
      // Track usage after successful QR generation
      if (user && trackUsage) {
        trackUsage("/qr-barcode", 1, 1, {
          tool: "QR Code Generator",
          filesProcessed: 1,
        });
      }
    } catch (error) {
      console.error("QR generation error:", error);
      toast.error("Failed to generate QR code: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  }, [inputText, qrSize, qrColor, customFg, customBg, useCustomColors, user, trackUsage]);

  const generateBarcode = useCallback(async () => {
    if (!inputText.trim()) return;

    setIsGenerating(true);
    try {
      const JsBarcode = (await import("jsbarcode")).default;

      // Create a canvas
      const canvas = document.createElement("canvas");
      JsBarcode(canvas, inputText, {
        format: barcodeFormat,
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 16,
        margin: 10,
        background: "#FFFFFF",
        lineColor: "#000000",
      });

      const dataUrl = canvas.toDataURL("image/png");
      setGeneratedImage(dataUrl);
      
      // Track usage after successful barcode generation
      if (user && trackUsage) {
        trackUsage("/qr-barcode", 1, 1, {
          tool: "Barcode Generator",
          filesProcessed: 1,
        });
      }
    } catch (error) {
      console.error("Barcode generation error:", error);
      toast.error("Failed to generate barcode. Check your input matches the format requirements.");
    } finally {
      setIsGenerating(false);
    }
  }, [inputText, barcodeFormat, user, trackUsage]);

  const generate = () => {
    if (!inputText.trim()) {
      toast.error("Please enter text or data first");
      return;
    }
    if (mode === "qr") {
      generateQR();
    } else {
      generateBarcode();
    }
  };

  // Auto-regenerate when settings change (if there's already a generated image)
  useEffect(() => {
    if (generatedImage && inputText.trim()) {
      const timer = setTimeout(() => {
        if (mode === "qr") generateQR();
        else generateBarcode();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [qrSize, qrColor, customFg, customBg, useCustomColors, barcodeFormat]);

  const downloadImage = (format = "png") => {
    if (!generatedImage) return;

    const a = document.createElement("a");
    a.href = generatedImage;
    a.download = `${mode === "qr" ? "qrcode" : "barcode"}-${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadSVG = async () => {
    if (!inputText.trim()) return;

    try {
      if (mode === "qr") {
        const QRCode = (await import("qrcode")).default;
        const fg = useCustomColors ? customFg : qrColor.fg;
        const bg = useCustomColors ? customBg : qrColor.bg;

        const svgString = await QRCode.toString(inputText, {
          type: "svg",
          width: qrSize,
          margin: 2,
          color: { dark: fg, light: bg },
          errorCorrectionLevel: "M",
        });

        const blob = new Blob([svgString], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `qrcode-${Date.now()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const JsBarcode = (await import("jsbarcode")).default;
        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        JsBarcode(svgElement, inputText, {
          format: barcodeFormat,
          width: 2,
          height: 100,
          displayValue: true,
          fontSize: 16,
          margin: 10,
          xmlDocument: document,
        });

        const svgString = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `barcode-${Date.now()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success("SVG downloaded!");
    } catch (error) {
      toast.error("Failed to generate SVG");
    }
  };

  const copyToClipboard = async () => {
    if (!generatedImage) return;
    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy. Try downloading instead.");
    }
  };

  const resetAll = () => {
    setInputText("");
    setGeneratedImage(null);
    setQrSize(256);
    setQrColor(QR_COLORS[0]);
    setUseCustomColors(false);
    setCustomFg("#000000");
    setCustomBg("#FFFFFF");
    setBarcodeFormat("CODE128");
  };

  return (
    <>
      <Head>
        <title>QR Code & Barcode Generator - ConvertMastery</title>
        <meta name="description" content="Generate QR codes and barcodes for free. Custom colors, sizes, and multiple barcode formats. Download as PNG or SVG." />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
              QR Code & Barcode Generator
            </h1>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Generate custom QR codes and barcodes instantly.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Input & Settings */}
            <div className="space-y-6">
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  {/* Mode Toggle */}
                  <div className="flex justify-center mb-6">
                    <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                      <button
                        onClick={() => { setMode("qr"); setGeneratedImage(null); }}
                        className={cn("px-4 py-2 text-sm rounded-lg transition-all font-medium flex items-center gap-2",
                          mode === "qr" ? "bg-white text-violet-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                      >
                        <QrCode className="h-4 w-4" /> QR Code
                      </button>
                      <button
                        onClick={() => { setMode("barcode"); setGeneratedImage(null); }}
                        className={cn("px-4 py-2 text-sm rounded-lg transition-all font-medium flex items-center gap-2",
                          mode === "barcode" ? "bg-white text-violet-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                      >
                        <Barcode className="h-4 w-4" /> Barcode
                      </button>
                    </div>
                  </div>

                  <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
                    {mode === "qr" ? "Text, URL, or Data" : "Barcode Data"}
                  </label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={mode === "qr" ? "Enter text, URL, email, phone, or any data..." : "Enter data matching the barcode format..."}
                    className="w-full h-28 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-800 mb-3"
                  />
                  {mode === "qr" && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[{ label: "URL", prefix: "https://" }, { label: "Email", prefix: "mailto:" }, { label: "Phone", prefix: "tel:" }, { label: "SMS", prefix: "sms:" }, { label: "WiFi", prefix: "WIFI:T:WPA;S:MyNetwork;P:password;;" }].map((item) => (
                        <button key={item.label} onClick={() => setInputText(item.prefix)}
                          className="text-xs px-2.5 py-1 bg-violet-50 hover:bg-violet-100 rounded-md text-violet-600 transition-colors font-medium">
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {mode === "qr" && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-2">
                            <Maximize2 className="h-4 w-4" /> Size: {qrSize}px
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {QR_SIZES.map((size) => (
                              <button key={size} onClick={() => setQrSize(size)}
                                className={cn("px-3 py-2 rounded-md text-sm border transition-colors",
                                  qrSize === size ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-600 hover:bg-gray-50")}>
                                {size}px
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-2">
                            <Palette className="h-4 w-4" /> Colors
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {QR_COLORS.map((color, i) => (
                              <button key={i} onClick={() => { setQrColor(color); setUseCustomColors(false); }}
                                className={cn("p-2 rounded-lg border-2 text-center transition-all",
                                  !useCustomColors && qrColor === color ? "border-violet-500 ring-2 ring-violet-200" : "border-gray-200 hover:border-gray-300")}>
                                <div className="flex justify-center gap-1 mb-1">
                                  <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: color.fg }} />
                                  <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: color.bg }} />
                                </div>
                                <span className="text-[10px] text-gray-500">{color.label}</span>
                              </button>
                            ))}
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer mt-3">
                            <input type="checkbox" checked={useCustomColors} onChange={(e) => setUseCustomColors(e.target.checked)} className="w-4 h-4 accent-violet-600 rounded" />
                            <span className="text-sm text-gray-600">Use custom colors</span>
                          </label>
                          {useCustomColors && (
                            <div className="flex gap-4 mt-2">
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Foreground</label>
                                <div className="flex items-center gap-2">
                                  <input type="color" value={customFg} onChange={(e) => setCustomFg(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                                  <span className="text-xs text-gray-500 font-mono">{customFg}</span>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 block mb-1">Background</label>
                                <div className="flex items-center gap-2">
                                  <input type="color" value={customBg} onChange={(e) => setCustomBg(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                                  <span className="text-xs text-gray-500 font-mono">{customBg}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {mode === "barcode" && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2 block">Format</label>
                        <div className="grid grid-cols-2 gap-2">
                          {BARCODE_FORMATS.map((fmt) => (
                            <button key={fmt.value} onClick={() => setBarcodeFormat(fmt.value)}
                              className={cn("p-2.5 rounded-lg border text-left transition-all",
                                barcodeFormat === fmt.value ? "border-violet-200 bg-violet-50 text-violet-700 ring-1 ring-violet-200" : "border-gray-200 hover:border-gray-300 text-gray-600")}>
                              <span className="text-sm font-medium block">{fmt.label}</span>
                              <span className="text-[10px] text-gray-400">{fmt.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mt-6 space-y-2">
                    <Button onClick={generate} disabled={!inputText.trim() || isGenerating}
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white h-11 shadow-md hover:shadow-lg transition-all font-semibold">
                      {isGenerating ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Generating...</> : (
                        <>{mode === "qr" ? <QrCode className="h-5 w-5 mr-2" /> : <Barcode className="h-5 w-5 mr-2" />} Generate {mode === "qr" ? "QR Code" : "Barcode"}</>
                      )}
                    </Button>
                    <Button onClick={resetAll} variant="outline" className="w-full text-gray-500">
                      <RotateCcw className="w-4 h-4 mr-2" /> Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Preview */}
            <div>
              <Card className="border border-gray-200 shadow-sm h-full">
                <CardContent className="p-6">
                  <h3 className="font-bold text-xl text-gray-800 mb-1">Preview</h3>
                  <p className="text-gray-500 text-sm mb-6">{mode === "qr" ? "QR Code" : "Barcode"} output</p>

                  <div className="flex flex-col items-center justify-center min-h-[400px]">
                    {generatedImage ? (
                      <div className="text-center w-full">
                        <div className="bg-white rounded-lg p-4 inline-block border shadow-sm mb-6">
                          <img src={generatedImage} alt={`Generated ${mode === "qr" ? "QR Code" : "Barcode"}`}
                            className="max-w-full mx-auto" style={mode === "qr" ? { width: qrSize, height: qrSize } : {}} />
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button onClick={() => downloadImage("png")} className="bg-violet-600 hover:bg-violet-700 text-white">
                            <Download className="h-4 w-4 mr-2" /> PNG
                          </Button>
                          <Button onClick={downloadSVG} variant="outline">
                            <Download className="h-4 w-4 mr-2" /> SVG
                          </Button>
                          <Button onClick={copyToClipboard} variant="outline">
                            <Copy className="h-4 w-4 mr-2" /> Copy
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        {mode === "qr" ? <QrCode className="h-20 w-20 mx-auto text-gray-200 mb-4" /> : <Barcode className="h-20 w-20 mx-auto text-gray-200 mb-4" />}
                        <h3 className="text-lg font-medium text-gray-400">{mode === "qr" ? "QR Code" : "Barcode"} Preview</h3>
                        <p className="text-sm text-gray-300 mt-1">Enter data and click Generate</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}

