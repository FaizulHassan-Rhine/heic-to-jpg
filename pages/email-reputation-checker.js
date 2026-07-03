"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "@/lib/authContext";
import {
  Mail, Search, Loader2, Shield, AlertTriangle, CheckCircle, XCircle
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function EmailReputationChecker() {
  const { user, trackUsage } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const checkReputation = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/email-reputation-checker?email=${encodeURIComponent(email.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check email reputation");
      }

      setResult(data);
      toast.success("Email reputation check completed!");
      
      if (user && trackUsage) {
        trackUsage("/email-reputation-checker", 1, 1, {
          tool: "Email Reputation Checker",
        });
      }
    } catch (error) {
      console.error("Reputation check error:", error);
      toast.error(error.message || "Failed to check email reputation");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score) => {
    if (score >= 70) return "bg-green-100 dark:bg-green-900/20";
    if (score >= 40) return "bg-yellow-100 dark:bg-yellow-900/20";
    return "bg-red-100 dark:bg-red-900/20";
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
              Email Security • Free Tool
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Email Reputation Checker
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Analyze email address and domain security to determine trust level and reputation score.
            </p>
          </div>

          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-600" />
                Enter Email Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  onKeyPress={(e) => e.key === "Enter" && !loading && checkReputation()}
                />
                <Button
                  onClick={checkReputation}
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
              {/* Score Card */}
              <Card className={cn("border-2", getScoreBgColor(result.trustScore))}>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="text-6xl font-bold" style={{ color: getScoreColor(result.trustScore).replace("text-", "") }}>
                      {result.trustScore}
                      <span className="text-3xl">/100</span>
                    </div>
                    <Badge
                      className={cn(
                        "text-lg px-4 py-2",
                        result.trustScore >= 70 ? "bg-green-600" : result.trustScore >= 40 ? "bg-yellow-600" : "bg-red-600"
                      )}
                    >
                      {result.riskLevel} Risk
                    </Badge>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Email: <span className="font-mono font-medium">{result.email}</span>
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
                  {/* Format Check */}
                  {result.checks.format && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Email Format
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Valid Format</span>
                        <Badge className="bg-green-600">Yes</Badge>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Domain Check */}
                  {result.checks.domain && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Domain Analysis
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Domain Exists</span>
                          {result.checks.domain.exists ? (
                            <Badge className="bg-green-600">Yes</Badge>
                          ) : (
                            <Badge variant="destructive">No</Badge>
                          )}
                        </div>
                        {result.checks.domain.hasMxRecords !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm">MX Records</span>
                            {result.checks.domain.hasMxRecords ? (
                              <Badge className="bg-green-600">Present</Badge>
                            ) : (
                              <Badge variant="destructive">Missing</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Disposable Check */}
                  {result.checks.disposable && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Disposable Email Detection
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Is Disposable</span>
                        {result.checks.disposable.isDisposable ? (
                          <Badge variant="destructive">Yes</Badge>
                        ) : (
                          <Badge className="bg-green-600">No</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Domain Age */}
                  {result.checks.domainAge && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-3">Domain Age</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Age</span>
                          <Badge>{result.checks.domainAge.ageInDays} days</Badge>
                        </div>
                      </div>
                    </>
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

