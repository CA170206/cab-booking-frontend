"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHeader from "../components/PageHeader";
import AuthGuard from "../components/AuthGuard";
import { getStoredUser, clearSession, saveSession, getStoredToken } from "../lib/auth";
import { profileApi } from "../lib/api";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ text: "", type: "" });

  // Passenger state fields (empty by default, loaded from user input in DB)
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [workAddress, setWorkAddress] = useState("");
  const [prefRideType, setPrefRideType] = useState("RideGo Go (Swift / WagonR)");
  const [prefPayment, setPrefPayment] = useState("Direct Driver UPI (Instant QR)");

  // Driver state fields (empty by default, loaded from user input in DB)
  const [licenseNumber, setLicenseNumber] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleCategory, setVehicleCategory] = useState("Sedan (4 Passenger Seats)");
  const [serviceArea, setServiceArea] = useState("");
  const [upiId, setUpiId] = useState("");

  // Real Database Stats
  const [stats, setStats] = useState({
    total_rides: 0,
    completed_rides: 0,
    total_amount: 0,
  });

  const populateUserData = (data) => {
    if (!data) return;
    setUser(data);
    setFullName(data.full_name || "");
    setPhone(data.phone || "");

    // Passenger fields
    setEmergencyPhone(data.emergency_phone || "");
    setHomeAddress(data.home_address || "");
    setWorkAddress(data.work_address || "");
    if (data.preferred_vehicle) setPrefRideType(data.preferred_vehicle);
    if (data.preferred_payment) setPrefPayment(data.preferred_payment);

    // Driver fields
    setLicenseNumber(data.license_number || "");
    setVehicleModel(data.vehicle_model || "");
    setVehicleNumber(data.vehicle_number || "");
    if (data.vehicle_category) setVehicleCategory(data.vehicle_category);
    setServiceArea(data.service_area || "");
    setUpiId(data.upi_id || "");

    if (data.stats) {
      setStats(data.stats);
    }
  };

  const loadUserProfile = async () => {
    const stored = getStoredUser();
    if (stored) {
      populateUserData(stored);
    }

    try {
      const res = await profileApi.getProfile();
      if (res?.success && res.profile) {
        populateUserData(res.profile);
        const token = getStoredToken();
        if (token) saveSession(token, res.profile);
      }
    } catch {
      // Fallback gracefully to stored user session
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, []);

  const handleLogout = () => {
    clearSession();
    router.push("/");
  };

  const isDriver = user?.role === "driver";

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setFeedback({ text: "", type: "" });

    try {
      const payload = {
        full_name: fullName.trim(),
        phone: phone.trim(),
      };

      if (isDriver) {
        payload.license_number = licenseNumber.trim();
        payload.vehicle_model = vehicleModel.trim();
        payload.vehicle_number = vehicleNumber.trim();
        payload.vehicle_category = vehicleCategory;
        payload.service_area = serviceArea.trim();
        payload.upi_id = upiId.trim();
      } else {
        payload.emergency_phone = emergencyPhone.trim();
        payload.home_address = homeAddress.trim();
        payload.work_address = workAddress.trim();
        payload.preferred_vehicle = prefRideType;
        payload.preferred_payment = prefPayment;
      }

      const res = await profileApi.updateProfile(payload);
      if (res?.success && res.profile) {
        populateUserData({ ...res.profile, stats });
        const token = getStoredToken();
        if (token) saveSession(token, { ...res.profile, stats });
        setIsEditing(false);
        setFeedback({
          text: `✓ ${isDriver ? "Driver Partner" : "Passenger"} profile updated successfully!`,
          type: "success",
        });
      } else {
        throw new Error(res?.message || "Failed to update profile.");
      }
    } catch (err) {
      setFeedback({
        text: err.message || "Failed to update profile details.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const initialLetter = (fullName || user?.full_name || user?.email || "U")[0]?.toUpperCase();

  return (
    <div className={styles.page}>
      <Navbar />

      <AuthGuard>
        <PageHeader
          eyebrow={isDriver ? "DRIVER PARTNER CONSOLE" : "PASSENGER ACCOUNT"}
          title={isDriver ? "Driver Partner" : "Passenger"}
          titleAccent="Profile"
          subtitle={
            isDriver
              ? "Manage your vehicle specifications, commercial license, contact details, and direct UPI payout handle."
              : "Manage your personal contact details, saved home & work locations, and ride preferences."
          }
        />

        <main className={styles.main}>
          <div className={styles.profileCard}>
            {/* Top Identity Card */}
            <div className={styles.cardTop}>
              <div className={styles.cardTopLeft}>
                <div className={styles.avatar}>
                  {initialLetter}
                </div>
                <div className={styles.idInfo}>
                  <h3>{fullName || user?.full_name || "Account User"}</h3>
                  <div className={styles.roleBadgeRow}>
                    <span className={styles.roleTag}>
                      {isDriver ? "🚖 DRIVER PARTNER" : "👤 PASSENGER"}
                    </span>
                    <span className={styles.verifiedTag}>
                      {user?.phone ? "✓ Phone Provided" : "Account Active"}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.cardTopRight}>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setFeedback({ text: "", type: "" });
                    }}
                    className={styles.editBtn}
                  >
                    ✏️ Edit Details
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFeedback({ text: "", type: "" });
                      loadUserProfile();
                    }}
                    className={styles.cancelBtn}
                  >
                    ✕ Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Status Feedback Message */}
            {feedback.text && (
              <div
                className={`${styles.feedbackBanner} ${
                  feedback.type === "success"
                    ? styles.feedbackSuccess
                    : styles.feedbackError
                }`}
              >
                {feedback.text}
              </div>
            )}

            {/* ============================================================== */}
            {/* DRIVER PROFILE VIEW (ONLY FOR DRIVERS) */}
            {/* ============================================================== */}
            {isDriver ? (
              <>
                {/* Real Driver Database Stats Ribbon */}
                <div className={styles.statsRibbon}>
                  <div className={styles.statBox}>
                    <label>Driver Rating</label>
                    <strong>
                      {user?.rating && user?.total_ratings > 0
                        ? `★ ${Number(user.rating).toFixed(1)}`
                        : "No reviews yet"}
                    </strong>
                    <span>
                      {user?.total_ratings && user.total_ratings > 0
                        ? `Based on ${user.total_ratings} ${user.total_ratings === 1 ? "review" : "reviews"}`
                        : "Complete trips to earn ratings"}
                    </span>
                  </div>

                  <div className={styles.statBox}>
                    <label>Completed Trips</label>
                    <strong>{stats.completed_rides || 0}</strong>
                    <span>Completed passenger rides</span>
                  </div>

                  <div className={styles.statBox}>
                    <label>Total Earnings</label>
                    <strong>₹{Number(stats.total_amount || 0).toFixed(2)}</strong>
                    <span>Direct trip earnings</span>
                  </div>

                  <div className={styles.statBox}>
                    <label>Dispatch Readiness</label>
                    <strong>
                      {vehicleNumber && upiId ? "Active & Ready" : "Setup Incomplete"}
                    </strong>
                    <span>
                      {vehicleNumber && upiId
                        ? "Configured for passenger requests"
                        : "Add vehicle plate & UPI ID"}
                    </span>
                  </div>
                </div>

                {/* Driver UPI Explanation Box */}
                <div className={styles.driverUpiCallout}>
                  <span className={styles.upiCalloutIcon}>📲</span>
                  <div className={styles.upiCalloutText}>
                    <strong>Driver UPI Payout Destination Handle</strong>
                    <p>
                      When passengers scan the dynamic QR code on their bill, payment is settled directly to your verified UPI handle below. Ensure your VPA is correct.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div>
                    <div className={styles.sectionTitle}>
                      <span>Driver Partner Details</span>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label>Driver Legal Name</label>
                        <input
                          type="text"
                          value={fullName}
                          disabled={!isEditing}
                          onChange={(e) => setFullName(e.target.value)}
                          className={styles.inputField}
                          placeholder="Enter your legal full name"
                          required
                        />
                      </div>

                      <div className={styles.inputGroup}>
                        <label>Account Email</label>
                        <input
                          type="email"
                          value={user?.email || ""}
                          disabled
                          className={styles.inputField}
                        />
                        <span className={styles.fieldNote}>🔒 Authenticated driver account email</span>
                      </div>

                      <div className={styles.inputGroup}>
                        <label>Contact Phone (Passenger Calling)</label>
                        <input
                          type="tel"
                          value={phone}
                          disabled={!isEditing}
                          onChange={(e) => setPhone(e.target.value)}
                          className={styles.inputField}
                          placeholder="Enter phone number (e.g. +91 98230 12345)"
                        />
                      </div>

                      <div className={styles.inputGroup}>
                        <label>Commercial Driving License</label>
                        <input
                          type="text"
                          value={licenseNumber}
                          disabled={!isEditing}
                          onChange={(e) => setLicenseNumber(e.target.value)}
                          className={styles.inputField}
                          placeholder="Enter license number (e.g. MH15-20230012345)"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className={styles.sectionTitle}>
                      <span>Vehicle Dispatch Specifications</span>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label>Vehicle Make & Model</label>
                        <input
                          type="text"
                          value={vehicleModel}
                          disabled={!isEditing}
                          onChange={(e) => setVehicleModel(e.target.value)}
                          className={styles.inputField}
                          placeholder="e.g. Maruti Swift Dzire, Hyundai Aura"
                        />
                      </div>

                      <div className={styles.inputGroup}>
                        <label>License Plate Number</label>
                        <input
                          type="text"
                          value={vehicleNumber}
                          disabled={!isEditing}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                          className={styles.inputField}
                          placeholder="e.g. MH 15 AB 1234"
                        />
                      </div>

                      <div className={styles.inputGroup}>
                        <label>Vehicle Category</label>
                        <select
                          value={vehicleCategory}
                          disabled={!isEditing}
                          onChange={(e) => setVehicleCategory(e.target.value)}
                          className={styles.inputField}
                        >
                          <option>Sedan (4 Passenger Seats)</option>
                          <option>Hatchback / Go (4 Passenger Seats)</option>
                          <option>XL / SUV (6 Passenger Seats)</option>
                          <option>Auto (3 Passenger Seats)</option>
                        </select>
                      </div>

                      <div className={styles.inputGroup}>
                        <label>Operating City / Area</label>
                        <input
                          type="text"
                          value={serviceArea}
                          disabled={!isEditing}
                          onChange={(e) => setServiceArea(e.target.value)}
                          placeholder="e.g. Nashik Central / City Zone"
                          className={styles.inputField}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className={styles.sectionTitle}>
                      <span>Direct Payment Payout Handle</span>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={`${styles.inputGroup} ${styles.fullWidthField}`}>
                        <label>Driver Verified UPI ID (VPA)</label>
                        <input
                          type="text"
                          value={upiId}
                          disabled={!isEditing}
                          onChange={(e) => setUpiId(e.target.value)}
                          className={styles.inputField}
                          placeholder="e.g. yourname@okhdfcbank or phone@paytm"
                        />
                        <span className={styles.fieldNote}>
                          💡 Passenger UPI QR codes are dynamically generated using this handle so you receive instant direct payment.
                        </span>
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          loadUserProfile();
                        }}
                        className={styles.editToggleBtn}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className={styles.saveBtn}
                      >
                        {saving ? "Saving Changes..." : "✓ Save Driver Profile"}
                      </button>
                    </div>
                  )}
                </form>

                {/* Driver Navigation Bar */}
                <div className={styles.footerActionRow}>
                  <Link href="/driver" className={styles.dashboardLink}>
                    Go to Driver Console →
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={styles.signoutBtn}
                  >
                    Sign Out of Account
                  </button>
                </div>
              </>
            ) : (
              /* ============================================================== */
              /* PASSENGER PROFILE VIEW (ONLY FOR PASSENGERS) */
              /* ============================================================== */
              <>
                {/* Real Passenger Database Stats Ribbon */}
                <div className={styles.statsRibbon}>
                  <div className={styles.statBox}>
                    <label>Completed Trips</label>
                    <strong>{stats.completed_rides || 0}</strong>
                    <span>Completed journeys</span>
                  </div>

                  <div className={styles.statBox}>
                    <label>Total Spent</label>
                    <strong>₹{Number(stats.total_amount || 0).toFixed(2)}</strong>
                    <span>Total ride expenditure</span>
                  </div>

                  <div className={styles.statBox}>
                    <label>Total Bookings</label>
                    <strong>{stats.total_rides || 0}</strong>
                    <span>Total ride requests</span>
                  </div>

                  <div className={styles.statBox}>
                    <label>Account Standing</label>
                    <strong>Active Passenger</strong>
                    <span>Verified account</span>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div>
                    <div className={styles.sectionTitle}>
                      <span>Personal Information</span>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label>Full Legal Name</label>
                        <input
                          type="text"
                          value={fullName}
                          disabled={!isEditing}
                          onChange={(e) => setFullName(e.target.value)}
                          className={styles.inputField}
                          placeholder="Enter your full legal name"
                          required
                        />
                      </div>

                      <div className={styles.inputGroup}>
                        <label>Email Address</label>
                        <input
                          type="email"
                          value={user?.email || ""}
                          disabled
                          className={styles.inputField}
                        />
                        <span className={styles.fieldNote}>🔒 Authenticated passenger email</span>
                      </div>

                      <div className={styles.inputGroup}>
                        <label>Contact Phone</label>
                        <input
                          type="tel"
                          value={phone}
                          disabled={!isEditing}
                          onChange={(e) => setPhone(e.target.value)}
                          className={styles.inputField}
                          placeholder="Enter contact phone (e.g. +91 98230 12345)"
                        />
                      </div>

                      <div className={styles.inputGroup}>
                        <label>Emergency Contact Phone</label>
                        <input
                          type="tel"
                          value={emergencyPhone}
                          disabled={!isEditing}
                          onChange={(e) => setEmergencyPhone(e.target.value)}
                          className={styles.inputField}
                          placeholder="Enter emergency contact number for SOS"
                        />
                        <span className={styles.fieldNote}>Used for 1-tap emergency SOS trip sharing</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className={styles.sectionTitle}>
                      <span>Saved Places & Quick Addresses</span>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label>Home Address</label>
                        <input
                          type="text"
                          value={homeAddress}
                          disabled={!isEditing}
                          onChange={(e) => setHomeAddress(e.target.value)}
                          className={styles.inputField}
                          placeholder="Enter your home address / landmark"
                        />
                      </div>

                      <div className={styles.inputGroup}>
                        <label>Work / Office Address</label>
                        <input
                          type="text"
                          value={workAddress}
                          disabled={!isEditing}
                          onChange={(e) => setWorkAddress(e.target.value)}
                          className={styles.inputField}
                          placeholder="Enter your workplace or office address"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className={styles.sectionTitle}>
                      <span>Trip & Payment Preferences</span>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.inputGroup}>
                        <label>Preferred Vehicle Category</label>
                        <select
                          value={prefRideType}
                          disabled={!isEditing}
                          onChange={(e) => setPrefRideType(e.target.value)}
                          className={styles.inputField}
                        >
                          <option>RideGo Go (Swift / WagonR)</option>
                          <option>RideGo Sedan (Dzire / Etios)</option>
                          <option>RideGo XL (Innova Crysta)</option>
                          <option>RideGo Auto (Bajaj Auto)</option>
                        </select>
                      </div>

                      <div className={styles.inputGroup}>
                        <label>Default Payment Mode</label>
                        <select
                          value={prefPayment}
                          disabled={!isEditing}
                          onChange={(e) => setPrefPayment(e.target.value)}
                          className={styles.inputField}
                        >
                          <option>Direct Driver UPI (Instant QR)</option>
                          <option>Credit or Debit Card Gateway</option>
                          <option>Cash to Driver upon Arrival</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          loadUserProfile();
                        }}
                        className={styles.editToggleBtn}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className={styles.saveBtn}
                      >
                        {saving ? "Saving Changes..." : "✓ Save Passenger Profile"}
                      </button>
                    </div>
                  )}
                </form>

                {/* Passenger Navigation Bar */}
                <div className={styles.footerActionRow}>
                  <Link href="/dashboard" className={styles.dashboardLink}>
                    Go to Passenger Dashboard →
                  </Link>
                  <Link href="/booking" className={styles.secondaryActionBtn}>
                    Book a Cab
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className={styles.signoutBtn}
                  >
                    Sign Out of Account
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </AuthGuard>

      <Footer />
    </div>
  );
}
