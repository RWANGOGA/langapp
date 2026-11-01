import { apiGet } from "@/lib/api";

/**
 * Data shapes for tutor-authored exams.
 *
 * The backend serializes snake_case here because that is how its columns and
 * schemas are named, so these interfaces mirror it rather than prettify it: a
 * renamed field on the way in is a field that silently reads `undefined`.
 *
 * Two shapes carry the integrity rule of the whole feature. `LearnerQuestion`
 * has no `correct_index`, because the learner sits the paper without the key;
 * `TutorQuestion` does, because the tutor wrote it and has to see what they
 * wrote when they mark the paper.
 */

export type QuestionKind = "multiple_choice" | "written";

/** Derived server-side from the clock: never trusted from the client. */
export type ExamState = "available" | "in_progress" | "submitted" | "released" | "expired";

export interface LearnerExamRow {
  id: number;
  title: string;
  instructions: string | null;
  status: "published" | "closed";
  question_count: number;
  total_points: number;
  duration_minutes: number;
  due_at: string;
  state: ExamState;
  seconds_left: number;
}

export interface LearnerPaperList {
  exams: LearnerExamRow[];
}

export interface LearnerQuestion {
  id: number;
  position: number;
  type: QuestionKind;
  prompt: string;
  points: number;
  options: string[] | null;
}

export interface TutorQuestion extends LearnerQuestion {
  /** The answer key. Tutor-side only, by construction. */
  correct_index: number | null;
}

export interface LearnerPaper {
  exam_id: number;
  attempt_id: number | null;
  title: string;
  instructions: string | null;
  state: ExamState;
  status: string | null;
  expires_at: string | null;
  due_at: string;
  seconds_left: number;
  // Sizes of the paper, readable before it is opened: a cover page can say how
  // much is coming without handing out the prompts.
  question_count: number;
  total_points: number;
  duration_minutes: number;
  questions: LearnerQuestion[];
}

export interface LearnerAnswerDetail {
  question_id: number;
  prompt: string;
  type: QuestionKind;
  points: number;
  choice_index: number | null;
  chosen_option: string | null;
  text: string | null;
  awarded_points: number | null;
  feedback: string | null;
  /** The verdict on an objective answer; never which option was right. */
  correct: boolean | null;
}

export interface LearnerResult {
  exam_id: number;
  title: string;
  status: string;
  score: number;
  total_points: number;
  auto_score: number | null;
  manual_score: number | null;
  submitted_at: string | null;
  released_at: string | null;
  level_before: string | null;
  level_after: string | null;
  tutor_name: string | null;
  answers: LearnerAnswerDetail[];
}

export interface TutorAnswer {
  id: number;
  question_id: number;
  choice_index: number | null;
  text: string | null;
  awarded_points: number | null;
  feedback: string | null;
  correct: boolean | null;
}

export interface TutorAttempt {
  id: number;
  learner_id: number;
  /** Attempt status as the backend stores it: in_progress | submitted | released | expired. */
  status: string;
  started_at: string;
  expires_at: string;
  submitted_at: string | null;
  auto_score: number | null;
  manual_score: number | null;
  total_points: number | null;
  level_before: string | null;
  level_after: string | null;
  released_at: string | null;
  answers: TutorAnswer[];
}

export interface TutorExamItem {
  id: number;
  title: string;
  learner_id: number;
  learner_name: string;
  status: "published" | "closed";
  question_count: number;
  total_points: number;
  duration_minutes: number;
  due_at: string;
  created_at: string;
  attempt: TutorAttempt | null;
}

export interface TutorExamDetail {
  exam: TutorExamItem;
  questions: TutorQuestion[];
}

/** What the dashboard band receives: a count and the deadline nearest to going. */
export interface ExamsSummary {
  pending: number;
  dueAt: string | null;
}

/** Reply from every write action on either side. */
export interface ExamActionResult {
  exam_id: number;
  attempt_id: number | null;
  status: string;
  updated_at: string;
}

/** Submitting answers the objective total, because the learner is owed to know
 * the paper closed - but not which answers were right. */
export interface ExamSubmitResult extends ExamActionResult {
  attempt_id: number;
  auto_score: number | null;
  total_points: number | null;
}

// — Learner portal: uncached server reads, so a countdown is seeded from the
//   server clock on every render rather than from a cached page.

export async function getLearnerExams(): Promise<LearnerExamRow[]> {
  const data = await apiGet<LearnerPaperList>("/learner/exams");
  return data?.exams ?? [];
}

export async function getLearnerPaper(examId: string): Promise<LearnerPaper> {
  const paper = await apiGet<LearnerPaper>(`/learner/exams/${examId}`);
  if (!paper) throw new Error(`Exam ${examId} could not be read`);
  return paper;
}

export async function getLearnerResult(examId: string): Promise<LearnerResult> {
  const result = await apiGet<LearnerResult>(`/learner/exams/${examId}/result`);
  if (!result) throw new Error(`Result for exam ${examId} could not be read`);
  return result;
}
