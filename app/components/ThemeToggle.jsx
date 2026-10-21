"use client";

import { useTheme } from "./ThemeProvider";
import styles from "./ThemeToggle.module.css";

export default function ThemeToggle({ showLabel = true, className = "" }) {
  const { theme, toggleTheme, mounted } = useTheme();

  // If not yet mounted on client, render placeholder matching dark default to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        type="button"
        className={`${styles.toggleBtn} ${className}`}
        aria-label="Toggle dark or light theme"
      >
        <span className={styles.iconWrap}>🌙</span>
        {showLabel && <span className={styles.label}>Dark</span>}
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`${styles.toggleBtn} ${className}`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span className={styles.iconWrap}>{isDark ? "🌙" : "☀️"}</span>
      {showLabel && (
        <span className={styles.label}>{isDark ? "Dark" : "Light"}</span>
      )}
    </button>
  );
}
