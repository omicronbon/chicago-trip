import React from "react";

const NAV_ITEMS = [
  { key: "itinerary", emoji: "\uD83D\uDCC5", label: "Itinerary" },
  { key: "map", emoji: "\uD83D\uDCCD", label: "Map" },
  { key: "budget", emoji: "\uD83D\uDCB0", label: "Budget" },
  { key: "todo", emoji: "\u2705", label: "To Do" },
];

export default function BottomNav({ activeSection, onSectionChange }) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          className={`bottom-nav-item ${activeSection === item.key ? "active" : ""}`}
          onClick={() => onSectionChange(item.key)}
        >
          <span className="bottom-nav-emoji">{item.emoji}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
