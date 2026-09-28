"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

const steps = [
  { id: 1, label: "Personal Info", icon: "👤", completed: true },
  { id: 2, label: "Certifications (TEFL/TESOL)", icon: "2", completed: false, current: true },
  { id: 3, label: "Intro Video", icon: "3", completed: false },
  { id: 4, label: "Schedule Availability", icon: "4", completed: false },
];

const languageOptions = [
  { value: "english", label: "English" },
  { value: "japanese", label: "Japanese" },
  { value: "vietnamese", label: "Vietnamese" },
];

export function TutorApplicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="tutor-apply-layout">
      <header className="tutor-header">
        <div className="header-brand">
          <span className="brand-dot" aria-hidden="true">◍</span>
          EduGlobe Tutors
        </div>
        <nav className="header-nav" aria-label="Tutor dashboard navigation">
          <Link href="/tutor/dashboard" className="header-nav-link">Dashboard</Link>
          <Link href="/tutor/applications" className="header-nav-link active">Applications</Link>
          <Link href="/tutor/students" className="header-nav-link">My Students</Link>
          <Link href="/tutor/profile" className="header-nav-link">Profile</Link>
        </nav>
        <div className="header-user">
          <Avatar size="md" fallback="AR" gradient="amber" />
          <span>Alex R.</span>
        </div>
      </header>

      <main className="tutor-main">
        <div className="tutor-container">
          {children}
        </div>
      </main>
    </div>
  );
}

export function ProgressSteps() {
  return (
    <Card className="progress-steps-card">
      <h4 className="steps-title">Onboarding Progress</h4>
      <div className="steps-list" role="list" aria-label="Application progress steps">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`step-item ${step.completed ? "completed" : ""} ${step.current ? "current" : ""}`}
          >
            <div className={`step-dot ${step.completed ? "completed" : ""} ${step.current ? "current" : ""}`}>
              {step.completed ? "✔" : step.icon}
            </div>
            <span className="step-label">{step.label}</span>
            {step.completed && <span className="step-check" aria-hidden="true">✔</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function PersonalDetailsForm() {
  const [formData, setFormData] = useState({
    fullName: "Alex Rodriguez",
    nativeLanguage: "english",
    experienceYears: 5,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.type === "number" ? parseInt(e.target.value) || 0 : e.target.value,
    }));
  };

  return (
    <Card className="form-card">
      <h4 className="form-section-title">Personal Details</h4>

      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="fullName" className="form-label">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            className="form-input form-input-highlighted"
            autoComplete="name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="nativeLanguage" className="form-label">Native Language</label>
          <select
            id="nativeLanguage"
            name="nativeLanguage"
            value={formData.nativeLanguage}
            onChange={handleChange}
            className="form-input"
          >
            {languageOptions.map((lang) => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="experienceYears" className="form-label">Teaching Experience (years)</label>
          <input
            id="experienceYears"
            name="experienceYears"
            type="number"
            value={formData.experienceYears}
            onChange={handleChange}
            className="form-input"
            min="0"
            max="50"
          />
        </div>
      </div>
    </Card>
  );
}

export function QualificationsForm() {
  const [certFile, setCertFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const handleCertChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setCertFile(e.target.files[0]);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setVideoFile(e.target.files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("drag-over");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("drag-over");
  };

  const handleDrop = (e: React.DragEvent, type: "cert" | "video") => {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    if (e.dataTransfer.files[0]) {
      if (type === "cert") setCertFile(e.dataTransfer.files[0]);
      else setVideoFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <>
      <Card className="form-card">
        <h4 className="form-section-title">Qualifications</h4>
        <label htmlFor="certificate" className="form-label">Upload your TEFL/TESOL Certificate</label>
        <div
          className={`drop-zone ${certFile ? "has-file" : ""} ${certFile ? "" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "cert")}
        >
          <span className="drop-icon">📄</span>
          <span className="drop-text">
            {certFile
              ? `Selected: ${certFile.name} (${(certFile.size / 1024 / 1024).toFixed(2)} MB)`
              : "Drag & drop your certificate (PDF, JPG, PNG) max 5MB"}
          </span>
          <input
            id="certificate"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleCertChange}
            className="drop-input"
            disabled={!!certFile}
          />
          {!certFile && (
            <Button variant="ghost" size="sm" className="drop-btn">Choose File</Button>
          )}
        </div>
      </Card>

      <Card className="form-card">
        <h4 className="form-section-title">Video Intro Upload</h4>
        <label htmlFor="video" className="form-label">Upload Your Intro Video</label>
        <div
          className={`drop-zone ${videoFile ? "has-file" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "video")}
        >
          <span className="drop-icon">🎥</span>
          <span className="drop-text">
            {videoFile
              ? `Selected: ${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(2)} MB)`
              : "Upload your short introduction video (MP4, MOV) max 100MB"}
          </span>
          <input
            id="video"
            type="file"
            accept=".mp4,.mov"
            onChange={handleVideoChange}
            className="drop-input"
            disabled={!!videoFile}
          />
          {!videoFile && (
            <Button variant="ghost" size="sm" className="drop-btn">Select Video</Button>
          )}
        </div>
      </Card>
    </>
  );
}

export function SubmitButton() {
  return (
    <div className="submit-section">
      <Button variant="coral" size="lg" fullWidth className="submit-btn">
        Submit Application
        <small>Continue to Intro Video</small>
      </Button>
    </div>
  );
}