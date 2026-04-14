// LoginScreen.js
// Simple full-screen login. Tap the button to sign in with Google.
// After signing in, the app loads automatically.

import React from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

function LoginScreen() {
  async function handleLogin() {
    try {
      await signInWithPopup(auth, googleProvider);
      // App.js detects the auth state change and shows the app
    } catch (err) {
      console.error("Login failed:", err);
    }
  }

  return (
    <div className="login-screen">
      <h1>Chicago 🌆</h1>
      <p className="trip-dates">April 17–20, 2026</p>
      <button className="login-btn" onClick={handleLogin}>
        Sign in with Google
      </button>
    </div>
  );
}

export default LoginScreen;