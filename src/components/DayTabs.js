import React from "react";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getCountdown(startDate) {
  const now = new Date();
  const start = new Date(startDate + "T00:00:00");
  const diff = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
  if (diff > 1) return `${diff} days away`;
  if (diff === 1) return "Tomorrow!";
  if (diff === 0) return "Today!";
  return null; // Trip has started or passed
}

function DayTabs({
  days,
  selectedDayId,
  onSelectDay,
  selectedView,
  onSelectView,
  tripStartDate,
  dayProgress,
  onSelectMap,
  activitiesMap = {},
}) {
  const today = getToday();
  const countdown = tripStartDate ? getCountdown(tripStartDate) : null;

  return (
    <>
      {countdown && (
        <div style={{
          textAlign: "center",
          padding: "6px 0 2px",
          fontSize: "14px",
          color: "#4285f4",
          fontWeight: "bold",
        }}>
          ✈️ {countdown}
        </div>
      )}
      <div className="day-tabs">
        <button
          className={`day-tab ${selectedView === "todo" ? "active" : ""}`}
          onClick={() => onSelectView("todo")}
          style={{ fontWeight: selectedView === "todo" ? "bold" : "normal" }}
        >
          <span className="tab-label">To Do</span>
        </button>
        {days.map((day) => {
          const isToday = day.date === today;
          const progress = dayProgress?.[day.id];
          const isSelected = selectedView === "day" && day.id === selectedDayId;

          const dayActivities = activitiesMap[day.id] || [];
          const dayTotal = dayActivities
            .filter((a) => a.cost != null)
            .reduce((sum, a) => sum + a.cost, 0);

          return (
            <button
              key={day.id}
              className={`day-tab ${isSelected ? "active" : ""}`}
              onClick={() => {
                onSelectView("day");
                onSelectDay(day.id);
              }}
              style={{ position: "relative" }}
            >
              <span className="tab-label">{day.label}</span>
              {dayTotal > 0 && (
                <span className="day-tab-cost">${Math.round(dayTotal)}</span>
              )}
              {isToday && (
                <div style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#e53935",
                  margin: "2px auto 0",
                }} />
              )}
              {progress !== undefined && progress !== null && (
                <div style={{
                  width: "100%",
                  height: "3px",
                  background: "#333",
                  borderRadius: "2px",
                  marginTop: "4px",
                  overflow: "hidden",
                }}>
                  <div style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: progress === 100 ? "#4caf50" : "#4285f4",
                    borderRadius: "2px",
                    transition: "width 0.3s ease",
                  }} />
                </div>
              )}
            </button>
          );
        })}
        <button
          className={`day-tab ${selectedView === "map" ? "active" : ""}`}
          onClick={onSelectMap}
        >
          <span className="tab-label">📍 Map</span>
        </button>
        <button
          className={`day-tab ${selectedView === "budget" ? "active" : ""}`}
          onClick={() => onSelectView("budget")}
        >
          <span className="tab-label">💰 Budget</span>
        </button>
      </div>
    </>
  );
}

export default DayTabs;