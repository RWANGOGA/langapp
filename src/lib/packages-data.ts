import { apiGet } from "@/lib/api";

export type FeatureIcon = "clock" | "list" | "content" | "video" | "cert" | "mentor";
export interface Plan {
  id: "starter" | "intensive" | "mastery";
  name: string; months: number; popular?: boolean;
  price: { JPY: number; VND: number; USD: number };
  features: { icon: FeatureIcon; label: string }[];
}

const PLANS: Plan[] = [
  { id: "starter", name: "Starter (1-Month)", months: 1, price: { JPY: 8000, VND: 1400000, USD: 55 },
    features: [{ icon: "clock", label: "1 Month Access" }, { icon: "list", label: "Basic Features" }] },
  { id: "intensive", name: "Intensive (3-Month)", months: 3, popular: true, price: { JPY: 20000, VND: 3500000, USD: 140 },
    features: [{ icon: "clock", label: "3 Months Access" }, { icon: "content", label: "All Content" }, { icon: "video", label: "Live Sessions" }] },
  { id: "mastery", name: "Mastery (6-Month)", months: 6, price: { JPY: 36000, VND: 6300000, USD: 250 },
    features: [{ icon: "clock", label: "6 Months Access" }, { icon: "content", label: "All Content" }, { icon: "cert", label: "Certification" }, { icon: "mentor", label: "1-on-1 Mentoring" }] },
];

/** GET {API_URL}/api/packages (public). The plans live in the database; PLANS below is only a fallback. */
export async function getPlans(): Promise<Plan[]> {
  const data = await apiGet<Plan[]>("/packages", { public: true, revalidate: 600 });
  return data && data.length ? data : PLANS; // remove `PLANS` once the backend seed has run
}