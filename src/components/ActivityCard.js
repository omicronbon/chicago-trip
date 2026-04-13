// ActivityCard.js
// Renders one activity row. Shows the time, emoji, title, and notes.
// Background color comes from the category (confirmed, travel, etc.).
// - Tap the checkbox to mark it done (strikethrough effect).
// - "Navigate" button opens Google Maps with the activity's address.
//
// The category-to-color mapping matches your original spreadsheet colors.

import React from "react";

// Maps category names to their background colors
const CATEGORY_COLORS = {
  confirmed: "#FFD966",   // Gold — pre-planned restaurants, tickets, shows
  new: "#FFEB3B",         // Bright yellow — activities added after initial plan
  romantic: "#FFEB3B",    // Same yellow — couple-specific activities
  travel: "#A8D5A2",      // Green — flights, check-in, logistics
  orange: "#FF9800",      // Orange — most recently added batch
  free: "#F9F9F9",        // Light gray — open slots, soft suggestions
};

// Converts "17:00" to "5:00 PM" for display
function formatTime(time24) {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12; // Convert 0 -> 12, 13 -> 1, etc.
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Opens Google Maps directions to the given address.
// On mobile, this launches the native Maps app.
function handleNavigate(address) {
  const encoded = encodeURIComponent(address);
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, "_blank");
}

function ActivityCard({ activity, onToggleComplete }) {
  const bgColor = CATEGORY_COLORS[activity.category] || "#F9F9F9";

  return (
    <div
      className={`activity-card ${activity.completed ? "completed" : ""}`}
      style={{ borderLeftColor: bgColor }}
    >
      {/* Left side: checkbox + content */}
      <div className="activity-main">
        {/* Checkbox to mark activity as done */}
        <button
          className="check-btn"
          onClick={() => onToggleComplete(activity.id)}
          aria-label={activity.completed ? "Mark incomplete" : "Mark complete"}
        >
          {activity.completed ? "✅" : "⬜"}
        </button>

        <div className="activity-content">
          {/* Time and title on the same line */}
          <div className="activity-header">
            <span className="activity-time">{formatTime(activity.time)}</span>
            <span className="activity-title">
              {activity.emoji} {activity.title}
            </span>
          </div>

          {/* Notes appear below, only if they exist */}
          {activity.notes && (
            <p className="activity-notes">{activity.notes}</p>
          )}
        </div>
      </div>

      {/* Navigate button — only shown if the activity has an address */}
      {activity.address && (
        <button
          className="nav-btn"
          onClick={() => handleNavigate(activity.address)}
          aria-label={`Navigate to ${activity.title}`}
        >
          📍
        </button>
      )}
    </div>
  );
}

export default ActivityCard;
