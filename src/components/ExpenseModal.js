import React, { useState, useEffect } from "react";
import Modal from "./Modal";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { useTripId } from "../TripContext";

const CATEGORIES = [
  { value: "Food & Drinks", label: "Food & Drinks" },
  { value: "Activities", label: "Activities" },
  { value: "Transport", label: "Transport" },
  { value: "Lodging", label: "Lodging" },
  { value: "Shopping", label: "Shopping" },
  { value: "Other", label: "Other" },
];

export default function ExpenseModal({
  expense,
  onClose,
  tripMembers = [],
  currentUser,
}) {
  const tripId = useTripId();
  const isEditing = !!expense;

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(currentUser?.uid || "");
  const [splitBetween, setSplitBetween] = useState(tripMembers.map((m) => m.uid));
  const [category, setCategory] = useState("Food & Drinks");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setDescription(expense.description || "");
      setAmount(expense.amount != null ? String(expense.amount) : "");
      setPaidBy(expense.paidBy || currentUser?.uid || "");
      setSplitBetween(expense.splitBetween || tripMembers.map((m) => m.uid));
      setCategory(expense.category || "food");
      setDate(expense.date || new Date().toISOString().split("T")[0]);
    }
  }, [expense, currentUser, tripMembers]);

  async function handleSubmit() {
    if (!description.trim() || !amount) return;
    setSaving(true);

    const data = {
      description: description.trim(),
      amount: Number(amount),
      paidBy,
      splitBetween,
      category,
      date,
    };

    try {
      if (isEditing) {
        await updateDoc(doc(db, "trips", tripId, "expenses", expense.id), {
          ...data,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "trips", tripId, "expenses"), {
          ...data,
          createdBy: currentUser?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      onClose();
    } catch (err) {
      console.error("Error saving expense:", err);
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this expense?")) return;
    await deleteDoc(doc(db, "trips", tripId, "expenses", expense.id));
    onClose();
  }

  return (
    <Modal onClose={onClose} labelledBy="expense-modal-title">
      <h2 className="modal-title" id="expense-modal-title">
        {isEditing ? "Edit Expense" : "Add Expense"}
      </h2>

        <label className="modal-label">
          Description
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
            className="modal-input"
          />
        </label>

        <label className="modal-label">
          Amount
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: "#666", fontSize: 16, pointerEvents: "none",
            }}>$</span>
            <input
              type="number"
              inputMode="decimal"
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

        <label className="modal-label">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="modal-input"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
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
          <button className="modal-btn modal-btn-save" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : isEditing ? "Save Changes" : "Add Expense"}
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
    </Modal>
  );
}
