import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Zap, Shield, Download } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center space-y-8 max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              ImageSwitch
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Convert and compress your images with ease. Free, fast, and secure.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link href="/convert">
                <Button size="lg" className="min-w-[200px]">
                  Convert Images
                </Button>
              </Link>
              <Link href="/compress">
                <Button size="lg" variant="outline" className="min-w-[200px]">
                  Compress Images
                </Button>
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-16">
              <Card className="border-2">
                <CardContent className="pt-6 pb-6 text-center">
                  <Zap className="h-8 w-8 text-primary mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">Fast Processing</h3>
                  <p className="text-sm text-muted-foreground">
                    Convert and compress multiple images simultaneously
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="pt-6 pb-6 text-center">
                  <Shield className="h-8 w-8 text-primary mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">100% Secure</h3>
                  <p className="text-sm text-muted-foreground">
                    All processing happens locally in your browser
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2 ">
                <CardContent className="pt-6 pb-6 text-center">
                  <Download className="h-8 w-8 text-primary mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">Multiple Formats</h3>
                  <p className="text-sm text-muted-foreground">
                    Support for HEIC, JPG, PNG, and WebP formats
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
