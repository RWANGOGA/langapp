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

  // Home
  "home.hero.kicker": "One-to-one English",
  "home.hero.title": "Speak with precision.",
  "home.hero.lede":
    "Nile Language pairs you with a single verified tutor and builds the plan around your level, your goal and your timezone. No groups, no apps that guess — just lessons, feedback and a record of where the hours went.",
  "home.hero.ctaPrograms": "See programs and prices",
  "home.hero.ctaTutors": "Meet the tutors",
  "home.standard.kicker": "The standard",
  "home.standard.title": "What makes a lesson here different.",
  "home.feature.1.title": "Tutors clear eight checks before anyone studies with them.",
  "home.feature.1.body":
    "Identity, teaching credentials, tested English proficiency, references and an observed demo lesson — reviewed by staff. Approval is the only path to teaching here; nobody self-declares.",
  "home.feature.2.title": "Every hour is one-to-one.",
  "home.feature.2.body":
    "Your tutor prepares for your goal, not a room of mixed levels. Sessions land on a fixed weekly schedule in your own timezone.",
  "home.feature.3.title": "Progress is written down, not remembered.",
  "home.feature.3.body":
    "Your tutor records notes after each completed lesson. Learners see exactly how many of their planned sessions are done — a number calculated from real class history.",
  "home.cta.title": "Ready when you are.",
  "home.cta.body":
    "Create a free account, pick a program, and an approved tutor will be matched to you. Or bring your own classroom experience to a global roster of learners.",
  "home.cta.learn": "Start learning",
  "home.cta.teach": "Become a tutor",
} as const;

export type MessageKey = keyof typeof en;
export default en;
