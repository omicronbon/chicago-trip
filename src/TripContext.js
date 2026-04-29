import { createContext, useContext } from "react";

const TripContext = createContext();

export function TripProvider({ tripId, children }) {
  return <TripContext.Provider value={tripId}>{children}</TripContext.Provider>;
}

export function useTripId() {
  const tripId = useContext(TripContext);
  if (tripId === undefined) {
    throw new Error("useTripId must be used inside <TripProvider>");
  }
  return tripId;
}
