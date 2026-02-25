/**
 * Google Maps API helpers. Requires NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local
 * Enable: Maps JavaScript API, Geocoding API, Directions API in Google Cloud Console
 */

const getApiKey = () => typeof window !== "undefined" ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY : process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

let loadPromise = null;

export function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loadPromise) return loadPromise;
  const key = getApiKey();
  if (!key) return Promise.reject(new Error("Google Maps API key not set (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)"));
  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("google-maps-script");
    if (existing) {
      existing.onload = () => resolve(window.google?.maps);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google?.maps);
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return loadPromise;
}

/** Geocode address to { lat, lng, formatted } */
export function geocodeAddress(address) {
  return loadGoogleMaps().then((maps) => {
    if (!maps) throw new Error("Maps not loaded");
    const geocoder = new maps.Geocoder();
    return new Promise((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status !== "OK" || !results?.[0]) {
          const msg = status === "ZERO_RESULTS"
            ? "Address not found"
            : status === "REQUEST_DENIED"
              ? "Google Maps API request was denied. Enable the Geocoding API for your API key in Google Cloud Console and ensure billing is enabled."
              : (status || "Geocoding failed");
          reject(new Error(msg));
          return;
        }
        const loc = results[0].geometry.location;
        resolve({
          lat: loc.lat(),
          lng: loc.lng(),
          formatted: results[0].formatted_address,
        });
      });
    });
  });
}

/** Get driving distance/duration between two points (lat,lng or address strings) */
export function getDirections(origin, dest, mode = "DRIVING") {
  return loadGoogleMaps().then((maps) => {
    if (!maps) throw new Error("Maps not loaded");
    const service = new maps.DistanceMatrixService();
    const isLatLng = (v) => typeof v === "object" && typeof v.lat === "number" && typeof v.lng === "number";
    const o = isLatLng(origin) ? { lat: origin.lat, lng: origin.lng } : origin;
    const d = isLatLng(dest) ? { lat: dest.lat, lng: dest.lng } : dest;
    return new Promise((resolve, reject) => {
      service.getDistanceMatrix(
        {
          origins: [o],
          destinations: [d],
          travelMode: maps.TravelMode[mode] || maps.TravelMode.DRIVING,
          unitSystem: maps.UnitSystem.METRIC,
        },
        (response, status) => {
          if (status !== "OK") {
            const msg = status === "REQUEST_DENIED"
              ? "Google Maps API request was denied. Enable the Distance Matrix API for your API key in Google Cloud Console and ensure billing is enabled."
              : (status || "Directions failed");
            reject(new Error(msg));
            return;
          }
          const el = response.rows[0]?.elements[0];
          if (!el || el.status !== "OK") {
            reject(new Error("Route not found"));
            return;
          }
          resolve({
            distanceText: el.distance.text,
            distanceMeters: el.distance.value,
            durationText: el.duration.text,
            durationSeconds: el.duration.value,
          });
        }
      );
    });
  });
}

/** Haversine distance in km between two lat/lng points */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function kmToMiles(km) {
  return km * 0.621371;
}

/** Get user's current position. Returns { lat, lng } or null if denied/unavailable. */
export function getCurrentPosition() {
  if (typeof window === "undefined" || !navigator?.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

/** Reverse geocode lat/lng to formatted address */
export function reverseGeocode(lat, lng) {
  return loadGoogleMaps().then((maps) => {
    if (!maps) throw new Error("Maps not loaded");
    const geocoder = new maps.Geocoder();
    return new Promise((resolve, reject) => {
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status !== "OK" || !results?.[0]) {
          reject(new Error("Address not found"));
          return;
        }
        resolve({ formatted: results[0].formatted_address });
      });
    });
  });
}
