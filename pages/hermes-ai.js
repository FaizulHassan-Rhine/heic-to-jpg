import SEO from "../components/SEO";

const CHAT_URL = "https://ai-chatbot-omega-flax-29.vercel.app/chat";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://convertmastery.com";

const pageDescription =
  "Hermes AI is ConvertMastery’s free AI chat assistant: streaming replies, conversational help, and knowledge-style answers in your browser. No download—open Hermes AI and start chatting instantly.";

const pageKeywords =
  "Hermes AI, AI chat, AI assistant, free AI chat, streaming chat, conversational AI, online chatbot, GPT chat, AI knowledge assistant, ConvertMastery AI, browser AI chat, ask AI";

export default function HermesAIPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${siteUrl}/hermes-ai#webapp`,
        name: "Hermes AI",
        description: pageDescription,
        url: `${siteUrl}/hermes-ai`,
        applicationCategory: "CommunicationApplication",
        operatingSystem: "Web Browser",
        browserRequirements: "Requires JavaScript. Modern browser recommended.",
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: [
          "Streaming AI chat responses",
          "Conversational assistant interface",
          "Browser-based—no install required",
          "Accessible from ConvertMastery",
        ],
        provider: {
          "@type": "Organization",
          name: "ConvertMastery",
          url: siteUrl,
        },
      },
      {
        "@type": "WebPage",
        "@id": `${siteUrl}/hermes-ai#webpage`,
        url: `${siteUrl}/hermes-ai`,
        name: "Hermes AI — Free AI Chat Assistant | ConvertMastery",
        description: pageDescription,
        isPartOf: {
          "@type": "WebSite",
          "@id": `${siteUrl}/#website`,
          name: "ConvertMastery",
          url: siteUrl,
        },
        about: { "@id": `${siteUrl}/hermes-ai#webapp` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${siteUrl}/logo.png`,
        },
      },
    ],
  };

  return (
    <>
      <SEO
        title="Hermes AI — Free AI Chat Assistant & Streaming AI"
        description={pageDescription}
        keywords={pageKeywords}
        url="/hermes-ai"
        structuredData={structuredData}
      />

      <main className="h-screen bg-background">
        <div className="h-full w-full">
          <iframe
            src={CHAT_URL}
            title="Hermes AI — AI chat assistant"
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allow="clipboard-read; clipboard-write; microphone"
          />
        </div>
      </main>
    </>
  );
}
