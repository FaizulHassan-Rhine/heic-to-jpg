"use client";

import { useState, useCallback } from "react";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import ToolFormCard from "../components/ToolFormCard";
import { useAuth } from "@/lib/authContext";
import {
  Key, Copy, RefreshCw, CheckCircle, Lock, Shield
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function PasswordGenerator() {
  const { user, trackUsage } = useAuth();
  const [password, setPassword] = useState("");
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [excludeSimilar, setExcludeSimilar] = useState(false);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePassword = useCallback(() => {
    let charset = "";
    
    if (includeUppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (includeLowercase) charset += "abcdefghijklmnopqrstuvwxyz";
    if (includeNumbers) charset += "0123456789";
    if (includeSymbols) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";
    
    if (excludeSimilar) {
      charset = charset.replace(/[il1Lo0O]/g, "");
    }
    
    if (excludeAmbiguous) {
      charset = charset.replace(/[{}[\]()\/\\'"~,;.<>]/g, "");
    }
    
    if (!charset) {
      toast.error("Please select at least one character type");
      return;
    }
    
    let generated = "";
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      generated += charset[array[i] % charset.length];
    }
    
    setPassword(generated);
    setCopied(false);
    
    if (user && trackUsage) {
      trackUsage("/password-generator", 1, 1, {
        tool: "Password Generator",
        length,
      });
    }
  }, [length, includeUppercase, includeLowercase, includeNumbers, includeSymbols, excludeSimilar, excludeAmbiguous, user, trackUsage]);

  const copyToClipboard = () => {
    if (!password) {
      toast.error("Generate a password first");
      return;
    }
    navigator.clipboard.writeText(password);
    setCopied(true);
    toast.success("Password copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getStrength = (pwd) => {
    if (!pwd) return { level: 0, label: "None", color: "bg-muted" };
    
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (pwd.length >= 16) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    
    if (score <= 2) return { level: 1, label: "Weak", color: "bg-red-500" };
    if (score <= 4) return { level: 2, label: "Fair", color: "bg-yellow-500" };
    if (score <= 6) return { level: 3, label: "Good", color: "bg-brand-mid" };
    return { level: 4, label: "Strong", color: "bg-primary" };
  };

  const strength = getStrength(password);

  return (
    <ToolPageShell containerClassName="max-w-4xl">
        <div className="space-y-8">
          {/* Header */}
          <ToolPageHeader
            title="Password Generator"
            description="Create strong, secure passwords with customizable options. All generation happens in your browser for maximum privacy."
            badge="100% Secure • Client-side Generation"
          />

          {/* Password Display */}
          <ToolFormCard title="Generated Password" icon={Key}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={password}
                  readOnly
                  aria-label="Generated password"
                  className="flex-1 px-4 py-3 bg-muted/40 border border-border rounded-lg font-mono text-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Button
                  onClick={copyToClipboard}
                  aria-label={copied ? "Copied" : "Copy password"}
                  className={cn(
                    "bg-primary hover:bg-brand-navy focus-visible:ring-2 focus-visible:ring-primary/40",
                    copied && "bg-primary"
                  )}
                >
                  {copied ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </Button>
              </div>
              
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Strength:</span>
                    <Badge className={cn("text-white", strength.color)}>
                      {strength.label}
                    </Badge>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full transition-all", strength.color)}
                      style={{ width: `${(strength.level / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}
          </ToolFormCard>

          {/* Options */}
          <Card className="border border-border shadow-sm">
            <CardHeader>
              <CardTitle>Password Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Length */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center justify-between" htmlFor="password-length">
                  <span>Length: {length} characters</span>
                  <span className="text-muted-foreground">{length}</span>
                </label>
                <input
                  id="password-length"
                  type="range"
                  min="4"
                  max="128"
                  value={length}
                  onChange={(e) => setLength(parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>4</span>
                  <span>128</span>
                </div>
              </div>

              <Separator />

              {/* Character Types */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Character Types</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeUppercase}
                      onChange={(e) => setIncludeUppercase(e.target.checked)}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <span>Uppercase (A-Z)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeLowercase}
                      onChange={(e) => setIncludeLowercase(e.target.checked)}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <span>Lowercase (a-z)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeNumbers}
                      onChange={(e) => setIncludeNumbers(e.target.checked)}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <span>Numbers (0-9)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSymbols}
                      onChange={(e) => setIncludeSymbols(e.target.checked)}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <span>Symbols (!@#$%...)</span>
                  </label>
                </div>
              </div>

              <Separator />

              {/* Security Options */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Security Options</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={excludeSimilar}
                      onChange={(e) => setExcludeSimilar(e.target.checked)}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <span>Exclude Similar Characters (i, l, 1, L, o, 0, O)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={excludeAmbiguous}
                      onChange={(e) => setExcludeAmbiguous(e.target.checked)}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <span>Exclude Ambiguous Characters ({ } [ ] ( ) / \ ' " ~ , ; . &lt; &gt;)</span>
                  </label>
                </div>
              </div>

              <Button
                onClick={generatePassword}
                className="w-full bg-gradient-to-r from-primary to-brand-navy hover:from-brand-navy hover:to-brand-navy text-white font-semibold py-6 text-lg"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Generate Password
              </Button>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="bg-brand-sky/50 dark:bg-primary/10 border-brand-mid/30 dark:border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-primary mt-0.5" />
                <div className="space-y-1 text-sm text-foreground dark:text-muted-foreground">
                  <p className="font-medium">Security & Privacy</p>
                  <p>All password generation happens locally in your browser. No data is sent to any server, ensuring complete privacy and security.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </ToolPageShell>
  );
}

