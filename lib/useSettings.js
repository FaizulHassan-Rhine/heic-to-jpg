import { useState, useEffect } from "react";

let settingsCache = null;
let settingsPromise = null;

export function useSettings() {
  const [settings, setSettings] = useState(settingsCache);
  const [loading, setLoading] = useState(!settingsCache);
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for cache clear events
  useEffect(() => {
    const handleCacheClear = () => {
      settingsCache = null;
      settingsPromise = null;
      setRefreshKey(prev => prev + 1);
    };

    // Listen for custom event when cache is cleared
    window.addEventListener('settingsCacheCleared', handleCacheClear);
    return () => window.removeEventListener('settingsCacheCleared', handleCacheClear);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        // Add timestamp to bypass browser cache and ensure fresh data
        const response = await fetch("/api/settings?t=" + Date.now(), {
          cache: 'no-store', // Disable browser cache
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        const data = await response.json();
        if (data.success) {
          settingsCache = data.settings;
          setSettings(data.settings);
        } else if (settingsCache) {
          // Use cache if API fails
          setSettings(settingsCache);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        // Use cache if available on error
        if (settingsCache) {
          setSettings(settingsCache);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
    
    // Poll for settings updates every 30 seconds (for live site - users get updates without refresh)
    const interval = setInterval(() => {
      fetchSettings();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refreshKey]);

  return { settings, loading };
}

// Helper function to get settings without hook (for use in non-component code)
export async function getSettings() {
  if (settingsCache) {
    return settingsCache;
  }

  try {
    const response = await fetch("/api/settings");
    const data = await response.json();
    if (data.success) {
      settingsCache = data.settings;
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
    features: { // Default feature flags
      imageConverter: { socialPreset: false, advancedOptions: false },
      imageCompress: { webpFormat: false, targetFileSize: false, advancedOptions: false },
      imageToPdf: { advancedOptions: false },
      extractText: { proOCR: false, languageSelection: false, exportFormat: false },
      videoConvert: { webmFormat: false },
      videoCompress: { advancedOptions: false },
      videoTrim: { advancedOptions: false },
      docToPdf: { batchConversion: false, advancedOptions: false },
      pdfToDoc: { advancedOptions: false },
      mergePdf: { advancedOptions: false },
      compressPdf: { advancedOptions: false },
      scanner: { advancedOptions: false },
      audioConvert: { highQuality: false, advancedOptions: false },
      textToSpeech: { advancedOptions: false },
      speechToText: { longAudio: false, advancedOptions: false },
      qrBarcode: { customDesign: false, batchGeneration: false },
      urlShortener: { advancedOptions: false },
    },
  };
}

// Clear cache when settings are updated
export function clearSettingsCache() {
  settingsCache = null;
  settingsPromise = null;
  // Dispatch event to notify all components using useSettings
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('settingsCacheCleared'));
  }
}

