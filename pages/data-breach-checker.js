"use client";

import { useState } from "react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import { useAuth } from "@/lib/authContext";
import {
  Shield, Search, Loader2, AlertTriangle, CheckCircle, Database, Mail, Globe
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function DataBreachChecker() {
  const { user, trackUsage } = useAuth();
  const [query, setQuery] = useState("");
  const [queryType, setQueryType] = useState("email");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const checkBreach = async () => {
    if (!query.trim()) {
      toast.error(`Please enter an ${queryType} address`);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const param = queryType === "email" ? `email=${encodeURIComponent(query.trim())}` : `domain=${encodeURIComponent(query.trim())}`;
      const response = await fetch(`/api/data-breach-checker?${param}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check data breaches");
      }

      setResult(data);
      toast.success("Breach check completed!");
      
      if (user && trackUsage) {
        trackUsage("/data-breach-checker", 1, 1, {
          tool: "Data Breach Checker",
        });
      }
    } catch (error) {
      console.error("Breach check error:", error);
      toast.error(error.message || "Failed to check data breaches");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    if (riskLevel === "Low") return "text-primary";
    if (riskLevel === "Medium") return "text-yellow-600";
    if (riskLevel === "High" || riskLevel === "Critical") return "text-red-600";
    return "text-muted-foreground";
  };

  const getRiskBgColor = (riskLevel) => {
    if (riskLevel === "Low") return "bg-brand-sky dark:bg-primary/10";
    if (riskLevel === "Medium") return "bg-yellow-100 dark:bg-yellow-900/20";
    if (riskLevel === "High" || riskLevel === "Critical") return "bg-red-100 dark:bg-red-900/20";
    return "bg-muted dark:bg-card/20";
  };

  return (
    <ToolPageShell containerClassName="max-w-5xl">
        <div className="space-y-6">
          {/* Header */}
          <ToolPageHeader
            title="Data Breach Checker"
            description="Check if your email address or domain has been exposed in known data breaches."
            badge="Security Check • Free Tool"
          />

          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Check for Breaches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <select
                  value={queryType}
                  onChange={(e) => setQueryType(e.target.value)}
                  className="px-4 py-3 bg-muted/40 dark:bg-muted border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="email">Email</option>
                  <option value="domain">Domain</option>
                </select>
                <input
                  type={queryType === "email" ? "email" : "text"}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={queryType === "email" ? "example@domain.com" : "example.com"}
                  className="flex-1 px-4 py-3 bg-muted/40 dark:bg-muted border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  onKeyPress={(e) => e.key === "Enter" && !loading && checkBreach()}
                />
                <Button
                  onClick={checkBreach}
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
              {/* Status Card */}
              <Card className={cn("border-2", getRiskBgColor(result.riskLevel))}>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      {result.breachCount === 0 ? (
                        <CheckCircle className="w-12 h-12 text-primary" />
                      ) : (
                        <AlertTriangle className="w-12 h-12 text-red-600" />
                      )}
                      <div>
                        <div className="text-2xl font-bold">
                          {result.breachCount === 0 ? "No Breaches Found" : `${result.breachCount} Breach${result.breachCount > 1 ? "es" : ""} Found`}
                        </div>
                        <Badge
                          className={cn(
                            "text-lg px-4 py-2 mt-2",
                            result.riskLevel === "Low" ? "bg-primary" : result.riskLevel === "Medium" ? "bg-yellow-600" : "bg-red-600"
                          )}
                        >
                          {result.riskLevel} Risk
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                      {result.type === "email" ? "Email" : "Domain"}: <span className="font-mono font-medium">{result.query}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Breach Details */}
              {result.breaches && result.breaches.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Breach Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {result.breaches.map((breach, idx) => (
                        <div key={idx} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{breach.name}</h3>
                            <Badge variant={breach.severity === "High" ? "destructive" : "outline"}>
                              {breach.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-2">
                            Date: {breach.date}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs font-medium">Exposed Data:</span>
                            {breach.exposedData.map((data, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {data}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="text-yellow-600 mt-0.5">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
    </ToolPageShell>
  );
}

