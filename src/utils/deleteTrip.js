// Cascade delete a trip and all its subcollections in a single batch.
// Firestore caps batches at 500 ops; for trips larger than that we'd need to chunk.
// Realistic trip sizes are well under the cap.
import { db } from '../firebase';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';

export async function deleteTripWithCascade(tripId) {
  const daysSnap = await getDocs(collection(db, 'trips', tripId, 'days'));

  const [activitySnaps, subSnaps] = await Promise.all([
    Promise.all(
      daysSnap.docs.map((dayDoc) =>
        getDocs(collection(db, 'trips', tripId, 'days', dayDoc.id, 'activities'))
      )
    ),
    Promise.all(
      ['actionItems', 'overflow', 'expenses', 'settlements'].map((sub) =>
        getDocs(collection(db, 'trips', tripId, sub))
      )
    ),
  ]);

  const batch = writeBatch(db);
  activitySnaps.forEach((snap) => snap.docs.forEach((d) => batch.delete(d.ref)));
  daysSnap.docs.forEach((d) => batch.delete(d.ref));
  subSnaps.forEach((snap) => snap.docs.forEach((d) => batch.delete(d.ref)));
  batch.delete(doc(db, 'trips', tripId));
  await batch.commit();
}
