// ActivityModal.js
// A full-screen modal form for adding or editing an activity.
// Shows pre-filled fields when editing, empty fields when adding.
// The "Delete" button only appears when editing an existing activity.

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { geocodeAddress } from "../utils/geocode";
import { searchAddress } from "../utils/addressSearch";
import Modal from "./Modal";

const CATEGORIES = [
  { value: "Food & Drinks", label: "Food & Drinks" },
  { value: "Activities", label: "Activities" },
  { value: "Travel/Logistics", label: "Travel / Logistics" },
];

function ActivityModal({ activity, onSave, onDelete, onClose, prefilledTime, tripMembers = [], currentUserId }) {
  const isEditing = !!activity;

  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("");
  const [time, setTime] = useState("12:00");
  const [category, setCategory] = useState("Activities");
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [saving, setSaving] = useState(false);
  const [originalAddress, setOriginalAddress] = useState("");
  const [cost, setCost] = useState(null);
  const [paidBy, setPaidBy] = useState(currentUserId || "");
  const [splitBetween, setSplitBetween] = useState(tripMembers.map((m) => m.uid));
  const [titleError, setTitleError] = useState(false);

  // Autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // If user picks a suggestion, store coords so we skip Nominatim on save
  const [selectedCoords, setSelectedCoords] = useState(null);
  // -1 means no suggestion is keyboard-focused. 0+ is the index of the active one.
  // We don't reuse showSuggestions because the visual highlight should only appear
  // after the user arrows down, not when the list first opens.
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const debounceRef = useRef(null);
  const addressWrapperRef = useRef(null);
  const suggestionsListRef = useRef(null);
  const titleInputRef = useRef(null);

  useEffect(() => {
    if (activity) {
      setTitle(activity.title || "");
      setEmoji(activity.emoji || "");
      setTime(activity.time || "12:00");
      setCategory(activity.category || "Activities");
      setConfirmed(activity.confirmed || false);
      setNotes(activity.notes || "");
      setAddress(activity.address || "");
      setOriginalAddress(activity.address || "");
      setDurationMinutes(activity.durationMinutes || 60);
      setCost(activity.cost != null ? activity.cost : null);
      setPaidBy(activity.paidBy || currentUserId || "");
      setSplitBetween(activity.splitBetween || tripMembers.map((m) => m.uid));
    } else {
      if (prefilledTime) setTime(prefilledTime);
      setCost(null);
      setPaidBy(currentUserId || "");
      setSplitBetween(tripMembers.map((m) => m.uid));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity?.id, prefilledTime, currentUserId]);

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

  // When the user arrows through suggestions, keep the active one visible
  useEffect(() => {
    if (activeSuggestionIndex < 0 || !suggestionsListRef.current) return;
    const activeElement = suggestionsListRef.current.querySelector(
      `[data-suggestion-index="${activeSuggestionIndex}"]`
    );
    if (activeElement) {
      activeElement.scrollIntoView({ block: "nearest" });
    }
  }, [activeSuggestionIndex]);

  // Track whether the form has unsaved edits. Used to warn before closing
  // when the user clicks the overlay or hits Escape.
  const isDirty = useMemo(() => {
    if (!activity) {
      // Adding new: any non-empty field counts as dirty
      return (
        title.trim() !== '' ||
        emoji.trim() !== '' ||
        notes.trim() !== '' ||
        address.trim() !== '' ||
        cost != null
      );
    }
    // Editing: compare current state to the original activity
    return (
      title !== (activity.title || '') ||
      emoji !== (activity.emoji || '') ||
      time !== (activity.time || '12:00') ||
      category !== (activity.category || 'Activities') ||
      confirmed !== (activity.confirmed || false) ||
      notes !== (activity.notes || '') ||
      address !== (activity.address || '') ||
      durationMinutes !== (activity.durationMinutes || 60) ||
      (cost != null ? Number(cost) : null) !== (activity.cost != null ? activity.cost : null)
    );
  }, [activity, title, emoji, time, category, confirmed, notes, address, durationMinutes, cost]);

  function handleCloseAttempt() {
    if (isDirty) {
      if (window.confirm('Discard your changes?')) {
        onClose();
      }
      return;
    }
    onClose();
  }

  const handleAddressChange = useCallback((value) => {
    setAddress(value);
    setSelectedCoords(null); // User is typing again, clear pre-selected coords

    clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await searchAddress(value);
      setAddressSuggestions(results);
      setShowSuggestions(results.length > 0);
      setActiveSuggestionIndex(-1); // new search results, nothing highlighted yet
    }, 300);
  }, []);

  function handleSelectSuggestion(suggestion) {
    const full = suggestion.address || suggestion.name;
    setAddress(full);
    setSelectedCoords({ lat: suggestion.lat, lng: suggestion.lng });
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
  }

  function handleAddressKeyDown(e) {
    if (!showSuggestions || addressSuggestions.length === 0) {
      if (e.key === "Escape") setShowSuggestions(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev >= addressSuggestions.length - 1 ? 0 : prev + 1
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev <= 0 ? addressSuggestions.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < addressSuggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(addressSuggestions[activeSuggestionIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  }

  async function handleSubmit(e) {
    // Called from form onSubmit or button onClick — in both cases prevent default
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    // Surface empty-title error inline, focus the field, don't submit
    if (!title.trim()) {
      setTitleError(true);
      if (titleInputRef.current) titleInputRef.current.focus();
      return;
    }

    setTitleError(false);
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

    const hasCost = cost != null && cost !== "";
    onSave({
      title: title.trim(),
      emoji: emoji.trim(),
      time,
      category,
      confirmed,
      notes: notes.trim(),
      address: trimmedAddress,
      durationMinutes: Number(durationMinutes),
      cost: hasCost ? Number(cost) : null,
      paidBy: hasCost ? paidBy : null,
      splitBetween: hasCost ? splitBetween : null,
      ...coords,
    });
  }

  return (
    <Modal onClose={handleCloseAttempt} labelledBy="activity-modal-title">
      <h2 className="modal-title" id="activity-modal-title">
        {isEditing ? "Edit Activity" : "Add Activity"}
      </h2>

      {/* Form wrapper enables Enter-to-submit from any text input */}
      <form onSubmit={handleSubmit} noValidate>
        <label className="modal-label">
          Title
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError && e.target.value.trim()) setTitleError(false);
            }}
            placeholder="e.g. Dinner at Tuk Tuk Thai"
            className="modal-input"
            autoComplete="off"
            aria-invalid={titleError}
            aria-describedby={titleError ? "title-error" : undefined}
          />
          {titleError && (
            <div
              id="title-error"
              role="alert"
              style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}
            >
              Title is required
            </div>
          )}
        </label>

        <label className="modal-label">
          Emoji
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="e.g. 🍜"
            className="modal-input modal-input-short"
            autoComplete="off"
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

        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setConfirmed((v) => !v)}
            className={`confirmed-toggle ${confirmed ? "confirmed" : ""}`}
            aria-pressed={confirmed}
          >
            {confirmed ? "✓ Confirmed" : "Mark as confirmed"}
          </button>
        </div>

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
              role="combobox"
              aria-expanded={showSuggestions}
              aria-controls="address-suggestions-listbox"
              aria-autocomplete="list"
              aria-activedescendant={
                activeSuggestionIndex >= 0
                  ? `address-suggestion-${activeSuggestionIndex}`
                  : undefined
              }
            />
            {showSuggestions && (
              <div
                className="address-suggestions"
                id="address-suggestions-listbox"
                role="listbox"
                ref={suggestionsListRef}
              >
                {addressSuggestions.map((s, i) => {
                  const isActive = i === activeSuggestionIndex;
                  return (
                    <div
                      key={i}
                      id={`address-suggestion-${i}`}
                      data-suggestion-index={i}
                      className={`address-suggestion-item ${isActive ? "active" : ""}`}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActiveSuggestionIndex(i)}
                      onMouseDown={(e) => {
                        e.preventDefault();
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
                  );
                })}
              </div>
            )}
          </div>
        </label>

        <label className="modal-label">
          Cost ($)
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={cost != null ? cost : ""}
            onChange={(e) => setCost(e.target.value === "" ? null : e.target.value)}
            className="modal-input modal-input-short"
          />
        </label>

        {cost != null && cost !== "" && (
          <>
            <label className="modal-label">
              Paid By
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="modal-input"
              >
                {tripMembers.map((m) => (
                  <option key={m.uid} value={m.uid}>{m.displayName}</option>
                ))}
              </select>
            </label>

            <label className="modal-label">
              Split Between
              <div className="split-chips">
                {tripMembers.map((m) => {
                  const selected = splitBetween.includes(m.uid);
                  return (
                    <button
                      key={m.uid}
                      type="button"
                      className={`split-chip ${selected ? "selected" : ""}`}
                      aria-pressed={selected}
                      onClick={() => {
                        if (selected && splitBetween.length <= 1) return;
                        setSplitBetween(
                          selected
                            ? splitBetween.filter((uid) => uid !== m.uid)
                            : [...splitBetween, m.uid]
                        );
                      }}
                    >
                      {m.displayName}
                    </button>
                  );
                })}
              </div>
            </label>
          </>
        )}

        <div className="modal-buttons">
          <button
            type="submit"
            className="modal-btn modal-btn-save"
            disabled={saving}
          >
            {saving ? "Saving…" : isEditing ? "Save Changes" : "Add Activity"}
          </button>

          {isEditing && (
            <button
              type="button"
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

          <button
            type="button"
            className="modal-btn modal-btn-cancel"
            onClick={handleCloseAttempt}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ActivityModal;
