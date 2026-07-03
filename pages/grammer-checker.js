import Head from "next/head";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function GrammerCheckerPage() {
  return (
    <>
      <Head>
        <title>Grammer Checker — ConvertMastery</title>
        <meta
          name="description"
          content="Fix grammar errors and paraphrase text with the embedded grammar correction tool."
        />
      </Head>

      <Navbar />

      <main className="min-h-[calc(100vh-64px)] bg-gray-100">
        <div className="w-full h-[calc(100vh-64px)]">
          <iframe
            src="https://grammar-tools.vercel.app/grammar"
            title="Grammer Checker"
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </main>

      <Footer />
    </>
  );
}
