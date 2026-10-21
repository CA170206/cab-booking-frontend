"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ThemeToggle from "./components/ThemeToggle";
import styles from "./page.module.css";

export default function Home() {
  const [tripType, setTripType] = useState("oneway");
  const [reviews, setReviews] = useState([]);
  const [platformStats, setPlatformStats] = useState({
    total_completed_rides: 7,
    total_active_drivers: 3,
    total_passengers: 3,
    average_rating: 4.8,
  });

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://cab-booking-backend-f4sj.onrender.com"}/api/rides/public/reviews`)

      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          if (Array.isArray(data.reviews) && data.reviews.length > 0) {
            setReviews(data.reviews);
          }
          if (data.stats) {
            setPlatformStats(data.stats);
          }
        }
      })
      .catch((err) => console.warn("Could not fetch real reviews:", err));
  }, []);

  return (
    <div className={styles.page}>
      {/* Navbar */}
      <header className={styles.navbar}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand} aria-label="CabGo Home">
            <span className={styles.brandIcon}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
              </svg>
            </span>
            <div className={styles.brandText}>
              <span className={styles.brandName}>CabGo</span>
              <span className={styles.brandSub}>Cab Services</span>
            </div>
          </Link>

          <nav className={styles.navLinks}>
            <Link href="/" className={`${styles.navLink} ${styles.navLinkActive}`}>
              Home
            </Link>
            <Link href="/about" className={styles.navLink}>
              About
            </Link>
            <Link href="/services" className={styles.navLink}>
              Services
            </Link>
            <Link href="/contact" className={styles.navLink}>
              Contact
            </Link>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            <Link href="/login" className={styles.navLink} style={{ fontWeight: 700 }}>
              Sign In
            </Link>
            <Link href="/booking" className={styles.navBookBtn}>
              Book Now
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>RIDE BEYOND COMFORT</h1>
          <p className={styles.heroSubtitle}>
            Book your ride in just a few clicks and travel with comfort.
          </p>

          {/* Hero Booking Card matching specification */}
          <div className={styles.heroCard}>
            <div className={styles.tripTabs}>
              <button
                type="button"
                onClick={() => setTripType("oneway")}
                className={`${styles.tripTab} ${tripType === "oneway" ? styles.tripTabActive : ""}`}
              >
                <span className={styles.tabRadio} style={{ opacity: tripType === "oneway" ? 1 : 0.3 }} />
                <span>One Way</span>
              </button>
              <button
                type="button"
                onClick={() => setTripType("roundtrip")}
                className={`${styles.tripTab} ${tripType === "roundtrip" ? styles.tripTabActive : ""}`}
              >
                <span className={styles.tabRadio} style={{ opacity: tripType === "roundtrip" ? 1 : 0.3 }} />
                <span>Round Trip</span>
              </button>
              <button
                type="button"
                onClick={() => setTripType("outstation")}
                className={`${styles.tripTab} ${tripType === "outstation" ? styles.tripTabActive : ""}`}
              >
                <span className={styles.tabRadio} style={{ opacity: tripType === "outstation" ? 1 : 0.3 }} />
                <span>Outstation</span>
              </button>
            </div>

            <div className={styles.cardFieldsGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Pickup Location</label>
                <input
                  type="text"
                  placeholder="Enter your location"
                  defaultValue="City Center Mall, Nashik"
                  className={styles.dashedInput}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Drop Location</label>
                <input
                  type="text"
                  placeholder="Enter drop location"
                  defaultValue="Nashik Road Railway Station"
                  className={styles.dashedInput}
                />
              </div>
            </div>

            <div className={styles.fieldGroup} style={{ marginBottom: 14 }}>
              <label className={styles.fieldLabel}>Date &amp; Time</label>
              <input
                type="text"
                placeholder="Select Date & Time"
                defaultValue="Today, Right Now"
                className={styles.dashedInput}
              />
            </div>

            <Link href="/booking" className={styles.searchCabBtn}>
              <span>Search Cab</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose DriveGo ? */}
      <section id="about" className={styles.whySection}>
        <h2 className={styles.sectionHeading}>Why Choose DriveGo ?</h2>

        <div className={styles.whyGrid}>
          <div className={styles.whyItem}>
            <div className={styles.whyIconWrap}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <strong>Secure Rides</strong>
          </div>

          <div className={styles.whyItem}>
            <div className={styles.whyIconWrap}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <strong>Affordable Prices</strong>
          </div>

          <div className={styles.whyItem}>
            <div className={styles.whyIconWrap}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <strong>Professional Drivers</strong>
          </div>

          <div className={styles.whyItem}>
            <div className={styles.whyIconWrap}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
            </div>
            <strong>24/7 Support</strong>
          </div>
        </div>
      </section>

      {/* Our Popular Rides */}
      <section id="services" className={styles.ridesSection}>
        <div className={styles.ridesHeader}>
          <h2>Our Popular Rides</h2>
          <Link href="/booking" className={styles.viewAllLink}>
            View All →
          </Link>
        </div>

        <div className={styles.ridesGrid}>
          {/* Sedan — Maruti Suzuki Dzire */}
          <Link href="/booking" className={styles.rideCard}>
            <div className={styles.rideImageWrap}>
              <img
                src="/images/cars/sedan.jpg"
                alt="Maruti Suzuki Dzire Sedan"
                className={styles.carImg}
              />
            </div>
            <h3 className={styles.rideName}>Sedan</h3>
            <span className={styles.rideCapacity}>Dzire / Etios · 4 Seater</span>
            <div className={styles.rideRate}>
              ₹12 <span>/km</span>
            </div>
          </Link>

          {/* SUV — Toyota Innova Crysta */}
          <Link href="/booking" className={styles.rideCard}>
            <div className={styles.rideImageWrap}>
              <img
                src="/images/cars/suv.jpg"
                alt="Toyota Innova Crysta SUV"
                className={styles.carImg}
              />
            </div>
            <h3 className={styles.rideName}>SUV</h3>
            <span className={styles.rideCapacity}>Innova / Ertiga · 6 Seater</span>
            <div className={styles.rideRate}>
              ₹18 <span>/km</span>
            </div>
          </Link>

          {/* LUXURY — Mercedes-Benz E-Class */}
          <Link href="/booking" className={styles.rideCard}>
            <div className={styles.rideImageWrap}>
              <img
                src="/images/cars/luxury.jpg"
                alt="Mercedes-Benz E-Class Luxury"
                className={styles.carImg}
              />
            </div>
            <h3 className={styles.rideName}>LUXURY</h3>
            <span className={styles.rideCapacity}>E-Class / BMW 5 · 4 Seater</span>
            <div className={styles.rideRate}>
              ₹25 <span>/km</span>
            </div>
          </Link>

          {/* HATCHBACK — Maruti Suzuki Swift */}
          <Link href="/booking" className={styles.rideCard}>
            <div className={styles.rideImageWrap}>
              <img
                src="/images/cars/hatchback.jpg"
                alt="Maruti Suzuki Swift Hatchback"
                className={styles.carImg}
              />
            </div>
            <h3 className={styles.rideName}>HATCHBACK</h3>
            <span className={styles.rideCapacity}>Swift / WagonR · 4 Seater</span>
            <div className={styles.rideRate}>
              ₹10 <span>/km</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Download Our App */}
      <section className={styles.appBannerSection}>
        <div className={styles.appBanner}>
          <div className={styles.appBannerCopy}>
            <h3>Download Our App</h3>
            <p>Book rides, track drivers, and manage your trips on the go.</p>
          </div>

          <div className={styles.appButtons}>
            <a href="#download" className={styles.storePill}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.89c.64-.78 1.08-1.86.96-2.95-1 .04-2.14.64-2.81 1.42-.58.68-1.1 1.76-.96 2.81 1.12.09 2.19-.53 2.81-1.28z" />
              </svg>
              <span>App Store</span>
            </a>

            <a href="#download" className={styles.storePill}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 20.5v-17c0-.83.67-1.5 1.5-1.5.38 0 .73.14 1 .38l12.5 8.5c.62.42.62 1.34 0 1.76l-12.5 8.5c-.27.24-.62.38-1 .38-.83 0-1.5-.67-1.5-1.5z" />
              </svg>
              <span>Google Play</span>
            </a>
          </div>
        </div>
      </section>

      {/* How It Works ? */}
      <section className={styles.howSection}>
        <h2>How It Works?</h2>
        <p>Book Your Ride In 3 Simple Steps</p>

        <div className={styles.howGrid}>
          <div className={styles.howCard}>
            <div className={styles.howIconBox}>📍</div>
            <div className={styles.howText}>
              <strong>Enter Location</strong>
              <span>Enter your pickup and drop location on the map.</span>
            </div>
          </div>

          <div className={styles.howCard}>
            <div className={styles.howIconBox}>🚕</div>
            <div className={styles.howText}>
              <strong>Choose A Ride</strong>
              <span>Select your preferred vehicle type and check rates.</span>
            </div>
          </div>

          <div className={styles.howCard}>
            <div className={styles.howIconBox}>💳</div>
            <div className={styles.howText}>
              <strong>Confirm Booking</strong>
              <span>Confirm your booking and get matched with drivers.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Real Verified Passenger Reviews */}
      <section className={styles.reviewsSection}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0 }}>Real Passenger Reviews</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
              Genuine feedback submitted by passengers after completing their verified journeys.
            </p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: "var(--yellow)", background: "var(--yellow-light)", padding: "4px 12px", borderRadius: 999 }}>
            ✓ 100% Verified Trips
          </span>
        </div>

        <div className={styles.reviewsGrid}>
          {reviews.length > 0 ? (
            reviews.map((rev) => {
              const initials = (rev.passenger_name || "P")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const starCount = Math.min(5, Math.max(1, rev.rating || 5));
              const stars = "★".repeat(starCount) + "☆".repeat(5 - starCount);

              return (
                <div key={rev.id} className={styles.reviewCard}>
                  <div className={styles.reviewerTop}>
                    <div className={styles.avatar}>{initials}</div>
                    <div className={styles.reviewerMeta}>
                      <strong>{rev.passenger_name}</strong>
                      <div className={styles.stars}>{stars}</div>
                    </div>
                  </div>

                  {rev.review_comment ? (
                    <p className={styles.reviewText}>
                      &quot;{rev.review_comment}&quot;
                    </p>
                  ) : rev.feedback_tags && rev.feedback_tags.length > 0 ? (
                    <div className={styles.reviewTagsRow}>
                      {rev.feedback_tags.map((tag, idx) => (
                        <span key={idx} className={styles.reviewTagChip}>
                          ✓ {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.reviewText}>
                      &quot;Safe and comfortable trip completed with verified driver.&quot;
                    </p>
                  )}

                  {rev.pickup_address && rev.dropoff_address && (
                    <div className={styles.reviewRouteNote}>
                      📍 {rev.pickup_address.split("·")[0].trim()} → {rev.dropoff_address.split("·")[0].trim()}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className={styles.noReviewsBox}>
              <p>No passenger ratings yet. Book a ride and your verified review will appear here!</p>
            </div>
          )}
        </div>
      </section>

      {/* Statistics Bar (Real Database Metrics) */}
      <section className={styles.statsBar}>
        <div className={styles.statsBarInner}>
          <div className={styles.statCol}>
            <span className={styles.statIcon}>🚖</span>
            <div className={styles.statContent}>
              <strong>{platformStats.total_completed_rides || 0}+</strong>
              <span>Completed Trips</span>
            </div>
          </div>

          <div className={styles.statCol}>
            <span className={styles.statIcon}>👨‍✈️</span>
            <div className={styles.statContent}>
              <strong>{platformStats.total_active_drivers || 0}+</strong>
              <span>Verified Drivers</span>
            </div>
          </div>

          <div className={styles.statCol}>
            <span className={styles.statIcon}>⭐</span>
            <div className={styles.statContent}>
              <strong>★ {Number(platformStats.average_rating || 5.0).toFixed(1)}</strong>
              <span>Platform Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerAbout}>
            <div className={styles.brand}>
              <span className={styles.brandIcon}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                </svg>
              </span>
              <div className={styles.brandText}>
                <span className={styles.brandName}>CabGo</span>
                <span className={styles.brandSub}>Cab Services</span>
              </div>
            </div>

            <p>
              CabGo is your trusted travel partner. We provide safe, reliable, and transparent cab services across the city.
            </p>

            <form onSubmit={(e) => e.preventDefault()} className={styles.newsletter}>
              <input type="email" placeholder="Enter your email" />
              <button type="submit" className={styles.newsletterBtn} aria-label="Subscribe">
                →
              </button>
            </form>
          </div>

          <div className={styles.footerCol}>
            <h4>Quick Links</h4>
            <ul>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/services">Services</Link></li>
              <li><Link href="/booking">Book Cab</Link></li>
              <li><Link href="/contact">Contact</Link></li>
              <li><Link href="/login">Passenger Login</Link></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <h4>Documentation</h4>
            <ul>
              <li><a href="#help">Help Centre</a></li>
              <li><a href="#contact">Contact</a></li>
              <li><a href="#faq">FAQ</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
            </ul>
          </div>

          <div className={styles.footerCol}>
            <h4>Social</h4>
            <ul>
              <li><a href="#facebook">Facebook</a></li>
              <li><a href="#instagram">Instagram</a></li>
              <li><a href="#youtube">Youtube</a></li>
              <li><a href="#twitter">Twitter</a></li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>© DriveGo. All Rights Reserved 2025</span>
          <a href="#terms">Terms &amp; Conditions</a>
        </div>
      </footer>
    </div>
  );
}
