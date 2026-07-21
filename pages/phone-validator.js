"use client";

import { useState } from "react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
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
    if (riskLevel === "Safe") return "text-primary";
    if (riskLevel === "Suspicious") return "text-yellow-600";
    return "text-red-600";
  };

  const getRiskBgColor = (riskLevel) => {
    if (riskLevel === "Safe") return "bg-brand-sky dark:bg-primary/10";
    if (riskLevel === "Suspicious") return "bg-yellow-100 dark:bg-yellow-900/20";
    return "bg-red-100 dark:bg-red-900/20";
  };

  return (
    <ToolPageShell containerClassName="max-w-5xl">
        <div className="space-y-6">
          {/* Header */}
          <ToolPageHeader
            title="Phone Validator"
            description="Validate phone numbers, detect carrier information, and assess risk level."
            badge="Phone Validation • Free Tool"
          />

          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
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
                  className="flex-1 px-4 py-3 bg-muted/40 dark:bg-muted border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  onKeyPress={(e) => e.key === "Enter" && !loading && validatePhone()}
                />
                <Button
                  onClick={validatePhone}
                  disabled={loading}
                  className="bg-gradient-to-r from-primary to-brand-navy hover:from-brand-navy hover:to-brand-navy"
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
              <p className="text-xs text-muted-foreground">
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
                        <CheckCircle className="w-12 h-12 text-primary" />
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
                            result.riskLevel === "Safe" ? "bg-primary" : result.riskLevel === "Suspicious" ? "bg-yellow-600" : "bg-red-600"
                          )}
                        >
                          {result.riskLevel} Risk
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">
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
                          <CheckCircle className="w-4 h-4 text-primary" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        Format Validation
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Valid Format</span>
                          {result.checks.format.valid ? (
                            <Badge className="bg-primary">Yes</Badge>
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
    </ToolPageShell>
  );
}

