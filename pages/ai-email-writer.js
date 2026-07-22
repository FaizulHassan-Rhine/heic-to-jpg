import { useState } from "react";
import Link from "next/link";
import { Mail, Copy, CheckCircle, Loader2, Sparkles } from "lucide-react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import ToolFormCard from "../components/ToolFormCard";
import { Button } from "../components/ui/button";
import toast from "react-hot-toast";
import { callAiApi } from "../lib/ai/client";

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
];

export default function AiEmailWriterPage() {
  const [intent, setIntent] = useState("");
  const [bullets, setBullets] = useState("");
  const [tone, setTone] = useState("professional");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(null);

  const run = async () => {
    if (!intent.trim()) {
      toast.error("Describe the email purpose");
      return;
    }
    setLoading(true);
    try {
      const data = await callAiApi("/api/ai/email-writer", { intent, bullets, tone });
      setSubject(data.subject || "");
      setBody(data.body || "");
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      toast.success("Email drafted");
    } catch (err) {
      toast.error(err.message || "Failed to write email");
      if (typeof err.remaining === "number") setRemaining(err.remaining);
    } finally {
      setLoading(false);
    }
  };

  const copyAll = async () => {
    if (!body) return;
    const full = subject ? `Subject: ${subject}\n\n${body}` : body;
    await navigator.clipboard.writeText(full);
    toast.success("Copied");
  };

  return (
    <ToolPageShell containerClassName="max-w-4xl">
      <div className="space-y-8">
        <ToolPageHeader
          title="AI Email Writer"
          description="Draft a clear email from a short purpose and key points. Review before sending — AI can make mistakes."
          badge="Free • Daily limit • No signup required"
        />

        <ToolFormCard title="What should the email do?" icon={Mail}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Purpose</label>
              <textarea
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder="e.g. Follow up after a job interview and ask about next steps"
                rows={3}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-brand-mid resize-y"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Key points (optional)</label>
              <textarea
                value={bullets}
                onChange={(e) => setBullets(e.target.value)}
                placeholder={"One point per line…\nThank them for their time\nMention the project discussed\nAsk about timeline"}
                rows={5}
                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-brand-mid resize-y"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTone(t.value)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    tone === t.value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={run} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {loading ? "Writing…" : "Write email"}
              </Button>
              {remaining != null && (
                <span className="text-xs text-muted-foreground">{remaining} free uses left today</span>
              )}
            </div>
          </div>
        </ToolFormCard>

        {(subject || body) && (
          <ToolFormCard title="Draft" icon={CheckCircle}>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y min-h-[200px]"
                />
              </div>
              <Button type="button" variant="outline" onClick={copyAll}>
                <Copy className="w-4 h-4 mr-2" />
                Copy subject + body
              </Button>
            </div>
          </ToolFormCard>
        )}

        <p className="text-sm text-muted-foreground">
          Related:{" "}
          <Link href="/ai-paraphraser" className="text-primary hover:underline">
            AI Paraphraser
          </Link>
          ,{" "}
          <Link href="/grammer-checker" className="text-primary hover:underline">
            Grammar Checker
          </Link>
          . Always review before sending.
        </p>
      </div>
    </ToolPageShell>
  );
}
