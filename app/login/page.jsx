"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { ErrorMessage, LoadingSpinner } from "../components/UIFeedback";
import { authApi } from "../lib/api";
import { saveSession } from "../lib/auth";
import styles from "./login.module.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please provide both email address and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      if (data?.token && data?.user) {
        saveSession(data.token, data.user);

        // Redirect based on role or returnUrl
        if (returnUrl) {
          router.push(returnUrl);
        } else if (data.user.role === "driver") {
          router.push("/driver");
        } else {
          router.push("/dashboard");
        }
      } else {
        throw new Error(data?.message || "Invalid credentials.");
      }
    } catch (err) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleTryAsGuest = async () => {
    setError("");
    setGuestLoading(true);
    try {
      const data = await authApi.guestLogin();
      if (data?.token && data?.user) {
        saveSession(data.token, data.user);
        router.push(returnUrl || "/booking");
      } else {
        throw new Error("Unable to start guest session.");
      }
    } catch (err) {
      setError(err.message || "Failed to start guest session.");
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.brandPill}>AUTHENTICATION</span>
        <h1>Sign In to RideGo</h1>
        <p>Access your rides, real-time map tracking, and receipts.</p>
      </div>

      <ErrorMessage message={error} />

      <form onSubmit={handleLogin} className={styles.form}>
        <div className={styles.fieldGroup}>
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="rider@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
            autoComplete="email"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="password">Password</label>
          <div className={styles.inputWrap}>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={styles.togglePassBtn}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading || guestLoading}>
          {loading ? "Authenticating..." : "Sign In →"}
        </button>
      </form>

      {/* Guest Mode Exclusively for Passengers */}
      <div className={styles.demoBox}>
        <span className={styles.demoBoxTitle}>✨ Quick Exploration</span>
        <button
          type="button"
          onClick={handleTryAsGuest}
          disabled={loading || guestLoading}
          className={styles.guestBtn}
          style={{
            width: "100%",
            background: "linear-gradient(135deg, #f4c401 0%, #eab308 100%)",
            color: "#0c0d0e",
            border: "none",
            padding: "12px 18px",
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 800,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 4px 14px rgba(244, 196, 1, 0.25)",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
        >
          {guestLoading ? "Connecting as Guest..." : "⚡ Try as Guest (Passenger)"}
        </button>
        <p
          style={{
            fontSize: 11.5,
            color: "var(--text-muted, #9ca3af)",
            margin: "10px 0 0",
            lineHeight: 1.45,
          }}
        >
          🛡️ Drivers must sign up or log in with verified account credentials. Guest mode is exclusively for passengers.
        </p>
      </div>

      <div className={styles.cardFooter}>
        Don&apos;t have an account?{" "}
        <Link href="/register">Create one here</Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>
        <Suspense fallback={<LoadingSpinner message="Loading login form..." />}>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
