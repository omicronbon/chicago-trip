import React, { useState } from 'react';
import Modal from './Modal';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default function RenameTripModal({ trip, onClose }) {
  const [name, setName] = useState(trip.name);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Trip name is required.');
      return;
    }
    if (trimmed === trip.name) {
      onClose();
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await updateDoc(doc(db, 'trips', trip.id), {
        name: trimmed,
        updatedAt: serverTimestamp(),
      });
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="rename-trip-modal-title">
      <h2 id="rename-trip-modal-title" className="modal-title">Rename trip</h2>
      <form onSubmit={handleSubmit}>
        <label className="modal-label">
          Trip name
          <input
            className="modal-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </label>
        {error && (
          <p style={{ color: '#d32f2f', fontSize: 14, margin: '8px 0' }}>{error}</p>
        )}
        <div className="modal-buttons">
          <button
            type="submit"
            className="modal-btn modal-btn-save"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            className="modal-btn modal-btn-cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
