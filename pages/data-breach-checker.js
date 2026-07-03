"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
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
    if (riskLevel === "Low") return "text-green-600";
    if (riskLevel === "Medium") return "text-yellow-600";
    if (riskLevel === "High" || riskLevel === "Critical") return "text-red-600";
    return "text-gray-600";
  };

  const getRiskBgColor = (riskLevel) => {
    if (riskLevel === "Low") return "bg-green-100 dark:bg-green-900/20";
    if (riskLevel === "Medium") return "bg-yellow-100 dark:bg-yellow-900/20";
    if (riskLevel === "High" || riskLevel === "Critical") return "bg-red-100 dark:bg-red-900/20";
    return "bg-gray-100 dark:bg-gray-900/20";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium mb-4">
              <Shield className="w-3.5 h-3.5" />
              Security Check • Free Tool
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Data Breach Checker
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Check if your email address or domain has been exposed in known data breaches.
            </p>
          </div>

          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-green-600" />
                Check for Breaches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <select
                  value={queryType}
                  onChange={(e) => setQueryType(e.target.value)}
                  className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="email">Email</option>
                  <option value="domain">Domain</option>
                </select>
                <input
                  type={queryType === "email" ? "email" : "text"}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={queryType === "email" ? "example@domain.com" : "example.com"}
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  onKeyPress={(e) => e.key === "Enter" && !loading && checkBreach()}
                />
                <Button
                  onClick={checkBreach}
                  disabled={loading}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
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
                        <CheckCircle className="w-12 h-12 text-green-600" />
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
                            result.riskLevel === "Low" ? "bg-green-600" : result.riskLevel === "Medium" ? "bg-yellow-600" : "bg-red-600"
                          )}
                        >
                          {result.riskLevel} Risk
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
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
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
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
      </main>

      <Footer />
    </div>
  );
}

