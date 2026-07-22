import { useMemo, useState } from "react";
import { Braces, Copy, CheckCircle, Minimize2, Wand2, Trash2 } from "lucide-react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import ToolFormCard from "../components/ToolFormCard";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function JsonFormatterPage() {
  const [input, setInput] = useState('{\n  "hello": "world"\n}');
  const [indent, setIndent] = useState(2);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) return { ok: true, output: "", error: null };
    try {
      const parsed = JSON.parse(trimmed);
      return {
        ok: true,
        output: JSON.stringify(parsed, null, indent),
        error: null,
        type: Array.isArray(parsed) ? "array" : typeof parsed,
      };
    } catch (e) {
      return { ok: false, output: "", error: e.message || "Invalid JSON", type: null };
    }
  }, [input, indent]);

  const format = () => {
    if (!result.ok) {
      toast.error(result.error || "Invalid JSON");
      return;
    }
    setInput(result.output || "");
    toast.success("Formatted");
  };

  const minify = () => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed));
      toast.success("Minified");
    } catch (e) {
      toast.error(e.message || "Invalid JSON");
    }
  };

  const copy = async () => {
    const text = result.ok ? result.output || input : input;
    if (!text) {
      toast.error("Nothing to copy");
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolPageShell containerClassName="max-w-5xl">
      <div className="space-y-8">
        <ToolPageHeader
          title="JSON Formatter"
          description="Format, validate, and minify JSON in your browser. Nothing is uploaded."
          badge="Developers • Client-side"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              result.ok
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            )}
          >
            {result.ok ? (input.trim() ? `Valid JSON${result.type ? ` (${result.type})` : ""}` : "Empty") : "Invalid JSON"}
          </Badge>
          {!result.ok && <span className="text-sm text-destructive">{result.error}</span>}
        </div>

        <ToolFormCard title="JSON input" icon={Braces}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            rows={16}
            className="w-full rounded-lg border border-border bg-card px-4 py-3 font-mono text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-brand-mid resize-y min-h-[280px]"
            placeholder='{"key": "value"}'
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              Indent
              <select
                value={indent}
                onChange={(e) => setIndent(Number(e.target.value))}
                className="input-theme w-auto"
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
              </select>
            </label>
            <Button type="button" onClick={format} className="bg-primary hover:bg-primary-hover">
              <Wand2 className="w-4 h-4 mr-2" />
              Format
            </Button>
            <Button type="button" variant="outline" onClick={minify}>
              <Minimize2 className="w-4 h-4 mr-2" />
              Minify
            </Button>
            <Button type="button" variant="outline" onClick={copy}>
              {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Copy
            </Button>
            <Button type="button" variant="outline" onClick={() => setInput("")}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </ToolFormCard>
      </div>
    </ToolPageShell>
  );
}
