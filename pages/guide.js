import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Zap, Shield, Download, FileImage, CheckCircle, ArrowRight, Users, Clock, Smartphone, Monitor } from "lucide-react";
import { Button } from "../components/ui/button";
import Link from "next/link";
import { MAIN_CATEGORIES, OTHER_TOOLS_SECTIONS } from "../lib/toolsConfig";

export default function Guide() {
  const allCategoriesForGuide = [
    ...MAIN_CATEGORIES.map((cat) => ({ title: cat.label, items: cat.items })),
    ...OTHER_TOOLS_SECTIONS.map((sec) => ({ title: sec.title, items: sec.items })),
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Documentation & Guide - All Tools Including AI"
        description="Complete guide to ConvertMastery: AI paraphraser, summarizer, email writer, image upscaler, plus image, video, document, PDF, security, and privacy tools."
        keywords="ConvertMastery guide, AI paraphraser, AI summarizer, AI email writer, AI image upscaler, file converter guide, HEIC converter, PDF tools, how to compress PDF"
        url="/guide"
      />
      <Navbar />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 space-y-24">
          {/* Hero Section */}
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Complete Guide to ConvertMastery
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Learn how to use our AI tools, file converters, PDF utilities, and privacy features — all free and privacy-first.
            </p>
          </div>

          {/* How It Works Section */}
          <section id="how-it-works" className="space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-bold">How It Works</h2>
              <p className="text-lg text-muted-foreground">
                Convert and compress your images in just a few simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Step 1 */}
              <Card className="border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-200">
                <CardContent className="pt-6 pb-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center font-bold text-2xl shadow-lg">
                      1
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-3">Select Input Format</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        Choose the format of your source images. We support HEIC (from iPhones), JPG, PNG, and WebP formats.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Badge variant="secondary" className="text-xs">HEIC</Badge>
                        <Badge variant="secondary" className="text-xs">JPG</Badge>
                        <Badge variant="secondary" className="text-xs">PNG</Badge>
                        <Badge variant="secondary" className="text-xs">WebP</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 2 */}
              <Card className="border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-200">
                <CardContent className="pt-6 pb-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center font-bold text-2xl shadow-lg">
                      2
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-3">Upload Your Images</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        Drag and drop your images or click to browse. You can upload multiple images at once. Each image will show a preview with its size and dimensions.
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <FileImage className="h-4 w-4" />
                        <span>Multiple files supported</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 3 */}
              <Card className="border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-200">
                <CardContent className="pt-6 pb-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center font-bold text-2xl shadow-lg">
                      3
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-3">Choose Output Format</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        Select your desired output format and quality setting. For conversion, choose between High-Res or Balanced quality. For compression, select percentage, ratio, or pixel dimensions.
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs text-primary">
                        <CheckCircle className="h-4 w-4" />
                        <span>Real-time size preview</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 4 */}
              <Card className="border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-200">
                <CardContent className="pt-6 pb-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center font-bold text-2xl shadow-lg">
                      4
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-3">Convert & Download</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        Click the convert/compress button and watch your images process in real-time. Once complete, download all processed images as a convenient ZIP file with a single click.
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs text-primary">
                        <Download className="h-4 w-4" />
                        <span>ZIP download available</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Instructions */}
            <div className="mt-12 grid md:grid-cols-2 gap-8">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    For Image Conversion
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="font-semibold">Supported Conversions:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>HEIC → JPG (High-Res or Balanced) or WebP (High-Res or Balanced)</li>
                      <li>JPG → WebP (High-Res or Balanced) or PNG (Lossless)</li>
                      <li>PNG → JPG (High-Res or Balanced) or WebP (High-Res or Balanced)</li>
                      <li>WebP → JPG (High-Res or Balanced) or PNG (Lossless)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold">Quality Settings:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li><strong>High-Res:</strong> Best quality (95% for JPG, 90% for WebP) - Larger file size</li>
                      <li><strong>Balanced:</strong> Good quality (80% for both) - Optimal balance</li>
                      <li><strong>Lossless:</strong> PNG format - No quality loss, larger files</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    For Image Compression
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="font-semibold">Compression Methods:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li><strong>Percentage:</strong> Resize by percentage (1-100%) - Maintains aspect ratio</li>
                      <li><strong>Ratio:</strong> Resize by ratio (0.1 to 1.0) - Proportional scaling</li>
                      <li><strong>Pixel Dimensions:</strong> Set specific width and height in pixels</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold">Features:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>See estimated file size before compression</li>
                      <li>View original and compressed sizes side-by-side</li>
                      <li>Maintains original image format</li>
                      <li>Batch process multiple images</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Why Use It Section */}
          <section id="why-use-it" className="space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-bold">Why Use ConvertMastery?</h2>
              <p className="text-lg text-muted-foreground">
                Everything you need to convert and compress images efficiently
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-200">
                <CardHeader>
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Lightning Fast</CardTitle>
                  <CardDescription className="text-base">
                    Convert or compress multiple images simultaneously with our optimized processing engine. No waiting in queues - your images are processed instantly.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Batch processing for multiple files</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Real-time progress tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Optimized algorithms for speed</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-200">
                <CardHeader>
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">100% Secure</CardTitle>
                  <CardDescription className="text-base">
                    Your privacy and security are our top priorities. All processing happens locally in your browser - your files never leave your device.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>No file uploads to servers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>No data storage or tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Complete privacy protection</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-200">
                <CardHeader>
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4">
                    <Download className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Multiple Formats</CardTitle>
                  <CardDescription className="text-base">
                    Support for all major image formats with flexible conversion options and quality settings. Perfect for any use case.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>HEIC, JPG, PNG, WebP support</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Customizable quality settings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Flexible compression options</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Additional Features */}
            <div className="grid md:grid-cols-2 gap-6 mt-12">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Free Forever
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    ConvertMastery is completely free to use with no hidden costs, registration requirements, or usage limits. Convert and compress as many images as you need, whenever you need.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    No Installation Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Works entirely in your web browser - no software downloads, no installations, no updates. Just open the website and start converting or compressing your images immediately.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* All Tools by Category */}
          <section id="all-tools" className="space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-bold">All Tools by Category</h2>
              <p className="text-lg text-muted-foreground">
                Quick links to every converter, compressor, and utility on ConvertMastery
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {allCategoriesForGuide.map((group) => (
                <Card key={group.title} className="border-2">
                  <CardHeader>
                    <CardTitle>{group.title}</CardTitle>
                    <CardDescription>
                      {group.items.length} tool{group.items.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="text-primary hover:underline font-medium"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center py-12">
            <Card className="border-2 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="pt-12 pb-12">
                <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Start converting and compressing your images now. It's free, fast, and secure.
                </p>
                <Link href="/convert">
                  <Button size="lg" className="min-w-[200px]">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

