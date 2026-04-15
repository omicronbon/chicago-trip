import React, { useState, useEffect, useRef } from "react";
import ActivityCard from "./ActivityCard";

function timeToMinutes(time24) {
  const [h, m] = time24.split(":").map(Number);
  return h * 60 + m;
}

function formatHour(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12} ${period}`;
}

const HOUR_HEIGHT = 80;

export default function TimelineView({
  activities,
  tripDate,
  onToggleComplete,
  onEdit,
  onAddAtTime,
  tripMembers,
}) {
  const [now, setNow] = useState(new Date());
  const scrollRef = useRef(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to current time (today) or first activity (other days)
  useEffect(() => {
    if (hasScrolled.current || activities.length === 0) return;

    const timer = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        hasScrolled.current = true;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [activities, tripDate]);

  // Reset scroll flag when day changes
  useEffect(() => {
    hasScrolled.current = false;
  }, [tripDate]);

  if (activities.length === 0) {
    return (
      <div className="empty-state">No activities yet. Tap + to add one.</div>
    );
  }

  const startMinutes = activities.reduce(
    (min, a) => Math.min(min, timeToMinutes(a.time)),
    Infinity
  );
  const endMinutes = activities.reduce((max, a) => {
    const end = timeToMinutes(a.time) + (a.durationMinutes || a.hourSpan * 60 || 60);
    return Math.max(max, end);
  }, 0);

  // Start 1 hour before first activity, end at midnight or later
  const timelineStart = Math.max(0, Math.floor(startMinutes / 60) * 60 - 60);
  const timelineEnd = Math.max(Math.ceil(endMinutes / 60) * 60, 24 * 60);
  const totalHeight = ((timelineEnd - timelineStart) / 60) * HOUR_HEIGHT;

  const hours = [];
  for (let m = timelineStart; m <= timelineEnd; m += 60) {
    hours.push(m);
  }

  const isToday =
    tripDate &&
    new Date(tripDate + "T00:00:00").toDateString() === now.toDateString();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNowLine =
    isToday && nowMinutes >= timelineStart && nowMinutes <= timelineEnd;
  const nowOffset = ((nowMinutes - timelineStart) / 60) * HOUR_HEIGHT;

  // Determine scroll anchor position
  const scrollAnchorOffset = isToday && showNowLine
    ? nowOffset - 100
    : ((startMinutes - timelineStart) / 60) * HOUR_HEIGHT - 20;

  // Handle clicking on empty timeline space
  function handleTimelineClick(e) {
    if (!onAddAtTime) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const minutesFromStart = (clickY / HOUR_HEIGHT) * 60;
    const totalMinutes = timelineStart + minutesFromStart;
    const roundedMinutes = Math.round(totalMinutes / 15) * 15;
    const hours = Math.floor(roundedMinutes / 60) % 24;
    const mins = roundedMinutes % 60;
    const timeStr = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    onAddAtTime(timeStr);
  }

  return (
    <div
      className="timeline-container"
      style={{ position: "relative", minHeight: `${totalHeight}px`, marginLeft: "60px" }}
      onClick={handleTimelineClick}
    >
      {/* Scroll anchor */}
      <div
        ref={scrollRef}
        style={{
          position: "absolute",
          top: `${Math.max(0, scrollAnchorOffset)}px`,
          height: "1px",
          pointerEvents: "none",
        }}
      />

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
            onClick={(e) => e.stopPropagation()}
          >
            <ActivityCard
              activity={{
                ...activity,
                durationMinutes: duration,
              }}
              onToggleComplete={() => onToggleComplete(activity.id, activity.completed)}
              onEdit={() => onEdit(activity)}
              tripMembers={tripMembers}
            />
          </div>
        );
      })}

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