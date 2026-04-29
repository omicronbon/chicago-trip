// seedFirestore.js
// Run once to upload the Chicago itinerary into Firestore.
// After this, the app reads from Firestore instead of local data.

import { db } from "./firebase";
import { doc, setDoc, collection } from "firebase/firestore";
import chicagoItinerary from "./data/chicagoItinerary";

export async function seedTrip() {
  // One-off seed script. Standalone constant — not wired to TripContext.
  const tripId = "chicago-april-2026";

  // Create the trip document
  await setDoc(doc(db, "trips", tripId), {
    name: chicagoItinerary.name,
    destination: chicagoItinerary.destination,
    startDate: chicagoItinerary.startDate,
    endDate: chicagoItinerary.endDate,
    createdAt: new Date(),
  });

  // Loop through each day
  for (let i = 0; i < chicagoItinerary.days.length; i++) {
    const day = chicagoItinerary.days[i];

    // Create a day document
    await setDoc(doc(db, "trips", tripId, "days", day.id), {
      date: day.date,
      label: day.label,
      labelFull: day.labelFull,
      order: i,
    });

    // Create each activity inside that day
    for (const activity of day.activities) {
      await setDoc(
        doc(db, "trips", tripId, "days", day.id, "activities", activity.id),
        {
          time: activity.time,
          title: activity.title,
          emoji: activity.emoji,
          category: activity.category,
          notes: activity.notes,
          address: activity.address,
          completed: false,
          createdAt: new Date(),
        }
      );
    }
  }

  // Save overflow items
  for (const item of chicagoItinerary.overflow) {
    await setDoc(doc(db, "trips", tripId, "overflow", item.id), {
      title: item.title,
      emoji: item.emoji,
      notes: item.notes,
    });
  }

  console.log("Chicago trip seeded to Firestore!");
}