import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

const TRIP_ID = "chicago-april-2026";

export default function SettlementModal({
  settlement,
  onClose,
  tripMembers = [],
  currentUser,
  prefill,
}) {
  const isEditing = !!settlement;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const [fromUid, setFromUid] = useState("");
  const [toUid, setToUid] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (settlement) {
      setFromUid(settlement.fromUid || "");
      setToUid(settlement.toUid || "");
      setAmount(settlement.amount != null ? String(settlement.amount) : "");
      setNote(settlement.note || "");
      setDate(settlement.date || new Date().toISOString().split("T")[0]);
    } else if (prefill) {
      setFromUid(prefill.fromUid || "");
      setToUid(prefill.toUid || "");
      setAmount(prefill.amount != null ? String(prefill.amount.toFixed(2)) : "");
    }
  }, [settlement, prefill]);

  useEffect(() => {
    if (fromUid && toUid && fromUid === toUid) {
      setError("Sender and receiver cannot be the same person");
    } else {
      setError("");
    }
  }, [fromUid, toUid]);

  async function handleSubmit() {
    if (!fromUid || !toUid || !amount || fromUid === toUid) return;
    setSaving(true);

    const data = {
      fromUid,
      toUid,
      amount: Number(amount),
      note: note.trim() || null,
      date,
    };

    try {
      if (isEditing) {
        await updateDoc(doc(db, "trips", TRIP_ID, "settlements", settlement.id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "trips", TRIP_ID, "settlements"), {
          ...data,
          createdBy: currentUser?.uid,
          createdAt: serverTimestamp(),
        });
      }
      onClose();
    } catch (err) {
      console.error("Error saving settlement:", err);
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this payment record?")) return;
    await deleteDoc(doc(db, "trips", TRIP_ID, "settlements", settlement.id));
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{isEditing ? "Edit Payment" : "Record Payment"}</h2>

        <label className="modal-label">
          Who paid
          <select
            value={fromUid}
            onChange={(e) => setFromUid(e.target.value)}
            className="modal-input"
          >
            <option value="">Select person...</option>
            {tripMembers.map((m) => (
              <option key={m.uid} value={m.uid}>{m.displayName}</option>
            ))}
          </select>
        </label>

        <label className="modal-label">
          Who received
          <select
            value={toUid}
            onChange={(e) => setToUid(e.target.value)}
            className="modal-input"
          >
            <option value="">Select person...</option>
            {tripMembers.map((m) => (
              <option key={m.uid} value={m.uid}>{m.displayName}</option>
            ))}
          </select>
        </label>

        {error && (
          <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 8 }}>{error}</div>
        )}

        <label className="modal-label">
          Amount
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: "#666", fontSize: 16, pointerEvents: "none",
            }}>$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="modal-input"
              style={{ paddingLeft: 28 }}
            />
          </div>
        </label>

        <label className="modal-label">
          Note (optional)
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Venmo, cash"
            className="modal-input"
          />
        </label>

        <label className="modal-label">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="modal-input modal-input-short"
          />
        </label>

        <div className="modal-buttons">
          <button
            className="modal-btn modal-btn-save"
            onClick={handleSubmit}
            disabled={saving || !!error}
          >
            {saving ? "Saving..." : isEditing ? "Save Changes" : "Record Payment"}
          </button>

          {isEditing && (
            <button className="modal-btn modal-btn-delete" onClick={handleDelete}>
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
