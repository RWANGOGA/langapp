import type { Metadata } from "next";
import TutorPageShell from "@/components/tutor/TutorPageShell";
import PortalNotifications from "@/components/portal/PortalNotifications";

export const metadata: Metadata = { title: "Notifications | Tutor Portal" };

export default function TutorNotificationsPage() {
  return (
    <TutorPageShell>
      <PortalNotifications />
    </TutorPageShell>
  );
}
