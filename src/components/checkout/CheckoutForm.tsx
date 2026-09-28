"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import styles from "@/app/checkout/page.module.css";

const packageData = {
  starter: { id: "starter", name: "Starter (1-Month)", priceJPY: 8000, priceVND: 1400000, priceUSD: 55 },
  intensive: { id: "intensive", name: "Intensive (3-Month)", priceJPY: 20000, priceVND: 3500000, priceUSD: 140 },
  mastery: { id: "mastery", name: "Mastery (6-Month)", priceJPY: 36000, priceVND: 6300000, priceUSD: 250 },
};

const paymentMethods = [
  { id: "card", label: "Credit/Debit Card", icon: "💳", subLabel: "VISA, Mastercard, AMEX" },
  { id: "linepay", label: "LINE Pay", icon: "🟢", subLabel: "Japan" },
  { id: "paypay", label: "PayPay", icon: "🔴", subLabel: "Japan" },
  { id: "zalopay", label: "ZaloPay", icon: "🔵", subLabel: "Vietnam" },
  { id: "paypal", label: "PayPal", icon: "💙", subLabel: "International" },
];

export function CheckoutForm({ packageId }: { packageId: string }) {
  const router = useRouter();
  const [selectedPackage] = useState(() => packageData[packageId as keyof typeof packageData] || packageData.intensive);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    router.push("/dashboard");
  };

  return (
    <section className={`${styles.checkoutFormSection}`} aria-labelledby="checkout-title">
      <div className="container">
        <div className={`${styles.checkoutGrid}`}>
          <div className={`${styles.checkoutMain}`}>
            <h2 id="checkout-title" className={`${styles.sectionTitleMain}`}>2. Secure Payment Checkout</h2>

            <Card className={`${styles.orderSummary}`}>
              <h3 className={`${styles.summaryTitle}`}>Order Summary</h3>

              <div className={`${styles.summaryRow}`}>
                <span>Package: {selectedPackage.name}</span>
                <span className={`${styles.price}`}>¥{selectedPackage.priceJPY.toLocaleString()}</span>
              </div>

              <hr className={`${styles.summaryDivider}`} />

              <div className={`${styles.summaryRow}`}>
                <span>Price Summary in JPY</span>
                <span>¥{selectedPackage.priceJPY.toLocaleString()}</span>
              </div>
              <div className={`${styles.summaryRow}`}>
                <span>VND</span>
                <span>₫{selectedPackage.priceVND.toLocaleString()}</span>
              </div>
              <div className={`${styles.summaryRow}`}>
                <span>USD</span>
                <span>${selectedPackage.priceUSD}</span>
              </div>

              <hr className={`${styles.summaryDivider}`} />

              <h3 className={`${styles.summarySubtitle}`}>Payment Method</h3>

              <div className={`${styles.paymentMethods}`} role="radiogroup" aria-label="Select payment method">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`${styles.paymentMethod} ${paymentMethod === method.id ? styles.selected : ""}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={() => setPaymentMethod(method.id)}
                      className={`${styles.paymentRadio}`}
                    />
                    <div className={`${styles.paymentMethodContent}`}>
                      <span className={`${styles.paymentIcon}`}>{method.icon}</span>
                      <div className={`${styles.paymentDetails}`}>
                        <span className={`${styles.paymentLabel}`}>{method.label}</span>
                        <span className={`${styles.paymentSublabel}`}>{method.subLabel}</span>
                      </div>
                    </div>
                    <span className={`${styles.paymentCheck}`} aria-hidden="true">✓</span>
                  </label>
                ))}
              </div>

              <hr className={`${styles.summaryDivider}`} />

              <div className={`${styles.totalSection}`}>
                <div className={`${styles.totalRow}`}>
                  <span>Total to Pay</span>
                  <span className={`${styles.totalAmount}`}>
                    ¥{selectedPackage.priceJPY.toLocaleString()}
                    <span className={`${styles.totalAlts}`}>
                      (₫{selectedPackage.priceVND.toLocaleString()} / ${selectedPackage.priceUSD})
                    </span>
                  </span>
                </div>

                <div className={`${styles.guarantees}`}>
                  <div className={`${styles.guarantee}`}>
                    <span className={`${styles.guaranteeIcon}`}>🛡</span>
                    <strong>Secure Checkout</strong>
                  </div>
                  <div className={`${styles.guarantee}`}>
                    <span className={`${styles.guaranteeIcon}`}>🛡</span>
                    <strong>30-Day Money-Back Guarantee</strong>
                    <span>Satisfaction Guaranteed</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  onClick={handleSubmit}
                  variant="coral"
                  fullWidth
                  size="lg"
                  disabled={isProcessing}
                  className={`${styles.checkoutSubmit}`}
                >
                  {isProcessing ? "Processing..." : "Confirm & Pay Now"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}