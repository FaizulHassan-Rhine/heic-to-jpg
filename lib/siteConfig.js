export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://convertmastery.com";
export const SITE_NAME = "ConvertMastery";
export const SITE_EMAIL = "contact@convertmastery.com";
export const SITE_TWITTER = "@convertmastery";
export const SITE_LOGO = `${SITE_URL}/logo.png`;
export const SITE_OG_IMAGE = `${SITE_URL}/logo.png`;

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
