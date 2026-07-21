import { useEffect } from "react";
import { useRouter } from "next/router";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import Link from "next/link";
import SEO from "../components/SEO";

/**
 * My Orders is retired — tools process on the fly and do not save files to MongoDB.
 */
export default function MyOrdersPage() {
  const router = useRouter();

  useEffect(() => {
    // Soft redirect after a short message is fine; keep page for old bookmarks
  }, [router]);

  return (
    <ToolPageShell containerClassName="max-w-2xl">
      <SEO
        title="Orders Not Stored"
        description="ConvertMastery processes files on the fly and does not save results to My Orders."
        url="/my-orders"
        noindex
      />
      <ToolPageHeader
        title="No saved orders"
        description="Files are processed on the fly and are not stored in a database. Download your results during your session — nothing is kept in My Orders."
      />
      <Card className="border border-border shadow-sm">
        <CardContent className="pt-6 pb-6 space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Use any tool, process your files, and download immediately. No account is required for core conversion and compression.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/convert">
              <Button>Open Image Converter</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </ToolPageShell>
  );
}
