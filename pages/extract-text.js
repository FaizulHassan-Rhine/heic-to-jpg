import { useState, useCallback } from "react";
import { useAuth } from "../lib/authContext";
import { generateThumbnail } from "../lib/thumbnailUtils";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import Dropzone from "../components/Dropzone";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
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
import toast from "react-hot-toast";

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
  const { user, trackUsage } = useAuth();
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({}); // { [filename]: { status, text, error } }
  const [processing, setProcessing] = useState(false);
  const [previewUrls, setPreviewUrls] = useState({});
  const [useProOCR, setUseProOCR] = useState(false); // Toggle for engine
  const [ocrLanguage, setOcrLanguage] = useState("eng"); // OCR language
  const [exportFormat, setExportFormat] = useState("txt"); // Export format: txt, docx, json

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

  // Compress image if it's too large for OCR API (1MB limit for free tier)
  const compressImageForOCR = async (file) => {
    if (file.size <= 1024 * 1024) return file; // Already under 1MB

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Start with more aggressive compression to ensure under 1MB
        let quality = 0.7;
        let maxDimension = 1800;
        
        // Calculate new dimensions
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Fill white background (important for OCR)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try to compress, reducing quality if needed
        const tryCompress = (q) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Compression failed'));
              return;
            }
            
            // If still too large, reduce quality further
            if (blob.size > 1024 * 1024 && q > 0.3) {
              tryCompress(q - 0.1);
            } else if (blob.size > 1024 * 1024) {
              // Last resort: reduce dimensions
              maxDimension = Math.floor(maxDimension * 0.8);
              const newRatio = Math.min(maxDimension / img.width, maxDimension / img.height);
              width = Math.floor(img.width * newRatio);
              height = Math.floor(img.height * newRatio);
              canvas.width = width;
              canvas.height = height;
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              canvas.toBlob((finalBlob) => {
                const compressedFile = new File([finalBlob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
                resolve(compressedFile);
              }, 'image/jpeg', 0.5);
            } else {
              const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
              resolve(compressedFile);
            }
          }, 'image/jpeg', q);
        };
        
        tryCompress(quality);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for compression'));
      };
      img.src = url;
    });
  };

  const extractTextFromImage = async (file) => {
    try {
      // Compress if needed (OCR.space free tier has 1MB limit)
      let fileToProcess = file;
      if (file.size > 1024 * 1024) {
        try {
          fileToProcess = await compressImageForOCR(file);
          // Double-check the compressed file size
          if (fileToProcess.size > 1024 * 1024) {
            // If compression still results in > 1MB, show a more helpful error
            return { 
              status: "error", 
              error: `File too large. After compression, file is still ${(fileToProcess.size / 1024 / 1024).toFixed(2)}MB. Please use a smaller image or reduce its resolution.` 
            };
          }
          console.log(`Compressed ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(fileToProcess.size / 1024 / 1024).toFixed(2)}MB`);
        } catch (compressionError) {
          console.error('Compression error:', compressionError);
          return { 
            status: "error", 
            error: `Failed to compress image: ${compressionError.message}. Please use an image under 1MB.` 
          };
        }
      }
      
      // Final check before sending
      if (fileToProcess.size > 1024 * 1024) {
        return {
          status: "error",
          error: `File size (${(fileToProcess.size / 1024 / 1024).toFixed(2)}MB) exceeds OCR API limit of 1MB. Please use a smaller image.`
        };
      }
      
      const formData = new FormData();
      formData.append('file', fileToProcess);
      // OCR.space parameters
      formData.append('language', ocrLanguage);
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
        // Handle error code 3/4 (file size/type) specifically
        const errorMsg = data.ErrorMessage?.[0] || 'OCR Failed';
        // If it's a file size error, provide a more helpful message
        if (errorMsg.toLowerCase().includes('file size') || errorMsg.toLowerCase().includes('1024')) {
          throw new Error(`File too large for OCR API. The image was compressed but still exceeds the 1MB limit. Please try a smaller image or reduce its resolution.`);
        }
        throw new Error(errorMsg);
      }

      let text = '';
      let confidence = 0;
      if (data.ParsedResults?.length > 0) {
        text = data.ParsedResults.map(r => r.ParsedText).join('\n\n').trim();
        // Calculate average confidence if available
        const confidences = data.ParsedResults
          .map(r => r.TextOverlay?.HasOverlay ? parseFloat(r.TextOverlay.Message?.replace(/[^0-9.]/g, '') || '0') : 0)
          .filter(c => c > 0);
        if (confidences.length > 0) {
          confidence = Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);
        }
      }

      if (!text) return { status: "error", error: "No text detected" };

      return { status: "done", text, confidence };

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
        newResults[f.name] = { status: "processing", progress: 0 };
      }
    }
    setResults({ ...newResults });

    const processedFiles = [];
    for (const file of files) {
      if (results[file.name]?.status === "done") continue;
      
      // Simulate progress for OCR
      const progressInterval = setInterval(() => {
        setResults(prev => {
          const current = prev[file.name]?.progress || 0;
          if (current < 90) {
            return {
              ...prev,
              [file.name]: { ...prev[file.name], progress: Math.min(current + Math.random() * 20, 90) }
            };
          }
          return prev;
        });
      }, 200);
      
      const res = await extractTextFromImage(file);
      
      clearInterval(progressInterval);
      setResults(prev => ({ 
        ...prev, 
        [file.name]: { ...res, progress: 100 } 
      }));
      
      // Collect file information
      if (res.status === "done") {
        const inputExt = file.name.split('.').pop()?.toLowerCase() || '';
        const inputThumbnail = await generateThumbnail(file).catch(() => null);
        processedFiles.push({
          inputName: file.name,
          inputSize: file.size,
          inputFormat: inputExt,
          outputName: file.name.replace(/\.[^.]+$/, `.${exportFormat}`),
          outputSize: res.text ? new Blob([res.text]).size : 0,
          outputFormat: exportFormat,
          inputThumbnail: inputThumbnail || null,
          outputThumbnail: null,
        });
      }
      
      // Reset to done status after showing 100%
      setTimeout(() => {
        setResults(prev => ({ 
          ...prev, 
          [file.name]: res 
        }));
      }, 300);
    }

    // Track usage after all extractions complete
    const successCount = processedFiles.length;
    if (successCount > 0 && user && trackUsage) {
      trackUsage("/extract-text", successCount, successCount, {
        tool: "Extract Text (OCR)",
        filesProcessed: successCount,
      }, processedFiles);
    }

    setProcessing(false);
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const downloadText = async (filename, text, confidence) => {
    const baseName = filename.split('.')[0];
    
    if (exportFormat === "json") {
      const jsonData = {
        text,
        confidence: confidence || null,
        filename,
        extractedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = baseName + ".json";
      a.click();
      URL.revokeObjectURL(url);
    } else if (exportFormat === "docx") {
      // Create simple DOCX
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const paragraphs = text.split('\n\n').filter(p => p.trim());
      const bodyXml = paragraphs.map(p => 
        `<w:p><w:r><w:t xml:space="preserve">${escapeXml(p.trim())}</w:t></w:r></w:p>`
      ).join('');
      
      zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
      zip.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
      zip.folder("word").folder("_rels").file("document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
      zip.folder("word").file("document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}</w:body></w:document>`);
      
      const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = baseName + ".docx";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = baseName + ".txt";
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  const escapeXml = (str) => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  return (
    <ToolPageShell containerClassName="max-w-6xl">
        <ToolPageHeader
          title="Extract Text (OCR)"
          description="Convert images to editable text instantly."
        />


        <div className="grid gap-8">
          <CollapsibleDropzone
            files={files}
            setFiles={handleFilesAdded}
            title="Upload Images for OCR"
            description="Extract text from scanned docs & screenshots • Max 10MB each"
            accept={{
              "image/jpeg": [".jpg", ".jpeg", ".JPG", ".JPEG"],
              "image/png": [".png", ".PNG"],
              "image/webp": [".webp", ".WEBP"],
              "image/gif": [".gif", ".GIF"],
              "image/bmp": [".bmp", ".BMP"],
              "image/tiff": [".tiff", ".tif", ".TIFF", ".TIF"]
            }}
          />

          {files.length > 0 && (
            <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-start">

              {/* Settings */}
              <Card className="lg:sticky lg:top-24 h-fit border-0 shadow-lg ring-1 ring-gray-100">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-2 font-bold text-xl text-foreground">
                    <ScanText className="w-6 h-6 text-primary" /> OCR Options
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/40 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={useProOCR}
                        onChange={(e) => setUseProOCR(e.target.checked)}
                        className="w-5 h-5 accent-primary"
                      />
                      <div>
                        <span className="font-semibold text-foreground block text-sm">Enhanced Engine</span>
                        <span className="text-xs text-muted-foreground">Better for numbers & tables (Slower)</span>
                      </div>
                    </label>
                  </div>

                  {/* Language Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">OCR Language</label>
                    <select
                      value={ocrLanguage}
                      onChange={(e) => setOcrLanguage(e.target.value)}
                      disabled={processing}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="eng">English</option>
                      <option value="spa">Spanish</option>
                      <option value="fra">French</option>
                      <option value="deu">German</option>
                      <option value="ita">Italian</option>
                      <option value="por">Portuguese</option>
                      <option value="chi_sim">Chinese (Simplified)</option>
                      <option value="chi_tra">Chinese (Traditional)</option>
                      <option value="jpn">Japanese</option>
                      <option value="kor">Korean</option>
                      <option value="ara">Arabic</option>
                      <option value="rus">Russian</option>
                    </select>
                  </div>

                  {/* Export Format */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Export Format</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "txt", label: "TXT" },
                        { id: "docx", label: "DOCX" },
                        { id: "json", label: "JSON" },
                      ].map((fmt) => (
                        <button
                          key={fmt.id}
                          onClick={() => setExportFormat(fmt.id)}
                          disabled={processing}
                          className={cn(
                            "p-2 rounded-lg border text-xs font-medium transition-all",
                            exportFormat === fmt.id
                              ? "bg-brand-sky/60 border-primary/40 text-primary ring-1 ring-primary/40"
                              : "bg-card border-border text-muted-foreground hover:bg-muted/40"
                          )}
                        >
                          {fmt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={processAll}
                    disabled={processing}
                    className="w-full bg-primary hover:bg-primary-hover text-white h-12 shadow-md hover:shadow-lg transition-all font-semibold text-base"
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
                    <h3 className="font-bold text-2xl text-foreground">Files</h3>
                    <p className="text-muted-foreground text-sm mt-1">Images to extract text from</p>
                  </div>
                </div>

                {files.map((file, idx) => {
                  const res = results[file.name];
                  const preview = previewUrls[file.name];

                  return (
                    <Card key={file.name + idx} className="overflow-hidden border border-border shadow-sm hover:shadow-md transition-all group">
                      <div className="p-4 flex flex-col sm:flex-row gap-5 items-start">

                        {/* Thumbnail often helps for OCR reference */}
                        <div className="w-20 h-20 bg-muted rounded-xl flex-shrink-0 overflow-hidden relative border border-border hidden sm:block">
                          {preview ? (
                            <img src={preview} className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="w-8 h-8 text-muted-foreground/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 w-full space-y-3">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold truncate pr-4 text-foreground text-lg">{file.name}</h4>

                            <div className="flex gap-2">
                              {res?.status === "done" && (
                                <>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-primary bg-brand-sky/60 hover:bg-brand-sky" onClick={() => copyText(res.text)} title="Copy Text">
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-primary bg-brand-sky/60 hover:bg-brand-sky" onClick={() => downloadText(file.name, res.text, res.confidence)} title="Download Text">
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50" onClick={() => removeFile(file.name)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Status / Result */}
                          {res?.status === "done" ? (
                            <div className="mt-2 space-y-2">
                              {res.confidence && (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-muted-foreground">Confidence:</span>
                                  <Badge variant="outline" className={cn(
                                    "text-xs",
                                    res.confidence >= 80 ? "border-primary text-brand-navy" :
                                    res.confidence >= 60 ? "border-yellow-500 text-yellow-700" :
                                    "border-red-500 text-red-700"
                                  )}>
                                    {res.confidence}%
                                  </Badge>
                                </div>
                              )}
                              <div className="text-sm bg-muted/40 p-3 rounded-lg border border-border font-mono text-foreground max-h-40 overflow-y-auto whitespace-pre-wrap">
                                {res.text.slice(0, 300) + (res.text.length > 300 ? "..." : "")}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                {formatSize(file.size)}
                              </Badge>
                              {res?.status === "error" && (
                                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
                                  Error: {res.error}
                                </Badge>
                              )}
                              {res?.status === "processing" && (
                                <span className="text-primary animate-pulse font-medium">Extracting text...</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {res?.status === "processing" && (
                        <div className="px-4 pb-4 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-primary font-medium">Processing...</span>
                            <span className="text-primary font-bold">{Math.round(res.progress || 0)}%</span>
                          </div>
                          <div className="h-2 bg-brand-sky rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300 ease-out"
                              style={{ width: `${res.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
    </ToolPageShell>
  );
}
