import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { TripProvider } from './TripContext';
import App from './App';
import TripList from './components/TripList';

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
      <Route path="/trips" element={<TripList />} />
      <Route path="/trips/:tripId" element={<TripRoute />} />
      <Route path="*" element={<Navigate to="/trips" replace />} />
    </Routes>
  );
}
