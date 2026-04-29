// backfillCoordinates.js
// One-time utility to geocode existing activities that have addresses but no coordinates.
// Run this once from the app (via the backfill button in App.js), then remove the button.
//
// Respects Nominatim's 1 req/sec rate limit by waiting 1.1s between requests.

import { db } from "../firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { geocodeAddress } from "./geocode";

// Manual fallbacks for venues Nominatim might not find precisely.
// Matched by checking if any key appears in the activity title (case-insensitive).
const FALLBACK_COORDS = {
  "O'Hare": { lat: 41.9742, lng: -87.9073 },
  "Tuk Tuk Thai": { lat: 41.9108, lng: -87.6773 },
  "The Pendry": { lat: 41.8892, lng: -87.6268 },
  "The Lonesome Rose": { lat: 41.9100, lng: -87.6776 },
  "Architecture Boat Tour": { lat: 41.8884, lng: -87.6246 },
  "Millennium Park": { lat: 41.8827, lng: -87.6227 },
  "The Bean": { lat: 41.8827, lng: -87.6233 },
  "Pequod's": { lat: 41.9217, lng: -87.6645 },
  "Lincoln Park Conservatory": { lat: 41.9242, lng: -87.6358 },
  "Hoodie Bar": { lat: 41.8812, lng: -87.6255 },
  "Magic Lounge": { lat: 41.8843, lng: -87.6245 },
  "Mr. Beef": { lat: 41.8954, lng: -87.6555 },
  "McDonald's Global Menu": { lat: 41.8845, lng: -87.6493 },
  "Art Institute": { lat: 41.8796, lng: -87.6237 },
  "Sluggers": { lat: 41.9485, lng: -87.6562 },
  "Nutella Café": { lat: 41.8850, lng: -87.6245 },
  "Johjto Sushi": { lat: 41.8922, lng: -87.6298 },
  "Chicago Riverwalk": { lat: 41.8882, lng: -87.6218 },
  "Tribune Tower": { lat: 41.8905, lng: -87.6236 },
  "Chinatown": { lat: 41.8517, lng: -87.6315 },
  "Margie's Candies": { lat: 41.9194, lng: -87.6874 },
};

function getFallback(title) {
  if (!title) return null;
  const lower = title.toLowerCase();
  for (const [key, coords] of Object.entries(FALLBACK_COORDS)) {
    if (lower.includes(key.toLowerCase())) {
      return coords;
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function backfillCoordinates(tripId) {
  console.log("Starting coordinate backfill...");

  const daysSnap = await getDocs(collection(db, "trips", tripId, "days"));
  const days = daysSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  let total = 0;
  let geocoded = 0;
  let skipped = 0;
  let failed = 0;

  for (const day of days) {
    const activitiesSnap = await getDocs(
      collection(db, "trips", tripId, "days", day.id, "activities")
    );

    for (const actDoc of activitiesSnap.docs) {
      const act = actDoc.data();
      total++;

      // Skip activities that already have coordinates
      if (act.lat != null && act.lng != null) {
        console.log(`  [skip] "${act.title}" — already has coords`);
        skipped++;
        continue;
      }

      // Skip activities with no address
      if (!act.address || !act.address.trim()) {
        console.log(`  [skip] "${act.title}" — no address`);
        skipped++;
        continue;
      }

      console.log(`  [geocoding] "${act.title}" — "${act.address}"`);

      // Try Nominatim first
      let coords = await geocodeAddress(act.address);

      // Fall back to hardcoded coords if Nominatim returned nothing
      if (!coords) {
        coords = getFallback(act.title);
        if (coords) {
          console.log(`    → used fallback coords for "${act.title}"`);
        }
      }

      if (coords) {
        await updateDoc(
          doc(db, "trips", tripId, "days", day.id, "activities", actDoc.id),
          { lat: coords.lat, lng: coords.lng }
        );
        console.log(`    → saved ${coords.lat}, ${coords.lng}`);
        geocoded++;
      } else {
        console.warn(`    → no coords found for "${act.title}"`);
        failed++;
      }

      // Respect Nominatim's 1 req/sec rate limit
      await sleep(1100);
    }
  }

  console.log(`Backfill complete. Total: ${total}, Geocoded: ${geocoded}, Skipped: ${skipped}, Failed: ${failed}`);
  return { total, geocoded, skipped, failed };
}
