import type { Metadata } from "next";
import { Archivo, Figtree, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import "@/components/portal/themes.css";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import BackLink from "@/components/layout/BackLink";

// Three display faces for the three portal design systems: a grotesque for the
// MIT-style admin, a serif for the Stanford-style tutor, a humanist sans for
// the learner. Each is exposed as a CSS variable and consumed by themes.css.
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  title: "Nile Language — Learn English with Dedicated 1-on-1 Tutors",
  description:
    "Personalized online English lessons with expert tutors, flexible scheduling, and clear progress.",
  keywords:
    "English tutoring, Japanese learners, Vietnamese learners, TOEIC prep, IELTS prep, online English classes, 1-on-1 tutoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${archivo.variable} ${sourceSerif.variable} ${figtree.variable}`}
    >
      <body>
        <LanguageProvider>
          <AuthProvider>
            <SiteHeader />
            {/* Public pages get the global back control; the portals and the
                applicant frame render their own so it is never doubled. */}
            <BackLink framed hiddenOn={["/dashboard", "/tutor", "/admin", "/tutors/*"]} />
            {children}
            <SiteFooter />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
