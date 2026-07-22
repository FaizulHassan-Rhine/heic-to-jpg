import { useMemo, useState } from "react";
import { Type, Copy, Trash2, CheckCircle } from "lucide-react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import ToolFormCard from "../components/ToolFormCard";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

function countStats(text) {
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const sentences = text.trim()
    ? text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length
    : 0;
  const paragraphs = text.trim()
    ? text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length
    : 0;
  const lines = text ? text.split(/\n/).length : 0;
  const readingMinutes = words === 0 ? 0 : Math.max(1, Math.ceil(words / 200));
  return {
    characters,
    charactersNoSpaces,
    words,
    sentences,
    paragraphs,
    lines,
    readingMinutes,
  };
}

export default function WordCounterPage() {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const stats = useMemo(() => countStats(text), [text]);

  const copyText = async () => {
    if (!text) {
      toast.error("Nothing to copy");
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Text copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const clear = () => {
    setText("");
    toast.success("Cleared");
  };

  const tiles = [
    { label: "Words", value: stats.words },
    { label: "Characters", value: stats.characters },
    { label: "Characters (no spaces)", value: stats.charactersNoSpaces },
    { label: "Sentences", value: stats.sentences },
    { label: "Paragraphs", value: stats.paragraphs },
    { label: "Lines", value: stats.lines },
    { label: "Reading time", value: `${stats.readingMinutes} min` },
  ];

  return (
    <ToolPageShell containerClassName="max-w-4xl">
      <div className="space-y-8">
        <ToolPageHeader
          title="Word Counter"
          description="Count words, characters, sentences, and reading time instantly. Everything runs in your browser."
          badge="Free • Private • Client-side"
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tiles.map((t) => (
            <Card key={t.label} className="border border-border shadow-sm">
              <CardContent className="p-4">
                <div className="text-xs font-medium text-muted-foreground mb-1">{t.label}</div>
                <div className="text-2xl font-bold text-foreground tabular-nums">{t.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <ToolFormCard title="Your text" icon={Type}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type your text here…"
            rows={12}
            className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-brand-mid resize-y min-h-[220px]"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={copyText} className="bg-primary hover:bg-primary-hover">
              {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Copy text
            </Button>
            <Button type="button" variant="outline" onClick={clear} className={cn(!text && "opacity-60")}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </ToolFormCard>
      </div>
    </ToolPageShell>
  );
}
