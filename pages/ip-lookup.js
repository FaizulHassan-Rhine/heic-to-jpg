"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { useAuth } from "@/lib/authContext";
import {
  Globe, Search, Loader2, MapPin, Server, Wifi, Shield
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function IpLookup() {
  const { user, trackUsage } = useAuth();
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const lookupIp = async () => {
    if (!ip.trim()) {
      toast.error("Please enter an IP address");
      return;
    }

    // Basic IP validation
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ip.trim())) {
      toast.error("Please enter a valid IP address");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/ip-lookup?ip=${encodeURIComponent(ip.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to lookup IP address");
      }

      setResult(data);
      toast.success("IP lookup completed!");
      
      if (user && trackUsage) {
        trackUsage("/ip-lookup", 1, 1, {
          tool: "IP Address Lookup",
        });
      }
    } catch (error) {
      console.error("IP lookup error:", error);
      toast.error(error.message || "Failed to lookup IP address");
    } finally {
      setLoading(false);
    }
  };

  const lookupMyIp = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/ip-lookup");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to lookup your IP address");
      }

      setIp(data.ip || "");
      setResult(data);
      toast.success("IP lookup completed!");
      
      if (user && trackUsage) {
        trackUsage("/ip-lookup", 1, 1, {
          tool: "IP Address Lookup",
        });
      }
    } catch (error) {
      console.error("IP lookup error:", error);
      toast.error(error.message || "Failed to lookup IP address");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="IP Address Lookup - Find IP Location & Information | ConvertMastery"
        description="Lookup IP address information including location, ISP, organization, and more. Free IP address lookup tool."
        keywords="IP lookup, IP address lookup, IP location, IP geolocation, IP information, find IP location"
        url="/ip-lookup"
      />
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium mb-4">
              <Globe className="w-3.5 h-3.5" />
              IP Address Information
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              IP Address Lookup
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Get detailed information about any IP address including location, ISP, organization, and more.
            </p>
          </div>

          {/* Input Section */}
          <Card className="border-2 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-green-600" />
                Enter IP Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && lookupIp()}
                  placeholder="Enter IP address (e.g., 8.8.8.8)"
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <Button
                  onClick={lookupIp}
                  disabled={loading}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </Button>
              </div>
              
              <Button
                onClick={lookupMyIp}
                disabled={loading}
                variant="outline"
                className="w-full border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                <Wifi className="w-4 h-4 mr-2" />
                Lookup My IP Address
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>IP Address Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Server className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">IP Address</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.ip || "N/A"}</p>
                  </div>

                  {result.country && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Country</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {result.country} {result.countryCode && `(${result.countryCode})`}
                      </p>
                    </div>
                  )}

                  {result.region && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Region</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.region}</p>
                    </div>
                  )}

                  {result.city && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">City</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.city}</p>
                    </div>
                  )}

                  {result.isp && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Wifi className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ISP</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.isp}</p>
                    </div>
                  )}

                  {result.org && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Organization</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.org}</p>
                    </div>
                  )}

                  {result.timezone && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Timezone</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.timezone}</p>
                    </div>
                  )}
                </div>

                {result.lat && result.lon && (
                  <>
                    <Separator />
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Coordinates</span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        Latitude: {result.lat}, Longitude: {result.lon}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <p className="font-medium">About IP Lookup</p>
                  <p>IP address lookup provides approximate location information based on IP geolocation databases. Results may not always be 100% accurate and are for informational purposes only.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}

