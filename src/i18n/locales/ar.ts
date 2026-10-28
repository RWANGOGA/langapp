/**
 * Arabic (العربية) — a right-to-left locale. This first pass covers the
 * persistent chrome: navigation, the portal shells, account actions,
 * accessibility labels, the footer, and the shared notifications surface.
 * Any key still missing falls back to English (see LanguageProvider), so the
 * interface stays whole while the remaining content is translated slice by
 * slice. Interpolation placeholders ({year}, {n}, {unread}) are preserved
 * exactly as in the English source.
 */
const ar = {
  // Shared navigation
  "nav.home": "الرئيسية",
  "nav.features": "الميزات",
  "nav.pricing": "الأسعار",
  "nav.tutors": "المعلّمون",
  "nav.testimonials": "شهادات الطلاب",
  "nav.resources": "الموارد",
  "nav.blog": "المدوّنة",
  "nav.tutorPortal": "بوابة المعلّم",
  "nav.admin": "الإدارة",
  "nav.back": "رجوع",
  "nav.dashboard": "لوحة التحكم",
  "nav.overview": "نظرة عامة",
  "nav.myTutor": "معلّمي",
  "nav.progress": "التقدّم",
  "nav.notifications": "الإشعارات",
  "nav.applications": "الطلبات",
  "nav.messages": "الرسائل",
  "nav.students": "الطلاب",
  "nav.classes": "الحصص",
  "nav.meetings": "الاجتماعات",
  "nav.payments": "المدفوعات",
  "nav.subscriptions": "الاشتراكات",
  "nav.reports": "التقارير",
  "nav.settings": "الإعدادات",
  "nav.myLearners": "متعلّموك",
  "nav.schedule": "الجدول",
  "nav.lessonNotes": "ملاحظات الدروس",
  "nav.earnings": "الأرباح",

  "common.notSet": "غير مُحدَّد",

  // Account actions
  "actions.signIn": "تسجيل الدخول",
  "actions.getStarted": "ابدأ الآن",
  "actions.logout": "تسجيل الخروج",
  "actions.loading": "جارٍ التحميل…",

  // Accessibility labels
  "a11y.mainNav": "القائمة الرئيسية",
  "a11y.portals": "البوابات",
  "a11y.openMenu": "فتح القائمة",
  "a11y.closeMenu": "إغلاق القائمة",
  "a11y.mobileNav": "تنقّل الجوال",
  "a11y.footerNav": "تنقّل التذييل",
  "a11y.changeLanguage": "تغيير اللغة",

  // Footer
  "footer.terms": "الشروط",
  "footer.privacy": "الخصوصية",
  "footer.contact": "اتصل بنا",
  "footer.rights": "© {year} Nile Language. جميع الحقوق محفوظة.",

  // Portal shells
  "portal.learner": "بوابة المتعلّم",
  "portal.tutor": "بوابة المعلّم",
  "portal.admin": "الإدارة",
  "portal.aria.learner": "المتعلّم",
  "portal.aria.tutor": "المعلّم",
  "portal.aria.admin": "أقسام الإدارة",
  "portal.backToSite": "العودة إلى الموقع",
  "portal.openMenu": "فتح القائمة",
  "portal.closeMenu": "إغلاق القائمة",
  "portal.notifKicker": "صندوق الوارد",
  "portal.notifLoading": "جارٍ قراءة إشعاراتك…",
  "portal.notifEmptyBody": "ستظهر هنا التحديثات المتعلّقة بحسابك ودروسك والأشخاص الذين تتعامل معهم.",
  "portal.notificationsAria": "الإشعارات، {unread} غير مقروءة",
  "portal.level": "المستوى",
  "portal.levelNotSet": "غير مُحدَّد",
  "portal.administrator": "مسؤول",
  "portal.administration": "الإدارة",

  // Notifications surface
  "learner.notif.kicker": "تحديثات وتذكيرات",
  "learner.notif.title": "الإشعارات",
  "learner.notif.unreadOne": "يوجد {n} تحديث غير مقروء يحتاج إلى انتباهك.",
  "learner.notif.unreadOther": "لديك {n} تحديثات غير مقروءة تحتاج إلى انتباهك.",
  "learner.notif.caughtUp": "لا جديد لديك. سنخبرك عند وجود ما يحتاج إلى انتباهك.",
  "learner.notif.inboxStatus": "حالة صندوق الوارد",
  "learner.notif.unreadN": "{n} غير مقروء",
  "learner.notif.allCaught": "لا جديد",
  "learner.notif.totalUpdates": "إجمالي التحديثات",
  "learner.notif.emptyTitle": "لا جديد هنا",
  "learner.notif.emptyBody": "ستظهر هنا التحديثات المتعلّقة بمعلّمك ودروسك وحسابك.",
  "learner.notif.backToDash": "العودة إلى لوحة التحكم",
  "learner.notif.markRead": "تعليم كمقروء",

  // In-app lesson calls
  "call.title": "مكالمة الدرس",
  "call.join": "الانضمام إلى الدرس",
  "call.openRoom": "فتح غرفة داخل التطبيق",
  "call.roomOpened": "تم فتح الغرفة داخل التطبيق — تم إخطار متعلّمك.",
  "call.leave": "مغادرة",
  "call.mic": "كتم الميكروفون",
  "call.micOff": "إلغاء كتم الميكروفون",
  "call.cam": "إيقاف الكاميرا",
  "call.camOff": "تشغيل الكاميرا",
  "call.you": "أنت",
  "call.waiting": "في انتظار المشارك الآخر…",
  "call.connecting": "جارٍ الاتصال…",
  "call.connected": "متصل",
  "call.reconnecting": "جارٍ إعادة الاتصال…",
  "call.ended": "انتهت هذه المكالمة.",
  "call.back": "رجوع",
  "call.backToDashboard": "العودة إلى لوحة التحكم",
  "call.retry": "إعادة المحاولة",
  "call.permDenied": "لم نتمكن من الوصول إلى الميكروفون أو الكاميرا. اسمح بالوصول في متصفحك ثم أعد المحاولة.",
  "call.unavailable": "المكالمة غير متوفرة الآن.",
  "call.networkError": "لم نتمكن من الوصول إلى الخادم. تحقّق من اتصالك ثم أعد المحاولة.",
  "call.tryAgain": "حدث خطأ ما. يرجى إعادة المحاولة.",
  "call.notParticipant": "لا يمكنك الانضمام إلى هذه المكالمة.",
  "call.notParticipantBody": "يمكن فقط للمتعلّم والمعلّم المُسند إليهما هذا الدرس دخول غرفته.",
  "call.noRoom": "لم يتم فتح أي غرفة بعد.",
  "call.noRoomBody": "لم يفتح معلّمك غرفة داخل التطبيق لهذا الدرس بعد. تحقّق مرة أخرى عند اقتراب بداية الدرس.",
  "call.endedSession": "انتهى هذا الدرس.",
  "call.endedSessionBody": "الدروس التي أُلغيت أو اكتملت أو تخلّف عنها الحضور لم يعد لها غرفة للانضمام إليها.",
  "call.disabled": "المكالمات داخل التطبيق غير متوفرة هنا.",
  "call.disabledBody": "هذا الخادم غير مُهيّأ للمكالمات داخل التطبيق، لذا تُعقد الدروس عبر رابط اجتماع خارجي.",
};

export default ar;
