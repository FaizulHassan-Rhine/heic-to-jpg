import { useState, useEffect } from "react";
import Dropzone from "../components/Dropzone";
import CollapsibleDropzone from "../components/CollapsibleDropzone";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import JSZip from "jszip";
import { Loader2, CheckCircle, Download, AlertCircle, Music, Trash2, Upload, RotateCcw, Settings2, ArrowRight } from "lucide-react";
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

// Helper function to detect audio format from file
const detectAudioFormat = (file) => {
  // Check MIME type first
  const mimeType = file.type?.toLowerCase() || '';
  
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('wav') || mimeType.includes('wave')) return 'wav';
  if (mimeType.includes('m4a') || mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('ogg') || mimeType.includes('vorbis') || mimeType.includes('opus')) return 'ogg';
  if (mimeType.includes('flac')) return 'flac';
  if (mimeType.includes('aac')) return 'aac';
  if (mimeType.includes('webm')) return 'webm';
  
  // Fallback to file extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  const extMap = {
    'mp3': 'mp3',
    'wav': 'wav',
    'wave': 'wav',
    'm4a': 'm4a',
    'ogg': 'ogg',
    'flac': 'flac',
    'aac': 'aac',
    'webm': 'webm',
  };
  
  return extMap[ext] || 'mp3'; // Default to mp3 if unknown
};

export default function AudioConvert() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState({});
  const [processing, setProcessing] = useState(false);
  const [detectedInputFormat, setDetectedInputFormat] = useState(null);
  const [outputFormat, setOutputFormat] = useState("wav");
  const [totalCompleted, setTotalCompleted] = useState(0);

  const handleFilesAdded = (newFiles) => {
    if (newFiles.length > 20) {
      toast.error("Maximum 20 files at a time");
      return;
    }

    // Audio MIME types
    const audioMimeTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/mpeg3', 'audio/x-mpeg-3',
      'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/mp4', 'audio/x-m4a', 'audio/m4a',
      'audio/ogg', 'audio/vorbis', 'audio/opus',
      'audio/flac', 'audio/x-flac',
      'audio/aac', 'audio/aacp', 'audio/x-aac',
      'audio/webm',
    ];
    
    // Audio file extensions
    const audioExtensions = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'wma', 'opus', 'webm'];

    const validFiles = [];
    const rejectedFiles = [];

    newFiles.forEach(f => {
      // Check file size first
      const size = f.size / 1024 / 1024;
      if (size > 50) {
        toast.error(`${f.name} is too large (max 50MB)`);
        rejectedFiles.push(f.name);
        return;
      }

      // Check MIME type
      const fileMimeType = f.type?.toLowerCase() || '';
      const isAudioMime = audioMimeTypes.some(mime => 
        fileMimeType === mime.toLowerCase() || 
        fileMimeType.startsWith('audio/')
      );
      
      // Check file extension as fallback (in case MIME type is missing)
      const fileExt = f.name.split('.').pop()?.toLowerCase();
      const isAudioExt = fileExt && audioExtensions.includes(fileExt);

      if (isAudioMime || isAudioExt) {
        validFiles.push(f);
      } else {
        rejectedFiles.push(f.name);
      }
    });

    // Show error for rejected files
    if (rejectedFiles.length > 0) {
      const fileList = rejectedFiles.slice(0, 3).join(', ');
      const more = rejectedFiles.length > 3 ? ` and ${rejectedFiles.length - 3} more` : '';
      toast.error(`${rejectedFiles.length} file(s) rejected: ${fileList}${more}. Only audio files (MP3, WAV, M4A, OGG, FLAC, AAC) are allowed.`);
    }

    if (validFiles.length > 0) {
      setFiles(prev => {
        const allFiles = [...prev, ...validFiles];
        // Detect input format from all files
        const detectedFormats = allFiles.map(detectAudioFormat);
        // Use the most common format
        const mostCommonFormat = detectedFormats.reduce((a, b, _, arr) => 
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        );
        setDetectedInputFormat(mostCommonFormat);
        return allFiles;
      });
      setTotalCompleted(0);
      setResults({});
    }
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      toast.error("Upload files first");
      return;
    }

    setProcessing(true);
    setTotalCompleted(0);
    const newResults = {};

    for (const file of files) {
      // Initialize with processing status
      newResults[file.name] = {
        status: "processing",
        progress: 0
      };
      setResults({ ...newResults });

      // Simulate progress
      const progressInterval = setInterval(() => {
        setResults(prev => {
          const current = prev[file.name]?.progress || 0;
          if (current < 90 && prev[file.name]?.status === "processing") {
            return {
              ...prev,
              [file.name]: { ...prev[file.name], progress: Math.min(current + Math.random() * 20, 90) }
            };
          }
          return prev;
        });
      }, 200);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("outputFormat", outputFormat);

        const response = await fetch("/api/audio-convert", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        newResults[file.name] = {
          status: "success",
          url,
          size: blob.size,
          fileName: `${file.name.split('.')[0]}.${outputFormat}`,
          progress: 100,
        };

        toast.success(`✓ ${file.name}`);
      } catch (error) {
        clearInterval(progressInterval);
        console.error(`Conversion error for ${file.name}:`, error);
        newResults[file.name] = {
          status: "error",
          error: error.message || "Conversion failed",
        };
        toast.error(`✗ ${file.name}`);
      }

      setTotalCompleted(prev => prev + 1);
      setResults({ ...newResults });
      
      // Reset progress after showing 100%
      if (newResults[file.name]?.status === "success") {
        setTimeout(() => {
          setResults(prev => ({
            ...prev,
            [file.name]: { ...prev[file.name], progress: undefined }
          }));
        }, 300);
      }
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
    const updatedFiles = files.filter(f => f.name !== name);
    setFiles(updatedFiles);
    
    // Re-detect format if files remain, otherwise clear
    if (updatedFiles.length > 0) {
      const detectedFormats = updatedFiles.map(detectAudioFormat);
      const mostCommonFormat = detectedFormats.reduce((a, b, _, arr) => 
        arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
      );
      setDetectedInputFormat(mostCommonFormat);
    } else {
      setDetectedInputFormat(null);
    }
    
    const newResults = { ...results };
    delete newResults[name];
    setResults(newResults);
  };

  const clearAll = () => {
    setFiles([]);
    setResults({});
    setTotalCompleted(0);
    setDetectedInputFormat(null);
    setOutputFormat("wav");
  };

  const successCount = Object.values(results).filter(r => r.status === "success").length;
  const errorCount = Object.values(results).filter(r => r.status === "error").length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="top-center" />
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
            Audio Converter
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Convert audio between MP3, WAV, M4A, OGG, FLAC, AAC formats.
          </p>
        </div>

        <div className="grid gap-8">
          {/* Dropzone */}
          <CollapsibleDropzone
            files={files}
            setFiles={handleFilesAdded}
            resetResults={() => { setResults({}); }}
            accept={{
              "audio/mpeg": [".mp3", ".MP3"],
              "audio/wav": [".wav", ".WAV"],
              "audio/wave": [".wave", ".WAVE"],
              "audio/mp4": [".m4a", ".M4A"],
              "audio/x-m4a": [".m4a", ".M4A"],
              "audio/ogg": [".ogg", ".OGG"],
              "audio/flac": [".flac", ".FLAC"],
              "audio/x-flac": [".flac", ".FLAC"],
              "audio/aac": [".aac", ".AAC"],
              "audio/webm": [".webm", ".WEBM"],
            }}
            title="Drop audio files here"
            description="or click to browse • MP3, WAV, M4A, OGG, FLAC, AAC"
            disabled={processing}
            borderColor="border-gray-300"
            hoverColor="hover:border-violet-500"
          />

          {/* Settings and File List */}
          {files.length > 0 && (
            <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-start">
              {/* Settings Sidebar */}
              <Card className="lg:sticky lg:top-24 h-fit border-0 shadow-lg ring-1 ring-gray-100">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
                    <Settings2 className="w-6 h-6 text-violet-600" />
                    Settings
                  </div>

                  {/* Input Format (Auto-detected, Read-only) */}
                  {detectedInputFormat && (
                    <>
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Input Format</label>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-2">
                            <Music className="w-5 h-5 text-violet-600" />
                            <span className="font-semibold text-gray-900">
                              {detectedInputFormat.toUpperCase()}
                            </span>
                            <Badge variant="secondary" className="ml-auto bg-violet-100 text-violet-700 text-xs">
                              Auto-detected
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <Separator />
                    </>
                  )}

                  {/* Output Format */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Output Format</label>
                    <RadioGroup value={outputFormat} onValueChange={setOutputFormat}>
                      <div className="grid grid-cols-2 gap-2">
                        {audioFormats.filter(f => f.id !== detectedInputFormat).map((fmt) => (
                          <div key={fmt.id} className="flex items-center gap-2">
                            <RadioGroupItem value={fmt.id} id={`output-${fmt.id}`} />
                            <label htmlFor={`output-${fmt.id}`} className="cursor-pointer text-sm">{fmt.label}</label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button
                      onClick={handleConvert}
                      disabled={processing || files.length === 0}
                      className="w-full bg-violet-600 hover:bg-violet-700 text-white h-11 shadow-md hover:shadow-lg transition-all font-semibold"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Converting ({totalCompleted}/{files.length})
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 mr-2" />
                          Convert All
                        </>
                      )}
                    </Button>
                    {successCount > 1 && (
                      <Button
                        variant="outline"
                        onClick={downloadAllZip}
                        disabled={processing}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download All ZIP
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={clearAll}
                      disabled={processing}
                      className="w-full text-gray-500"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset All
                    </Button>
                  </div>

                  {/* Progress */}
                  {processing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Progress</span>
                        <span>{totalCompleted}/{files.length}</span>
                      </div>
                      <Progress value={(totalCompleted / files.length) * 100} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* File List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xl text-gray-800">Files ({files.length})</h3>
                  {Object.keys(results).length > 0 && (
                    <Badge className="bg-violet-100 text-violet-700">
                      {successCount} ✓ {errorCount > 0 && `${errorCount} ✗`}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {files.map((file) => {
                    const result = results[file.name];
                    return (
                      <Card key={file.name} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                        <div className="p-4 flex gap-5 items-center">
                          <div className="w-16 h-16 bg-violet-100 rounded-xl flex-shrink-0 flex items-center justify-center border border-violet-200">
                            <Music className="w-8 h-8 text-violet-600" />
                          </div>

                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex justify-between items-start">
                              <h4 className="font-semibold truncate pr-4 text-gray-900 text-lg">{file.name}</h4>
                              <div className="flex gap-2">
                                {result?.status === "success" && (
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-violet-600 bg-violet-50 hover:bg-violet-100" onClick={() => downloadFile(file.name)}>
                                    <Download className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeFile(file.name)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 font-mono">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </Badge>
                              {result?.status === "success" && (
                                <>
                                  <ArrowRight className="w-3 h-3 text-gray-300" />
                                  <Badge className="bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100">
                                    {outputFormat.toUpperCase()} Ready ({(result.size / 1024).toFixed(0)} KB)
                                  </Badge>
                                </>
                              )}
                              {result?.status === "error" && (
                                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
                                  Error: {result.error}
                                </Badge>
                              )}
                              {!result && (
                                <span className="text-gray-400 italic text-xs">Ready to convert</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {result?.status === "processing" && (
                          <div className="px-4 pb-4 space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-violet-600 font-medium">Processing...</span>
                              <span className="text-violet-600 font-bold">{Math.round(result.progress || 0)}%</span>
                            </div>
                            <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-violet-600 transition-all duration-300 ease-out"
                                style={{ width: `${result.progress || 0}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
