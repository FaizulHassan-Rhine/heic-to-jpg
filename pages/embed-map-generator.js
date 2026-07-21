import { useState, useEffect, useRef } from "react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { loadGoogleMaps, geocodeAddress, getCurrentPosition } from "../lib/googleMaps";
import PlaceAutocompleteInput from "../components/PlaceAutocompleteInput";
import { MapPin, Loader2, Copy, Check, Locate } from "lucide-react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function EmbedMapGeneratorPage() {
  const [input, setInput] = useState("");
  const [zoom, setZoom] = useState(14);
  const [width, setWidth] = useState(600);
  const [height, setHeight] = useState(450);
  const [embedUrl, setEmbedUrl] = useState("");
  const [iframeCode, setIframeCode] = useState("");
  const [lastQ, setLastQ] = useState(""); // resolved "lat,lng" for current map
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const userMarkerRef = useRef(null);

  const isLatLng = (s) => /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(s?.trim());

  const buildEmbed = (q, z, w, h) => {
    const enc = encodeURIComponent(q);
    const url = `https://www.google.com/maps?q=${enc}&z=${z}&output=embed`;
    return { url, code: `<iframe width="${w}" height="${h}" frameborder="0" style="border:0" allowfullscreen referrerpolicy="no-referrer-when-downgrade" src="${url}"></iframe>` };
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setError("");
    setEmbedUrl("");
    setIframeCode("");
    setLastQ("");
    setLoading(true);
    try {
      let q;
      if (isLatLng(input.trim())) {
        const [lat, lng] = input.trim().split(/\s*,\s*/).map(Number);
        q = `${lat},${lng}`;
      } else {
        const res = await geocodeAddress(input.trim());
        q = `${res.lat},${res.lng}`;
      }
      setLastQ(q);
      const { url, code } = buildEmbed(q, zoom, width, height);
      setEmbedUrl(url);
      setIframeCode(code);
    } catch (e) {
      setError(e.message || "Could not resolve location.");
    } finally {
      setLoading(false);
    }
  };

  const updateEmbedFromOptions = () => {
    if (!lastQ) return;
    const { url, code } = buildEmbed(lastQ, zoom, width, height);
    setEmbedUrl(url);
    setIframeCode(code);
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
      map.addListener("click", (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      });
      mapInstance.current = map;
      getCurrentPosition().then((pos) => {
        if (cancelled || !pos || !mapInstance.current) return;
        mapInstance.current.setCenter(pos);
        mapInstance.current.setZoom(14);
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
      const q = `${pos.lat},${pos.lng}`;
      setInput(`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
      setLastQ(q);
      const { url, code } = buildEmbed(q, zoom, width, height);
      setEmbedUrl(url);
      setIframeCode(code);
    });
  };

  // When lastQ (location) is set, show marker on map
  useEffect(() => {
    if (!mapInstance.current || !lastQ || !window.google?.maps) return;
    const maps = window.google.maps;
    const parts = lastQ.split(/\s*,\s*/).map(Number);
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return;
    const pos = { lat: parts[0], lng: parts[1] };
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    mapInstance.current.setCenter(pos);
    mapInstance.current.setZoom(zoom);
    markerRef.current = new maps.Marker({ position: pos, map: mapInstance.current, title: "Selected location" });
  }, [lastQ, zoom]);

  const copyCode = () => {
    navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolPageShell containerClassName="max-w-4xl">
        <ToolPageHeader
          title="Embed Map Generator"
          description="Enter an address or coordinates (lat, lng) to generate an iframe embed code for Google Maps. Paste the code into your website or blog."
        />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Location & options</CardTitle>
            <CardDescription>Address or coordinates (e.g. 40.7128, -74.0060)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <PlaceAutocompleteInput
                value={input}
                onChange={setInput}
                onPlaceSelect={({ formatted, lat, lng }) => {
                  setInput(formatted);
                  const q = `${lat},${lng}`;
                  setLastQ(q);
                  const { url, code } = buildEmbed(q, zoom, width, height);
                  setEmbedUrl(url);
                  setIframeCode(code);
                }}
                placeholder="Address or lat, lng"
                className="flex-1 px-3 py-2 border border-border dark:border-border rounded-lg bg-card dark:bg-card"
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
              <Button onClick={handleGenerate} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                Generate
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Zoom (1–21)</label>
                <input
                  type="number"
                  min={1}
                  max={21}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value) || 14)}
                  className="w-full px-3 py-2 border border-border dark:border-border rounded-lg bg-card dark:bg-card"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Width (px)</label>
                <input
                  type="number"
                  min={100}
                  max={1200}
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value) || 600)}
                  className="w-full px-3 py-2 border border-border dark:border-border rounded-lg bg-card dark:bg-card"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Height (px)</label>
                <input
                  type="number"
                  min={100}
                  max={800}
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value) || 450)}
                  className="w-full px-3 py-2 border border-border dark:border-border rounded-lg bg-card dark:bg-card"
                />
              </div>
            </div>
            {embedUrl && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Changed zoom or size? Update the embed code below.</p>
                <Button variant="outline" size="sm" onClick={updateEmbedFromOptions}>Update embed code</Button>
              </div>
            )}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Map</CardTitle>
            <CardDescription>
              {lastQ ? "Selected location is marked. Click the map to set a new location, or enter an address above." : "Enter an address or coordinates above and click Generate, or click on the map to set a location."}
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

        {iframeCode && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>How the embedded map will look</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden rounded-b-lg bg-muted dark:bg-muted">
                  <iframe
                    title="Embed preview"
                    width={width}
                    height={height}
                    style={{ border: 0, maxWidth: "100%" }}
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={embedUrl}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Embed code</CardTitle>
                <CardDescription>Copy and paste this into your HTML</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <pre className="p-4 bg-brand-navy text-brand-sky text-xs overflow-x-auto rounded-lg whitespace-pre-wrap break-all">
                  {iframeCode}
                </pre>
                <Button onClick={copyCode} className="gap-2">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy code"}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
    </ToolPageShell>
  );
}
