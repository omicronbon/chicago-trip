// ActivityCard.js
// Renders one activity in the timeline.
// Adapts content density to container size: short/narrow cards show only time + title,
// taller/wider cards progressively reveal cost and notes.
// Category color shows as a left border.

import React, { useRef, useEffect, useState } from "react";

const CATEGORY_COLORS = {
  "Food & Drinks": "#FF9800",
  "Activities": "#4A90D9",
  "Travel/Logistics": "#9E9E9E",
  // Legacy fallbacks
  "Eats": "#FF9800",
  "Confirmed": "#4A90D9",
  "New Addition": "#4A90D9",
  "Romantic": "#4A90D9",
  "User Addition": "#FF9800",
  "Free Time": "#9E9E9E",
};

// Intl formatters (locale-aware, cached at module level)
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
});

function formatTime(time24) {
  const [hours, minutes] = time24.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return timeFormatter.format(d);
}

function handleNavigate(address) {
  const encoded = encodeURIComponent(address);
  // noopener noreferrer prevents the new tab from accessing window.opener
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
    "_blank",
    "noopener,noreferrer"
  );
}

const triggerHaptic = () => {
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
};

function ActivityCard({ activity, onToggleComplete, onEdit, tripMembers = [] }) {
  const bgColor = CATEGORY_COLORS[activity.category] || "#E0E0E0";
  const cardRef = useRef(null);
  // Track card size to decide what content to show (progressive density)
  const [density, setDensity] = useState("full"); // "compact" | "medium" | "full"

  useEffect(() => {
    // Use ResizeObserver to reactively pick a density based on actual card size.
    // Thresholds:
    //   compact: height < 50px OR width < 180px — show time + title only
    //   medium:  height 50–90px                 — add cost
    //   full:    height > 90px                  — add notes
    if (!cardRef.current) return;
    const el = cardRef.current;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (height < 50 || width < 180) {
        setDensity("compact");
      } else if (height < 90) {
        setDensity("medium");
      } else {
        setDensity("full");
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const paidByMember = tripMembers.find((m) => m.uid === activity.paidBy);

  return (
    <div
      ref={cardRef}
      className={`activity-card ${activity.completed ? "completed" : ""} density-${density}`}
      style={{ borderLeftColor: bgColor }}
      onClick={onEdit}
    >
      {activity.confirmed && (
        <span className="activity-badge-confirmed" aria-label="Confirmed">
          <span aria-hidden="true">✓</span>
        </span>
      )}

      <div className="activity-main">
        <button
          type="button"
          className={`check-btn ${activity.completed ? "checked" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic();
            onToggleComplete();
          }}
          aria-label={activity.completed ? "Mark incomplete" : "Mark complete"}
          aria-pressed={activity.completed}
        >
          {activity.completed && <span className="checkmark" aria-hidden="true">✓</span>}
        </button>

        {/* Content area — keyboard users Tab here and press Enter to edit */}
        <button
          type="button"
          className="activity-content"
          aria-label={`Edit ${activity.title}`}
        >
          <div className="activity-title">
            {activity.emoji} {activity.title}
          </div>

          <div className="activity-meta">
            <span className="activity-time">{formatTime(activity.time)}</span>
            {density !== "compact" && (activity.durationMinutes || 60) > 60 && (
              <span className="activity-duration">
                {activity.durationMinutes >= 60
                  ? `${activity.durationMinutes / 60}h`
                  : `${activity.durationMinutes}m`}
              </span>
            )}
          </div>

          {density !== "compact" && activity.cost != null && (
            <p className="activity-cost">
              {currencyFormatter.format(Number(activity.cost))}
              {paidByMember && ` • ${paidByMember.displayName}`}
            </p>
          )}

          {activity.notes && (
            <p className="activity-notes">{activity.notes}</p>
          )}
        </button>
      </div>

      {activity.address && density !== "compact" && (
        <button
          type="button"
          className="nav-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleNavigate(activity.address);
          }}
          aria-label={`Navigate to ${activity.title}`}
        >
          <span className="nav-icon" aria-hidden="true">→</span>
        </button>
      )}
    </div>
  );
}

export default ActivityCard;
