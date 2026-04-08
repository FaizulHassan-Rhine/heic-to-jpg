import "../styles/globals.css";
import Head from "next/head";
import { Analytics } from "@vercel/analytics/next";
import { AuthContextProvider } from "../lib/authContext";
import { Toaster } from "react-hot-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import ScrollToTop from "../components/ScrollToTop";
import FloatingHermesButton from "../components/FloatingHermesButton";
import { settingsQueryKey } from "../lib/queries/settings";

// Create a client instance
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000, // 1 minute default
        cacheTime: 5 * 60 * 1000, // 5 minutes default
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: use singleton pattern to keep the same query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export default function App({ Component, pageProps }) {
  // Create queryClient on mount and reuse it
  const [queryClient] = useState(() => {
    if (typeof window === "undefined") {
      // Server: always make a new query client
      return makeQueryClient();
    } else {
      // Browser: use singleton pattern to keep the same query client
      if (!browserQueryClient) browserQueryClient = makeQueryClient();
      return browserQueryClient;
    }
  });

  // Prefetch settings as soon as the app mounts so they're cached before any tool page renders
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: settingsQueryKey,
      queryFn: async () => {
        const response = await fetch("/api/settings", { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
        const data = await response.json();
        if (!data.success) throw new Error("Failed to load settings");
        return data.settings;
      },
    });
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>
      <AuthContextProvider>
        <Component {...pageProps} />
        <FloatingHermesButton />
        <ScrollToTop />
        <Analytics />
        <Toaster position="top-center" toastOptions={{ duration: 3000, style: { zIndex: 9999 } }} />
      </AuthContextProvider>
    </QueryClientProvider>
  );
}
