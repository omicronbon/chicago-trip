import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import DayTabs from "./components/DayTabs";
import ActivityModal from "./components/ActivityModal";
import groupActivities from "./utils/groupActivities";
import "./App.css";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import LoginScreen from "./components/LoginScreen";
import ShareModal from "./components/ShareModal";
import ActionItems from "./components/ActionItems";
import TimelineView from "./components/TimelineView";
import MapView from "./components/MapView";
import { backfillCoordinates } from "./utils/backfillCoordinates";

const TRIP_ID = "chicago-april-2026";

function App() {
  const [days, setDays] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedDayId, setSelectedDayId] = useState(null);
  const [selectedView, setSelectedView] = useState("todo");
  const [loading, setLoading] = useState(true);

  // Modal state: null = closed, "add" = adding, activity object = editing
  const [modalState, setModalState] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [prefilledTime, setPrefilledTime] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  // All activities across all days, keyed by dayId — used for the map view
  const [allActivitiesMap, setAllActivitiesMap] = useState({});

  // --- AUTH LISTENER ---
  // Checks if the user is logged in. Runs once on mount.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      if (firebaseUser) {
        await setDoc(doc(db, "users", firebaseUser.uid), {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    });
    return () => unsubscribe();
  }, []);

  // --- LISTENER 1: Days ---
  useEffect(() => {
    if (!user) return;

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
  }, [user]);

  // --- LISTENER 2: Activities for selected day ---
  useEffect(() => {
    if (!user || !selectedDayId) return;

    const activitiesQuery = query(
      collection(db, "trips", TRIP_ID, "days", selectedDayId, "activities"),
      orderBy("time")
    );

    const unsubscribe = onSnapshot(activitiesQuery, (snapshot) => {
      const acts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setActivities(acts);
    });

    return () => unsubscribe();
  }, [user, selectedDayId]);

  // --- LISTENER 3: All activities across all days (for map view) ---
  useEffect(() => {
    if (!user || days.length === 0) return;

    const unsubscribes = days.map((day) => {
      const q = query(
        collection(db, "trips", TRIP_ID, "days", day.id, "activities"),
        orderBy("time")
      );
      return onSnapshot(q, (snapshot) => {
        const acts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllActivitiesMap((prev) => ({ ...prev, [day.id]: acts }));
      });
    });

    return () => unsubscribes.forEach((fn) => fn());
  }, [user, days]);

  // --- TOGGLE COMPLETE ---
  async function handleToggleComplete(activityId, currentStatus) {
    const newStatus = !currentStatus;

    // Find the grouped activity to get any child IDs
    const grouped = groupedActivities.find((a) => a.id === activityId);
    const idsToToggle = [activityId, ...(grouped?.childIds || [])];

    // Toggle the parent and all continuation entries
    await Promise.all(
      idsToToggle.map((id) => {
        const activityDoc = doc(
          db, "trips", TRIP_ID, "days", selectedDayId, "activities", id
        );
        return updateDoc(activityDoc, { completed: newStatus });
      })
    );
  }

  // --- SAVE (handles both add and edit) ---
  async function handleSave(formData) {
    if (modalState === "add") {
      // Add a new activity document to Firestore
      const activitiesRef = collection(
        db, "trips", TRIP_ID, "days", selectedDayId, "activities"
      );
      await addDoc(activitiesRef, {
        ...formData,
        completed: false,
        createdBy: user.displayName || user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // Edit an existing activity
      const activityDoc = doc(
        db, "trips", TRIP_ID, "days", selectedDayId, "activities", modalState.id
      );
      await updateDoc(activityDoc, {
        ...formData,
        updatedAt: serverTimestamp(),
      });
    }

    setModalState(null);
    setPrefilledTime(null);
  }

  // --- DELETE ---
  async function handleDelete(activityId) {
    const activityDoc = doc(
      db, "trips", TRIP_ID, "days", selectedDayId, "activities", activityId
    );
    await deleteDoc(activityDoc);
    setModalState(null);
  }

  const selectedDay = days.find((d) => d.id === selectedDayId);
  // Compute progress for current day's activities
  const dayProgress = {};
  if (selectedDayId && activities.length > 0) {
    const total = activities.length;
    const done = activities.filter((a) => a.completed).length;
    dayProgress[selectedDayId] = total > 0 ? Math.round((done / total) * 100) : 0;
  }

  // Group "(cont.)" activities into multi-hour blocks
  const groupedActivities = groupActivities(activities);

  // Flatten all activities across all days for the map view, enriched with day info
  const allActivities = days.flatMap((day) =>
    (allActivitiesMap[day.id] || []).map((act) => ({
      ...act,
      dayId: day.id,
      dayLabel: day.label,
    }))
  );

 // Show login screen if not authenticated
 if (authLoading) {
  return (
    <div className="app">
      <p style={{ textAlign: "center", marginTop: "4rem" }}>Loading...</p>
    </div>
  );
}

if (!user) {
  return <LoginScreen />;
}
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
        <div style={{ position: "absolute", top: "16px", right: "16px", display: "flex", gap: "8px" }}>
          <button className="signout-btn" onClick={() => setShowShareModal(true)}>
            Share
          </button>
          <button className="signout-btn" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </header>

      <DayTabs
        days={days}
        selectedDayId={selectedDayId}
        onSelectDay={setSelectedDayId}
        selectedView={selectedView}
        onSelectView={setSelectedView}
        tripStartDate="2026-04-17"
        dayProgress={dayProgress}
        onSelectMap={() => setSelectedView("map")}
      />

{selectedView === "todo" && <ActionItems userId={user.uid} days={days} />}

      {selectedView === "map" && (
        <MapView
          activities={allActivities}
          days={days}
          onBackfill={async () => {
            const result = await backfillCoordinates();
            alert(`Done! Geocoded: ${result.geocoded}, Skipped: ${result.skipped}, Failed: ${result.failed}`);
          }}
        />
      )}

      {selectedView === "day" && (
      <>
      {/* Color Legend */}
      <div className="color-legend">
        <div className="legend-item"><span className="legend-dot" style={{ background: "#FFD966" }}></span>Confirmed</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: "#FFEB3B" }}></span>New</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: "#A8D5A2" }}></span>Travel</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: "#FF9800" }}></span>Added</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: "#F9F9F9" }}></span>Free</div>
      </div>

      {selectedDay && (
        <>
          <h2 className="day-heading">{selectedDay.labelFull || selectedDay.label}</h2>

          <div className="activity-list">
            <TimelineView
              activities={groupedActivities}
              tripDate={selectedDay.date}
              onToggleComplete={(id, completed) => handleToggleComplete(id, completed)}
              onEdit={(activity) => setModalState(activity)}
              onAddAtTime={(time) => {
                setPrefilledTime(time);
                setModalState("add");
              }}
            />
          </div>
        </>
      )}

     
</>
      )}
      {/* Floating "+" button to add an activity */}
      {selectedView === "day" && (
        <button className="fab" onClick={() => setModalState("add")}>+</button>
      )}

      {/* Modal for adding/editing */}
      {showShareModal && (
        <ShareModal
          onClose={() => setShowShareModal(false)}
          currentUserId={user.uid}
        />
      )}
      {modalState && (
        <ActivityModal
          activity={modalState === "add" ? null : modalState}
          prefilledTime={prefilledTime}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => { setModalState(null); setPrefilledTime(null); }}
        />
      )}
    </div>
  );
}

export default App;