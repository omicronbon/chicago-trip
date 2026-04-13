// App.js
// Main app component. Right now it:
// 1. Loads the Chicago itinerary seed data
// 2. Tracks which day tab is selected (defaults to Friday)
// 3. Tracks which activities are checked off (local state for now)
// 4. Renders the day tabs and activity list
//
// Next step: we'll replace local state with Firestore so changes
// sync in real time between you and your girlfriend's phones.

import React, { useState } from "react";
import DayTabs from "./components/DayTabs";
import ActivityCard from "./components/ActivityCard";
import chicagoItinerary from "./data/chicagoItinerary";
import "./App.css";

function App() {
  // Which day tab is currently selected
  const [selectedDayId, setSelectedDayId] = useState(
    chicagoItinerary.days[0].id // Default to Friday
  );

  // Copy of itinerary data in state so we can toggle "completed"
  // (Later this gets replaced by Firestore)
  const [days, setDays] = useState(chicagoItinerary.days);

  // Find the currently selected day's data
  const selectedDay = days.find((d) => d.id === selectedDayId);

  // Toggle an activity's completed status
  function handleToggleComplete(activityId) {
    setDays((prevDays) =>
      prevDays.map((day) => ({
        ...day,
        activities: day.activities.map((act) =>
          act.id === activityId
            ? { ...act, completed: !act.completed }
            : act
        ),
      }))
    );
  }

  return (
    <div className="app">
      {/* Trip header */}
      <header className="app-header">
        <h1>Chicago 🌆</h1>
        <p className="trip-dates">April 17–20, 2026</p>
      </header>

      {/* Day selector tabs */}
      <DayTabs
        days={days}
        selectedDayId={selectedDayId}
        onSelectDay={setSelectedDayId}
      />

      {/* Full day label */}
      <h2 className="day-heading">{selectedDay.labelFull}</h2>

      {/* Activity list for the selected day */}
      <div className="activity-list">
        {selectedDay.activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onToggleComplete={handleToggleComplete}
          />
        ))}
      </div>

      {/* Overflow list — only show on the last day tab */}
      {selectedDayId === "mon-apr-20" && (
        <div className="overflow-section">
          <h3>If Time Permits</h3>
          {chicagoItinerary.overflow.map((item) => (
            <div key={item.id} className="overflow-item">
              <span>
                {item.emoji} {item.title}
              </span>
              <p className="activity-notes">{item.notes}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
