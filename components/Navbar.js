import { useState } from "react";
import { useRouter } from "next/router";
import NextImage from "next/image";
import { Button } from "./ui/button";
import { Menu, X } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <NextImage 
              src="/logo.png" 
              alt="ImageSwitch Logo" 
              width={40} 
              height={40}
              className="h-10 w-10"
            />
            <span className="font-bold text-xl">ImageSwitch</span>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/convert">
              <Button variant={currentPath === "/convert" ? "default" : "ghost"}>
                Convert
              </Button>
            </Link>
            <Link href="/compress">
              <Button variant={currentPath === "/compress" ? "default" : "ghost"}>
                Compress
              </Button>
            </Link>
            <Link href="/guide">
              <Button variant={currentPath === "/guide" ? "default" : "ghost"}>
                Guide
              </Button>
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t">
            <div className="flex flex-col py-4 space-y-2">
              <Link href="/convert" className="w-full">
                <Button
                  variant={currentPath === "/convert" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Convert
                </Button>
              </Link>
              <Link href="/compress" className="w-full">
                <Button
                  variant={currentPath === "/compress" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Compress
                </Button>
              </Link>
              <Link href="/guide" className="w-full">
                <Button
                  variant={currentPath === "/guide" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Guide
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

