import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { loadGoogleMaps, geocodeAddress, getCurrentPosition, reverseGeocode } from "../lib/googleMaps";
import PlaceAutocompleteInput from "../components/PlaceAutocompleteInput";
import { MapPin, Loader2, Locate } from "lucide-react";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function RadiusMapPage() {
  const [centerInput, setCenterInput] = useState("");
  const [radiusKm, setRadiusKm] = useState(10);
  const [center, setCenter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const userMarkerRef = useRef(null);

  const applyCenter = async () => {
    if (!centerInput.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await geocodeAddress(centerInput.trim());
      setCenter({ lat: res.lat, lng: res.lng, formatted: res.formatted });
    } catch (e) {
      setError(e.message || "Address not found.");
    } finally {
      setLoading(false);
    }
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
      circleRef.current = null;
      userMarkerRef.current = null;
      mapInstance.current = null;
    };
  }, []);

  const useMyLocation = () => {
    getCurrentPosition().then((pos) => {
      if (!pos) return;
      reverseGeocode(pos.lat, pos.lng)
        .then((r) => {
          setCenterInput(r.formatted);
          setCenter({ lat: pos.lat, lng: pos.lng, formatted: r.formatted });
        })
        .catch(() => {});
    });
  };

  // When center/radius change, show marker and circle
  useEffect(() => {
    if (!mapInstance.current || !window.google?.maps) return;
    const maps = window.google.maps;
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
    if (!center) return;
    mapInstance.current.setCenter(center);
    mapInstance.current.setZoom(11);
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    markerRef.current = new maps.Marker({ position: center, map: mapInstance.current, title: "Center" });
    const circle = new maps.Circle({
      strokeColor: "#3b82f6",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#3b82f6",
      fillOpacity: 0.15,
      map: mapInstance.current,
      center: { lat: center.lat, lng: center.lng },
      radius: radiusKm * 1000,
    });
    circleRef.current = circle;
    const bounds = circle.getBounds();
    if (bounds) mapInstance.current.fitBounds(bounds, 30);
  }, [center, radiusKm]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Radius Map Tool - Draw a Radius on the Map"
        description="Enter a location and radius to draw a circle on the map. See the area within a distance in km or miles."
        keywords="radius map, map radius tool, draw radius on map, distance radius"
        url="/radius-map"
      />
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <MapPin className="h-8 w-8 text-primary" />
          Radius Map Tool
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Enter a center address and radius to draw a circle on the map. Useful for delivery zones, coverage areas, or proximity search.
        </p>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Center & Radius</CardTitle>
            <CardDescription>Address and radius in kilometers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Center location</label>
              <div className="flex gap-2">
                <PlaceAutocompleteInput
                  value={centerInput}
                  onChange={setCenterInput}
                  onPlaceSelect={({ formatted, lat, lng }) => {
                    setCenterInput(formatted);
                    setCenter({ lat, lng, formatted });
                  }}
                  placeholder="Address or place"
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                  onKeyDown={(e) => e.key === "Enter" && applyCenter()}
                />
                <Button onClick={applyCenter} disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  Apply
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Radius (km)</label>
              <input
                type="number"
                min={0.5}
                max={500}
                step={0.5}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value) || 10)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
              />
              <p className="text-xs text-slate-500 mt-1">≈ {(radiusKm * 0.621371).toFixed(1)} miles</p>
            </div>
            {center && <p className="text-sm text-slate-600 dark:text-slate-400">Center: {center.formatted}</p>}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Map</CardTitle>
            <CardDescription>
              {center ? "Center and radius are shown. Change the address or radius above to update." : "Enter a center address and radius above to draw the circle on the map."}
            </CardDescription>
            <Button type="button" variant="outline" size="sm" onClick={useMyLocation} className="mt-2 gap-1.5">
              <Locate className="h-4 w-4" />
              Use my location
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div ref={mapRef} className="w-full h-[450px] rounded-b-lg" />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
