import { useState } from "react";
import JSZip from "jszip";
import { FileImage, Download, Loader2, Trash2 } from "lucide-react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import ToolFormCard from "../components/ToolFormCard";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useSettings } from "../lib/useSettings";
import { formatMaxMb } from "../lib/formatMaxMb";

async function loadPdfJs() {
  if (typeof window !== "undefined" && window.pdfjsLib) return window.pdfjsLib;
  const pdfjsLib = await import("pdfjs-dist/build/pdf.js");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  if (typeof window !== "undefined") window.pdfjsLib = pdfjsLib;
  return pdfjsLib;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export default function PdfToImagePage() {
  const { settings } = useSettings();
  const maxFileSize = settings?.pdf?.maxSize || 20 * 1024 * 1024;
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState("jpg"); // jpg | png
  const [scale, setScale] = useState(2);
  const [quality, setQuality] = useState(0.92);
  const [busy, setBusy] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [thumbs, setThumbs] = useState([]);

  const onFiles = async (files) => {
    const f = files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    if (f.size > maxFileSize) {
      toast.error(`File exceeds ${formatMaxMb(maxFileSize)}MB limit`);
      return;
    }
    setFile(f);
    setThumbs([]);
    try {
      const pdfjsLib = await loadPdfJs();
      const data = new Uint8Array(await f.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      setPageCount(pdf.numPages);
      toast.success(`${pdf.numPages} page${pdf.numPages === 1 ? "" : "s"} ready`);
    } catch (e) {
      toast.error(e.message || "Could not read PDF");
      setFile(null);
      setPageCount(0);
    }
  };

  const convert = async () => {
    if (!file) {
      toast.error("Upload a PDF first");
      return;
    }
    setBusy(true);
    try {
      const pdfjsLib = await loadPdfJs();
      const data = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      const zip = new JSZip();
      const mime = format === "png" ? "image/png" : "image/jpeg";
      const ext = format === "png" ? "png" : "jpg";
      const previews = [];
      const base = file.name.replace(/\.pdf$/i, "") || "page";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: Number(scale) || 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await canvasToBlob(canvas, mime, format === "jpg" ? quality : undefined);
        const buf = await blob.arrayBuffer();
        zip.file(`${base}-page-${String(i).padStart(3, "0")}.${ext}`, buf);
        if (i <= 4) {
          previews.push({ page: i, url: URL.createObjectURL(blob) });
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      a.download = `${base}-images.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      setThumbs(previews);
      toast.success(`Converted ${pdf.numPages} page${pdf.numPages === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e.message || "Conversion failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell containerClassName="max-w-4xl">
      <div className="space-y-8">
        <ToolPageHeader
          title="PDF to JPG / PNG"
          description="Convert PDF pages to high-quality JPG or PNG images. Processing stays in your browser."
          badge="Free • Private • ZIP download"
        />

        <CollapsibleDropzone
          files={file ? [file] : []}
          setFiles={onFiles}
          title="Upload PDF to Convert"
          description="PDF"
          limitsText={`Max 1 file • Max ${formatMaxMb(maxFileSize)}MB`}
          accept={{ "application/pdf": [".pdf"] }}
          maxFiles={1}
          currentFileCount={file ? 1 : 0}
        />

        <ToolFormCard title="Output settings" icon={FileImage}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Format</label>
              <div className="flex gap-2">
                {["jpg", "png"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg border-2 text-sm font-semibold uppercase transition-colors",
                      format === f
                        ? "border-primary bg-brand-sky/50 text-brand-navy dark:bg-accent dark:text-foreground"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Resolution scale: {scale}x
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.5}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            {format === "jpg" && (
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  JPG quality: {Math.round(quality * 100)}%
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={1}
                  step={0.01}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {file && (
              <Badge variant="outline">
                {file.name}
                {pageCount ? ` • ${pageCount} pages` : ""}
              </Badge>
            )}
            <Button type="button" onClick={convert} disabled={!file || busy} className="bg-primary hover:bg-primary-hover">
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Convert & download ZIP
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFile(null);
                setPageCount(0);
                setThumbs([]);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </ToolFormCard>

        {thumbs.length > 0 && (
          <ToolFormCard title="Preview (first pages)">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {thumbs.map((t) => (
                <div key={t.page} className="border border-border rounded-lg overflow-hidden bg-muted/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.url} alt={`Page ${t.page}`} className="w-full h-auto object-contain" />
                  <div className="text-xs text-center text-muted-foreground py-1">Page {t.page}</div>
                </div>
              ))}
            </div>
          </ToolFormCard>
        )}
      </div>
    </ToolPageShell>
  );
}
