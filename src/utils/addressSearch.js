// addressSearch.js
// Searches for places using Google Places API (New) Text Search.
// Biased toward Chicago via locationBias.
//
// Note: callers should debounce calls to this function (300ms recommended).

export async function searchAddress(query) {
  if (!query || query.trim().length < 3) return [];

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({
        textQuery: query.trim(),
        locationBias: {
          circle: {
            center: { latitude: 41.8827, longitude: -87.6233 },
            radius: 50000,
          },
        },
        maxResultCount: 5,
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.places || data.places.length === 0) return [];

    return data.places.map((place) => ({
      name: place.displayName?.text || "",
      address: place.formattedAddress || "",
      lat: place.location?.latitude,
      lng: place.location?.longitude,
    }));
  } catch (err) {
    console.warn("Address search failed:", err);
    return [];
  }
}
