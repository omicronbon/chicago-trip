// ActivityModal.js
// A full-screen modal form for adding or editing an activity.
// Shows pre-filled fields when editing, empty fields when adding.
// The "Delete" button only appears when editing an existing activity.

import React, { useState, useEffect, useRef, useCallback } from "react";
import { geocodeAddress } from "../utils/geocode";
import { searchAddress } from "../utils/addressSearch";

// Category options matching your color system
const CATEGORIES = [
  { value: "confirmed", label: "Confirmed Plan" },
  { value: "new", label: "New Addition" },
  { value: "romantic", label: "Romantic" },
  { value: "travel", label: "Travel / Logistics" },
  { value: "orange", label: "User Addition" },
  { value: "free", label: "Free Time / Suggestion" },
];

function ActivityModal({ activity, onSave, onDelete, onClose, prefilledTime }) {
  const isEditing = !!activity;

  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("");
  const [time, setTime] = useState("12:00");
  const [category, setCategory] = useState("new");
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [saving, setSaving] = useState(false);
  const [originalAddress, setOriginalAddress] = useState("");

  // Autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // If user picks a suggestion, store coords so we skip Nominatim on save
  const [selectedCoords, setSelectedCoords] = useState(null);

  const debounceRef = useRef(null);
  const addressWrapperRef = useRef(null);

  useEffect(() => {
    if (activity) {
      setTitle(activity.title || "");
      setEmoji(activity.emoji || "");
      setTime(activity.time || "12:00");
      setCategory(activity.category || "new");
      setNotes(activity.notes || "");
      setAddress(activity.address || "");
      setOriginalAddress(activity.address || "");
      setDurationMinutes(activity.durationMinutes || 60);
    } else if (prefilledTime) {
      setTime(prefilledTime);
    }
  }, [activity, prefilledTime]);

  // Close suggestions when clicking outside the address wrapper
  useEffect(() => {
    function handleClickOutside(e) {
      if (addressWrapperRef.current && !addressWrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleAddressChange = useCallback((value) => {
    setAddress(value);
    setSelectedCoords(null); // User is typing again, clear pre-selected coords

    clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await searchAddress(value);
      setAddressSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);
  }, []);

  function handleSelectSuggestion(suggestion) {
    const full = suggestion.address || suggestion.name;
    setAddress(full);
    setSelectedCoords({ lat: suggestion.lat, lng: suggestion.lng });
    setAddressSuggestions([]);
    setShowSuggestions(false);
  }

  function handleAddressKeyDown(e) {
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  async function handleSubmit() {
    if (!title.trim()) return;
    setSaving(true);

    const trimmedAddress = address.trim();
    let coords = {};

    if (selectedCoords) {
      // User picked a suggestion — coords already known, skip geocoding
      coords = { lat: selectedCoords.lat, lng: selectedCoords.lng };
    } else {
      const addressChanged = trimmedAddress !== originalAddress.trim();
      if (trimmedAddress && (!isEditing || addressChanged)) {
        const result = await geocodeAddress(trimmedAddress);
        coords = result ? { lat: result.lat, lng: result.lng } : { lat: null, lng: null };
      } else if (!trimmedAddress) {
        coords = { lat: null, lng: null };
      }
    }

    onSave({
      title: title.trim(),
      emoji: emoji.trim(),
      time,
      category,
      notes: notes.trim(),
      address: trimmedAddress,
      durationMinutes: Number(durationMinutes),
      ...coords,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
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
          Duration
          <select
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="modal-input"
          >
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
            <option value={150}>2.5 hours</option>
            <option value={180}>3 hours</option>
            <option value={240}>4 hours</option>
          </select>
        </label>

        <label className="modal-label">
          Address (for Navigate button)
          <div className="address-wrapper" ref={addressWrapperRef}>
            <input
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              onKeyDown={handleAddressKeyDown}
              placeholder="e.g. 233 S Wacker Dr, Chicago, IL"
              className="modal-input"
              autoComplete="off"
            />
            {showSuggestions && (
              <div className="address-suggestions">
                {addressSuggestions.map((s, i) => (
                  <div
                    key={i}
                    className="address-suggestion-item"
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent input blur before click fires
                      handleSelectSuggestion(s);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(s);
                    }}
                  >
                    <div className="address-suggestion-name">{s.name}</div>
                    {s.address && (
                      <div className="address-suggestion-address">{s.address}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </label>

        <div className="modal-buttons">
          <button className="modal-btn modal-btn-save" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Add Activity"}
          </button>

          {isEditing && (
            <button
              className="modal-btn modal-btn-delete"
              onClick={() => {
                if (window.confirm("Delete this activity? This can't be undone.")) {
                  onDelete(activity.id);
                }
              }}
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
