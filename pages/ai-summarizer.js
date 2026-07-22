import { useState } from "react";
import Link from "next/link";
import { FileText, Copy, CheckCircle, Loader2, Sparkles, Type } from "lucide-react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import ToolFormCard from "../components/ToolFormCard";
import { Button } from "../components/ui/button";
import toast from "react-hot-toast";
import { callAiApi } from "../lib/ai/client";
import { MAX_INPUT_CHARS } from "../lib/ai/constants";

const LENGTHS = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Detailed" },
];

async function loadPdfJs() {
  if (typeof window !== "undefined" && window.pdfjsLib) return window.pdfjsLib;
  const pdfjsLib = await import("pdfjs-dist/build/pdf.js");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  if (typeof window !== "undefined") window.pdfjsLib = pdfjsLib;
  return pdfjsLib;
}

async function extractPdfText(file) {
  const pdfjsLib = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const parts = [];
  const maxPages = Math.min(pdf.numPages, 40);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((it) => ("str" in it ? it.str : "")).join(" ");
    if (pageText.trim()) parts.push(pageText);
  }
  return parts.join("\n\n").trim();
}

export default function AiSummarizerPage() {
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [length, setLength] = useState("medium");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const [copied, setCopied] = useState(false);

  const onPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    setExtracting(true);
    setPdfName(file.name);
    try {
      const extracted = await extractPdfText(file);
      if (!extracted) {
        toast.error("No selectable text found (scanned PDFs need OCR first)");
        setText("");
        return;
      }
      const clipped = extracted.slice(0, MAX_INPUT_CHARS);
      setText(clipped);
      setMode("text");
      toast.success(
        extracted.length > MAX_INPUT_CHARS
          ? "PDF text extracted (trimmed to limit)"
          : "PDF text extracted in your browser"
      );
    } catch (err) {
      toast.error(err.message || "Could not read PDF");
      setPdfName("");
    } finally {
      setExtracting(false);
      e.target.value = "";
    }
  };

  const run = async () => {
    if (!text.trim()) {
      toast.error("Paste text or extract a PDF first");
      return;
    }
    setLoading(true);
    try {
      const data = await callAiApi("/api/ai/summarize", { text, length });
      setResult(data.result || "");
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      toast.success("Summary ready");
    } catch (err) {
      toast.error(err.message || "Failed to summarize");
      if (typeof err.remaining === "number") setRemaining(err.remaining);
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolPageShell containerClassName="max-w-4xl">
      <div className="space-y-8">
        <ToolPageHeader
          title="AI Summarizer"
          description="Summarize long text or extract text from a PDF in your browser, then summarize with AI. PDFs are not uploaded to the AI — only extracted text."
          badge="Free • Daily limit • No signup required"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("text")}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              mode === "text"
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border text-muted-foreground"
            }`}
          >
            Paste text
          </button>
          <button
            type="button"
            onClick={() => setMode("pdf")}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              mode === "pdf"
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border text-muted-foreground"
            }`}
          >
            Upload PDF
          </button>
        </div>

        {mode === "pdf" ? (
          <ToolFormCard title="PDF (text extracted locally)" icon={FileText}>
            <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 cursor-pointer hover:border-brand-mid/50 transition-colors">
              <FileText className="h-8 w-8 text-primary" />
              <span className="text-sm text-foreground font-medium">
                {extracting ? "Extracting text…" : "Choose a PDF"}
              </span>
              <span className="text-xs text-muted-foreground">
                Text is read in your browser, then sent for summarization
              </span>
              <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={onPdf} disabled={extracting} />
            </label>
            {pdfName && <p className="text-sm text-muted-foreground">Loaded: {pdfName}</p>}
            {text && (
              <p className="text-xs text-muted-foreground">
                Extracted {text.length.toLocaleString()} characters — switch to Paste text to edit before summarizing.
              </p>
            )}
          </ToolFormCard>
        ) : (
          <ToolFormCard title="Text to summarize" icon={Type}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste article, notes, or PDF extract…"
              rows={12}
              className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-brand-mid resize-y min-h-[220px]"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                {text.length.toLocaleString()} / {MAX_INPUT_CHARS.toLocaleString()} characters
              </span>
              {remaining != null && <span>{remaining} free uses left today</span>}
            </div>
          </ToolFormCard>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {LENGTHS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLength(l.value)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  length === l.value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <Button type="button" onClick={run} disabled={loading || extracting || !text.trim()}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {loading ? "Summarizing…" : "Summarize"}
          </Button>
        </div>

        {result && (
          <ToolFormCard title="Summary" icon={CheckCircle}>
            <textarea
              value={result}
              readOnly
              rows={8}
              className="w-full rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground shadow-sm resize-y min-h-[160px]"
            />
            <Button type="button" variant="outline" onClick={copyResult}>
              {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Copy summary
            </Button>
          </ToolFormCard>
        )}

        <p className="text-sm text-muted-foreground">
          Scanned PDFs without text layer? Use{" "}
          <Link href="/extract-text" className="text-primary hover:underline">
            Extract Text (OCR)
          </Link>{" "}
          first. Related:{" "}
          <Link href="/ai-paraphraser" className="text-primary hover:underline">
            AI Paraphraser
          </Link>
          .
        </p>
      </div>
    </ToolPageShell>
  );
}
