import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import NextImage from "next/image";
import { Button } from "./ui/button";
import ThemeToggle from "./ThemeToggle";
import {
  Menu, X, ChevronDown, LogOut, Image, FileText, Video,
  Music, QrCode, Link2, Archive, Lock, Shield, Globe, Mail, Phone,
  Database, Server, FileImage, ScanLine, Type, Minimize2, Merge, Calculator, MapPin,
  Hash, Pipette, Braces, Binary, Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "../lib/authContext";
import AuthModal from "./AuthModal";
import { cn } from "@/lib/utils";
import {
  MAIN_CATEGORIES as MAIN_CATEGORIES_CONFIG,
  OTHER_TOOLS_SECTIONS as OTHER_TOOLS_SECTIONS_CONFIG,
  OTHER_TOOLS_PATHS,
} from "../lib/toolsConfig";

const ICON_MAP = {
  Image, FileText, Video, Music, QrCode, Link2, Archive, Lock, Shield, Globe,
  Mail, Phone, Database, Server, FileImage, ScanLine, Type, Minimize2, Merge, Calculator, MapPin,
  Hash, Pipette, Braces, Binary, Sparkles,
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

function TrendingBadge({ className }) {
  return (
    <span
      className={cn(
        "ml-auto px-2 py-0.5 text-[10px] font-semibold rounded-full leading-none flex-shrink-0",
        "bg-primary/10 text-primary border border-primary/15",
        className
      )}
    >
      Trending
    </span>
  );
}

function DropdownItem({ item, currentPath, onNavigate }) {
  const Icon = item.icon || FileText;
  const active = currentPath === item.href;

  return (
    <Link
      href={item.href}
      target={item.newTab ? "_blank" : undefined}
      rel={item.newTab ? "noopener noreferrer" : undefined}
    >
      <div
        className={cn(
          "px-4 py-2.5 cursor-pointer transition-all duration-150 text-sm flex items-center gap-3 group border-l-2",
          "focus-visible:outline-none",
          active
            ? "bg-brand-sky/40 dark:bg-accent border-primary font-medium text-foreground"
            : "border-transparent text-muted-foreground hover:bg-brand-sky/30 dark:hover:bg-accent/60 hover:border-brand-mid/40 hover:text-foreground"
        )}
        onClick={onNavigate}
      >
        <Icon
          className={cn(
            "w-4 h-4 flex-shrink-0 transition-colors",
            active ? "text-primary" : "text-muted-foreground group-hover:text-primary"
          )}
        />
        <span className="flex-1 whitespace-nowrap">{item.label}</span>
        {item.popular && <TrendingBadge />}
      </div>
    </Link>
  );
}

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
  const userMenuRef = useRef(null);

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

  useEffect(() => {
    if (user && authModalOpen) {
      setAuthModalOpen(false);
    }
  }, [user, authModalOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setOpenDropdown(null);
  }, [currentPath]);

  return (
    <>
      <nav className="border-b border-border/80 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sticky top-0 z-50 shadow-sm shadow-brand-navy/5">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-3">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <NextImage
                src="/logo.png"
                alt="ConvertMastery Logo"
                width={40}
                height={40}
                className="h-9 w-9 rounded-md"
                priority
              />
              <span className="font-bold text-lg tracking-tight text-foreground">
                Convert<span className="text-primary">Mastery</span>
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden lg:flex items-center gap-0.5">
              {MAIN_CATEGORIES.map((category) => {
                const isActive = category.paths.includes(currentPath);
                const isOpen = openDropdown === category.label;
                return (
                  <div
                    key={category.label}
                    className="relative"
                    onMouseEnter={() => handleDropdownEnter(category.label)}
                    onMouseLeave={handleDropdownLeave}
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "flex items-center gap-1 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring",
                        !isActive && isOpen && "bg-brand-sky/50 text-foreground dark:bg-accent",
                        !isActive && !isOpen && "text-muted-foreground hover:bg-brand-sky/40 hover:text-foreground dark:hover:bg-accent"
                      )}
                      onClick={() =>
                        setOpenDropdown((prev) =>
                          prev === category.label ? null : category.label
                        )
                      }
                      aria-expanded={isOpen}
                    >
                      {category.label}
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform duration-200",
                          isOpen && "rotate-180"
                        )}
                      />
                    </Button>

                    {isOpen && (
                      <div
                        className="absolute top-full left-0 pt-2 z-50"
                        onMouseEnter={() => handleDropdownEnter(category.label)}
                        onMouseLeave={handleDropdownLeave}
                      >
                        <div className="bg-card border border-border rounded-xl shadow-xl shadow-brand-navy/10 overflow-hidden min-w-[280px] animate-in fade-in-0 zoom-in-95 duration-150">
                          <div className="px-4 py-2.5 bg-brand-sky/40 dark:bg-muted/60 border-b border-border">
                            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                              {category.label}
                            </h3>
                          </div>
                          <div className="py-1.5">
                            {category.items.map((item) => (
                              <DropdownItem
                                key={item.href}
                                item={item}
                                currentPath={currentPath}
                                onNavigate={() => setOpenDropdown(null)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Other Tools mega menu */}
              <div
                className="relative"
                onMouseEnter={() => handleDropdownEnter("Other Tools")}
                onMouseLeave={handleDropdownLeave}
              >
                <Button
                  variant={OTHER_TOOLS_PATHS.includes(currentPath) ? "default" : "ghost"}
                  className={cn(
                    "flex items-center gap-1 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring",
                    !OTHER_TOOLS_PATHS.includes(currentPath) &&
                      openDropdown === "Other Tools" &&
                      "bg-brand-sky/50 text-foreground dark:bg-accent",
                    !OTHER_TOOLS_PATHS.includes(currentPath) &&
                      openDropdown !== "Other Tools" &&
                      "text-muted-foreground hover:bg-brand-sky/40 hover:text-foreground dark:hover:bg-accent"
                  )}
                  onClick={() =>
                    setOpenDropdown((prev) =>
                      prev === "Other Tools" ? null : "Other Tools"
                    )
                  }
                  aria-expanded={openDropdown === "Other Tools"}
                >
                  Other Tools
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      openDropdown === "Other Tools" && "rotate-180"
                    )}
                  />
                </Button>

                {openDropdown === "Other Tools" && (
                  <div
                    className="absolute top-full right-0 pt-2 z-50"
                    onMouseEnter={() => handleDropdownEnter("Other Tools")}
                    onMouseLeave={handleDropdownLeave}
                  >
                    <div className="bg-card border border-border rounded-xl shadow-xl shadow-brand-navy/10 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
                      <div className="flex gap-0">
                        {OTHER_TOOLS_SECTIONS.map((section, index) => (
                          <div
                            key={section.title}
                            className={cn(index > 0 && "border-l border-border")}
                          >
                            <div className="px-4 py-2.5 bg-brand-sky/40 dark:bg-muted/60 border-b border-border">
                              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                {section.title}
                              </h3>
                            </div>
                            <div
                              className={
                                section.title === "Security and Privacy"
                                  ? "min-w-[280px]"
                                  : "min-w-[220px]"
                              }
                            >
                              <div className="py-1.5">
                                {section.items.map((item) => (
                                  <DropdownItem
                                    key={item.href}
                                    item={item}
                                    currentPath={currentPath}
                                    onNavigate={() => setOpenDropdown(null)}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {mounted && !loading && (
                <div className="ml-1 flex items-center gap-1 border-l border-border pl-2">
                  <ThemeToggle />
                  {user ? (
                      <div className="relative" ref={userMenuRef}>
                        <Button
                          variant="ghost"
                          className="flex items-center gap-2 text-sm rounded-full focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setUserMenuOpen(!userMenuOpen)}
                          aria-expanded={userMenuOpen}
                        >
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName || "User"}
                              className="w-8 h-8 rounded-full ring-2 ring-brand-mid/30"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                              {user.displayName?.[0]?.toUpperCase() ||
                                user.email?.[0]?.toUpperCase() ||
                                "U"}
                            </div>
                          )}
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        {userMenuOpen && (
                          <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-xl shadow-brand-navy/10 z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
                            <div className="p-3 border-b border-border bg-brand-sky/30 dark:bg-muted/40">
                              <div className="font-semibold text-sm text-foreground truncate">
                                {user.displayName || "User"}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                            </div>
                            <button
                              onClick={handleSignOut}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-destructive/10 flex items-center gap-2 text-destructive transition-colors"
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
                        className="text-sm font-semibold"
                        onClick={() => {
                          setAuthModalMode("signup");
                          setAuthModalOpen(true);
                        }}
                      >
                        Sign Up Free
                      </Button>
                    )}
                </div>
              )}
            </div>

            {/* Mobile actions */}
            <div className="flex lg:hidden items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden border-t border-border max-h-[80vh] overflow-y-auto">
              <div className="flex flex-col py-2">
                {TOOL_CATEGORIES.map((category) => (
                  <div key={category.label}>
                    <button
                      onClick={() => toggleMobileCategory(category.label)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors rounded-none",
                        category.paths.includes(currentPath)
                          ? "text-primary bg-brand-sky/40 dark:bg-accent/50"
                          : "text-foreground hover:bg-brand-sky/25 dark:hover:bg-accent/30"
                      )}
                    >
                      {category.label}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform text-muted-foreground",
                          mobileExpanded === category.label && "rotate-180"
                        )}
                      />
                    </button>

                    {mobileExpanded === category.label && (
                      <div className="bg-brand-sky/15 dark:bg-muted/30 border-l-2 border-primary/25 ml-4 mb-1">
                        {category.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="block"
                            target={item.newTab ? "_blank" : undefined}
                            rel={item.newTab ? "noopener noreferrer" : undefined}
                          >
                            <div
                              className={cn(
                                "px-4 py-2.5 text-sm transition-colors flex items-center justify-between",
                                currentPath === item.href
                                  ? "text-primary font-medium bg-brand-sky/40 dark:bg-accent/40"
                                  : "text-muted-foreground hover:text-foreground hover:bg-brand-sky/25 dark:hover:bg-accent/20"
                              )}
                              onClick={() => setIsMenuOpen(false)}
                            >
                              <span>{item.label}</span>
                              {item.popular && <TrendingBadge className="ml-2" />}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
{mounted && !loading && (
                  <>
                    {user ? (
                      <div className="border-t border-border mt-2 pt-2">
                        <div className="px-4 py-2">
                          <div className="flex items-center gap-3 mb-3">
                            {user.photoURL ? (
                              <img
                                src={user.photoURL}
                                alt={user.displayName || "User"}
                                className="w-10 h-10 rounded-full ring-2 ring-brand-mid/30"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                                {user.displayName?.[0]?.toUpperCase() ||
                                  user.email?.[0]?.toUpperCase() ||
                                  "U"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-foreground truncate">
                                {user.displayName || "User"}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              handleSignOut();
                              setIsMenuOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-destructive/10 flex items-center gap-2 text-destructive rounded-lg transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-border mt-2 pt-3 px-4 pb-3">
                        <Button
                          variant="default"
                          className="w-full font-semibold"
                          onClick={() => {
                            setAuthModalMode("signup");
                            setAuthModalOpen(true);
                            setIsMenuOpen(false);
                          }}
                        >
                          Sign Up Free
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

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </>
  );
}
