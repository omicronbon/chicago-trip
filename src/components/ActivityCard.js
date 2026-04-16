// ActivityCard.js
// Renders one activity in the timeline.
// Height scales with hourSpan (multi-hour activities are taller).
// Category color shows as a left border.

import React from "react";

const CATEGORY_COLORS = {
  // Current
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

function ActivityCard({ activity, onToggleComplete, onEdit, tripMembers = [] }) {
  const bgColor = CATEGORY_COLORS[activity.category] || "#E0E0E0";

  // Calculate height based on hour span
  // Base height is 64px per hour, matching the timeline grid
  const cardHeight = "100%";

  return (
    <div
      className={`activity-card ${activity.completed ? "completed" : ""}`}
      style={{
        borderLeftColor: bgColor,
        minHeight: cardHeight,
        position: "relative",
      }}
    >
      {activity.confirmed && (
        <span style={{
          position: "absolute",
          top: -4,
          right: -4,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#4CAF50",
          color: "#FFFFFF",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
          lineHeight: 1,
        }}>✓</span>
      )}
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

          {activity.cost != null && (
            <p className="activity-cost">
              ${Number(activity.cost).toFixed(2)} • {tripMembers.find((m) => m.uid === activity.paidBy)?.displayName || "Unknown"}
            </p>
          )}
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
