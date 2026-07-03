import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect } from "react";

const GA_ID = "G-5G6TFJY05K";

export default function GoogleAnalytics() {
  const router = useRouter();

  useEffect(() => {
    const onRouteChange = (url) => {
      window.gtag?.("config", GA_ID, { page_path: url });
    };

    router.events.on("routeChangeComplete", onRouteChange);
    return () => router.events.off("routeChangeComplete", onRouteChange);
  }, [router.events]);

  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
