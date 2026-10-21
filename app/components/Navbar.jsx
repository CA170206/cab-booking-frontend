"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getStoredUser, clearSession } from "../lib/auth";
import ThemeToggle from "./ThemeToggle";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Read user from localStorage on mount and on storage events
    const syncUser = () => {
      setUser(getStoredUser());
    };

    syncUser();
    window.addEventListener("ridego_auth_change", syncUser);
    window.addEventListener("cabgo_auth_change", syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener("ridego_auth_change", syncUser);
      window.removeEventListener("cabgo_auth_change", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setMenuOpen(false);
    router.push("/");
  };

  const isActive = (path) => pathname === path;

  return (
    <header className={styles.navbar}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.brand} aria-label="RideGo Home">
          <span className={styles.brandIcon}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
            </svg>
          </span>
          <div className={styles.brandText}>
            <span className={styles.brandName}>RideGo</span>
            <span className={styles.brandSub}>Cab Services</span>
          </div>
        </Link>

        {/* Public & Role-Aware Navigation Links */}
        <nav className={styles.navLinks}>
          <Link
            href="/"
            className={`${styles.navLink} ${isActive("/") ? styles.navLinkActive : ""}`}
          >
            Home
          </Link>
          <Link
            href="/about"
            className={`${styles.navLink} ${isActive("/about") ? styles.navLinkActive : ""}`}
          >
            About
          </Link>
          <Link
            href="/services"
            className={`${styles.navLink} ${isActive("/services") ? styles.navLinkActive : ""}`}
          >
            Services
          </Link>
          <Link
            href="/contact"
            className={`${styles.navLink} ${isActive("/contact") ? styles.navLinkActive : ""}`}
          >
            Contact
          </Link>

          {(user?.role === "rider" || user?.role === "passenger") && (
            <>
              <Link
                href="/dashboard"
                className={`${styles.navLink} ${isActive("/dashboard") ? styles.navLinkActive : ""}`}
              >
                Dashboard
              </Link>
              <Link
                href="/my-rides"
                className={`${styles.navLink} ${isActive("/my-rides") ? styles.navLinkActive : ""}`}
              >
                My Rides
              </Link>
            </>
          )}

          {user?.role === "driver" && (
            <Link
              href="/driver"
              className={`${styles.navLink} ${isActive("/driver") ? styles.navLinkActive : ""}`}
            >
              Driver Console
            </Link>
          )}

          {user && (
            <Link
              href="/profile"
              className={`${styles.navLink} ${isActive("/profile") ? styles.navLinkActive : ""}`}
            >
              Profile
            </Link>
          )}
        </nav>

        {/* Right Action Cluster */}
        <div className={styles.navRight}>
          <ThemeToggle />

          {user ? (
            <div className={styles.userBadge}>
              <span className={styles.userRoleDot} />
              <Link
                href="/profile"
                className={styles.userName}
                title="View Profile"
              >
                {user.full_name?.split(" ")[0] || "Account"}
              </Link>
              <span className={styles.roleTag}>
                {user.role === "driver" ? "driver" : "passenger"}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className={styles.logoutBtn}
                title="Log Out"
              >
                Exit
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" className={styles.outlineBtn}>
                Sign In
              </Link>
              <Link href="/booking" className={styles.bookBtn}>
                Book Cab
              </Link>
            </>
          )}

          <button
            type="button"
            className={styles.mobileToggle}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px 10px", borderBottom: "1px solid var(--border-subtle)" }}>
            <span style={{ fontSize: 12, fontWeight: 750, color: "var(--text-muted)" }}>THEME:</span>
            <ThemeToggle />
          </div>

          <Link href="/" onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          <Link href="/about" onClick={() => setMenuOpen(false)}>
            About
          </Link>
          <Link href="/services" onClick={() => setMenuOpen(false)}>
            Services
          </Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)}>
            Contact
          </Link>
          <Link href="/booking" onClick={() => setMenuOpen(false)}>
            Book a Ride
          </Link>

          {user ? (
            <>
              {(user.role === "rider" || user.role === "passenger") && (
                <>
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                    Passenger Dashboard
                  </Link>
                  <Link href="/my-rides" onClick={() => setMenuOpen(false)}>
                    My Rides
                  </Link>
                </>
              )}
              {user.role === "driver" && (
                <Link href="/driver" onClick={() => setMenuOpen(false)}>
                  Driver Dashboard
                </Link>
              )}
              <Link href="/profile" onClick={() => setMenuOpen(false)}>
                My Profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className={styles.logoutBtn}
                style={{ textAlign: "left" }}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                Sign In
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}>
                Create Account
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
