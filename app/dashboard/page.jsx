"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AuthGuard from "../components/AuthGuard";
import StatusBadge from "../components/StatusBadge";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/UIFeedback";
import { ridesApi } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRides = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await ridesApi.getMyRides();
      if (res?.success && Array.isArray(res.rides)) {
        setRides(res.rides);
      } else {
        setRides([]);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch your ride history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUser(getStoredUser());
    fetchRides();
  }, []);

  const totalRides = rides.length;
  const activeRides = rides.filter((r) =>
    ["requested", "accepted", "arriving", "in_progress"].includes(r.status)
  ).length;
  const completedRides = rides.filter((r) => r.status === "completed").length;

  return (
    <div className={styles.page}>
      <Navbar />
      <AuthGuard requiredRole="rider">

        <main className={styles.main}>
          {/* Welcome Hero */}
          <div className={styles.welcomeCard}>
            <div className={styles.welcomeText}>
              <h1>Welcome back, {user?.full_name?.split(" ")[0] || "Passenger"}! 👋</h1>
              <p>Plan your trips, view ride progression, and manage payments with ease.</p>
              <div className={styles.userMeta}>
                <span className={styles.metaPill}>📧 {user?.email}</span>
                {user?.phone && (
                  <span className={styles.metaPill}>📞 {user.phone}</span>
                )}
                <span className={styles.metaPill}>
                  🛡️ Verified Passenger
                </span>
              </div>
            </div>

            <Link href="/booking" className={styles.bookCtaBtn}>
              ⚡ Book New Ride →
            </Link>
          </div>

          {/* Quick Metrics */}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🚕</div>
              <div>
                <span className={styles.statVal}>{totalRides}</span>
                <span className={styles.statLabel}>Total Trips</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>⏱️</div>
              <div>
                <span className={styles.statVal}>{activeRides}</span>
                <span className={styles.statLabel}>Active Trips</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>✅</div>
              <div>
                <span className={styles.statVal}>{completedRides}</span>
                <span className={styles.statLabel}>Completed Trips</span>
              </div>
            </div>
          </div>

          {/* Recent Rides List */}
          <div className={styles.sectionHeader}>
            <h2>Recent Rides</h2>
            {rides.length > 0 && (
              <Link href="/my-rides" className={styles.viewAllLink}>
                View All Trips ({rides.length}) →
              </Link>
            )}
          </div>

          <ErrorMessage message={error} />

          {loading ? (
            <LoadingSpinner message="Fetching your ride history from backend..." />
          ) : rides.length === 0 ? (
            <EmptyState
              icon="🚗"
              title="No Rides Requested Yet"
              description="You haven't requested any trips so far. Book your first ride in seconds with our live interactive map!"
              action={
                <Link href="/booking" className={styles.bookCtaBtn}>
                  Book Your First Ride →
                </Link>
              }
            />
          ) : (
            <div className={styles.ridesGrid}>
              {rides.slice(0, 5).map((ride) => (
                <div key={ride.id} className={styles.rideCard}>
                  <div className={styles.routeTimeline}>
                    <div className={styles.pointRow}>
                      <span className={styles.pickupDot} />
                      <div className={styles.addressText}>
                        <strong>Pickup</strong>
                        <span>{ride.pickup_address}</span>
                      </div>
                    </div>

                    <div className={styles.pointRow}>
                      <span className={styles.dropoffDot} />
                      <div className={styles.addressText}>
                        <strong>Destination</strong>
                        <span>{ride.dropoff_address}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.rideRightCol}>
                    <StatusBadge status={ride.status} />
                    <div className={styles.fareVal}>
                      ₹{Number(ride.estimated_fare).toFixed(2)}
                    </div>
                    <span className={styles.dateText}>
                      {ride.created_at
                        ? new Date(ride.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Just now"}
                    </span>
                    <Link
                      href={`/payment?rideId=${ride.id}`}
                      className={styles.payActionBtn}
                    >
                      💳 Pay Online
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </AuthGuard>

      <Footer />
    </div>
  );
}
