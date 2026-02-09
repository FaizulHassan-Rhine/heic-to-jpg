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
import toast, { Toaster } from "react-hot-toast";
import { cn } from "@/lib/utils";
import Head from "next/head";

export default function UrlShortener() {
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
        <Toaster position="top-center" />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">URL Shortener</h1>
            <p className="text-gray-500">Shorten long URLs and generate QR codes instantly</p>
          </div>

          {/* Main Input */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && shortenUrl()}
                    placeholder="Enter your long URL here..."
                    className="w-full pl-10 pr-4 py-3 border rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  />
                </div>
                <Button
                  onClick={shortenUrl}
                  disabled={isLoading || !url.trim()}
                  className="bg-green-700 hover:bg-green-800 text-white px-8 py-3 text-base"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Shortening...
                    </>
                  ) : (
                    "Shorten URL"
                  )}
                </Button>
              </div>

              {/* Result */}
              {shortUrl && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Shortened URL</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-700 font-semibold text-lg hover:underline break-all flex-1"
                    >
                      {shortUrl}
                    </a>
                    <Button
                      onClick={() => copyToClipboard(shortUrl)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button
                      onClick={() => window.open(shortUrl, "_blank")}
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 break-all">Original: {url}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* History */}
          {history.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  Recent Links
                  <Badge variant="outline" className="ml-2">{history.length}</Badge>
                </h2>
                <Button onClick={clearHistory} variant="ghost" size="sm" className="text-gray-400">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>

              <div className="space-y-3">
                {history.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Short URL */}
                          <div className="flex items-center gap-2 mb-1">
                            <a
                              href={item.short}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-700 font-semibold hover:underline truncate"
                            >
                              {item.short}
                            </a>
                            <button
                              onClick={() => copyToClipboard(item.short)}
                              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                              title="Copy short URL"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Original URL */}
                          <p className="text-sm text-gray-500 truncate">{item.original}</p>

                          {/* Time */}
                          <p className="text-xs text-gray-400 mt-1">{item.createdAt}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleQr(item.id, item.short)}
                            title="QR Code"
                            className="h-8 w-8"
                          >
                            <QrCode className={cn(
                              "h-4 w-4",
                              showQr[item.id] ? "text-green-600" : "text-gray-400"
                            )} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(item.short, "_blank")}
                            title="Open link"
                            className="h-8 w-8"
                          >
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromHistory(item.id)}
                            title="Remove"
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      </div>

                      {/* QR Code */}
                      {showQr[item.id] && qrImages[item.id] && (
                        <>
                          <Separator className="my-3" />
                          <div className="flex items-center gap-4">
                            <div className="bg-white border rounded-lg p-2 inline-block">
                              <img
                                src={qrImages[item.id]}
                                alt="QR Code"
                                className="w-32 h-32"
                              />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 mb-2">
                                Scan this QR code to open the shortened URL
                              </p>
                              <Button
                                onClick={() => downloadQr(item.id)}
                                size="sm"
                                variant="outline"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download QR
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <Card>
              <CardContent className="p-6 text-center">
                <Link2 className="h-8 w-8 mx-auto text-green-600 mb-3" />
                <h3 className="font-semibold mb-2">Instant Shortening</h3>
                <p className="text-sm text-gray-500">
                  Shorten any URL in seconds. No registration or account needed.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <QrCode className="h-8 w-8 mx-auto text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2">QR Code Generation</h3>
                <p className="text-sm text-gray-500">
                  Get a QR code for every shortened link — perfect for print or sharing.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-8 w-8 mx-auto text-purple-600 mb-3" />
                <h3 className="font-semibold mb-2">Link History</h3>
                <p className="text-sm text-gray-500">
                  Keep track of your recently shortened URLs right in your browser.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}

