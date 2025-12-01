import { useState } from "react";
import { Button } from "./ui/button";
import { Image, Menu, X } from "lucide-react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false); // Close menu after clicking
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">ImageSwitch</span>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => scrollToSection("how-it-works")}
            >
              How it Works
            </Button>
            <Button
              variant="ghost"
              onClick={() => scrollToSection("why-use-it")}
            >
              Why Use It
            </Button>
            <Button
              variant="default"
              onClick={() => scrollToSection("converter")}
            >
              Convert Now
            </Button>
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
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => scrollToSection("how-it-works")}
              >
                How it Works
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => scrollToSection("why-use-it")}
              >
                Why Use It
              </Button>
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={() => scrollToSection("converter")}
              >
                Convert Now
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

