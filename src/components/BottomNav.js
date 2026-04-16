import React from "react";

const NAV_ITEMS = [
  { key: "itinerary", emoji: "\uD83D\uDCC5", label: "Itinerary" },
  { key: "map", emoji: "\uD83D\uDCCD", label: "Map" },
  { key: "budget", emoji: "\uD83D\uDCB0", label: "Budget" },
  { key: "todo", emoji: "\u2705", label: "To Do" },
];

export default function BottomNav({ activeSection, onSectionChange }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const isActive = activeSection === item.key;
        return (
          <button
            key={item.key}
            type="button"
            className={`bottom-nav-item ${isActive ? "active" : ""}`}
            onClick={() => onSectionChange(item.key)}
            aria-current={isActive ? "page" : undefined}
          >
            {/* aria-hidden: emoji is decorative, label conveys meaning */}
            <span className="bottom-nav-emoji" aria-hidden="true">
              {item.emoji}
            </span>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
