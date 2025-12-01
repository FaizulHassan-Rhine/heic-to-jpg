import { useState } from "react";
import Dropzone from "../components/Dropzone";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import JSZip from "jszip";
import { Loader2, CheckCircle, Download, X, AlertCircle, FileImage, Zap, Shield } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";

// Helper function to detect file type
const getFileType = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  if (['heic'].includes(ext)) return 'heic';
  if (['jpg', 'jpeg'].includes(ext)) return 'jpg';
  if (['png'].includes(ext)) return 'png';
  if (['webp'].includes(ext)) return 'webp';
  return null;
};

// Get available output formats based on input type
const getAvailableFormats = (fileType) => {
  if (fileType === 'heic') {
    return [
      { value: 'jpg-high', label: 'High-Res JPG', quality: '95%' },
      { value: 'jpg-balanced', label: 'Balanced JPG', quality: '80%' },
      { value: 'webp-high', label: 'High-Res WebP', quality: '90%' },
      { value: 'webp-balanced', label: 'Balanced WebP', quality: '80%' },
    ];
  }
  if (fileType === 'jpg') {
    return [
      { value: 'webp-high', label: 'High-Res WebP', quality: '90%' },
      { value: 'webp-balanced', label: 'Balanced WebP', quality: '80%' },
      { value: 'png', label: 'PNG', quality: 'Lossless' },
    ];
  }
  if (fileType === 'png') {
    return [
      { value: 'jpg-high', label: 'High-Res JPG', quality: '95%' },
      { value: 'jpg-balanced', label: 'Balanced JPG', quality: '80%' },
      { value: 'webp-high', label: 'High-Res WebP', quality: '90%' },
      { value: 'webp-balanced', label: 'Balanced WebP', quality: '80%' },
    ];
  }
  if (fileType === 'webp') {
    return [
      { value: 'jpg-high', label: 'High-Res JPG', quality: '95%' },
      { value: 'jpg-balanced', label: 'Balanced JPG', quality: '80%' },
      { value: 'png', label: 'PNG', quality: 'Lossless' },
    ];
  }
  return [];
};

// Get common format for all files (if all same type)
const getCommonFileType = (files) => {
  if (files.length === 0) return null;
  const types = files.map(f => getFileType(f.name));
  const firstType = types[0];
  return types.every(t => t === firstType) ? firstType : 'mixed';
};

// Conversion type options
const conversionTypes = [
  {
    id: 'heic',
    label: 'HEIC',
    description: 'Convert HEIC images',
    outputs: ['JPG', 'WebP'],
    icon: '📱'
  },
  {
    id: 'jpg',
    label: 'JPG',
    description: 'Convert JPG images',
    outputs: ['WebP', 'PNG'],
    icon: '🖼️'
  },
  {
    id: 'png',
    label: 'PNG',
    description: 'Convert PNG images',
    outputs: ['JPG', 'WebP'],
    icon: '🖼️'
  },
  {
    id: 'webp',
    label: 'WebP',
    description: 'Convert WebP images',
    outputs: ['JPG', 'PNG'],
    icon: '🖼️'
  },
];

export default function Home() {
  const [selectedInputType, setSelectedInputType] = useState(null);
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
    // Set default format based on selected input type
    if (selectedInputType) {
      const availableFormats = getAvailableFormats(selectedInputType);
      if (availableFormats.length > 0) {
        setFormat(availableFormats[0].value);
      }
    }
  };

  // Handle conversion type selection
  const handleConversionTypeSelect = (type) => {
    setSelectedInputType(type);
    setFiles([]);
    setResults({});
    setProcessing(false);
    // Set default format for selected type
    const availableFormats = getAvailableFormats(type);
    if (availableFormats.length > 0) {
      setFormat(availableFormats[0].value);
    }
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
      form.append("inputType", getFileType(file.name) || "heic");

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
        // Replace any image extension with the output extension
        const outName = name.replace(/\.(heic|HEIC|jpg|JPG|jpeg|JPEG|png|PNG|webp|WEBP)$/i, `.${r.ext}`);
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
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 space-y-32">
          {/* Hero Section */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold tracking-tight">
              Image Format Converter
            </h1>
            <p className="text-xl text-muted-foreground">
              Convert between HEIC, JPG, PNG, and WebP formats with ease. Fast, free, and secure.
              Support for all major image formats with batch processing.
            </p>
          </div>

          {/* Converter Section */}
          <section id="converter" className="space-y-8 py-8">
          

            {/* Step 1: Conversion Type Selection */}
            {!selectedInputType && (
              <Card>
                <CardHeader>
                  <CardTitle>Step 1: Select Input Format</CardTitle>
                  <CardDescription>
                    Choose what type of images you want to convert
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {conversionTypes.map((type) => {
                      const availableFormats = getAvailableFormats(type.id);
                      return (
                        <div
                          key={type.id}
                          onClick={() => handleConversionTypeSelect(type.id)}
                          className="p-6 border rounded-lg cursor-pointer hover:border-primary hover:bg-accent transition-colors"
                        >
                          <div className="text-4xl mb-3">{type.icon}</div>
                          <h3 className="font-semibold text-lg mb-1">{type.label}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {type.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {type.outputs.map((output) => (
                              <Badge key={output} variant="secondary">
                                → {output}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

                {/* Step 2: Upload Section */}
            {selectedInputType && (
              <>
                {/* Back Button */}
                <div className="flex justify-start">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedInputType(null);
                      setFiles([]);
                      setResults({});
                      setProcessing(false);
                    }}
                  >
                    ← Change Conversion Type
                  </Button>
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
                <Card>
                  <CardHeader>
                    <CardTitle>Step 2: Upload {selectedInputType.toUpperCase()} Images</CardTitle>
                    <CardDescription>
                      Drag and drop or click to select your {selectedInputType.toUpperCase()} files
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Dropzone 
                      setFiles={handleFilesAdded} 
                      resetResults={resetResults}
                      inputType={selectedInputType}
                    />
                  </CardContent>
                </Card>

                {/* Step 3: Output Format Selection */}
                {files.length > 0 && (() => {
                  const availableFormats = getAvailableFormats(selectedInputType);
                  
                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle>Step 3: Choose Output Format</CardTitle>
                        <CardDescription>
                          Select the format and quality for your converted images
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <RadioGroup
                          value={format}
                          onValueChange={setFormat}
                          className={`grid gap-4 ${availableFormats.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}
                        >
                          {availableFormats.map((fmt) => (
                            <div
                              key={fmt.value}
                              className="flex items-center space-x-3 p-4 border rounded-md cursor-pointer hover:bg-accent transition-colors has-[:checked]:border-primary has-[:checked]:bg-accent"
                            >
                              <RadioGroupItem value={fmt.value} id={fmt.value} />
                              <label htmlFor={fmt.value} className="flex-1 cursor-pointer">
                                <div className="font-medium">{fmt.label}</div>
                                <div className="text-sm text-muted-foreground">{fmt.quality} Quality</div>
                              </label>
                            </div>
                          ))}
                        </RadioGroup>
                      </CardContent>
                    </Card>
                  );
                })()}

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
              </>
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
          </section>

          {/* How It Works Section */}
          <section id="how-it-works" className="space-y-8 py-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">How It Works</h2>
              <p className="text-muted-foreground">
                Convert your images in just a few simple steps
              </p>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Select & Upload</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose your input format (HEIC, JPG, PNG, or WebP) and upload your images
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Choose Output Format</h3>
                      <p className="text-sm text-muted-foreground">
                        Select your desired output format (JPG, PNG, or WebP) and quality setting
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Convert</h3>
                      <p className="text-sm text-muted-foreground">
                        Click convert and watch your images transform in real-time
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                      4
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Download</h3>
                      <p className="text-sm text-muted-foreground">
                        Download all converted images as a convenient ZIP file
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Why Use It Section */}
          <section id="why-use-it" className="space-y-8 py-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Why Use This Converter?</h2>
              <p className="text-muted-foreground">
                Everything you need to convert images between formats efficiently
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Lightning Fast</CardTitle>
                  <CardDescription>
                    Convert multiple images simultaneously with our optimized processing engine
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>100% Secure</CardTitle>
                  <CardDescription>
                    Your files are processed locally and never stored on our servers
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Multiple Formats</CardTitle>
                  <CardDescription>
                    Convert between HEIC, JPG, PNG, and WebP with customizable quality settings
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
