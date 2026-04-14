import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import DayTabs from "./components/DayTabs";
import ActivityCard from "./components/ActivityCard";
import chicagoItinerary from "./data/chicagoItinerary";
import "./App.css";

const TRIP_ID = "chicago-april-2026";

function App() {
  const [days, setDays] = useState([]);         // Day metadata (labels, order)
  const [activities, setActivities] = useState([]); // Activities for selected day
  const [selectedDayId, setSelectedDayId] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- LISTENER 1: Days ---
  useEffect(() => {
    const daysQuery = query(
      collection(db, "trips", TRIP_ID, "days"),
      orderBy("order")
    );

    const unsubscribe = onSnapshot(daysQuery, (snapshot) => {
      const daysData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDays(daysData);
      setLoading(false);

      if (daysData.length > 0) {
        setSelectedDayId((prev) => prev || daysData[0].id);
      }
    });

    return () => unsubscribe();
  }, []);

  // --- LISTENER 2: Activities for the selected day ---
  useEffect(() => {
    if (!selectedDayId) return;

    const activitiesQuery = query(
      collection(db, "trips", TRIP_ID, "days", selectedDayId, "activities"),
      orderBy("time")
    );

    const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
      const acts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setActivities(acts);
    });

    return () => unsubscribe();
  }, [selectedDayId]);

  // --- TOGGLE COMPLETE ---
  async function handleToggleComplete(activityId, currentStatus) {
    const activityDoc = doc(
      db, "trips", TRIP_ID, "days", selectedDayId, "activities", activityId
    );
    await updateDoc(activityDoc, { completed: !currentStatus });
  }

  const selectedDay = days.find((d) => d.id === selectedDayId);

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Chicago 🌆</h1>
          <p className="trip-dates">April 17–20, 2026</p>
        </header>
        <p style={{ textAlign: "center", marginTop: "2rem" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Chicago 🌆</h1>
        <p className="trip-dates">April 17–20, 2026</p>
      </header>

      <DayTabs
        days={days}
        selectedDayId={selectedDayId}
        onSelectDay={setSelectedDayId}
      />

      {selectedDay && (
        <>
          <h2 className="day-heading">{selectedDay.label}</h2>

          <div className="activity-list">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onToggleComplete={() =>
                  handleToggleComplete(activity.id, activity.completed)
                }
              />
            ))}
          </div>
        </>
      )}

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