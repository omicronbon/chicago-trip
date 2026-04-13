// DayTabs.js
// Horizontal tab bar that lets you switch between days.
// The selected day is highlighted. On mobile, tabs scroll horizontally
// if they overflow (won't happen with 4 days, but ready for longer trips).

import React from "react";

function DayTabs({ days, selectedDayId, onSelectDay }) {
  return (
    <div className="day-tabs">
      {days.map((day) => (
        <button
          key={day.id}
          className={`day-tab ${day.id === selectedDayId ? "active" : ""}`}
          onClick={() => onSelectDay(day.id)}
        >
          {/* Short label like "Fri 4/17" for compact tabs */}
          <span className="tab-label">{day.label}</span>
        </button>
      ))}
    </div>
  );
}

export default DayTabs;
