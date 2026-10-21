"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHeader from "../components/PageHeader";
import AuthGuard from "../components/AuthGuard";
import { LoadingSpinner, EmptyState, ErrorMessage } from "../components/UIFeedback";
import { paymentApi, ridesApi } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import styles from "./payment.module.css";

const POPULAR_BANKS = [
  { id: "sbi", name: "State Bank of India", icon: "🏛️" },
  { id: "hdfc", name: "HDFC Bank", icon: "🏦" },
  { id: "icici", name: "ICICI Bank", icon: "🏢" },
  { id: "axis", name: "Axis Bank", icon: "🏦" },
  { id: "kotak", name: "Kotak Mahindra", icon: "💳" },
  { id: "pnb", name: "Punjab National Bank", icon: "🏛️" },
];

function PaymentContent() {
  const searchParams = useSearchParams();
  const rideId = searchParams.get("rideId");

  const [ride, setRide] = useState(null);
  const [order, setOrder] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("card"); // "card" | "upi" | "netbanking" | "cash"
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Card Gateway state
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");

  // UPI Gateway state
  const [upiSubTab, setUpiSubTab] = useState("qr"); // "qr" | "vpa"
  const [userVpa, setUserVpa] = useState("");
  const [upiUtr, setUpiUtr] = useState("");
  const [scannedConfirmed, setScannedConfirmed] = useState(false);
  const [vpaRequestSent, setVpaRequestSent] = useState(false);
  const [vpaCountdown, setVpaCountdown] = useState(120);

  // Net Banking state
  const [selectedBank, setSelectedBank] = useState("hdfc");

  // Fetch ride details and create/retrieve payment order
  const initPayment = async () => {
    if (!rideId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      // 1. Check if ride is already paid
      try {
        const statusRes = await paymentApi.getStatus(rideId);
        if (statusRes?.success && statusRes.payment?.status === "paid") {
          setPaymentSuccess(statusRes.payment);
          setLoading(false);
          return;
        }
      } catch (statusErr) {
        // Not paid yet
      }

      // 2. Fetch ride info to ensure ownership and get driver details
      const ridesRes = await ridesApi.getMyRides();
      const currentRide = ridesRes?.rides?.find((r) => r.id === rideId);
      if (!currentRide) {
        throw new Error("Ride not found or does not belong to your account.");
      }
      setRide(currentRide);

      // Pre-fill cardholder name from user session
      const user = getStoredUser();
      if (user?.full_name) {
        setCardHolder(user.full_name);
      }

      // 3. Create or retrieve gateway order
      const orderRes = await paymentApi.createOrder(rideId);
      if (orderRes?.success && orderRes.order) {
        setOrder(orderRes.order);
        if (orderRes.ride) {
          setRide((prev) => ({ ...prev, ...orderRes.ride }));
        }
      } else {
        throw new Error(orderRes?.message || "Failed to create payment order.");
      }
    } catch (err) {
      if (err.status === 409 && err.data?.payment?.status === "paid") {
        setPaymentSuccess(err.data.payment);
      } else {
        setError(err.message || "Failed to initialize payment session.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Voice and sound effects toggle (persisted across sessions)
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ridego_voice_enabled") || localStorage.getItem("cabgo_voice_enabled");
      if (stored !== null) {
        setVoiceEnabled(stored === "true");
      }
    } catch (e) {}
  }, []);

  const toggleVoice = () => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ridego_voice_enabled", String(next));
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

  // Announce payment received
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

  useEffect(() => {
    initPayment();
  }, [rideId]);

  // Live polling every 2s: automatically detects if payment was completed
  useEffect(() => {
    if (!rideId || paymentSuccess) return;

    const interval = setInterval(async () => {
      try {
        const details = await ridesApi.getRideDetails(rideId);
        if (details?.success && details.ride?.payment_status === "paid") {
          playPaymentSuccessChime();
          speakPaymentSuccess(details.ride.estimated_fare);
          setPaymentSuccess({
            id: `PAY_${Date.now()}`,
            ride_id: rideId,
            amount: details.ride.estimated_fare,
            gateway_payment_id: `UPI_${details.ride.id.slice(0, 8).toUpperCase()}`,
            status: "paid",
            created_at: new Date().toISOString(),
          });
        }
      } catch (e) {}
    }, 2000);

    return () => clearInterval(interval);
  }, [rideId, paymentSuccess]);

  // VPA Request countdown timer
  useEffect(() => {
    if (!vpaRequestSent) return;
    if (vpaCountdown <= 0) return;
    const timer = setInterval(() => {
      setVpaCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [vpaRequestSent, vpaCountdown]);

  // Card Number formatting (adds space every 4 digits)
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})/g, "$1 ").trim();
    setCardNumber(formatted);
  };

  // Card Expiry formatting (MM/YY)
  const handleExpiryChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Card Brand Detection
  const cardBrand = useMemo(() => {
    const clean = cardNumber.replace(/\s/g, "");
    if (clean.startsWith("4")) return "VISA";
    if (clean.startsWith("5")) return "MASTERCARD";
    if (clean.startsWith("6") || clean.startsWith("8")) return "RUPAY";
    return "CARD";
  }, [cardNumber]);

  // Copy Driver UPI ID
  const handleCopyUpi = () => {
    const upi = ride?.driver_upi_id || "ridego.driver@okhdfcbank";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upi);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // 1. Submit Card Form -> Triggers 3D-Secure Bank OTP Modal
  const handleCardSubmit = (e) => {
    e.preventDefault();
    setError("");

    const cleanNumber = cardNumber.replace(/\s/g, "");
    if (cleanNumber.length !== 16) {
      setError("Please enter a valid 16-digit debit or credit card number.");
      return;
    }

    if (!cardHolder.trim()) {
      setError("Please enter the name printed on your card.");
      return;
    }

    if (!cardExpiry || cardExpiry.length !== 5 || !cardExpiry.includes("/")) {
      setError("Please enter a valid expiration date (MM/YY).");
      return;
    }

    const [mm, yy] = cardExpiry.split("/");
    const expMonth = parseInt(mm, 10);
    if (expMonth < 1 || expMonth > 12) {
      setError("Invalid card expiry month.");
      return;
    }

    if (!cardCvv || cardCvv.length < 3) {
      setError("Please enter the 3-digit CVV from the back of your card.");
      return;
    }

    // Input is valid -> Open Bank 3DS OTP modal
    setShowOtpModal(true);
    setOtpValue("");
    setOtpError("");
  };

  // 2. Authorize Bank OTP -> Complete Card Payment
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!otpValue || otpValue.trim().length !== 6) {
      setOtpError("Please enter the 6-digit Bank OTP code.");
      return;
    }

    setPaying(true);
    setOtpError("");
    setError("");

    try {
      const cleanDigits = cardNumber.replace(/\s/g, "").slice(-4);
      const paymentId = `card_${Date.now()}_end${cleanDigits}`;

      const verifyRes = await paymentApi.verifyPayment({
        ride_id: rideId,
        gateway_order_id: order?.order_id || `order_card_${Date.now()}`,
        gateway_payment_id: paymentId,
        gateway_signature: "card_3ds2_verified",
      });

      if (verifyRes?.success && verifyRes.payment) {
        setShowOtpModal(false);
        setPaymentSuccess(verifyRes.payment);
      } else {
        throw new Error(verifyRes?.message || "Card verification failed with bank.");
      }
    } catch (err) {
      setOtpError(err.message || "Failed to verify bank authorization.");
    } finally {
      setPaying(false);
    }
  };

  // 3. Confirm UPI Payment (QR Scan or VPA)
  const handleConfirmUpi = async (mode) => {
    setError("");

    try {
      const fare = Number(order?.amount || ride?.estimated_fare || 0);

      if (mode === "qr") {
        setPaying(true);
        const utrCode = upiUtr.trim() || undefined;
        const qrRes = await paymentApi.confirmQrPayment(rideId, fare, utrCode);

        if (qrRes?.success && qrRes.payment) {
          playPaymentSuccessChime();
          speakPaymentSuccess(fare);
          setPaymentSuccess(qrRes.payment);
          return;
        } else {
          throw new Error(qrRes?.message || "UPI payment confirmation failed.");
        }
      } else {
        if (!userVpa.trim() || !userVpa.includes("@")) {
          throw new Error("Please enter a valid UPI ID (e.g. yourname@okhdfcbank).");
        }
        if (!vpaRequestSent) {
          throw new Error("Please click 'Send Payment Request to UPI App' and approve the collect request first.");
        }
        setPaying(true);
        const paymentId = `upi_vpa_${userVpa.trim().replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
        const qrRes = await paymentApi.confirmQrPayment(rideId, fare, paymentId);

        if (qrRes?.success && qrRes.payment) {
          playPaymentSuccessChime();
          speakPaymentSuccess(fare);
          setPaymentSuccess(qrRes.payment);
          return;
        } else {
          throw new Error(qrRes?.message || "UPI collect confirmation failed.");
        }
      }
    } catch (err) {
      setError(err.message || "Failed to confirm UPI payment.");
    } finally {
      setPaying(false);
    }
  };

  // 4. Confirm Net Banking Payment
  const handleNetBankingPay = async () => {
    setPaying(true);
    setError("");

    try {
      const paymentId = `pay_nb_${selectedBank}_${Date.now()}`;
      const verifyRes = await paymentApi.verifyPayment({
        ride_id: rideId,
        gateway_order_id: order?.order_id || `order_nb_${Date.now()}`,
        gateway_payment_id: paymentId,
        gateway_signature: "netbanking_authorized",
      });

      if (verifyRes?.success && verifyRes.payment) {
        setPaymentSuccess(verifyRes.payment);
      } else {
        throw new Error(verifyRes?.message || "Net Banking payment failed.");
      }
    } catch (err) {
      setError(err.message || "Bank gateway error.");
    } finally {
      setPaying(false);
    }
  };

  // 5. Confirm Cash Payment
  const handleCashConfirm = async () => {
    if (!confirm("Are you handing the exact fare directly to the driver in cash?")) return;
    setPaying(true);
    setError("");

    try {
      const paymentId = `cash_${Date.now()}_driver`;
      const verifyRes = await paymentApi.verifyPayment({
        ride_id: rideId,
        gateway_order_id: order?.order_id || `order_cash_${Date.now()}`,
        gateway_payment_id: paymentId,
        gateway_signature: "cash_on_arrival",
      });

      if (verifyRes?.success && verifyRes.payment) {
        setPaymentSuccess(verifyRes.payment);
      } else {
        throw new Error(verifyRes?.message || "Cash recording failed.");
      }
    } catch (err) {
      setError(err.message || "Unable to confirm cash payment.");
    } finally {
      setPaying(false);
    }
  };

  if (!rideId) {
    return (
      <EmptyState
        icon="❓"
        title="No Ride Specified for Payment"
        description="Please select an active or completed trip from your Passenger Dashboard or My Rides page."
        action={
          <Link
            href="/my-rides"
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
            Go to My Rides →
          </Link>
        }
      />
    );
  }

  if (loading) {
    return <LoadingSpinner message="Securing ride fare details from server..." />;
  }

  // Success Confirmation State
  if (paymentSuccess) {
    return (
      <div className={styles.receiptCard}>
        <div className={styles.receiptIcon}>✓</div>
        <h2 className={styles.receiptTitle}>Payment Verified & Complete!</h2>
        <p className={styles.receiptSubtitle}>
          Your payment has been authorized and settled directly to your Driver Partner.
        </p>

        <div className={styles.receiptDetails}>
          <div className={styles.receiptRow}>
            <span>Transaction Reference:</span>
            <strong style={{ fontFamily: "monospace" }}>
              {paymentSuccess.gateway_payment_id || paymentSuccess.id.substring(0, 16)}
            </strong>
          </div>
          <div className={styles.receiptRow}>
            <span>Ride Reference:</span>
            <strong style={{ fontFamily: "monospace" }}>
              {paymentSuccess.ride_id?.substring(0, 8)}...
            </strong>
          </div>
          <div className={styles.receiptRow}>
            <span>Amount Paid:</span>
            <strong style={{ color: "#f4c401", fontSize: 18 }}>
              ₹{Number(paymentSuccess.amount).toFixed(2)}
            </strong>
          </div>
          <div className={styles.receiptRow}>
            <span>Settled To:</span>
            <strong style={{ color: "#e2e8f0" }}>
              {ride?.driver_name || "Assigned Driver"} ({ride?.driver_upi_id || "Verified UPI"})
            </strong>
          </div>
          <div className={styles.receiptRow}>
            <span>Payment Status:</span>
            <strong style={{ color: "#34d399" }}>PAID & VERIFIED</strong>
          </div>
          <div className={styles.receiptRow}>
            <span>Timestamp:</span>
            <strong>
              {new Date(
                paymentSuccess.updated_at || paymentSuccess.created_at || Date.now()
              ).toLocaleString("en-IN")}
            </strong>
          </div>
        </div>

        <div className={styles.receiptActions}>
          <button
            type="button"
            onClick={() => window.print()}
            className={styles.outlineActionBtn}
          >
            🖨️ Print Receipt
          </button>
          <Link href="/my-rides" className={styles.actionBtn}>
            View in My Rides →
          </Link>
          <Link href="/dashboard" className={styles.outlineActionBtn}>
            Passenger Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const fareNumber = Number(order?.amount || ride?.estimated_fare || 0);
  const baseFare = 40.0;
  const distanceFare = Math.max(0, fareNumber - baseFare);

  const driverName = ride?.driver_name || "Assigned Driver Partner";
  const driverUpiId = ride?.driver_upi_id || "ridego.driver@okhdfcbank";
  const driverVehicle = ride?.driver_vehicle_model || "RideGo Verified Vehicle";
  const driverPlate = ride?.driver_vehicle_number || "MH 15 AB 1234";

  // Dynamic Driver UPI URI & QR Code
  const upiPayUri = `upi://pay?pa=${encodeURIComponent(driverUpiId)}&pn=${encodeURIComponent(driverName)}&am=${fareNumber.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`RideGo Ride #${rideId.slice(0, 8)}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiPayUri)}&margin=8`;

  return (
    <div className={styles.paymentGrid}>
      {/* Ride Summary & Itemized Breakdown */}
      <div className={styles.summaryCard}>
        <div className={styles.cardTitle}>
          <span>Trip & Driver Summary</span>
          <span style={{ fontSize: 12, color: "#f4c401", fontFamily: "monospace" }}>
            #{rideId.substring(0, 8)}
          </span>
        </div>

        {/* Assigned Driver Box */}
        <div className={styles.driverInfoStrip}>
          <div className={styles.driverAvatarMini}>
            {driverName[0] || "D"}
          </div>
          <div className={styles.driverTextMini}>
            <strong>{driverName}</strong>
            <span>{driverVehicle} · {driverPlate}</span>
          </div>
        </div>

        <div className={styles.routeTimeline}>
          <div className={styles.pointRow}>
            <span className={styles.pickupDot} />
            <div className={styles.addressText}>
              <strong>Pickup Point</strong>
              <span>{ride?.pickup_address}</span>
            </div>
          </div>

          <div className={styles.pointRow}>
            <span className={styles.dropoffDot} />
            <div className={styles.addressText}>
              <strong>Destination Point</strong>
              <span>{ride?.dropoff_address}</span>
            </div>
          </div>
        </div>

        <div className={styles.breakdown}>
          <div className={styles.breakdownRow}>
            <span>Base Fare</span>
            <strong>₹{baseFare.toFixed(2)}</strong>
          </div>
          <div className={styles.breakdownRow}>
            <span>Distance Rate (₹15/km)</span>
            <strong>₹{distanceFare.toFixed(2)}</strong>
          </div>
          <div className={styles.breakdownRow}>
            <span>Applicable GST & City Surcharges</span>
            <strong style={{ color: "#34d399" }}>Included</strong>
          </div>
        </div>

        <div className={styles.totalRow}>
          <span>Total Fare Payable</span>
          <span className={styles.totalAmount}>₹{fareNumber.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Gateway Box */}
      <div className={styles.checkoutCard}>
        <div className={styles.cardTitle}>
          <span>Secure Payment Gateway</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={toggleVoice}
              style={{
                background: voiceEnabled ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                border: `1px solid ${voiceEnabled ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                color: voiceEnabled ? "#10b981" : "#f87171",
                borderRadius: 999,
                padding: "3px 10px",
                fontSize: 11.5,
                cursor: "pointer",
                fontWeight: 750,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
              title={voiceEnabled ? "Voice announcements & chime active. Tap to mute." : "Voice announcements muted. Tap to turn ON."}
            >
              {voiceEnabled ? "🔊 Voice: ON" : "🔇 Voice: OFF"}
            </button>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>🔒 256-Bit SSL</span>
          </div>
        </div>

        <ErrorMessage message={error} />

        {/* Payment Method Selector Tabs */}
        <div className={styles.methodTabsRow}>
          <button
            type="button"
            onClick={() => { setSelectedMethod("card"); setError(""); }}
            className={`${styles.methodTabBtn} ${
              selectedMethod === "card" ? styles.methodTabBtnActive : ""
            }`}
          >
            <span className={styles.methodTabIcon}>💳</span>
            <span className={styles.methodTabLabel}>Card</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedMethod("upi"); setError(""); }}
            className={`${styles.methodTabBtn} ${
              selectedMethod === "upi" ? styles.methodTabBtnActive : ""
            }`}
          >
            <span className={styles.methodTabIcon}>📱</span>
            <span className={styles.methodTabLabel}>UPI</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedMethod("netbanking"); setError(""); }}
            className={`${styles.methodTabBtn} ${
              selectedMethod === "netbanking" ? styles.methodTabBtnActive : ""
            }`}
          >
            <span className={styles.methodTabIcon}>🏦</span>
            <span className={styles.methodTabLabel}>NetBanking</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedMethod("cash"); setError(""); }}
            className={`${styles.methodTabBtn} ${
              selectedMethod === "cash" ? styles.methodTabBtnActive : ""
            }`}
          >
            <span className={styles.methodTabIcon}>💵</span>
            <span className={styles.methodTabLabel}>Cash</span>
          </button>
        </div>

        {/* 1. CREDIT / DEBIT CARD GATEWAY */}
        {selectedMethod === "card" && (
          <form onSubmit={handleCardSubmit} className={styles.gatewayFormBox}>
            {/* Visual Credit Card Preview */}
            <div className={styles.cardPreview}>
              <div className={styles.cardPreviewTop}>
                <div className={styles.cardChip}>⚡</div>
                <span className={styles.cardBrandIcon}>{cardBrand}</span>
              </div>

              <div className={styles.cardPreviewNumber}>
                {cardNumber || "•••• •••• •••• ••••"}
              </div>

              <div className={styles.cardPreviewBottom}>
                <div>
                  <span className={styles.cardPreviewLabel}>Cardholder</span>
                  <span className={styles.cardPreviewVal}>
                    {cardHolder || "YOUR NAME"}
                  </span>
                </div>
                <div>
                  <span className={styles.cardPreviewLabel}>Expires</span>
                  <span className={styles.cardPreviewVal}>
                    {cardExpiry || "MM/YY"}
                  </span>
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className={styles.inputGroup}>
              <label>16-Digit Card Number</label>
              <input
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="4532 8920 1829 4410"
                maxLength={19}
                required
                className={styles.gatewayInput}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Cardholder Name</label>
              <input
                type="text"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="Name as printed on card"
                required
                className={styles.gatewayInput}
              />
            </div>

            <div className={styles.rowTwoCol}>
              <div className={styles.inputGroup}>
                <label>Expiration (MM/YY)</label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={handleExpiryChange}
                  placeholder="12/28"
                  maxLength={5}
                  required
                  className={styles.gatewayInput}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>CVV / CVC (3 Digits)</label>
                <input
                  type="password"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="•••"
                  maxLength={3}
                  required
                  className={styles.gatewayInput}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={paying}
              className={styles.payNowBtn}
            >
              🔒 Pay ₹{fareNumber.toFixed(2)} via Card
            </button>
          </form>
        )}

        {/* 2. UPI GATEWAY (QR CODE & UPI ID) */}
        {selectedMethod === "upi" && (
          <div className={styles.gatewayFormBox}>
            <div className={styles.upiSubNav}>
              <button
                type="button"
                onClick={() => setUpiSubTab("qr")}
                className={`${styles.upiSubBtn} ${
                  upiSubTab === "qr" ? styles.upiSubBtnActive : ""
                }`}
              >
                📷 Scan Driver QR Code
              </button>
              <button
                type="button"
                onClick={() => setUpiSubTab("vpa")}
                className={`${styles.upiSubBtn} ${
                  upiSubTab === "vpa" ? styles.upiSubBtnActive : ""
                }`}
              >
                💬 Enter Your UPI ID (VPA)
              </button>
            </div>

            {upiSubTab === "qr" ? (
              <div className={styles.upiQrCard}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                  Scan with <strong>Google Pay, PhonePe, Paytm, BHIM</strong> or any banking UPI app.
                </p>

                <div className={styles.qrImageFrame}>
                  <img
                    src={qrCodeUrl}
                    alt="Driver Payment UPI QR Code"
                    className={styles.qrImage}
                  />
                </div>

                <div className={styles.upiHandlePill}>
                  <span>UPI: <strong>{driverUpiId}</strong></span>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className={styles.copyBtn}
                  >
                    {copySuccess ? "✓ Copied" : "📋 Copy"}
                  </button>
                </div>

                <a
                  href={upiPayUri}
                  className={styles.openUpiBtn}
                >
                  🚀 Open UPI App on Device
                </a>

                <div className={styles.utrPromptBox}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    UPI Transaction / UTR Ref Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={upiUtr}
                    onChange={(e) => setUpiUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    placeholder="e.g. 428192847192 (12 digits)"
                    className={styles.gatewayInput}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10b981", fontSize: 12, fontWeight: 750, margin: "6px 0" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 8px #10b981" }} />
                  <span>Live Soundbox Active · Waiting for UPI payment transfer...</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleConfirmUpi("qr")}
                  disabled={paying}
                  className={styles.payNowBtn}
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#ffffff",
                    boxShadow: "0 4px 16px rgba(16, 185, 129, 0.35)",
                  }}
                >
                  {paying ? "Verifying Payment..." : `✓ I Have Scanned & Paid ₹${fareNumber.toFixed(2)} via UPI`}
                </button>
              </div>
            ) : (
              <div className={styles.gatewayFormBox}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                  Enter your UPI Virtual Payment Address. We will send a payment request to your app for ₹{fareNumber.toFixed(2)}.
                </p>

                <div className={styles.inputGroup}>
                  <label>Your UPI ID / VPA</label>
                  <input
                    type="text"
                    value={userVpa}
                    onChange={(e) => setUserVpa(e.target.value)}
                    placeholder="e.g. mobile@okaxis or username@paytm"
                    className={styles.gatewayInput}
                    disabled={vpaRequestSent}
                  />
                </div>

                {vpaRequestSent ? (
                  <div style={{ background: "rgba(244,196,1,0.08)", border: "1px dashed #f4c401", borderRadius: 12, padding: 16, textAlign: "center" }}>
                    <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>📲</span>
                    <strong style={{ fontSize: 14, color: "#f4c401", display: "block", marginBottom: 4 }}>
                      Payment Request Sent!
                    </strong>
                    <p style={{ fontSize: 12.5, color: "#9ca3af", margin: 0 }}>
                      Open your UPI app ({userVpa}) to approve ₹{fareNumber.toFixed(2)}.
                    </p>
                    <div style={{ marginTop: 10, fontSize: 18, fontWeight: 900, fontFamily: "monospace", color: "#ffffff" }}>
                      {Math.floor(vpaCountdown / 60)}:{(vpaCountdown % 60).toString().padStart(2, "0")}
                    </div>
                  </div>
                ) : null}

                {vpaRequestSent ? (
                  <button
                    type="button"
                    onClick={() => handleConfirmUpi("vpa")}
                    disabled={paying}
                    className={styles.payNowBtn}
                  >
                    {paying ? "Verifying Approval..." : "✓ I Have Approved in My UPI App"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!userVpa.trim() || !userVpa.includes("@")) {
                        setError("Please enter a valid UPI VPA handle containing '@'.");
                        return;
                      }
                      setError("");
                      setVpaRequestSent(true);
                      setVpaCountdown(120);
                    }}
                    className={styles.payNowBtn}
                  >
                    Send Payment Request to UPI App →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. NET BANKING GATEWAY */}
        {selectedMethod === "netbanking" && (
          <div className={styles.gatewayFormBox}>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
              Select your bank to proceed with direct Indian retail net banking.
            </p>

            <div className={styles.bankGrid}>
              {POPULAR_BANKS.map((bank) => (
                <div
                  key={bank.id}
                  onClick={() => setSelectedBank(bank.id)}
                  className={`${styles.bankOption} ${
                    selectedBank === bank.id ? styles.bankOptionActive : ""
                  }`}
                >
                  <span className={styles.bankIcon}>{bank.icon}</span>
                  <span>{bank.name}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleNetBankingPay}
              disabled={paying}
              className={styles.payNowBtn}
            >
              {paying ? "Redirecting to Bank Portal..." : `Proceed to Pay ₹${fareNumber.toFixed(2)}`}
            </button>
          </div>
        )}

        {/* 4. CASH PAYMENT */}
        {selectedMethod === "cash" && (
          <div className={styles.gatewayFormBox}>
            <div className={styles.cashCard}>
              <span className={styles.cashIcon}>💵</span>
              <h4>Cash Settlement on Arrival</h4>
              <p>
                Hand ₹{fareNumber.toFixed(2)} in cash directly to your driver partner, <strong>{driverName}</strong>, when you arrive at your destination.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCashConfirm}
              disabled={paying}
              className={styles.payNowBtn}
            >
              {paying ? "Updating Cash Record..." : `Confirm Cash Handoff of ₹${fareNumber.toFixed(2)}`}
            </button>
          </div>
        )}

        <div className={styles.secureNotice}>
          <span>🛡️ Verified direct driver settlement · 256-Bit Encrypted</span>
        </div>
      </div>

      {/* Realistic Bank 3D-Secure 2.0 OTP Authorization Modal */}
      {showOtpModal && (
        <div className={styles.modalOverlay} onClick={() => !paying && setShowOtpModal(false)}>
          <div className={styles.otpCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.bankHeader}>
              <strong>🏛️ Verified by {cardBrand} · 3D-Secure 2.0</strong>
              <button
                type="button"
                onClick={() => !paying && setShowOtpModal(false)}
                className={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>

            <p className={styles.otpPromptText}>
              A 6-digit One Time Password (OTP) has been dispatched to your mobile registered with card ending in <strong>{cardNumber.slice(-4) || "8812"}</strong> for amount <strong>₹{fareNumber.toFixed(2)}</strong>.
            </p>

            <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input
                type="text"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                maxLength={6}
                autoFocus
                required
                className={styles.otpDigitInput}
              />

              <div
                onClick={() => setOtpValue("482910")}
                className={styles.demoOtpBadge}
                title="Click to auto-fill demo OTP"
              >
                <span>🧪 Test Simulator OTP: <strong>482910</strong></span>
                <span style={{ textDecoration: "underline" }}>Auto-Fill</span>
              </div>

              {otpError && (
                <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 750 }}>
                  ⚠️ {otpError}
                </div>
              )}

              <button
                type="submit"
                disabled={paying || otpValue.length !== 6}
                className={styles.authOtpBtn}
              >
                {paying ? "Authorizing with Bank..." : `✓ Authorize Payment of ₹${fareNumber.toFixed(2)}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentPage() {
  return (
    <div className={styles.page}>
      <Navbar />

      <PageHeader
        eyebrow="SECURE PAYMENT GATEWAY"
        title="Interactive Fare"
        titleAccent="Settlement"
        subtitle="Complete your trip payment via Credit/Debit Cards with 3D-Secure OTP, Direct Driver UPI QR, or Cash."
      />

      <AuthGuard requiredRole="passenger">
        <main className={styles.main}>
          <Suspense fallback={<LoadingSpinner message="Loading payment gateway session..." />}>
            <PaymentContent />
          </Suspense>
        </main>
      </AuthGuard>

      <Footer />
    </div>
  );
}
