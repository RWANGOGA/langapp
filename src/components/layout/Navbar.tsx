"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { Button } from "@/components/ui/Button";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/tutors", label: "Tutors" },
  { href: "/resources", label: "Resources" },
  { href: "/blog", label: "Blog" },
];

export function Navbar() {
  return (
    <header className="navbar">
      <div className="nav-inner">
        <Link href="/" className="nav-brand" aria-label="LinguaBridge Home">
          <div className="brand-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 40 34" fill="none" stroke="#2fb5a8" strokeWidth="2.5">
              <rect x="2" y="2" width="20" height="16" rx="5" stroke="#F2541B" />
              <rect x="16" y="12" width="20" height="16" rx="5" />
            </svg>
          </div>
          <span className="brand-name">Lingua<span>Bridge</span></span>
        </Link>

        <nav className="nav-links hidden md:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/checkout">
            <Button variant="coral" size="md">Get Started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}