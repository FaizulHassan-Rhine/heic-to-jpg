import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  Mic, MicOff, Copy, Download, Trash2, RotateCcw,
  Languages, CheckCircle, AlertCircle, Square
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import toast, { Toaster } from "react-hot-toast";
import { cn } from "@/lib/utils";
import Head from "next/head";

// Popular languages for speech recognition
const LANGUAGE_GROUPS = {
  "Popular": [
    { code: "en-US", name: "English (US)" },
    { code: "en-GB", name: "English (UK)" },
    { code: "en-AU", name: "English (Australia)" },
    { code: "es-ES", name: "Spanish (Spain)" },
    { code: "es-MX", name: "Spanish (Mexico)" },
    { code: "fr-FR", name: "French" },
    { code: "de-DE", name: "German" },
    { code: "it-IT", name: "Italian" },
    { code: "pt-BR", name: "Portuguese (BR)" },
    { code: "zh-CN", name: "Chinese (Mandarin)" },
    { code: "ja-JP", name: "Japanese" },
    { code: "ko-KR", name: "Korean" },
  ],
  "South Asian": [
    { code: "hi-IN", name: "Hindi" },
    { code: "bn-IN", name: "Bengali" },
    { code: "ta-IN", name: "Tamil" },
    { code: "te-IN", name: "Telugu" },
    { code: "ur-PK", name: "Urdu" },
    { code: "gu-IN", name: "Gujarati" },
    { code: "mr-IN", name: "Marathi" },
    { code: "kn-IN", name: "Kannada" },
    { code: "ml-IN", name: "Malayalam" },
    { code: "pa-IN", name: "Punjabi" },
    { code: "si-LK", name: "Sinhala" },
    { code: "ne-NP", name: "Nepali" },
  ],
  "Middle Eastern": [
    { code: "ar-SA", name: "Arabic (Saudi)" },
    { code: "ar-EG", name: "Arabic (Egypt)" },
    { code: "tr-TR", name: "Turkish" },
    { code: "fa-IR", name: "Persian" },
    { code: "he-IL", name: "Hebrew" },
  ],
  "Asian": [
    { code: "th-TH", name: "Thai" },
    { code: "vi-VN", name: "Vietnamese" },
    { code: "id-ID", name: "Indonesian" },
    { code: "ms-MY", name: "Malay" },
    { code: "fil-PH", name: "Filipino" },
    { code: "zh-TW", name: "Chinese (Traditional)" },
    { code: "zh-HK", name: "Chinese (Cantonese)" },
  ],
  "European": [
    { code: "nl-NL", name: "Dutch" },
    { code: "pl-PL", name: "Polish" },
    { code: "ru-RU", name: "Russian" },
    { code: "sv-SE", name: "Swedish" },
    { code: "da-DK", name: "Danish" },
    { code: "fi-FI", name: "Finnish" },
    { code: "no-NO", name: "Norwegian" },
    { code: "el-GR", name: "Greek" },
    { code: "cs-CZ", name: "Czech" },
    { code: "ro-RO", name: "Romanian" },
    { code: "uk-UA", name: "Ukrainian" },
    { code: "hu-HU", name: "Hungarian" },
    { code: "sk-SK", name: "Slovak" },
    { code: "bg-BG", name: "Bulgarian" },
    { code: "hr-HR", name: "Croatian" },
    { code: "ca-ES", name: "Catalan" },
  ],
  "African": [
    { code: "af-ZA", name: "Afrikaans" },
    { code: "sw-KE", name: "Swahili" },
    { code: "zu-ZA", name: "Zulu" },
  ],
};

export default function SpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [selectedLang, setSelectedLang] = useState("en-US");
  const [supported, setSupported] = useState(true);
  const [continuous, setContinuous] = useState(true);
  const [history, setHistory] = useState([]);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef("");

  // Check support
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = selectedLang;
    recognition.interimResults = true;
    recognition.continuous = continuous;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript("");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        transcriptRef.current += final;
        setTranscript(transcriptRef.current);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") {
        toast.error("No speech detected. Try speaking louder or closer to the mic.");
      } else if (event.error === "not-allowed") {
        toast.error("Microphone access denied. Please allow microphone permission.");
      } else if (event.error !== "aborted") {
        toast.error("Recognition error: " + event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
      // Save to history if there's content
      if (transcriptRef.current.trim()) {
        setHistory((prev) => {
          const exists = prev.some((h) => h.text === transcriptRef.current.trim());
          if (exists) return prev;
          return [
            { text: transcriptRef.current.trim(), lang: selectedLang, time: new Date().toLocaleTimeString() },
            ...prev,
          ].slice(0, 10); // Keep last 10
        });
      }
    };

    recognitionRef.current = recognition;
    transcriptRef.current = transcript; // Keep existing text
    recognition.start();
  }, [selectedLang, continuous, transcript]);

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const clearTranscript = () => {
    stopListening();
    setTranscript("");
    setInterimTranscript("");
    transcriptRef.current = "";
  };

  const copyToClipboard = () => {
    if (!transcript.trim()) return;
    navigator.clipboard.writeText(transcript.trim());
    toast.success("Copied to clipboard!");
  };

  const downloadText = () => {
    if (!transcript.trim()) return;
    const blob = new Blob([transcript.trim()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${selectedLang}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadFromHistory = (item) => {
    setTranscript(item.text);
    transcriptRef.current = item.text;
    toast.success("Loaded from history");
  };

  const clearHistory = () => {
    setHistory([]);
    toast.success("History cleared");
  };

  // Get language name
  const getLangName = (code) => {
    for (const group of Object.values(LANGUAGE_GROUPS)) {
      const found = group.find((l) => l.code === code);
      if (found) return found.name;
    }
    return code;
  };

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

  if (!supported) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="p-8 text-center max-w-md">
            <MicOff className="h-16 w-16 mx-auto text-red-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">Not Supported</h2>
            <p className="text-gray-500">
              Your browser does not support the Speech Recognition API.
              Please use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> for the best experience.
            </p>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Speech to Text - ConvertMastery</title>
        <meta name="description" content="Convert speech to text in 50+ languages. Free, real-time transcription right in your browser." />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <Toaster position="top-center" />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Speech to Text</h1>
            <p className="text-gray-500">Real-time speech recognition in 50+ languages</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Left: Main Area */}
            <div className="md:col-span-2 space-y-4">
              {/* Microphone Button */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center">
                    {/* Big Mic Button */}
                    <button
                      onClick={toggleListening}
                      className={cn(
                        "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                        isListening
                          ? "bg-red-500 hover:bg-red-600 animate-pulse shadow-red-200"
                          : "bg-green-600 hover:bg-green-700 shadow-green-200"
                      )}
                    >
                      {isListening ? (
                        <Square className="h-10 w-10 text-white" />
                      ) : (
                        <Mic className="h-10 w-10 text-white" />
                      )}
                    </button>

                    <p className="mt-3 text-sm font-medium text-gray-600">
                      {isListening ? (
                        <span className="text-red-500 flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                          Listening... Click to stop
                        </span>
                      ) : (
                        "Click to start recording"
                      )}
                    </p>

                    {/* Live Waveform Animation */}
                    {isListening && (
                      <div className="flex items-center gap-1 mt-3 h-8">
                        {[...Array(12)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-red-400 rounded-full animate-pulse"
                            style={{
                              height: `${8 + Math.random() * 24}px`,
                              animationDelay: `${i * 0.08}s`,
                              animationDuration: `${0.4 + Math.random() * 0.4}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Transcript Output */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">Transcript</label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{wordCount} words</span>
                      {transcript && (
                        <Badge variant="outline" className="text-xs">
                          {getLangName(selectedLang)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="w-full min-h-[200px] p-4 border rounded-lg bg-white text-gray-800 text-base leading-relaxed">
                    {transcript || interimTranscript ? (
                      <>
                        <span>{transcript}</span>
                        {interimTranscript && (
                          <span className="text-gray-400 italic">{interimTranscript}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-300 italic">
                        Your transcription will appear here...
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      onClick={copyToClipboard}
                      variant="outline"
                      size="sm"
                      disabled={!transcript.trim()}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button
                      onClick={downloadText}
                      variant="outline"
                      size="sm"
                      disabled={!transcript.trim()}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      onClick={clearTranscript}
                      variant="outline"
                      size="sm"
                      disabled={!transcript.trim() && !isListening}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Settings & History */}
            <div className="space-y-4">
              {/* Language Selection */}
              <Card>
                <CardContent className="p-4">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
                    <Languages className="h-4 w-4" />
                    Language
                  </label>
                  <select
                    value={selectedLang}
                    onChange={(e) => {
                      if (isListening) stopListening();
                      setSelectedLang(e.target.value);
                    }}
                    className="w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    {Object.entries(LANGUAGE_GROUPS).map(([group, langs]) => (
                      <optgroup key={group} label={group}>
                        {langs.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </CardContent>
              </Card>

              {/* Options */}
              <Card>
                <CardContent className="p-4">
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Options</label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={continuous}
                      onChange={(e) => {
                        if (isListening) stopListening();
                        setContinuous(e.target.checked);
                      }}
                      className="w-4 h-4 accent-green-600 rounded"
                    />
                    <div>
                      <span className="text-sm text-gray-700">Continuous mode</span>
                      <p className="text-xs text-gray-400">Keep recording until you stop</p>
                    </div>
                  </label>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card>
                <CardContent className="p-4">
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Tips</label>
                  <ul className="text-xs text-gray-500 space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      Speak clearly and at a normal pace
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      Use a quiet environment for best results
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      Select the correct language before starting
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      Works best in Chrome or Edge browsers
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* History */}
              {history.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-gray-700">History</label>
                      <Button onClick={clearHistory} variant="ghost" size="sm" className="h-6 text-xs text-gray-400">
                        Clear
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {history.map((item, i) => (
                        <div
                          key={i}
                          className="p-2 border rounded-lg text-xs cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => loadFromHistory(item)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="text-[10px]">
                              {getLangName(item.lang)}
                            </Badge>
                            <span className="text-gray-400 text-[10px]">{item.time}</span>
                          </div>
                          <p className="text-gray-600 line-clamp-2">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Mic className="h-8 w-8 mx-auto text-green-600 mb-3" />
                <h3 className="font-semibold mb-2">Real-Time</h3>
                <p className="text-sm text-gray-500">
                  See your words appear as you speak with live transcription
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Languages className="h-8 w-8 mx-auto text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2">50+ Languages</h3>
                <p className="text-sm text-gray-500">
                  Recognize speech in dozens of languages and dialects worldwide
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <MicOff className="h-8 w-8 mx-auto text-purple-600 mb-3" />
                <h3 className="font-semibold mb-2">100% Private</h3>
                <p className="text-sm text-gray-500">
                  All processing happens in your browser — nothing is stored on any server
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

