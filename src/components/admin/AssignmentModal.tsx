"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";
import styles from "./admin.module.css";

interface Student {
  id: number;
  name: string;
  email: string;
  isAssigned: boolean;
  currentTutorId?: number;
  currentTutorName?: string;
}

interface Tutor {
  id: number;
  name: string;
  email: string;
  rating: number;
  isApproved: boolean;
  specialties: string[];
}

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (studentId: number, tutorId: number) => Promise<void>;
  onUnassign: (studentId: number) => Promise<void>;
  students: Student[];
  tutors: Tutor[];
  selectedStudentId?: number;
  selectedTutorId?: number;
}

export function AssignmentModal({
  isOpen,
  onClose,
  onAssign,
  onUnassign,
  students,
  tutors,
  selectedStudentId,
  selectedTutorId,
}: AssignmentModalProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [tutorSearch, setTutorSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);

  // Filter students based on search
  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // Filter tutors based on search
  const filteredTutors = tutors.filter((tutor) =>
    tutor.name.toLowerCase().includes(tutorSearch.toLowerCase()) ||
    tutor.email.toLowerCase().includes(tutorSearch.toLowerCase())
  );

  // Initialize selection when component opens
  useEffect(() => {
    if (isOpen) {
      if (selectedStudentId) {
        const student = students.find((s) => s.id === selectedStudentId);
        if (student) setSelectedStudent(student);
      }
      if (selectedTutorId) {
        const tutor = tutors.find((t) => t.id === selectedTutorId);
        if (tutor) setSelectedTutor(tutor);
      }
    }
  }, [isOpen, selectedStudentId, selectedTutorId, students, tutors]);

  const handleAssign = async () => {
    if (!selectedStudent || !selectedTutor) {
      toast.error("Please select both a student and a tutor");
      return;
    }

    setIsAssigning(true);
    try {
      await onAssign(selectedStudent.id, selectedTutor.id);
      toast.success(`Assigned ${selectedStudent.name} to ${selectedTutor.name}`);
      onClose();
    } catch (error) {
      console.error("Assignment error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to assign student");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async () => {
    if (!selectedStudent) {
      toast.error("Please select a student");
      return;
    }

    if (!selectedStudent.isAssigned) {
      toast.error("Student is not currently assigned to a tutor");
      return;
    }

    setIsUnassigning(true);
    try {
      await onUnassign(selectedStudent.id);
      toast.success(`Unassigned ${selectedStudent.name} from tutor`);
      onClose();
    } catch (error) {
      console.error("Unassignment error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to unassign student");
    } finally {
      setIsUnassigning(false);
    }
  };

  const isCurrentlyAssigned = selectedStudent?.isAssigned && selectedStudent?.currentTutorId;

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <Card className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Manage Student-Tutor Assignment</h2>
          <button
            onClick={onClose}
            className={styles.modalCloseBtn}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {!isCurrentlyAssigned ? (
            // Assignment View
            <div className={styles.assignmentForm}>
              <div className={styles.formSection}>
                <Label htmlFor="student-search" className={styles.sectionLabel}>Select Student</Label>
                <div className={styles.searchWrapper}>
                  <Input
                    id="student-search"
                    placeholder="Search students..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                <div className={styles.optionsGrid}>
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`${styles.optionCard} ${selectedStudent?.id === student.id ? styles.optionCardSelected : ""}`}
                      onClick={() => setSelectedStudent(student)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedStudent(student);
                        }
                      }}
                      aria-selected={selectedStudent?.id === student.id}
                    >
                      <div className={styles.optionInfo}>
                        <span className={styles.optionName}>{student.name}</span>
                        <span className={styles.optionEmail}>{student.email}</span>
                      </div>
                      {student.isAssigned && (
                        <Badge variant="coral" className={styles.assignedBadge}>Assigned</Badge>
                      )}
                    </div>
                  ))}
                  {filteredStudents.length === 0 && (
                    <div className={styles.noOptions}>No students found</div>
                  )}
                </div>
              </div>

              <div className={styles.formSection}>
                <Label htmlFor="tutor-search" className={styles.sectionLabel}>Select Tutor</Label>
                <div className={styles.searchWrapper}>
                  <Input
                    id="tutor-search"
                    placeholder="Search tutors..."
                    value={tutorSearch}
                    onChange={(e) => setTutorSearch(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                <div className={styles.optionsGrid}>
                  {filteredTutors.map((tutor) => (
                    <div
                      key={tutor.id}
                      className={`${styles.optionCard} ${selectedTutor?.id === tutor.id ? styles.optionCardSelected : ""}`}
                      onClick={() => setSelectedTutor(tutor)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedTutor(tutor);
                        }
                      }}
                      aria-selected={selectedTutor?.id === tutor.id}
                    >
                      <div className={styles.optionInfo}>
                        <span className={styles.optionName}>{tutor.name}</span>
                        <span className={styles.optionEmail}>{tutor.email}</span>
                      </div>
                      <div className={styles.tutorMeta}>
                        <Badge variant="navy" className={styles.metaBadge}>Rating: {tutor.rating}</Badge>
                        {tutor.isApproved && (
                          <Badge variant="teal" className={styles.metaBadge}>Approved</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredTutors.length === 0 && (
                    <div className={styles.noOptions}>No tutors found</div>
                  )}
                </div>
              </div>

              <div className={styles.formActions}>
                <Button
                  onClick={handleAssign}
                  disabled={!selectedStudent || !selectedTutor || isAssigning}
                  className={styles.assignBtn}
                >
                  {isAssigning ? "Assigning..." : "Assign Student"}
                </Button>
              </div>
            </div>
          ) : (
            // Unassignment View
            <div className={styles.unassignmentView}>
              <div className={styles.currentAssignment}>
                <h3>Current Assignment</h3>
                <div className={styles.assignmentCard}>
                  <div className={styles.assignmentInfo}>
                    <span className={styles.assignmentLabel}>Student:</span>
                    <span className={styles.assignmentValue}>{selectedStudent.name}</span>
                  </div>
                  <div className={styles.assignmentInfo}>
                    <span className={styles.assignmentLabel}>Current Tutor:</span>
                    <span className={styles.assignmentValue}>{selectedStudent.currentTutorName}</span>
                  </div>
                  <div className={styles.assignmentInfo}>
                    <span className={styles.assignmentLabel}>Assignment Date:</span>
                    <span className={styles.assignmentValue}>{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className={styles.unassignmentActions}>
                <p className={styles.unassignmentWarning}>
                  Warning: This will remove the student's current tutor assignment. The student can be reassigned later.
                </p>
                <Button
                  onClick={handleUnassign}
                  disabled={isUnassigning}
                  variant="outline"
                  className={styles.unassignBtn}
                >
                  {isUnassigning ? "Unassigning..." : "Unassign Student"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
