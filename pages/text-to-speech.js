import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  Play, Pause, Square, Volume2, VolumeX, Languages, Gauge,
  RotateCcw, Download, Type, ChevronDown, Loader2
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import toast, { Toaster } from "react-hot-toast";
import { cn } from "@/lib/utils";
import Head from "next/head";

const MAX_CHARS = 5000;

// Popular languages grouped for easy browsing
const LANGUAGE_GROUPS = {
  "Popular": [
    { code: "en-US", name: "English (US)" },
    { code: "en-GB", name: "English (UK)" },
    { code: "es-ES", name: "Spanish" },
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
  ],
  "Middle Eastern": [
    { code: "ar-SA", name: "Arabic" },
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
  ],
};

export default function TextToSpeech() {
  const [text, setText] = useState("");
  const [selectedLang, setSelectedLang] = useState("en-US");
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [supported, setSupported] = useState(true);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isDownloading, setIsDownloading] = useState(false);
  const utteranceRef = useRef(null);

  // Load available voices
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
      return;
    }

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Get voices for selected language
  const filteredVoices = voices.filter((v) => v.lang.startsWith(selectedLang.split("-")[0]));

  // Auto-select first voice when language changes
  useEffect(() => {
    if (filteredVoices.length > 0) {
      setSelectedVoice(filteredVoices[0].name);
    } else {
      setSelectedVoice(null);
    }
  }, [selectedLang, voices]);

  const speak = () => {
    if (!text.trim()) {
      toast.error("Please enter some text first");
      return;
    }

    if (!window.speechSynthesis) {
      toast.error("Speech synthesis not supported in this browser");
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    utterance.lang = selectedLang;

    // Set voice
    if (selectedVoice) {
      const voice = voices.find((v) => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setHighlightIndex(-1);
    };

    utterance.onerror = (e) => {
      if (e.error !== "canceled") {
        console.error("Speech error:", e);
        toast.error("Speech error: " + e.error);
      }
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onboundary = (e) => {
      if (e.name === "word") {
        setHighlightIndex(e.charIndex);
      }
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const pause = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const resume = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setHighlightIndex(-1);
  };

  const resetAll = () => {
    stop();
    setText("");
    setRate(1);
    setPitch(1);
    setVolume(1);
    setSelectedLang("en-US");
  };

  const downloadText = () => {
    if (!text.trim()) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "speech-text.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Split text into chunks for TTS API (max ~200 chars per request)
  const splitTextIntoChunks = (text, maxLen = 200) => {
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    let current = "";

    for (const sentence of sentences) {
      if ((current + sentence).length > maxLen && current.length > 0) {
        chunks.push(current.trim());
        current = "";
      }
      if (sentence.length > maxLen) {
        // Split long sentences by words
        const words = sentence.split(/\s+/);
        for (const word of words) {
          if ((current + " " + word).length > maxLen && current.length > 0) {
            chunks.push(current.trim());
            current = "";
          }
          current += (current ? " " : "") + word;
        }
      } else {
        current += (current ? " " : "") + sentence.trim();
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  };

  const downloadSpeech = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text first");
      return;
    }

    setIsDownloading(true);
    const toastId = toast.loading("Generating audio file...");

    try {
      const langCode = selectedLang.split("-")[0]; // e.g. "en" from "en-US"
      const chunks = splitTextIntoChunks(text.trim());
      const audioBlobs = [];

      for (let i = 0; i < chunks.length; i++) {
        toast.loading(`Processing chunk ${i + 1} of ${chunks.length}...`, { id: toastId });

        const encodedText = encodeURIComponent(chunks[i]);
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${selectedLang}&client=tw-ob&q=${encodedText}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch audio chunk ${i + 1}`);

        const blob = await response.blob();
        audioBlobs.push(blob);
      }

      // Combine all audio blobs
      const combinedBlob = new Blob(audioBlobs, { type: "audio/mpeg" });
      const downloadUrl = URL.createObjectURL(combinedBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `speech-${langCode}-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success("Audio downloaded!", { id: toastId });
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to generate audio. Try shorter text or a different language.", { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  // Get language name from code
  const getLangName = (code) => {
    for (const group of Object.values(LANGUAGE_GROUPS)) {
      const found = group.find((l) => l.code === code);
      if (found) return found.name;
    }
    return code;
  };

  if (!supported) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="p-8 text-center">
            <VolumeX className="h-16 w-16 mx-auto text-red-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">Not Supported</h2>
            <p className="text-gray-500">Your browser does not support the Speech Synthesis API. Try Chrome or Edge.</p>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Text to Speech - ConvertMastery</title>
        <meta name="description" content="Convert text to speech in 40+ languages. Free, fast, and works right in your browser." />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <Toaster position="top-center" />

        <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Text to Speech</h1>
            <p className="text-gray-500">Convert your text to natural speech in 40+ languages</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Left: Text Input */}
            <div className="md:col-span-2">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Enter Text</label>
                    <span className={cn(
                      "text-xs",
                      text.length > MAX_CHARS ? "text-red-500" : "text-gray-400"
                    )}>
                      {text.length} / {MAX_CHARS}
                    </span>
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_CHARS) {
                        setText(e.target.value);
                      } else {
                        toast.error(`Maximum ${MAX_CHARS} characters allowed`);
                      }
                    }}
                    placeholder="Type or paste your text here..."
                    className="w-full h-64 p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-800 text-base leading-relaxed"
                  />

                  {/* Playback Controls */}
                  <div className="flex items-center gap-3 mt-4">
                    {!isSpeaking ? (
                      <Button
                        onClick={speak}
                        className="bg-green-700 hover:bg-green-800 text-white"
                        disabled={!text.trim()}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Play
                      </Button>
                    ) : (
                      <>
                        {isPaused ? (
                          <Button onClick={resume} className="bg-green-700 hover:bg-green-800 text-white">
                            <Play className="h-4 w-4 mr-2" />
                            Resume
                          </Button>
                        ) : (
                          <Button onClick={pause} variant="outline" className="border-yellow-500 text-yellow-600">
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </Button>
                        )}
                        <Button onClick={stop} variant="outline" className="border-red-500 text-red-600">
                          <Square className="h-4 w-4 mr-2" />
                          Stop
                        </Button>
                      </>
                    )}

                    <div className="flex-1" />

                    <Button
                      onClick={downloadSpeech}
                      variant="outline"
                      size="sm"
                      disabled={!text.trim() || isDownloading}
                      className="border-green-600 text-green-700 hover:bg-green-50"
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-1" />
                      )}
                      {isDownloading ? "Generating..." : "Download MP3"}
                    </Button>
                    <Button onClick={downloadText} variant="ghost" size="sm" disabled={!text.trim()}>
                      <Download className="h-4 w-4 mr-1" />
                      Save Text
                    </Button>
                    <Button onClick={resetAll} variant="ghost" size="sm">
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                  </div>

                  {isSpeaking && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-green-500 rounded-full animate-pulse"
                            style={{
                              height: `${12 + Math.random() * 16}px`,
                              animationDelay: `${i * 0.15}s`,
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-green-600 font-medium">
                        {isPaused ? "Paused" : "Speaking..."}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right: Settings */}
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
                      if (isSpeaking) stop();
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

                  {/* Voice Selection */}
                  {filteredVoices.length > 0 && (
                    <div className="mt-3">
                      <label className="text-xs text-gray-500 mb-1 block">Voice</label>
                      <select
                        value={selectedVoice || ""}
                        onChange={(e) => {
                          if (isSpeaking) stop();
                          setSelectedVoice(e.target.value);
                        }}
                        className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                      >
                        {filteredVoices.map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name} {voice.localService ? "(Local)" : "(Online)"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {filteredVoices.length === 0 && (
                    <p className="text-xs text-yellow-600 mt-2">
                      No voices found for this language. The browser will use a default voice.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Speed */}
              <Card>
                <CardContent className="p-4">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
                    <Gauge className="h-4 w-4" />
                    Speed: {rate.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={rate}
                    onChange={(e) => setRate(parseFloat(e.target.value))}
                    className="w-full accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0.5x</span>
                    <span>1x</span>
                    <span>2x</span>
                  </div>
                </CardContent>
              </Card>

              {/* Pitch */}
              <Card>
                <CardContent className="p-4">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
                    <Type className="h-4 w-4" />
                    Pitch: {pitch.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Low</span>
                    <span>Normal</span>
                    <span>High</span>
                  </div>
                </CardContent>
              </Card>

              {/* Volume */}
              <Card>
                <CardContent className="p-4">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
                    <Volume2 className="h-4 w-4" />
                    Volume: {Math.round(volume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Mute</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Languages className="h-8 w-8 mx-auto text-green-600 mb-3" />
                <h3 className="font-semibold mb-2">40+ Languages</h3>
                <p className="text-sm text-gray-500">
                  Support for popular languages including Hindi, Arabic, Chinese, Spanish, and more
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Volume2 className="h-8 w-8 mx-auto text-blue-600 mb-3" />
                <h3 className="font-semibold mb-2">Adjustable Controls</h3>
                <p className="text-sm text-gray-500">
                  Fine-tune speed, pitch, and volume for the perfect listening experience
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Play className="h-8 w-8 mx-auto text-purple-600 mb-3" />
                <h3 className="font-semibold mb-2">Instant Playback</h3>
                <p className="text-sm text-gray-500">
                  Runs entirely in your browser — no uploads, no waiting, completely private
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

