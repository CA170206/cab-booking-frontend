import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHeader from "../components/PageHeader";
import styles from "./about.module.css";

export const metadata = {
  title: "About RideGo | Reliable Urban Transit & Transparent Fares",
  description: "Learn how RideGo brings honest, predictable per-kilometer cab services across Indian cities.",
};

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <Navbar />

      <PageHeader
        eyebrow="ABOUT RIDEGO"
        title="Making Urban Travel"
        titleAccent="Honest & Simple"
        subtitle="RideGo is designed to connect passengers and verified drivers directly, eliminating surprise surge pricing with clear per-kilometer rates."
      />

      <main className={styles.main}>
        {/* Mission & Purpose */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Our Purpose & Operating Model</h2>
            <p>
              We believe daily commutes and outstation travel should never involve fare disputes or opaque meters.
            </p>
          </div>

          <div className={styles.missionGrid}>
            <div className={styles.missionCard}>
              <div className={styles.cardIcon}>🎯</div>
              <h3>Predictable Pricing</h3>
              <p>
                Every ride is priced strictly based on geographical distance: Base ₹40 + ₹15/km (minimum ₹60). The fare calculated at pickup is the fare you pay, verified cryptographically upon trip completion.
              </p>
            </div>

            <div className={styles.missionCard}>
              <div className={styles.cardIcon}>🧭</div>
              <h3>Live Interactive Routing</h3>
              <p>
                Integrated with real-time OpenStreetMap and Esri satellite mapping, passengers pin their exact pickup and dropoff points while drivers receive accurate street coordinates.
              </p>
            </div>

            <div className={styles.missionCard}>
              <div className={styles.cardIcon}>🤝</div>
              <h3>Direct Driver Partnership</h3>
              <p>
                Drivers have full autonomy to inspect destination addresses, estimated distances, and fares before accepting trips, eliminating unannounced cancellations.
              </p>
            </div>

            <div className={styles.missionCard}>
              <div className={styles.cardIcon}>🛡️</div>
              <h3>Safety & Verified Profiles</h3>
              <p>
                All user accounts—both passengers and drivers—are validated with authenticated logins and tracked active ride progression states for passenger peace of mind.
              </p>
            </div>
          </div>
        </section>

        {/* Core Pillars */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>The Three Pillars of RideGo</h2>
            <p>Built for reliability from the ground up.</p>
          </div>

          <div className={styles.pillarsGrid}>
            <div className={styles.pillarCard}>
              <span className={styles.pillarIcon}>⚡</span>
              <h4>Speed & Convenience</h4>
              <p>
                Select your pickup and dropoff directly from interactive landmark presets or your current GPS location with zero clutter.
              </p>
            </div>

            <div className={styles.pillarCard}>
              <span className={styles.pillarIcon}>🔒</span>
              <h4>Secure Digital Payments</h4>
              <p>
                Seamless integration with Razorpay supporting UPI (GPay, PhonePe), debit/credit cards, and instant server-verified receipts.
              </p>
            </div>

            <div className={styles.pillarCard}>
              <span className={styles.pillarIcon}>🚘</span>
              <h4>Fleet for Every Need</h4>
              <p>
                From budget Maruti Swift hatchbacks to executive Mercedes luxury sedans and spacious 6-seater Innova Crysta SUVs.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className={styles.ctaBanner}>
          <div className={styles.ctaCopy}>
            <h3>Ready to experience a smoother commute?</h3>
            <p>Pin your pickup on the map and see your estimated fare instantly.</p>
          </div>
          <Link href="/booking" className={styles.ctaBtn}>
            Book a Ride Now →
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
