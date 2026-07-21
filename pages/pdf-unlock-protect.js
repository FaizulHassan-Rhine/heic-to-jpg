import { useState, useRef } from "react";
import { useAuth } from "../lib/authContext";
import { useSettings } from "../lib/useSettings";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import AuthModal from "../components/AuthModal";
import {
  Loader2, CheckCircle, Download, AlertCircle, FileText,
  Trash2, Upload, Lock, Unlock, Settings2, Shield, Eye, EyeOff,
  ChevronDown, ChevronUp, Key, FileCheck
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ─────────────────────────── HELPERS ───────────────────────────

const formatSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// ─────────────────────────── COMPONENT ───────────────────────────

export default function PdfUnlockProtect() {
  const { user, trackUsage } = useAuth();
  const { settings } = useSettings();
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [resultSize, setResultSize] = useState(0);
  const [mode, setMode] = useState("unlock"); // unlock, protect, change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [permissions, setPermissions] = useState({
    printing: "lowResolution", // none, lowResolution, highResolution
    modifying: false,
    copying: false,
    annotating: false,
    fillingForms: false,
    contentAccessibility: false,
    assembling: false,
  });
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const fileInputRef = useRef(null);

  // Check if PDF is password protected
  const checkPasswordProtection = async (file) => {
    try {
      const { PDFDocument } = await import("pdf-lib");
      const arrayBuffer = await file.arrayBuffer();
      await PDFDocument.load(arrayBuffer);
      return false; // No password
    } catch (error) {
      if (error.message?.includes("password") || error.message?.includes("encrypted")) {
        return true; // Password protected
      }
      return false;
    }
  };

  // Handle file selection
  const handleFileChange = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const maxSize = settings.pdf.maxSize;
    if (selected.size > maxSize) {
      toast.error(`File exceeds ${formatSize(maxSize)} limit`);
      return;
    }

    if (!selected.type.includes("pdf") && !selected.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select a PDF file");
      return;
    }

    setFile(selected);
    setResult(null);
    setResultSize(0);
    setProgress(0);
    setCurrentPassword("");
    setNewPassword("");
    setOwnerPassword("");

    // Check if PDF is password protected
    const isProtected = await checkPasswordProtection(selected);
    if (isProtected) {
      setMode("unlock");
      toast.info("PDF appears to be password protected. Enter password to unlock.");
    } else {
      setMode("protect");
      toast.success("PDF is not password protected. You can add protection.");
    }

    e.target.value = "";
  };

  // Process PDF using server-side API
  const processPdf = async () => {
    if (!file) {
      toast.error("Please select a PDF file");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResult(null);
    setResultSize(0);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      if (currentPassword) formData.append("currentPassword", currentPassword);
      if (newPassword) formData.append("newPassword", newPassword);
      if (ownerPassword) formData.append("ownerPassword", ownerPassword);
      formData.append("permissions", JSON.stringify(permissions));

      // Add user info for tracking
      if (user) {
        formData.append("firebaseUid", user.uid);
        if (user.email) formData.append("userEmail", user.email);
      }

      setProgress(20);

      // Send to API
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const uploadProgress = (e.loaded / e.total) * 30; // First 30% for upload
          setProgress(uploadProgress);
        }
      });

      xhr.addEventListener("load", async () => {
        if (xhr.status === 200) {
          const blob = xhr.response;
          setResult(blob);
          setResultSize(blob.size);
          setProgress(100);

          if (mode === "unlock") {
            toast.success("PDF unlocked successfully!");
          } else if (mode === "protect") {
            toast.success("PDF protected successfully!");
          } else {
            toast.success("PDF password changed successfully!");
          }

          // Track usage
          if (user && trackUsage) {
            trackUsage("/pdf-unlock-protect", 1, 1, {
              tool: "PDF Unlock/Protect",
              mode,
              filesProcessed: 1,
            });
          }
        } else {
          try {
            const blob = xhr.response;
            if (blob && blob instanceof Blob) {
              const text = await blob.text();
              const error = JSON.parse(text || '{}');
              toast.error(error.error || "Failed to process PDF");
            } else {
              toast.error(`Failed to process PDF (Status: ${xhr.status})`);
            }
          } catch (err) {
            toast.error(`Failed to process PDF (Status: ${xhr.status})`);
          }
        }
        setProcessing(false);
      });

      xhr.addEventListener("error", () => {
        toast.error("Network error. Please try again.");
        setProcessing(false);
      });

      xhr.addEventListener("abort", () => {
        toast.error("Upload cancelled");
        setProcessing(false);
      });

      // Simulate processing progress (30-100%)
      const progressInterval = setInterval(() => {
        if (xhr.readyState < 4) {
          setProgress((prev) => {
            if (prev < 30) return prev + 1;
            if (prev < 90) return prev + 0.5;
            return prev;
          });
        } else {
          clearInterval(progressInterval);
        }
      }, 100);

      xhr.open("POST", "/api/pdf-unlock-protect");
      xhr.responseType = "blob";
      xhr.send(formData);
    } catch (error) {
      console.error("PDF processing error:", error);
      toast.error("Failed to process PDF. Please try again.");
      setProcessing(false);
    }
  };

  // Download result
  const downloadResult = () => {
    if (!result) return;

    const url = URL.createObjectURL(result);
    const a = document.createElement("a");
    a.href = url;
    const suffix = mode === "unlock" ? "_unlocked" : mode === "protect" ? "_protected" : "_changed";
    a.download = file.name.replace(".pdf", `${suffix}.pdf`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear file
  const clearFile = () => {
    setFile(null);
    setResult(null);
    setResultSize(0);
    setProgress(0);
    setCurrentPassword("");
    setNewPassword("");
    setOwnerPassword("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
    <ToolPageShell containerClassName="max-w-7xl">
        <div className="space-y-8">
          {/* Header */}
          <ToolPageHeader
            title="PDF Unlock & Protect"
            description="Unlock password-protected PDFs, add password protection, change passwords, and set advanced permissions. Secure your documents with powerful PDF security tools."
          />

          {/* Mode Selection */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3 justify-center">
                {[
                  { value: "unlock", label: "Unlock PDF", icon: Unlock, desc: "Remove password protection" },
                  { value: "protect", label: "Protect PDF", icon: Lock, desc: "Add password protection" },
                  { value: "change", label: "Change Password", icon: Key, desc: "Update existing password" },
                ].map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value)}
                    className={cn(
                      "flex items-center gap-3 px-6 py-4 rounded-lg border-2 transition-all",
                      mode === m.value
                        ? "border-primary bg-brand-sky/50 text-brand-navy shadow-sm"
                        : "border-border hover:border-border text-muted-foreground"
                    )}
                  >
                    <m.icon className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-semibold text-sm">{m.label}</div>
                      <div className="text-xs opacity-70">{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xl text-foreground flex items-center gap-2">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    PDF File
                  </h3>
                  {file && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFile}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Clear
                    </Button>
                  )}
                </div>

                {!file ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="cursor-pointer flex flex-col items-center gap-4"
                    >
                      <Upload className="w-12 h-12 text-muted-foreground" />
                      <div>
                        <div className="font-semibold text-foreground mb-1">
                          Click to upload PDF
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {settings && settings.pdf
                            ? `Max ${Math.round(settings.pdf.maxSize / (1024 * 1024))}MB`
                            : "PDF files only"}
                        </div>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/40">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-8 h-8 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate">{file.name}</div>
                        <div className="text-sm text-muted-foreground">{formatSize(file.size)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          {file && (
            <div className="grid lg:grid-cols-[400px_1fr] gap-8 items-start">
              {/* Settings Sidebar */}
              <Card className="lg:sticky lg:top-24 h-fit border-0 shadow-lg ring-1 ring-gray-100">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-2 font-bold text-xl text-foreground">
                    <Settings2 className="w-6 h-6 text-primary" /> Settings
                  </div>

                  {/* Current Password (for unlock/change) */}
                  {(mode === "unlock" || mode === "change") && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter PDF password"
                          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* New Password (for protect/change) */}
                  {(mode === "protect" || mode === "change") && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-foreground">
                        {mode === "protect" ? "Password" : "New Password"}
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter password"
                          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Owner Password (for protect/change) */}
                  {(mode === "protect" || mode === "change") && (() => {
                    const ownerPasswordFree = settings?.features?.pdfUnlockProtect?.ownerPassword ?? false;
                    const requiresAuth = !ownerPasswordFree && !user;
                    
                    return (
                      <div className="space-y-2">
                        <label className={cn(
                          "text-sm font-semibold text-foreground flex items-center gap-2",
                          requiresAuth && "opacity-75"
                        )}>
                          Owner Password (Optional)
                          {requiresAuth && <Lock className="w-4 h-4 text-muted-foreground" />}
                        </label>
                        <div className="relative">
                          <input
                            type={showOwnerPassword ? "text" : "password"}
                            value={ownerPassword}
                            onChange={(e) => {
                              if (requiresAuth) {
                                toast.error("Please sign in to use owner password");
                                setAuthModalMode("login");
                                setAuthModalOpen(true);
                                return;
                              }
                              setOwnerPassword(e.target.value);
                            }}
                            placeholder="Leave empty to use same as user password"
                            disabled={requiresAuth}
                            className={cn(
                              "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none pr-10",
                              requiresAuth && "opacity-50 cursor-not-allowed"
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showOwnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Owner password controls permissions. If not set, user password is used.
                        </p>
                      </div>
                    );
                  })()}

                  {/* Advanced Options */}
                  {(mode === "protect" || mode === "change") && (() => {
                    const advancedPermissionsFree = settings?.features?.pdfUnlockProtect?.advancedPermissions ?? false;
                    const requiresAuth = !advancedPermissionsFree && !user;
                    
                    return (
                      <div className="space-y-2 border-t pt-4">
                        <button
                          onClick={() => {
                            if (requiresAuth && !advancedOptionsOpen) {
                              toast.error("Please sign in to use advanced permissions");
                              setAuthModalMode("login");
                              setAuthModalOpen(true);
                              return;
                            }
                            setAdvancedOptionsOpen(!advancedOptionsOpen);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-3 border-2 rounded-lg hover:bg-muted/40 transition-all",
                            requiresAuth && "opacity-75"
                          )}
                        >
                          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Permissions
                            {requiresAuth && <Lock className="w-4 h-4 text-muted-foreground" />}
                          </span>
                          {advancedOptionsOpen ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>

                        {advancedOptionsOpen && !requiresAuth && (
                        <div className="space-y-3 border-2 rounded-lg p-4 bg-muted/40">
                          {/* Printing */}
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Printing</label>
                            <select
                              value={permissions.printing}
                              onChange={(e) => setPermissions({ ...permissions, printing: e.target.value })}
                              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                            >
                              <option value="none">Not Allowed</option>
                              <option value="lowResolution">Low Resolution</option>
                              <option value="highResolution">High Resolution</option>
                            </select>
                          </div>

                          {/* Other Permissions */}
                          {[
                            { key: "modifying", label: "Modifying Document" },
                            { key: "copying", label: "Copying Text/Graphics" },
                            { key: "annotating", label: "Adding Comments" },
                            { key: "fillingForms", label: "Filling Forms" },
                            { key: "contentAccessibility", label: "Content Accessibility" },
                            { key: "assembling", label: "Assembling Document" },
                          ].map((perm) => (
                            <label
                              key={perm.key}
                              className="flex items-center gap-3 p-2 border rounded-lg hover:bg-card cursor-pointer transition-all bg-card"
                            >
                              <input
                                type="checkbox"
                                checked={permissions[perm.key]}
                                onChange={(e) =>
                                  setPermissions({ ...permissions, [perm.key]: e.target.checked })
                                }
                                className="w-4 h-4 accent-primary"
                              />
                              <span className="text-sm font-medium text-foreground">{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      </div>
                    );
                  })()}

                  {/* Process Button */}
                  <Button
                    onClick={processPdf}
                    disabled={processing || !file || (mode !== "unlock" && !newPassword)}
                    className="w-full bg-gradient-to-r from-primary to-brand-navy hover:from-brand-navy hover:to-brand-navy text-white h-12 shadow-lg hover:shadow-xl transition-all font-semibold text-base"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...
                      </>
                    ) : mode === "unlock" ? (
                      <>
                        <Unlock className="w-5 h-5 mr-2" /> Unlock PDF
                      </>
                    ) : mode === "protect" ? (
                      <>
                        <Lock className="w-5 h-5 mr-2" /> Protect PDF
                      </>
                    ) : (
                      <>
                        <Key className="w-5 h-5 mr-2" /> Change Password
                      </>
                    )}
                  </Button>

                  {/* Download Button */}
                  {result && (
                    <Button
                      onClick={downloadResult}
                      className="w-full bg-gradient-to-r from-primary to-brand-navy hover:from-brand-navy hover:to-brand-navy text-white h-12 shadow-lg hover:shadow-xl transition-all font-semibold text-base"
                    >
                      <Download className="w-5 h-5 mr-2" /> Download PDF
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Result Area */}
              <div className="space-y-4">
                {/* Progress */}
                {processing && (
                  <Card className="border border-border">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {mode === "unlock" ? "Unlocking PDF..." : mode === "protect" ? "Protecting PDF..." : "Changing password..."}
                          </span>
                          <span className="font-semibold text-foreground">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Result Info */}
                {result && (
                  <Card className="border border-brand-mid/30 bg-brand-sky/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="w-6 h-6 text-primary" />
                        <h3 className="font-bold text-lg text-brand-navy">
                          {mode === "unlock" ? "PDF Unlocked Successfully!" : mode === "protect" ? "PDF Protected Successfully!" : "Password Changed Successfully!"}
                        </h3>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Original Size:</span>
                          <span className="font-semibold text-foreground">{formatSize(file.size)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">New Size:</span>
                          <span className="font-semibold text-primary">{formatSize(resultSize)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
    </ToolPageShell>

    {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </>
  );
}

