import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { TripProvider } from './TripContext';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <TripProvider tripId="chicago-april-2026">
      <App />
    </TripProvider>
  </React.StrictMode>
);

reportWebVitals();
serviceWorkerRegistration.register();
