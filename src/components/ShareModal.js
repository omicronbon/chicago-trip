import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { useTripId } from "../TripContext";

export default function ShareModal({ onClose, currentUserId }) {
  const tripId = useTripId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);

  // Listen to the trip doc to keep sharedWith in sync
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "trips", tripId), async (tripSnap) => {
      const data = tripSnap.data();
      const sharedUids = data?.sharedWith || [];

      // Resolve UIDs to emails
      const collabs = await Promise.all(
        sharedUids.map(async (uid) => {
          const userSnap = await getDoc(doc(db, "users", uid));
          const userData = userSnap.data();
          return {
            uid,
            email: userData?.email || "Unknown",
            displayName: userData?.displayName || "",
          };
        })
      );
      setCollaborators(collabs);
    });

    return () => unsubscribe();
  }, []);

  async function handleAdd() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setLoading(true);
    setStatus(null);

    try {
      // Look up user by email
      const q = query(collection(db, "users"), where("email", "==", trimmed));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setStatus("No account found for that email. They need to sign in first.");
        setLoading(false);
        return;
      }

      const foundUid = snapshot.docs[0].id;

      if (foundUid === currentUserId) {
        setStatus("That's your own account.");
        setLoading(false);
        return;
      }

      // Add to sharedWith
      await updateDoc(doc(db, "trips", tripId), {
        sharedWith: arrayUnion(foundUid),
      });

      setEmail("");
      setStatus("Added!");
    } catch (err) {
      console.error("Share error:", err);
      setStatus("Something went wrong. Try again.");
    }

    setLoading(false);
  }

  async function handleRemove(uid) {
    await updateDoc(doc(db, "trips", tripId), {
      sharedWith: arrayRemove(uid),
    });
  }

  return (
    <Modal onClose={onClose} labelledBy="share-modal-title">
      <h2 id="share-modal-title">Share Trip</h2>

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Enter Google email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) handleAdd();
            }}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "16px",
            }}
          />
          <button
            onClick={handleAdd}
            disabled={loading}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: "#4285f4",
              color: "white",
              fontWeight: "bold",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            {loading ? "Adding…" : "Add"}
          </button>
        </div>

        {status && (
          <p style={{
            fontSize: "14px",
            color: status === "Added!" ? "#4caf50" : "#666",
            marginBottom: "12px",
          }}>
            {status}
          </p>
        )}

        {collaborators.length > 0 && (
          <>
            <h3 style={{ fontSize: "14px", color: "#888", marginBottom: "8px" }}>
              Shared with
            </h3>
            {collaborators.map((c) => (
              <div
                key={c.uid}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid #eee",
                }}
              >
                <span style={{ fontSize: "14px" }}>
                  {c.displayName || c.email}
                  {c.displayName && (
                    <span style={{ color: "#888", marginLeft: "6px" }}>
                      {c.email}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => handleRemove(c.uid)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#e53935",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: "16px",
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            background: "white",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Done
        </button>
    </Modal>
  );
}