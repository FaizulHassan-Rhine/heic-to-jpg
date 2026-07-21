import { useState, useEffect, useRef } from "react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { loadGoogleMaps, geocodeAddress, getCurrentPosition, reverseGeocode } from "../lib/googleMaps";
import PlaceAutocompleteInput from "../components/PlaceAutocompleteInput";
import { MapPin, Loader2, Copy, Check, Locate } from "lucide-react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function AddressToLatLongPage() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const userMarkerRef = useRef(null);

  const handleConvert = async () => {
    if (!address.trim()) return;
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await geocodeAddress(address.trim());
      setResult(res);
    } catch (e) {
      setError(e.message || "Address not found.");
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      markerRef.current = null;
      userMarkerRef.current = null;
      mapInstance.current = null;
    };
  }, []);

  const useMyLocation = () => {
    getCurrentPosition().then((pos) => {
      if (!pos) return;
      reverseGeocode(pos.lat, pos.lng)
        .then((r) => {
          setAddress(r.formatted);
          setResult({ ...r, lat: pos.lat, lng: pos.lng });
        })
        .catch(() => {});
    });
  };

  // When result is set, show marker and pan to location
  useEffect(() => {
    if (!mapInstance.current || !result || !window.google?.maps) return;
    const maps = window.google.maps;
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    const pos = { lat: result.lat, lng: result.lng };
    mapInstance.current.setCenter(pos);
    mapInstance.current.setZoom(14);
    markerRef.current = new maps.Marker({ position: pos, map: mapInstance.current, title: result.formatted });
  }, [result]);

  return (
    <ToolPageShell containerClassName="max-w-4xl">
        <ToolPageHeader
          title="Address → Lat Long Converter"
          description="Enter an address or place name to get its latitude and longitude. Copy the coordinates in various formats."
        />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Address</CardTitle>
            <CardDescription>Street, city, country or place name</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <PlaceAutocompleteInput
                value={address}
                onChange={setAddress}
                onPlaceSelect={({ formatted, lat, lng }) => {
                  setAddress(formatted);
                  setResult({ formatted, lat, lng });
                }}
                placeholder="e.g. 1600 Amphitheatre Parkway, Mountain View, CA"
                className="flex-1 px-3 py-2 border border-border dark:border-border rounded-lg bg-card dark:bg-card"
                onKeyDown={(e) => e.key === "Enter" && handleConvert()}
              />
              <Button onClick={handleConvert} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                Convert
              </Button>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Coordinates</CardTitle>
              <CardDescription>{result.formatted}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-3 bg-muted/40 dark:bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Latitude</p>
                  <p className="font-mono font-semibold">{result.lat}</p>
                  <Button variant="ghost" size="sm" className="mt-2 gap-1" onClick={() => copyText(String(result.lat))}>
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </Button>
                </div>
                <div className="p-3 bg-muted/40 dark:bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Longitude</p>
                  <p className="font-mono font-semibold">{result.lng}</p>
                  <Button variant="ghost" size="sm" className="mt-2 gap-1" onClick={() => copyText(String(result.lng))}>
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    Copy
                  </Button>
                </div>
              </div>
              <div className="p-3 bg-muted/40 dark:bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">lat, lng (comma-separated)</p>
                <p className="font-mono text-sm break-all">{result.lat}, {result.lng}</p>
                <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={() => copyText(`${result.lat}, ${result.lng}`)}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="p-3 bg-muted/40 dark:bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Google Maps link</p>
                <p className="font-mono text-xs break-all text-primary">
                  https://www.google.com/maps?q={result.lat},{result.lng}
                </p>
                <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={() => copyText(`https://www.google.com/maps?q=${result.lat},${result.lng}`)}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  Copy link
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Map</CardTitle>
            <CardDescription>
              {result ? "Location is marked on the map. Enter an address above to convert to coordinates." : "Enter an address above to see the location on the map and get coordinates."}
            </CardDescription>
            <Button type="button" variant="outline" size="sm" onClick={useMyLocation} className="mt-2 gap-1.5">
              <Locate className="h-4 w-4" />
              Use my location
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div ref={mapRef} className="w-full h-[400px] rounded-b-lg" />
          </CardContent>
        </Card>
    </ToolPageShell>
  );
}
