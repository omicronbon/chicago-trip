// Cascade delete a trip and all its subcollections in a single batch.
// Firestore caps batches at 500 ops; for trips larger than that we'd need to chunk.
// Realistic trip sizes are well under the cap.
import { db } from '../firebase';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';

export async function deleteTripWithCascade(tripId) {
  const batch = writeBatch(db);

  const daysSnap = await getDocs(collection(db, 'trips', tripId, 'days'));
  for (const dayDoc of daysSnap.docs) {
    const activitiesSnap = await getDocs(
      collection(db, 'trips', tripId, 'days', dayDoc.id, 'activities')
    );
    for (const actDoc of activitiesSnap.docs) {
      batch.delete(actDoc.ref);
    }
    batch.delete(dayDoc.ref);
  }

  for (const sub of ['actionItems', 'overflow', 'expenses', 'settlements']) {
    const subSnap = await getDocs(collection(db, 'trips', tripId, sub));
    for (const docRef of subSnap.docs) {
      batch.delete(docRef.ref);
    }
  }

  batch.delete(doc(db, 'trips', tripId));
  await batch.commit();
}
