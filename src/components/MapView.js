// MapView.js
// Trip-wide map showing all activities with addresses, plotted on OpenStreetMap via Leaflet.
// Coordinates are stored on each activity doc in Firestore (lat/lng fields).

import React, { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

function makeCircleIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid rgba(0,0,0,0.4);
      box-shadow: 0 1px 4px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

function formatTime(time) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

// Map a day label like "Fri", "Sat", "Sun", "Mon" to a filter value
function getDayFilter(dayLabel) {
  if (!dayLabel) return "all";
  const lower = dayLabel.toLowerCase().slice(0, 3);
  return lower; // "fri", "sat", "sun", "mon"
}

function MapView({ activities, days }) {
  const [activeFilter, setActiveFilter] = useState("all");

  const mappedActivities = useMemo(() => {
    return activities.filter((a) => a.lat != null && a.lng != null);
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (activeFilter === "all") return mappedActivities;
    return mappedActivities.filter(
      (a) => getDayFilter(a.dayLabel) === activeFilter
    );
  }, [mappedActivities, activeFilter]);

  const totalCount = activities.length;
  const mappedCount = mappedActivities.length;

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
          {mappedCount} of {totalCount} on map
        </span>
      </div>

      <div className="map-container">
        <MapContainer
          center={[41.8827, -87.6233]}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredActivities.map((activity) => {
            const color = CATEGORY_COLORS[activity.category] || "#888";
            const icon = makeCircleIcon(color);
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${activity.lat},${activity.lng}`;

            return (
              <Marker
                key={activity.id}
                position={[activity.lat, activity.lng]}
                icon={icon}
              >
                <Popup>
                  <div style={{ minWidth: "160px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "4px" }}>
                      {activity.emoji ? `${activity.emoji} ` : ""}{activity.title}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>
                      {activity.dayLabel} · {formatTime(activity.time)}
                    </div>
                    {activity.notes ? (
                      <div style={{ fontSize: "11px", color: "#888", marginBottom: "8px" }}>
                        {activity.notes}
                      </div>
                    ) : null}
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        background: "#4a6cf7",
                        color: "#fff",
                        borderRadius: "6px",
                        fontSize: "12px",
                        textDecoration: "none",
                        fontWeight: "600",
                      }}
                    >
                      Navigate
                    </a>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

export default MapView;
