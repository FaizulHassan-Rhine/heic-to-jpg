"use client";

import { useState } from "react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import { useAuth } from "@/lib/authContext";
import {
  Server, Search, Loader2, Shield, AlertTriangle, CheckCircle, Globe, Lock
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function ApiStatusChecker() {
  const { user, trackUsage } = useAuth();
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("GET");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const checkApi = async () => {
    if (!url.trim()) {
      toast.error("Please enter an API URL");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/api-status-checker?url=${encodeURIComponent(url.trim())}&method=${method}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check API status");
      }

      setResult(data);
      toast.success("API status check completed!");
      
      if (user && trackUsage) {
        trackUsage("/api-status-checker", 1, 1, {
          tool: "API Status Checker",
        });
      }
    } catch (error) {
      console.error("API check error:", error);
      toast.error(error.message || "Failed to check API status");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return "text-primary";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score) => {
    if (score >= 70) return "bg-brand-sky dark:bg-primary/10";
    if (score >= 40) return "bg-yellow-100 dark:bg-yellow-900/20";
    return "bg-red-100 dark:bg-red-900/20";
  };

  return (
    <ToolPageShell containerClassName="max-w-5xl">
        <div className="space-y-6">
          {/* Header */}
          <ToolPageHeader
            title="API Status Checker"
            description="Analyze API endpoint health, performance, and security configuration."
            badge="API Analysis • Free Tool"
          />

          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                Enter API URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="px-4 py-3 bg-muted/40 dark:bg-muted border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                  className="flex-1 px-4 py-3 bg-muted/40 dark:bg-muted border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  onKeyPress={(e) => e.key === "Enter" && !loading && checkApi()}
                />
                <Button
                  onClick={checkApi}
                  disabled={loading}
                  className="bg-gradient-to-r from-primary to-brand-navy hover:from-brand-navy hover:to-brand-navy"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Check
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <>
              {/* Score Card */}
              <Card className={cn("border-2", getScoreBgColor(result.healthScore))}>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="text-6xl font-bold" style={{ color: getScoreColor(result.healthScore).replace("text-", "") }}>
                      {result.healthScore}
                      <span className="text-3xl">/100</span>
                    </div>
                    <Badge
                      className={cn(
                        "text-lg px-4 py-2",
                        result.healthScore >= 70 ? "bg-primary" : result.healthScore >= 40 ? "bg-yellow-600" : "bg-red-600"
                      )}
                    >
                      {result.status}
                    </Badge>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                      API: <span className="font-mono font-medium">{result.url}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Analysis Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Connectivity */}
                  {result.checks.connectivity && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Connectivity
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Reachable</span>
                          {result.checks.connectivity.reachable ? (
                            <Badge className="bg-primary">Yes</Badge>
                          ) : (
                            <Badge variant="destructive">No</Badge>
                          )}
                        </div>
                        {result.checks.connectivity.statusCode && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Status Code</span>
                            <Badge>{result.checks.connectivity.statusCode}</Badge>
                          </div>
                        )}
                        {result.checks.connectivity.responseTime && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Response Time</span>
                            <Badge>{result.checks.connectivity.responseTime}ms</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* SSL */}
                  {result.checks.ssl && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        SSL/TLS
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">SSL Enabled</span>
                        {result.checks.ssl.hasSsl ? (
                          <Badge className="bg-primary">Yes</Badge>
                        ) : (
                          <Badge variant="destructive">No</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Security Headers */}
                  {result.checks.securityHeaders && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Security Headers
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(result.checks.securityHeaders).map(([key, value]) => {
                          if (key === "error") return null;
                          const headerName = key.toUpperCase();
                          return (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-sm">{headerName}</span>
                              {value === "Present" ? (
                                <Badge className="bg-primary">Present</Badge>
                              ) : (
                                <Badge variant="destructive">Missing</Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {result.recommendations && result.recommendations.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          Recommendations
                        </h3>
                        <ul className="space-y-2">
                          {result.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <span className="text-yellow-600 mt-0.5">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
    </ToolPageShell>
  );
}

