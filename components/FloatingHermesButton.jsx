import Link from "next/link";
import { useRouter } from "next/router";
import { MessageSquare } from "lucide-react";

export default function FloatingHermesButton() {
  const router = useRouter();
  if (router.pathname === "/hermes-ai") return null;

  return (
    <Link
      href="/hermes-ai"
      className="fixed bottom-5 left-4 z-40 flex items-center justify-center gap-2 rounded-full bg-primary p-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-primary-hover hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-brand-mid focus:ring-offset-2 dark:focus:ring-offset-background sm:bottom-6 sm:left-6 sm:px-4 sm:py-3"
      aria-label="Open Hermes AI chat"
    >
      <MessageSquare className="h-5 w-5 shrink-0" />
      <span className="hidden sm:inline">Hermes AI</span>
    </Link>
  );
}
