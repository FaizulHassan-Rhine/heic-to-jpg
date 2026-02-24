import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Zap, Shield, Download, Image, Video, FileText, Music,
  ArrowRight, CheckCircle, Sparkles, Lock, Clock, Globe, User, Save, Star,
  FileImage, ScanLine, Type, Minimize2, Merge, QrCode, Link2, Archive,
  Mail, Phone, Database, Server, Calculator
} from "lucide-react";
import Link from "next/link";
import { MAIN_CATEGORIES, OTHER_TOOLS_SECTIONS } from "../lib/toolsConfig";

const ICON_MAP = {
  Image, FileText, Video, Music, QrCode, Link2, Archive, Lock, Shield, Globe,
  Mail, Phone, Database, Server, FileImage, ScanLine, Type, Minimize2, Merge, Calculator,
};

// Six categories for landing – each card links to first tool in that category
const LANDING_CATEGORIES = [
  ...MAIN_CATEGORIES.map((c) => ({ label: c.label, href: c.items[0].href, iconKey: c.items[0].iconKey })),
  ...OTHER_TOOLS_SECTIONS.map((s) => ({ label: s.title, href: s.items[0].href, iconKey: s.items[0].iconKey })),
];

export default function Home() {

  const features = [
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Process multiple files simultaneously with our optimized engine",
      gradient: "from-yellow-400 to-orange-500"
    },
    {
      icon: Shield,
      title: "100% Private & Secure",
      description: "All processing happens locally in your browser. Your files never leave your device",
      gradient: "from-green-400 to-emerald-500"
    },
    {
      icon: Download,
      title: "Universal Format Support",
      description: "Support for images, videos, documents, and audio in all major formats",
      gradient: "from-blue-400 to-cyan-500"
    },
    {
      icon: Lock,
      title: "No Upload Required",
      description: "Zero data transmission. Everything processes client-side for maximum privacy",
      gradient: "from-purple-400 to-pink-500"
    },
    {
      icon: Clock,
      title: "Batch Processing",
      description: "Convert or compress multiple files at once to save time",
      gradient: "from-indigo-400 to-blue-500"
    },
    {
      icon: Globe,
      title: "Works Everywhere",
      description: "No installation needed. Works on any device with a modern browser",
      gradient: "from-teal-400 to-green-500"
    },
  ];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://convertmastery.com";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "ConvertMastery",
    "description": "Free online file converter and compressor. Convert images, videos, documents, and audio. Security and privacy tools: password generator, IP lookup, whois, metadata remover, and more. Fast, secure, privacy-first.",
    "url": siteUrl,
    "applicationCategory": "UtilityApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "1250"
    },
    "featureList": [
      "Image Conversion & Compression",
      "Video Conversion, Compression & Trim",
      "Document Conversion, Merge, Compress, PDF Tools",
      "Audio Conversion, Text to Speech, Speech to Text",
      "Utilities: QR & Barcode, URL Shortener, File to ZIP",
      "Security and Privacy: Password Generator, IP Lookup, Whois, Metadata Remover, Fake Email, Security Score, Data Breach Checker, API Status",
      "Batch Processing",
      "Privacy-First Processing",
      "No File Size Limits"
    ]
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Free File Converter, Compressor & Privacy Tools - Images, Video, Document, Audio, Security"
        description="Convert and compress files for free. Image, video, document, and audio tools. Security and privacy: password generator, IP lookup, whois, metadata remover, fake email, URL shortener, QR code. HEIC, JPG, PNG, WebP, MP4, PDF, DOCX. Sign up to save files in My Orders."
        keywords="free file converter, image converter, video converter, document converter, audio converter, file compressor, HEIC converter, password generator, IP lookup, whois checker, metadata remover, fake email generator, URL shortener, QR code, PDF tools, security tools, privacy tools, online file tools"
        url="/"
        structuredData={structuredData}
      />
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-800 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />
          <div className="container mx-auto px-4 py-20 md:py-32 relative">
            <div className="text-center space-y-8 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Sparkles className="h-4 w-4" />
                <span>Professional File Conversion Suite</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
                  ConvertMastery
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
                Transform your files with our powerful, privacy-first conversion tools. 
                <span className="font-semibold text-slate-900 dark:text-white"> Free, fast, and secure.</span>
                <br />
                <span className="text-lg text-slate-500 dark:text-slate-400 mt-2 block">
                  <span className="font-semibold text-primary">Sign up</span> to unlock all premium features and save your converted files in <span className="font-semibold">My Orders</span> for easy access later.
                </span>
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
                <Link href="/convert">
                  <Button size="lg" className="min-w-[220px] h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
                    Start Converting
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/compress">
                  <Button size="lg" variant="outline" className="min-w-[220px] h-14 text-base font-semibold border-2">
                    Compress Files
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-8 mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">100% Free Forever</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">No File Size Limits</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Privacy-First Processing</span>
                </div>
              </div>
              
              {/* Sign Up CTA */}
              <div className="mt-8 p-4 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center justify-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <User className="h-4 w-4 text-primary" />
                  <span>
                    <span className="font-semibold">Sign up</span> to access all premium features, save files in <span className="font-semibold">My Orders</span>, and use advanced options like watermarking, custom file names, and more!
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tools Grid Section */}
        <section className="py-20 bg-white dark:bg-slate-900">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                All-in-One Conversion & Privacy Tools
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Convert images, videos, documents, and audio. Plus security, privacy, and utility tools—all in one place.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {LANDING_CATEGORIES.map((cat) => {
                const Icon = ICON_MAP[cat.iconKey] || FileText;
                return (
                  <Link key={cat.href} href={cat.href}>
                    <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg cursor-pointer group h-full">
                      <CardContent className="pt-6 pb-6 text-center">
                        <div className="text-green-600 mb-3 flex justify-center">
                          <Icon className="h-8 w-8 group-hover:scale-110 transition-transform" />
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                          {cat.label}
                        </h3>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Sign Up Benefits Section */}
        <section className="py-20 bg-gradient-to-br from-primary/5 via-white to-primary/5 dark:from-primary/10 dark:via-slate-900 dark:to-primary/10">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Unlock Premium Features with Free Sign Up
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Create a free account to access advanced features and save your files for later
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
              <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all">
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 mb-4">
                    <Save className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">
                    Save Files in My Orders
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    All your converted and compressed files are saved in your account. Access them anytime from "My Orders" and download again whenever you need.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all">
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 mb-4">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">
                    Access All Premium Features
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Unlock advanced options like watermarking, custom file names, format presets, target file sizes, and more premium conversion features.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all">
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 mb-4">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">
                    Track Your Usage
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Keep track of all your conversions and compressions. View your complete history and manage your files from one convenient dashboard.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-slate-50 dark:bg-slate-800/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Why Choose ConvertMastery?
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Built for professionals who value speed, security, and simplicity
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:shadow-lg transition-all group">
                    <CardContent className="pt-6 pb-6">
                      <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${feature.gradient} mb-4`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10">
          <div className="container mx-auto px-4">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 max-w-4xl mx-auto">
              <CardContent className="pt-12 pb-12 px-8 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                  Ready to Transform Your Files?
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-4 max-w-2xl mx-auto">
                  Join thousands of users who trust ConvertMastery for their file conversion needs. 
                  Start converting now - it's free and takes seconds.
                </p>
                <p className="text-base text-slate-500 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
                  <span className="font-semibold text-primary">Sign up for free</span> to unlock all premium features, save your files in <span className="font-semibold">My Orders</span>, and access advanced options like watermarking, custom file names, and format presets.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/convert">
                    <Button size="lg" className="min-w-[220px] h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
                      Get Started Free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/guide">
                    <Button size="lg" variant="outline" className="min-w-[220px] h-14 text-base font-semibold border-2">
                      View Documentation
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
