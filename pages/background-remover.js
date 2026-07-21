import { useEffect, useRef, useState } from "react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
import { useSettings } from "../lib/useSettings";
import { Image as ImageIcon, Loader2, Download, RotateCcw, Settings2, Trash2, Eye, X } from "lucide-react";
import toast from "react-hot-toast";

export default function BackgroundRemoverPage() {
  const { settings } = useSettings();
  const [items, setItems] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [processingLabel, setProcessingLabel] = useState("");
  const [backendLabel, setBackendLabel] = useState("");
  const [error, setError] = useState("");
  const [viewItem, setViewItem] = useState(null);
  const rembgRef = useRef(null);
  const itemsRef = useRef([]);

  const revokeIfBlob = (url) => {
    if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
  };

  function toErrorMessage(err) {
    if (err == null) return "Failed to remove background.";
    if (typeof err === "string") return err;
    if (err instanceof Error) return err.message || String(err);
    return String(err);
  }

  /** Transformers.js hub helpers expect a real string URL; never pass URL objects or odd types. */
  function toFetchableUrlString(u) {
    if (u == null || u === "") throw new Error("Missing image URL.");
    if (typeof u === "string") return u;
    if (typeof URL !== "undefined" && u instanceof URL) return u.href;
    return String(u);
  }

  /**
   * Re-encode as standard 8-bit RGBA PNG via canvas, then return a fresh blob: URL.
   * blob: URLs are universally fetchable by rembg / Transformers.js without any URL string issues.
   * The caller must revoke the returned blob URL after processing.
   */
  function createNormalizedBlobUrl(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          if (!w || !h) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Invalid image dimensions."));
            return;
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Could not create canvas context."));
            return;
          }
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(objectUrl);
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error("Could not encode image as PNG."));
              return;
            }
            resolve(URL.createObjectURL(blob));
          }, "image/png");
        } catch (err) {
          URL.revokeObjectURL(objectUrl);
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not decode image (unsupported or corrupt file)."));
      };
      img.src = objectUrl;
    });
  }

  const loadLibrary = async () => {
    if (rembgRef.current) return rembgRef.current;
    // Load onnxruntime-web BEFORE rembg so wasmPaths is set; use extern-wasm build via webpack conditionNames.
    const ort = await import("onnxruntime-web");
    if (typeof window !== "undefined" && ort.env?.wasm && !ort.env.wasm.wasmPaths) {
      ort.env.wasm.wasmPaths = `${window.location.origin}/onnxruntime-web/`;
    }
    try {
      const { env } = await import("@huggingface/transformers");
      env.useBrowserCache = false;
    } catch (_) {}
    const mod = await import("rembg-webgpu");
    rembgRef.current = mod;
    try {
      const cap = await mod.getCapabilities();
      setBackendLabel(`${cap.device.toUpperCase()} (${cap.dtype.toUpperCase()})`);
    } catch (_) {}
    return mod;
  };

  const clearAll = () => {
    items.forEach((it) => {
      revokeIfBlob(it.sourceUrl);
      revokeIfBlob(it.outputUrl);
    });
    setItems([]);
    setError("");
    setPhase("idle");
    setProgress(0);
    setProcessingLabel("");
    setViewItem(null);
  };

  const handleFilesAdded = (newFiles) => {
    const maxSize = settings?.image?.maxSize || 20 * 1024 * 1024;
    const maxFiles = settings?.image?.maxFiles || 20;
    const totalFiles = items.length + newFiles.length;
    if (totalFiles > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    const files = Array.from(newFiles || []);
    if (files.length === 0) return;
    const invalid = files.find((f) => !f.type.startsWith("image/"));
    if (invalid) {
      toast.error("Please upload an image file.");
      return;
    }
    const oversized = files.find((f) => f.size > maxSize);
    if (oversized) {
      toast.error(`${oversized.name} exceeds max size (${Math.round(maxSize / (1024 * 1024))}MB).`);
      return;
    }
    setError("");
    const next = files.map((file, idx) => ({
      id: `${Date.now()}-${idx}-${file.name}`,
      file,
      name: file.name,
      size: file.size,
      sourceUrl: URL.createObjectURL(file),
      outputUrl: "",
      status: "ready",
      processingTime: 0,
      error: "",
    }));
    setItems((prev) => [...prev, ...next]);
  };

  const removeItem = (id) => {
    const target = items.find((it) => it.id === id);
    if (target) {
      revokeIfBlob(target.sourceUrl);
      revokeIfBlob(target.outputUrl);
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (viewItem?.id === id) setViewItem(null);
  };

  const processItem = async (itemId, positionLabel = "") => {
    const target = itemsRef.current.find((it) => it.id === itemId);
    if (!target) return;

    setError("");
    let unsub = null;
    let tempBlobUrl = null;
    try {
      const mod = await loadLibrary();
      unsub = mod.subscribeToProgress((s) => {
        setPhase(s.phase || "idle");
        setProgress(typeof s.progress === "number" ? s.progress : 0);
      });
      setProcessingLabel(positionLabel || target.name);
      setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, status: "processing", error: "" } : it)));

      // Normalise image to a fresh blob: URL (standard 8-bit RGBA PNG).
      // blob: URLs are universally fetchable; data: URLs can trip up in some environments.
      let inferenceUrl;
      try {
        tempBlobUrl = await createNormalizedBlobUrl(target.file);
        inferenceUrl = tempBlobUrl;
      } catch {
        inferenceUrl = toFetchableUrlString(target.sourceUrl);
      }

      const result = await mod.removeBackground(inferenceUrl);
      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? {
              ...it,
              outputUrl: result.blobUrl,
              processingTime: result.processingTimeSeconds || 0,
              status: "done",
              error: "",
            }
            : it
        )
      );
      setPhase("ready");
      setProgress(100);
    } catch (e) {
      const msg = toErrorMessage(e);
      setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, status: "error", error: msg } : it)));
      toast.error(`Failed: ${target.name}`);
      setPhase("error");
    } finally {
      if (tempBlobUrl) {
        try { URL.revokeObjectURL(tempBlobUrl); } catch (_) {}
        tempBlobUrl = null;
      }
      try { unsub?.(); } catch (_) {}
    }
  };

  const processAll = async () => {
    if (items.length === 0) {
      toast.error("Please upload images first.");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      const toProcess = itemsRef.current.filter((it) => it.status !== "done");
      for (let i = 0; i < toProcess.length; i += 1) {
        const item = toProcess[i];
        // eslint-disable-next-line no-await-in-loop
        await processItem(item.id, `${i + 1}/${toProcess.length} • ${item.name}`);
      }
      const latest = itemsRef.current;
      const failedCount = latest.filter((it) => it.status === "error").length;
      if (failedCount > 0) {
        toast.error(`Bulk done with ${failedCount} failed image(s).`);
      } else {
        toast.success("Bulk processing finished.");
      }
    } catch (e) {
      setError(toErrorMessage(e) || "Bulk processing failed.");
    } finally {
      setProcessing(false);
      setProcessingLabel("");
    }
  };

  const onDownload = (item) => {
    if (!item?.outputUrl) return;
    const a = document.createElement("a");
    a.href = item.outputUrl;
    a.download = `${String(item.name ?? "image").replace(/\.[^/.]+$/, "")}-no-bg.png`;
    a.click();
  };

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((it) => {
        revokeIfBlob(it.sourceUrl);
        revokeIfBlob(it.outputUrl);
      });
    };
  }, []);

  return (
    <>
    <ToolPageShell containerClassName="max-w-5xl">
        <ToolPageHeader
          title="Background Remover"
          description="100% client-side AI background removal. No API key, no server upload, privacy-first."
        />

        <CollapsibleDropzone
          files={items.map((it) => it.file)}
          setFiles={handleFilesAdded}
          disabled={false}
          onDisabledClick={() => {
            const maxFiles = settings?.image?.maxFiles || 20;
            toast.error(`Maximum ${maxFiles} files allowed.`);
          }}
          maxFiles={settings?.image?.maxFiles || 20}
          currentFileCount={items.length}
          title="Upload Images to Remove Background"
          description={`JPG, PNG, WebP • Max ${Math.round((settings?.image?.maxSize || 20 * 1024 * 1024) / (1024 * 1024))}MB each • Up to ${settings?.image?.maxFiles || 20} files • ${backendLabel || "Backend auto-detects WebGPU/WASM"}`}
          accept={{
            "image/jpeg": [".jpg", ".jpeg", ".JPG", ".JPEG"],
            "image/png": [".png", ".PNG"],
            "image/webp": [".webp", ".WEBP"],
          }}
        />

        {items.length > 0 && (
          <div className="mt-6 grid lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
            <Card className="md:sticky md:top-24 h-fit">
              <CardContent className="p-5 space-y-5">
                <div className="flex items-center gap-2 font-semibold text-lg text-foreground">
                  <Settings2 className="w-5 h-5" />
                  <span>Output Settings</span>
                </div>
                <div className="bg-muted/40 border border-border rounded-lg p-3">
                  <div className="text-xs text-muted-foreground font-medium mb-1">Global Settings</div>
                  <div className="text-sm text-muted-foreground">Transparent PNG output for all files</div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button type="button" onClick={processAll} disabled={processing || items.length === 0} className="gap-2">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                    Process All
                  </Button>
                  <Button type="button" variant="outline" onClick={clearAll} disabled={processing || items.length === 0} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>
                {processing && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Processing {processingLabel ? `(${processingLabel})` : ""}: {phase} ({Math.round(progress)}%)
                    </p>
                    <div className="h-2 w-full rounded bg-muted overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
                    </div>
                  </div>
                )}
                {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-xl">Files</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={clearAll} disabled={processing} className="gap-2 text-red-600">
                    <Trash2 className="h-4 w-4" />
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span>Total: <strong className="text-foreground">{items.length}</strong></span>
                  <span>Completed: <strong className="text-primary">{items.filter((it) => it.status === "done").length}</strong></span>
                  <span>Processing: <strong className="text-primary">{items.filter((it) => it.status === "processing").length}</strong></span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-3 bg-card dark:bg-card">
                    <img src={item.sourceUrl} alt={item.name} className="w-14 h-14 rounded object-cover border" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(item.size / 1024).toFixed(2)} KB • {item.status === "done" ? `Done in ${item.processingTime.toFixed(2)}s` : item.status}
                      </p>
                      {item.error && <p className="text-xs text-red-600 truncate">{item.error}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {item.status === "done" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setViewItem(item)}
                          className="gap-1.5"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => processItem(item.id, item.name)}
                          disabled={processing}
                          className="gap-1.5"
                        >
                          {item.status === "processing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                          Process
                        </Button>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={() => onDownload(item)} disabled={!item.outputUrl} className="gap-1.5">
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)} disabled={processing} className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
    </ToolPageShell>
      {viewItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-auto bg-background rounded-xl shadow-2xl border">
            <div className="sticky top-0 z-10 bg-background border-b px-5 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Before vs After</h3>
                <p className="text-xs text-muted-foreground truncate max-w-[70vw]">{viewItem.name}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setViewItem(null)} className="gap-1.5">
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-4 p-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Before</CardTitle>
                </CardHeader>
                <CardContent>
                  <img src={viewItem.sourceUrl} alt={`${viewItem.name} before`} className="w-full rounded-lg border" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">After</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => onDownload(viewItem)} className="gap-1.5">
                    <Download className="h-4 w-4" />
                    Download PNG
                  </Button>
                </CardHeader>
                <CardContent>
                  {viewItem.outputUrl ? (
                    <img src={viewItem.outputUrl} alt={`${viewItem.name} after`} className="w-full rounded-lg border bg-muted dark:bg-muted" />
                  ) : (
                    <p className="text-sm text-muted-foreground">Output is not available for this file.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
