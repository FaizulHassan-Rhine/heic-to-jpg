import { useState } from "react";
import Dropzone from "../components/Dropzone";
import JSZip from "jszip";
import { Loader2, CheckCircle, Download, X, AlertCircle, FileImage } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";

export default function Home() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [format, setFormat] = useState("jpg-high");
  const [totalUploads, setTotalUploads] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);

  // Reset previous results when uploading new batch
  const resetResults = () => {
    setFiles([]);
    setResults({});
    setProcessing(false);
  };

  // Track uploads when files are added
  const handleFilesAdded = (newFiles) => {
    setFiles(newFiles);
    setTotalUploads((prev) => prev + newFiles.length);
  };

  // Remove a single file from the list
  const removeFile = (fileName) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
    setResults((prev) => {
      const updated = { ...prev };
      delete updated[fileName];
      return updated;
    });
  };

  const convertAll = async () => {
    setProcessing(true);

    const updated = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      updated[file.name] = { status: "processing", percent: 0 };
      setResults({ ...updated });

      // Smooth progress simulation
      let p = 0;
      const timer = setInterval(() => {
        p += Math.random() * 15;
        if (p >= 95) p = 95;
        updated[file.name].percent = Math.floor(p);
        setResults({ ...updated });
      }, 200);

      // SEND REQUEST TO API
      const form = new FormData();
      form.append("file", file);
      form.append("format", format);

      try {
        const res = await fetch("/api/convert-single", {
          method: "POST",
          body: form,
        });

        clearInterval(timer);

        if (!res.ok) {
          throw new Error("Conversion failed");
        }

        const out = await res.arrayBuffer();
        const ext = res.headers.get("X-Output-Extension");
        const blob = new Blob([out]);

        updated[file.name] = {
          status: "done",
          percent: 100,
          ext,
          blob,
          size: blob.size,
        };

        setResults({ ...updated });
        setTotalCompleted((prev) => prev + 1);
      } catch (error) {
        clearInterval(timer);
        updated[file.name] = {
          status: "error",
          percent: 0,
        };
        setResults({ ...updated });
        console.error("Conversion error:", error);
      }
    }

    setProcessing(false);
  };

  const downloadAll = async () => {
    const zip = new JSZip();

    for (const name in results) {
      const r = results[name];
      if (r.status === "done") {
        const outName = name.replace(/\.(heic|HEIC)$/i, `.${r.ext}`);
        zip.file(outName, r.blob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(zipBlob);
    a.download = "converted.zip";
    a.click();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            HEIC → JPG / WebP Converter
          </h1>
          <p className="text-muted-foreground">
            Convert your HEIC images to JPG or WebP format with ease
          </p>
        </div>

        {/* Statistics Display */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total Uploaded
                </p>
                <p className="text-3xl font-bold text-primary">{totalUploads}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Total Completed
                </p>
                <p className="text-3xl font-bold text-primary">{totalCompleted}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dropzone */}
        <Dropzone setFiles={handleFilesAdded} resetResults={resetResults} />

        {/* QUALITY OPTIONS */}
        {files.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Output Format</CardTitle>
              <CardDescription>
                Choose the format and quality for your converted images
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={format}
                onValueChange={setFormat}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-3 p-4 border rounded-md cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-accent">
                  <RadioGroupItem value="jpg-high" id="jpg-high" />
                  <label htmlFor="jpg-high" className="flex-1 cursor-pointer">
                    <div className="font-medium">High-Res JPG</div>
                    <div className="text-sm text-muted-foreground">95% Quality</div>
                  </label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-md cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-accent">
                  <RadioGroupItem value="jpg-balanced" id="jpg-balanced" />
                  <label htmlFor="jpg-balanced" className="flex-1 cursor-pointer">
                    <div className="font-medium">Balanced JPG</div>
                    <div className="text-sm text-muted-foreground">80% Quality</div>
                  </label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-md cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-accent">
                  <RadioGroupItem value="webp-high" id="webp-high" />
                  <label htmlFor="webp-high" className="flex-1 cursor-pointer">
                    <div className="font-medium">High-Res WebP</div>
                    <div className="text-sm text-muted-foreground">90% Quality</div>
                  </label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-md cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-accent">
                  <RadioGroupItem value="webp-balanced" id="webp-balanced" />
                  <label htmlFor="webp-balanced" className="flex-1 cursor-pointer">
                    <div className="font-medium">Balanced WebP</div>
                    <div className="text-sm text-muted-foreground">80% Quality</div>
                  </label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Convert Button */}
        {files.length > 0 && (
          <div className="flex justify-center">
            <Button
              onClick={convertAll}
              disabled={processing}
              size="lg"
              className="min-w-[200px]"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                "Convert All"
              )}
            </Button>
          </div>
        )}

        {/* FILE STATUS LIST */}
        {files.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <h2 className="text-2xl font-semibold">Files</h2>
            <div className="space-y-3">
              {files.map((file) => {
                const result = results[file.name];
                const percent = result?.percent ?? 0;

                return (
                  <Card key={file.name} className="relative">
                    <CardContent className="pt-6">
                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(file.name)}
                        disabled={processing}
                        className="absolute top-4 right-4 h-8 w-8"
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </Button>

                      <div className="pr-12 space-y-3">
                        <div className="flex items-start gap-3">
                          <FileImage className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{file.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {!result && (
                                <Badge variant="secondary">Pending</Badge>
                              )}
                              {result?.status === "processing" && (
                                <Badge variant="default">
                                  Converting... {percent}%
                                </Badge>
                              )}
                              {result?.status === "done" && (
                                <>
                                  <Badge variant="default" className="bg-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Done
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {(result.size / 1024).toFixed(2)} KB
                                  </span>
                                </>
                              )}
                              {result?.status === "error" && (
                                <Badge variant="destructive">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Error
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {result?.status === "processing" && (
                          <Progress value={percent} className="h-2" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Download ZIP */}
        {files.length > 0 &&
          Object.values(results).filter((x) => x.status === "done").length ===
            files.length && (
            <div className="flex justify-center">
              <Button
                onClick={downloadAll}
                size="lg"
                className="bg-green-600 hover:bg-green-700 min-w-[200px]"
              >
                <Download className="mr-2 h-4 w-4" />
                Download All (ZIP)
              </Button>
            </div>
          )}
      </div>
    </div>
  );
}
