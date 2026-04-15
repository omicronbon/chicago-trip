import React from "react";

function fmt(n) {
  return `$${n.toFixed(2)}`;
}

export default function BudgetView({ activities = [], tripMembers = [] }) {
  const costed = activities.filter((a) => a.cost != null && a.splitBetween?.length);

  if (costed.length === 0) {
    return (
      <div className="budget-view">
        <div className="budget-empty">
          No expenses logged yet. Add a cost to any activity to start tracking.
        </div>
      </div>
    );
  }

  // Trip total
  const tripTotal = costed.reduce((sum, a) => sum + a.cost, 0);

  // Per-person: paid and fair share
  const stats = {};
  for (const m of tripMembers) {
    stats[m.uid] = { paid: 0, fairShare: 0 };
  }

  for (const a of costed) {
    if (stats[a.paidBy] !== undefined) {
      stats[a.paidBy].paid += a.cost;
    }
    const share = a.cost / a.splitBetween.length;
    for (const uid of a.splitBetween) {
      if (stats[uid] !== undefined) {
        stats[uid].fairShare += share;
      }
    }
  }

  // Settle-up: net = paid - fairShare (positive = owed money, negative = owes money)
  const balances = tripMembers.map((m) => ({
    uid: m.uid,
    name: m.displayName,
    net: (stats[m.uid]?.paid || 0) - (stats[m.uid]?.fairShare || 0),
  }));

  const settlements = [];
  const debtors = balances
    .filter((b) => b.net < -0.005)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.net - b.net);
  const creditors = balances
    .filter((b) => b.net > 0.005)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net - a.net);

  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const amount = Math.min(-debtors[di].net, creditors[ci].net);
    settlements.push({
      from: debtors[di].name,
      to: creditors[ci].name,
      amount,
    });
    debtors[di].net += amount;
    creditors[ci].net -= amount;
    if (Math.abs(debtors[di].net) < 0.005) di++;
    if (Math.abs(creditors[ci].net) < 0.005) ci++;
  }

  return (
    <div className="budget-view">
      {/* Section A: Trip Total */}
      <div className="budget-card">
        <h3>Trip Total</h3>
        <div className="budget-total">{fmt(tripTotal)}</div>
      </div>

      {/* Section B: Per-Person Breakdown */}
      <div className="budget-card">
        <h3>Per-Person Breakdown</h3>
        {tripMembers.map((m) => {
          const s = stats[m.uid] || { paid: 0, fairShare: 0 };
          return (
            <div key={m.uid} className="budget-member-row">
              <span>{m.displayName}</span>
              <span>Paid: {fmt(s.paid)} | Fair Share: {fmt(s.fairShare)}</span>
            </div>
          );
        })}
      </div>

      {/* Section C: Settle Up */}
      <div className="budget-card">
        <h3>Settle Up</h3>
        {settlements.length === 0 ? (
          <div style={{ color: "#4CAF50", fontWeight: 600 }}>All settled up!</div>
        ) : (
          settlements.map((s, i) => (
            <div key={i} className="settle-row">
              <span style={{ fontWeight: 600 }}>{s.from}</span> owes{" "}
              <span style={{ color: "#4CAF50", fontWeight: 600 }}>{s.to}</span>:{" "}
              <span style={{ fontWeight: 600 }}>{fmt(s.amount)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
