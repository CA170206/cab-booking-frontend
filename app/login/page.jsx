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

  const handleQuickDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError("");
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.brandPill}>AUTHENTICATION</span>
        <h1>Sign In to CabGo</h1>
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

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? "Authenticating..." : "Sign In →"}
        </button>
      </form>

      {/* Quick 1-Click Evaluation Demos */}
      <div className={styles.demoBox}>
        <span className={styles.demoBoxTitle}>⚡ Quick 1-Click Demo Logins</span>
        <div className={styles.demoBtns}>
          <button
            type="button"
            onClick={() => handleQuickDemo("rider.demo@cabgo.com")}
            className={styles.demoBtn}
          >
            👤 Demo Passenger
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo("driver.demo@cabgo.com")}
            className={styles.demoBtn}
          >
            🚗 Demo Driver
          </button>
        </div>
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
