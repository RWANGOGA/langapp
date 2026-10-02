import { apiGet } from "@/lib/api";
import {
  DEFAULT_TUTOR_REQUIREMENTS,
  type TutorRequirements,
} from "@/lib/tutor-requirements";

/** Public requirements loader for Server Components. */
export async function getTutorRequirements(): Promise<TutorRequirements> {
  try {
    return (await apiGet<TutorRequirements>("/tutor/requirements", {
      public: true,
      revalidate: 300,
    })) ?? DEFAULT_TUTOR_REQUIREMENTS;
  } catch {
    return DEFAULT_TUTOR_REQUIREMENTS;
  }
}