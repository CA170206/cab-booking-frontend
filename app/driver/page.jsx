"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AuthGuard from "../components/AuthGuard";
import StatusBadge from "../components/StatusBadge";
import { LoadingSpinner, EmptyState, ErrorMessage, SuccessMessage } from "../components/UIFeedback";
import { driverApi, ridesApi, profileApi, paymentApi } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import styles from "./driver.module.css";

const ACTIVE_TRIP_KEY = "cabgo_driver_active_trip";

export default function DriverDashboardPage() {
  const [user, setUser] = useState(null);
  const [availableRides, setAvailableRides] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [inputOtp, setInputOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  // Destination reached settlement and payment confirmation state
  const [destinationReached, setDestinationReached] = useState(false);
  const [settlingPayment, setSettlingPayment] = useState(false);
  const [settledReceipt, setSettledReceipt] = useState(null);
  const [copyUpiSuccess, setCopyUpiSuccess] = useState(false);

  // Driver cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("passenger_no_show");
  const [customCancelReason, setCustomCancelReason] = useState("");

  // Notifies the driver partner when a customer cancels an active journey
  const [cancelledNotice, setCancelledNotice] = useState(null);

  // Synchronous refs to prevent stale closures inside background polling
  const activeRideRef = useRef(activeRide);
  useEffect(() => {
    activeRideRef.current = activeRide;
  }, [activeRide]);

  const destinationReachedRef = useRef(destinationReached);
  useEffect(() => {
    destinationReachedRef.current = destinationReached;
  }, [destinationReached]);

  const settledReceiptRef = useRef(settledReceipt);
  useEffect(() => {
    settledReceiptRef.current = settledReceipt;
  }, [settledReceipt]);

  // Voice and sound effects toggle (persisted across sessions)
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cabgo_voice_enabled");
      if (stored !== null) {
        setVoiceEnabled(stored === "true");
      }
    } catch (e) {}
  }, []);

  const toggleVoice = () => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("cabgo_voice_enabled", String(next));
        if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
      } catch (e) {}
      return next;
    });
  };

  // Voice speech announcement: "Destination reached. Please collect payment from passenger."
  const speakDestinationReached = () => {
    if (!voiceEnabled) return;
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const text = "Destination reached. Please collect payment from passenger.";
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {}
  };

  // Soundbox style voice announcement: "Payment received! One hundred eighty-seven rupees received on CabGo UPI."
  const speakPaymentReceived = (fareAmount, method = "UPI") => {
    if (!voiceEnabled) return;
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const roundedFare = Math.round(Number(fareAmount || 0));
        const methodText = method === "cash" ? "cash" : "UPI";
        const speechText = `Payment received. ${roundedFare} rupees received via ${methodText}.`;
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find((v) => v.lang === "en-IN" || v.lang === "hi-IN");
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {}
  };

  // Audio tone chime when destination is reached
  const playDestinationChime = () => {
    if (!voiceEnabled) return;
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(392, ctx.currentTime);
      osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {}
  };

  // Celebratory chime when payment is collected
  const playPaymentSuccessChime = () => {
    if (!voiceEnabled) return;
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24);
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.36);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } catch (e) {}
  };

  // Audio tone cue when trip is cancelled
  const playCancelAlertSound = () => {
    if (!voiceEnabled) return;
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  };

  // Driver current active location for 1-2 km radius dispatch matching
  const [driverLocation, setDriverLocation] = useState({
    lat: 20.005,
    lng: 73.785,
  });
  const [gpsStatus, setGpsStatus] = useState("prompt"); // "prompt" | "requesting" | "active" | "denied"

  // Prompt driver for browser GPS location
  const requestDriverGps = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsStatus("denied");
      return;
    }
    setGpsStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setDriverLocation({ lat, lng });
        setGpsStatus("active");
        try {
          await driverApi.updateLocation(lat, lng);
        } catch (e) {}
      },
      (err) => {
        console.warn("Driver location permission:", err.message);
        setGpsStatus("denied");
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      // 1. Fetch available rides strictly within 2.0 km radius
      const res = await driverApi.getAvailableRides(driverLocation.lat, driverLocation.lng, 2.0);
      if (res?.success && Array.isArray(res.rides)) {
        setAvailableRides(res.rides);
      } else {
        setAvailableRides([]);
      }

      // 2. Fetch driver's active ride from database to maintain perfect sync
      const activeRes = await driverApi.getActiveRide().catch(() => null);
      if (activeRes?.success && activeRes.ride) {
        setActiveRide(activeRes.ride);
        localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(activeRes.ride));
      } else {
        // If DB has no active trip, check if local storage had one that was cancelled
        const storedActive = localStorage.getItem(ACTIVE_TRIP_KEY);
        if (storedActive) {
          try {
            const parsed = JSON.parse(storedActive);
            if (parsed?.id) {
              const details = await ridesApi.getRideDetails(parsed.id).catch(() => null);
              if (details?.ride?.status === "cancelled") {
                setCancelledNotice({
                  pickup: parsed.pickup_address,
                  dropoff: parsed.dropoff_address,
                  message: `The previous ride request (${parsed.pickup_address || "Pickup"} → ${parsed.dropoff_address || "Dropoff"}) was cancelled by the customer. Scanning for new requests.`,
                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                });
              }
            }
          } catch (e) {}
          localStorage.removeItem(ACTIVE_TRIP_KEY);
        }
        setActiveRide(null);
      }

      // 3. Keep driver profile and verified UPI ID in sync
      const profRes = await profileApi.getProfile().catch(() => null);
      if (profRes?.success && profRes.profile) {
        setUser(profRes.profile);
      } else {
        setUser(getStoredUser());
      }
    } catch (err) {
      setError(err.message || "Failed to fetch available driver rides.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-request location on mount and watch GPS
  useEffect(() => {
    requestDriverGps();

    if (typeof window !== "undefined" && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setDriverLocation({ lat, lng });
          setGpsStatus("active");
          driverApi.updateLocation(lat, lng).catch(() => {});
        },
        null,
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    setUser(getStoredUser());
    loadData();

    // Background poll every 2.5s:
    // - Actively monitors ongoing trip: if cancelled by passenger, immediately frees driver console
    // - Refreshes nearby available ride requests within 1-2 km
    const interval = setInterval(async () => {
      const currentActive = activeRideRef.current;

      // 1. If currently on an active trip, monitor if passenger cancelled it
      if (currentActive?.id) {
        try {
          const statusRes = await ridesApi.getRideDetails(currentActive.id);
          if (statusRes?.success && statusRes.ride) {
            if (statusRes.ride.status === "cancelled") {
              // PASSENGER CANCELLED THE ACTIVE TRIP!
              const cancelledPickup = currentActive.pickup_address || "pickup location";
              const cancelledDropoff = currentActive.dropoff_address || "destination";

              setActiveRide(null);
              localStorage.removeItem(ACTIVE_TRIP_KEY);
              setShowOtpModal(false);
              setInputOtp("");
              setOtpError("");

              setCancelledNotice({
                pickup: cancelledPickup,
                dropoff: cancelledDropoff,
                message: `The customer cancelled the ride request for "${cancelledDropoff}". Your vehicle is back online and scanning for new requests nearby.`,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              });

              playCancelAlertSound();

              if (typeof window !== "undefined" && navigator?.vibrate) {
                try {
                  navigator.vibrate([200, 100, 200]);
                } catch (e) {}
              }

              // Immediately scan for new nearby passenger requests
              const newAvail = await driverApi.getAvailableRides(driverLocation.lat, driverLocation.lng, 2.0);
              if (newAvail?.success && Array.isArray(newAvail.rides)) {
                setAvailableRides(newAvail.rides);
              }
              return;
            }

            // 2. AUTOMATIC QR / ONLINE PAYMENT DETECTION:
            // When passenger pays via QR or online, site automatically gets notified & speaks payment received!
            if (
              statusRes.ride.payment_status === "paid" &&
              (!settledReceiptRef.current || settledReceiptRef.current.rideId !== statusRes.ride.id)
            ) {
              const fare = Number(statusRes.ride.estimated_fare).toFixed(2);
              const pickup = statusRes.ride.pickup_address;
              const dropoff = statusRes.ride.dropoff_address;

              playPaymentSuccessChime();
              speakPaymentReceived(fare, statusRes.ride.payment_method === "cash" ? "cash" : "UPI");

              // Ensure trip is marked completed in DB
              if (statusRes.ride.status !== "completed") {
                driverApi.updateRideStatus(statusRes.ride.id, "completed", null, "upi_qr", "paid").catch(() => {});
              }

              setSettledReceipt({
                rideId: statusRes.ride.id,
                fare,
                method: statusRes.ride.payment_method === "cash" ? "Cash (Collected)" : "UPI QR (Payment Received via Soundbox)",
                pickup,
                dropoff,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                autoVerified: true,
              });

              localStorage.removeItem(ACTIVE_TRIP_KEY);
              setActiveRide(null);
              setDestinationReached(false);
              return;
            } else if (statusRes.ride.status !== currentActive.status || statusRes.ride.payment_status !== currentActive.payment_status) {
              setActiveRide(statusRes.ride);
              localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(statusRes.ride));
            }
          }
        } catch (e) {
          // If ride details fails, fallback check to active ride endpoint
          try {
            const activeCheck = await driverApi.getActiveRide();
            if (activeCheck?.success && !activeCheck.ride) {
              setActiveRide(null);
              localStorage.removeItem(ACTIVE_TRIP_KEY);
              setShowOtpModal(false);
              setCancelledNotice({
                pickup: currentActive.pickup_address,
                dropoff: currentActive.dropoff_address,
                message: "This ride was cancelled by the customer. Now scanning for new requests...",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              });
            }
          } catch (e2) {}
        }
      }

      // 2. Poll available rides within 2.0 km dispatch zone
      driverApi
        .getAvailableRides(driverLocation.lat, driverLocation.lng, 2.0)
        .then((res) => {
          if (res?.success && Array.isArray(res.rides)) {
            setAvailableRides(res.rides);
          }
        })
        .catch(() => {});
    }, 2500);

    return () => clearInterval(interval);
  }, [driverLocation]);

  // Accept a ride request
  const handleAcceptRide = async (ride) => {
    try {
      setActionLoading(true);
      setError("");
      setSuccess("");
      setCancelledNotice(null);

      const res = await driverApi.acceptRide(ride.id);
      if (res?.success && res.ride) {
        const accepted = res.ride;
        setActiveRide(accepted);
        localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(accepted));
        setSuccess(`Ride for ${accepted.pickup_address} successfully accepted!`);
        // Remove from available list
        setAvailableRides((prev) => prev.filter((r) => r.id !== ride.id));
      } else {
        throw new Error(res?.message || "Unable to accept ride.");
      }
    } catch (err) {
      setError(
        err.status === 409
          ? "This ride was already claimed by another driver."
          : err.message || "Failed to accept ride."
      );
      // Refresh to update available list
      loadData();
    } finally {
      setActionLoading(false);
    }
  };

  // Progress ride status
  const handleProgressStatus = async (nextStatus) => {
    if (!activeRide) return;

    if (nextStatus === "in_progress") {
      setShowOtpModal(true);
      setInputOtp("");
      setOtpError("");
      return;
    }

    if (nextStatus === "completed") {
      // DO NOT cutoff the ride immediately!
      // Announce arrival, play chime, and display UPI QR + Cash settlement view!
      setDestinationReached(true);
      speakDestinationReached();
      playDestinationChime();
      if (typeof window !== "undefined" && navigator?.vibrate) {
        try {
          navigator.vibrate([150, 100, 150]);
        } catch (e) {}
      }
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const res = await driverApi.updateRideStatus(activeRide.id, nextStatus);
      if (res?.success && res.ride) {
        const updated = res.ride;
        setActiveRide(updated);
        localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(updated));
        setSuccess(`Trip status progressed to "${nextStatus}".`);
      } else {
        throw new Error(res?.message || "Failed to update status.");
      }
    } catch (err) {
      if (err.cancelled || (err.message && err.message.toLowerCase().includes("cancelled"))) {
        const cancelledPickup = activeRide?.pickup_address;
        const cancelledDropoff = activeRide?.dropoff_address;
        setActiveRide(null);
        localStorage.removeItem(ACTIVE_TRIP_KEY);
        setShowOtpModal(false);
        setDestinationReached(false);
        setCancelledNotice({
          pickup: cancelledPickup,
          dropoff: cancelledDropoff,
          message: "⚠️ Ride was cancelled by the customer before status update. Automatically scanning for new requests...",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
        playCancelAlertSound();
        loadData();
      } else {
        setError(err.message || "Unable to update ride status.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm payment settlement (Cash or UPI QR) and complete the ride
  const handleSettlePayment = async (paymentMethod) => {
    if (!activeRide) return;

    try {
      setSettlingPayment(true);
      setError("");

      const res = await driverApi.updateRideStatus(
        activeRide.id,
        "completed",
        null,
        paymentMethod,
        "paid"
      );

      if (res?.success) {
        const fare = Number(activeRide.estimated_fare).toFixed(2);
        const pickup = activeRide.pickup_address;
        const dropoff = activeRide.dropoff_address;

        playPaymentSuccessChime();
        speakPaymentReceived(fare, paymentMethod);

        setSettledReceipt({
          fare,
          method: paymentMethod === "cash" ? "Cash (Collected by Driver)" : "UPI QR (Payment Received)",
          pickup,
          dropoff,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        });

        localStorage.removeItem(ACTIVE_TRIP_KEY);
        setActiveRide(null);
        setDestinationReached(false);
      } else {
        throw new Error(res?.message || "Failed to confirm payment settlement.");
      }
    } catch (err) {
      setError(err.message || "Unable to confirm payment settlement.");
    } finally {
      setSettlingPayment(false);
    }
  };

  // Instant simulated passenger QR payment for testing / demo
  const handleSimulatePassengerQrPayment = async () => {
    if (!activeRide) return;
    try {
      setSettlingPayment(true);
      setError("");

      const fare = Number(activeRide.estimated_fare).toFixed(2);
      const res = await paymentApi.confirmQrPayment(activeRide.id, fare);

      if (res?.success) {
        playPaymentSuccessChime();
        speakPaymentReceived(fare, "UPI");

        // Complete the trip in DB
        await driverApi.updateRideStatus(activeRide.id, "completed", null, "upi_qr", "paid").catch(() => {});

        setSettledReceipt({
          rideId: activeRide.id,
          fare,
          method: "UPI QR (Payment Received via Soundbox)",
          pickup: activeRide.pickup_address,
          dropoff: activeRide.dropoff_address,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          autoVerified: true,
        });

        localStorage.removeItem(ACTIVE_TRIP_KEY);
        setActiveRide(null);
        setDestinationReached(false);
      } else {
        throw new Error(res?.message || "Failed to confirm simulated QR payment.");
      }
    } catch (err) {
      setError(err.message || "Unable to confirm payment.");
    } finally {
      setSettlingPayment(false);
    }
  };

  // Verify OTP and start the trip
  const handleVerifyOtpAndStart = async (e) => {
    e?.preventDefault();
    if (!activeRide) return;
    if (!inputOtp || inputOtp.trim().length !== 4) {
      setOtpError("Please enter the 4-digit OTP provided by the passenger.");
      return;
    }

    try {
      setActionLoading(true);
      setOtpError("");
      setError("");

      const res = await driverApi.updateRideStatus(activeRide.id, "in_progress", inputOtp.trim());
      if (res?.success && res.ride) {
        const updated = res.ride;
        setActiveRide(updated);
        localStorage.setItem(ACTIVE_TRIP_KEY, JSON.stringify(updated));
        setShowOtpModal(false);
        setInputOtp("");
        setSuccess("Ride OTP verified successfully! Trip is now in progress.");
      } else {
        throw new Error(res?.message || "Invalid OTP code. Please check with passenger.");
      }
    } catch (err) {
      if (err.cancelled || (err.message && err.message.toLowerCase().includes("cancelled"))) {
        const cancelledPickup = activeRide?.pickup_address;
        const cancelledDropoff = activeRide?.dropoff_address;
        setActiveRide(null);
        localStorage.removeItem(ACTIVE_TRIP_KEY);
        setShowOtpModal(false);
        setCancelledNotice({
          pickup: cancelledPickup,
          dropoff: cancelledDropoff,
          message: "⚠️ Ride was cancelled by the customer. Your console is back online.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
        playCancelAlertSound();
        loadData();
      } else {
        setOtpError(err.message || "Incorrect OTP code. Ask passenger to verify or resend the OTP.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Driver partner cancels active ride
  const handleDriverCancelRide = async (e) => {
    e?.preventDefault();
    if (!activeRide) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const reasonMap = {
        passenger_no_show: "Passenger no-show / Unreachable",
        breakdown: "Vehicle breakdown / Flat tire",
        traffic: "Severe traffic gridlock / Cannot reach pickup",
        rider_request: "Passenger requested cancellation",
        emergency: "Personal emergency",
        other: customCancelReason.trim() || "Driver cancelled trip",
      };

      const finalReason = reasonMap[cancelReason] || cancelReason;

      const res = await driverApi.cancelRide(activeRide.id, finalReason);
      if (res?.success) {
        const pickupName = activeRide.pickup_address;
        const dropoffName = activeRide.dropoff_address;

        setActiveRide(null);
        localStorage.removeItem(ACTIVE_TRIP_KEY);
        setShowCancelModal(false);
        setShowOtpModal(false);
        setCustomCancelReason("");

        setSuccess(`✓ Ride (${pickupName} → ${dropoffName}) was cancelled. Reason: "${finalReason}". You are back online.`);
        loadData();
      } else {
        throw new Error(res?.message || "Failed to cancel ride.");
      }
    } catch (err) {
      setError(err.message || "Failed to cancel ride.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />

      <AuthGuard requiredRole="driver">
        <main className={styles.main}>
          {/* Driver Status Hero */}
          <div className={styles.driverHero}>
            <div className={styles.driverInfo}>
              <h1>Driver Partner Console</h1>
              <p>Welcome, {user?.full_name || "Partner"}. You are currently connected to dispatch.</p>
              <div className={styles.statusPillOnline}>
                <span className={styles.onlineDot} />
                <span>Status: Online & Ready for Trips</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={toggleVoice}
                className={styles.refreshBtn}
                style={{
                  background: voiceEnabled ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  borderColor: voiceEnabled ? "#10b981" : "#ef4444",
                  color: voiceEnabled ? "#10b981" : "#f87171",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
                title={voiceEnabled ? "Voice announcements & soundbox active. Tap to turn OFF." : "Voice announcements muted. Tap to turn ON."}
              >
                {voiceEnabled ? "🔊 Voice: ON" : "🔇 Voice: OFF"}
              </button>

              <button
                type="button"
                onClick={loadData}
                className={styles.refreshBtn}
                disabled={loading || actionLoading}
              >
                🔄 Refresh Requests
              </button>
            </div>
          </div>

          {/* Driver GPS Permission Banner */}
          <div
            className={`${styles.gpsPromptBanner} ${
              gpsStatus === "active" ? styles.gpsPromptBannerActive : ""
            }`}
          >
            <div className={styles.gpsPromptLeft}>
              <div
                className={`${styles.gpsPromptIcon} ${
                  gpsStatus === "active" ? styles.gpsPromptIconActive : ""
                }`}
              >
                {gpsStatus === "active" ? "📍" : "🛰️"}
              </div>
              <div className={styles.gpsPromptText}>
                <strong>
                  {gpsStatus === "active"
                    ? "Live Driver Radar Active (1–2 km Dispatch Radius)"
                    : gpsStatus === "requesting"
                    ? "Locking your device GPS location..."
                    : "Allow Driver Location for Optimum Dispatch Matching"}
                </strong>
                <p>
                  {gpsStatus === "active"
                    ? `Matching trips within a 2.0 km radius of your location. Your vehicle coordinates are synced with dispatch.`
                    : "CabGo strictly allocates ride requests within a 1–2 km radius. Enable device location so nearby passengers can match with your cab."}
                </p>
                {gpsStatus === "active" && (
                  <span className={styles.gpsCoordBadge}>
                    GPS: {driverLocation.lat.toFixed(5)}, {driverLocation.lng.toFixed(5)} · Active 2 km Radius
                  </span>
                )}
              </div>
            </div>

            <div className={styles.gpsPromptRight}>
              {gpsStatus === "active" ? (
                <span className={styles.gpsLockedPill}>
                  ● GPS Broadcasting
                </span>
              ) : (
                <button
                  type="button"
                  onClick={requestDriverGps}
                  className={styles.allowGpsBtn}
                  disabled={gpsStatus === "requesting"}
                >
                  {gpsStatus === "requesting" ? "Locking GPS..." : "📍 Allow Location"}
                </button>
              )}
            </div>
          </div>

          <ErrorMessage message={error} />
          <SuccessMessage message={success} />

          {/* Ride Cancelled by Customer Banner & Scanner */}
          {cancelledNotice && (
            <div className={styles.cancelledAlertCard} role="alert">
              <div className={styles.cancelledAlertHeader}>
                <div className={styles.cancelledBadgeRow}>
                  <span className={styles.cancelledAlertBadge}>
                    <span className={styles.cancelledPulseDot} />
                    Ride Cancelled by Customer
                  </span>
                  {cancelledNotice.timestamp && (
                    <span className={styles.cancelledTimestamp}>
                      at {cancelledNotice.timestamp}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCancelledNotice(null)}
                  className={styles.cancelledDismissBtn}
                  aria-label="Dismiss cancellation alert"
                >
                  ✕ Dismiss
                </button>
              </div>

              <div className={styles.cancelledAlertBody}>
                <div className={styles.cancelledAlertIcon}>⚠️</div>
                <div className={styles.cancelledAlertContent}>
                  <h4>Passenger Cancelled This Ride Request</h4>
                  <p className={styles.cancelledAlertText}>
                    {typeof cancelledNotice === "string" ? cancelledNotice : cancelledNotice.message}
                  </p>
                  {cancelledNotice.pickup && cancelledNotice.dropoff && (
                    <div className={styles.cancelledRouteTag}>
                      <span>📍 Pickup: <strong>{cancelledNotice.pickup}</strong></span>
                      <span>→</span>
                      <span>🏁 Dropoff: <strong>{cancelledNotice.dropoff}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.cancelledAlertFooter}>
                <div className={styles.scanningRadarBadge}>
                  <span className={styles.radarWave} />
                  <span>Radar Active: Scanning 1–2 km dispatch zone for new pickup requests...</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCancelledNotice(null);
                    loadData();
                  }}
                  className={styles.checkNewRequestsBtn}
                >
                  ⚡ Check New Requests ({availableRides.length} Available)
                </button>
              </div>
            </div>
          )}

          {/* Trip Completed & Payment Settled Receipt */}
          {settledReceipt && (
            <div className={styles.settledReceiptCard} role="status">
              <div className={styles.receiptCheckCircle}>✓</div>
              <span style={{ background: "rgba(16, 185, 129, 0.2)", border: "1px solid #10b981", color: "#10b981", fontWeight: 800, fontSize: 11, padding: "3px 12px", borderRadius: 999, textTransform: "uppercase", letterSpacing: 0.5 }}>
                ● PAYMENT DONE &amp; RECEIVED
              </span>
              <h3 style={{ margin: "4px 0" }}>Payment Received &amp; Ride Completed!</h3>
              <div className={styles.receiptAmountTag}>
                ₹{settledReceipt.fare}
                <small style={{ fontSize: 13, color: "#10b981", display: "block", marginTop: 4, fontWeight: 800 }}>
                  ✓ PAID VIA UPI SOUNDBOX
                </small>
              </div>
              <p>
                Payment verified via <strong>{settledReceipt.method}</strong> at {settledReceipt.timestamp}.
                Dropoff at <strong>{settledReceipt.dropoff}</strong> is complete.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSettledReceipt(null);
                  loadData();
                }}
                className={styles.finishScanBtn}
              >
                ✓ Finish &amp; Check New Requests ({availableRides.length} Available)
              </button>
            </div>
          )}

          {/* Destination Reached & Payment Settlement Card */}
          {activeRide && destinationReached && (
            <section className={styles.destinationReachedCard}>
              <div className={styles.destinationHeader}>
                <div className={styles.destinationBadgeRow}>
                  <span className={styles.destinationBadge}>
                    📍 Destination Reached
                  </span>
                  <span className={styles.destinationVoiceCue}>
                    📢 Arrived at Destination · Collect Fare
                  </span>
                </div>
                <div className={styles.destinationFareLarge}>
                  Fare: ₹{Number(activeRide.estimated_fare).toFixed(2)}
                </div>
              </div>

              {activeRide.payment_status === "paid" && (
                <div style={{ background: "rgba(16, 185, 129, 0.18)", border: "1.5px solid #10b981", borderRadius: 12, padding: "14px 18px", color: "#10b981", fontWeight: 850, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>✓</span>
                    <span>PAYMENT RECEIVED! ₹{Number(activeRide.estimated_fare).toFixed(2)} received via UPI</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSettlePayment("upi_qr")}
                    style={{ background: "#10b981", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: 999, fontWeight: 800, cursor: "pointer" }}
                  >
                    Finish Ride →
                  </button>
                </div>
              )}

              <div className={styles.announcementBanner}>
                <span style={{ fontSize: 22 }}>🏁</span>
                <span>
                  You have arrived at <strong>{activeRide.dropoff_address}</strong>. Please collect payment from the passenger and confirm below.
                </span>
              </div>

              <div className={styles.settlementGrid}>
                {/* Left Column: Route & Payment Actions */}
                <div className={styles.settlementLeftCol}>
                  <div className={styles.settlementRouteCard}>
                    <div className={styles.settlementRouteItem}>
                      <strong>Dropoff Destination</strong>
                      <span>{activeRide.dropoff_address}</span>
                    </div>
                    <div className={styles.settlementRouteItem}>
                      <strong>Pickup Origin</strong>
                      <span>{activeRide.pickup_address}</span>
                    </div>
                    <div className={styles.passengerContactRow}>
                      <span className={styles.passengerContactInfo}>
                        Passenger: <strong>{activeRide.passenger_name || "Verified Passenger"}</strong>
                      </span>
                      {activeRide.passenger_phone && (
                        <a
                          href={`tel:${activeRide.passenger_phone}`}
                          style={{
                            color: "#10b981",
                            fontWeight: 750,
                            textDecoration: "none",
                            fontSize: 13,
                          }}
                        >
                          📞 Call Passenger
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Payment Confirmation Options */}
                  <div className={styles.paymentActionsBlock}>
                    <div className={styles.paymentActionsTitle}>
                      Choose Passenger Payment Method:
                    </div>

                    {/* Option 1: Cash */}
                    <button
                      type="button"
                      onClick={() => handleSettlePayment("cash")}
                      disabled={settlingPayment}
                      className={styles.cashPayBtn}
                    >
                      <span>💵 Passenger Paid Off Cash</span>
                      <span>₹{Number(activeRide.estimated_fare).toFixed(2)} →</span>
                    </button>

                    {/* Option 2: UPI QR */}
                    <button
                      type="button"
                      onClick={() => handleSettlePayment("upi_qr")}
                      disabled={settlingPayment}
                      className={styles.upiPayBtn}
                    >
                      <span>📲 Payment Received via UPI QR</span>
                      <span>₹{Number(activeRide.estimated_fare).toFixed(2)} →</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDestinationReached(false)}
                      disabled={settlingPayment}
                      className={styles.resumeNavBtn}
                    >
                      ↩ Resume In-Progress Trip
                    </button>
                  </div>
                </div>

                {/* Right Column: Dynamic Driver UPI QR Code */}
                <div className={styles.settlementQrCard}>
                  <h4 className={styles.qrHeaderTitle}>
                    📲 Passenger UPI QR Code
                  </h4>
                  <p className={styles.qrHeaderSub}>
                    Ask passenger to scan with Google Pay, PhonePe, Paytm, or BHIM
                  </p>

                  <div className={styles.qrFrame}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                        `upi://pay?pa=${encodeURIComponent(
                          user?.upi_id || "cabgo.driver@okhdfcbank"
                        )}&pn=${encodeURIComponent(
                          user?.full_name || "CabGo Driver"
                        )}&am=${Number(activeRide.estimated_fare).toFixed(
                          2
                        )}&cu=INR&tn=${encodeURIComponent(
                          `CabGo Fare #${activeRide.id ? activeRide.id.slice(0, 8) : "TRIP"}`
                        )}`
                      )}&margin=8`}
                      alt="Driver Partner UPI QR Code"
                      className={styles.qrImage}
                    />
                  </div>

                  <div className={styles.driverUpiInfoBox}>
                    <span>
                      UPI: <strong>{user?.upi_id || "cabgo.driver@okhdfcbank"}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(user?.upi_id || "cabgo.driver@okhdfcbank");
                          setCopyUpiSuccess(true);
                          setTimeout(() => setCopyUpiSuccess(false), 2000);
                        }
                      }}
                      className={styles.copyUpiBtn}
                    >
                      {copyUpiSuccess ? "✓ Copied" : "📋 Copy"}
                    </button>
                  </div>

                  <div className={styles.soundboxListenerBadge}>
                    <span className={styles.soundboxWaveDot} style={!voiceEnabled ? { background: "#94a3b8" } : {}} />
                    <span>{voiceEnabled ? "Live Soundbox Active · Listening for UPI payment..." : "Soundbox Muted (Voice OFF)"}</span>
                    <button
                      type="button"
                      onClick={toggleVoice}
                      style={{
                        marginLeft: "auto",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        color: voiceEnabled ? "#10b981" : "#f87171",
                        borderRadius: 6,
                        padding: "3px 9px",
                        fontSize: 11,
                        cursor: "pointer",
                        fontWeight: 750,
                      }}
                      title={voiceEnabled ? "Click to mute voice & chimes" : "Click to unmute voice & chimes"}
                    >
                      {voiceEnabled ? "🔊 Mute" : "🔇 Unmute"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSimulatePassengerQrPayment}
                    disabled={settlingPayment}
                    className={styles.simulateQrBtn}
                    title="Test instant payment receipt voice & soundbox chime"
                  >
                    ⚡ Simulate Passenger Scan &amp; Pay (Test Soundbox)
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Active Trip Console (When NOT in Destination Reached view) */}
          {activeRide && !destinationReached && (
            <section className={styles.activeTripSection}>
              <div className={styles.activeTripCard}>
                <div className={styles.activeHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className={styles.activeBadge}>Active Journey</span>
                    <StatusBadge status={activeRide.status} />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 850, color: "#f4c401" }}>
                    Fare: ₹{Number(activeRide.estimated_fare).toFixed(2)}
                  </div>
                </div>

                <div className={styles.progressionGrid}>
                  <div className={styles.routeBox}>
                    <div className={styles.routeBoxItem}>
                      <strong>Pickup Address</strong>
                      <span>{activeRide.pickup_address}</span>
                    </div>
                    <div className={styles.routeBoxItem}>
                      <strong>Dropoff Destination</strong>
                      <span>{activeRide.dropoff_address}</span>
                    </div>
                  </div>

                  {activeRide.status === "in_progress" && (
                    <div className={styles.driverPaymentCollectionNotice}>
                      <span>💳 Payment Note: Passenger will pay via Cash or UPI QR ({user?.upi_id || "cabgo.driver@upi"}) for ₹{Number(activeRide.estimated_fare).toFixed(2)} upon arrival.</span>
                    </div>
                  )}

                  {/* Status Progression Controls */}
                  <div>
                    <strong style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" }}>
                      Journey Progression Steps:
                    </strong>
                    <div className={styles.stepActions}>
                      {activeRide.status === "accepted" && (
                        <button
                          type="button"
                          onClick={() => handleProgressStatus("arriving")}
                          className={`${styles.stepBtn} ${styles.stepBtnNext}`}
                          disabled={actionLoading}
                        >
                          🚗 Mark as &ldquo;Arriving at Pickup&rdquo; →
                        </button>
                      )}

                      {activeRide.status === "arriving" && (
                        <button
                          type="button"
                          onClick={() => handleProgressStatus("in_progress")}
                          className={`${styles.stepBtn} ${styles.stepBtnNext}`}
                          disabled={actionLoading}
                        >
                          🟢 Passenger Boarded — Enter OTP & Start Trip →
                        </button>
                      )}

                      {activeRide.status === "in_progress" && (
                        <button
                          type="button"
                          onClick={() => handleProgressStatus("completed")}
                          className={`${styles.stepBtn} ${styles.stepBtnNext}`}
                          style={{ background: "#10b981", color: "#000" }}
                          disabled={actionLoading}
                        >
                          🏁 Reached Destination — Collect Fare & Settle →
                        </button>
                      )}

                      {/* Option for Driver to Cancel Ride */}
                      <button
                        type="button"
                        onClick={() => setShowCancelModal(true)}
                        className={styles.driverCancelRideBtn}
                        disabled={actionLoading}
                        title="Cancel this trip (e.g. passenger no-show, vehicle issue)"
                      >
                        ✕ Cancel Ride
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* OTP Verification Modal */}
              {showOtpModal && (
                <div
                  className={styles.otpModalOverlay}
                  onClick={() => !actionLoading && setShowOtpModal(false)}
                >
                  <div className={styles.otpModalCard} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.otpModalHeader}>
                      <h3>Enter 4-Digit Passenger Ride OTP</h3>
                      <button
                        type="button"
                        className={styles.otpCloseBtn}
                        onClick={() => setShowOtpModal(false)}
                        disabled={actionLoading}
                      >
                        ✕
                      </button>
                    </div>

                    <p className={styles.otpPrompt}>
                      Ask the passenger for the 4-digit OTP shown on their screen. The trip will only start once the correct OTP is entered.
                    </p>

                    <form
                      onSubmit={handleVerifyOtpAndStart}
                      style={{ display: "flex", flexDirection: "column", gap: 14 }}
                    >
                      <input
                        type="text"
                        maxLength={4}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        autoFocus
                        placeholder="••••"
                        value={inputOtp}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                          setInputOtp(val);
                          if (otpError) setOtpError("");
                        }}
                        className={styles.otpInputField}
                      />

                      {otpError && (
                        <div className={styles.otpErrorMsg}>
                          ⚠️ {otpError}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => setShowOtpModal(false)}
                          className={styles.stepBtn}
                          style={{ flex: 1, justifyContent: "center" }}
                          disabled={actionLoading}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className={styles.verifyStartBtn}
                          style={{
                            flex: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                          }}
                          disabled={actionLoading || inputOtp.length !== 4}
                        >
                          {actionLoading ? "Verifying OTP..." : "✓ Verify & Start Trip"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Driver Cancel Ride Modal */}
              {showCancelModal && (
                <div
                  className={styles.cancelModalOverlay}
                  onClick={() => !actionLoading && setShowCancelModal(false)}
                >
                  <div className={styles.cancelModalCard} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.cancelModalHeader}>
                      <h3>Cancel Active Ride</h3>
                      <button
                        type="button"
                        className={styles.cancelCloseBtn}
                        onClick={() => setShowCancelModal(false)}
                        disabled={actionLoading}
                      >
                        ✕
                      </button>
                    </div>

                    <p className={styles.cancelPrompt}>
                      Please choose a cancellation reason. The passenger will be notified immediately and your console will resume scanning for nearby requests.
                    </p>

                    <div className={styles.reasonsList}>
                      {[
                        { id: "passenger_no_show", label: "Passenger no-show / Unreachable" },
                        { id: "breakdown", label: "Vehicle issue / Flat tire / Breakdown" },
                        { id: "traffic", label: "Severe traffic gridlock / Cannot reach pickup" },
                        { id: "rider_request", label: "Passenger requested cancellation" },
                        { id: "emergency", label: "Personal emergency" },
                        { id: "other", label: "Other reason" },
                      ].map((opt) => (
                        <label
                          key={opt.id}
                          className={`${styles.reasonOption} ${cancelReason === opt.id ? styles.reasonOptionActive : ""}`}
                        >
                          <input
                            type="radio"
                            name="cancelReason"
                            value={opt.id}
                            checked={cancelReason === opt.id}
                            onChange={() => setCancelReason(opt.id)}
                            className={styles.reasonRadio}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>

                    {cancelReason === "other" && (
                      <input
                        type="text"
                        placeholder="Please describe cancellation reason..."
                        value={customCancelReason}
                        onChange={(e) => setCustomCancelReason(e.target.value)}
                        className={styles.customReasonInput}
                        maxLength={100}
                        autoFocus
                      />
                    )}

                    <div className={styles.cancelModalActions}>
                      <button
                        type="button"
                        onClick={() => setShowCancelModal(false)}
                        className={styles.keepRideBtn}
                        disabled={actionLoading}
                      >
                        Keep Trip
                      </button>
                      <button
                        type="button"
                        onClick={handleDriverCancelRide}
                        className={styles.confirmCancelBtn}
                        disabled={actionLoading}
                      >
                        {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Available Rides Waiting For Driver */}
          <section>
            <div className={styles.sectionTitle}>
              <span>Available Ride Requests ({availableRides.length})</span>
            </div>

            {loading ? (
              <LoadingSpinner message="Scanning for passenger requests within 2 km..." />
            ) : availableRides.length === 0 ? (
              <EmptyState
                icon="📡"
                title="No Pending Ride Requests in 2 km Radius"
                description="Only passenger pickup requests within your 1-2 km dispatch zone will appear here. As soon as a passenger near you books, it will appear instantly."
              />
            ) : (
              <div className={styles.ridesGrid}>
                {availableRides.map((ride) => (
                  <div key={ride.id} className={styles.availableCard}>
                    <div className={styles.routeCol}>
                      <div className={styles.pointRow}>
                        <span className={styles.pickupDot} />
                        <div className={styles.locText}>
                          <strong>
                            Pickup {ride.distance_km !== undefined && ride.distance_km !== null ? `· 📍 ${ride.distance_km} km away (Inside 2 km dispatch)` : "· 📍 Within 2 km"}
                          </strong>
                          <span>{ride.pickup_address}</span>
                        </div>
                      </div>

                      <div className={styles.pointRow}>
                        <span className={styles.dropDot} />
                        <div className={styles.locText}>
                          <strong>Destination</strong>
                          <span>{ride.dropoff_address}</span>
                        </div>
                      </div>

                      <div style={{ fontSize: 11, color: "#6b7280" }}>
                        Requested:{" "}
                        {ride.created_at
                          ? new Date(ride.created_at).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Recently"}
                      </div>
                    </div>

                    <div className={styles.actionCol}>
                      <div className={styles.fareLarge}>
                        ₹{Number(ride.estimated_fare).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAcceptRide(ride)}
                        disabled={actionLoading || Boolean(activeRide)}
                        className={styles.acceptBtn}
                        title={
                          activeRide
                            ? "Complete your current active ride before accepting another."
                            : "Accept and claim this ride."
                        }
                      >
                        {actionLoading ? "Claiming..." : "Accept Ride →"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </AuthGuard>

      <Footer />
    </div>
  );
}
