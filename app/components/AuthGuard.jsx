"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getStoredUser, isAuthenticated } from "../lib/auth";
import { LoadingSpinner } from "./UIFeedback";

export default function AuthGuard({ children, requiredRole = null }) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const isAuth = isAuthenticated();
    const storedUser = getStoredUser();
    setAuthed(isAuth);
    setUser(storedUser);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
        <LoadingSpinner message="Verifying authentication session..." />
      </div>
    );
  }

  if (!authed || !user) {
    return (
      <div
        style={{
          maxWidth: 480,
          margin: "60px auto",
          padding: 36,
          background: "var(--card-bg, #14161b)",
          border: "1.5px solid var(--card-border, #282c35)",
          borderRadius: 16,
          textAlign: "center",
          color: "var(--text-primary, #ffffff)",
          boxShadow: "var(--card-shadow, 0 10px 30px rgba(0,0,0,0.2))",
        }}
      >
        <span style={{ fontSize: 42, display: "block", marginBottom: 12 }}>
          🔒
        </span>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>
          Sign In Required
        </h2>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--text-secondary, #9ca3af)",
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}
        >
          You must be logged into CabGo to view this page. Please sign in or register an account.
        </p>
        <Link
          href={`/login?returnUrl=${encodeURIComponent(pathname)}`}
          style={{
            display: "inline-block",
            background: "#f4c401",
            color: "#0c0d0e",
            fontWeight: 800,
            fontSize: 13.5,
            padding: "11px 24px",
            borderRadius: 999,
            textDecoration: "none",
          }}
        >
          Sign In to CabGo →
        </Link>
      </div>
    );
  }

  const isRoleMatch = (userRole, reqRole) => {
    if (!reqRole) return true;
    if (
      (reqRole === "rider" || reqRole === "passenger") &&
      (userRole === "rider" || userRole === "passenger")
    ) {
      return true;
    }
    return userRole === reqRole;
  };

  if (requiredRole && !isRoleMatch(user.role, requiredRole)) {
    const roleDisplay = requiredRole === "driver" ? "drivers" : "passengers";
    const userRoleDisplay = user.role === "driver" ? "driver" : "passenger";

    return (
      <div
        style={{
          maxWidth: 480,
          margin: "60px auto",
          padding: 36,
          background: "var(--card-bg, #14161b)",
          border: "1.5px solid var(--card-border, #282c35)",
          borderRadius: 16,
          textAlign: "center",
          color: "var(--text-primary, #ffffff)",
          boxShadow: "var(--card-shadow, 0 10px 30px rgba(0,0,0,0.2))",
        }}
      >
        <span style={{ fontSize: 42, display: "block", marginBottom: 12 }}>
          🚫
        </span>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>
          Access Restricted
        </h2>
        <p
          style={{
            fontSize: 13.5,
            color: "var(--text-secondary, #9ca3af)",
            lineHeight: 1.6,
            margin: "0 0 24px",
          }}
        >
          This page is only accessible to <strong>{roleDisplay}</strong>. Your current account is registered as a <strong>{userRoleDisplay}</strong>.
        </p>
        <Link
          href={user.role === "driver" ? "/driver" : "/dashboard"}
          style={{
            display: "inline-block",
            background: "#f4c401",
            color: "#0c0d0e",
            fontWeight: 800,
            fontSize: 13.5,
            padding: "11px 24px",
            borderRadius: 999,
            textDecoration: "none",
          }}
        >
          Go to your {userRoleDisplay} dashboard →
        </Link>
      </div>
    );
  }

  return children;
}
