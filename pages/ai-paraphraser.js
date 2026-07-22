import { useState } from "react";
import Link from "next/link";
import { Type, Copy, CheckCircle, Loader2, Sparkles } from "lucide-react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import ToolFormCard from "../components/ToolFormCard";
import { Button } from "../components/ui/button";
import toast from "react-hot-toast";
import { callAiApi } from "../lib/ai/client";
import { MAX_INPUT_CHARS } from "../lib/ai/constants";

const TONES = [
  { value: "standard", label: "Standard" },
  { value: "formal", label: "Formal" },
  { value: "simple", label: "Simple" },
  { value: "creative", label: "Creative" },
];

export default function AiParaphraserPage() {
  const [text, setText] = useState("");
  const [tone, setTone] = useState("standard");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    if (!text.trim()) {
      toast.error("Paste some text to rewrite");
      return;
    }
    if (text.length > MAX_INPUT_CHARS) {
      toast.error(`Max ${MAX_INPUT_CHARS.toLocaleString()} characters`);
      return;
    }
    setLoading(true);
    try {
      const data = await callAiApi("/api/ai/paraphrase", { text, tone });
      setResult(data.result || "");
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      toast.success("Rewritten");
    } catch (err) {
      toast.error(err.message || "Failed to paraphrase");
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
          title="AI Paraphraser / Rewriter"
          description="Rewrite text in a clearer tone while keeping the meaning. Free daily quota — no signup required."
          badge="Free • Daily limit • No signup required"
        />

        <ToolFormCard title="Original text" icon={Type}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the text you want to paraphrase…"
            rows={10}
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-brand-mid resize-y min-h-[180px]"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {text.length.toLocaleString()} / {MAX_INPUT_CHARS.toLocaleString()} characters
            </span>
            {remaining != null && <span>{remaining} free uses left today</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTone(t.value)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  tone === t.value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-brand-mid/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Button type="button" onClick={run} disabled={loading} className="bg-primary hover:bg-primary-hover">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {loading ? "Rewriting…" : "Paraphrase"}
          </Button>
        </ToolFormCard>

        {result && (
          <ToolFormCard title="Rewritten text" icon={CheckCircle}>
            <textarea
              value={result}
              readOnly
              rows={10}
              className="w-full rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground shadow-sm resize-y min-h-[180px]"
            />
            <Button type="button" variant="outline" onClick={copyResult}>
              {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Copy result
            </Button>
          </ToolFormCard>
        )}

        <p className="text-sm text-muted-foreground">
          Also try{" "}
          <Link href="/ai-summarizer" className="text-primary hover:underline">
            AI Summarizer
          </Link>
          ,{" "}
          <Link href="/grammer-checker" className="text-primary hover:underline">
            Grammar Checker
          </Link>
          , or{" "}
          <Link href="/word-counter" className="text-primary hover:underline">
            Word Counter
          </Link>
          . Review AI output before publishing.
        </p>
      </div>
    </ToolPageShell>
  );
}
