import NextImage from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t bg-background mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <NextImage 
                src="/logo.png" 
                alt="ImageSwitch Logo" 
                width={40} 
                height={40}
                className="h-10 w-10"
              />
              <span className="font-bold">ImageSwitch</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Convert between HEIC, JPG, PNG, and WebP formats quickly and easily.
              Free, fast, and secure. Support for all major image formats.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/convert" className="hover:text-foreground transition-colors">
                  Convert
                </Link>
              </li>
              <li>
                <Link href="/compress" className="hover:text-foreground transition-colors">
                  Compress
                </Link>
              </li>
              <li>
                <Link href="/guide" className="hover:text-foreground transition-colors">
                  Guide
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Features</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Batch conversion</li>
              <li>Multiple formats</li>
              <li>High quality output</li>
              <li>No file size limits</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ImageSwitch. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

