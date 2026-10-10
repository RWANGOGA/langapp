import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";

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
    <html lang="en">
      <body>
        <AuthProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
