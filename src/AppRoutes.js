import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { TripProvider } from './TripContext';
import App from './App';

function TripRoute() {
  const { tripId } = useParams();
  return (
    <TripProvider tripId={tripId}>
      <App />
    </TripProvider>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/trips/:tripId" element={<TripRoute />} />
      <Route path="*" element={<Navigate to="/trips/chicago-april-2026" replace />} />
    </Routes>
  );
}
