# Trip Planner — Backlog

(App name is provisional — see "De-Chicago everything" in P2.)

Operational notes and open work. Pull this file via `git pull` to stay in sync across machines.

## P0 — Pre-trip blockers (April 17, 2026)
None currently.

## P1 — UX bugs and friction
- Map filter pills cut off / condensed since labels became "Fri 4/17" instead of "Fri". CSS fix on `.map-filter-pills` (horizontal scroll or font shrink). Hits every Map open.
- New trip date picker — end date should not allow values before start date. Add `min` attribute on the end date input bound to start date value. Simpler than a range picker.
- Pretty date formatting in trip header. Currently shows `2026-04-17 – 2026-04-20`. Should show `April 17–20, 2026`. Watch for timezone shift if parsing ISO via `new Date()`.
- LoginScreen copy cleanup. Still hardcodes "Chicago" + "April 17–20, 2026".
- Trip switcher dropdown in trip header. Replace `← All trips` with inline dropdown.
- Trip header shows empty string during the brief moment between mount and Firestore subscription firing. Add placeholder.

## P2 — UX redesigns and rough edges
- De-Chicago everything (own session — multi-layer):
  - Pick a product name first (Trips, Wayfinder, whatever)
  - Code: search src/ for "chicago"/"Chicago", remove hardcodes (LoginScreen, MapView, etc.)
  - package.json `name` field
  - public/index.html title + meta tags
  - public/manifest.json name + short_name
  - GitHub repo rename (chicago-trip → new name, update local remote)
  - Vercel project rename or recreate; new auto-domain
  - Optional: custom domain
- ActivityModal field redesign:
  - Address is the most important field — make it more prominent (top of form, larger)
  - When user selects an address from autocomplete, auto-fill title with the place's name unless user has already typed something
  - User can edit title afterward to override
- Activity card Navigate button — low tap-target clarity on the timeline. Decide: remove (Map view has its own per-pin navigate), shrink to an icon, or move into the activity edit modal as an action.
- /trips/<bad-id> shows broken UI. Should redirect to /trips or render "trip not found".
- `data/chicagoItinerary.js` dead — confirm no live imports and delete.
- `groupActivities.js` kept for legacy `(cont.)` entries — audit and delete if no matches.
- `seedFirestore.js` obsolete now that NewTripModal exists.
- ActionItems schedule modal day picker defaults to empty. Pre-fill with first day of trip.

## P3 — Features
- Drag and drop reorder activity cards on the timeline
- Route lines on the map between activity destinations within the active day filter (Google Directions API — check pricing)
- Live weather badges per day
- Gap indicators between activities on the timeline
- Daily notes / scratchpad per day
- Trip summary view (single-page printable overview)
- Photo upload per activity (Firebase Storage)
- Export trip as PDF
- Haptic feedback on mobile checkbox taps
- Pending invites for non-existent users when sharing

## P4 — Tech debt
- No automated tests. App.test.js was deleted because it was CRA boilerplate. A smoke test for routing + auth state would be cheap insurance.
- Each route component (App, TripList) has its own auth listener. Consolidate into AuthContext when the duplication becomes painful.
- Trip rename allowed for any collaborator. Consider whether this should be owner-only.
- Cascade delete batch could exceed 500 ops on a heavily populated trip. Add chunking when a trip first hits ~400 docs.
- No error boundaries. A render error in any component crashes the whole tree.

## Decisions made (for context)
- Multi-trip via React Router v7. Trip ID is a route param read by TripContext.
- Firebase Auth uses signInWithRedirect (not popup) for mobile Safari compatibility.
- Firestore security rules versioned at `firestore.rules`. Source of truth is still Firebase Console.
- Trip delete cascades client-side via batched writes. No Cloud Functions.
- Vercel SPA fallback in `vercel.json` so direct loads of /trips/<id> don't 404.
- Trip Maps in TripList rebuilt per-snapshot to handle deletions correctly. Don't switch back to additive merging.

## Operational notes
- Deploy: push to main, Vercel auto-deploys
- Local dev: `npm start`
- Production verification: most auth/routing behavior only reproduces on the live Vercel URL
- Rules changes: edit `firestore.rules`, manually paste into Firebase Console rules editor. CLI deploy not yet wired.
- ESLint warnings = errors in CI. Run `CI=true npm run build` locally before pushing if anything looks risky.
