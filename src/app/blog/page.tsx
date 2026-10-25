import type { Metadata } from "next";
import BlogContent from "@/components/marketing/BlogContent";

export const metadata: Metadata = {
  title: "Journal | Nile Language",
  description: "Short, practical notes on learning English — written by the people who teach it.",
};

export default function BlogPage() {
  return <BlogContent />;
}
