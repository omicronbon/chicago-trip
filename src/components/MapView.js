// MapView.js
// Trip-wide map showing all activities plotted on Google Maps.
// Coordinates are stored on each activity doc in Firestore (lat/lng fields).

import React, { useState, useMemo } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";

const CATEGORY_COLORS = {
  confirmed: "#FFD966",
  new: "#FFEB3B",
  romantic: "#FFEB3B",
  travel: "#A8D5A2",
  orange: "#FF9800",
  free: "#F9F9F9",
};

const DAY_FILTERS = [
  { label: "All", value: "all" },
  { label: "Fri", value: "fri" },
  { label: "Sat", value: "sat" },
  { label: "Sun", value: "sun" },
  { label: "Mon", value: "mon" },
];

function formatTime(time) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function getDayFilter(dayLabel) {
  if (!dayLabel) return "all";
  return dayLabel.toLowerCase().slice(0, 3);
}

function MapView({ activities, days, onBackfill }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);

  const mappedActivities = useMemo(
    () => activities.filter((a) => a.lat != null && a.lng != null),
    [activities]
  );

  const filteredActivities = useMemo(() => {
    if (activeFilter === "all") return mappedActivities;
    return mappedActivities.filter((a) => getDayFilter(a.dayLabel) === activeFilter);
  }, [mappedActivities, activeFilter]);

  const selectedActivity = filteredActivities.find((a) => a.id === selectedId) || null;

  return (
    <div className="map-wrapper">
      <div className="map-filter-bar">
        <div className="map-filter-pills">
          {DAY_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`map-pill ${activeFilter === f.value ? "active" : ""}`}
              onClick={() => setActiveFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="map-counter">
          {mappedActivities.length} of {activities.length} on map
        </span>
        {onBackfill && (
          <button
            style={{
              padding: "4px 10px",
              background: "#333",
              color: "#888",
              border: "1px solid #444",
              borderRadius: "8px",
              fontSize: "11px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            onClick={onBackfill}
          >
            Backfill Coords
          </button>
        )}
      </div>

      <div className="map-container">
        <APIProvider apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
          <Map
            defaultCenter={{ lat: 41.8827, lng: -87.6233 }}
            defaultZoom={12}
            mapId="trip-map"
            gestureHandling="greedy"
            style={{ width: "100%", height: "100%" }}
          >
            {filteredActivities.map((activity) => {
              const color = CATEGORY_COLORS[activity.category] || "#888";
              return (
                <AdvancedMarker
                  key={activity.id}
                  position={{ lat: activity.lat, lng: activity.lng }}
                  onClick={() => setSelectedId(activity.id)}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: color,
                      border: "2px solid white",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                      cursor: "pointer",
                    }}
                  />
                </AdvancedMarker>
              );
            })}

            {selectedActivity && (
              <InfoWindow
                position={{ lat: selectedActivity.lat, lng: selectedActivity.lng }}
                onCloseClick={() => setSelectedId(null)}
              >
                <div style={{ minWidth: 160, fontFamily: "sans-serif" }}>
                  <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 4, color: "#111" }}>
                    {selectedActivity.emoji ? `${selectedActivity.emoji} ` : ""}
                    {selectedActivity.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                    {selectedActivity.dayLabel} · {formatTime(selectedActivity.time)}
                  </div>
                  {selectedActivity.notes && (
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>
                      {selectedActivity.notes}
                    </div>
                  )}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedActivity.lat},${selectedActivity.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      background: "#4a6cf7",
                      color: "#fff",
                      borderRadius: 6,
                      fontSize: 12,
                      textDecoration: "none",
                      fontWeight: "600",
                    }}
                  >
                    Navigate
                  </a>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}

export default MapView;
