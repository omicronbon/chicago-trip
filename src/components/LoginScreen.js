import React from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

function LoginScreen() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  async function handleLogin() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // App.js detects the auth state change and shows the app
    } catch (err) {
      console.error("Login failed:", err);
      setError("Sign in failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <h1>Chicago <span aria-hidden="true">🌆</span></h1>
      <p className="trip-dates">April 17–20, 2026</p>
      <button
        className="login-btn"
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? "Signing in…" : "Sign in with Google"}
      </button>
      {error && (
        <p style={{ color: "#e53935", marginTop: 12, fontSize: 14 }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default LoginScreen;