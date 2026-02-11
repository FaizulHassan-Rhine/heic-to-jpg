import { useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Dropzone from "../components/Dropzone";
import {
  Loader2, CheckCircle, Copy, AlertCircle, FileText, Trash2,
  Upload, Download, RotateCcw, ScanText, ArrowRight
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { cn } from "@/lib/utils";
import toast, { Toaster } from "react-hot-toast";
import Head from "next/head";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const formatSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default function ExtractText() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({}); // { [filename]: { status, text, error } }
  const [processing, setProcessing] = useState(false);
  const [previewUrls, setPreviewUrls] = useState({});
  const [useProOCR, setUseProOCR] = useState(false); // Toggle for engine

  // ── File Handling ──

  const handleFilesAdded = (newFiles) => {
    if (newFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} images allowed.`);
      return;
    }

    const valid = [];
    newFiles.forEach(f => {
      if (f.size > MAX_FILE_SIZE) toast.error(`"${f.name}" is too large (>10MB)`);
      else valid.push(f);
    });

    if (valid.length === 0) return;

    const newPreviews = {};
    valid.forEach(f => {
      if (!/\.(heic|HEIC)$/i.test(f.name) && f.type.startsWith("image/")) {
        newPreviews[f.name] = URL.createObjectURL(f);
      }
    });

    setFiles(prev => [...prev, ...valid]);
    setPreviewUrls(prev => ({ ...prev, ...newPreviews }));
  };

  const removeFile = (name) => {
    setFiles(prev => prev.filter(f => f.name !== name));
    setResults(prev => {
      const n = { ...prev };
      delete n[name];
      return n;
    });
    if (previewUrls[name]) {
      URL.revokeObjectURL(previewUrls[name]);
      setPreviewUrls(prev => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }
  };

  // ── OCR Logic ──

  const extractTextFromImage = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      // OCR.space parameters
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('scale', 'true');
      if (useProOCR) formData.append('OCREngine', '2'); // 2 is better for numbers/special chars

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
        headers: {
          'apikey': 'helloworld', // Free tier
        },
      });

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const data = await response.json();

      if (data.OCRExitCode !== 1) {
        // Handle error code 3/4 (file size/type) specifically if needed
        throw new Error(data.ErrorMessage?.[0] || 'OCR Failed');
      }

      let text = '';
      if (data.ParsedResults?.length > 0) {
        text = data.ParsedResults.map(r => r.ParsedText).join('\n\n').trim();
      }

      if (!text) return { status: "error", error: "No text detected" };

      return { status: "done", text };

    } catch (e) {
      console.error(e);
      return { status: "error", error: e.message };
    }
  };

  const processAll = async () => {
    setProcessing(true);
    const newResults = { ...results };

    for (const f of files) {
      if (!newResults[f.name] || newResults[f.name].status === "error") {
        newResults[f.name] = { status: "processing" };
      }
    }
    setResults({ ...newResults });

    for (const file of files) {
      if (results[file.name]?.status === "done") continue;
      const res = await extractTextFromImage(file);
      setResults(prev => ({ ...prev, [file.name]: res }));
    }

    setProcessing(false);
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const downloadText = (filename, text) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.split('.')[0] + ".txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Head>
        <title>Extract Text (OCR) - ConvertMastery</title>
      </Head>
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
            Extract Text (OCR)
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Convert images to editable text instantly.
          </p>
        </div>


        <div className="grid gap-8">
          <Card className="border-2 border-dashed border-gray-300 hover:border-teal-500 bg-white shadow-sm transition-all">
            <CardContent className="p-0">
              <Dropzone setFiles={handleFilesAdded} className="p-10" title="Upload Images for OCR" description="Extract text from scanned docs & screenshots" />
            </CardContent>
          </Card>

          {files.length > 0 && (
            <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-start">

              {/* Settings */}
              <Card className="lg:sticky lg:top-24 h-fit border-0 shadow-lg ring-1 ring-gray-100">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
                    <ScanText className="w-6 h-6 text-teal-600" /> OCR Options
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={useProOCR}
                        onChange={(e) => setUseProOCR(e.target.checked)}
                        className="w-5 h-5 accent-teal-600"
                      />
                      <div>
                        <span className="font-semibold text-gray-800 block text-sm">Enhanced Engine</span>
                        <span className="text-xs text-gray-500">Better for numbers & tables (Slower)</span>
                      </div>
                    </label>
                  </div>

                  <Button
                    onClick={processAll}
                    disabled={processing}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12 shadow-md hover:shadow-lg transition-all font-semibold text-base"
                  >
                    {processing ? (
                      <> <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Extracting... </>
                    ) : (
                      <> <ScanText className="w-5 h-5 mr-2" /> Extract All Text </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Files */}
              <div className="space-y-5">
                <div className="flex justify-between items-end border-b pb-4">
                  <div>
                    <h3 className="font-bold text-2xl text-gray-800">Files</h3>
                    <p className="text-gray-500 text-sm mt-1">Images to extract text from</p>
                  </div>
                </div>

                {files.map((file, idx) => {
                  const res = results[file.name];
                  const preview = previewUrls[file.name];

                  return (
                    <Card key={file.name + idx} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                      <div className="p-4 flex flex-col sm:flex-row gap-5 items-start">

                        {/* Thumbnail often helps for OCR reference */}
                        <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden relative border border-gray-200 hidden sm:block">
                          {preview ? (
                            <img src={preview} className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="w-8 h-8 text-gray-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 w-full space-y-3">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold truncate pr-4 text-gray-900 text-lg">{file.name}</h4>

                            <div className="flex gap-2">
                              {res?.status === "done" && (
                                <>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-teal-600 bg-teal-50 hover:bg-teal-100" onClick={() => copyText(res.text)} title="Copy Text">
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-teal-600 bg-teal-50 hover:bg-teal-100" onClick={() => downloadText(file.name, res.text)} title="Download Text">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeFile(file.name)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Status / Result */}
                          {res?.status === "done" ? (
                            <div className="mt-2 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100 font-mono text-gray-700 max-h-40 overflow-y-auto whitespace-pre-wrap">
                              {res.text.slice(0, 300) + (res.text.length > 300 ? "..." : "")}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                {formatSize(file.size)}
                              </Badge>
                              {res?.status === "error" && (
                                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
                                  Error: {res.error}
                                </Badge>
                              )}
                              {res?.status === "processing" && (
                                <span className="text-teal-600 animate-pulse font-medium">Extracting text...</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {res?.status === "processing" && (
                        <div className="h-1 bg-teal-100 w-full">
                          <div className="h-full bg-teal-600 animate-pulse w-full"></div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
