import React, { useState, useEffect } from "react";
import Modal from "./Modal";
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
import { useTripId } from "../TripContext";

export default function ActionItems({ userId, days }) {
  const tripId = useTripId();
  const [items, setItems] = useState([]);
  const [overflow, setOverflow] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newOverflow, setNewOverflow] = useState("");
  const [scheduleItem, setScheduleItem] = useState(null);
  const [selectedDayId, setSelectedDayId] = useState("");
  const [selectedTime, setSelectedTime] = useState("12:00");
  const [selectedDuration, setSelectedDuration] = useState(60);

  useEffect(() => {
    const q = query(
      collection(db, "trips", tripId, "actionItems"),
      orderBy("createdAt")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "trips", tripId, "overflow"),
      (snapshot) => {
        setOverflow(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => unsubscribe();
  }, []);

  async function handleAdd() {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    await addDoc(collection(db, "trips", tripId, "actionItems"), {
      title: trimmed,
      completed: false,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setNewTitle("");
  }

  async function handleToggle(item) {
    await updateDoc(doc(db, "trips", tripId, "actionItems", item.id), {
      completed: !item.completed,
      updatedAt: serverTimestamp(),
    });
  }

  async function handleDeleteItem(itemId) {
    await deleteDoc(doc(db, "trips", tripId, "actionItems", itemId));
  }

  async function handleAddOverflow() {
    const trimmed = newOverflow.trim();
    if (!trimmed) return;
    await addDoc(collection(db, "trips", tripId, "overflow"), {
      title: trimmed,
      emoji: "📌",
      notes: "",
    });
    setNewOverflow("");
  }

  async function handleDeleteOverflow(itemId) {
    await deleteDoc(doc(db, "trips", tripId, "overflow", itemId));
  }

  async function handleSchedule() {
    if (!selectedDayId || !scheduleItem) return;
    await addDoc(
      collection(db, "trips", tripId, "days", selectedDayId, "activities"),
      {
        title: scheduleItem.title,
        emoji: scheduleItem.emoji || "📌",
        time: selectedTime,
        category: "orange",
        notes: scheduleItem.notes || "",
        address: "",
        durationMinutes: Number(selectedDuration),
        completed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );
    setScheduleItem(null);
    setSelectedDayId("");
    setSelectedTime("12:00");
    setSelectedDuration(60);
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
            border: "1px solid #DDD",
            background: "#FFFFFF",
            color: "#222",
            fontSize: "16px",
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            padding: "12px 18px",
            borderRadius: "8px",
            border: "none",
            background: "#4A90D9",
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
            background: "#FFFFFF",
            borderRadius: "10px",
            borderLeft: "4px solid #4A90D9",
          }}
        >
          <input
            type="checkbox"
            checked={false}
            onChange={() => handleToggle(item)}
            style={{ width: "22px", height: "22px", cursor: "pointer" }}
          />
          <span style={{ flex: 1, fontSize: "16px", color: "#222" }}>
            {item.title}
          </span>
          <button
            onClick={() => handleDeleteItem(item.id)}
            aria-label="Delete task"
            style={{
              background: "none",
              border: "none",
              color: "#999",
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
          <h3 style={{ color: "#999", fontSize: "14px", margin: "20px 0 8px" }}>
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
                background: "#FAFAFA",
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
              <span
                style={{
                  flex: 1,
                  fontSize: "16px",
                  color: "#999",
                  textDecoration: "line-through",
                }}
              >
                {item.title}
              </span>
              <button
                onClick={() => handleDeleteItem(item.id)}
                aria-label="Delete task"
                style={{
                  background: "none",
                  border: "none",
                  color: "#999",
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

      <h2 className="day-heading" style={{ marginTop: "32px" }}>
        If Time Permits
      </h2>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Add a suggestion..."
          value={newOverflow}
          onChange={(e) => setNewOverflow(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddOverflow()}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #DDD",
            background: "#FFFFFF",
            color: "#222",
            fontSize: "16px",
          }}
        />
        <button
          onClick={handleAddOverflow}
          style={{
            padding: "12px 18px",
            borderRadius: "8px",
            border: "none",
            background: "#FF9800",
            color: "white",
            fontWeight: "bold",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>

      {overflow.length === 0 && (
        <div className="empty-state">
          No suggestions yet. Add places or activities you'd do if there's extra time.
        </div>
      )}

      {overflow.map((item) => (
        <div
          key={item.id}
          onClick={() => setScheduleItem(item)}
          style={{
            padding: "14px",
            marginBottom: "8px",
            background: "#FFFFFF",
            borderRadius: "10px",
            borderLeft: "4px solid #FF9800",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "16px", color: "#222" }}>
              {item.emoji} {item.title}
            </span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#999" }}>Tap to schedule</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteOverflow(item.id);
                }}
                aria-label="Delete suggestion"
                style={{
                  background: "none",
                  border: "none",
                  color: "#999",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          </div>
          {item.notes && (
            <p style={{ fontSize: "14px", color: "#888", margin: "6px 0 0" }}>
              {item.notes}
            </p>
          )}
        </div>
      ))}

      {scheduleItem && (
        <Modal onClose={() => setScheduleItem(null)} labelledBy="schedule-modal-title">
          <h2 className="modal-title" id="schedule-modal-title">
            Schedule: {scheduleItem.emoji} {scheduleItem.title}
          </h2>

            <label className="modal-label">
              Day
              <select
                value={selectedDayId}
                onChange={(e) => setSelectedDayId(e.target.value)}
                className="modal-input"
              >
                <option value="">Choose a day...</option>
                {days.map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.labelFull || day.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="modal-label">
              Time
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="modal-input modal-input-short"
              />
            </label>

            <label className="modal-label">
              Duration
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                className="modal-input"
              >
                <option value={30}>30 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
                <option value={240}>4 hours</option>
              </select>
            </label>

            <div className="modal-buttons">
              <button
                className="modal-btn modal-btn-save"
                onClick={handleSchedule}
                disabled={!selectedDayId}
              >
                Add to Schedule
              </button>
              <button
                className="modal-btn modal-btn-cancel"
                onClick={() => setScheduleItem(null)}
              >
                Cancel
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
}
