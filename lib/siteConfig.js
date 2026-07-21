export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://convertmastery.com";
export const SITE_NAME = "ConvertMastery";
export const SITE_EMAIL = "contact@convertmastery.com";
export const SITE_TWITTER = "@convertmastery";
export const SITE_LOGO = `${SITE_URL}/logo.png`;
export const SITE_OG_IMAGE = `${SITE_URL}/og-image.png`;

/** Navy palette — #0F2854 / #1C4D8D / #4988C4 / #BDE8F5 */
export const BRAND_COLORS = {
  navy: "#0F2854",
  primary: "#1C4D8D",
  mid: "#4988C4",
  sky: "#BDE8F5",
  success: "#0D9488",
  background: "#F5FBFD",
  surface: "#FFFFFF",
};

export const FOOTER_LINKS = {
  company: [
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
    { href: "/blog", label: "Blog & Guides" },
    { href: "/guide", label: "Documentation" },
  ],
  legal: [
    { href: "/privacy-policy", label: "Privacy Policy" },
    { href: "/terms-and-conditions", label: "Terms & Conditions" },
    { href: "/disclaimer", label: "Disclaimer" },
    { href: "/cookie-policy", label: "Cookie Policy" },
  ],
};
