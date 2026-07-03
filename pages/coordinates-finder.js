import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { loadGoogleMaps, geocodeAddress, getCurrentPosition, reverseGeocode } from "../lib/googleMaps";
import PlaceAutocompleteInput from "../components/PlaceAutocompleteInput";
import { MapPin, Loader2, Copy, Check, Locate } from "lucide-react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function CoordinatesFinderPage() {
  const [search, setSearch] = useState("");
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await geocodeAddress(search.trim());
      setCoords({ lat: res.lat, lng: res.lng, formatted: res.formatted });
    } catch (e) {
      setError(e.message || "Address not found.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!API_KEY || !mapRef.current) return;
    let cancelled = false;
    const center = coords ? { lat: coords.lat, lng: coords.lng } : { lat: 20, lng: 0 };
    const zoom = coords ? 15 : 2;
    loadGoogleMaps().then((maps) => {
      if (!maps || cancelled) return;
      const map = new maps.Map(mapRef.current, { center, zoom });
      let marker = null;
      if (coords) {
        marker = new maps.Marker({
          position: center,
          map,
          title: coords.formatted,
        });
        markerRef.current = marker;
      } else {
        getCurrentPosition().then((pos) => {
          if (cancelled || !pos) return;
          map.setCenter(pos);
          map.setZoom(12);
          new maps.Marker({ position: pos, map, title: "You are here" });
        });
      }
      map.addListener("click", (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setCoords({ lat, lng, formatted: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
      });
      return () => {
        if (marker) marker.setMap(null);
        markerRef.current = null;
      };
    });
    return () => {
      cancelled = true;
    };
  }, [coords]);

  const useMyLocation = () => {
    getCurrentPosition().then((pos) => {
      if (!pos) return;
      reverseGeocode(pos.lat, pos.lng)
        .then((r) => {
          setSearch(r.formatted);
          setCoords({ lat: pos.lat, lng: pos.lng, formatted: r.formatted });
        })
        .catch(() => setCoords({ lat: pos.lat, lng: pos.lng, formatted: `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}` }));
    });
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <MapPin className="h-8 w-8 text-primary" />
          Coordinates Finder
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Search an address to get its coordinates, or click on the map to get the lat/lng of any point.
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search address</CardTitle>
            <CardDescription>Get coordinates for an address or place name</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <PlaceAutocompleteInput
                value={search}
                onChange={setSearch}
                onPlaceSelect={({ formatted, lat, lng }) => {
                  setSearch(formatted);
                  setCoords({ lat, lng, formatted });
                }}
                placeholder="Address or place"
                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                Find
              </Button>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {coords && (
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-sm font-medium">Latitude: {coords.lat.toFixed(6)}</p>
                <p className="text-sm font-medium">Longitude: {coords.lng.toFixed(6)}</p>
                <p className="text-xs text-slate-500 break-all">{coords.formatted}</p>
                <Button variant="outline" size="sm" onClick={() => copyText(`${coords.lat}, ${coords.lng}`)} className="gap-2">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy lat, lng"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Map</CardTitle>
            <CardDescription>Click the map to get coordinates, or search an address above.</CardDescription>
            <Button type="button" variant="outline" size="sm" onClick={useMyLocation} className="mt-2 gap-1.5">
              <Locate className="h-4 w-4" />
              Use my location
            </Button>
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
