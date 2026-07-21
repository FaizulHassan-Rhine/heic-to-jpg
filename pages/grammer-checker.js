import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";

export default function GrammerCheckerPage() {
  return (
    <ToolPageShell containerClassName="max-w-none" mainClassName="!px-0 !py-0 w-full">
      <div className="w-full h-[calc(100vh-4rem)]">
        <iframe
          src="https://grammar-tools.vercel.app/grammar"
          title="Grammer Checker"
          className="w-full h-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </ToolPageShell>
  );
}
