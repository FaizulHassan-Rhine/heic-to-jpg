import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  Link2, Copy, ExternalLink, Trash2, RotateCcw,
  Loader2, CheckCircle, AlertCircle, QrCode, Download
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import Head from "next/head";

export default function UrlShortener() {
  const { user, trackUsage } = useAuth();
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showQr, setShowQr] = useState({});
  const [qrImages, setQrImages] = useState({});

  const isValidUrl = (str) => {
    try {
      const url = new URL(str);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const shortenUrl = async () => {
    let urlToShorten = url.trim();

    // Auto-prepend https:// if missing
    if (urlToShorten && !urlToShorten.startsWith("http://") && !urlToShorten.startsWith("https://")) {
      urlToShorten = "https://" + urlToShorten;
      setUrl(urlToShorten);
    }

    if (!urlToShorten) {
      toast.error("Please enter a URL");
      return;
    }

    if (!isValidUrl(urlToShorten)) {
      toast.error("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    setIsLoading(true);

    try {
      // Using TinyURL's API (free, no key needed)
      const response = await fetch(
        `https://tinyurl.com/api-create.php?url=${encodeURIComponent(urlToShorten)}`
      );

      if (!response.ok) throw new Error("Failed to shorten URL");

      const shortened = await response.text();

      if (!shortened || shortened.includes("Error")) {
        throw new Error("Invalid URL or service error");
      }

      setShortUrl(shortened);

      // Add to history
      const entry = {
        id: Date.now(),
        original: urlToShorten,
        short: shortened,
        createdAt: new Date().toLocaleString(),
      };

      setHistory((prev) => [entry, ...prev].slice(0, 20));
      toast.success("URL shortened!");
      
      // Track usage after successful URL shortening
      if (user && trackUsage) {
        trackUsage("/url-shortener", 1, 1, {
          tool: "URL Shortener",
          filesProcessed: 1,
        });
      }
    } catch (error) {
      console.error("Shorten error:", error);

      // Fallback: try is.gd
      try {
        const response = await fetch(
          `https://is.gd/create.php?format=simple&url=${encodeURIComponent(urlToShorten)}`
        );
        const shortened = await response.text();

        if (shortened.startsWith("http")) {
          setShortUrl(shortened);
          const entry = {
            id: Date.now(),
            original: urlToShorten,
            short: shortened,
            createdAt: new Date().toLocaleString(),
          };
          setHistory((prev) => [entry, ...prev].slice(0, 20));
          toast.success("URL shortened!");
          
          // Track usage after successful URL shortening (fallback)
          if (user && trackUsage) {
            trackUsage("/url-shortener", 1, 1, {
              tool: "URL Shortener",
              filesProcessed: 1,
            });
          }
        } else {
          throw new Error("Fallback also failed");
        }
      } catch {
        toast.error("Failed to shorten URL. Please check the URL and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const toggleQr = async (id, shortUrl) => {
    if (showQr[id]) {
      setShowQr((prev) => ({ ...prev, [id]: false }));
      return;
    }

    // Generate QR for this short URL
    if (!qrImages[id]) {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(shortUrl, {
          width: 200,
          margin: 2,
          color: { dark: "#000000", light: "#FFFFFF" },
        });
        setQrImages((prev) => ({ ...prev, [id]: dataUrl }));
      } catch {
        toast.error("Failed to generate QR code");
        return;
      }
    }

    setShowQr((prev) => ({ ...prev, [id]: true }));
  };

  const downloadQr = (id) => {
    const dataUrl = qrImages[id];
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `shorturl-qr-${id}.png`;
    a.click();
  };

  const removeFromHistory = (id) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    setShowQr((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setQrImages((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    setShowQr({});
    setQrImages({});
    toast.success("History cleared");
  };

  const resetAll = () => {
    setUrl("");
    setShortUrl(null);
  };

  return (
    <>
      <Head>
        <title>URL Shortener - ConvertMastery</title>
        <meta name="description" content="Shorten your URLs for free. Generate QR codes for short links. No registration required." />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">URL Shortener</h1>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">Shorten long URLs and generate QR codes instantly.</p>
          </div>

          <div className="grid gap-8">
            {/* Input Area (styled like dropzone) */}
            <Card className="border-2 border-dashed border-gray-300 hover:border-rose-500 bg-white shadow-sm transition-all">
              <CardContent className="p-6">
                <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 block">Enter URL</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && shortenUrl()}
                      placeholder="Enter your long URL here..."
                      className="w-full pl-10 pr-4 py-3 border rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500 text-base"
                    />
                  </div>
                  <Button
                    onClick={shortenUrl}
                    disabled={isLoading || !url.trim()}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 text-base h-12 shadow-md hover:shadow-lg font-semibold"
                  >
                    {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Shortening...</> : "Shorten URL"}
                  </Button>
                </div>

                {/* Result */}
                {shortUrl && (
                  <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-rose-600" />
                      <span className="text-sm font-medium text-rose-700">Shortened URL</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <a href={shortUrl} target="_blank" rel="noopener noreferrer"
                        className="text-rose-700 font-semibold text-lg hover:underline break-all flex-1">{shortUrl}</a>
                      <Button onClick={() => copyToClipboard(shortUrl)} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white flex-shrink-0">
                        <Copy className="h-4 w-4 mr-1" /> Copy
                      </Button>
                      <Button onClick={() => window.open(shortUrl, "_blank")} size="sm" variant="outline" className="flex-shrink-0">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 break-all">Original: {url}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* History as file list */}
            {history.length > 0 && (
              <div className="space-y-5">
                <div className="flex justify-between items-end border-b pb-4">
                  <div>
                    <h3 className="font-bold text-2xl text-gray-800">Recent Links</h3>
                    <p className="text-gray-500 text-sm mt-1">{history.length} shortened URLs</p>
                  </div>
                  <Button onClick={clearHistory} variant="ghost" size="sm" className="text-gray-400">
                    <Trash2 className="h-4 w-4 mr-1" /> Clear All
                  </Button>
                </div>

                {history.map((item) => (
                  <Card key={item.id} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all">
                    <div className="p-4 flex gap-5 items-center">
                      <div className="w-16 h-16 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-rose-100">
                        <Link2 className="w-7 h-7 text-rose-400" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <a href={item.short} target="_blank" rel="noopener noreferrer"
                            className="text-rose-700 font-semibold hover:underline truncate">{item.short}</a>
                          <button onClick={() => copyToClipboard(item.short)} className="text-gray-400 hover:text-gray-600 flex-shrink-0" title="Copy">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{item.original}</p>
                        <p className="text-xs text-gray-400">{item.createdAt}</p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => toggleQr(item.id, item.short)} className="h-8 w-8">
                          <QrCode className={cn("h-4 w-4", showQr[item.id] ? "text-rose-600" : "text-gray-400")} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => window.open(item.short, "_blank")} className="h-8 w-8">
                          <ExternalLink className="h-4 w-4 text-gray-400" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removeFromHistory(item.id)} className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </div>

                    {showQr[item.id] && qrImages[item.id] && (
                      <div className="px-4 pb-4 flex items-center gap-4 border-t pt-3 mt-0">
                        <div className="bg-white border rounded-lg p-2 inline-block">
                          <img src={qrImages[item.id]} alt="QR Code" className="w-28 h-28" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Scan to open the shortened URL</p>
                          <Button onClick={() => downloadQr(item.id)} size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" /> Download QR
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}

