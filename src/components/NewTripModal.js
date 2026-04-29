import React, { useState } from 'react';
import Modal from './Modal';
import { db } from '../firebase';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, n) {
  const r = new Date(date);
  r.setDate(r.getDate() + n);
  return r;
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatLabel(date) {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  return `${weekday} ${date.getMonth() + 1}/${date.getDate()}`;
}

function formatLabelFull(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function NewTripModal({ user, onClose }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !destination.trim()) {
      setError('Trip name and destination are required.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start and end dates are required.');
      return;
    }
    if (endDate < startDate) {
      setError('End date must be on or after start date.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const tripRef = await addDoc(collection(db, 'trips'), {
        name: name.trim(),
        destination: destination.trim(),
        startDate,
        endDate,
        ownerId: user.uid,
        sharedWith: [],
        createdAt: serverTimestamp(),
      });

      const start = parseISODate(startDate);
      const end = parseISODate(endDate);
      let current = start;
      let index = 0;

      while (current <= end) {
        if (index >= 60) {
          throw new Error('Date range exceeds 60 days.');
        }
        const dayId = toISODate(current);
        await setDoc(doc(db, 'trips', tripRef.id, 'days', dayId), {
          date: dayId,
          label: formatLabel(current),
          labelFull: formatLabelFull(current),
          order: index,
        });
        current = addDays(current, 1);
        index++;
      }

      onClose();
      navigate(`/trips/${tripRef.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} labelledBy="new-trip-modal-title">
      <h2 id="new-trip-modal-title" className="modal-title">New trip</h2>
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
        <label className="modal-label">
          Destination
          <input
            className="modal-input"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </label>
        <label className="modal-label">
          Start date
          <input
            className="modal-input modal-input-short"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="modal-label">
          End date
          <input
            className="modal-input modal-input-short"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
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
            {submitting ? 'Creating...' : 'Save'}
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
