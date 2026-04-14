// geocode.js
// Converts an address string to { lat, lng } using Nominatim (OpenStreetMap's free geocoder).
// No API key required. Nominatim has a 1 request/second rate limit — fine for manual activity adds.

export async function geocodeAddress(address) {
  if (!address || !address.trim()) return null;

  // Append city/state to improve accuracy for this Chicago trip
  const query = `${address.trim()}, Chicago, IL`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      headers: {
        // Nominatim requires a User-Agent header — requests without one may be rejected
        "User-Agent": "ChicagoTripPlanner/1.0",
      },
    });

    if (!response.ok) return null;

    const results = await response.json();
    if (!results || results.length === 0) return null;

    const { lat, lon } = results[0];
    return { lat: parseFloat(lat), lng: parseFloat(lon) };
  } catch (err) {
    // Geocoding failure should never block a save — just return null
    console.warn("Geocoding failed:", err);
    return null;
  }
}
