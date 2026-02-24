import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { loadGoogleMaps, geocodeAddress, getDirections, haversineKm, kmToMiles, getCurrentPosition, reverseGeocode } from "../lib/googleMaps";
import PlaceAutocompleteInput from "../components/PlaceAutocompleteInput";
import { MapPin, Navigation, Loader2, Locate } from "lucide-react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function DistanceCalculatorPage() {
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [mode, setMode] = useState("DRIVING"); // DRIVING, WALKING
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [straightLine, setStraightLine] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);

  // Init map on load and center on user location when available
  useEffect(() => {
    if (!API_KEY || !mapRef.current) return;
    let cancelled = false;
    loadGoogleMaps().then((maps) => {
      if (!maps || cancelled) return;
      const map = new maps.Map(mapRef.current, {
        center: { lat: 20, lng: 0 },
        zoom: 2,
      });
      mapInstance.current = map;
      getCurrentPosition().then((pos) => {
        if (cancelled || !pos || !mapInstance.current) return;
        mapInstance.current.setCenter(pos);
        mapInstance.current.setZoom(12);
        if (userMarkerRef.current) userMarkerRef.current.setMap(null);
        userMarkerRef.current = new maps.Marker({
          position: pos,
          map: mapInstance.current,
          title: "You are here",
        });
      });
    });
    return () => {
      cancelled = true;
      markersRef.current = [];
      userMarkerRef.current = null;
      mapInstance.current = null;
    };
  }, []);

  const goToMyLocation = () => {
    getCurrentPosition().then((pos) => {
      if (!pos || !mapInstance.current) return;
      const maps = window.google?.maps;
      if (!maps) return;
      mapInstance.current.setCenter(pos);
      mapInstance.current.setZoom(12);
      if (userMarkerRef.current) userMarkerRef.current.setMap(null);
      userMarkerRef.current = new maps.Marker({
        position: pos,
        map: mapInstance.current,
        title: "You are here",
      });
    });
  };

  const setOriginToMyLocation = () => {
    getCurrentPosition().then((pos) => {
      if (!pos) return;
      reverseGeocode(pos.lat, pos.lng).then((r) => setOrigin(r.formatted)).catch(() => {});
    });
  };

  const setDestToMyLocation = () => {
    getCurrentPosition().then((pos) => {
      if (!pos) return;
      reverseGeocode(pos.lat, pos.lng).then((r) => setDest(r.formatted)).catch(() => {});
    });
  };

  // When result is set, show origin/destination markers and fit bounds
  useEffect(() => {
    if (!mapInstance.current || !result?.originLat) return;
    const maps = window.google?.maps;
    if (!maps) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    const m1 = new maps.Marker({ position: { lat: result.originLat, lng: result.originLng }, map: mapInstance.current, title: "Origin" });
    const m2 = new maps.Marker({ position: { lat: result.destLat, lng: result.destLng }, map: mapInstance.current, title: "Destination" });
    markersRef.current = [m1, m2];
    const bounds = new maps.LatLngBounds();
    bounds.extend({ lat: result.originLat, lng: result.originLng });
    bounds.extend({ lat: result.destLat, lng: result.destLng });
    mapInstance.current.fitBounds(bounds, 40);
  }, [result]);

  const handleCalculate = async () => {
    setError("");
    setResult(null);
    if (!origin.trim() || !dest.trim()) {
      setError("Enter both origin and destination.");
      return;
    }
    setLoading(true);
    try {
      const [o, d] = await Promise.all([geocodeAddress(origin.trim()), geocodeAddress(dest.trim())]);
      const straightKm = haversineKm(o.lat, o.lng, d.lat, d.lng);
      setStraightLine({ km: straightKm, miles: kmToMiles(straightKm) });
      const dir = await getDirections(origin.trim(), dest.trim(), mode);
      setResult({
        ...dir,
        originLat: o.lat,
        originLng: o.lng,
        destLat: d.lat,
        destLng: d.lng,
        originFormatted: o.formatted,
        destFormatted: d.formatted,
      });
    } catch (e) {
      setError(e.message || "Failed to calculate distance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Distance Calculator - Measure Distance Between Two Places"
        description="Calculate driving or walking distance and duration between two addresses. Uses Google Maps for accurate routes."
        keywords="distance calculator, driving distance, map distance, two points distance"
        url="/distance-calculator"
      />
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <MapPin className="h-8 w-8 text-primary" />
          Distance Calculator
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Enter two addresses to get driving or walking distance and duration. Straight-line distance is also shown.
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>From & To</CardTitle>
            <CardDescription>Addresses or place names</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Origin</label>
              <PlaceAutocompleteInput
                value={origin}
                onChange={setOrigin}
                placeholder="Address or place (e.g. Dhaka)"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Destination</label>
              <PlaceAutocompleteInput
                value={dest}
                onChange={setDest}
                placeholder="Address or place"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Mode:</span>
              {["DRIVING", "WALKING"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${mode === m ? "bg-primary text-primary-foreground border-primary" : "border-slate-300 dark:border-slate-600"}`}
                >
                  {m === "DRIVING" ? "Driving" : "Walking"}
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button onClick={handleCalculate} disabled={loading} className="w-full sm:w-auto gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              Calculate Distance
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Result</CardTitle>
              <CardDescription>{result.originFormatted} → {result.destFormatted}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-lg font-semibold text-primary">
                {mode === "DRIVING" ? "Driving" : "Walking"}: {result.distanceText} · {result.durationText}
              </p>
              {straightLine && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Straight line: {straightLine.km.toFixed(2)} km ({straightLine.miles.toFixed(2)} miles)
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Map</CardTitle>
            <CardDescription>
              {result ? "Origin and destination are marked. Enter addresses above and click Calculate to see the route." : "Enter origin and destination above, then click Calculate to see locations on the map."}
            </CardDescription>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button type="button" variant="outline" size="sm" onClick={goToMyLocation} className="gap-1.5">
                <Locate className="h-4 w-4" />
                My location
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={setOriginToMyLocation} className="gap-1.5">
                Set as origin
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={setDestToMyLocation} className="gap-1.5">
                Set as destination
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div ref={mapRef} className="w-full h-[400px] rounded-b-lg" />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
