"use client";

import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "@/lib/authContext";
import {
  Shield, CheckCircle, XCircle, AlertTriangle, Lock
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function PasswordStrengthChecker() {
  const { user, trackUsage } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const checkPassword = (pwd) => {
    const checks = {
      length: pwd.length >= 8,
      length12: pwd.length >= 12,
      length16: pwd.length >= 16,
      lowercase: /[a-z]/.test(pwd),
      uppercase: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      symbol: /[^a-zA-Z0-9]/.test(pwd),
      noCommon: !["password", "123456", "qwerty", "admin", "letmein"].some(common => 
        pwd.toLowerCase().includes(common)
      ),
      noRepeating: !/(.)\1{2,}/.test(pwd),
      noSequential: !/(012|123|234|345|456|567|678|789|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(pwd),
    };

    const passed = Object.values(checks).filter(Boolean).length;
    const total = Object.keys(checks).length;
    const score = Math.round((passed / total) * 100);

    let strength = "Very Weak";
    let color = "bg-red-500";
    let level = 1;

    if (score >= 90) {
      strength = "Very Strong";
      color = "bg-green-500";
      level = 5;
    } else if (score >= 75) {
      strength = "Strong";
      color = "bg-green-500";
      level = 4;
    } else if (score >= 60) {
      strength = "Good";
      color = "bg-blue-500";
      level = 3;
    } else if (score >= 40) {
      strength = "Fair";
      color = "bg-yellow-500";
      level = 2;
    }

    // Estimate crack time
    let crackTime = "Instant";
    if (pwd.length >= 8 && checks.lowercase && checks.uppercase && checks.number && checks.symbol) {
      const combinations = Math.pow(94, pwd.length);
      const attemptsPerSecond = 1e9; // 1 billion attempts per second
      const seconds = combinations / attemptsPerSecond;
      
      if (seconds < 60) crackTime = "Less than a minute";
      else if (seconds < 3600) crackTime = `${Math.round(seconds / 60)} minutes`;
      else if (seconds < 86400) crackTime = `${Math.round(seconds / 3600)} hours`;
      else if (seconds < 31536000) crackTime = `${Math.round(seconds / 86400)} days`;
      else if (seconds < 31536000000) crackTime = `${Math.round(seconds / 31536000)} years`;
      else crackTime = "Centuries";
    }

    return { checks, score, strength, color, level, crackTime };
  };

  const result = password ? checkPassword(password) : null;

  const handleCheck = () => {
    if (!password) {
      toast.error("Please enter a password to check");
      return;
    }
    
    if (user && trackUsage) {
      trackUsage("/password-strength-checker", 1, 1, {
        tool: "Password Strength Checker",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium mb-4">
              <Shield className="w-3.5 h-3.5" />
              100% Private • Client-side Analysis
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Password Strength Checker
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Test the strength and security of your passwords. Get detailed feedback and recommendations.
            </p>
          </div>

          {/* Password Input */}
          <Card className="border-2 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-green-600" />
                Enter Password to Check
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={handleCheck}
                  placeholder="Enter your password..."
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowPassword(!showPassword)}
                  className="border-gray-300 dark:border-gray-700"
                >
                  {showPassword ? "Hide" : "Show"}
                </Button>
              </div>
              
              {result && (
                <div className="space-y-4">
                  <Separator />
                  
                  {/* Strength Score */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Strength:</span>
                      <Badge className={cn("text-white", result.color)}>
                        {result.strength} ({result.score}%)
                      </Badge>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full transition-all", result.color)}
                        style={{ width: `${result.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Crack Time */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Estimated Crack Time:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{result.crackTime}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detailed Checks */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Security Checks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { key: "length", label: "At least 8 characters", required: true },
                    { key: "length12", label: "At least 12 characters (recommended)", required: false },
                    { key: "length16", label: "At least 16 characters (strong)", required: false },
                    { key: "lowercase", label: "Contains lowercase letters", required: true },
                    { key: "uppercase", label: "Contains uppercase letters", required: true },
                    { key: "number", label: "Contains numbers", required: true },
                    { key: "symbol", label: "Contains special characters", required: true },
                    { key: "noCommon", label: "Doesn't contain common words", required: false },
                    { key: "noRepeating", label: "No repeating characters (aaa, 111)", required: false },
                    { key: "noSequential", label: "No sequential patterns (123, abc)", required: false },
                  ].map((check) => {
                    const passed = result.checks[check.key];
                    return (
                      <div key={check.key} className="flex items-center gap-3">
                        {passed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className={cn(
                          "text-sm",
                          passed ? "text-gray-700 dark:text-gray-300" : "text-gray-500 dark:text-gray-400"
                        )}>
                          {check.label}
                          {check.required && <span className="text-red-500 ml-1">*</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {result && result.score < 100 && (
            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <p className="font-medium">Recommendations:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {!result.checks.length && <li>Use at least 8 characters</li>}
                      {!result.checks.lowercase && <li>Add lowercase letters</li>}
                      {!result.checks.uppercase && <li>Add uppercase letters</li>}
                      {!result.checks.number && <li>Add numbers</li>}
                      {!result.checks.symbol && <li>Add special characters</li>}
                      {!result.checks.length12 && <li>Consider using 12+ characters for better security</li>}
                      {!result.checks.noCommon && <li>Avoid common words like "password"</li>}
                      {!result.checks.noRepeating && <li>Avoid repeating characters</li>}
                      {!result.checks.noSequential && <li>Avoid sequential patterns</li>}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <p className="font-medium">Privacy & Security</p>
                  <p>All password analysis happens locally in your browser. Your password is never sent to any server or stored anywhere.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}

