"use client";

import styles from "./page.module.css";
import { TutorApplicationLayout, ProgressSteps, PersonalDetailsForm, QualificationsForm, SubmitButton } from "@/components/tutor/TutorApplicationComponents";

export default function TutorApplyPage() {
  return (
    <div className={`${styles.tutorApplyLayout}`}>
      <TutorApplicationLayout>
        <div className={`${styles.tutorApplyContainer}`}>
          <div className={`${styles.tutorApplyHeader}`}>
            <h2>Submit Your Tutor Application</h2>
            <p>Complete each step so we can verify your qualifications and match you with learners.</p>
          </div>

          <div className={`${styles.tutorApplyGrid}`}>
            <aside className={`${styles.tutorApplySidebar}`}>
              <ProgressSteps />
            </aside>

            <div className={`${styles.tutorApplyMain}`}>
              <PersonalDetailsForm />
              <QualificationsForm />
              <SubmitButton />
            </div>
          </div>
        </div>
      </TutorApplicationLayout>
    </div>
  );
}