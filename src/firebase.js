// firebase.js
// Sets up Firebase so the app can use Firestore (database) and Auth (login).
// The config values come from your .env.local file, keeping them out of GitHub.

import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, getRedirectResult } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (your database)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});

// Initialize Auth (login system)
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };

// Handle return from signInWithRedirect on app boot.
// Firebase buffers the result; onAuthStateChanged in components fires after this resolves.
getRedirectResult(auth).catch((err) => {
  console.error("getRedirectResult error:", err);
});