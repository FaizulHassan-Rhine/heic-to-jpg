import { useState } from "react";
import JSZip from "jszip";
import { Image as ImageIcon, Download, Loader2, Trash2 } from "lucide-react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import ToolFormCard from "../components/ToolFormCard";
import Dropzone from "../components/Dropzone";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import toast from "react-hot-toast";

const SIZES = [16, 32, 48, 64, 128, 180, 192, 512];

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type = "image/png") {
  return new Promise((resolve) => canvas.toBlob(resolve, type));
}

/** Minimal ICO from square PNG buffers (BMP-less PNG-in-ICO). */
function buildIcoFromPngs(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const entries = [];
  for (let i = 0; i < count; i++) {
    const size = sizes[i];
    const data = pngBuffers[i];
    entries.push({ size, data, offset });
    offset += data.length;
  }
  const total = offset;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, count, true);
  let entryAt = 6;
  for (const e of entries) {
    out[entryAt] = e.size >= 256 ? 0 : e.size;
    out[entryAt + 1] = e.size >= 256 ? 0 : e.size;
    out[entryAt + 2] = 0;
    out[entryAt + 3] = 0;
    view.setUint16(entryAt + 4, 1, true);
    view.setUint16(entryAt + 6, 32, true);
    view.setUint32(entryAt + 8, e.data.length, true);
    view.setUint32(entryAt + 12, e.offset, true);
    out.set(e.data, e.offset);
    entryAt += 16;
  }
  return out;
}

export default function FaviconGeneratorPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState([]);

  const onFiles = async (files) => {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/") && !/\.(png|jpe?g|webp|gif|svg)$/i.test(f.name)) {
      toast.error("Please upload an image");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setPreviews([]);
  };

  const generate = async () => {
    if (!file) {
      toast.error("Upload an image first");
      return;
    }
    setBusy(true);
    try {
      const img = await loadImage(file);
      const zip = new JSZip();
      const folder = zip.folder("favicons");
      const icoPngs = [];
      const icoSizes = [16, 32, 48];
      const thumbs = [];

      for (const size of SIZES) {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, size, size);
        // contain fit
        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        const blob = await canvasToBlob(canvas);
        const buf = new Uint8Array(await blob.arrayBuffer());
        folder.file(`favicon-${size}x${size}.png`, buf);
        if (icoSizes.includes(size)) icoPngs.push(buf);
        if ([16, 32, 48, 64, 128].includes(size)) {
          thumbs.push({ size, url: URL.createObjectURL(blob) });
        }
      }

      const ico = buildIcoFromPngs(icoPngs, icoSizes);
      folder.file("favicon.ico", ico);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(zipBlob);
      a.download = "favicons.zip";
      a.click();
      URL.revokeObjectURL(a.href);
      setPreviews(thumbs);
      toast.success("Favicon pack downloaded");
    } catch (e) {
      toast.error(e.message || "Failed to generate favicons");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell containerClassName="max-w-4xl">
      <div className="space-y-8">
        <ToolPageHeader
          title="Favicon Generator"
          description="Create a complete favicon pack (ICO + PNG sizes) from any image. Generated locally in your browser."
          badge="ICO • PNG • ZIP"
        />

        <Dropzone
          setFiles={onFiles}
          title="Upload logo or icon image"
          description="PNG, JPG, WebP, GIF, SVG • Square images work best"
          accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"] }}
          maxFiles={1}
          currentFileCount={file ? 1 : 0}
        />

        {preview && (
          <ToolFormCard title="Source" icon={ImageIcon}>
            <div className="flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Source" className="h-24 w-24 rounded-lg border border-border object-contain bg-muted/40" />
              <div className="space-y-2">
                <Badge variant="outline">{file?.name}</Badge>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={generate} disabled={busy} className="bg-primary hover:bg-primary-hover">
                    {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Download favicon pack
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setPreview("");
                      setPreviews([]);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Includes {SIZES.join(", ")}px PNGs plus favicon.ico (16/32/48).
                </p>
              </div>
            </div>
            {previews.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-2">
                {previews.map((p) => (
                  <div key={p.size} className="text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`${p.size}px`} className="mx-auto border border-border rounded bg-muted/30" style={{ width: Math.min(p.size, 64), height: Math.min(p.size, 64) }} />
                    <div className="text-[10px] text-muted-foreground mt-1">{p.size}px</div>
                  </div>
                ))}
              </div>
            )}
          </ToolFormCard>
        )}
      </div>
    </ToolPageShell>
  );
}
