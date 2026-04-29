import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { searchAddress } from "../utils/addressSearch";
import Modal from "./Modal";

const CATEGORY_COLORS = {
  // Current
  "Food & Drinks": "#FF9800",
  "Activities": "#4A90D9",
  "Travel/Logistics": "#9E9E9E",
  // Legacy fallbacks
  "Eats": "#FF9800",
  "Confirmed": "#4A90D9",
  "New Addition": "#4A90D9",
  "Romantic": "#4A90D9",
  "User Addition": "#FF9800",
  "Free Time": "#9E9E9E",
};

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

function MapPanner({ selectedActivity }) {
  const map = useMap();
  useEffect(() => {
    if (map && selectedActivity) {
      map.panTo({ lat: selectedActivity.lat, lng: selectedActivity.lng });
    }
  }, [map, selectedActivity]);
  return null;
}

function InitialFit({ hotel, activities }) {
  const map = useMap();
  const fittedRef = useRef(false);
  useEffect(() => {
    if (!map || fittedRef.current) return;
    const points = [];
    if (hotel) points.push({ lat: hotel.lat, lng: hotel.lng });
    activities.forEach((a) => points.push({ lat: a.lat, lng: a.lng }));
    if (points.length === 0) return;
    fittedRef.current = true;
    if (points.length === 1) {
      map.panTo(points[0]);
      map.setZoom(13);
      return;
    }
    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 50);
  }, [map, hotel, activities]);
  return null;
}

function MapView({ activities, days, hotel, onSaveHotel }) {
  const [activeFilter, setActiveFilter] = useState("all");
  const filterInitializedRef = useRef(false);
  const [selectedId, setSelectedId] = useState(null);
  const [hotelInfoOpen, setHotelInfoOpen] = useState(false);
  const cardStripRef = useRef(null);

  // Hotel modal state
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [hotelName, setHotelName] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelCoords, setHotelCoords] = useState(null);
  const [hotelSuggestions, setHotelSuggestions] = useState([]);
  const [showHotelSuggestions, setShowHotelSuggestions] = useState(false);
  const [hotelSaving, setHotelSaving] = useState(false);
  const [activeHotelSuggestionIndex, setActiveHotelSuggestionIndex] = useState(-1);
  const hotelDebounceRef = useRef(null);
  const hotelAddressWrapperRef = useRef(null);
  const hotelSuggestionsListRef = useRef(null);

  useEffect(() => {
    if (filterInitializedRef.current || days.length === 0) return;
    filterInitializedRef.current = true;
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const todayDay = days.find((d) => d.date === todayISO);
    if (todayDay) {
      setActiveFilter(todayDay.id);
      return;
    }
    const firstDay = days[0];
    if (firstDay && firstDay.date > todayISO) {
      setActiveFilter(firstDay.id);
    }
    // Otherwise leave as "all" (trip is in the past)
  }, [days]);

  const dayFilters = useMemo(() => [
    { label: "All", value: "all" },
    ...days.map((d) => ({ label: d.label, value: d.id })),
  ], [days]);

  function openHotelModal() {
    setHotelName(hotel?.name || "");
    setHotelAddress(hotel?.address || "");
    setHotelCoords(hotel ? { lat: hotel.lat, lng: hotel.lng } : null);
    setHotelSuggestions([]);
    setShowHotelSuggestions(false);
    setShowHotelModal(true);
  }

  const handleHotelAddressChange = useCallback((value) => {
    setHotelAddress(value);
    setHotelCoords(null);
    clearTimeout(hotelDebounceRef.current);
    if (value.trim().length < 3) {
      setHotelSuggestions([]);
      setShowHotelSuggestions(false);
      return;
    }
    hotelDebounceRef.current = setTimeout(async () => {
      const results = await searchAddress(value);
      setHotelSuggestions(results);
      setShowHotelSuggestions(results.length > 0);
      setActiveHotelSuggestionIndex(-1);
    }, 300);
  }, []);

  function handleSelectHotelSuggestion(s) {
    setHotelAddress(s.address || s.name);
    setHotelCoords({ lat: s.lat, lng: s.lng });
    setHotelSuggestions([]);
    setShowHotelSuggestions(false);
    setActiveHotelSuggestionIndex(-1);
  }

  async function handleSaveHotel() {
    if (!hotelName.trim() || !hotelCoords) return;
    setHotelSaving(true);
    await onSaveHotel({
      name: hotelName.trim(),
      address: hotelAddress.trim(),
      lat: hotelCoords.lat,
      lng: hotelCoords.lng,
    });
    setHotelSaving(false);
    setShowHotelModal(false);
  }

  useEffect(() => {
    if (activeHotelSuggestionIndex < 0 || !hotelSuggestionsListRef.current) return;
    const activeEl = hotelSuggestionsListRef.current.querySelector(
      `[data-suggestion-index="${activeHotelSuggestionIndex}"]`
    );
    if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
  }, [activeHotelSuggestionIndex]);

  function handleHotelAddressKeyDown(e) {
    if (!showHotelSuggestions || hotelSuggestions.length === 0) {
      if (e.key === "Escape") setShowHotelSuggestions(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveHotelSuggestionIndex((prev) =>
        prev >= hotelSuggestions.length - 1 ? 0 : prev + 1
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveHotelSuggestionIndex((prev) =>
        prev <= 0 ? hotelSuggestions.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      if (activeHotelSuggestionIndex >= 0 && activeHotelSuggestionIndex < hotelSuggestions.length) {
        e.preventDefault();
        handleSelectHotelSuggestion(hotelSuggestions[activeHotelSuggestionIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowHotelSuggestions(false);
      setActiveHotelSuggestionIndex(-1);
    }
  }

  // Close hotel suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (hotelAddressWrapperRef.current && !hotelAddressWrapperRef.current.contains(e.target)) {
        setShowHotelSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const mappedActivities = useMemo(
    () => activities.filter((a) => a.lat != null && a.lng != null),
    [activities]
  );

  const filteredActivities = useMemo(() => {
    if (activeFilter === "all") return mappedActivities;
    return mappedActivities.filter((a) => a.dayId === activeFilter);
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
    if (el) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, []);

  function handlePinClick(id) {
    setSelectedId(id);
    scrollToCard(id);
  }

  function handleCardClick(id) {
    setSelectedId(id);
  }

  return (
    <>
      <div className="map-wrapper">
        <div className="map-filter-bar">
          <div className="map-filter-pills">
            {dayFilters.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`map-pill ${activeFilter === f.value ? "active" : ""}`}
                onClick={() => setActiveFilter(f.value)}
                aria-pressed={activeFilter === f.value}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button type="button" className="hotel-btn" onClick={openHotelModal}>
            {hotel ? `🏠 ${hotel.name}` : "🏠 Set Hotel"}
          </button>
          <span className="map-counter">
            {filteredActivities.length} pin{filteredActivities.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="map-container">
          <APIProvider apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
            <Map
              defaultCenter={{ lat: 39.5, lng: -98.35 }}
              defaultZoom={4}
              mapId="trip-map"
              gestureHandling="greedy"
              style={{ width: "100%", height: "100%" }}
            >
              <MapPanner selectedActivity={selectedActivity} />
              <InitialFit hotel={hotel} activities={mappedActivities} />

              {/* Hotel pin — always visible, ignores day filter */}
              {hotel && (
                <AdvancedMarker
                  position={{ lat: hotel.lat, lng: hotel.lng }}
                  onClick={() => setHotelInfoOpen(true)}
                >
                  <div style={{
                    fontSize: 26,
                    lineHeight: 1,
                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.35))",
                    cursor: "pointer",
                  }}>🏠</div>
                </AdvancedMarker>
              )}

              {hotel && hotelInfoOpen && (
                <InfoWindow
                  position={{ lat: hotel.lat, lng: hotel.lng }}
                  onCloseClick={() => setHotelInfoOpen(false)}
                >
                  <div style={{ minWidth: 160, fontFamily: "sans-serif" }}>
                    <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 4, color: "#111" }}>
                      🏠 {hotel.name}
                    </div>
                    {hotel.address && (
                      <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                        {hotel.address}
                      </div>
                    )}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${hotel.lat},${hotel.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        background: "#222",
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
                        transition: "width 0.15s, height 0.15s, box-shadow 0.15s",
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

        {filteredActivities.length > 0 ? (
          <div className="map-card-strip" ref={cardStripRef}>
            {filteredActivities.map((activity) => {
              const color = CATEGORY_COLORS[activity.category] || "#E0E0E0";
              const isSelected = activity.id === selectedId;
              return (
                <button
                  key={activity.id}
                  type="button"
                  data-card-id={activity.id}
                  className={`map-card ${isSelected ? "selected" : ""}`}
                  style={{ borderLeftColor: color }}
                  onClick={() => handleCardClick(activity.id)}
                  aria-pressed={isSelected}
                >
                  <div className="map-card-title">
                    {activity.emoji ? `${activity.emoji} ` : ""}{activity.title}
                  </div>
                  <div className="map-card-time">{formatTime(activity.time)}</div>
                  <div className="map-card-day">
                    {formatDayShort(dayDateMap[activity.dayId]) || activity.dayLabel}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          mappedActivities.length > 0 && (
            <div className="map-card-strip-empty">
              No activities on this day. Try a different filter.
            </div>
          )
        )}
      </div>

      {/* Hotel modal */}
      {showHotelModal && (
        <Modal onClose={() => setShowHotelModal(false)} labelledBy="hotel-modal-title">
          <h2 className="modal-title" id="hotel-modal-title">
            <span aria-hidden="true">🏠</span> Set Hotel
          </h2>

          <label className="modal-label">
            Hotel Name
            <input
              type="text"
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              placeholder="e.g. Hotel EMC2"
              className="modal-input"
              autoFocus
            />
          </label>

          <label className="modal-label">
            Address
            <div className="address-wrapper" ref={hotelAddressWrapperRef}>
              <input
                type="text"
                value={hotelAddress}
                onChange={(e) => handleHotelAddressChange(e.target.value)}
                onKeyDown={handleHotelAddressKeyDown}
                placeholder="Search for hotel address"
                className="modal-input"
                autoComplete="off"
                role="combobox"
                aria-expanded={showHotelSuggestions}
                aria-controls="hotel-suggestions-listbox"
                aria-autocomplete="list"
                aria-activedescendant={
                  activeHotelSuggestionIndex >= 0
                    ? `hotel-suggestion-${activeHotelSuggestionIndex}`
                    : undefined
                }
              />
              {showHotelSuggestions && (
                <div
                  className="address-suggestions"
                  id="hotel-suggestions-listbox"
                  role="listbox"
                  ref={hotelSuggestionsListRef}
                >
                  {hotelSuggestions.map((s, i) => {
                    const isActive = i === activeHotelSuggestionIndex;
                    return (
                      <div
                        key={i}
                        id={`hotel-suggestion-${i}`}
                        data-suggestion-index={i}
                        className={`address-suggestion-item ${isActive ? "active" : ""}`}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveHotelSuggestionIndex(i)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectHotelSuggestion(s);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          handleSelectHotelSuggestion(s);
                        }}
                      >
                        <div className="address-suggestion-name">{s.name}</div>
                        {s.address && (
                          <div className="address-suggestion-address">{s.address}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </label>

          {hotelCoords && (
            <p style={{ fontSize: 12, color: "#4CAF50", margin: "4px 0 12px", fontWeight: 600 }}>
              Location set
            </p>
          )}

          <div className="modal-buttons">
            <button
              type="button"
              className="modal-btn modal-btn-save"
              onClick={handleSaveHotel}
              disabled={hotelSaving || !hotelName.trim() || !hotelCoords}
            >
              {hotelSaving ? "Saving…" : "Save Hotel"}
            </button>
            <button
              type="button"
              className="modal-btn modal-btn-cancel"
              onClick={() => setShowHotelModal(false)}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default MapView;
