# Trip Planner — Claude Code Project Context

Multi-trip itinerary planner. React + Firestore + Google Auth. Deploys to Vercel on push to main.

## Tech stack
- React 18 (Create React App)
- React Router v7 in library mode (API-compatible with v6)
- Firebase Firestore with persistentLocalCache
- Firebase Auth (Google, signInWithRedirect)
- Google Places API for address search
- Google Maps via @vis.gl/react-google-maps
- Vercel auto-deploy

## Routing
- `/` → redirects to `/trips`
- `/trips` → TripList (lists trips user owns or is shared on)
- `/trips/:tripId` → App (single trip view)
- `*` → redirects to `/trips`

## Trip ID handling
- One source of truth: route param parsed by useParams in AppRoutes.js → passed to TripProvider → consumed via useTripId() hook in components
- Utilities (deleteTrip.js, backfillCoordinates.js) accept tripId as a parameter
- seedFirestore.js has its own standalone constant (intentional — one-off bootstrap)

## File structure
```
src/
  index.js                    BrowserRouter wraps AppRoutes
  AppRoutes.js                Route definitions
  App.js                      Single-trip view: timeline, map, budget, todos
  App.css                     All styles
  TripContext.js              tripId provider + useTripId hook
  firebase.js                 Firebase init + getRedirectResult on boot
  components/
    LoginScreen, BottomNav, DaySelector, TimelineView, ActivityCard,
    ActivityModal, ActionItems, MapView, BudgetView, ExpenseModal,
    SettlementModal, ShareModal, TripList, NewTripModal,
    RenameTripModal, Modal
  utils/
    geocode, addressSearch, backfillCoordinates, deleteTrip
  data/
    chicagoItinerary.js       (used only by seedFirestore.js — see BACKLOG)
  seedFirestore.js            One-off bootstrap script
  service-worker.js
firestore.rules               Versioned security rules
firebase.json                 Firebase config
.firebaserc                   Project ID
vercel.json                   SPA rewrites
```

## Firestore data model
```
trips/{tripId}/
  name, destination, startDate, endDate, ownerId, sharedWith[], createdAt
  hotelName, hotelAddress, hotelLat, hotelLng (optional)
  days/{dayId}/
    date (ISO, == dayId), label ("Fri 4/17"), labelFull ("Friday, April 17"), order
    activities/{activityId}/
      time, title, emoji, category, notes, address, lat, lng, durationMinutes, completed
  actionItems/{id}/, overflow/{id}/, expenses/{id}/, settlements/{id}/
users/{uid}/                  email, displayName, updatedAt
```

## Auth
- Google sign-in via signInWithRedirect (popup fails on mobile Safari)
- getRedirectResult(auth) called at module load in firebase.js
- Each top-level route (TripList, App) has its own auth listener — no auth context yet

## Conventions
- One feature per Claude Code prompt unless tightly coupled
- Modals each in their own file; Modal.js is the shell
- Inline styles for one-off widgets, App.css for shared classes
- No TypeScript
- Firestore queries gated on user auth state inside useEffect
- Add tripId to useEffect deps wherever referenced — it's a hook value, not a const

## Known gotchas
- CI=true treats ESLint warnings as errors. Run `CI=true npm run build` if anything looks risky before pushing.
- vercel.json is required for SPA routing. Hard refresh on /trips/:tripId 404s without it.
- Mobile Safari rejects signInWithPopup. Don't switch back.
- `new Date("2026-04-17")` parses as UTC midnight, which can shift timezone-dependent. Parse manually for day docs.
- Cascade delete batch caps at 500 ops. Add chunking when realistic trip sizes approach this.
- TripList trip Maps must be rebuilt per-snapshot, not additively merged. Otherwise deletes don't propagate.

## Environment variables
Set in Vercel + .env.local:
REACT_APP_FIREBASE_API_KEY, REACT_APP_FIREBASE_AUTH_DOMAIN,
REACT_APP_FIREBASE_PROJECT_ID, REACT_APP_FIREBASE_STORAGE_BUCKET,
REACT_APP_FIREBASE_MESSAGING_SENDER_ID, REACT_APP_FIREBASE_APP_ID,
REACT_APP_GOOGLE_MAPS_API_KEY

## See also
- [BACKLOG.md](BACKLOG.md) — open work, prioritized
- firestore.rules — current security rules (deployed copy lives in Firebase Console)
