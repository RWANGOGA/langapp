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

/** Wire shape returned by GET /packages. Prices are flat and snake_case. */
interface PackageDto {
  id: string;
  name: string;
  months: number;
  popular?: boolean;
  price_jpy: number;
  price_vnd: number;
  price_usd: number;
  features: unknown;
}

/** `features` has been stored both as a list and as a JSON string. Accept either. */
function normaliseFeatures(raw: unknown): { icon: FeatureIcon; label: string }[] {
  if (Array.isArray(raw)) return raw as { icon: FeatureIcon; label: string }[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as { icon: FeatureIcon; label: string }[];
    } catch {
      // fall through to empty
    }
  }
  return [];
}

function toPlan(dto: PackageDto): Plan {
  return {
    id: dto.id as Plan["id"],
    name: dto.name,
    months: dto.months,
    popular: dto.popular,
    // The API returns price_jpy/price_vnd/price_usd, not a nested `price`
    // object. Mapping here keeps every consumer reading plan.price.JPY and
    // makes the bundled fallback interchangeable with live data.
    price: {
      JPY: dto.price_jpy,
      VND: dto.price_vnd,
      USD: dto.price_usd,
    },
    features: normaliseFeatures(dto.features),
  };
}

/** GET {API_URL}/api/packages (public). The plans live in the database; PLANS below is only a fallback. */
export async function getPlans(): Promise<Plan[]> {
  try {
    const data = await apiGet<PackageDto[]>("/packages", { public: true, revalidate: 600 });
    if (data && data.length) return data.map(toPlan);
  } catch (err) {
    // apiGet throws on any non-2xx, so without this the bundled PLANS below
    // were unreachable and a backend blip took down every /checkout render.
    console.error("Could not load packages, using bundled plans:", err);
  }
  return PLANS;
}