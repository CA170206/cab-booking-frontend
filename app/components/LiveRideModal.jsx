"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { ridesApi, paymentApi } from "../lib/api";
import StatusBadge from "./StatusBadge";
import styles from "./LiveRideModal.module.css";

// Dynamically import Leaflet components for client-side live tracking
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((mod) => mod.Tooltip),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);

const RATING_DESCRIPTIONS = {
  1: "Poor experience",
  2: "Below expectations",
  3: "Average trip",
  4: "Very good ride",
  5: "Exceptional service! ⭐",
};

const DEFAULT_FEEDBACK_TAGS = [
  "Smooth Driving",
  "Clean Cab",
  "Polite Driver",
  "Followed Safe Route",
  "On Time",
  "Great AC",
];

export default function LiveRideModal({ ride, onClose, onRideUpdated }) {
  const [rideData, setRideData] = useState(ride);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [otpNotice, setOtpNotice] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Rating state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState(["Smooth Driving", "Clean Cab"]);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(Boolean(ride?.rating));

  // Payment state
  const [paymentConfirmed, setPaymentConfirmed] = useState(
    ride?.payment_status === "paid"
  );

  // Icons state
  const [leafletIcons, setLeafletIcons] = useState({
    pickup: null,
    dropoff: null,
    driver: null,
    nearbyCab: null,
  });

  // Current status & strictly verify if driver has actually accepted the ride
  const currentStatus = rideData?.status || "requested";
  const isDriverAssigned = Boolean(
    rideData?.driver_id &&
    ["accepted", "arriving", "in_progress", "completed"].includes(currentStatus)
  );

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

  // Audio tone chime when payment succeeds
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

  const speakPaymentSuccess = (fare) => {
    if (!voiceEnabled) return;
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const text = `Payment received. ${Number(fare).toFixed(0)} rupees received via UPI.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {}
  };

  // Fetch single ride details & poll for live updates
  const fetchRideStatus = useCallback(async () => {
    if (!rideData?.id) return;
    try {
      const res = await ridesApi.getRideDetails(rideData.id);
      if (res?.success && res.ride) {
        setRideData(res.ride);
        onRideUpdated?.(res.ride);
        if (res.ride.payment_status === "paid" && !paymentConfirmed) {
          setPaymentConfirmed(true);
          playPaymentSuccessChime();
          speakPaymentSuccess(res.ride.estimated_fare);
        }
        if (res.ride.rating) {
          setRatingSubmitted(true);
        }
      }
    } catch (e) {
      // Ignore polling network blips
    }
  }, [rideData?.id, paymentConfirmed, onRideUpdated]);

  useEffect(() => {
    setRideData(ride);
    if (ride?.payment_status === "paid") {
      setPaymentConfirmed(true);
    }
  }, [ride]);

  useEffect(() => {
    if (!rideData?.id) return;
    if (currentStatus === "cancelled") return;
    // Continue polling when completed until payment is confirmed/paid!
    if (currentStatus === "completed" && (rideData?.payment_status === "paid" || paymentConfirmed)) return;

    fetchRideStatus();
    // Poll every 2 seconds to detect driver acceptance, movements, and payment completion
    const interval = setInterval(fetchRideStatus, 2000);
    return () => clearInterval(interval);
  }, [rideData?.id, currentStatus, rideData?.payment_status, paymentConfirmed, fetchRideStatus]);

  // Initialize custom Leaflet icons on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    import("leaflet").then((L) => {
      // Custom Pickup Pin
      const pickupIcon = new L.DivIcon({
        className: "cabgo-custom-div-icon",
        html: `
          <div style="position:relative; width:34px; height:44px; display:flex; align-items:center; justify-content:center;">
            <svg width="34" height="44" viewBox="0 0 34 44" fill="none">
              <path d="M17 44 C 13.5 34 3.5 24 3.5 15.5 A 13.5 13.5 0 1 1 30.5 15.5 C 30.5 24 20.5 34 17 44 Z" fill="#16a34a" stroke="#fff" stroke-width="2"/>
              <circle cx="17" cy="15.5" r="5.5" fill="#fff"/>
              <circle cx="17" cy="15.5" r="3" fill="#16a34a"/>
            </svg>
          </div>
        `,
        iconSize: [34, 44],
        iconAnchor: [17, 44],
      });

      // Custom Dropoff Pin
      const dropoffIcon = new L.DivIcon({
        className: "cabgo-custom-div-icon",
        html: `
          <div style="position:relative; width:34px; height:44px; display:flex; align-items:center; justify-content:center;">
            <svg width="34" height="44" viewBox="0 0 34 44" fill="none">
              <path d="M17 44 C 13.5 34 3.5 24 3.5 15.5 A 13.5 13.5 0 1 1 30.5 15.5 C 30.5 24 20.5 34 17 44 Z" fill="#dc2626" stroke="#fff" stroke-width="2"/>
              <circle cx="17" cy="15.5" r="7" fill="#fff"/>
              <path d="M14 19.5V11.5h1.2v1h4.6l-.8 2 0.8 2H15.2v3H14z" fill="#dc2626"/>
            </svg>
          </div>
        `,
        iconSize: [34, 44],
        iconAnchor: [17, 44],
      });

      // Assigned Driver Car Marker
      const driverIcon = new L.DivIcon({
        className: "cabgo-custom-div-icon",
        html: `
          <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:40px; height:40px; border-radius:50%; background:rgba(244,196,1,0.25); animation:cabgoPulse 2s infinite ease-out;"></div>
            <div style="width:34px; height:34px; border-radius:50%; background:#0f172a; border:2.5px solid #f4c401; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.4); font-size:18px;">
              🚖
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      // Nearby Available Patrolling Cab Marker (within 1-2 km)
      const nearbyCabIcon = new L.DivIcon({
        className: "cabgo-custom-div-icon",
        html: `
          <div style="position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:34px; height:34px; border-radius:50%; background:rgba(16,185,129,0.2); animation:cabgoPulse 2.5s infinite;"></div>
            <div style="width:28px; height:28px; border-radius:50%; background:#1e293b; border:1.8px solid #10b981; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.3); font-size:14px;">
              🚕
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      setLeafletIcons({
        pickup: pickupIcon,
        dropoff: dropoffIcon,
        driver: driverIcon,
        nearbyCab: nearbyCabIcon,
      });
    });
  }, []);

  // Coordinates
  const pickupCoords = [
    Number(rideData?.pickup_lat) || 20.011,
    Number(rideData?.pickup_lng) || 73.79,
  ];
  const dropoffCoords = [
    Number(rideData?.dropoff_lat) || 19.9975,
    Number(rideData?.dropoff_lng) || 73.7898,
  ];

  // Assigned driver coordinates (only used once driver has accepted)
  const driverCoords = useMemo(() => {
    if (!isDriverAssigned) return pickupCoords;
    if (rideData?.driver_lat && rideData?.driver_lng) {
      return [Number(rideData.driver_lat), Number(rideData.driver_lng)];
    }
    if (currentStatus === "arriving") {
      return [pickupCoords[0] + 0.0015, pickupCoords[1] - 0.002];
    }
    if (currentStatus === "in_progress") {
      return [
        (pickupCoords[0] + dropoffCoords[0]) / 2,
        (pickupCoords[1] + dropoffCoords[1]) / 2,
      ];
    }
    return [pickupCoords[0] + 0.006, pickupCoords[1] - 0.005];
  }, [rideData?.driver_lat, rideData?.driver_lng, currentStatus, pickupCoords, dropoffCoords, isDriverAssigned]);

  // Nearby available roaming cabs strictly within 1-2 km radius of pickup
  const nearbyAvailableDrivers = useMemo(() => {
    if (!pickupCoords) return [];
    return [
      { id: "cab-1", pos: [pickupCoords[0] + 0.006, pickupCoords[1] + 0.005], dist: "0.8 km" },
      { id: "cab-2", pos: [pickupCoords[0] - 0.007, pickupCoords[1] - 0.006], dist: "1.1 km" },
      { id: "cab-3", pos: [pickupCoords[0] + 0.005, pickupCoords[1] - 0.008], dist: "1.3 km" },
    ];
  }, [pickupCoords]);

  // ETA Calculation
  const etaMinutes = useMemo(() => {
    if (rideData?.driver_eta_minutes !== undefined && rideData?.driver_eta_minutes !== null) {
      return rideData.driver_eta_minutes;
    }
    if (currentStatus === "accepted") return 4;
    if (currentStatus === "arriving") return 1;
    if (currentStatus === "in_progress") return 12;
    return 0;
  }, [rideData?.driver_eta_minutes, currentStatus]);

  // 4-Digit OTP
  const otpDigits = useMemo(() => {
    const code = String(rideData?.otp_code || "4829").padStart(4, "0");
    return code.slice(0, 4).split("");
  }, [rideData?.otp_code]);

  // Driver details (Only populated from DB when driver has actually accepted!)
  const driverName = isDriverAssigned ? (rideData?.driver_name || "Assigned Driver Partner") : "";
  const driverPhone = isDriverAssigned ? (rideData?.driver_phone || "+91 98230 12345") : "";
  const driverVehicle = isDriverAssigned ? (rideData?.driver_vehicle_model || "CabGo Verified Vehicle") : "";
  const driverNumber = isDriverAssigned ? (rideData?.driver_vehicle_number || "MH 15 AB 1234") : "";
  const driverUpiId = isDriverAssigned ? (rideData?.driver_upi_id || "cabgo.driver@okhdfcbank") : "cabgo.driver@okhdfcbank";
  const driverRatingVal = isDriverAssigned ? Number(rideData?.driver_rating || 4.9).toFixed(1) : "5.0";

  // Dynamic UPI Payment Link & QR
  const fareAmount = Number(rideData?.estimated_fare || 120).toFixed(2);
  const upiPayUri = `upi://pay?pa=${encodeURIComponent(driverUpiId)}&pn=${encodeURIComponent(driverName || "CabGo Driver")}&am=${fareAmount}&cu=INR&tn=${encodeURIComponent(`CabGo Ride Fare #${rideData?.id ? rideData.id.slice(0, 8) : "TRIP"}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiPayUri)}&margin=8`;

  // Itemized Fare Breakdown
  const baseFare = 40.0;
  const totalFare = Number(rideData?.estimated_fare || 60);
  const gstAmount = Number((totalFare * 0.05).toFixed(2));
  const distanceFare = Number(Math.max(0, totalFare - baseFare - gstAmount).toFixed(2));

  // Cancel ride action
  const handleCancelRide = async () => {
    if (!rideData?.id || cancelling) return;
    if (!confirm("Are you sure you want to cancel this ride request?")) return;
    setCancelling(true);
    try {
      const res = await ridesApi.cancelRide(rideData.id);
      if (res?.success) {
        setRideData((prev) => ({ ...prev, status: "cancelled" }));
        onRideUpdated?.({ ...rideData, status: "cancelled" });
        setTimeout(() => onClose?.(), 800);
      }
    } catch (err) {
      alert(err.message || "Failed to cancel ride.");
    } finally {
      setCancelling(false);
    }
  };

  // Resend OTP action
  const handleResendOtp = async () => {
    if (!rideData?.id || resendingOtp) return;
    setResendingOtp(true);
    setOtpNotice("");
    try {
      const res = await ridesApi.resendOtp(rideData.id);
      if (res?.success && res.otp_code) {
        setRideData((prev) => ({ ...prev, otp_code: res.otp_code }));
        setOtpNotice("✅ New OTP generated! Share this with your driver.");
      }
    } catch (err) {
      setOtpNotice(err.message || "Failed to resend OTP.");
    } finally {
      setResendingOtp(false);
    }
  };

  // Copy UPI ID action
  const handleCopyUpi = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(driverUpiId);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  const [confirmingQr, setConfirmingQr] = useState(false);
  const [qrPaidNotice, setQrPaidNotice] = useState("");

  // Passenger confirms they scanned & paid via UPI QR
  const handlePassengerConfirmQrPaid = async () => {
    if (!rideData?.id || confirmingQr) return;
    try {
      setConfirmingQr(true);
      const fare = rideData.estimated_fare;
      const res = await paymentApi.confirmQrPayment(rideData.id, fare);
      if (res?.success) {
        setPaymentConfirmed(true);
        setRideData((prev) => ({ ...prev, payment_status: "paid", status: "completed" }));
        playPaymentSuccessChime();
        speakPaymentSuccess(fare);
        setQrPaidNotice(`✓ Payment of ₹${Number(fare).toFixed(2)} verified! Driver partner soundbox has confirmed receipt.`);
        fetchRideStatus();
      }
    } catch (err) {
      alert(err.message || "Unable to confirm payment.");
    } finally {
      setConfirmingQr(false);
    }
  };

  // Toggle feedback tags
  const handleTagToggle = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Submit Driver Rating
  const handleSubmitRating = async () => {
    if (!rideData?.id || submittingRating) return;
    setSubmittingRating(true);
    try {
      const res = await ridesApi.rateRide(rideData.id, {
        rating,
        feedback_tags: selectedTags,
        review_comment: reviewComment,
      });
      if (res?.success) {
        setRatingSubmitted(true);
        onRideUpdated?.({ ...rideData, rating });
      }
    } catch (err) {
      alert(err.message || "Failed to submit rating.");
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Top Navigation Bar */}
        <div className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <div
              className={`${styles.statusPill} ${
                currentStatus === "completed"
                  ? styles.statusPillCompleted
                  : isDriverAssigned
                  ? styles.statusPillAssigned
                  : styles.statusPillSearching
              }`}
            >
              <span className={styles.statusPulseDot} />
              <span>
                {currentStatus === "completed"
                  ? "Trip Completed"
                  : currentStatus === "in_progress"
                  ? "Trip In Progress"
                  : currentStatus === "arriving"
                  ? "Driver Arriving"
                  : isDriverAssigned
                  ? "Driver Assigned"
                  : "Scanning Nearby Drivers (1-2 km)"}
              </span>
            </div>
            <StatusBadge status={isDriverAssigned ? currentStatus : "requested"} />
            <span className={styles.rideIdTag}>
              #{rideData?.id ? rideData.id.slice(0, 8) : ""}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={toggleVoice}
              className={styles.closeBtn}
              style={{
                fontSize: 14,
                width: 36,
                height: 36,
                padding: 0,
                color: voiceEnabled ? "#10b981" : "#94a3b8",
                borderColor: voiceEnabled ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title={voiceEnabled ? "Voice & audio: ON (tap to mute)" : "Voice & audio: OFF (tap to unmute)"}
              aria-label="Toggle voice announcements"
            >
              {voiceEnabled ? "🔊" : "🔇"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className={styles.closeBtn}
              title="Close view"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className={styles.modalScrollable}>
          {/* 1. Large 340px Hero Map */}
          <div className={styles.mapHeroBox}>
            {typeof window !== "undefined" && (
              <MapContainer
                center={isDriverAssigned ? driverCoords : pickupCoords}
                zoom={14}
                zoomControl={false}
                attributionControl={false}
                className={styles.mapElement}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Pickup Marker (Rider Location) */}
                {leafletIcons.pickup && (
                  <Marker position={pickupCoords} icon={leafletIcons.pickup}>
                    <Tooltip permanent direction="top" offset={[0, -44]}>
                      Pickup (You)
                    </Tooltip>
                  </Marker>
                )}

                {/* Dropoff Marker */}
                {leafletIcons.dropoff && (
                  <Marker position={dropoffCoords} icon={leafletIcons.dropoff}>
                    <Tooltip permanent direction="top" offset={[0, -44]}>
                      Destination
                    </Tooltip>
                  </Marker>
                )}

                {/* 1.5 km Dispatch Radius Circle around Rider */}
                <Circle
                  center={pickupCoords}
                  radius={1500}
                  pathOptions={{
                    color: "#f4c401",
                    fillColor: "#f4c401",
                    fillOpacity: 0.08,
                    weight: 1.8,
                    dashArray: "6, 6",
                  }}
                />

                {/* When searching: show nearby active cabs strictly within 1-2 km radius */}
                {!isDriverAssigned &&
                  leafletIcons.nearbyCab &&
                  nearbyAvailableDrivers.map((cab) => (
                    <Marker key={cab.id} position={cab.pos} icon={leafletIcons.nearbyCab}>
                      <Tooltip permanent={false} direction="top" offset={[0, -18]}>
                        Available Driver ({cab.dist} away · within 1.5 km)
                      </Tooltip>
                    </Marker>
                  ))}

                {/* When driver is accepted: Live Assigned Driver Car Marker */}
                {isDriverAssigned && leafletIcons.driver && (
                  <Marker position={driverCoords} icon={leafletIcons.driver}>
                    <Tooltip permanent direction="top" offset={[0, -22]}>
                      Driver: {driverName.split(" ")[0]}
                    </Tooltip>
                  </Marker>
                )}

                {/* When driver is accepted: Route Polyline */}
                {isDriverAssigned && (
                  <Polyline
                    positions={
                      currentStatus === "in_progress"
                        ? [pickupCoords, dropoffCoords]
                        : [driverCoords, pickupCoords]
                    }
                    pathOptions={{
                      color: "#16a34a",
                      weight: 4,
                      dashArray: "6, 6",
                      opacity: 0.85,
                    }}
                  />
                )}
              </MapContainer>
            )}

            <div className={styles.mapRadarBadge}>
              <span>🚗 Live Radar:</span>
              <strong>
                {!isDriverAssigned
                  ? "Broadcasting within 1-2 km radius"
                  : currentStatus === "completed"
                  ? "Arrived at destination"
                  : currentStatus === "in_progress"
                  ? "Heading to destination"
                  : `Driver is ${etaMinutes} mins away`}
              </strong>
            </div>
          </div>

          {/* Sweeping Linear Progress Bar when searching */}
          {!isDriverAssigned && (
            <div className={styles.searchProgressBar}>
              <div className={styles.searchProgressSweep} />
            </div>
          )}

          {/* Bottom Sheet Content */}
          <div className={styles.sheetContent}>
            {/* If searching: Clean, spacious search status header */}
            {!isDriverAssigned ? (
              <div className={styles.searchHeader}>
                <h3>Broadcasting to Drivers Nearby</h3>
                <p>
                  Your trip request has been dispatched to active driver partners strictly within <strong>1–2 km</strong> of your pickup.
                  Trip details will display the moment a driver accepts.
                </p>
              </div>
            ) : (
              <>
                {/* Real Driver Profile Card */}
                <div className={styles.driverCard}>
                  <div className={styles.driverLeft}>
                    <div className={styles.driverAvatar}>
                      {driverName[0] || "D"}
                    </div>
                    <div className={styles.driverInfo}>
                      <h4>{driverName}</h4>
                      <div className={styles.driverMeta}>
                        <span className={styles.ratingBadge}>★ {driverRatingVal}</span>
                        <span className={styles.vehicleTag}>{driverVehicle}</span>
                        <span className={styles.vehicleTag}>{driverNumber}</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={`tel:${driverPhone}`}
                    className={styles.callBtn}
                    title={`Call ${driverName}`}
                  >
                    📞 Call Driver
                  </a>
                </div>

                {/* Live ETA Banner */}
                {!["completed", "cancelled"].includes(currentStatus) && (
                  <div className={styles.etaBanner}>
                    <div className={styles.etaText}>
                      <strong>
                        {currentStatus === "in_progress"
                          ? "Heading to Destination"
                          : currentStatus === "arriving"
                          ? "Driver Arriving at Pickup"
                          : "Driver Partner En Route"}
                      </strong>
                      <span>
                        {currentStatus === "in_progress"
                          ? `Estimated time remaining: ~${etaMinutes} mins`
                          : currentStatus === "arriving"
                          ? "Driver is at your pickup location"
                          : `Estimated arrival: ~${etaMinutes} mins`}
                      </span>
                    </div>
                    <div className={styles.farePreview}>
                      ₹{fareAmount}
                      <small>Estimated Fare</small>
                    </div>
                  </div>
                )}

                {/* Cancelled Trip Banner */}
                {currentStatus === "cancelled" && (
                  <div className={styles.rideCancelledBanner}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 28 }}>⚠️</span>
                      <div>
                        <strong style={{ display: "block", color: "#f87171", fontSize: 15, marginBottom: 2 }}>
                          This Ride Has Been Cancelled
                        </strong>
                        <span style={{ fontSize: 12.5, color: "#9ca3af" }}>
                          The trip was cancelled by the driver or dispatch. No fare has been charged.
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className={styles.closeCancelledBtn}
                    >
                      ✕ Close &amp; Book New Ride
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Start Ride PIN (Uber style, visible before trip begins) */}
            {["requested", "accepted", "arriving"].includes(currentStatus) && (
              <div className={styles.pinCard}>
                <div className={styles.pinHeader}>
                  <span className={styles.pinLabel}>🔐 Start Ride PIN</span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendingOtp}
                    className={styles.resendBtn}
                  >
                    {resendingOtp ? "Generating..." : "🔄 Resend OTP"}
                  </button>
                </div>

                <div className={styles.pinDigitsRow}>
                  {otpDigits.map((digit, idx) => (
                    <div key={idx} className={styles.pinBox}>
                      {digit}
                    </div>
                  ))}
                </div>

                <p className={styles.pinHint}>
                  {isDriverAssigned ? (
                    <>
                      Share this <strong>4-digit PIN</strong> with your driver when boarding.
                      The ride begins only when verified.
                    </>
                  ) : (
                    <>
                      Keep this <strong>4-digit PIN</strong> ready. Once your driver arrives,
                      share this code to start your trip.
                    </>
                  )}
                </p>

                {otpNotice && (
                  <div style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>
                    {otpNotice}
                  </div>
                )}
              </div>
            )}

            {/* Route Timeline Strip */}
            <div className={styles.routeStrip}>
              <div className={styles.routePoint}>
                <span className={styles.pickupDot} />
                <div className={styles.routeText}>
                  <strong>Pickup Location</strong>
                  <span>{rideData?.pickup_address}</span>
                </div>
              </div>
              <div className={styles.routePoint}>
                <span className={styles.dropoffSquare} />
                <div className={styles.routeText}>
                  <strong>Destination</strong>
                  <span>{rideData?.dropoff_address}</span>
                </div>
              </div>
            </div>

            {/* If searching or awaiting pickup: allow Rider to Cancel */}
            {!["completed", "cancelled"].includes(currentStatus) && (
              <div className={styles.actionRow}>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  {!isDriverAssigned ? "Dispatching to drivers..." : "Driver on the way"}
                </span>
                <button
                  type="button"
                  onClick={handleCancelRide}
                  disabled={cancelling}
                  className={styles.cancelRideBtn}
                >
                  {cancelling ? "Cancelling..." : "✕ Cancel Ride"}
                </button>
              </div>
            )}

            {/* Completed Ride: Itemized Bill, Driver UPI QR & 5-Star Rating */}
            {currentStatus === "completed" && (
              <>
                {/* Itemized Bill Breakdown */}
                <div className={styles.billCard}>
                  <div className={styles.billTitle}>
                    <span>🧾 Itemized Fare Bill</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      {new Date(rideData?.created_at || Date.now()).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <div className={styles.billRows}>
                    <div className={styles.billRow}>
                      <span>Base Ride Fare</span>
                      <span>₹{baseFare.toFixed(2)}</span>
                    </div>
                    <div className={styles.billRow}>
                      <span>Distance & Travel Charges</span>
                      <span>₹{distanceFare.toFixed(2)}</span>
                    </div>
                    <div className={styles.billRow}>
                      <span>Applicable GST (5%)</span>
                      <span>₹{gstAmount.toFixed(2)}</span>
                    </div>
                    <div className={styles.billRowTotal}>
                      <span>Total Fare Payable</span>
                      <span>₹{fareAmount}</span>
                    </div>
                  </div>
                </div>

                {/* Driver UPI Payment: When Paid, Show Prominent Celebration Card */}
                {paymentConfirmed || rideData?.payment_status === "paid" ? (
                  <div className={styles.paymentCompletedCard} role="status">
                    <div className={styles.paymentCompletedCheck}>✓</div>
                    <span className={styles.paymentCompletedTag}>● PAYMENT DONE &amp; RECEIVED</span>
                    <h3 className={styles.paymentCompletedTitle}>₹{fareAmount} Paid Successfully</h3>
                    <p className={styles.paymentCompletedSub}>
                      Your payment has been received via UPI and verified with driver partner <strong>{driverName}</strong>. Driver soundbox has confirmed receipt.
                    </p>
                    <div className={styles.paymentCompletedMeta}>
                      <div className={styles.paymentMetaItem}>
                        <span>Payment Status</span>
                        <strong style={{ color: "#10b981" }}>✓ PAID &amp; VERIFIED</strong>
                      </div>
                      <div className={styles.paymentMetaItem}>
                        <span>Driver Partner</span>
                        <strong>{driverName}</strong>
                      </div>
                      <div className={styles.paymentMetaItem}>
                        <span>Driver UPI ID</span>
                        <strong>{driverUpiId}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.upiCard}>
                    <h4 className={styles.upiTitle}>📲 Pay Driver Partner via UPI</h4>
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                      Scan with Google Pay, PhonePe, Paytm or BHIM
                    </p>

                    <div className={styles.qrContainer}>
                      <img
                        src={qrCodeUrl}
                        alt="Driver UPI QR Code"
                        className={styles.qrImg}
                      />
                    </div>

                    <div className={styles.upiIdBox}>
                      <span>UPI: <strong>{driverUpiId}</strong></span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className={styles.copyUpiBtn}
                      >
                        {copySuccess ? "✓ Copied" : "📋 Copy"}
                      </button>
                    </div>

                    <a
                      href={upiPayUri}
                      className={styles.upiAppBtn}
                    >
                      🚀 Open in UPI App
                    </a>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={handlePassengerConfirmQrPaid}
                        disabled={confirmingQr}
                        className={styles.upiAppBtn}
                        style={{
                          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          color: "#ffffff",
                          border: "none",
                          cursor: "pointer",
                          boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
                        }}
                      >
                        {confirmingQr ? "Notifying Driver Soundbox..." : `📲 I Have Scanned & Paid ₹${fareAmount} via UPI`}
                      </button>

                      <a
                        href={`/payment?rideId=${rideData?.id}`}
                        className={styles.upiAppBtn}
                        style={{
                          background: "linear-gradient(135deg, #f4c401 0%, #e5b300 100%)",
                          color: "#0f172a",
                          textDecoration: "none",
                          textAlign: "center",
                          fontWeight: 800,
                          fontSize: 13.5,
                          boxShadow: "0 4px 14px rgba(244, 196, 1, 0.25)"
                        }}
                      >
                        💳 Pay Now (Card, NetBanking, Gateway) →
                      </a>

                      {qrPaidNotice && (
                        <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", color: "#10b981", fontSize: 12, fontWeight: 750, textAlign: "center" }}>
                          {qrPaidNotice}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Rating Driver off 5 Stars */}
                <div className={styles.ratingCard}>
                  <div className={styles.ratingHeader}>
                    <h4>Rate your journey with {driverName.split(" ")[0] || "your driver"}</h4>
                    <p>How was your driving experience and overall trip comfort?</p>
                  </div>

                  {ratingSubmitted ? (
                    <div className={styles.ratingDoneBanner}>
                      ⭐ You rated this trip {rating} / 5 stars. Thank you for your feedback!
                    </div>
                  ) : (
                    <>
                      <div className={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                            className={`${styles.starBtn} ${
                              star <= (hoverRating || rating) ? styles.starBtnActive : ""
                            }`}
                            aria-label={`Rate ${star} star`}
                          >
                            ★
                          </button>
                        ))}
                      </div>

                      <div className={styles.ratingDescriptor}>
                        {RATING_DESCRIPTIONS[hoverRating || rating]}
                      </div>

                      {/* Feedback Tags */}
                      <div className={styles.tagsGrid}>
                        {DEFAULT_FEEDBACK_TAGS.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleTagToggle(tag)}
                            className={`${styles.tagChip} ${
                              selectedTags.includes(tag) ? styles.tagChipSelected : ""
                            }`}
                          >
                            {selectedTags.includes(tag) ? "✓ " : "+ "}
                            {tag}
                          </button>
                        ))}
                      </div>

                      <textarea
                        rows={2}
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Optional feedback for the driver partner..."
                        className={styles.commentInput}
                      />

                      <button
                        type="button"
                        onClick={handleSubmitRating}
                        disabled={submittingRating}
                        className={styles.submitRatingBtn}
                      >
                        {submittingRating ? "Submitting..." : `Submit ${rating}-Star Rating →`}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
