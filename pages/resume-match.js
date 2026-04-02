import Head from "next/head";
import SEO from "../components/SEO";

export default function ResumeMatchPage() {
  return (
    <>
      <SEO
        title="Resume Match"
        url="/resume-match"
        description="Compare your resume with job descriptions and get AI-powered match insights, keyword gaps, and ATS improvement suggestions."
        keywords="resume match, ATS checker, resume score, job description match, resume keyword analyzer"
      />
      <Head>
        <title>Resume Match — ConvertMastery</title>
        <meta
          name="description"
          content="Check resume match score against job descriptions with AI-powered analysis."
        />
      </Head>

      <main className="h-screen bg-gray-100">
        <div className="w-full h-screen">
          <iframe
            src="https://match-resumes.vercel.app/"
            title="Resume Match"
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </main>
    </>
  );
}
