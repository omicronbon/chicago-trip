// ActivityModal.js
// A full-screen modal form for adding or editing an activity.
// Shows pre-filled fields when editing, empty fields when adding.
// The "Delete" button only appears when editing an existing activity.

import React, { useState, useEffect } from "react";

// Category options matching your color system
const CATEGORIES = [
  { value: "confirmed", label: "Confirmed Plan" },
  { value: "new", label: "New Addition" },
  { value: "romantic", label: "Romantic" },
  { value: "travel", label: "Travel / Logistics" },
  { value: "orange", label: "User Addition" },
  { value: "free", label: "Free Time / Suggestion" },
];

function ActivityModal({ activity, onSave, onDelete, onClose }) {
  // If `activity` is provided, we're editing. Otherwise, adding.
  const isEditing = !!activity;

  // Form state, pre-filled if editing
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("");
  const [time, setTime] = useState("12:00");
  const [category, setCategory] = useState("new");
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");

  // Pre-fill fields when editing an existing activity
  useEffect(() => {
    if (activity) {
      setTitle(activity.title || "");
      setEmoji(activity.emoji || "");
      setTime(activity.time || "12:00");
      setCategory(activity.category || "new");
      setNotes(activity.notes || "");
      setAddress(activity.address || "");
    }
  }, [activity]);

  function handleSubmit() {
    if (!title.trim()) return; // Don't save empty titles

    onSave({
      title: title.trim(),
      emoji: emoji.trim(),
      time,
      category,
      notes: notes.trim(),
      address: address.trim(),
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Stop clicks inside the modal from closing it */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{isEditing ? "Edit Activity" : "Add Activity"}</h2>

        <label className="modal-label">
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Dinner at Tuk Tuk Thai"
            className="modal-input"
          />
        </label>

        <label className="modal-label">
          Emoji
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="e.g. 🍜"
            className="modal-input modal-input-short"
          />
        </label>

        <label className="modal-label">
          Time
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="modal-input modal-input-short"
          />
        </label>

        <label className="modal-label">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="modal-input"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </label>

        <label className="modal-label">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            className="modal-input modal-textarea"
          />
        </label>

        <label className="modal-label">
          Address (for Navigate button)
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 233 S Wacker Dr, Chicago, IL"
            className="modal-input"
          />
        </label>

        <div className="modal-buttons">
          <button className="modal-btn modal-btn-save" onClick={handleSubmit}>
            {isEditing ? "Save Changes" : "Add Activity"}
          </button>

          {isEditing && (
            <button
              className="modal-btn modal-btn-delete"
              onClick={() => onDelete(activity.id)}
            >
              Delete
            </button>
          )}

          <button className="modal-btn modal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ActivityModal;