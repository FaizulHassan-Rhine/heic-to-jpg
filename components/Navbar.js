import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import NextImage from "next/image";
import { Button } from "./ui/button";
import {
  Menu, X, ChevronDown, LogOut, Package, Image, FileText, Video,
  Music, QrCode, Link2, Archive, Lock, Shield, Globe, Mail, Phone,
  Database, Server, FileImage, ScanLine, Type, Minimize2, Merge, Calculator, MapPin
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "../lib/authContext";
import AuthModal from "./AuthModal";
import {
  MAIN_CATEGORIES as MAIN_CATEGORIES_CONFIG,
  OTHER_TOOLS_SECTIONS as OTHER_TOOLS_SECTIONS_CONFIG,
  OTHER_TOOLS_PATHS,
  TOOL_CATEGORIES as TOOL_CATEGORIES_CONFIG,
} from "../lib/toolsConfig";

const ICON_MAP = {
  Image, FileText, Video, Music, QrCode, Link2, Archive, Lock, Shield, Globe,
  Mail, Phone, Database, Server, FileImage, ScanLine, Type, Minimize2, Merge, Calculator, MapPin,
};

function withIcons(categories) {
  return categories.map((cat) => ({
    ...cat,
    items: cat.items.map((item) => ({
      ...item,
      icon: ICON_MAP[item.iconKey] || FileText,
    })),
  }));
}

function withIconsSections(sections) {
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      icon: ICON_MAP[item.iconKey] || FileText,
    })),
  }));
}

const MAIN_CATEGORIES = withIcons(MAIN_CATEGORIES_CONFIG);
const OTHER_TOOLS_SECTIONS = withIconsSections(OTHER_TOOLS_SECTIONS_CONFIG);
const TOOL_CATEGORIES = [
  ...MAIN_CATEGORIES,
  {
    label: "Other Tools",
    paths: OTHER_TOOLS_PATHS,
    items: OTHER_TOOLS_SECTIONS.flatMap((section) => section.items),
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
                  className={`flex items-center gap-1 text-sm transition-all duration-200 ${
                    openDropdown === category.label 
                      ? "bg-primary/10 text-slate-900 dark:text-slate-100" 
                      : "hover:bg-primary/5 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
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
                    className="absolute top-full left-0 pt-2 z-50"
                    onMouseEnter={() => handleDropdownEnter(category.label)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden backdrop-blur-sm transition-all duration-200 min-w-[280px]">
                      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          {category.label}
                        </h3>
                      </div>
                      <div className="py-1">
                        {category.items.map((item) => {
                          const Icon = item.icon || FileText;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              target={item.newTab ? "_blank" : undefined}
                              rel={item.newTab ? "noopener noreferrer" : undefined}
                            >
                              <div
                                className={`px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all duration-200 text-sm flex items-center gap-3 group border-l-2 ${
                                  currentPath === item.href
                                    ? "bg-slate-100 dark:bg-slate-800 border-primary font-medium text-slate-900 dark:text-slate-100"
                                    : "border-transparent text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 group-hover:text-slate-900 dark:group-hover:text-slate-100"
                                }`}
                                onClick={() => setOpenDropdown(null)}
                              >
                                <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
                                  currentPath === item.href 
                                    ? "text-primary" 
                                    : "text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                                }`} />
                                <span className="flex-1 whitespace-nowrap">{item.label}</span>
                                {item.popular && (
                                  <span className="ml-auto px-2 py-1 text-[10px] font-semibold bg-orange-400 text-white rounded-sm leading-none shadow-sm flex-shrink-0">
                                    Trending
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
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
                className={`flex items-center gap-1 text-sm transition-all duration-200 ${
                  openDropdown === "Other Tools" 
                    ? "bg-primary/10 text-slate-900 dark:text-slate-100" 
                    : "hover:bg-primary/5 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
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
                  className="absolute top-full right-0 pt-2 z-50"
                  onMouseEnter={() => handleDropdownEnter("Other Tools")}
                  onMouseLeave={handleDropdownLeave}
                >
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden backdrop-blur-sm animate-in fade-in-0 zoom-in-95 duration-200">
                    <div className="flex gap-0">
                      {OTHER_TOOLS_SECTIONS.map((section, index) => (
                        <div
                          key={section.title}
                          className={`${index > 0 ? "border-l border-slate-200 dark:border-slate-700" : ""}`}
                        >
                          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                              {section.title}
                            </h3>
                          </div>
                          <div className={section.title === "Security and Privacy" ? "min-w-[280px]" : "min-w-[220px]"}>
                            {section.items.map((item) => {
                              const Icon = item.icon || FileText;
                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  target={item.newTab ? "_blank" : undefined}
                                  rel={item.newTab ? "noopener noreferrer" : undefined}
                                >
                              <div
                                    className={`px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all duration-200 text-sm flex items-center gap-3 group border-l-2 ${
                                      currentPath === item.href
                                        ? "bg-slate-100 dark:bg-slate-800 border-primary font-medium text-slate-900 dark:text-slate-100"
                                        : "border-transparent text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 group-hover:text-slate-900 dark:group-hover:text-slate-100"
                                    }`}
                                    onClick={() => setOpenDropdown(null)}
                                  >
                                    <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
                                      currentPath === item.href 
                                        ? "text-primary" 
                                        : "text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                                    }`} />
                                    <span className="flex-1 whitespace-nowrap">{item.label}</span>
                                    {item.popular && (
                                      <span className="ml-auto px-2 py-1 text-[10px] font-semibold bg-orange-400 text-white rounded-sm leading-none flex-shrink-0 shadow-sm">
                                        Trending
                                      </span>
                                    )}
                                  </div>
                                </Link>
                              );
                            })}
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
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block"
                          target={item.newTab ? "_blank" : undefined}
                          rel={item.newTab ? "noopener noreferrer" : undefined}
                        >
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
                                Trending
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
