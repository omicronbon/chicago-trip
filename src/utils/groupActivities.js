// groupActivities.js
// Merges "(cont.)" activities into their parent activity.
// Input: flat list of activities sorted by time
// Output: grouped activities with an `hourSpan` property
//
// Example:
//   12:00 Lunch — Pequod's Deep Dish
//   13:00 Pequod's Deep Dish (cont.)
// Becomes one entry at 12:00 with hourSpan: 2

export default function groupActivities(activities) {
  const grouped = [];

  for (const activity of activities) {
    // Check if this is a continuation of the previous activity
    const isCont = activity.title.includes("(cont.)");

    if (isCont && grouped.length > 0) {
      // Extend the previous activity's span
      const parent = grouped[grouped.length - 1];
      parent.hourSpan += 1;
      // Merge notes if the continuation has unique notes
      if (activity.notes && activity.notes !== parent.notes) {
        parent.notes = parent.notes
          ? `${parent.notes} · ${activity.notes}`
          : activity.notes;
      }
      // Track child IDs so we can toggle them all at once
      parent.childIds.push(activity.id);
    } else {
      grouped.push({
        ...activity,
        hourSpan: 1,
        childIds: [], // IDs of any "(cont.)" entries
      });
    }
  }

  return grouped;
}
