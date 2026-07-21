"use client";

import { useState } from "react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
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
    <ToolPageShell containerClassName="max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <ToolPageHeader
            title="IP Address Lookup"
            description="Get detailed information about any IP address including location, ISP, organization, and more."
            badge="IP Address Information"
          />

          {/* Input Section */}
          <Card className="border border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
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
                  className="flex-1 px-4 py-3 bg-muted/40 dark:bg-muted border border-border dark:border-border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button
                  onClick={lookupIp}
                  disabled={loading}
                  className="bg-gradient-to-r from-primary to-brand-navy hover:from-brand-navy hover:to-brand-navy"
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
                className="w-full border-brand-mid/40 dark:border-brand-mid text-brand-navy dark:text-brand-mid hover:bg-brand-sky/50 dark:hover:bg-brand-sky/20"
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
                  <div className="p-4 bg-muted/40 dark:bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Server className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">IP Address</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground dark:text-foreground">{result.ip || "N/A"}</p>
                  </div>

                  {result.country && (
                    <div className="p-4 bg-muted/40 dark:bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Country</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground dark:text-foreground">
                        {result.country} {result.countryCode && `(${result.countryCode})`}
                      </p>
                    </div>
                  )}

                  {result.region && (
                    <div className="p-4 bg-muted/40 dark:bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Region</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground dark:text-foreground">{result.region}</p>
                    </div>
                  )}

                  {result.city && (
                    <div className="p-4 bg-muted/40 dark:bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">City</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground dark:text-foreground">{result.city}</p>
                    </div>
                  )}

                  {result.isp && (
                    <div className="p-4 bg-muted/40 dark:bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Wifi className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">ISP</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground dark:text-foreground">{result.isp}</p>
                    </div>
                  )}

                  {result.org && (
                    <div className="p-4 bg-muted/40 dark:bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Organization</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground dark:text-foreground">{result.org}</p>
                    </div>
                  )}

                  {result.timezone && (
                    <div className="p-4 bg-muted/40 dark:bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Timezone</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground dark:text-foreground">{result.timezone}</p>
                    </div>
                  )}
                </div>

                {result.lat && result.lon && (
                  <>
                    <Separator />
                    <div className="p-4 bg-muted/40 dark:bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Coordinates</span>
                      </div>
                      <p className="text-sm text-foreground dark:text-foreground">
                        Latitude: {result.lat}, Longitude: {result.lon}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card className="bg-brand-sky/50 dark:bg-primary/10 border-brand-mid/30 dark:border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div className="space-y-1 text-sm text-foreground dark:text-muted-foreground">
                  <p className="font-medium">About IP Lookup</p>
                  <p>IP address lookup provides approximate location information based on IP geolocation databases. Results may not always be 100% accurate and are for informational purposes only.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </ToolPageShell>
  );
}

