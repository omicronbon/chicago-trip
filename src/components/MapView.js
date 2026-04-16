import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";

const CATEGORY_COLORS = {
  "Confirmed": "#4CAF50",
  "Eats": "#FF9800",
  "Activities": "#4A90D9",
  "Travel/Logistics": "#9E9E9E",
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

function formatDayShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${weekday} ${month}/${day}`;
}

function getDayFilter(dayLabel) {
  if (!dayLabel) return "all";
  return dayLabel.toLowerCase().slice(0, 3);
}

function MapPanner({ selectedActivity }) {
  const map = useMap();
  useEffect(() => {
    if (map && selectedActivity) {
      map.panTo({ lat: selectedActivity.lat, lng: selectedActivity.lng });
    }
  }, [map, selectedActivity]);
  return null;
}

function MapView({ activities, days, onBackfill }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const cardStripRef = useRef(null);

  const mappedActivities = useMemo(
    () => activities.filter((a) => a.lat != null && a.lng != null),
    [activities]
  );

  const filteredActivities = useMemo(() => {
    if (activeFilter === "all") return mappedActivities;
    return mappedActivities.filter((a) => getDayFilter(a.dayLabel) === activeFilter);
  }, [mappedActivities, activeFilter]);

  const selectedActivity = filteredActivities.find((a) => a.id === selectedId) || null;

  const dayDateMap = useMemo(() => {
    const m = {};
    for (const d of days) m[d.id] = d.date;
    return m;
  }, [days]);

  const scrollToCard = useCallback((activityId) => {
    if (!cardStripRef.current) return;
    const el = cardStripRef.current.querySelector(`[data-card-id="${activityId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []);

  function handlePinClick(id) {
    setSelectedId(id);
    scrollToCard(id);
  }

  function handleCardClick(id) {
    setSelectedId(id);
  }

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
          {filteredActivities.length} pins
        </span>
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
            <MapPanner selectedActivity={selectedActivity} />

            {filteredActivities.map((activity) => {
              const color = CATEGORY_COLORS[activity.category] || "#E0E0E0";
              const isSelected = activity.id === selectedId;
              return (
                <AdvancedMarker
                  key={activity.id}
                  position={{ lat: activity.lat, lng: activity.lng }}
                  onClick={() => handlePinClick(activity.id)}
                >
                  <div
                    style={{
                      width: isSelected ? 24 : 18,
                      height: isSelected ? 24 : 18,
                      borderRadius: "50%",
                      background: color,
                      border: isSelected ? "3px solid #4A90D9" : "2px solid white",
                      boxShadow: isSelected
                        ? "0 2px 8px rgba(74,144,217,0.5)"
                        : "0 2px 6px rgba(0,0,0,0.3)",
                      cursor: "pointer",
                      transition: "all 0.15s",
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
                      background: "#4A90D9",
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

      {filteredActivities.length > 0 && (
        <div className="map-card-strip" ref={cardStripRef}>
          {filteredActivities.map((activity) => {
            const color = CATEGORY_COLORS[activity.category] || "#E0E0E0";
            const isSelected = activity.id === selectedId;
            return (
              <div
                key={activity.id}
                data-card-id={activity.id}
                className={`map-card ${isSelected ? "selected" : ""}`}
                style={{ borderLeftColor: color }}
                onClick={() => handleCardClick(activity.id)}
              >
                <div className="map-card-title">
                  {activity.emoji ? `${activity.emoji} ` : ""}{activity.title}
                </div>
                <div className="map-card-time">{formatTime(activity.time)}</div>
                <div className="map-card-day">
                  {formatDayShort(dayDateMap[activity.dayId]) || activity.dayLabel}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MapView;
