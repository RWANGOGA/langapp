"use client";

import styles from "./page.module.css";
import { DashboardLayout, TutorCard, UpcomingClass, Calendar, ProgressCard } from "@/components/dashboard/DashboardComponents";

export default function DashboardPage() {
  return (
    <div className={`${styles.dashboardLayout}`}>
      <DashboardLayout>
        <div className={`${styles.dashboardGrid}`}>
          <TutorCard
            name="Sarah J."
            avatar="SJ"
            gradient="default"
            location="USA"
            onBook={() => console.log("Book session")}
            onMessage={() => console.log("Message tutor")}
          />

          <UpcomingClass
            title="General English: Unit 7 - Conversation Practice"
            tutorName="Sarah J."
            tutorAvatar="SJ"
            tutorGradient="default"
            tutorLocation="USA"
            countdownSeconds={15 * 60 + 32}
            packageName="3-MONTH INTENSIVE PACKAGE"
            onJoinZoom={() => console.log("Join Zoom")}
            onJoinMeet={() => console.log("Join Meet")}
          />

          <Calendar
            currentMonth={4}
            currentYear={2024}
            highlightedDays={[18, 19]}
          />

          <ProgressCard
            percentage={72}
            label="OVERALL COURSE PROGRESS (Level B2)"
            completed={18}
            total={25}
          />
        </div>
      </DashboardLayout>
    </div>
  );
}