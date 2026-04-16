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
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import BottomNav from "./components/BottomNav";
import DaySelector from "./components/DaySelector";
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
import BudgetView from "./components/BudgetView";
import { backfillCoordinates } from "./utils/backfillCoordinates";

const TRIP_ID = "chicago-april-2026";
const APP_VERSION = "2.0.0";

function App() {
  const [days, setDays] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedDayId, setSelectedDayId] = useState(null);
  const [activeSection, setActiveSection] = useState("itinerary");
  const [loading, setLoading] = useState(true);

  const [modalState, setModalState] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [prefilledTime, setPrefilledTime] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [allActivitiesMap, setAllActivitiesMap] = useState({});
  const [tripMembers, setTripMembers] = useState([]);
  const [hotel, setHotel] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [swUpdate, setSwUpdate] = useState(null);

  // One-time cache bust when APP_VERSION changes
  useEffect(() => {
    const storedVersion = localStorage.getItem("app_version");
    if (storedVersion !== APP_VERSION) {
      localStorage.setItem("app_version", APP_VERSION);
      if (storedVersion) {
        // Only nuke caches if upgrading (not first install)
        Promise.all([
          navigator.serviceWorker?.getRegistrations().then((regs) =>
            Promise.all(regs.map((r) => r.unregister()))
          ),
          caches.keys().then((keys) =>
            Promise.all(keys.map((k) => caches.delete(k)))
          ),
        ]).then(() => window.location.reload());
        return;
      }
    }
  }, []);

  // DEBUG: log layout metrics on mount
  useEffect(() => {
    const sab = getComputedStyle(document.documentElement).getPropertyValue('--sab').trim();
    console.log('[DEBUG] window.innerHeight:', window.innerHeight);
    console.log('[DEBUG] documentElement.clientHeight:', document.documentElement.clientHeight);
    console.log('[DEBUG] screen.height:', window.screen.height);
    console.log('[DEBUG] --sab (safe-area-inset-bottom):', sab);
    console.log('[DEBUG] navigator.standalone:', window.navigator.standalone);
    console.log('[DEBUG] viewport meta:', document.querySelector('meta[name="viewport"]')?.getAttribute('content'));
  }, []);

  // Listen for service worker updates
  useEffect(() => {
    function onSwUpdate(e) {
      setSwUpdate(e.detail);
    }
    window.addEventListener("swUpdate", onSwUpdate);
    return () => window.removeEventListener("swUpdate", onSwUpdate);
  }, []);

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

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, "trips", TRIP_ID), async (snap) => {
      const data = snap.data();
      if (!data) return;

      const { hotelName, hotelAddress, hotelLat, hotelLng } = data;
      if (hotelLat != null && hotelLng != null) {
        setHotel({ name: hotelName || "", address: hotelAddress || "", lat: hotelLat, lng: hotelLng });
      } else {
        setHotel(null);
      }

      const uids = [data.ownerId, ...(data.sharedWith || [])].filter(Boolean);
      const members = await Promise.all(
        uids.map(async (uid) => {
          try {
            const userSnap = await getDoc(doc(db, "users", uid));
            if (userSnap.exists()) {
              const d = userSnap.data();
              return { uid, displayName: d.displayName || "Unknown", email: d.email || "" };
            }
          } catch {}
          return { uid, displayName: "Unknown", email: "" };
        })
      );
      setTripMembers(members);
    });

    return () => unsubscribe();
  }, [user]);

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

  // Expenses listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "trips", TRIP_ID, "expenses"),
      orderBy("date", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // Settlements listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "trips", TRIP_ID, "settlements"),
      orderBy("date", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSettlements(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  async function handleToggleComplete(activityId, currentStatus) {
    const newStatus = !currentStatus;
    const grouped = groupedActivities.find((a) => a.id === activityId);
    const idsToToggle = [activityId, ...(grouped?.childIds || [])];

    await Promise.all(
      idsToToggle.map((id) => {
        const activityDoc = doc(
          db, "trips", TRIP_ID, "days", selectedDayId, "activities", id
        );
        return updateDoc(activityDoc, { completed: newStatus });
      })
    );
  }

  async function handleSave(formData) {
    if (modalState === "add") {
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

  async function handleSaveHotel({ name, address, lat, lng }) {
    await updateDoc(doc(db, "trips", TRIP_ID), {
      hotelName: name,
      hotelAddress: address,
      hotelLat: lat,
      hotelLng: lng,
    });
  }

  async function handleDelete(activityId) {
    const activityDoc = doc(
      db, "trips", TRIP_ID, "days", selectedDayId, "activities", activityId
    );
    await deleteDoc(activityDoc);
    setModalState(null);
  }

  function handleSwUpdate() {
    if (!swUpdate?.waiting) return;
    swUpdate.waiting.postMessage({ type: "SKIP_WAITING" });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }

  const selectedDay = days.find((d) => d.id === selectedDayId);

  const groupedActivities = groupActivities(activities);

  const allActivities = days.flatMap((day) =>
    (allActivitiesMap[day.id] || []).map((act) => ({
      ...act,
      dayId: day.id,
      dayLabel: day.label,
      dayDate: day.date,
    }))
  );

  if (authLoading) {
    return (
      <div className="app-container">
        <p style={{ textAlign: "center", marginTop: "4rem", color: "#e0e0e0" }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (loading) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>Chicago 🌆</h1>
          <p className="trip-dates">April 17–20, 2026</p>
        </header>
        <p style={{ textAlign: "center", marginTop: "2rem", color: "#e0e0e0" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* DEBUG OVERLAYS — remove before final commit */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 50, background: "red", zIndex: 9999, pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: "env(safe-area-inset-bottom, 0px)", background: "blue", zIndex: 10000, pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-34px", left: 0, right: 0, height: 34, background: "green", zIndex: 10001, pointerEvents: "none" }} />

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

      {swUpdate && (
        <div className="update-banner">
          <span>A new version is available</span>
          <button onClick={handleSwUpdate}>Update now</button>
        </div>
      )}

      {activeSection === "itinerary" && (
        <DaySelector
          days={days}
          selectedDayId={selectedDayId}
          onDaySelect={setSelectedDayId}
        />
      )}

      <div key={activeSection} className={`main-content${activeSection === "map" ? " map-active" : ""}`}>
        {activeSection === "itinerary" && (
          <>
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
                    tripMembers={tripMembers}
                  />
                </div>
              </>
            )}
          </>
        )}

        {activeSection === "map" && (
          <MapView
            activities={allActivities}
            days={days}
            hotel={hotel}
            onSaveHotel={handleSaveHotel}
            onBackfill={async () => {
              const result = await backfillCoordinates();
              alert(`Done! Geocoded: ${result.geocoded}, Skipped: ${result.skipped}, Failed: ${result.failed}`);
            }}
          />
        )}

        {activeSection === "budget" && (
          <BudgetView
            activities={allActivities}
            tripMembers={tripMembers}
            expenses={expenses}
            settlements={settlements}
            currentUser={user}
          />
        )}

        {activeSection === "todo" && <ActionItems userId={user.uid} days={days} />}
      </div>

      {activeSection === "itinerary" && (
        <button className="fab" onClick={() => setModalState("add")}>+</button>
      )}

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
          tripMembers={tripMembers}
          currentUserId={user.uid}
        />
      )}

      <BottomNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
    </div>
  );
}

export default App;
