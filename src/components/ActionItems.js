import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

const TRIP_ID = "chicago-april-2026";

export default function ActionItems({ userId }) {
  const [items, setItems] = useState([]);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "trips", TRIP_ID, "actionItems"),
      orderBy("createdAt")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, []);

  async function handleAdd() {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    await addDoc(collection(db, "trips", TRIP_ID, "actionItems"), {
      title: trimmed,
      completed: false,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setNewTitle("");
  }

  async function handleToggle(item) {
    await updateDoc(doc(db, "trips", TRIP_ID, "actionItems", item.id), {
      completed: !item.completed,
      updatedAt: serverTimestamp(),
    });
  }

  async function handleDelete(itemId) {
    await deleteDoc(doc(db, "trips", TRIP_ID, "actionItems", itemId));
  }

  const incomplete = items.filter((i) => !i.completed);
  const completed = items.filter((i) => i.completed);

  return (
    <div style={{ padding: "0 16px" }}>
      <h2 className="day-heading">Pre-Trip To Do</h2>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Add a task..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #444",
            background: "#1e1e2e",
            color: "#fff",
            fontSize: "16px",
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            padding: "12px 18px",
            borderRadius: "8px",
            border: "none",
            background: "#4285f4",
            color: "white",
            fontWeight: "bold",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>

      {incomplete.length === 0 && completed.length === 0 && (
        <div className="empty-state">
          No tasks yet. Add things like "Call Pequod's" or "Download offline maps."
        </div>
      )}

      {incomplete.map((item) => (
        <div
          key={item.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px",
            marginBottom: "8px",
            background: "#2a2a3d",
            borderRadius: "10px",
            borderLeft: "4px solid #4285f4",
          }}
        >
          <input
            type="checkbox"
            checked={false}
            onChange={() => handleToggle(item)}
            style={{ width: "22px", height: "22px", cursor: "pointer" }}
          />
          <span style={{ flex: 1, fontSize: "16px", color: "#fff" }}>
            {item.title}
          </span>
          <button
            onClick={() => handleDelete(item.id)}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      ))}

      {completed.length > 0 && (
        <>
          <h3 style={{ color: "#888", fontSize: "14px", margin: "20px 0 8px" }}>
            Completed ({completed.length})
          </h3>
          {completed.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px",
                marginBottom: "8px",
                background: "#1e1e2e",
                borderRadius: "10px",
                opacity: 0.6,
              }}
            >
              <input
                type="checkbox"
                checked={true}
                onChange={() => handleToggle(item)}
                style={{ width: "22px", height: "22px", cursor: "pointer" }}
              />
              <span style={{
                flex: 1,
                fontSize: "16px",
                color: "#888",
                textDecoration: "line-through",
              }}>
                {item.title}
              </span>
              <button
                onClick={() => handleDelete(item.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#888",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}