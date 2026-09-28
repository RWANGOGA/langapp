"use client";

import { useState, useEffect } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

const sidebarItems = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "tutors", label: "Tutors", icon: "👥" },
  { id: "curriculum", label: "Curriculum", icon: "📖" },
  { id: "community", label: "Community", icon: "👥" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

const upcomingClasses = [
  { day: "Tue 20", time: "20:00", title: "Unit 8 (Grammar)" },
  { day: "Thu 22", time: "19:30", title: "Vocabulary Workshop" },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="header-brand">
          <span className="brand-dot" aria-hidden="true">◍</span>
          <div>
            <div className="brand-name">Global English</div>
            <div className="brand-sub">Academy</div>
          </div>
        </div>
        <nav className="header-nav" aria-label="Dashboard navigation">
          <Link href="/dashboard" className="header-nav-link active">DASHBOARD</Link>
          <Link href="/courses" className="header-nav-link">COURSES</Link>
          <Link href="/resources" className="header-nav-link">RESOURCES</Link>
          <Link href="/progress" className="header-nav-link">MY PROGRESS</Link>
        </nav>
        <div className="header-actions">
          <span className="notification-bell" aria-label="Notifications">
            🔔
            <span className="notification-badge">3</span>
          </span>
          <Avatar size="md" fallback="KT" gradient="blue" />
          <div className="user-info">
            <div className="user-name">Kenji Tanaka</div>
            <div className="user-level">Level B2</div>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className="dashboard-sidebar" aria-label="Dashboard sections">
          {sidebarItems.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/${item.id}`}
              className={`sidebar-item ${item.id === "dashboard" ? "active" : ""}`}
            >
              <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </aside>

        <main className="dashboard-main" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}

interface TutorCardProps {
  name: string;
  avatar: string;
  gradient: "default" | "blue" | "amber" | "teal" | "pink";
  location: string;
  onBook?: () => void;
  onMessage?: () => void;
}

export function TutorCard({ name, avatar, gradient, location, onBook, onMessage }: TutorCardProps) {
  return (
    <Card className="tutor-card">
      <h3 className="tutor-card-title">My Tutor</h3>
      <Avatar size="xl" fallback={avatar} gradient={gradient} className="tutor-avatar" />
      <h4 className="tutor-name">{name}</h4>
      <p className="tutor-location">{location}</p>
      <div className="tutor-actions">
        <Button variant="outline" size="sm" onClick={onBook} fullWidth>Book New Session</Button>
        <Button variant="ghost" size="sm" onClick={onMessage} fullWidth>Message Tutor</Button>
      </div>
    </Card>
  );
}

interface UpcomingClassProps {
  title: string;
  tutorName: string;
  tutorAvatar: string;
  tutorGradient: "default" | "blue" | "amber" | "teal" | "pink";
  tutorLocation: string;
  countdownSeconds: number;
  packageName: string;
  onJoinZoom?: () => void;
  onJoinMeet?: () => void;
}

export function UpcomingClass({ title, tutorName, tutorAvatar, tutorGradient, tutorLocation, countdownSeconds, packageName, onJoinZoom, onJoinMeet }: UpcomingClassProps) {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const formatTime = (n: number) => String(n).padStart(2, "0");

  return (
    <Card className="upcoming-class-card">
      <h3 className="upcoming-title">My Upcoming Class</h3>
      <p className="upcoming-unit">{title}</p>

      <div className="upcoming-tutor-row">
        <div className="tutor-mini">
          <Avatar size="lg" fallback={tutorAvatar} gradient={tutorGradient} />
          <div>
            <strong>{tutorName}</strong>
            <small>{tutorLocation}</small>
          </div>
        </div>
        <div className="countdown-container">
          <div className="countdown-label">CLASS STARTS IN:</div>
          <div className="countdown-timer" aria-live="polite" aria-label={`Time until class starts: ${hours} hours, ${minutes} minutes, ${seconds} seconds`}>
            <span>{formatTime(hours)}</span>
            <span className="countdown-sep">:</span>
            <span>{formatTime(minutes)}</span>
            <span className="countdown-sep">:</span>
            <span>{formatTime(seconds)}</span>
          </div>
          <div className="countdown-units">
            <span>hr</span>
            <span>min</span>
            <span>sec</span>
          </div>
        </div>
      </div>

      <div className="upcoming-actions">
        <Button variant="coral" size="md" onClick={onJoinZoom} className="join-btn">
          Join Zoom Class
        </Button>
        <Button variant="outline" size="md" onClick={onJoinMeet} className="join-btn">
          Join Google Meet
        </Button>
      </div>

      <div className="upcoming-badges">
        <Badge variant="teal" className="package-badge">{packageName}</Badge>
        <span className="trophy" aria-hidden="true">🏅</span>
      </div>
    </Card>
  );
}

interface CalendarProps {
  currentMonth: number;
  currentYear: number;
  highlightedDays?: number[];
  onMonthChange?: (month: number, year: number) => void;
}

export function Calendar({ currentMonth = 4, currentYear = 2024, highlightedDays = [18], onMonthChange }: CalendarProps) {
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m: number, y: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);
  const prevMonthDays = getDaysInMonth(month === 0 ? 11 : month - 1, month === 0 ? year - 1 : year);

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    onMonthChange?.(month === 0 ? 11 : month - 1, month === 0 ? year - 1 : year);
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    onMonthChange?.(month === 11 ? 0 : month + 1, month === 11 ? year + 1 : year);
  };

  const renderDays = () => {
    const days = [];

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(<span key={`prev-${i}`} className="cal-day cal-day-other">{prevMonthDays - i}</span>);
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
      const isHighlighted = highlightedDays.includes(d);
      days.push(
        <span
          key={d}
          className={`cal-day ${isToday ? "cal-day-today" : ""} ${isHighlighted ? "cal-day-highlighted" : ""}`}
        >
          {d}
        </span>
      );
    }

    // Next month leading days
    const totalCells = firstDay + daysInMonth;
    const nextMonthDays = (7 - (totalCells % 7)) % 7;
    for (let d = 1; d <= nextMonthDays; d++) {
      days.push(<span key={`next-${d}`} className="cal-day cal-day-other">{d}</span>);
    }

    return days;
  };

  return (
    <Card className="calendar-card">
      <h3 className="calendar-title">
        Scheduled Classes
        <span className="calendar-icon" aria-hidden="true">📅</span>
      </h3>
      <div className="calendar-header">
        <button className="cal-nav" onClick={handlePrevMonth} aria-label="Previous month">‹</button>
        <span className="cal-month-year">{monthNames[month]} {year}</span>
        <button className="cal-nav" onClick={handleNextMonth} aria-label="Next month">›</button>
      </div>
      <div className="calendar-grid" role="grid" aria-label="Calendar">
        {dayNames.map((day) => (
          <div key={day} className="cal-day-name">{day}</div>
        ))}
        {renderDays()}
      </div>

      <hr className="calendar-divider" />

      <h4 className="upcoming-classes-title">Upcoming Classes</h4>
      <div className="upcoming-list">
        {upcomingClasses.map((cls, index) => (
          <div key={index} className="upcoming-class-item">
            {cls.day} | {cls.time} - {cls.title}
          </div>
        ))}
      </div>
    </Card>
  );
}

interface ProgressCardProps {
  percentage: number;
  label: string;
  completed: number;
  total: number;
}

export function ProgressCard({ percentage, label, completed, total }: ProgressCardProps) {
  return (
    <Card className="progress-card">
      <h3 className="progress-title">📈 Learning Progress</h3>
      <div className="progress-bar-container" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} progress: ${percentage}%`}>
        <div className="progress-bar" style={{ width: `${percentage}%` }}>
          <span className="progress-text">{percentage}%</span>
        </div>
      </div>
      <div className="progress-stats">
        <span><strong>{label}</strong></span>
        <span>Completed Units: {completed}/{total}</span>
      </div>
    </Card>
  );
}