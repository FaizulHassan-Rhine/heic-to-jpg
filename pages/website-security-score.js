"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { useAuth } from "@/lib/authContext";
import {
  Shield, Search, Loader2, CheckCircle, XCircle, AlertTriangle, Globe, Lock, Server
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function WebsiteSecurityScore() {
  const { user, trackUsage } = useAuth();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const checkSecurity = async () => {
    if (!url.trim()) {
      toast.error("Please enter a website URL");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/website-security-score?url=${encodeURIComponent(url.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check website security");
      }

      setResult(data);
      toast.success("Security analysis completed!");
      
      if (user && trackUsage) {
        trackUsage("/website-security-score", 1, 1, {
          tool: "Website Security Score",
        });
      }
    } catch (error) {
      console.error("Security check error:", error);
      toast.error(error.message || "Failed to check website security");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 71) return "text-green-600";
    if (score >= 41) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score) => {
    if (score >= 71) return "bg-green-100 dark:bg-green-900/20";
    if (score >= 41) return "bg-yellow-100 dark:bg-yellow-900/20";
    return "bg-red-100 dark:bg-red-900/20";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Website Security Score - Analyze Website Security | ConvertMastery"
        description="Analyze website security configuration, SSL/TLS, security headers, and get a comprehensive security score. Free website security checker."
        keywords="website security, security score, SSL checker, security headers, website security analysis, HTTPS checker"
        url="/website-security-score"
      />
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium mb-4">
              <Shield className="w-3.5 h-3.5" />
              Security Analysis • Free Tool
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Website Security Score
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Analyze your website's security configuration, SSL/TLS setup, security headers, and get a comprehensive security score.
            </p>
          </div>

          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-600" />
                Enter Website URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  onKeyPress={(e) => e.key === "Enter" && !loading && checkSecurity()}
                />
                <Button
                  onClick={checkSecurity}
                  disabled={loading}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Analyze
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
              <Card className={cn("border-2", getScoreBgColor(result.score))}>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="text-6xl font-bold" style={{ color: getScoreColor(result.score).replace("text-", "") }}>
                      {result.score}
                      <span className="text-3xl">/100</span>
                    </div>
                    <Badge
                      className={cn(
                        "text-lg px-4 py-2",
                        result.score >= 71 ? "bg-green-600" : result.score >= 41 ? "bg-yellow-600" : "bg-red-600"
                      )}
                    >
                      {result.riskLevel}
                    </Badge>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Domain: <span className="font-mono font-medium">{result.domain}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Security Checks */}
              <Card>
                <CardHeader>
                  <CardTitle>Security Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Checks */}
                  {result.checks.basic && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Basic Checks
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">HTTPS Enabled</span>
                          {result.checks.basic.hasHttps ? (
                            <Badge className="bg-green-600">Yes</Badge>
                          ) : (
                            <Badge variant="destructive">No</Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">HTTP to HTTPS Redirect</span>
                          {result.checks.basic.redirectsToHttps ? (
                            <Badge className="bg-green-600">Yes</Badge>
                          ) : (
                            <Badge variant="destructive">No</Badge>
                          )}
                        </div>
                        {result.checks.basic.responseTime && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Response Time</span>
                            <Badge>{result.checks.basic.responseTime}ms</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* SSL/TLS */}
                  {result.checks.ssl && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        SSL/TLS Analysis
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">SSL Certificate</span>
                          {result.checks.ssl.hasSsl ? (
                            <Badge className="bg-green-600">Valid</Badge>
                          ) : (
                            <Badge variant="destructive">Invalid/Missing</Badge>
                          )}
                        </div>
                        {result.checks.ssl.tlsVersion && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm">TLS Version</span>
                            <Badge>{result.checks.ssl.tlsVersion}</Badge>
                          </div>
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
                          const headerName = key
                            .replace(/([A-Z])/g, " $1")
                            .replace(/^./, (str) => str.toUpperCase());
                          return (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-sm">{headerName}</span>
                              {value === "Present" ? (
                                <Badge className="bg-green-600">Present</Badge>
                              ) : (
                                <Badge variant="destructive">Missing</Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Domain Info */}
                  {result.checks.domainInfo && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Server className="w-4 h-4" />
                        Domain Information
                      </h3>
                      <div className="space-y-2">
                        {result.checks.domainInfo.ipAddress && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm">IP Address</span>
                            <Badge className="font-mono">{result.checks.domainInfo.ipAddress}</Badge>
                          </div>
                        )}
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
      </main>

      <Footer />
    </div>
  );
}

