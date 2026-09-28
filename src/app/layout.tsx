import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinguaBridge — Master Fluent English with Dedicated 1-on-1 Tutors",
  description:
    "Personalized online English lessons tailored for learners in Japan and Vietnam. Native expert tutors, flexible scheduling, and proven results.",
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
      <body>{children}</body>
    </html>
  );
}
