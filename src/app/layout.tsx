import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import BackLink from "@/components/layout/BackLink";

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
    <html lang="en" data-scroll-behavior="smooth">
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
