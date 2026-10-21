"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { ErrorMessage } from "../components/UIFeedback";
import { authApi } from "../lib/api";
import { saveSession } from "../lib/auth";
import styles from "./register.module.css";

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState("rider");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Please complete all required fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      // 1. Call registration endpoint
      const regData = await authApi.register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
        role,
      });

      if (!regData?.success) {
        throw new Error(regData?.message || "Registration failed.");
      }

      // 2. Automatically log in to obtain JWT token
      const loginData = await authApi.login({
        email: email.trim().toLowerCase(),
        password,
      });

      if (loginData?.token && loginData?.user) {
        saveSession(loginData.token, loginData.user);
        if (loginData.user.role === "driver") {
          router.push("/driver");
        } else {
          router.push("/dashboard");
        }
      } else {
        router.push("/login");
      }
    } catch (err) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.brandPill}>JOIN CABGO</span>
            <h1>Create Your Account</h1>
            <p>Select your account type and start riding or driving.</p>
          </div>

          <ErrorMessage message={error} />

          <form onSubmit={handleRegister} className={styles.form}>
            {/* Role Selection */}
            <div className={styles.fieldGroup}>
              <label>I Want to Join As</label>
              <div className={styles.roleSelector}>
                <button
                  type="button"
                  onClick={() => setRole("rider")}
                  className={`${styles.roleBtn} ${
                    role === "rider" ? styles.roleBtnActive : ""
                  }`}
                >
                  <span>👤</span>
                  <span>Passenger</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("driver")}
                  className={`${styles.roleBtn} ${
                    role === "driver" ? styles.roleBtnActive : ""
                  }`}
                >
                  <span>🚗</span>
                  <span>Driver Partner</span>
                </button>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="fullName">Full Name *</label>
              <input
                id="fullName"
                type="text"
                placeholder="e.g. Ramesh Patel"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={styles.input}
                required
                maxLength={100}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="email">Email Address *</label>
              <input
                id="email"
                type="email"
                placeholder="ramesh@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="phone">Phone Number (Optional)</label>
              <input
                id="phone"
                type="tel"
                placeholder="+91 98220 12345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={styles.input}
                autoComplete="tel"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="password">Password *</label>
              <div className={styles.inputWrap}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  required
                  minLength={8}
                  autoComplete="new-password"
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
              <span className={styles.fieldHint}>
                Must be at least 8 characters.
              </span>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? "Registering..." : `Register as ${role === "driver" ? "Driver" : "Passenger"} →`}
            </button>
          </form>

          <div className={styles.cardFooter}>
            Already registered on CabGo?{" "}
            <Link href="/login">Sign in here</Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
