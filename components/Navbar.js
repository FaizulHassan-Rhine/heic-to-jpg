import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import NextImage from "next/image";
import { Button } from "./ui/button";
import { Menu, X, ChevronDown, LogOut, Package } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../lib/authContext";
import AuthModal from "./AuthModal";

// Main menu categories (Image Tools and Document Tools)
const MAIN_CATEGORIES = [
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
    label: "Document Tools",
    paths: ["/doc-to-pdf", "/pdf-to-doc", "/scanner", "/merge-pdf", "/compress-pdf"],
    items: [
      { href: "/doc-to-pdf", label: "Doc to PDF", popular: true },
      { href: "/pdf-to-doc", label: "PDF to DOCX/TXT" },
      { href: "/merge-pdf", label: "Merge PDF" },
      { href: "/compress-pdf", label: "Compress PDF" },
      { href: "/scanner", label: "Document Scanner", popular: true },
    ],
  },
];

// Other Tools mega menu sections
const OTHER_TOOLS_SECTIONS = [
  {
    title: "Video Tools",
    paths: ["/video-convert", "/video-compress", "/video-trim"],
    items: [
      { href: "/video-convert", label: "Video Converter", popular: true },
      { href: "/video-compress", label: "Video Compressor" },
      { href: "/video-trim", label: "Video Trimmer" },
    ],
  },
  {
    title: "Audio Tools",
    paths: ["/audio-convert", "/text-to-speech", "/speech-to-text"],
    items: [
      { href: "/audio-convert", label: "Audio Converter" },
      { href: "/text-to-speech", label: "Text to Speech" },
      { href: "/speech-to-text", label: "Speech to Text", popular: true },
    ],
  },
  {
    title: "Utilities",
    paths: ["/qr-barcode", "/url-shortener"],
    items: [
      { href: "/qr-barcode", label: "QR & Barcode", popular: true },
      { href: "/url-shortener", label: "URL Shortener" },
    ],
  },
];

// All paths for "Other Tools" (for active state detection)
const OTHER_TOOLS_PATHS = OTHER_TOOLS_SECTIONS.flatMap(section => section.paths);

// Combined categories for mobile menu
const TOOL_CATEGORIES = [
  ...MAIN_CATEGORIES,
  {
    label: "Other Tools",
    paths: OTHER_TOOLS_PATHS,
    items: OTHER_TOOLS_SECTIONS.flatMap(section => section.items),
  },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();
  const currentPath = router.pathname;
  const { user, logOut, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering auth UI after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDropdownEnter = (label) => setOpenDropdown(label);
  const handleDropdownLeave = () => setOpenDropdown(null);

  const toggleMobileCategory = (label) => {
    setMobileExpanded((prev) => (prev === label ? null : label));
  };

  const handleSignOut = async () => {
    await logOut();
    setUserMenuOpen(false);
  };

  const userMenuRef = useRef(null);

  // Auto-close auth modal when user signs in
  useEffect(() => {
    if (user && authModalOpen) {
      setAuthModalOpen(false);
    }
  }, [user, authModalOpen]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  return (
    <>
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
            {/* Main Categories (Image Tools & Document Tools) */}
            {MAIN_CATEGORIES.map((category) => (
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
                    className="absolute top-full left-0 pt-1 w-64 z-50"
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
                              <span className="ml-2 px-1 py-0.5 text-[9px] font-semibold bg-orange-500 text-white rounded leading-none">
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

            {/* Other Tools - Mega Menu */}
            <div
              className="relative"
              onMouseEnter={() => handleDropdownEnter("Other Tools")}
              onMouseLeave={handleDropdownLeave}
            >
              <Button
                variant={OTHER_TOOLS_PATHS.includes(currentPath) ? "default" : "ghost"}
                className="flex items-center gap-1 text-sm"
                onClick={() =>
                  setOpenDropdown((prev) =>
                    prev === "Other Tools" ? null : "Other Tools"
                  )
                }
              >
                Other Tools
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${openDropdown === "Other Tools" ? "rotate-180" : ""
                    }`}
                />
              </Button>

              {openDropdown === "Other Tools" && (
                <div
                  className="absolute top-full right-0 pt-1 z-50"
                  onMouseEnter={() => handleDropdownEnter("Other Tools")}
                  onMouseLeave={handleDropdownLeave}
                >
                  <div className="bg-background border rounded-md shadow-lg overflow-hidden">
                    <div className="flex gap-0">
                      {OTHER_TOOLS_SECTIONS.map((section, index) => (
                        <div
                          key={section.title}
                          className={`${index > 0 ? "border-l" : ""} border-gray-200`}
                        >
                          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                              {section.title}
                            </h3>
                          </div>
                          <div className="min-w-[200px]">
                            {section.items.map((item) => (
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
                                    <span className="ml-2 px-1 py-0.5 text-[9px] font-semibold bg-orange-500 text-white rounded leading-none">
                                      Popular
                                    </span>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* My Orders - Only show when user is logged in */}
            {mounted && !loading && user && (
              <Link href="/my-orders">
                <Button
                  variant={currentPath === "/my-orders" ? "default" : "ghost"}
                  className="flex items-center gap-2 text-sm"
                >
                  <Package className="w-4 h-4" />
                  My Orders
                </Button>
              </Link>
            )}

            {/* Auth Buttons / User Menu */}
            {mounted && !loading && (
              <>
                {user ? (
                  <div className="relative" ref={userMenuRef}>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 text-sm"
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                    >
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || "User"}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                          {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                      <span className="hidden md:inline">{user.displayName || user.email?.split("@")[0]}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    {userMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-md shadow-lg z-50">
                        <div className="p-3 border-b">
                          <div className="font-semibold text-sm">{user.displayName || "User"}</div>
                          <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        </div>
                        <button
                          onClick={handleSignOut}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="default"
                    className="text-sm"
                    onClick={() => {
                      setAuthModalMode("signup");
                      setAuthModalOpen(true);
                    }}
                  >
                    Sign Up
                  </Button>
                )}
              </>
            )}
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
                              <span className="ml-2 px-1 py-0.5 text-[9px] font-semibold bg-orange-500 text-white rounded leading-none">
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

              {/* My Orders - Mobile - Only show when user is logged in */}
              {mounted && !loading && user && (
                <div className="border-t mt-2 pt-2">
                  <Link href="/my-orders" className="block">
                    <div
                      className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${currentPath === "/my-orders"
                        ? "text-primary bg-accent/50"
                        : "text-foreground hover:bg-accent/30"
                        }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Package className="w-4 h-4" />
                      My Orders
                    </div>
                  </Link>
                </div>
              )}

              {/* Mobile Auth */}
              {mounted && !loading && (
                <>
                  {user ? (
                    <div className="border-t mt-2 pt-2">
                      <div className="px-4 py-2">
                        <div className="flex items-center gap-3 mb-3">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName || "User"}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                              {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-sm">{user.displayName || "User"}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            handleSignOut();
                            setIsMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-accent/30 flex items-center gap-2 text-red-600 rounded"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t mt-2 pt-2 px-4 pb-2">
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => {
                          setAuthModalMode("signup");
                          setAuthModalOpen(true);
                          setIsMenuOpen(false);
                        }}
                      >
                        Sign Up
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

    </nav>

    {/* Auth Modal - rendered outside nav to avoid stacking context issues */}
    <AuthModal
      isOpen={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
      initialMode={authModalMode}
    />
    </>
  );
}
