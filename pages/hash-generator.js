import { useState } from "react";
import { Hash, Copy, CheckCircle, Trash2, FileUp } from "lucide-react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import ToolFormCard from "../components/ToolFormCard";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { md5FromBuffer, md5FromString } from "../lib/md5";

const ALGOS = [
  { id: "MD5", label: "MD5" },
  { id: "SHA-1", label: "SHA-1" },
  { id: "SHA-256", label: "SHA-256" },
  { id: "SHA-512", label: "SHA-512" },
];

async function shaHex(algo, data) {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest(algo, buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function HashGeneratorPage() {
  const [algo, setAlgo] = useState("SHA-256");
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [hash, setHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const hashText = async () => {
    if (!input) {
      toast.error("Enter text to hash");
      return;
    }
    setBusy(true);
    try {
      const value =
        algo === "MD5" ? md5FromString(input) : await shaHex(algo, input);
      setHash(value);
      setFileName("");
      toast.success("Hash generated");
    } catch (e) {
      toast.error(e.message || "Hash failed");
    } finally {
      setBusy(false);
    }
  };

  const hashFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      const value =
        algo === "MD5" ? md5FromBuffer(buffer) : await shaHex(algo, buffer);
      setHash(value);
      setFileName(file.name);
      setInput("");
      toast.success(`Hashed ${file.name}`);
    } catch (e) {
      toast.error(e.message || "File hash failed");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!hash) {
      toast.error("Generate a hash first");
      return;
    }
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    toast.success("Hash copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolPageShell containerClassName="max-w-4xl">
      <div className="space-y-8">
        <ToolPageHeader
          title="Hash Generator"
          description="Generate MD5, SHA-1, SHA-256, and SHA-512 hashes for text or files. Processing stays in your browser."
          badge="Security • Client-side"
        />

        <div className="flex flex-wrap gap-2">
          {ALGOS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAlgo(a.id)}
              className={cn(
                "px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-colors",
                algo === a.id
                  ? "border-primary bg-brand-sky/50 text-brand-navy dark:bg-accent dark:text-foreground"
                  : "border-border text-muted-foreground"
              )}
            >
              {a.label}
            </button>
          ))}
        </div>

        <ToolFormCard title="Text input" icon={Hash}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y min-h-[140px]"
            placeholder="Type or paste text…"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={hashText} disabled={busy} className="bg-primary hover:bg-primary-hover">
              Hash text
            </Button>
            <label className="inline-flex items-center">
              <input
                type="file"
                className="hidden"
                onChange={(e) => hashFile(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={(e) => e.currentTarget.parentElement?.querySelector("input")?.click()}
              >
                <FileUp className="w-4 h-4 mr-2" />
                Hash file
              </Button>
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setInput("");
                setHash("");
                setFileName("");
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </ToolFormCard>

        <ToolFormCard title="Hash output">
          {fileName && (
            <Badge variant="outline" className="mb-2">
              File: {fileName}
            </Badge>
          )}
          <div className="flex gap-2">
            <input
              readOnly
              value={hash}
              placeholder="Hash will appear here…"
              className="input-theme font-mono text-sm"
            />
            <Button type="button" variant="outline" onClick={copy}>
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            MD5 is provided for checksums only — prefer SHA-256 for security-sensitive use.
          </p>
        </ToolFormCard>
      </div>
    </ToolPageShell>
  );
}
