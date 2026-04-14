// DayTabs.js
import React from "react";

function DayTabs({ days, selectedDayId, onSelectDay, selectedView, onSelectView }) {
  return (
    <div className="day-tabs">
      <button
        className={`day-tab ${selectedView === "todo" ? "active" : ""}`}
        onClick={() => onSelectView("todo")}
        style={{ fontWeight: selectedView === "todo" ? "bold" : "normal" }}
      >
        <span className="tab-label">To Do</span>
      </button>
      {days.map((day) => (
        <button
          key={day.id}
          className={`day-tab ${selectedView === "day" && day.id === selectedDayId ? "active" : ""}`}
          onClick={() => {
            onSelectView("day");
            onSelectDay(day.id);
          }}
        >
          <span className="tab-label">{day.label}</span>
        </button>
      ))}
    </div>
  );
}

export default DayTabs;