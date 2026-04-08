import Link from "next/link";
import { useRouter } from "next/router";
import { MessageSquare } from "lucide-react";

export default function FloatingHermesButton() {
  const router = useRouter();
  if (router.pathname === "/hermes-ai") return null;

  return (
    <Link
      href="/hermes-ai"
      className="fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-emerald-700 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
      aria-label="Open Hermes AI chat"
    >
      <MessageSquare className="h-5 w-5 shrink-0" />
      <span>Hermes AI</span>
    </Link>
  );
}
