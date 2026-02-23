"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { useAuth } from "@/lib/authContext";
import AuthModal from "../components/AuthModal";
import {
  Globe, Search, Loader2, Calendar, Shield, Server, User
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function WhoisChecker() {
  const { user, trackUsage } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const checkWhois = async () => {
    if (!user) {
      toast.error("Please sign in to use Whois Checker");
      setAuthModalMode("login");
      setAuthModalOpen(true);
      return;
    }

    if (!domain.trim()) {
      toast.error("Please enter a domain name");
      return;
    }

    // Basic domain validation
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    const cleanDomain = domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    
    if (!domainRegex.test(cleanDomain)) {
      toast.error("Please enter a valid domain name (e.g., example.com)");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/whois-checker?domain=${encodeURIComponent(cleanDomain)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check domain");
      }

      setResult(data);
      toast.success("Whois lookup completed!");
      
      if (user && trackUsage) {
        trackUsage("/whois-checker", 1, 1, {
          tool: "Whois Checker",
        });
      }
    } catch (error) {
      console.error("Whois check error:", error);
      toast.error(error.message || "Failed to check domain");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Whois Checker - Domain Information Lookup | ConvertMastery"
        description="Check domain registration information, registrar details, expiration dates, and more. Free Whois domain lookup tool."
        keywords="whois checker, domain lookup, domain information, whois lookup, domain registrar, domain expiration"
        url="/whois-checker"
      />
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium mb-4">
              <Globe className="w-3.5 h-3.5" />
              Domain Information Lookup
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Whois Checker
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Get detailed domain registration information including registrar, creation date, expiration date, and more.
            </p>
          </div>

          {/* Input Section */}
          <Card className="border-2 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-green-600" />
                Enter Domain Name
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && checkWhois()}
                  placeholder="Enter domain (e.g., example.com)"
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <Button
                  onClick={checkWhois}
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
              <p className="text-xs text-gray-500">
                Enter domain name without http:// or https:// (e.g., example.com)
              </p>
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Domain Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.domain && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Domain</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.domain}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.registrar && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Registrar</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.registrar}</p>
                    </div>
                  )}

                  {result.createdDate && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Created</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.createdDate}</p>
                    </div>
                  )}

                  {result.expiryDate && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Expires</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.expiryDate}</p>
                    </div>
                  )}

                  {result.updatedDate && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Updated</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.updatedDate}</p>
                    </div>
                  )}

                  {result.nameServers && result.nameServers.length > 0 && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg md:col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Name Servers</span>
                      </div>
                      <div className="space-y-1">
                        {result.nameServers.map((ns, idx) => (
                          <p key={idx} className="text-sm font-mono text-gray-900 dark:text-white">{ns}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.status && result.status.length > 0 && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg md:col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.status.map((status, idx) => (
                          <Badge key={idx} className="bg-green-600 text-white">
                            {status}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {result.source && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Data Source:</span> {result.source}
                    </p>
                  </div>
                )}

                {result.raw && (
                  <>
                    <Separator />
                    <details className="group">
                      <summary className="cursor-pointer p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="inline-flex items-center gap-2">
                          <User className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Raw Whois Data (Click to expand)
                          </span>
                        </div>
                      </summary>
                      <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <pre className="text-xs font-mono text-gray-900 dark:text-white whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                          {result.raw}
                        </pre>
                      </div>
                    </details>
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
                  <p className="font-medium">About Whois Lookup</p>
                  <p>Whois lookup provides public domain registration information. Some domains may have privacy protection enabled, which limits the information available.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authModalMode}
        onModeChange={setAuthModalMode}
      />
    </div>
  );
}

