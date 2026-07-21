import {
  Info, Mail, Shield, FileText, AlertTriangle, Cookie, Scale,
} from "lucide-react";

export const COMPANY_PAGES = [
  { href: "/about", label: "About Us", icon: Info, description: "Our mission and story" },
  { href: "/contact", label: "Contact", icon: Mail, description: "Get in touch with our team" },
  { href: "/blog", label: "Blog & Guides", icon: FileText, description: "Tips and tutorials" },
  { href: "/guide", label: "Documentation", icon: FileText, description: "Tool documentation" },
];

export const LEGAL_PAGES = [
  { href: "/privacy-policy", label: "Privacy Policy", icon: Shield, description: "Data, files & your rights" },
  { href: "/terms-and-conditions", label: "Terms & Conditions", icon: Scale, description: "Rules for using our tools" },
  { href: "/disclaimer", label: "Disclaimer", icon: AlertTriangle, description: "Limits & responsible use" },
  { href: "/cookie-policy", label: "Cookie Policy", icon: Cookie, description: "Cookies, ads & analytics" },
];

export const ALL_INFO_PAGES = [...COMPANY_PAGES, ...LEGAL_PAGES];
