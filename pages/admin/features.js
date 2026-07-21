import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { 
  Settings as SettingsIcon, Save, ArrowLeft, Image, FileVideo, FileText, 
  FileAudio, QrCode, Mic, FileImage, LayoutDashboard, Users, Package, 
  LogOut, Menu, X, Scissors, ScanLine, Type, Link2, Archive, Lock, ChevronDown, ChevronUp, Shield, Globe, Mail, Phone, Database, Server
} from "lucide-react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const SIDEBAR_ITEMS = [
  { id: "stats", label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { id: "users", label: "Users", icon: Users, href: "/admin/dashboard?tab=users" },
  { id: "orders", label: "Orders", icon: Package, href: "/admin/dashboard?tab=orders" },
  { id: "settings", label: "Settings", icon: SettingsIcon, href: "/admin/dashboard?tab=settings" },
  { id: "features", label: "Features", icon: SettingsIcon, href: "/admin/features", active: true },
];

// Define all tools and their features
// All features have checkboxes to control free vs sign-in required
// Advanced Options have sub-features in a dropdown
const ALL_TOOLS = [
  {
    id: "imageConverter",
    name: "Image Converter",
    icon: Image,
    description: "Convert images between different formats",
    features: [
      {
        id: "webPreset",
        name: "Web Preset",
        description: "Format preset optimized for web",
      },
      {
        id: "printPreset",
        name: "Print Preset",
        description: "Format preset optimized for print",
      },
      {
        id: "socialPreset",
        name: "Social Preset",
        description: "Format preset optimized for social media",
      },
      {
        id: "jpgFormat",
        name: "JPG Format",
        description: "Convert to JPG format",
      },
      {
        id: "pngFormat",
        name: "PNG Format",
        description: "Convert to PNG format",
      },
      {
        id: "webpFormat",
        name: "WebP Format",
        description: "Convert to WebP format",
      },
      {
        id: "qualitySlider",
        name: "Quality Slider",
        description: "Adjust image quality 1-100%",
      },
      {
        id: "preserveTransparency",
        name: "Preserve Transparency",
        description: "Keep PNG transparency",
      },
      {
        id: "advancedOptions",
        name: "Advanced Options",
        description: "Additional conversion options",
        isDropdown: true,
        subFeatures: [
          {
            id: "resize",
            name: "Resize During Conversion",
            description: "Resize images to specific dimensions",
          },
          {
            id: "preserveMetadata",
            name: "Preserve EXIF Metadata",
            description: "Keep image metadata (EXIF data)",
          },
          {
            id: "watermark",
            name: "Add Watermark",
            description: "Add text watermark to images",
          },
          {
            id: "customNames",
            name: "Custom File Names",
            description: "Rename files with custom patterns",
          },
          {
            id: "showPreview",
            name: "Show Preview Before Conversion",
            description: "Preview images before processing",
          },
        ],
      },
    ],
  },
  {
    id: "imageCompress",
    name: "Image Compress",
    icon: FileImage,
    description: "Compress images to reduce file size",
    features: [
      {
        id: "resizeMode",
        name: "Resize Mode",
        description: "Percentage, Pixel, or Ratio resize",
      },
      {
        id: "compressionPreset",
        name: "Compression Preset",
        description: "Maximum, Balanced, or High quality",
      },
      {
        id: "qualitySlider",
        name: "Quality Slider",
        description: "Adjust compression quality 1-100%",
      },
      {
        id: "targetFileSize",
        name: "Target File Size",
        description: "Compress to a specific file size",
      },
      {
        id: "convertFormat",
        name: "Convert Format",
        description: "Option to convert format during compression",
      },
      {
        id: "jpgFormat",
        name: "JPG Format",
        description: "Compress to JPG format",
      },
      {
        id: "pngFormat",
        name: "PNG Format",
        description: "Compress to PNG format",
      },
      {
        id: "webpFormat",
        name: "WEBP Format",
        description: "Compress to WEBP format",
      },
      {
        id: "smartCrop",
        name: "Smart Crop",
        description: "Auto-remove whitespace",
      },
      {
        id: "advancedOptions",
        name: "Advanced Options",
        description: "Additional compression options",
        isDropdown: true,
        subFeatures: [
          {
            id: "progressiveJpeg",
            name: "Progressive JPEG",
            description: "Create progressive JPEG files",
          },
          {
            id: "optimizePalette",
            name: "Optimize Palette (PNG)",
            description: "Optimize PNG color palette",
          },
          {
            id: "stripMetadata",
            name: "Strip Metadata",
            description: "Remove metadata from images",
          },
          {
            id: "losslessCompression",
            name: "Lossless Compression",
            description: "Use lossless compression algorithm",
          },
        ],
      },
    ],
  },
  {
    id: "imageToPdf",
    name: "Image to PDF",
    icon: Image,
    description: "Convert images to PDF documents",
    features: [
      {
        id: "advancedOptions",
        name: "Advanced Options",
        description: "Page size, orientation, margin settings",
      },
    ],
  },
  {
    id: "extractText",
    name: "Extract Text (OCR)",
    icon: ScanLine,
    description: "Extract text from images using OCR",
    features: [
      {
        id: "proOCR",
        name: "Pro OCR Engine",
        description: "Enhanced OCR engine with better accuracy",
      },
      {
        id: "languageSelection",
        name: "Language Selection",
        description: "Select specific languages for OCR",
      },
      {
        id: "exportFormat",
        name: "Export Format",
        description: "Export to DOCX, JSON, or other formats",
      },
    ],
  },
  {
    id: "videoConvert",
    name: "Video Convert",
    icon: FileVideo,
    description: "Convert videos between different formats",
    features: [
      {
        id: "mp4Format",
        name: "MP4 Format",
        description: "Convert to MP4 format",
      },
      {
        id: "webmFormat",
        name: "WEBM Format",
        description: "Convert videos to WEBM format",
      },
      {
        id: "aviFormat",
        name: "AVI Format",
        description: "Convert to AVI format",
      },
    ],
  },
  {
    id: "videoCompress",
    name: "Video Compress",
    icon: FileVideo,
    description: "Compress videos to reduce file size",
    features: [
      {
        id: "advancedOptions",
        name: "Advanced Options",
        description: "Quality settings, codec selection, resolution options",
      },
    ],
  },
  {
    id: "videoTrim",
    name: "Video Trimmer",
    icon: Scissors,
    description: "Trim and cut video files",
    features: [
      {
        id: "advancedOptions",
        name: "Advanced Options",
        description: "Precise trimming, quality settings, format selection",
      },
    ],
  },
  {
    id: "docToPdf",
    name: "Document to PDF",
    icon: FileText,
    description: "Convert documents to PDF format",
    features: [
      {
        id: "batchConversion",
        name: "Batch Conversion",
        description: "Convert multiple documents at once",
      },
      {
        id: "advancedOptions",
        name: "Advanced Options",
        description: "Page settings, quality options, metadata",
      },
    ],
  },
  {
    id: "pdfToDoc",
    name: "PDF to Document",
    icon: FileText,
    description: "Convert PDF files to editable documents",
    features: [
      {
        id: "advancedOptions",
        name: "Advanced Options",
        description: "OCR settings, format selection, page range",
      },
    ],
  },
  {
    id: "mergePdf",
    name: "Merge PDF",
    icon: FileText,
    description: "Merge multiple PDF files into one",
    features: [
      {
        id: "advancedOptions",
        name: "Advanced Options",
        description: "Page ranges, rotation, page numbers, split mode",
      },
    ],
  },
  {
    id: "compressPdf",
    name: "Compress PDF",
    icon: FileText,
    description: "Compress PDF files to reduce size",
    features: [
      {
        id: "advancedOptions",
        name: "Advanced Options",
        description: "Compression level, page range, remove metadata",
      },
    ],
  },
  {
    id: "scanner",
    name: "Document Scanner",
    icon: ScanLine,
    description: "Scan and enhance documents from images",
    features: [
      {
        id: "advancedOptions",
        name: "Advanced Options",
        description: "Auto-detect edges, filters, enhancement, batch processing",
      },
    ],
  },
  {
    id: "audioConvert",
    name: "Audio Convert",
    icon: FileAudio,
    description: "Convert audio files between formats",
    features: [
      {
        id: "highQuality",
        name: "High Quality Formats",
        description: "FLAC, WAV, and other lossless formats",
      },
      {
        id: "advancedOptions",
        name: "Advanced Options",
        description: "Bitrate, sample rate, codec selection",
      },
    ],
  },
  {
    id: "textToSpeech",
    name: "Text to Speech",
    icon: Type,
    description: "Convert text to spoken audio",
    features: [
      {
        id: "advancedOptions",
        name: "Advanced Options",
        description: "Voice selection, rate, pitch, volume control",
      },
    ],
  },
  {
    id: "speechToText",
    name: "Speech to Text",
    icon: Mic,
    description: "Convert audio to text transcription",
    features: [
      {
        id: "longAudio",
        name: "Long Audio Files",
        description: "Process audio files longer than 5 minutes",
      },
      {
        id: "advancedOptions",
        name: "Advanced Options",
        description: "Language selection, punctuation, timestamps",
      },
    ],
  },
  {
    id: "qrBarcode",
    name: "QR & Barcode",
    icon: QrCode,
    description: "Generate and scan QR codes and barcodes",
    features: [
      {
        id: "customDesign",
        name: "Custom Design",
        description: "Custom colors, logos, and styling",
      },
      {
        id: "batchGeneration",
        name: "Batch Generation",
        description: "Generate multiple codes at once",
      },
    ],
  },
  {
    id: "urlShortener",
    name: "URL Shortener",
    icon: Link2,
    description: "Shorten and manage URLs",
    features: [
      {
        id: "advancedOptions",
        name: "Advanced Options",
        description: "Custom short URLs, QR code generation, analytics",
      },
    ],
  },
  {
    id: "fileToZip",
    name: "File to ZIP",
    icon: Archive,
    description: "Convert multiple files into ZIP archives",
    features: [
      {
        id: "highCompression",
        name: "High Compression",
        description: "Maximum compression level (level 9)",
      },
      {
        id: "preserveStructure",
        name: "Preserve Folder Structure",
        description: "Maintain folder hierarchy in ZIP",
      },
      {
        id: "advancedOptions",
        name: "Advanced Options",
        description: "Custom compression settings and ZIP formats",
      },
    ],
  },
  {
    id: "pdfUnlockProtect",
    name: "PDF Unlock/Protect",
    icon: Lock,
    description: "Unlock, protect, and manage PDF passwords and permissions",
    features: [
      {
        id: "unlock",
        name: "Unlock PDF",
        description: "Remove password protection from PDFs",
      },
      {
        id: "protect",
        name: "Protect PDF",
        description: "Add password protection to PDFs",
      },
      {
        id: "changePassword",
        name: "Change Password",
        description: "Update existing PDF password",
      },
      {
        id: "ownerPassword",
        name: "Owner Password",
        description: "Set separate owner password for permissions control",
      },
      {
        id: "advancedPermissions",
        name: "Advanced Permissions",
        description: "Control printing, copying, editing, and other permissions",
      },
    ],
  },
  {
    id: "passwordGenerator",
    name: "Password Generator",
    icon: Lock,
    description: "Generate strong, secure passwords with customizable options",
    features: [
      {
        id: "customLength",
        name: "Custom Length",
        description: "Set password length from 4 to 128 characters",
      },
      {
        id: "characterTypes",
        name: "Character Types",
        description: "Choose uppercase, lowercase, numbers, and symbols",
      },
      {
        id: "securityOptions",
        name: "Security Options",
        description: "Exclude similar and ambiguous characters",
      },
    ],
  },
  {
    id: "passwordStrengthChecker",
    name: "Password Strength Checker",
    icon: Shield,
    description: "Check password strength and security",
    features: [
      {
        id: "basicCheck",
        name: "Basic Check",
        description: "Basic password strength analysis",
      },
      {
        id: "detailedAnalysis",
        name: "Detailed Analysis",
        description: "Comprehensive security checks and recommendations",
      },
      {
        id: "crackTimeEstimate",
        name: "Crack Time Estimate",
        description: "Estimated time to crack the password",
      },
    ],
  },
  {
    id: "ipLookup",
    name: "IP Address Lookup",
    icon: Globe,
    description: "Lookup IP address information and location",
    features: [
      {
        id: "basicInfo",
        name: "Basic Info",
        description: "IP address, country, and city information",
      },
      {
        id: "detailedInfo",
        name: "Detailed Info",
        description: "ISP, organization, timezone, and coordinates",
      },
      {
        id: "myIpLookup",
        name: "My IP Lookup",
        description: "Lookup your own IP address",
      },
    ],
  },
  {
    id: "whoisChecker",
    name: "Whois Checker",
    icon: Globe,
    description: "Check domain registration information",
    features: [
      {
        id: "basicInfo",
        name: "Basic Info",
        description: "Domain, registrar, and expiration date",
      },
      {
        id: "detailedInfo",
        name: "Detailed Info",
        description: "Name servers, status, and dates",
      },
      {
        id: "rawData",
        name: "Raw Data",
        description: "Complete raw Whois data",
      },
    ],
  },
  {
    id: "metadataRemover",
    name: "Metadata Remover",
    icon: FileImage,
    description: "Remove EXIF metadata and GPS data from images",
    features: [
      {
        id: "exifRemoval",
        name: "EXIF Removal",
        description: "Remove EXIF metadata from images",
      },
      {
        id: "gpsRemoval",
        name: "GPS Removal",
        description: "Remove GPS location data from images",
      },
      {
        id: "batchRemoval",
        name: "Batch Removal",
        description: "Remove metadata from multiple images at once",
      },
    ],
  },
  {
    id: "fakeEmailGenerator",
    name: "Fake Email Generator",
    icon: Mail,
    description: "Generate temporary email addresses",
    features: [
      {
        id: "basicGeneration",
        name: "Basic Generation",
        description: "Generate random temporary email addresses",
      },
      {
        id: "customDomain",
        name: "Custom Domain",
        description: "Use custom email domains",
      },
      {
        id: "emailHistory",
        name: "Email History",
        description: "View recently generated email addresses",
      },
    ],
  },
  {
    id: "websiteSecurityScore",
    name: "Website Security Score",
    icon: Shield,
    description: "Analyze website security configuration and generate security score",
    features: [
      {
        id: "basicCheck",
        name: "Basic Check",
        description: "Basic security checks and validation",
      },
      {
        id: "sslAnalysis",
        name: "SSL Analysis",
        description: "SSL/TLS certificate analysis",
      },
      {
        id: "securityHeaders",
        name: "Security Headers",
        description: "Check security headers configuration",
      },
      {
        id: "blacklistCheck",
        name: "Blacklist Check",
        description: "Check against blacklist databases",
      },
    ],
  },
  {
    id: "emailReputationChecker",
    name: "Email Reputation Checker",
    icon: Mail,
    description: "Analyze email address and domain security & trust level",
    features: [
      {
        id: "basicCheck",
        name: "Basic Check",
        description: "Basic email format and domain validation",
      },
      {
        id: "domainAnalysis",
        name: "Domain Analysis",
        description: "MX records, SPF, DKIM, DMARC checks",
      },
      {
        id: "breachCheck",
        name: "Breach Check",
        description: "Check email in known breach databases",
      },
    ],
  },
  {
    id: "phoneValidator",
    name: "Phone Validator",
    icon: Phone,
    description: "Validate phone number and detect risk indicators",
    features: [
      {
        id: "formatValidation",
        name: "Format Validation",
        description: "E.164 format validation and normalization",
      },
      {
        id: "carrierInfo",
        name: "Carrier Information",
        description: "Carrier name, line type, country detection",
      },
      {
        id: "spamCheck",
        name: "Spam & Abuse Check",
        description: "Check if reported as spam",
      },
    ],
  },
  {
    id: "dataBreachChecker",
    name: "Data Breach Checker",
    icon: Database,
    description: "Check whether email or domain has been exposed in known data breaches",
    features: [
      {
        id: "emailCheck",
        name: "Email Check",
        description: "Check email address in breach databases",
      },
      {
        id: "domainCheck",
        name: "Domain Check",
        description: "Check domain in breach databases",
      },
      {
        id: "detailedReport",
        name: "Detailed Report",
        description: "Detailed breach information and timeline",
      },
    ],
  },
  {
    id: "apiStatusChecker",
    name: "API Status Checker",
    icon: Server,
    description: "Analyze API endpoint health, performance, and security configuration",
    features: [
      {
        id: "connectivityCheck",
        name: "Connectivity Check",
        description: "DNS resolution, response time, status code",
      },
      {
        id: "securityAnalysis",
        name: "Security Analysis",
        description: "SSL, security headers, CORS configuration",
      },
      {
        id: "performanceMetrics",
        name: "Performance Metrics",
        description: "Response time, TTFB, availability status",
      },
    ],
  },
];

export default function FeatureManagement() {
  const router = useRouter();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openDropdowns, setOpenDropdowns] = useState({}); // { [toolId-featureId]: true }
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check admin authentication
    if (typeof window !== "undefined") {
      const isAuthenticated = sessionStorage.getItem("adminAuthenticated");
      if (isAuthenticated !== "true") {
        router.push("/admin/login");
        return;
      }
    }
    fetchSettings();
  }, [router]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings", {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      } else {
        toast.error("Failed to load settings");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const updateFeature = (toolId, featureId, value, isSubFeature = false) => {
    if (!settings) return;

    if (isSubFeature) {
      // For sub-features, store in advancedOptions object
      const advancedOptionsKey = `${toolId}_advancedOptions`;
      setSettings({
        ...settings,
        features: {
          ...settings.features,
          [toolId]: {
            ...settings.features?.[toolId],
            advancedOptions: {
              ...settings.features?.[toolId]?.advancedOptions,
              [featureId]: value,
            },
          },
        },
      });
    } else {
      setSettings({
        ...settings,
        features: {
          ...settings.features,
          [toolId]: {
            ...settings.features?.[toolId],
            [featureId]: value,
          },
        },
      });
    }
  };

  const toggleDropdown = (toolId, featureId) => {
    const key = `${toolId}-${featureId}`;
    setOpenDropdowns(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Prepare the settings object with only the features we want to save
      const settingsToSave = {
        features: settings.features,
      };

      console.log("Saving settings:", JSON.stringify(settingsToSave, null, 2));

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(settingsToSave),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Save failed:", data);
        toast.error(data.error || `Failed to save settings: ${response.status}`);
        return;
      }

      if (data.success) {
        toast.success("Feature settings saved successfully");
        setSettings(data.settings);
        // Clear cache so all pages get updated settings immediately
        queryClient.invalidateQueries({ queryKey: ["settings"] });
        queryClient.invalidateQueries({ queryKey: ["adminSettings"] });
      } else {
        console.error("Save failed:", data);
        toast.error(data.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(`Failed to save settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading feature settings...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("adminAuthenticated");
      router.push("/admin/login");
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white border-r border-border transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div>
                <h2 className="text-lg font-bold text-foreground">Admin Panel</h2>
                <p className="text-xs text-muted-foreground">ConvertMastery</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="ml-auto"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.active || router.pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-brand-sky/50 text-brand-navy font-semibold"
                    : "text-foreground hover:bg-muted/40"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        {sidebarOpen && (
          <div className="p-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-border sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Feature Management</h1>
                <p className="text-sm text-muted-foreground mt-1">Control which features are free or require sign-in</p>
              </div>
              <Button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save All Changes"}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Feature Access Control</h2>
            <span className="text-xs bg-brand-sky/60 text-purple-700 px-2 py-1 rounded">Real-time</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Checked = Free (anyone can use), Unchecked = Requires Sign-in (locked for anonymous users)
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Changes take effect immediately across the entire site
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {ALL_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const toolFeatures = settings?.features?.[tool.id] || {};

            return (
              <Card key={tool.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{tool.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tool.features.map((feature) => {
                      // Advanced Options with dropdown
                      if (feature.isDropdown && feature.subFeatures) {
                        const dropdownKey = `${tool.id}-${feature.id}`;
                        const isOpen = openDropdowns[dropdownKey] || false;
                        const advancedOptions = toolFeatures.advancedOptions || {};
                        
                        return (
                          <div key={feature.id} className="space-y-2">
                            <button
                              onClick={() => toggleDropdown(tool.id, feature.id)}
                              className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-border hover:border-primary/40 transition-all"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-sm font-medium text-foreground">
                                  {feature.name}
                                </span>
                                <span className="text-xs text-muted-foreground">({feature.subFeatures.length} options)</span>
                              </div>
                              {isOpen ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                            
                            {isOpen && (
                              <div className="ml-4 space-y-2 border-l-2 border-purple-200 pl-4">
                                {feature.subFeatures.map((subFeature) => {
                                  const isFree = advancedOptions[subFeature.id] ?? false;
                                  return (
                                    <label
                                      key={subFeature.id}
                                      className="flex items-center gap-3 p-2 bg-muted/40 rounded-lg border border-border hover:border-primary/40 cursor-pointer transition-all"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isFree}
                                        onChange={(e) => updateFeature(tool.id, subFeature.id, e.target.checked, true)}
                                        className="w-4 h-4 text-primary rounded focus:ring-purple-500"
                                      />
                                      <div className="flex-1">
                                        <span className="text-sm font-medium text-foreground block">
                                          {subFeature.name}
                                        </span>
                                        <p className="text-xs text-muted-foreground mt-0.5">{subFeature.description}</p>
                                      </div>
                                      <span
                                        className={`text-xs px-2 py-1 rounded font-medium ${
                                          isFree
                                            ? "bg-brand-sky text-brand-navy"
                                            : "bg-red-100 text-red-700"
                                        }`}
                                      >
                                        {isFree ? "Free" : "Sign-in Required"}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      // Regular features with checkbox
                      const isFree = toolFeatures[feature.id] ?? false;
                      return (
                        <label
                          key={feature.id}
                          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-border hover:border-primary/40 cursor-pointer transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={isFree}
                            onChange={(e) => updateFeature(tool.id, feature.id, e.target.checked)}
                            className="w-5 h-5 text-primary rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-foreground block">
                              {feature.name}
                            </span>
                            <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded font-medium ${
                              isFree
                                ? "bg-brand-sky text-brand-navy"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {isFree ? "Free" : "Sign-in Required"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        </main>
      </div>
    </div>
  );
}

