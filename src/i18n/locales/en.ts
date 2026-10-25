/**
 * English is the source of truth for every message. Other locales may be partial:
 * a key missing from the active locale falls back to this file, then to the raw
 * key, so switching is safe while the translations grow slice by slice.
 */
const en = {
  // Shared navigation
  "nav.home": "Home",
  "nav.features": "Features",
  "nav.pricing": "Pricing",
  "nav.tutors": "Tutors",
  "nav.resources": "Resources",
  "nav.blog": "Blog",
  "nav.tutorPortal": "Tutor Portal",
  "nav.admin": "Admin",

  // Account actions
  "actions.signIn": "Sign In",
  "actions.getStarted": "Get Started",
  "actions.logout": "Logout",
  "actions.loading": "Loading…",

  // Accessibility labels
  "a11y.mainNav": "Main",
  "a11y.portals": "Portals",
  "a11y.openMenu": "Open menu",
  "a11y.closeMenu": "Close menu",
  "a11y.mobileNav": "Mobile navigation",
  "a11y.footerNav": "Footer navigation",
  "a11y.changeLanguage": "Change language",

  // Footer
  "footer.terms": "Terms",
  "footer.privacy": "Privacy",
  "footer.contact": "Contact",
  "footer.rights": "© {year} Nile Language. All rights reserved.",
} as const;

export type MessageKey = keyof typeof en;
export default en;
