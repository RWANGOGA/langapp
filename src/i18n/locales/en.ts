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

  // Features
  "features.hero.kicker": "The approach",
  "features.hero.title": "Fluency, engineered.",
  "features.hero.lede":
    "Nile Language treats English as a system, not a scramble of apps and luck: one verified tutor, one measured goal, and a weekly cycle of live lessons, written feedback and recorded progress. Systems beat willpower.",
  "features.steps.kicker": "How it works",
  "features.steps.title": "Three decisions. Then you are learning.",
  "features.step.1.title": "Choose a program",
  "features.step.1.body": "Pick the duration that fits the next months of your life. Every program is one-to-one; nothing is shared with a group.",
  "features.step.2.title": "Get matched",
  "features.step.2.body": "An approved tutor is assigned around your level, your goals and your timezone — and you are notified the moment it happens.",
  "features.step.3.title": "Learn, then measure",
  "features.step.3.body": "Live lessons on a fixed schedule. Notes land after each one. Your record shows exactly where the hours went.",
  "features.built.kicker": "What it takes",
  "features.built.title": "Built the way serious learning is built.",
  "features.feat.verification.label": "Verification",
  "features.feat.verification.title": "Tutors are vetted, not hired.",
  "features.feat.verification.body": "Before anyone teaches here, they clear an eight-step review: identity and credentials, English proficiency testing, and a live demo lesson observed before approval. You study with evidence, not profiles.",
  "features.feat.onetoone.label": "One to one",
  "features.feat.onetoone.title": "Every minute is yours.",
  "features.feat.onetoone.body": "A dedicated tutor. A syllabus shaped around the English you actually need — work, study, or moving somewhere new. No breakout rooms, no waiting for your turn.",
  "features.feat.clock.label": "Your clock",
  "features.feat.clock.title": "Lessons in your timezone, always.",
  "features.feat.clock.body": "Sessions are scheduled in UTC and rendered in your local time — Nairobi, Tokyo or Toronto. The countdown, the reminders and the calendar all agree on your clock, not the server's.",
  "features.feat.feedback.label": "Feedback",
  "features.feat.feedback.title": "Every lesson ends with notes.",
  "features.feat.feedback.body": "The moment a tutor closes a session, your personalized feedback — what worked, what to drill next — is written to your dashboard and sent as a notification. Not someday. After class.",
  "features.feat.rules.label": "Fair rules",
  "features.feat.rules.title": "A schedule that respects both sides.",
  "features.feat.rules.body": "Cancel well ahead and it is simply cancelled. Inside 24 hours, a reason is required so your tutor can plan. Miss a lesson and it is recorded as a no-show, not quietly erased.",
  "features.feat.access.label": "Access",
  "features.feat.access.title": "Pricing and payment that cross borders.",
  "features.feat.access.body": "Plans are published in USD with local equivalents, and checkout supports region-appropriate payment methods. Learning should not be gated by which bank you hold.",
  "features.proof.rating": "Average rating",
  "features.proof.reviews": "Learner reviews",
  "features.proof.certified": "Certified tutors",
  "features.proof.accredited": "Accredited",
  "features.faq.kicker": "Questions",
  "features.faq.title": "Answers before you ask.",
  "features.faq.1.q": "How are tutors approved?",
  "features.faq.1.a": "Every application passes identity and credential checks, an English proficiency test, and a demo lesson reviewed by our team. Only then can someone take learners.",
  "features.faq.2.q": "What happens if I need to cancel a lesson?",
  "features.faq.2.a": "More than 24 hours before the lesson, cancel freely from your dashboard. Inside 24 hours, give a reason — your tutor decides, and you will both see the record. Once a lesson has started it can no longer be cancelled.",
  "features.faq.3.q": "Where do I see my progress?",
  "features.faq.3.a": "Completed sessions, your current level and package status are recorded on your dashboard. Your tutor writes notes after every lesson, and they stay there.",
  "features.faq.4.q": "Which payment methods can I use?",
  "features.faq.4.a": "Checkout adapts to your region with locally relevant payment methods. Prices are shown in USD with local-currency equivalents on the pricing page.",
  "features.cta.title": "Start with one lesson.",
  "features.cta.body": "Choose a program, get matched with a verified tutor, and put the first session on the calendar this week.",
  "features.cta.choose": "Choose a program",
  "features.cta.account": "Create an account",
} as const;

export type MessageKey = keyof typeof en;
export default en;
