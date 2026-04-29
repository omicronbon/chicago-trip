import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import LoginScreen from './LoginScreen';
import NewTripModal from './NewTripModal';
import RenameTripModal from './RenameTripModal';
import { deleteTripWithCascade } from '../utils/deleteTrip';

export default function TripList() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [renameTrip, setRenameTrip] = useState(null);
  const menuRef = useRef(null);

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
          ownerId: data.ownerId || '',
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

  useEffect(() => {
    if (!openMenuId) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [openMenuId]);

  async function handleDelete(trip) {
    if (!window.confirm(`Delete "${trip.name}" and all its data? This cannot be undone.`)) return;
    const previous = trips;
    setTrips((t) => t.filter((tr) => tr.id !== trip.id));
    try {
      await deleteTripWithCascade(trip.id);
    } catch (err) {
      setTrips(previous);
      alert(`Delete failed: ${err.message}`);
    }
    setOpenMenuId(null);
  }

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
                position: "relative",
                background: "#FFFFFF",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "12px",
                cursor: "pointer",
              }}
            >
              <h3 style={{ margin: "0 0 4px", fontSize: "18px", paddingRight: "36px" }}>{trip.name}</h3>
              <p style={{ margin: "0 0 2px", color: "#888", fontSize: "14px" }}>{trip.destination}</p>
              <p style={{ margin: 0, color: "#888", fontSize: "13px" }}>
                {trip.startDate} – {trip.endDate}
              </p>

              {/* Kebab button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setOpenMenuId(openMenuId === trip.id ? null : trip.id);
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "44px",
                  height: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "none",
                  border: "none",
                  color: "#888",
                  fontSize: "20px",
                  cursor: "pointer",
                  borderRadius: "0 12px 0 0",
                }}
                aria-label="Trip options"
              >
                ⋮
              </button>

              {/* Popover menu */}
              {openMenuId === trip.id && (
                <div
                  ref={menuRef}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    top: "44px",
                    right: "8px",
                    background: "#FFFFFF",
                    borderRadius: "10px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                    zIndex: 100,
                    minWidth: "140px",
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenameTrip(trip);
                      setOpenMenuId(null);
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "12px 16px",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      fontSize: "15px",
                      cursor: "pointer",
                      color: "#222",
                    }}
                  >
                    Rename
                  </button>
                  {trip.ownerId === user.uid && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(trip);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "12px 16px",
                        background: "none",
                        border: "none",
                        textAlign: "left",
                        fontSize: "15px",
                        cursor: "pointer",
                        color: "#e53935",
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showNewTrip && user && (
        <NewTripModal user={user} onClose={() => setShowNewTrip(false)} />
      )}
      {renameTrip && (
        <RenameTripModal trip={renameTrip} onClose={() => setRenameTrip(null)} />
      )}
    </div>
  );
}
