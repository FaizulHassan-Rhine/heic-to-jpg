"use client";

import { useState } from "react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
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
    <>
    <ToolPageShell containerClassName="max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <ToolPageHeader
            title="Whois Checker"
            description="Get detailed domain registration information including registrar, creation date, expiration date, and more."
            badge="Domain Information Lookup"
          />

          {/* Input Section */}
          <Card className="border border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
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
                  className="flex-1 px-4 py-3 bg-muted/40 dark:bg-muted border border-border dark:border-border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button
                  onClick={checkWhois}
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
              <p className="text-xs text-muted-foreground">
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
                  <div className="p-4 bg-muted/40 dark:bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Domain</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground dark:text-foreground">{result.domain}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.registrar && (
                    <div className="p-4 bg-muted/40 dark:bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Registrar</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground dark:text-foreground">{result.registrar}</p>
                    </div>
                  )}

                  {result.createdDate && (
                    <div className="p-4 bg-muted/40 dark:bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Created</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground dark:text-foreground">{result.createdDate}</p>
                    </div>
                  )}

                  {result.expiryDate && (
                    <div className="p-4 bg-muted/40 dark:bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Expires</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground dark:text-foreground">{result.expiryDate}</p>
                    </div>
                  )}

                  {result.updatedDate && (
                    <div className="p-4 bg-muted/40 dark:bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Last Updated</span>
                      </div>
                      <p className="text-lg font-semibold text-foreground dark:text-foreground">{result.updatedDate}</p>
                    </div>
                  )}

                  {result.nameServers && result.nameServers.length > 0 && (
                    <div className="p-4 bg-muted/40 dark:bg-muted rounded-lg md:col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Name Servers</span>
                      </div>
                      <div className="space-y-1">
                        {result.nameServers.map((ns, idx) => (
                          <p key={idx} className="text-sm font-mono text-foreground dark:text-foreground">{ns}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.status && result.status.length > 0 && (
                    <div className="p-4 bg-muted/40 dark:bg-muted rounded-lg md:col-span-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Status</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.status.map((status, idx) => (
                          <Badge key={idx} className="bg-primary text-white">
                            {status}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {result.source && (
                  <div className="p-3 bg-brand-sky/50 dark:bg-primary/10 rounded-lg">
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                      <span className="font-medium">Data Source:</span> {result.source}
                    </p>
                  </div>
                )}

                {result.raw && (
                  <>
                    <Separator />
                    <details className="group">
                      <summary className="cursor-pointer p-4 bg-muted/40 dark:bg-muted rounded-lg hover:bg-muted dark:hover:bg-muted transition-colors">
                        <div className="inline-flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                            Raw Whois Data (Click to expand)
                          </span>
                        </div>
                      </summary>
                      <div className="mt-2 p-4 bg-muted/40 dark:bg-muted rounded-lg">
                        <pre className="text-xs font-mono text-foreground dark:text-foreground whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
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
          <Card className="bg-brand-sky/50 dark:bg-primary/10 border-brand-mid/30 dark:border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div className="space-y-1 text-sm text-foreground dark:text-muted-foreground">
                  <p className="font-medium">About Whois Lookup</p>
                  <p>Whois lookup provides public domain registration information. Some domains may have privacy protection enabled, which limits the information available.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </ToolPageShell>

    <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authModalMode}
        onModeChange={setAuthModalMode}
      />
    </>
  );
}

