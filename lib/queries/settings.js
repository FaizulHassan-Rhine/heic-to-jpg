import { useQuery } from "@tanstack/react-query";

// Fetch application settings
// Returns { settings, loading, error } for backward compatibility with all tool pages
export function useSettings() {
  const query = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error("Failed to load settings");
      }
      
      return data.settings;
    },
    staleTime: 5 * 1000, // 5 seconds - data is considered stale after 5 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes - keep in cache for 2 minutes
    refetchInterval: 10 * 1000, // Refetch every 10 seconds for real-time updates
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnReconnect: true, // Refetch when network reconnects
  });

  // Map TanStack Query's { data, isLoading, error } to { settings, loading, error }
  // so all existing tool pages work without changes
  return {
    settings: query.data || null,
    loading: query.isLoading,
    error: query.error,
    // Also expose the raw query for advanced usage
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

