"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "@/lib/authContext";
import {
  Phone, Search, Loader2, Shield, AlertTriangle, CheckCircle, XCircle
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function PhoneValidator() {
  const { user, trackUsage } = useAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const validatePhone = async () => {
    if (!phone.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`/api/phone-validator?phone=${encodeURIComponent(phone.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to validate phone number");
      }

      setResult(data);
      toast.success("Phone validation completed!");
      
      if (user && trackUsage) {
        trackUsage("/phone-validator", 1, 1, {
          tool: "Phone Validator",
        });
      }
    } catch (error) {
      console.error("Phone validation error:", error);
      toast.error(error.message || "Failed to validate phone number");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    if (riskLevel === "Safe") return "text-green-600";
    if (riskLevel === "Suspicious") return "text-yellow-600";
    return "text-red-600";
  };

  const getRiskBgColor = (riskLevel) => {
    if (riskLevel === "Safe") return "bg-green-100 dark:bg-green-900/20";
    if (riskLevel === "Suspicious") return "bg-yellow-100 dark:bg-yellow-900/20";
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
              Phone Validation • Free Tool
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Phone Validator
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Validate phone numbers, detect carrier information, and assess risk level.
            </p>
          </div>

          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-green-600" />
                Enter Phone Number
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890 or 1234567890"
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  onKeyPress={(e) => e.key === "Enter" && !loading && validatePhone()}
                />
                <Button
                  onClick={validatePhone}
                  disabled={loading}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Validate
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Use international format (e.g., +1234567890) for best results
              </p>
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
                      {result.valid ? (
                        <CheckCircle className="w-12 h-12 text-green-600" />
                      ) : (
                        <XCircle className="w-12 h-12 text-red-600" />
                      )}
                      <div>
                        <div className="text-2xl font-bold">
                          {result.valid ? "Valid" : "Invalid"}
                        </div>
                        <Badge
                          className={cn(
                            "text-lg px-4 py-2 mt-2",
                            result.riskLevel === "Safe" ? "bg-green-600" : result.riskLevel === "Suspicious" ? "bg-yellow-600" : "bg-red-600"
                          )}
                        >
                          {result.riskLevel} Risk
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Phone: <span className="font-mono font-medium">{result.phone}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Validation Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Validation Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Format Check */}
                  {result.checks.format && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        {result.checks.format.valid ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        Format Validation
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Valid Format</span>
                          {result.checks.format.valid ? (
                            <Badge className="bg-green-600">Yes</Badge>
                          ) : (
                            <Badge variant="destructive">No</Badge>
                          )}
                        </div>
                        {result.checks.format.format && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Format Type</span>
                            <Badge>{result.checks.format.format}</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Country Info */}
                  {result.checks.country && (
                    <div>
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Country Information
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Country Code</span>
                        {result.checks.country.countryCode ? (
                          <Badge>+{result.checks.country.countryCode}</Badge>
                        ) : (
                          <Badge variant="outline">Not detected</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Line Type */}
                  {result.checks.lineType && (
                    <div>
                      <h3 className="font-semibold mb-3">Line Type</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Type</span>
                          <Badge>{result.checks.lineType.type}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Number Length</span>
                          <Badge>{result.checks.lineType.length} digits</Badge>
                        </div>
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

