import { useQuery } from "@tanstack/react-query";

const DEFAULT_SETTINGS = {
  image: { maxSize: 20 * 1024 * 1024, maxFiles: 20 },
  document: { maxSize: 20 * 1024 * 1024, maxFiles: 10 },
  pdf: { maxSize: 20 * 1024 * 1024, maxFiles: 10 },
  video: { maxSize: 100 * 1024 * 1024, maxFiles: 5 },
  audio: { maxSize: 50 * 1024 * 1024, maxFiles: 10 },
  general: { maxSize: 20 * 1024 * 1024, maxFiles: 10 },
  features: {
    imageConverter: { socialPreset: false, advancedOptions: {} },
    imageCompress: { webpFormat: false, targetFileSize: false, advancedOptions: {} },
    imageToPdf: { advancedOptions: {} },
    extractText: { proOCR: false, languageSelection: false, exportFormat: false },
    videoConvert: { webmFormat: false },
    videoCompress: { advancedOptions: {} },
    videoTrim: { advancedOptions: {} },
    docToPdf: { batchConversion: false, advancedOptions: {} },
    pdfToDoc: { advancedOptions: {} },
    mergePdf: { advancedOptions: {} },
    compressPdf: { advancedOptions: {} },
    scanner: { advancedOptions: {} },
    audioConvert: { highQuality: false, advancedOptions: {} },
    textToSpeech: { advancedOptions: {} },
    speechToText: { longAudio: false, advancedOptions: {} },
    qrBarcode: { customDesign: false, batchGeneration: false },
    urlShortener: { advancedOptions: {} },
  },
};

export const settingsQueryKey = ["settings"];

async function fetchSettings() {
  const response = await fetch("/api/settings", {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  const data = await response.json();
  if (!data.success) throw new Error("Failed to load settings");
  return data.settings;
}

// Fetch application settings
// Returns { settings, loading, error } for backward compatibility with all tool pages
// Uses placeholderData so settings are instantly available (defaults) while the real fetch runs
export function useSettings() {
  const query = useQuery({
    queryKey: settingsQueryKey,
    queryFn: fetchSettings,
    placeholderData: DEFAULT_SETTINGS,
    staleTime: 5 * 1000,
    cacheTime: 2 * 60 * 1000,
    refetchInterval: 10 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  return {
    settings: query.data || DEFAULT_SETTINGS,
    loading: false,
    settingsLoading: false,
    error: query.error,
    ...query,
  };
}

// Helper function to get settings without hook (for use in non-component code)
export async function getSettings() {
  try {
    const response = await fetch("/api/settings");
    const data = await response.json();
    if (data.success) {
      return data.settings;
    }
  } catch (error) {
    console.error("Error fetching settings:", error);
  }

  // Return defaults if fetch fails
  return {
    image: { maxSize: 20 * 1024 * 1024, maxFiles: 20 },
    document: { maxSize: 20 * 1024 * 1024, maxFiles: 10 },
    pdf: { maxSize: 20 * 1024 * 1024, maxFiles: 10 },
    video: { maxSize: 100 * 1024 * 1024, maxFiles: 5 },
    audio: { maxSize: 50 * 1024 * 1024, maxFiles: 10 },
    general: { maxSize: 20 * 1024 * 1024, maxFiles: 10 },
    features: {
      imageConverter: { socialPreset: false, advancedOptions: {} },
      imageCompress: { webpFormat: false, targetFileSize: false, advancedOptions: {} },
      imageToPdf: { advancedOptions: {} },
      extractText: { proOCR: false, languageSelection: false, exportFormat: false },
      videoConvert: { webmFormat: false },
      videoCompress: { advancedOptions: {} },
      videoTrim: { advancedOptions: {} },
      docToPdf: { batchConversion: false, advancedOptions: {} },
      pdfToDoc: { advancedOptions: {} },
      mergePdf: { advancedOptions: {} },
      compressPdf: { advancedOptions: {} },
      scanner: { advancedOptions: {} },
      audioConvert: { highQuality: false, advancedOptions: {} },
      textToSpeech: { advancedOptions: {} },
      speechToText: { longAudio: false, advancedOptions: {} },
      qrBarcode: { customDesign: false, batchGeneration: false },
      urlShortener: { advancedOptions: {} },
    },
  };
}

// Note: clearSettingsCache is now handled directly with queryClient.invalidateQueries
// in the components that need it. This keeps the API simpler.

