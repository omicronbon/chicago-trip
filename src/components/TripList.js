import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import LoginScreen from './LoginScreen';
import NewTripModal from './NewTripModal';

export default function TripList() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewTrip, setShowNewTrip] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const tripsRef = collection(db, 'trips');
    const merged = new Map();
    let ownedReady = false;
    let sharedReady = false;

    function applySnapshot(docs) {
      docs.forEach((d) => {
        const data = d.data();
        merged.set(d.id, {
          id: d.id,
          name: data.name || '',
          destination: data.destination || '',
          startDate: data.startDate || '',
          endDate: data.endDate || '',
        });
      });
      if (ownedReady && sharedReady) {
        setTrips(Array.from(merged.values()));
        setLoading(false);
      }
    }

    const ownedUnsub = onSnapshot(
      query(tripsRef, where('ownerId', '==', user.uid)),
      (snap) => { ownedReady = true; applySnapshot(snap.docs); }
    );

    const sharedUnsub = onSnapshot(
      query(tripsRef, where('sharedWith', 'array-contains', user.uid)),
      (snap) => { sharedReady = true; applySnapshot(snap.docs); }
    );

    return () => { ownedUnsub(); sharedUnsub(); };
  }, [user]);

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
        <p style={{ textAlign: "center", marginTop: "4rem", color: "#e0e0e0" }}>Loading trips...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Your trips</h1>
        <div style={{ position: "absolute", top: "16px", right: "16px", display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="signout-btn" onClick={() => setShowNewTrip(true)}>
            + New trip
          </button>
          <button className="signout-btn" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </header>

      <div style={{ padding: "0 16px", marginTop: "16px" }}>
        {trips.length === 0 ? (
          <div className="empty-state">No trips yet. Click + New trip to get started.</div>
        ) : (
          trips.map((trip) => (
            <div
              key={trip.id}
              onClick={() => navigate(`/trips/${trip.id}`)}
              style={{
                background: "#FFFFFF",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "12px",
                cursor: "pointer",
              }}
            >
              <h3 style={{ margin: "0 0 4px", fontSize: "18px" }}>{trip.name}</h3>
              <p style={{ margin: "0 0 2px", color: "#888", fontSize: "14px" }}>{trip.destination}</p>
              <p style={{ margin: 0, color: "#888", fontSize: "13px" }}>
                {trip.startDate} – {trip.endDate}
              </p>
            </div>
          ))
        )}
      </div>

      {showNewTrip && user && (
        <NewTripModal user={user} onClose={() => setShowNewTrip(false)} />
      )}
    </div>
  );
}
