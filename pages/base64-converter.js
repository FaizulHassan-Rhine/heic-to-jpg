import { useRef, useState } from "react";
import { Binary, Copy, CheckCircle, Image as ImageIcon, Trash2 } from "lucide-react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import ToolFormCard from "../components/ToolFormCard";
import { Button } from "../components/ui/button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function Base64ConverterPage() {
  const fileRef = useRef(null);
  const [mode, setMode] = useState("encode");
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const encodeText = () => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(text)));
      setOutput(encoded);
      setPreviewUrl("");
      toast.success("Encoded");
    } catch {
      toast.error("Could not encode text");
    }
  };

  const decodeText = () => {
    try {
      const clean = text.replace(/\s/g, "");
      const decoded = decodeURIComponent(escape(atob(clean)));
      setOutput(decoded);
      if (clean.startsWith("/9j/") || clean.startsWith("iVBOR") || clean.startsWith("R0lGOD")) {
        setPreviewUrl(`data:image/*;base64,${clean}`);
      } else if (decoded.startsWith("data:image")) {
        setPreviewUrl(decoded);
      } else {
        setPreviewUrl("");
      }
      toast.success("Decoded");
    } catch {
      toast.error("Invalid Base64");
      setPreviewUrl("");
    }
  };

  const onImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const b64 = dataUrl.split(",")[1] || "";
      setText(b64);
      setOutput(dataUrl);
      setPreviewUrl(dataUrl);
      setMode("encode");
      toast.success("Image encoded");
    };
    reader.readAsDataURL(file);
  };

  const run = () => (mode === "encode" ? encodeText() : decodeText());

  const copy = async () => {
    const value = output || text;
    if (!value) {
      toast.error("Nothing to copy");
      return;
    }
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolPageShell containerClassName="max-w-4xl">
      <div className="space-y-8">
        <ToolPageHeader
          title="Base64 Encode / Decode"
          description="Encode text or images to Base64 and decode Base64 back. Runs entirely in your browser."
          badge="Text • Images • Private"
        />

        <div className="flex gap-2">
          {["encode", "decode"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "px-4 py-2 rounded-lg border-2 text-sm font-semibold capitalize transition-colors",
                mode === m
                  ? "border-primary bg-brand-sky/50 text-brand-navy dark:bg-accent dark:text-foreground"
                  : "border-border text-muted-foreground"
              )}
            >
              {m}
            </button>
          ))}
        </div>

        <ToolFormCard title={mode === "encode" ? "Input text" : "Base64 input"} icon={Binary}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            spellCheck={false}
            className="w-full rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y min-h-[160px]"
            placeholder={mode === "encode" ? "Type text to encode…" : "Paste Base64 to decode…"}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onImage(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2 items-center">
            <Button type="button" onClick={run} className="bg-primary hover:bg-primary-hover">
              {mode === "encode" ? "Encode" : "Decode"}
            </Button>
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              <ImageIcon className="w-4 h-4 mr-2" />
              Encode image
            </Button>
            <Button type="button" variant="outline" onClick={copy}>
              {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Copy output
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setText("");
                setOutput("");
                setPreviewUrl("");
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </ToolFormCard>

        <ToolFormCard title="Output">
          <textarea
            value={output}
            readOnly
            rows={8}
            className="w-full rounded-lg border border-border bg-muted/30 px-4 py-3 font-mono text-sm resize-y min-h-[140px]"
            placeholder="Result appears here…"
          />
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Decoded preview"
              className="max-h-56 rounded-lg border border-border object-contain bg-muted/40 p-2"
            />
          ) : null}
        </ToolFormCard>
      </div>
    </ToolPageShell>
  );
}
