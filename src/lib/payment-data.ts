import { apiGet } from "@/lib/api";

export interface PaymentSummary {
  status: string;
  package_name: string | null;
  subject: string | null;
  tier: string | null;
  started_at: string | null;
  expires_at: string | null;
  renews_at: string | null;
  amount: number | null;
  currency: string | null;
  fulfillment_status: string | null;
}

export async function getPaymentSummary(): Promise<PaymentSummary> {
  return (await apiGet<PaymentSummary>("/me/payment-summary")) ?? { status: "unpaid", package_name: null, subject: null, tier: null, started_at: null, expires_at: null, renews_at: null, amount: null, currency: null, fulfillment_status: null };
}
