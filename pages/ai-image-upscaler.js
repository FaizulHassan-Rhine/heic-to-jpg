import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useSettings } from "../lib/useSettings";
import { formatMaxMb } from "../lib/formatMaxMb";
import { Image as ImageIcon, Loader2, Download, Sparkles, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const MAX_EDGE = 1024;

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image."));
    img.src = src;
  });
}

function canvasToBlob(canvas, type = "image/png", quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Could not encode image."));
      else resolve(blob);
    }, type, quality);
  });
}

/** Downscale very large sources so ESRGAN stays fast in-browser. */
async function prepareImageElement(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(objectUrl);
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (!w || !h) throw new Error("Invalid image dimensions.");

    if (Math.max(w, h) <= MAX_EDGE) {
      return { img, revoke: () => URL.revokeObjectURL(objectUrl) };
    }

    const scale = MAX_EDGE / Math.max(w, h);
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(objectUrl);

    const blob = await canvasToBlob(canvas, "image/png");
    const preparedUrl = URL.createObjectURL(blob);
    const prepared = await loadImageElement(preparedUrl);
    return { img: prepared, revoke: () => URL.revokeObjectURL(preparedUrl) };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

async function canvasUpscale2xFromImg(img) {
  const out = document.createElement("canvas");
  out.width = img.naturalWidth * 2;
  out.height = img.naturalHeight * 2;
  const ctx = out.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, out.width, out.height);
  return canvasToBlob(out, "image/png");
}

/**
 * AI upscale via UpscalerJS + ESRGAN Slim 2x (TensorFlow.js in the browser).
 */
async function aiUpscale2x(file, onStatus) {
  let revoke = () => {};
  try {
    onStatus("Preparing image…");
    const prepared = await prepareImageElement(file);
    revoke = prepared.revoke;
    const { img } = prepared;

    onStatus("Loading ESRGAN model (first run may take a moment)…");
    const [{ default: Upscaler }, { default: x2 }] = await Promise.all([
      import("upscaler"),
      import("@upscalerjs/esrgan-slim/2x"),
    ]);

    const upscaler = new Upscaler({
      model: x2,
    });

    onStatus("Running 2× AI upscale…");
    // Returns an HTMLCanvasElement by default when patchSize is set for large images
    const result = await upscaler.upscale(img, {
      output: "canvas",
      patchSize: 128,
      padding: 8,
    });

    await upscaler.dispose?.();

    if (result instanceof HTMLCanvasElement) {
      return canvasToBlob(result, "image/png");
    }
    if (typeof result === "string") {
      const outImg = await loadImageElement(result);
      const canvas = document.createElement("canvas");
      canvas.width = outImg.naturalWidth;
      canvas.height = outImg.naturalHeight;
      canvas.getContext("2d").drawImage(outImg, 0, 0);
      return canvasToBlob(canvas, "image/png");
    }
    throw new Error("Unexpected upscaler output");
  } catch (err) {
    console.warn("AI upscale failed, using canvas fallback:", err);
    onStatus("AI model unavailable — using high-quality 2× resize…");
    const prepared = await prepareImageElement(file);
    try {
      return await canvasUpscale2xFromImg(prepared.img);
    } finally {
      prepared.revoke();
    }
  } finally {
    revoke();
  }
}

export default function AiImageUpscalerPage() {
  const { settings } = useSettings();
  const [file, setFile] = useState(null);
  const [dzFiles, setDzFiles] = useState([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [status, setStatus] = useState("");
  const [processing, setProcessing] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const outputUrlRef = useRef("");
  const upscalerWarmRef = useRef(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    };
  }, [previewUrl]);

  const onFiles = (incoming) => {
    const list = Array.isArray(incoming) ? incoming : [];
    const f = list[0];
    if (!f) {
      setDzFiles([]);
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      return;
    }
    const maxSize = settings?.image?.maxSize || 20 * 1024 * 1024;
    if (!f.type.startsWith("image/")) {
      toast.error("Please upload an image");
      return;
    }
    if (f.size > maxSize) {
      toast.error(`Max size ${formatMaxMb(maxSize)}MB`);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = "";
    }
    setOutputUrl("");
    setUsedFallback(false);
    setFile(f);
    setDzFiles([f]);
    setPreviewUrl(URL.createObjectURL(f));
    setStatus("");
  };

  const run = async () => {
    if (!file) {
      toast.error("Upload an image first");
      return;
    }
    setProcessing(true);
    setUsedFallback(false);
    try {
      let fellBack = false;
      const blob = await aiUpscale2x(file, (msg) => {
        setStatus(msg);
        if (/fallback|resize/i.test(msg)) fellBack = true;
      });
      setUsedFallback(fellBack);
      upscalerWarmRef.current = !fellBack;
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
      const url = URL.createObjectURL(blob);
      outputUrlRef.current = url;
      setOutputUrl(url);
      setStatus("");
      toast.success(fellBack ? "2× upscale ready (enhanced resize)" : "2× AI upscale ready");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Upscale failed. Try a smaller JPG/PNG.");
      setStatus("");
    } finally {
      setProcessing(false);
    }
  };

  const download = () => {
    if (!outputUrl) return;
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = (file?.name || "image").replace(/\.[^.]+$/, "") + "-2x.png";
    a.click();
  };

  return (
    <ToolPageShell containerClassName="max-w-4xl">
      <div className="space-y-8">
        <ToolPageHeader
          title="AI Image Upscaler"
          description="Enlarge images 2× with ESRGAN AI in your browser. First run downloads a small model; large photos are capped for speed."
          badge="Free • Private • Runs in your browser"
        />

        <CollapsibleDropzone
          files={dzFiles}
          setFiles={onFiles}
          maxFiles={1}
          currentFileCount={dzFiles.length}
          title="Drop an image to upscale"
          description="JPG, PNG, or WebP • ESRGAN AI runs locally in your browser"
          accept={{
            "image/jpeg": [".jpg", ".jpeg"],
            "image/png": [".png"],
            "image/webp": [".webp"],
          }}
        />

        {(previewUrl || outputUrl) && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="border-border overflow-hidden">
              <CardContent className="p-0">
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-muted/40">
                  Original
                </div>
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Original" className="w-full max-h-80 object-contain bg-muted/20" />
                ) : (
                  <div className="h-40 flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-border overflow-hidden">
              <CardContent className="p-0">
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-muted/40">
                  2× result
                </div>
                {outputUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={outputUrl} alt="Upscaled" className="w-full max-h-80 object-contain bg-muted/20" />
                ) : (
                  <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                    {processing ? status || "Working…" : "Result appears here"}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {status && processing && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {status}
          </p>
        )}

        {usedFallback && (
          <p className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            AI model could not run in this browser — used high-quality 2× resize instead.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={run} disabled={!file || processing}>
            {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {processing ? "Upscaling…" : "Upscale 2×"}
          </Button>
          <Button type="button" variant="outline" onClick={download} disabled={!outputUrl}>
            <Download className="w-4 h-4 mr-2" />
            Download PNG
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Related:{" "}
          <Link href="/compress" className="text-primary hover:underline">
            Image Compressor
          </Link>
          ,{" "}
          <Link href="/convert" className="text-primary hover:underline">
            Image Converter
          </Link>
          ,{" "}
          <Link href="/background-remover" className="text-primary hover:underline">
            Background Remover
          </Link>
          .
        </p>
      </div>
    </ToolPageShell>
  );
}
