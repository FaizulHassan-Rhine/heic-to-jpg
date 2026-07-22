import { useMemo, useState } from "react";
import { Pipette, Copy, CheckCircle } from "lucide-react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import ToolFormCard from "../components/ToolFormCard";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import toast from "react-hot-toast";

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex, { allowShort = false } = {}) {
  const clean = hex.replace("#", "").trim();
  let full = clean;
  if (clean.length === 3 && allowShort) {
    full = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const to = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      default:
        h = ((r - g) / d + 4) * 60;
    }
  }
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = h / 360;
  return {
    r: Math.round(hue2rgb(p, q, hk + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hk) * 255),
    b: Math.round(hue2rgb(p, q, hk - 1 / 3) * 255),
  };
}

function fieldsFromRgb(r, g, b) {
  const hsl = rgbToHsl(r, g, b);
  return {
    hex: rgbToHex(r, g, b),
    r: String(r),
    g: String(g),
    b: String(b),
    h: String(hsl.h),
    s: String(hsl.s),
    l: String(hsl.l),
  };
}

export default function ColorPickerPage() {
  const initial = fieldsFromRgb(28, 77, 141);
  const [hex, setHex] = useState(initial.hex);
  const [r, setR] = useState(initial.r);
  const [g, setG] = useState(initial.g);
  const [b, setB] = useState(initial.b);
  const [h, setH] = useState(initial.h);
  const [s, setS] = useState(initial.s);
  const [l, setL] = useState(initial.l);
  const [copied, setCopied] = useState("");

  const applyRgb = (nr, ng, nb, keep) => {
    const next = fieldsFromRgb(nr, ng, nb);
    setHex(keep?.hex ?? next.hex);
    setR(keep?.r ?? next.r);
    setG(keep?.g ?? next.g);
    setB(keep?.b ?? next.b);
    setH(keep?.h ?? next.h);
    setS(keep?.s ?? next.s);
    setL(keep?.l ?? next.l);
  };

  const previewHex = useMemo(() => {
    const rgb = hexToRgb(hex, { allowShort: true });
    if (rgb) return rgbToHex(rgb.r, rgb.g, rgb.b);
    const nr = clamp(Number(r) || 0, 0, 255);
    const ng = clamp(Number(g) || 0, 0, 255);
    const nb = clamp(Number(b) || 0, 0, 255);
    return rgbToHex(nr, ng, nb);
  }, [hex, r, g, b]);

  const cssVars = useMemo(() => {
    const nr = clamp(Number(r) || 0, 0, 255);
    const ng = clamp(Number(g) || 0, 0, 255);
    const nb = clamp(Number(b) || 0, 0, 255);
    const nh = clamp(Number(h) || 0, 0, 360);
    const ns = clamp(Number(s) || 0, 0, 100);
    const nl = clamp(Number(l) || 0, 0, 100);
    return {
      hex: previewHex,
      rgb: `rgb(${nr}, ${ng}, ${nb})`,
      hsl: `hsl(${nh}, ${ns}%, ${nl}%)`,
    };
  }, [r, g, b, h, s, l, previewHex]);

  const copyValue = async (label, value) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    toast.success(`${label} copied`);
    setTimeout(() => setCopied(""), 1600);
  };

  const onHexChange = (value) => {
    // Allow empty / partial typing — do NOT expand 3-digit shorthand here
    // (that was snapping #111 back to #111111 while deleting).
    const cleaned = value.replace(/[^#0-9a-fA-F]/g, "").slice(0, 7);
    setHex(cleaned);
    const rgb = hexToRgb(cleaned, { allowShort: false });
    if (!rgb) return;
    applyRgb(rgb.r, rgb.g, rgb.b);
  };

  const onHexBlur = () => {
    if (hex === "" || hex === "#") {
      setHex(previewHex);
      return;
    }
    const rgb = hexToRgb(hex, { allowShort: true });
    if (rgb) {
      applyRgb(rgb.r, rgb.g, rgb.b);
      return;
    }
    setHex(previewHex);
  };

  const handleRgbInput = (channel, raw) => {
    if (raw === "") {
      if (channel === "r") setR("");
      if (channel === "g") setG("");
      if (channel === "b") setB("");
      return;
    }
    if (!/^\d{0,3}$/.test(raw)) return;
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    const clamped = clamp(n, 0, 255);
    const shown = n > 255 ? "255" : raw;
    const nr = channel === "r" ? clamped : clamp(Number(r) || 0, 0, 255);
    const ng = channel === "g" ? clamped : clamp(Number(g) || 0, 0, 255);
    const nb = channel === "b" ? clamped : clamp(Number(b) || 0, 0, 255);
    applyRgb(nr, ng, nb, {
      r: channel === "r" ? shown : undefined,
      g: channel === "g" ? shown : undefined,
      b: channel === "b" ? shown : undefined,
    });
  };

  const blurRgb = (channel) => {
    const cur = channel === "r" ? r : channel === "g" ? g : b;
    if (cur !== "") return;
    const nr = channel === "r" ? 0 : clamp(Number(r) || 0, 0, 255);
    const ng = channel === "g" ? 0 : clamp(Number(g) || 0, 0, 255);
    const nb = channel === "b" ? 0 : clamp(Number(b) || 0, 0, 255);
    applyRgb(nr, ng, nb);
  };

  const handleHslInput = (channel, raw, max) => {
    if (raw === "") {
      if (channel === "h") setH("");
      if (channel === "s") setS("");
      if (channel === "l") setL("");
      return;
    }
    if (!/^\d{0,3}$/.test(raw)) return;
    const n = Number(raw);
    if (Number.isNaN(n)) return;
    const clamped = clamp(n, 0, max);
    const shown = n > max ? String(max) : raw;
    const nh = channel === "h" ? clamped : clamp(Number(h) || 0, 0, 360);
    const ns = channel === "s" ? clamped : clamp(Number(s) || 0, 0, 100);
    const nl = channel === "l" ? clamped : clamp(Number(l) || 0, 0, 100);
    const rgb = hslToRgb(nh, ns, nl);
    applyRgb(rgb.r, rgb.g, rgb.b, {
      h: channel === "h" ? shown : undefined,
      s: channel === "s" ? shown : undefined,
      l: channel === "l" ? shown : undefined,
    });
  };

  const blurHsl = (channel) => {
    const cur = channel === "h" ? h : channel === "s" ? s : l;
    if (cur !== "") return;
    const nh = channel === "h" ? 0 : clamp(Number(h) || 0, 0, 360);
    const ns = channel === "s" ? 0 : clamp(Number(s) || 0, 0, 100);
    const nl = channel === "l" ? 0 : clamp(Number(l) || 0, 0, 100);
    const rgb = hslToRgb(nh, ns, nl);
    applyRgb(rgb.r, rgb.g, rgb.b);
  };

  return (
    <ToolPageShell containerClassName="max-w-4xl">
      <div className="space-y-8">
        <ToolPageHeader
          title="Color Picker"
          description="Pick a color and convert between HEX, RGB, and HSL. Copy CSS-ready values instantly."
          badge="Designers • Students • Free"
        />

        <div className="grid md:grid-cols-[240px_1fr] gap-6">
          <Card className="border border-border shadow-sm overflow-hidden">
            <div className="h-40 md:h-full min-h-[160px]" style={{ backgroundColor: previewHex }} />
            <CardContent className="p-4 space-y-3">
              <label className="block text-sm font-medium text-muted-foreground">Pick</label>
              <input
                type="color"
                value={previewHex}
                onChange={(e) => {
                  const rgb = hexToRgb(e.target.value);
                  if (rgb) applyRgb(rgb.r, rgb.g, rgb.b);
                }}
                className="h-12 w-full cursor-pointer rounded-lg border border-border bg-card"
                aria-label="Color picker"
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <ToolFormCard title="HEX" icon={Pipette}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={hex}
                  onChange={(e) => onHexChange(e.target.value)}
                  onBlur={onHexBlur}
                  className="input-theme font-mono uppercase text-foreground bg-card"
                  aria-label="HEX color"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="#1C4D8D"
                />
                <Button type="button" variant="outline" onClick={() => copyValue("HEX", previewHex)}>
                  {copied === "HEX" ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </ToolFormCard>

            <ToolFormCard title="RGB">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["R", r, "r"],
                  ["G", g, "g"],
                  ["B", b, "b"],
                ].map(([label, val, channel]) => (
                  <div key={label}>
                    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={val}
                      onChange={(e) => handleRgbInput(channel, e.target.value)}
                      onBlur={() => blurRgb(channel)}
                      className="input-theme"
                      aria-label={`RGB ${label}`}
                    />
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => copyValue("RGB", cssVars.rgb)}>
                <Copy className="w-4 h-4 mr-2" />
                Copy {cssVars.rgb}
              </Button>
            </ToolFormCard>

            <ToolFormCard title="HSL">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["H", h, "h", 360, "°"],
                  ["S", s, "s", 100, "%"],
                  ["L", l, "l", 100, "%"],
                ].map(([label, val, channel, max, suffix]) => (
                  <div key={label}>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {label}
                      {suffix}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={val}
                      onChange={(e) => handleHslInput(channel, e.target.value, max)}
                      onBlur={() => blurHsl(channel)}
                      className="input-theme"
                      aria-label={`HSL ${label}`}
                    />
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => copyValue("HSL", cssVars.hsl)}>
                <Copy className="w-4 h-4 mr-2" />
                Copy {cssVars.hsl}
              </Button>
            </ToolFormCard>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
