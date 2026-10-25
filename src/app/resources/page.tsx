import type { Metadata } from "next";
import ResourcesContent from "@/components/marketing/ResourcesContent";

export const metadata: Metadata = {
  title: "Practice | Nile Language",
  description: "Habits that do the heavy lifting between one-to-one English lessons.",
};

export default function ResourcesPage() {
  return <ResourcesContent />;
}
