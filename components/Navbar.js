import { useState } from "react";
import { useRouter } from "next/router";
import NextImage from "next/image";
import { Button } from "./ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
import Link from "next/link";

// Tool categories with their pages
const TOOL_CATEGORIES = [
  {
    label: "Image Tools",
    paths: ["/convert", "/compress", "/image-to-pdf", "/extract-text"],
    items: [
      { href: "/convert", label: "Image Converter", popular: true },
      { href: "/compress", label: "Image Compressor", popular: true },
      { href: "/image-to-pdf", label: "Image to PDF" },
      { href: "/extract-text", label: "Extract Text (OCR)" },
    ],
  },
  {
    label: "Video Tools",
    paths: ["/video-convert", "/video-compress", "/video-trim"],
    items: [
      { href: "/video-convert", label: "Video Converter" },
      { href: "/video-compress", label: "Video Compressor" },
      { href: "/video-trim", label: "Video Trimmer" },
    ],
  },
  {
    label: "Document Tools",
    paths: ["/doc-to-pdf", "/pdf-to-doc", "/scanner", "/merge-pdf", "/compress-pdf"],
    items: [
      { href: "/doc-to-pdf", label: "Doc to PDF" },
      { href: "/pdf-to-doc", label: "PDF to DOCX/TXT" },
      { href: "/merge-pdf", label: "Merge PDF" },
      { href: "/compress-pdf", label: "Compress PDF" },
      { href: "/scanner", label: "Document Scanner" },
    ],
  },
  {
    label: "Audio Tools",
    paths: ["/audio-convert", "/text-to-speech", "/speech-to-text"],
    items: [
      { href: "/audio-convert", label: "Audio Converter" },
      { href: "/text-to-speech", label: "Text to Speech" },
      { href: "/speech-to-text", label: "Speech to Text" },
    ],
  },
  {
    label: "Other Tools",
    paths: ["/qr-barcode", "/url-shortener"],
    items: [
      { href: "/qr-barcode", label: "QR & Barcode" },
      { href: "/url-shortener", label: "URL Shortener" },
    ],
  },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const router = useRouter();
  const currentPath = router.pathname;

  const handleDropdownEnter = (label) => setOpenDropdown(label);
  const handleDropdownLeave = () => setOpenDropdown(null);

  const toggleMobileCategory = (label) => {
    setMobileExpanded((prev) => (prev === label ? null : label));
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <NextImage
              src="/logo.png"
              alt="ConvertMastery Logo"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <span className="font-bold text-xl">ConvertMastery</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-1">
            {TOOL_CATEGORIES.map((category) => (
              <div
                key={category.label}
                className="relative"
                onMouseEnter={() => handleDropdownEnter(category.label)}
                onMouseLeave={handleDropdownLeave}
              >
                <Button
                  variant={category.paths.includes(currentPath) ? "default" : "ghost"}
                  className="flex items-center gap-1 text-sm"
                  onClick={() =>
                    setOpenDropdown((prev) =>
                      prev === category.label ? null : category.label
                    )
                  }
                >
                  {category.label}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${openDropdown === category.label ? "rotate-180" : ""
                      }`}
                  />
                </Button>

                {openDropdown === category.label && (
                  <div
                    className="absolute top-full left-0 pt-1 w-52 z-50"
                    onMouseEnter={() => handleDropdownEnter(category.label)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    <div className="bg-background border rounded-md shadow-lg overflow-hidden">
                      {category.items.map((item) => (
                        <Link key={item.href} href={item.href}>
                          <div
                            className={`px-4 py-2.5 hover:bg-accent cursor-pointer transition-colors text-sm flex items-center justify-between ${currentPath === item.href
                              ? "bg-accent font-medium"
                              : ""
                              }`}
                            onClick={() => setOpenDropdown(null)}
                          >
                            <span>{item.label}</span>
                            {item.popular && (
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-orange-500 text-white rounded">
                                Popular
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <Link href="/guide">
              <Button
                variant={currentPath === "/guide" ? "default" : "ghost"}
                className="text-sm"
              >
                Guide
              </Button>
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
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
          <div className="lg:hidden border-t max-h-[80vh] overflow-y-auto">
            <div className="flex flex-col py-3">
              {TOOL_CATEGORIES.map((category) => (
                <div key={category.label}>
                  {/* Category Header */}
                  <button
                    onClick={() => toggleMobileCategory(category.label)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${category.paths.includes(currentPath)
                      ? "text-primary bg-accent/50"
                      : "text-foreground hover:bg-accent/30"
                      }`}
                  >
                    {category.label}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${mobileExpanded === category.label ? "rotate-180" : ""
                        }`}
                    />
                  </button>

                  {/* Category Items */}
                  {mobileExpanded === category.label && (
                    <div className="bg-accent/10 border-l-2 border-primary/20 ml-4">
                      {category.items.map((item) => (
                        <Link key={item.href} href={item.href} className="block">
                          <div
                            className={`px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${currentPath === item.href
                              ? "text-primary font-medium bg-accent/40"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/20"
                              }`}
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <span>{item.label}</span>
                            {item.popular && (
                              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-orange-500 text-white rounded">
                                Popular
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Guide */}
              <Link href="/guide" className="block">
                <div
                  className={`px-4 py-3 text-sm font-medium transition-colors ${currentPath === "/guide"
                    ? "text-primary bg-accent/50"
                    : "text-foreground hover:bg-accent/30"
                    }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Guide
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
