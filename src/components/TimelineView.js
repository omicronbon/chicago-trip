import React, { useState, useEffect } from "react";
import ActivityCard from "./ActivityCard";

// Converts "17:00" to minutes from midnight (1020)
function timeToMinutes(time24) {
  const [h, m] = time24.split(":").map(Number);
  return h * 60 + m;
}

// Converts minutes from midnight to "5:00 PM" format
function formatHour(minutes) {
  const h = Math.floor(minutes / 60);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12} ${period}`;
}

const HOUR_HEIGHT = 80; // pixels per hour

export default function TimelineView({
  activities,
  tripDate,
  onToggleComplete,
  onEdit,
}) {
  const [now, setNow] = useState(new Date());

  // Update current time every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (activities.length === 0) {
    return (
      <div className="empty-state">No activities yet. Tap + to add one.</div>
    );
  }

  // Determine timeline range from activities
  const startMinutes = activities.reduce(
    (min, a) => Math.min(min, timeToMinutes(a.time)),
    Infinity
  );
  const endMinutes = activities.reduce((max, a) => {
    const end = timeToMinutes(a.time) + (a.durationMinutes || a.hourSpan * 60 || 60);
    return Math.max(max, end);
  }, 0);

  // Show full day: 6 AM to midnight (or later if activities run past)
  const timelineStart = Math.min(Math.floor(startMinutes / 60) * 60, 6 * 60);
  const timelineEnd = Math.max(Math.ceil(endMinutes / 60) * 60, 24 * 60);
  const totalHeight = ((timelineEnd - timelineStart) / 60) * HOUR_HEIGHT;

  // Generate hour labels
  const hours = [];
  for (let m = timelineStart; m <= timelineEnd; m += 60) {
    hours.push(m);
  }

  // Current time indicator
  const isToday =
    tripDate &&
    new Date(tripDate + "T00:00:00").toDateString() === now.toDateString();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine =
    isToday && nowMinutes >= timelineStart && nowMinutes <= timelineEnd;
  const nowOffset = ((nowMinutes - timelineStart) / 60) * HOUR_HEIGHT;

  return (
    <div
      className="timeline-container"
      style={{ position: "relative", minHeight: `${totalHeight}px`, marginLeft: "60px" }}
    >
      {/* Hour grid lines and labels */}
      {hours.map((m) => {
        const top = ((m - timelineStart) / 60) * HOUR_HEIGHT;
        return (
          <div key={m}>
            <span
              className="timeline-hour-label"
              style={{
                position: "absolute",
                left: "-58px",
                top: `${top - 10}px`,
                fontSize: "12px",
                color: "#888",
                width: "50px",
                textAlign: "right",
              }}
            >
              {formatHour(m)}
            </span>
            <div
              className="timeline-grid-line"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${top}px`,
                borderTop: "1px solid #333",
              }}
            />
          </div>
        );
      })}

      {/* Activity cards positioned on the timeline */}
      {activities.map((activity) => {
        const actStart = timeToMinutes(activity.time);
        const duration = activity.durationMinutes || activity.hourSpan * 60 || 60;
        const top = ((actStart - timelineStart) / 60) * HOUR_HEIGHT;
        const height = (duration / 60) * HOUR_HEIGHT;

        return (
          <div
            key={activity.id}
            style={{
              position: "absolute",
              left: "4px",
              right: "4px",
              top: `${top + 1}px`,
              height: `${height - 2}px`,
              zIndex: 1,
            }}
          >
            <ActivityCard
              activity={{
                ...activity,
                durationMinutes: duration,
              }}
              onToggleComplete={() => onToggleComplete(activity.id, activity.completed)}
              onEdit={() => onEdit(activity)}
            />
          </div>
        );
      })}

      {/* Current time indicator */}
      {showNowLine && (
        <div
          style={{
            position: "absolute",
            left: "-8px",
            right: 0,
            top: `${nowOffset}px`,
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "#e53935",
              position: "absolute",
              top: "-5px",
              left: "0",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "12px",
              right: 0,
              top: "0",
              borderTop: "2px solid #e53935",
            }}
          />
        </div>
      )}
    </div>
  );
}