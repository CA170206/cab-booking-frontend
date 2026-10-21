"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHeader from "../components/PageHeader";
import AuthGuard from "../components/AuthGuard";
import StatusBadge from "../components/StatusBadge";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/UIFeedback";
import LiveRideModal from "../components/LiveRideModal";
import { ridesApi } from "../lib/api";
import styles from "./my-rides.module.css";

function MyRidesContent() {
  const searchParams = useSearchParams();
  const urlRideId = searchParams.get("rideId");

  const [rides, setRides] = useState([]);
  const [filter, setFilter] = useState("all"); // 'all', 'active', 'completed'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLiveRide, setSelectedLiveRide] = useState(null);

  // Silent polling to prevent UI glitching/flashing
  const fetchRides = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError("");
      const res = await ridesApi.getMyRides();
      if (res?.success && Array.isArray(res.rides)) {
        setRides(res.rides);
      } else {
        setRides([]);
      }
    } catch (err) {
      if (showLoading) setError(err.message || "Failed to load ride history.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides(true);
    const interval = setInterval(() => fetchRides(false), 4000);
    return () => clearInterval(interval);
  }, []);

  // Auto-open requested ride modal when navigating with ?rideId=...
  useEffect(() => {
    if (!urlRideId) return;

    const matched = rides.find((r) => r.id === urlRideId);
    if (matched) {
      setSelectedLiveRide(matched);
    } else {
      ridesApi
        .getRideDetails(urlRideId)
        .then((res) => {
          if (res?.success && res.ride) {
            setSelectedLiveRide(res.ride);
          }
        })
        .catch(() => {});
    }
  }, [urlRideId, rides]);

  // Most recent active ride
  const activeRide = useMemo(() => {
    return rides.find((r) =>
      ["requested", "accepted", "arriving", "in_progress"].includes(r.status)
    );
  }, [rides]);

  const filteredRides = rides.filter((r) => {
    if (filter === "active") {
      return ["requested", "accepted", "arriving", "in_progress"].includes(r.status);
    }
    if (filter === "completed") {
      return r.status === "completed";
    }
    return true;
  });

  return (
    <div className={styles.page}>
      <Navbar />

      <PageHeader
        eyebrow="RIDEGO ARCHIVE"
        title="My Travel"
        titleAccent="History"
        subtitle="View all past and ongoing ride requests, track live trip progress, and make online payments."
      />

      <AuthGuard requiredRole="rider">
        <main className={styles.main}>
          <div className={styles.topBar}>
            {/* Filter Tabs */}
            <div className={styles.filters}>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`${styles.filterBtn} ${
                  filter === "all" ? styles.filterBtnActive : ""
                }`}
              >
                All Trips ({rides.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("active")}
                className={`${styles.filterBtn} ${
                  filter === "active" ? styles.filterBtnActive : ""
                }`}
              >
                Active (
                {
                  rides.filter((r) =>
                    [
                      "requested",
                      "accepted",
                      "arriving",
                      "in_progress",
                    ].includes(r.status)
                  ).length
                }
                )
              </button>
              <button
                type="button"
                onClick={() => setFilter("completed")}
                className={`${styles.filterBtn} ${
                  filter === "completed" ? styles.filterBtnActive : ""
                }`}
              >
                Completed ({rides.filter((r) => r.status === "completed").length})
              </button>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => fetchRides(true)}
                className={styles.bookBtn}
                title="Refresh rides"
              >
                🔄 Refresh
              </button>
              <Link href="/booking" className={styles.bookBtn}>
                + Book Another Ride
              </Link>
            </div>
          </div>

          <ErrorMessage message={error} />

          {/* Eye-catching Active Ride Banner */}
          {activeRide && (
            <div
              className={styles.activeHeroCard}
              onClick={() => setSelectedLiveRide(activeRide)}
              title="Click to view live driver location & OTP"
              style={{ cursor: "pointer" }}
            >
              <div className={styles.activeHeroLeft}>
                <div className={styles.activeHeroIcon}>⚡</div>
                <div className={styles.activeHeroContent}>
                  <h3>
                    <span>Active Journey in Progress</span>
                    <span className={styles.activeHeroBadge}>{activeRide.status.toUpperCase()}</span>
                  </h3>
                  <p>
                    {activeRide.pickup_address} → {activeRide.dropoff_address}
                  </p>
                </div>
              </div>

              <div className={styles.activeHeroRight}>
                <div className={styles.fareVal}>₹{Number(activeRide.estimated_fare).toFixed(2)}</div>
                <button type="button" className={styles.activeTrackBtn}>
                  Track Live & View OTP →
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <LoadingSpinner message="Loading your complete journey log..." />
          ) : filteredRides.length === 0 ? (
            <EmptyState
              icon="🗺️"
              title={
                filter === "active"
                  ? "No Active Trips Currently"
                  : filter === "completed"
                  ? "No Completed Trips Yet"
                  : "No Ride Records Found"
              }
              description={
                filter === "all"
                  ? "You have not requested any cabs yet. Set your pickup and drop points on the interactive map to get moving!"
                  : `There are currently no trips matching the "${filter}" filter.`
              }
              action={
                <Link
                  href="/booking"
                  style={{
                    display: "inline-block",
                    background: "#f4c401",
                    color: "#0c0d0e",
                    fontWeight: 800,
                    fontSize: 13,
                    padding: "10px 22px",
                    borderRadius: 999,
                    textDecoration: "none",
                  }}
                >
                  Book a Ride Now →
                </Link>
              }
            />
          ) : (
            <div className={styles.ridesList}>
              {filteredRides.map((ride) => (
                <div
                  key={ride.id}
                  className={`${styles.rideCard} ${styles.clickableRideCard}`}
                  onClick={() => setSelectedLiveRide(ride)}
                  title="Click to view full ride details, live tracking, bill & ratings"
                >
                  <div className={styles.routeTimeline}>
                    <div className={styles.pointRow}>
                      <span className={styles.pickupDot} />
                      <div className={styles.addressText}>
                        <strong>Pickup Point</strong>
                        <span>{ride.pickup_address}</span>
                      </div>
                    </div>

                    <div className={styles.pointRow}>
                      <span className={styles.dropoffDot} />
                      <div className={styles.addressText}>
                        <strong>Destination Point</strong>
                        <span>{ride.dropoff_address}</span>
                      </div>
                    </div>

                    <div className={styles.rideMetaRow}>
                      <span>
                        📅{" "}
                        {ride.created_at
                          ? new Date(ride.created_at).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Recent"}
                      </span>
                      <span>🆔 {ride.id.substring(0, 8)}...</span>
                      {ride.driver_name && (
                        <span>🚗 Driver: {ride.driver_name}</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.rightCol}>
                    <StatusBadge status={ride.status} />
                    <div className={styles.fareVal}>
                      ₹{Number(ride.estimated_fare).toFixed(2)}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLiveRide(ride);
                      }}
                      className={styles.payBtn}
                    >
                      {ride.status === "completed" ? "🧾 View Bill & QR" : "📍 Track Ride"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </AuthGuard>

      {/* Live Ride Tracking, OTP, Bill & Rating Modal */}
      {selectedLiveRide && (
        <LiveRideModal
          ride={selectedLiveRide}
          onClose={() => setSelectedLiveRide(null)}
          onRideUpdated={() => fetchRides(false)}
        />
      )}

      <Footer />
    </div>
  );
}

export default function MyRidesPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading your journey history..." />}>
      <MyRidesContent />
    </Suspense>
  );
}
