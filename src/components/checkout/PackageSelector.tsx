"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import styles from "@/app/checkout/page.module.css";

interface Package {
  id: string;
  name: string;
  subtitle: string;
  priceJPY: number;
  priceVND: number;
  priceUSD: number;
  features: string[];
  popular?: boolean;
  ctaText: string;
}

const packages: Package[] = [
  {
    id: "starter",
    name: "Starter (1-Month)",
    subtitle: "Elegant Pricing",
    priceJPY: 8000,
    priceVND: 1400000,
    priceUSD: 55,
    features: ["1 Month Access", "Basic Features", "Email Support"],
    ctaText: "Subscribe",
  },
  {
    id: "intensive",
    name: "Intensive (3-Month)",
    subtitle: "Most Popular",
    priceJPY: 20000,
    priceVND: 3500000,
    priceUSD: 140,
    features: ["3 Months Access", "All Content", "Live Sessions", "Priority Support", "Progress Reports"],
    popular: true,
    ctaText: "Subscribe",
  },
  {
    id: "mastery",
    name: "Mastery (6-Month)",
    subtitle: "Best Value",
    priceJPY: 36000,
    priceVND: 6300000,
    priceUSD: 250,
    features: ["6 Months Access", "All Content", "Certification", "1-on-1 Mentoring", "Priority Support", "Custom Curriculum"],
    ctaText: "Subscribe",
  },
];

export function PackageSelector() {
  return (
    <section className={`${styles.packageSelector}`} aria-labelledby="packages-title">
      <div className="container">
        <h2 id="packages-title" className={`${styles.sectionTitleMain}`}>1. Select Your Learning Package</h2>

        <div className={`${styles.packagesGrid}`}>
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              variant={pkg.popular ? "popular" : "default"}
              className={`${styles.packageCard}`}
            >
              {pkg.popular && (
                <Badge variant="coral" className={`${styles.packageBadge}`}>POPULAR</Badge>
              )}

              <h3 className={`${styles.packageName}`}>{pkg.name}</h3>
              <p className={`${styles.packageSubtitle}`}>{pkg.subtitle}</p>

              <div className={`${styles.packagePrice}`}>
                <span className={`${styles.priceJPY}`}>¥{pkg.priceJPY.toLocaleString()}</span>
                <div className={`${styles.priceAlts}`}>
                  <span>₫{pkg.priceVND.toLocaleString()}</span>
                  <span>${pkg.priceUSD}</span>
                </div>
              </div>

              <ul className={`${styles.packageFeatures}`} role="list">
                {pkg.features.map((feature, index) => (
                  <li key={index} className={`${styles.packageFeature}`}>
                    <span className={`${styles.featureBullet}`} aria-hidden="true">◷</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link href={`/checkout?package=${pkg.id}`}>
                <Button
                  variant={pkg.popular ? "navy" : "coral"}
                  fullWidth
                  size="lg"
                  className={pkg.popular ? styles.packageBtnPopular : ""}
                >
                  {pkg.ctaText}
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}