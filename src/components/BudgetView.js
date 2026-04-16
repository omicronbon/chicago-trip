import React, { useState, useMemo } from "react";
import ExpenseModal from "./ExpenseModal";
import SettlementModal from "./SettlementModal";

const CATEGORY_COLORS = {
  "Food & Drinks": "#FF9800",
  "Activities": "#4A90D9",
  "Transport": "#9E9E9E",
  "Lodging": "#8B5CF6",
  "Shopping": "#EC4899",
  "Other": "#6B7280",
};

const CATEGORY_LABELS = {
  "Food & Drinks": "Food & Drinks",
  "Activities": "Activities",
  "Transport": "Transport",
  "Lodging": "Lodging",
  "Shopping": "Shopping",
  "Other": "Other",
};

const ACTIVITY_CATEGORY_MAP = {
  "Food & Drinks": "Food & Drinks",
  "Activities": "Activities",
  "Travel/Logistics": "Transport",
  // Legacy
  "Eats": "Food & Drinks",
  "Confirmed": "Activities",
  "New Addition": "Activities",
  "Romantic": "Activities",
  "User Addition": "Food & Drinks",
  "Free Time": "Other",
};

function fmt(n) {
  return "$" + Math.abs(n).toFixed(2);
}

function getName(uid, tripMembers) {
  const m = tripMembers.find((m) => m.uid === uid);
  return m ? m.displayName : "Unknown";
}

export default function BudgetView({
  activities = [],
  tripMembers = [],
  expenses = [],
  settlements = [],
  currentUser,
}) {
  const [expenseModal, setExpenseModal] = useState(null); // null | "add" | expense object
  const [settlementModal, setSettlementModal] = useState(null); // null | "add" | settlement object | { prefill: {...} }

  // Merge activity costs + standalone expenses into one normalized list
  const allExpenses = useMemo(() => {
    const activityExpenses = activities
      .filter((a) => a.cost != null && a.cost > 0 && a.splitBetween?.length)
      .map((a) => ({
        id: a.id,
        description: a.title,
        amount: a.cost,
        paidBy: a.paidBy,
        splitBetween: a.splitBetween,
        category: ACTIVITY_CATEGORY_MAP[a.category] || "other",
        date: a.dayDate || "",
        source: "activity",
      }));

    const standaloneExpenses = expenses.map((e) => ({
      ...e,
      source: "expense",
    }));

    return [...activityExpenses, ...standaloneExpenses].sort((a, b) => {
      if (b.date !== a.date) return b.date > a.date ? 1 : -1;
      return (b.amount || 0) - (a.amount || 0);
    });
  }, [activities, expenses]);

  // Calculate per-person stats
  const { tripTotal, balances } = useMemo(() => {
    const s = {};
    for (const m of tripMembers) {
      s[m.uid] = { paid: 0, fairShare: 0 };
    }

    let total = 0;
    for (const e of allExpenses) {
      total += e.amount;
      if (s[e.paidBy]) {
        s[e.paidBy].paid += e.amount;
      }
      const share = e.amount / e.splitBetween.length;
      for (const uid of e.splitBetween) {
        if (s[uid]) s[uid].fairShare += share;
      }
    }

    // Factor in settlements
    const bal = tripMembers.map((m) => {
      const st = s[m.uid] || { paid: 0, fairShare: 0 };
      let net = st.paid - st.fairShare;

      for (const sett of settlements) {
        if (sett.fromUid === m.uid) net += sett.amount;
        if (sett.toUid === m.uid) net -= sett.amount;
      }

      return { uid: m.uid, name: m.displayName, net };
    });

    return { tripTotal: total, stats: s, balances: bal };
  }, [allExpenses, settlements, tripMembers]);

  // Settle-up algorithm
  const settleUps = useMemo(() => {
    const debtors = balances
      .filter((b) => b.net < -0.005)
      .map((b) => ({ ...b }))
      .sort((a, b) => a.net - b.net);
    const creditors = balances
      .filter((b) => b.net > 0.005)
      .map((b) => ({ ...b }))
      .sort((a, b) => b.net - a.net);

    const result = [];
    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const amount = Math.min(-debtors[di].net, creditors[ci].net);
      result.push({
        fromUid: debtors[di].uid,
        fromName: debtors[di].name,
        toUid: creditors[ci].uid,
        toName: creditors[ci].name,
        amount,
      });
      debtors[di].net += amount;
      creditors[ci].net -= amount;
      if (Math.abs(debtors[di].net) < 0.005) di++;
      if (Math.abs(creditors[ci].net) < 0.005) ci++;
    }
    return result;
  }, [balances]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const totals = {};
    for (const e of allExpenses) {
      const cat = e.category || "other";
      totals[cat] = (totals[cat] || 0) + e.amount;
    }
    return Object.entries(totals)
      .map(([cat, amount]) => ({ category: cat, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [allExpenses]);

  const maxCategoryAmount = categoryBreakdown.length > 0 ? categoryBreakdown[0].amount : 0;

  return (
    <div className="budget-view">
      {/* Section A: Summary Card */}
      <div className="budget-summary-card">
        <div className="budget-total">{fmt(tripTotal)}</div>
        <div className="budget-total-label">
          from {allExpenses.length} expense{allExpenses.length !== 1 ? "s" : ""}
        </div>
        <div style={{ marginTop: 12 }}>
          {balances.map((b) => (
            <div key={b.uid} className="budget-member-row">
              <span>{b.name}</span>
              <span className={b.net >= 0.005 ? "budget-net-positive" : b.net <= -0.005 ? "budget-net-negative" : ""}>
                {b.net >= 0.005 ? "+" : ""}{fmt(b.net)}{b.net <= -0.005 ? "" : ""}
                {Math.abs(b.net) < 0.005 ? "" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Section B: Settle Up */}
      <div className="budget-settle-card">
        <div className="budget-section-header" style={{ marginTop: 0 }}>SETTLE UP</div>
        {settleUps.length === 0 ? (
          <div className="budget-settled-message">
            <span style={{ fontSize: "1.5rem" }}>&#10003;</span> All settled up!
          </div>
        ) : (
          settleUps.map((s, i) => (
            <div key={i} className="budget-settle-row">
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{s.fromName}</span>
                <span style={{ color: "#666" }}> owes </span>
                <span style={{ fontWeight: 600, color: "#4CAF50" }}>{s.toName}</span>
                <span style={{ fontWeight: 600 }}> {fmt(s.amount)}</span>
              </div>
              <button
                className="budget-record-btn"
                onClick={() =>
                  setSettlementModal({
                    prefill: { fromUid: s.fromUid, toUid: s.toUid, amount: s.amount },
                  })
                }
              >
                Record Payment
              </button>
            </div>
          ))
        )}
      </div>

      {/* Section C: Breakdown by Category */}
      {categoryBreakdown.length > 0 && (
        <div>
          <div className="budget-section-header">SPENDING BY CATEGORY</div>
          {categoryBreakdown.map((c) => (
            <div key={c.category} className="budget-category-row">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                  {CATEGORY_LABELS[c.category] || c.category}
                </span>
                <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{fmt(c.amount)}</span>
              </div>
              <div
                className="budget-category-bar"
                style={{
                  width: `${(c.amount / maxCategoryAmount) * 100}%`,
                  background: CATEGORY_COLORS[c.category] || "#6B7280",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Section D: All Expenses */}
      <div className="budget-section-header">ALL EXPENSES</div>
      {allExpenses.length === 0 ? (
        <div style={{ color: "#999", textAlign: "center", padding: 24 }}>
          No expenses yet. Tap + to add one.
        </div>
      ) : (
        allExpenses.map((e) => (
          <div
            key={`${e.source}-${e.id}`}
            className="budget-expense-row"
            onClick={() => {
              if (e.source === "expense") setExpenseModal(e);
            }}
            style={e.source === "activity" ? { cursor: "default" } : {}}
          >
            <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
              <span
                className="budget-category-dot"
                style={{ background: CATEGORY_COLORS[e.category] || "#6B7280" }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {e.source === "activity" && <span>📌 </span>}
                  {e.description}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#999", marginTop: 2 }}>
                  {e.date} &middot; {getName(e.paidBy, tripMembers)} paid
                </div>
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: "1rem", marginLeft: 12, flexShrink: 0 }}>
              {fmt(e.amount)}
            </div>
          </div>
        ))
      )}

      {/* Section E: Settlements Log */}
      <div className="budget-section-header">PAYMENT HISTORY</div>
      {settlements.length === 0 ? (
        <div style={{ color: "#999", textAlign: "center", padding: 24 }}>
          No payments recorded yet
        </div>
      ) : (
        settlements.map((s) => (
          <div
            key={s.id}
            className="budget-settlement-row"
            onClick={() => setSettlementModal(s)}
            style={{ cursor: "pointer" }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                {getName(s.fromUid, tripMembers)} paid {getName(s.toUid, tripMembers)}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#999", marginTop: 2 }}>
                {s.date}{s.note ? ` · ${s.note}` : ""}
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: "1rem", marginLeft: 12, flexShrink: 0 }}>
              {fmt(s.amount)}
            </div>
          </div>
        ))
      )}

      {/* FAB */}
      <button className="budget-fab" onClick={() => setExpenseModal("add")}>
        +
      </button>

      {/* Modals */}
      {expenseModal && (
        <ExpenseModal
          expense={expenseModal === "add" ? null : expenseModal}
          onClose={() => setExpenseModal(null)}
          tripMembers={tripMembers}
          currentUser={currentUser}
        />
      )}

      {settlementModal && (
        <SettlementModal
          settlement={
            settlementModal.prefill ? null : settlementModal
          }
          prefill={settlementModal.prefill || null}
          onClose={() => setSettlementModal(null)}
          tripMembers={tripMembers}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
