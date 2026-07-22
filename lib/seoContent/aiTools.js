import { PRIVACY_CLIENT_SIDE, PRIVACY_SERVER_SIDE } from "./shared";

const aiRelated = [
  { href: "/ai-paraphraser", label: "AI Paraphraser" },
  { href: "/ai-summarizer", label: "AI Summarizer" },
  { href: "/ai-email-writer", label: "AI Email Writer" },
  { href: "/ai-image-upscaler", label: "AI Image Upscaler" },
  { href: "/hermes-ai", label: "Hermes AI Chat" },
];

/** Dedicated SEO for ConvertMastery AI Tools category */
export const aiToolsSeo = {
  "ai-paraphraser": {
    id: "ai-paraphraser",
    path: "/ai-paraphraser",
    category: "AI Tools",
    categoryPath: "/ai-paraphraser",
    applicationCategory: "BusinessApplication",
    title: "Free AI Paraphraser & Rewriter Online – ConvertMastery",
    description:
      "Free AI paraphraser and text rewriter. Rewrite essays, emails, and blog drafts in formal, simple, or creative tones. No signup. Daily free quota on ConvertMastery.",
    h1: "AI Paraphraser / Rewriter",
    intro:
      "Rewrite text while keeping the meaning. Choose Standard, Formal, Simple, or Creative tone. Ideal for students, marketers, and professionals who need clearer wording fast. Free daily limit — no account required.",
    howToUse: [
      "Paste your original text (up to 6,000 characters).",
      "Pick a rewrite tone.",
      "Click Paraphrase, then copy the result.",
      "Review before publishing — AI can misread nuance.",
    ],
    supportedFormats: "Plain text (up to 6,000 characters per request).",
    privacySecurity: PRIVACY_SERVER_SIDE,
    useCases: [
      "Clarify blog drafts before publishing.",
      "Rewrite emails in a more formal tone.",
      "Simplify technical notes for a general audience.",
      "Create alternate wording for SEO drafts.",
    ],
    relatedTools: [
      { href: "/ai-summarizer", label: "AI Summarizer" },
      { href: "/ai-email-writer", label: "AI Email Writer" },
      { href: "/grammer-checker", label: "Grammar Checker" },
      { href: "/word-counter", label: "Word Counter" },
    ],
    faqs: [
      { q: "Is the AI paraphraser free?", a: "Yes. ConvertMastery offers a shared daily free quota per visitor. Limits reset every day." },
      { q: "Will paraphrasing change my meaning?", a: "The tool aims to preserve meaning, but you should always review AI output before publishing or submitting work." },
      { q: "Is this a plagiarism remover?", a: "It rewrites wording. It does not guarantee originality scores on third-party checkers." },
      { q: "Do I need an account?", a: "No. You can paraphrase without signing up." },
    ],
  },
  "ai-summarizer": {
    id: "ai-summarizer",
    path: "/ai-summarizer",
    category: "AI Tools",
    categoryPath: "/ai-paraphraser",
    applicationCategory: "BusinessApplication",
    title: "Free AI Summarizer – Summarize Text & PDF Online",
    description:
      "Free AI text and PDF summarizer. Extract PDF text in your browser, then summarize with AI. Short, medium, or detailed summaries on ConvertMastery.",
    h1: "AI Summarizer",
    intro:
      "Turn long articles, notes, and PDF text into clear summaries. PDF text is extracted locally in your browser first — only extracted text is sent for summarization, not the PDF file itself.",
    howToUse: [
      "Paste text, or upload a PDF to extract text locally.",
      "Choose short, medium, or detailed length.",
      "Click Summarize and copy the result.",
    ],
    supportedFormats: "Plain text or PDF with a selectable text layer. Scanned PDFs need OCR first.",
    privacySecurity: PRIVACY_SERVER_SIDE,
    useCases: [
      "Skim long articles and research notes.",
      "Summarize meeting notes for teammates.",
      "Get an overview of a text-based PDF report.",
      "Prepare study guides from lecture notes.",
    ],
    relatedTools: [
      { href: "/ai-paraphraser", label: "AI Paraphraser" },
      { href: "/extract-text", label: "Extract Text (OCR)" },
      { href: "/pdf-to-doc", label: "PDF to DOCX/TXT" },
      { href: "/word-counter", label: "Word Counter" },
    ],
    faqs: [
      { q: "Are PDFs uploaded to the AI?", a: "No. PDF text is extracted in your browser; only that text is sent for summarization." },
      { q: "What about scanned PDFs?", a: "Use Extract Text (OCR) first if the PDF has no selectable text layer." },
      { q: "Is summarization free?", a: "Yes, with a shared daily free AI quota per visitor." },
      { q: "How long can my text be?", a: "Up to about 6,000 characters per request." },
    ],
  },
  "ai-email-writer": {
    id: "ai-email-writer",
    path: "/ai-email-writer",
    category: "AI Tools",
    categoryPath: "/ai-paraphraser",
    applicationCategory: "BusinessApplication",
    title: "Free AI Email Writer – Draft Emails Online",
    description:
      "Free AI email writer. Describe your purpose, add key points, and generate a subject and body. Professional, friendly, formal, or casual tone on ConvertMastery.",
    h1: "AI Email Writer",
    intro:
      "Draft clear emails from a short purpose and optional bullet points. Choose professional, friendly, formal, or casual tone. Always review before sending — AI can invent details.",
    howToUse: [
      "Describe what the email should accomplish.",
      "Optionally add key points (one per line).",
      "Choose a tone and click Write email.",
      "Edit the subject and body, then copy.",
    ],
    supportedFormats: "Plain text prompts and bullet points.",
    privacySecurity: PRIVACY_SERVER_SIDE,
    useCases: [
      "Draft polite follow-ups after meetings.",
      "Write concise outreach or intro emails.",
      "Turn rough notes into a clear message.",
      "Prepare interview thank-you emails.",
    ],
    relatedTools: [
      { href: "/ai-paraphraser", label: "AI Paraphraser" },
      { href: "/grammer-checker", label: "Grammar Checker" },
      { href: "/ai-summarizer", label: "AI Summarizer" },
      { href: "/fake-email-generator", label: "Fake Email Generator" },
    ],
    faqs: [
      { q: "Should I send the draft as-is?", a: "No. Treat AI email as a starting point and edit for accuracy, names, and tone." },
      { q: "Is there a free limit?", a: "Yes. Free AI tools share a daily request quota per visitor." },
      { q: "Does it send email for me?", a: "No. It only drafts text for you to copy into your own mail client." },
    ],
  },
  "ai-image-upscaler": {
    id: "ai-image-upscaler",
    path: "/ai-image-upscaler",
    category: "AI Tools",
    categoryPath: "/ai-paraphraser",
    applicationCategory: "MultimediaApplication",
    title: "Free AI Image Upscaler – Enlarge Photos 2× Online",
    description:
      "Free AI image upscaler. Enlarge JPG, PNG, and WebP photos 2× with ESRGAN in your browser. Privacy-first — images stay on your device. ConvertMastery.",
    h1: "AI Image Upscaler",
    intro:
      "Enlarge images 2× with ESRGAN AI running locally in your browser. The first run downloads a small model. Large images are capped for speed and stability. Download a PNG when finished.",
    howToUse: [
      "Upload a JPG, PNG, or WebP image.",
      "Click Upscale 2× and wait for processing.",
      "Compare original vs result, then download the PNG.",
    ],
    supportedFormats: "Input: JPG, PNG, WebP. Output: PNG.",
    privacySecurity: PRIVACY_CLIENT_SIDE,
    useCases: [
      "Enlarge product photos for ecommerce listings.",
      "Improve small screenshots for presentations.",
      "Prepare images before further editing or print.",
      "Upsample low-resolution profile photos.",
    ],
    relatedTools: [
      { href: "/compress", label: "Image Compressor" },
      { href: "/convert", label: "Image Converter" },
      { href: "/background-remover", label: "Background Remover" },
      { href: "/sample-files", label: "Sample Files" },
    ],
    faqs: [
      { q: "Does upscaling upload my image?", a: "No. Upscaling runs in your browser; images are not uploaded to ConvertMastery servers." },
      { q: "What if the AI model fails to load?", a: "The tool falls back to a high-quality 2× resize so you still get a larger image." },
      { q: "Is the upscaler free?", a: "Yes. It runs fully in your browser with no paid API required." },
      { q: "Which scale is supported?", a: "2× enlargement (ESRGAN Slim)." },
    ],
  },
};

export { aiRelated };
