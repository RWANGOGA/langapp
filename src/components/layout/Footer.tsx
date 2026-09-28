import Link from "next/link";

const footerLinks = {
  product: [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/tutors", label: "Tutors" },
    { href: "/resources", label: "Resources" },
  ],
  company: [
    { href: "/about", label: "About Us" },
    { href: "/blog", label: "Blog" },
    { href: "/careers", label: "Careers" },
    { href: "/press", label: "Press" },
  ],
  support: [
    { href: "/help", label: "Help Center" },
    { href: "/contact", label: "Contact" },
    { href: "/faq", label: "FAQ" },
    { href: "/terms", label: "Terms of Service" },
  ],
};

const socialLinks = [
  { href: "https://twitter.com", label: "Twitter", icon: "𝕏" },
  { href: "https://linkedin.com", label: "LinkedIn", icon: "in" },
  { href: "https://facebook.com", label: "Facebook", icon: "f" },
  { href: "https://instagram.com", label: "Instagram", icon: "📷" },
];

export function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="footer-brand-name" aria-label="LinguaBridge Home">
              Lingua<span>Bridge</span>
            </Link>
            <p className="footer-brand-text">
              Master fluent English with dedicated 1-on-1 tutors.
              Personalized lessons for learners in Japan and Vietnam.
            </p>
          </div>

          <nav className="footer-col" aria-label="Product">
            <h4 className="footer-col-title">Product</h4>
            {footerLinks.product.map((link) => (
              <Link key={link.href} href={link.href} className="footer-link">
                {link.label}
              </Link>
            ))}
          </nav>

          <nav className="footer-col" aria-label="Company">
            <h4 className="footer-col-title">Company</h4>
            {footerLinks.company.map((link) => (
              <Link key={link.href} href={link.href} className="footer-link">
                {link.label}
              </Link>
            ))}
          </nav>

          <nav className="footer-col" aria-label="Support">
            <h4 className="footer-col-title">Support</h4>
            {footerLinks.support.map((link) => (
              <Link key={link.href} href={link.href} className="footer-link">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">© {new Date().getFullYear()} LinguaBridge. All rights reserved.</p>
          <div className="footer-socials" role="list" aria-label="Social media">
            {socialLinks.map((social) => (
              <Link
                key={social.label}
                href={social.href}
                className="footer-social"
                aria-label={social.label}
                target="_blank"
                rel="noopener noreferrer"
              >
                {social.icon}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}