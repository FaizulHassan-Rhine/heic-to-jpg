import { useState, useEffect } from "react";
import Dropzone from "../components/Dropzone";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import JSZip from "jszip";
import { Loader2, CheckCircle, Download, AlertCircle, Music, Trash2, Upload, RotateCcw } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast, { Toaster } from "react-hot-toast";

// Audio format options
const audioFormats = [
  { id: 'mp3', label: 'MP3', icon: '⠿' },
  { id: 'wav', label: 'WAV', icon: '⠿' },
  { id: 'm4a', label: 'M4A', icon: '⠿' },
  { id: 'ogg', label: 'OGG', icon: '⠿' },
  { id: 'flac', label: 'FLAC', icon: '⠿' },
  { id: 'aac', label: 'AAC', icon: '⠿' },
];

export default function AudioConvert() {
  const [selectedInputType, setSelectedInputType] = useState(null);
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [format, setFormat] = useState("wav");
  const [totalCompleted, setTotalCompleted] = useState(0);

  const handleFilesAdded = (newFiles) => {
    if (newFiles.length > 20) {
      toast.error("Maximum 20 files at a time");
      return;
    }

    const validFiles = newFiles.filter(f => {
      const size = f.size / 1024 / 1024;
      if (size > 50) {
        toast.error(`${f.name} is too large (max 50MB)`);
        return false;
      }
      return true;
    });

    setFiles(validFiles);
    setTotalCompleted(0);
    setResults({});
  };

  const handleConvert = async () => {
    if (!selectedInputType || files.length === 0) {
      toast.error("Select format and upload files first");
      return;
    }

    setProcessing(true);
    setTotalCompleted(0);
    const newResults = {};

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("outputFormat", format);

        const response = await fetch("/api/audio-convert", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        newResults[file.name] = {
          status: "success",
          url,
          size: blob.size,
          fileName: `${file.name.split('.')[0]}.${format}`,
        };

        toast.success(`✓ ${file.name}`);
      } catch (error) {
        console.error(`Conversion error for ${file.name}:`, error);
        newResults[file.name] = {
          status: "error",
          error: error.message || "Conversion failed",
        };
        toast.error(`✗ ${file.name}`);
      }

      setTotalCompleted(prev => prev + 1);
      setResults({ ...newResults });
    }

    setProcessing(false);
  };

  const downloadFile = (fileName) => {
    const result = results[fileName];
    if (result?.url) {
      const a = document.createElement("a");
      a.href = result.url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const downloadAllZip = async () => {
    const zip = new JSZip();
    let count = 0;

    for (const [name, result] of Object.entries(results)) {
      if (result.status === "success") {
        const response = await fetch(result.url);
        const blob = await response.blob();
        zip.file(result.fileName, blob);
        count++;
      }
    }

    if (count === 0) {
      toast.error("No files to download");
      return;
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audio-files.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded ZIP");
  };

  const removeFile = (name) => {
    setFiles(files.filter(f => f.name !== name));
    const newResults = { ...results };
    delete newResults[name];
    setResults(newResults);
  };

  const clearAll = () => {
    setFiles([]);
    setResults({});
    setTotalCompleted(0);
  };

  const successCount = Object.values(results).filter(r => r.status === "success").length;
  const errorCount = Object.values(results).filter(r => r.status === "error").length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="top-center" />
      <Navbar />

      <main className="flex-1 py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex justify-center gap-2 mb-4">
                <Music className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl font-bold">Audio Converter</h1>
              <p className="text-muted-foreground">Convert audio between MP3, WAV, M4A, OGG, FLAC, AAC - all in your browser!</p>
            </div>

            {/* Status */}

            {selectedInputType === null ? (
              <div className="space-y-4">
                <h2 className="font-semibold">Select Input Format</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {audioFormats.map((fmt) => (
                    <Card
                      key={fmt.id}
                      className="cursor-pointer hover:border-primary hover:shadow-lg transition-all"
                      onClick={() => setSelectedInputType(fmt.id)}
                    >
                      <CardContent className="pt-6 text-center space-y-2">
                        <div className="flex justify-center">
                          <Music className="h-8 w-8 text-primary stroke-[1.5]" />
                        </div>
                        <div className="font-semibold">{fmt.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selected format info */}
                <div className="bg-accent p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Input Format</p>
                    <p className="font-bold text-lg">{selectedInputType.toUpperCase()}</p>
                  </div>
                  <Button variant="ghost" onClick={() => {
                    setSelectedInputType(null);
                    clearAll();
                  }}>
                    Change
                  </Button>
                </div>

                {/* Output format */}
                <div className="space-y-3">
                  <label className="font-semibold">Output Format</label>
                  <RadioGroup value={format} onValueChange={setFormat}>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {audioFormats.filter(f => f.id !== selectedInputType).map((fmt) => (
                        <div key={fmt.id} className="flex items-center gap-2">
                          <RadioGroupItem value={fmt.id} id={fmt.id} />
                          <label htmlFor={fmt.id} className="cursor-pointer">{fmt.label}</label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                {/* File upload */}
                <div>
                  <label className="font-semibold mb-3 block">Upload Files</label>
                  <Dropzone
                    setFiles={handleFilesAdded}
                    resetResults={() => { setResults({}); }}
                    inputType={selectedInputType}
                    disabled={processing}
                  />
                </div>

                {/* File list */}
                {files.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Files ({files.length})</h3>
                    <div className="space-y-2">
                      {files.map((file) => (
                        <div key={file.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.name)}
                            disabled={processing}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress */}
                {processing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Converting...</span>
                      <span>{totalCompleted}/{files.length}</span>
                    </div>
                    <Progress value={(totalCompleted / files.length) * 100} />
                  </div>
                )}

                {/* Results */}
                {Object.keys(results).length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">Results</h3>
                      {successCount > 0 && (
                        <Badge>{successCount} ✓ {errorCount > 0 && `${errorCount} ✗`}</Badge>
                      )}
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {Object.entries(results).map(([name, result]) => (
                        <div key={name} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            {result.status === "success" ? (
                              <>
                                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{result.fileName}</p>
                                  <p className="text-xs text-muted-foreground">{(result.size / 1024).toFixed(0)} KB</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{name}</p>
                                  <p className="text-xs text-red-500">{result.error}</p>
                                </div>
                              </>
                            )}
                          </div>
                          {result.status === "success" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadFile(name)}
                              className="flex-shrink-0 ml-2"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 flex-wrap justify-end">
                  {Object.keys(results).length > 0 && (
                    <Button
                      variant="outline"
                      onClick={clearAll}
                      disabled={processing}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                  {files.length > 0 && (
                    <Button
                      onClick={handleConvert}
                      disabled={processing}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {processing ? `Converting (${totalCompleted}/${files.length})` : "Convert"}
                    </Button>
                  )}
                  {successCount > 1 && (
                    <Button
                      variant="outline"
                      onClick={downloadAllZip}
                      disabled={processing}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download ZIP
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
