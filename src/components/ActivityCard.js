// ActivityCard.js
// Renders one activity in the timeline.
// Height scales with hourSpan (multi-hour activities are taller).
// Category color shows as a left border.

import React from "react";

const CATEGORY_COLORS = {
  confirmed: "#FFD966",
  new: "#FFEB3B",
  romantic: "#FFEB3B",
  travel: "#A8D5A2",
  orange: "#FF9800",
  free: "#F9F9F9",
};

function formatTime(time24) {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function handleNavigate(address) {
  const encoded = encodeURIComponent(address);
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
    "_blank"
  );
}

const triggerHaptic = () => {
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
};

function ActivityCard({ activity, onToggleComplete, onEdit }) {
  const bgColor = CATEGORY_COLORS[activity.category] || "#F9F9F9";

  // Calculate height based on hour span
  // Base height is 64px per hour, matching the timeline grid
  const cardHeight = "100%";

  return (
    <div
      className={`activity-card ${activity.completed ? "completed" : ""}`}
      style={{
        borderLeftColor: bgColor,
        minHeight: cardHeight,
      }}
    >
      <div className="activity-main">
        <button
          className={`check-btn ${activity.completed ? "checked" : ""}`}
          onClick={() => {
            triggerHaptic();
            onToggleComplete();
          }}
          aria-label={activity.completed ? "Mark incomplete" : "Mark complete"}
        >
          {activity.completed && <span className="checkmark">✓</span>}
        </button>

        <div className="activity-content" onClick={onEdit} style={{ cursor: "pointer" }}>
          <div className="activity-header">
            <span className="activity-time">{formatTime(activity.time)}</span>
            <span className="activity-title">
              {activity.emoji} {activity.title}
            </span>
            {(activity.durationMinutes || 60) > 60 && (
              <span className="activity-duration">
                {activity.durationMinutes >= 60
                  ? `${activity.durationMinutes / 60}h`
                  : `${activity.durationMinutes}m`}
              </span>
            )}
          </div>

          {activity.notes && (
            <p className="activity-notes">{activity.notes}</p>
          )}
          {activity.createdBy && (
            <span style={{
              fontSize: "11px",
              color: "#666",
              fontStyle: "italic",
            }}>
              Added by {activity.createdBy.split("@")[0]}
            </span>
          )}
        </div>
      </div>

      {activity.address && (
        <button
          className="nav-btn"
          onClick={() => handleNavigate(activity.address)}
          aria-label={`Navigate to ${activity.title}`}
        >
          <span className="nav-icon">→</span>
        </button>
      )}
    </div>
  );
}

export default ActivityCard;
