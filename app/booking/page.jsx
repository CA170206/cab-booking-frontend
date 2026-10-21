"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo, useCallback } from "react";
import ThemeToggle from "../components/ThemeToggle";
import LiveRideModal from "../components/LiveRideModal";
import styles from "./booking.module.css";

// Dynamically import BookingMap with no SSR to protect Leaflet
const BookingMap = dynamic(() => import("../components/BookingMap"), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <span className={styles.spinner} />
      <span>Loading interactive CabGo map...</span>
    </div>
  ),
});

// Haversine distance calculator in km
const calculateDistanceKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Backend fare logic: Base ₹40 + ₹15/km, Minimum ₹60
const calculateFare = (distKm, multiplier = 1.0) => {
  const baseFare = 40;
  const perKmRate = 15;
  const minFare = 60;
  const rawFare = (baseFare + distKm * perKmRate) * multiplier;
  return Number(Math.max(minFare, rawFare).toFixed(2));
};

const RIDE_TYPES = [
  {
    id: "go",
    name: "CabGo Go",
    desc: "Swift / WagonR",
    capacity: "4 seats",
    multiplier: 1.0,
    eta: "3 mins",
    image: "/images/cars/hatchback.jpg",
    icon: "🚗",
  },
  {
    id: "sedan",
    name: "CabGo Sedan",
    desc: "Dzire / Etios",
    capacity: "4 seats",
    multiplier: 1.25,
    eta: "4 mins",
    image: "/images/cars/sedan.jpg",
    icon: "🚘",
  },
  {
    id: "xl",
    name: "CabGo XL",
    desc: "Innova Crysta",
    capacity: "6 seats",
    multiplier: 1.6,
    eta: "7 mins",
    image: "/images/cars/suv.jpg",
    icon: "🚙",
  },
  {
    id: "auto",
    name: "CabGo Auto",
    desc: "Bajaj Auto",
    capacity: "3 seats",
    multiplier: 0.8,
    eta: "2 mins",
    image: "/images/cars/auto.jpg",
    icon: "🛺",
  },
];

export default function BookingPage() {
  const [locations, setLocations] = useState({
    pickup: null,
    dropoff: null,
  });

  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [selectedRideType, setSelectedRideType] = useState("go");

  // Browser Geolocation permission state
  const [locationPermission, setLocationPermission] = useState("prompt"); // "prompt" | "prompting" | "granted" | "denied"

  // Prompt rider for browser GPS location
  const requestRiderLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationPermission("denied");
      return;
    }
    setLocationPermission("prompting");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        setLocations((prev) => ({ ...prev, pickup: coords }));
        setLocationPermission("granted");
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.display_name) {
              const clean = data.display_name.split(", ").slice(0, 3).join(", ");
              setPickupAddress(clean);
            }
          }
        } catch {
          setPickupAddress(`Current GPS Pickup (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
        }
      },
      (err) => {
        console.warn("Rider location permission:", err.message);
        setLocationPermission("denied");
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, []);

  // Automatically prompt rider for GPS location on mount
  useEffect(() => {
    requestRiderLocation();
  }, [requestRiderLocation]);

  // Authentication state
  const [token, setToken] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Ride booking state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [ride, setRide] = useState(null);

  // Past rides drawer
  const [showRidesDrawer, setShowRidesDrawer] = useState(false);
  const [myRides, setMyRides] = useState([]);
  const [loadingRides, setLoadingRides] = useState(false);
  const [selectedLiveRide, setSelectedLiveRide] = useState(null);

  // Separate active in-progress journey from past completed trips
  const activeRide = useMemo(() => {
    return myRides.find((r) =>
      ["requested", "accepted", "arriving", "in_progress"].includes(r.status)
    );
  }, [myRides]);

  const activeRidesList = useMemo(() => {
    return myRides.filter((r) =>
      ["requested", "accepted", "arriving", "in_progress"].includes(r.status) ||
      (r.status === "completed" && r.payment_status !== "paid")
    );
  }, [myRides]);

  const pastCompletedRides = useMemo(() => {
    return myRides.filter((r) =>
      r.status === "cancelled" || (r.status === "completed" && r.payment_status === "paid")
    );
  }, [myRides]);

  // Load persisted authentication on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("cabgo_token");
      const storedUser = localStorage.getItem("cabgo_user");
      if (storedToken) {
        setToken(storedToken);
      }
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.warn("Could not read auth from localStorage", e);
    }
  }, []);

  // Automatically fetch rider trips on login and poll every 3s for live driver updates
  useEffect(() => {
    if (!token) return;
    fetchMyRides();
    const interval = setInterval(fetchMyRides, 3000);
    return () => clearInterval(interval);
  }, [token]);

  // Synchronize address when resolved from map clicks / reverse geocoding
  const handleAddressResolved = useCallback((type, address, point) => {
    if (type === "pickup") {
      setPickupAddress(address);
    } else {
      setDropoffAddress(address);
    }
  }, []);

  const handleLocationsChange = useCallback((newLocs) => {
    setLocations(newLocs);
    if (!newLocs.pickup && !newLocs.dropoff) {
      setPickupAddress("");
      setDropoffAddress("");
      setRide(null);
      setMessage("");
    }
  }, []);

  // Compute live distance, duration, and fare
  const tripStats = useMemo(() => {
    if (!locations.pickup || !locations.dropoff) return null;
    const distanceKm = calculateDistanceKm(
      locations.pickup.lat,
      locations.pickup.lng,
      locations.dropoff.lat,
      locations.dropoff.lng
    );
    const durationMins = Math.max(3, Math.round(distanceKm * 2.7 + 3));
    const activeRideObj =
      RIDE_TYPES.find((r) => r.id === selectedRideType) || RIDE_TYPES[0];
    const estimatedFare = calculateFare(distanceKm, activeRideObj.multiplier);
    const baseBackendFare = calculateFare(distanceKm, 1.0);

    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      durationMins,
      estimatedFare,
      baseBackendFare,
    };
  }, [locations, selectedRideType]);

  // Handle user login / registration
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);


    const isLogin = authMode === "login";

    const endpoint = isLogin
      ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/login`
      : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/auth/register`;


    const payload = isLogin
      ? { email: authEmail.trim(), password: authPassword }
      : {
        full_name: authName.trim(),
        email: authEmail.trim(),
        password: authPassword,
        role: "rider",
      };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Authentication failed.");
      }

      if (isLogin) {
        setToken(data.token);
        setCurrentUser(data.user);
        localStorage.setItem("cabgo_token", data.token);
        localStorage.setItem("cabgo_user", JSON.stringify(data.user));
        setShowAuthModal(false);
        setMessage("Signed in successfully as passenger.");
        setMessageType("success");
      } else {
        // Automatically switch to login after registering
        setAuthMode("login");
        setMessage("Account created! Logging you in...");
        setMessageType("success");
        // Log in immediately
        const loginRes = await fetch("http://localhost:5000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: authEmail.trim(), password: authPassword }),
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) {
          setToken(loginData.token);
          setCurrentUser(loginData.user);
          localStorage.setItem("cabgo_token", loginData.token);
          localStorage.setItem("cabgo_user", JSON.stringify(loginData.user));
          setShowAuthModal(false);
        }
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // 1-Click Demo Rider Login
  const handleDemoLogin = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "rider.demo@cabgo.com",
          password: "password123",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Demo login failed");
      }
      setToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem("cabgo_token", data.token);
      localStorage.setItem("cabgo_user", JSON.stringify(data.user));
      setShowAuthModal(false);
      setMessage("Signed in as Demo Passenger.");
      setMessageType("success");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    setCurrentUser(null);
    localStorage.removeItem("cabgo_token");
    localStorage.removeItem("cabgo_user");
    setMessage("Signed out.");
    setMessageType("success");
  };

  // Fetch recent rides
  const fetchMyRides = async () => {
    if (!token) return;
    setLoadingRides(true);
    try {
      const res = await fetch("http://localhost:5000/api/rides/my-rides", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.rides) {
        setMyRides(data.rides);
      }
    } catch (err) {
      console.warn("Could not fetch rides", err);
    } finally {
      setLoadingRides(false);
    }
  };

  const openRidesDrawer = () => {
    setShowRidesDrawer(true);
    fetchMyRides();
  };

  // Submit ride request
  const requestRide = async (event) => {
    event.preventDefault();
    setMessage("");
    setRide(null);

    if (!locations.pickup || !locations.dropoff) {
      setMessage("Please choose both pickup and destination on the map.");
      setMessageType("error");
      return;
    }

    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      setMessage("Please provide pickup and destination addresses.");
      setMessageType("error");
      return;
    }

    if (!token.trim()) {
      setMessage("Please sign in or use 1-Click Demo Passenger Login to book.");
      setMessageType("error");
      setShowAuthModal(true);
      return;
    }

    if (
      locations.pickup.lat === locations.dropoff.lat &&
      locations.pickup.lng === locations.dropoff.lng
    ) {
      setMessage("Pickup and destination must be different points.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/rides", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify({
          pickup_address: pickupAddress.trim(),
          dropoff_address: dropoffAddress.trim(),
          pickup_lat: locations.pickup.lat,
          pickup_lng: locations.pickup.lng,
          dropoff_lat: locations.dropoff.lat,
          dropoff_lng: locations.dropoff.lng,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to book your ride.");
      }

      setRide(data);
      if (data?.ride) {
        setSelectedLiveRide(data.ride);
        fetchMyRides();
      }
      setMessage("Your ride request has been confirmed! Connecting you to nearby drivers.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Could not connect to the CabGo server.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.app}>
      {/* Top Navigation */}
      <header className={styles.navbar}>
        <a href="/" className={styles.brand} aria-label="DriveGo home">
          <span className={styles.brandIcon}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
            </svg>
          </span>
          <div className={styles.brandText}>
            <span className={styles.brandName}>DriveGo</span>
            <span className={styles.brandSub}>Cab Services</span>
          </div>
        </a>

        <div className={styles.navRight}>
          <ThemeToggle />
          {currentUser ? (
            <div className={styles.userBadge}>
              <span className={styles.userStatusDot} />
              <div className={styles.userInfo}>
                <strong>{currentUser.full_name || "Passenger"}</strong>
                <span>{currentUser.email}</span>
              </div>
              <button
                type="button"
                onClick={openRidesDrawer}
                className={styles.ridesNavBtn}
              >
                My Rides
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className={styles.logoutBtn}
                title="Sign out"
              >
                Exit
              </button>
            </div>
          ) : (
            <div className={styles.authActions}>
              <button
                type="button"
                onClick={handleDemoLogin}
                className={styles.quickDemoBtn}
                disabled={authLoading}
              >
                ⚡ 1-Click Demo Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setShowAuthModal(true);
                }}
                className={styles.signInBtn}
              >
                Sign In
              </button>
            </div>
          )}

          <a href="/" className={styles.backLink}>
            Home ↗
          </a>
        </div>
      </header>

      {/* Hero Header */}
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>PREMIUM URBAN MOBILITY</span>
          <h1>
            Let’s get you <span>there.</span>
          </h1>
          <p>
            Pin your locations on the live interactive map, check your real-time
            fare and vehicle choices, and request your ride in seconds.
          </p>
        </div>

        <div className={styles.heroBadge}>
          <span className={styles.heroBadgeIcon}>⚡</span>
          <div>
            <strong>Instant City Dispatch</strong>
            <span>Verified drivers nearby</span>
          </div>
        </div>
      </section>

      {/* Eye-Catching Active Ride Highlight Card */}
      {activeRide && (
        <div
          className={styles.activeRideBanner}
          onClick={() => setSelectedLiveRide(activeRide)}
          role="button"
          tabIndex={0}
        >
          <div className={styles.activeBannerLeft}>
            <div className={styles.activePulseRing}>
              <span className={styles.activeCarEmoji}>🚖</span>
            </div>
            <div className={styles.activeBannerInfo}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className={styles.activeBannerTag} style={activeRide.status === "completed" && activeRide.payment_status !== "paid" ? { background: "rgba(244, 196, 1, 0.2)", color: "#f4c401", borderColor: "#f4c401" } : {}}>
                  {activeRide.status === "completed" && activeRide.payment_status !== "paid"
                    ? "💳 PAYMENT DUE"
                    : "● ACTIVE JOURNEY"}
                </span>
                <span
                  style={{
                    background: activeRide.status === "completed" && activeRide.payment_status !== "paid" ? "#fef3c7" : "#fef9c3",
                    color: activeRide.status === "completed" && activeRide.payment_status !== "paid" ? "#92400e" : "#854d0e",
                    fontWeight: 800,
                    fontSize: 10,
                    padding: "2px 7px",
                    borderRadius: 4,
                  }}
                >
                  {activeRide.status === "completed" && activeRide.payment_status !== "paid"
                    ? "AWAITING PAYMENT"
                    : activeRide.status?.toUpperCase()}
                </span>
                {["requested", "accepted", "arriving"].includes(activeRide.status) && (
                  <span className={styles.bannerOtpPill}>
                    🔐 Start OTP: <strong>{activeRide.otp_code || "4829"}</strong>
                  </span>
                )}
              </div>
              <p className={styles.activeBannerRoute}>
                <span>📍 {activeRide.pickup_address}</span>
                <span className={styles.bannerArrow}>➔</span>
                <span>🏁 {activeRide.dropoff_address}</span>
              </p>
            </div>
          </div>

          <div className={styles.activeBannerRight}>
            <div className={styles.activeBannerFare}>
              ₹{Number(activeRide.estimated_fare).toFixed(2)}
              <small>
                {activeRide.status === "completed" && activeRide.payment_status !== "paid"
                  ? "Pay via UPI QR"
                  : "Estimated Fare"}
              </small>
            </div>
            <button
              type="button"
              className={styles.trackLiveBtn}
              style={activeRide.status === "completed" && activeRide.payment_status !== "paid" ? { background: "#10b981", color: "#ffffff", borderColor: "#10b981" } : {}}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedLiveRide(activeRide);
              }}
            >
              {activeRide.status === "completed" && activeRide.payment_status !== "paid"
                ? "📲 Pay via UPI QR / Card ➔"
                : "Track Live Location & Details ➔"}
            </button>
          </div>
        </div>
      )}

      {/* Location Permission Prompt Banner */}
      <div
        className={`${styles.locationPromptBanner} ${locationPermission === "granted" ? styles.locationPromptBannerGranted : ""
          }`}
      >
        <div className={styles.locationPromptLeft}>
          <div
            className={`${styles.locationPromptIcon} ${locationPermission === "granted" ? styles.locationPromptIconSuccess : ""
              }`}
          >
            {locationPermission === "granted" ? "✓" : "📍"}
          </div>
          <div className={styles.locationPromptText}>
            <strong>
              {locationPermission === "granted"
                ? "Your Pickup Location is Active"
                : locationPermission === "prompting"
                  ? "Detecting device GPS location..."
                  : "Allow Location Access for Optimum Cab Dispatch"}
            </strong>
            <p>
              {locationPermission === "granted"
                ? "Live GPS coordinates are locked in. Nearby drivers within a 1–2 km radius can now pinpoint you directly."
                : "Enable GPS so we can automatically set your pickup spot and broadcast ride requests to drivers closest to you."}
            </p>
          </div>
        </div>
        <div className={styles.locationPromptRight}>
          {locationPermission === "granted" ? (
            <span className={`${styles.allowLocationBtn} ${styles.allowLocationBtnActive}`}>
              ✓ GPS Locked
            </span>
          ) : (
            <button
              type="button"
              onClick={requestRiderLocation}
              className={styles.allowLocationBtn}
              disabled={locationPermission === "prompting"}
            >
              {locationPermission === "prompting" ? "Detecting..." : "📍 Allow Location"}
            </button>
          )}
        </div>
      </div>

      {/* Main Booking Two-Column Grid */}
      <div className={styles.bookingLayout}>
        {/* Left Column: Interactive Leaflet Map */}
        <section className={styles.mapPanel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelKicker}>STEP 01</span>
              <h2>Plan your route on the map</h2>
              <p>Click anywhere on the map to set pickup and drop-off points.</p>
            </div>
            <span className={styles.mapBadge}>
              <span /> Live Map Active
            </span>
          </div>

          <BookingMap
            locations={locations}
            pickupAddress={pickupAddress}
            dropoffAddress={dropoffAddress}
            onLocationsChange={handleLocationsChange}
            onAddressResolved={handleAddressResolved}
          />

          <div className={styles.mapHint}>
            <span className={styles.hintIcon}>💡</span>
            <p>
              <strong>Pro Tip:</strong> Click either card or button above the map
              to select Pickup or Destination. You can also use the &quot;My Location&quot;
              GPS button or click quick landmark presets below the map!
            </p>
          </div>
        </section>

        {/* Right Column: Trip Configuration & Booking Panel */}
        <aside className={styles.bookingPanel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelKicker}>STEP 02</span>
              <h2>Your ride booking</h2>
              <p>Confirm route addresses and pick your preferred vehicle.</p>
            </div>
          </div>

          <form onSubmit={requestRide} className={styles.form}>
            {/* Timeline addresses with dynamic auto-expanding connector */}
            <div className={styles.routeContainer}>
              <div className={styles.routeItem}>
                <div className={styles.markerColumn}>
                  <span className={styles.originMarker} />
                  <span className={styles.verticalConnector} />
                </div>
                <div className={styles.fieldContent}>
                  <label className={styles.fieldLabel}>PICKUP LOCATION</label>
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="Where should we pick you up?"
                    maxLength={500}
                    required
                    className={styles.inputField}
                  />
                  <span className={styles.fieldHint}>
                    {locations.pickup
                      ? `Lat: ${locations.pickup.lat.toFixed(5)}, Lng: ${locations.pickup.lng.toFixed(5)}`
                      : "👈 Click on map or choose a preset"}
                  </span>
                </div>
              </div>

              <div className={styles.routeItem}>
                <div className={styles.markerColumn}>
                  <span className={styles.destinationMarker} />
                </div>
                <div className={styles.fieldContent}>
                  <label className={styles.fieldLabel}>DESTINATION</label>
                  <input
                    type="text"
                    value={dropoffAddress}
                    onChange={(e) => setDropoffAddress(e.target.value)}
                    placeholder="Where are you heading?"
                    maxLength={500}
                    required
                    className={styles.inputField}
                  />
                  <span className={styles.fieldHint}>
                    {locations.dropoff
                      ? `Lat: ${locations.dropoff.lat.toFixed(5)}, Lng: ${locations.dropoff.lng.toFixed(5)}`
                      : "👈 Click on map for destination"}
                  </span>
                </div>
              </div>
            </div>

            {/* Vehicle Category Selector */}
            <div className={styles.vehicleSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.summaryTitle}>SELECT VEHICLE</span>
                <span className={styles.etaText}>
                  {tripStats ? `ETA: ${tripStats.durationMins} mins` : "Ready"}
                </span>
              </div>

              <div className={styles.vehicleGrid}>
                {RIDE_TYPES.map((v) => {
                  const fare = tripStats
                    ? calculateFare(tripStats.distanceKm, v.multiplier)
                    : null;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedRideType(v.id)}
                      className={`${styles.vehicleCard} ${selectedRideType === v.id ? styles.vehicleSelected : ""
                        }`}
                    >
                      {v.image ? (
                        <img
                          src={v.image}
                          alt={v.name}
                          className={styles.vehicleThumb}
                        />
                      ) : (
                        <span className={styles.vehicleIcon}>{v.icon}</span>
                      )}
                      <div className={styles.vehicleInfo}>
                        <div className={styles.vehicleTopRow}>
                          <strong>{v.name}</strong>
                          <span className={styles.vehiclePrice}>
                            {fare ? `₹${fare}` : "—"}
                          </span>
                        </div>
                        <span className={styles.vehicleDesc}>
                          {v.capacity} · {v.eta} away
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Trip Summary & Fare Card */}
            <div className={styles.tripSummary}>
              <div className={styles.summaryTop}>
                <span className={styles.summaryTitle}>TRIP ESTIMATE</span>
                <span className={styles.summaryIcon}>₹</span>
              </div>

              <div className={styles.summaryRow}>
                <span>Trip Distance</span>
                <strong>
                  {tripStats ? `${tripStats.distanceKm} km` : "Select 2 points on map"}
                </strong>
              </div>

              <div className={styles.summaryRow}>
                <span>Estimated Time</span>
                <strong>
                  {tripStats ? `~${tripStats.durationMins} mins` : "—"}
                </strong>
              </div>

              <div className={styles.fareDivider} />

              <div className={styles.fareRow}>
                <div>
                  <span className={styles.fareLabel}>Estimated Total Fare</span>
                  <span className={styles.fareCaption}>
                    Base ₹40 + ₹15/km (Min ₹60)
                  </span>
                </div>
                <strong className={styles.fareValue}>
                  {tripStats ? `₹${tripStats.estimatedFare}` : "—"}
                </strong>
              </div>
            </div>

            {/* Authentication status reminder */}
            {!currentUser && (
              <div className={styles.authNotice}>
                <div className={styles.noticeIcon}>🔐</div>
                <div className={styles.noticeCopy}>
                  <strong>Passenger Login Required</strong>
                  <p>Sign in or use 1-click demo to book with the backend.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className={styles.noticeDemoBtn}
                >
                  Quick Login
                </button>
              </div>
            )}

            {/* Developer token manual override accordion */}
            <details className={styles.devTokenDetails}>
              <summary className={styles.devTokenSummary}>
                Developer JWT Override
              </summary>
              <div className={styles.devTokenBody}>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste raw JWT here"
                  className={styles.tokenInput}
                />
                <span className={styles.tokenHint}>
                  Auto-populated when logged in. Can be overridden manually.
                </span>
              </div>
            </details>

            {/* Status alerts */}
            {message && (
              <div
                className={
                  messageType === "success"
                    ? styles.successMessage
                    : styles.errorMessage
                }
                role="status"
              >
                <strong>
                  {messageType === "success" ? "✓ Request Received" : "Notice"}
                </strong>
                <span>{message}</span>
              </div>
            )}

            {/* Submit Request Button */}
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              <span>
                {loading
                  ? "Dispatching your request..."
                  : tripStats
                    ? `Request Ride · ₹${tripStats.estimatedFare}`
                    : "Request a ride"}
              </span>
              <span className={styles.submitArrow}>{loading ? "…" : "→"}</span>
            </button>

            <p className={styles.terms}>
              Safe city rides backed by live PostgreSQL dispatch. No surge fees.
            </p>
          </form>

          {/* Booking Confirmation Card */}
          {ride?.ride && (
            <div className={styles.confirmation}>
              <div className={styles.confirmationHeader}>
                <span className={styles.confirmationRadar} />
                <div>
                  <strong>Ride Booked Successfully!</strong>
                  <span className={styles.statusPill}>
                    STATUS: {ride.ride.status?.toUpperCase() || "REQUESTED"}
                  </span>
                </div>
              </div>

              <div className={styles.confirmationDetails}>
                <div className={styles.confirmRow}>
                  <span>Ride ID:</span>
                  <code className={styles.rideId}>{ride.ride.id}</code>
                </div>
                <div className={styles.confirmRow}>
                  <span>Distance:</span>
                  <strong>{ride.distance_km || tripStats?.distanceKm} km</strong>
                </div>
                <div className={styles.confirmRow}>
                  <span>Confirmed Fare:</span>
                  <strong className={styles.fareHighlight}>
                    ₹{ride.estimated_fare || tripStats?.estimatedFare}
                  </strong>
                </div>
              </div>

              <div className={styles.confirmationActions}>
                <a
                  href={`/payment?rideId=${ride.ride.id}`}
                  className={styles.viewRidesBtn}
                  style={{
                    background: "#f4c401",
                    color: "#0c0d0e",
                    textAlign: "center",
                    textDecoration: "none",
                    fontWeight: 800,
                  }}
                >
                  💳 Pay Now (₹{ride.estimated_fare || tripStats?.estimatedFare})
                </a>
                <button
                  type="button"
                  onClick={openRidesDrawer}
                  className={styles.viewRidesBtn}
                >
                  View in My Rides
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRide(null);
                    setMessage("");
                  }}
                  className={styles.bookAnotherBtn}
                >
                  Book Another Ride
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Auth Modal (Sign In / Register) */}
      {showAuthModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>{authMode === "login" ? "Passenger Sign In" : "Create Passenger Account"}</h3>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className={styles.modalForm}>
              {authMode === "register" && (
                <label className={styles.modalField}>
                  <span>Full Name</span>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                  />
                </label>
              )}

              <label className={styles.modalField}>
                <span>Email Address</span>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="passenger@example.com"
                />
              </label>

              <label className={styles.modalField}>
                <span>Password (min 8 chars)</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </label>

              {authError && (
                <div className={styles.modalError}>{authError}</div>
              )}

              <div className={styles.modalButtons}>
                <button
                  type="submit"
                  disabled={authLoading}
                  className={styles.modalSubmitBtn}
                >
                  {authLoading
                    ? "Authenticating..."
                    : authMode === "login"
                      ? "Sign In"
                      : "Create Account"}
                </button>

                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={authLoading}
                  className={styles.modalDemoBtn}
                >
                  ⚡ Fill &amp; Login with Demo Passenger
                </button>
              </div>

              <div className={styles.modalToggle}>
                {authMode === "login" ? (
                  <span>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("register");
                        setAuthError("");
                      }}
                    >
                      Register here
                    </button>
                  </span>
                ) : (
                  <span>
                    Already registered?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthError("");
                      }}
                    >
                      Sign In
                    </button>
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Journeys Drawer */}
      {showRidesDrawer && (
        <div className={styles.modalOverlay} onClick={() => setShowRidesDrawer(false)}>
          <div className={styles.drawerCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Your Journeys</h3>
              <button
                type="button"
                onClick={() => setShowRidesDrawer(false)}
                className={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <div className={styles.drawerBody}>
              {loadingRides ? (
                <div className={styles.drawerLoading}>Loading rides...</div>
              ) : myRides.length === 0 ? (
                <div className={styles.drawerEmpty}>
                  <p>No rides found for this passenger.</p>
                  <span>Book your first journey using the map!</span>
                </div>
              ) : (
                <>
                  {/* Highlighted Active Ride Section */}
                  {activeRidesList.length > 0 && (
                    <div className={styles.activeRidesDrawerSection}>
                      <div className={styles.drawerSectionHeader}>
                        <span className={styles.liveDrawerDot} />
                        <h4>ACTIVE JOURNEY (IN PROGRESS)</h4>
                      </div>
                      {activeRidesList.map((r) => (
                        <div
                          key={r.id}
                          onClick={() => {
                            setSelectedLiveRide(r);
                            setShowRidesDrawer(false);
                          }}
                          className={styles.activeRideDrawerCard}
                        >
                          <div className={styles.activeDrawerTop}>
                            <span
                              style={{
                                background: "#fef9c3",
                                color: "#854d0e",
                                fontWeight: 800,
                                fontSize: 10,
                                padding: "2px 7px",
                                borderRadius: 4,
                              }}
                            >
                              {r.status?.toUpperCase()}
                            </span>
                            <strong className={styles.activeDrawerFare}>
                              ₹{r.estimated_fare}
                            </strong>
                          </div>
                          <div className={styles.rideCardRoute}>
                            <p>📍 {r.pickup_address}</p>
                            <p>🏁 {r.dropoff_address}</p>
                          </div>
                          <div className={styles.activeDrawerBottom}>
                            {["requested", "accepted", "arriving"].includes(r.status) && (
                              <span className={styles.otpPill}>
                                🔐 OTP: <strong>{r.otp_code || "4829"}</strong>
                              </span>
                            )}
                            <span className={styles.trackLiveAction}>
                              Track Live Driver ➔
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Past Completed Rides Section */}
                  <div className={styles.pastRidesDrawerSection}>
                    <h4 className={styles.pastSectionTitle}>
                      PAST COMPLETED TRIPS ({pastCompletedRides.length})
                    </h4>
                    {pastCompletedRides.length === 0 ? (
                      <p className={styles.noPastText}>
                        No past completed rides recorded yet.
                      </p>
                    ) : (
                      <div className={styles.ridesList}>
                        {pastCompletedRides.map((r) => (
                          <div
                            key={r.id}
                            onClick={() => {
                              setSelectedLiveRide(r);
                              setShowRidesDrawer(false);
                            }}
                            className={styles.rideCardItem}
                            style={{ cursor: "pointer" }}
                          >
                            <div className={styles.rideCardTop}>
                              <span className={styles.rideCardStatus}>
                                {r.status?.toUpperCase()}
                              </span>
                              <strong className={styles.rideCardFare}>
                                ₹{r.estimated_fare}
                              </strong>
                            </div>
                            <div className={styles.rideCardRoute}>
                              <p>📍 {r.pickup_address}</p>
                              <p>🏁 {r.dropoff_address}</p>
                            </div>
                            <div className={styles.pastCardFooter}>
                              <span className={styles.rideCardDate}>
                                {new Date(r.created_at).toLocaleString()}
                              </span>
                              <span className={styles.viewBillText}>
                                View Bill & Details →
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Ride Tracking & Details Modal */}
      {selectedLiveRide && (
        <LiveRideModal
          ride={selectedLiveRide}
          onClose={() => setSelectedLiveRide(null)}
          onRideUpdated={fetchMyRides}
        />
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <a href="/" className={styles.footerBrand}>
          DriveGo
        </a>
        <span>Safe, reliable, and affordable city rides.</span>
        <span>© DriveGo · All rights reserved 2025</span>
      </footer>
    </main>
  );
}
