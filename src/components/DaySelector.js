import React from "react";

function formatDayLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${weekday} ${month}/${day}`;
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

export default function DaySelector({ days, selectedDayId, onDaySelect }) {
  const today = getToday();

  return (
    <div className="day-selector">
      {days.map((day) => {
        const isSelected = day.id === selectedDayId;
        const isToday = day.date === today;

        return (
          <button
            key={day.id}
            type="button"
            className={`day-pill ${isSelected ? "active" : ""}`}
            onClick={() => onDaySelect(day.id)}
            aria-current={isToday ? "date" : undefined}
            aria-pressed={isSelected}
          >
            {formatDayLabel(day.date)}
            {isToday && <div className="day-pill-today-dot" />}
          </button>
        );
      })}
    </div>
  );
}
