import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerGrid}>
          {/* Brand Col */}
          <div className={styles.brandCol}>
            <Link href="/" className={styles.brand}>
              <span className={styles.brandIcon}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                </svg>
              </span>
              <div className={styles.brandText}>
                <div className={styles.brandName}>CabGo</div>
                <div className={styles.brandSub}>Cab Services</div>
              </div>
            </Link>
            <p className={styles.brandBio}>
              Safe, affordable, and transparent on-demand cab services across India. Powered by real-time interactive mapping and transparent per-kilometer pricing.
            </p>
          </div>

          {/* Quick Links */}
          <div className={styles.footerCol}>
            <h4>Explore</h4>
            <ul className={styles.linkList}>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li>
                <Link href="/about">About Us</Link>
              </li>
              <li>
                <Link href="/services">Services</Link>
              </li>
              <li>
                <Link href="/booking">Book a Cab</Link>
              </li>
              <li>
                <Link href="/contact">Contact Support</Link>
              </li>
            </ul>
          </div>

          {/* User & Driver Portals */}
          <div className={styles.footerCol}>
            <h4>Portals</h4>
            <ul className={styles.linkList}>
              <li>
                <Link href="/login">Passenger Login</Link>
              </li>
              <li>
                <Link href="/register">Create Account</Link>
              </li>
              <li>
                <Link href="/dashboard">Passenger Dashboard</Link>
              </li>
              <li>
                <Link href="/my-rides">My Rides</Link>
              </li>
              <li>
                <Link href="/driver">Driver Console</Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className={styles.footerCol}>
            <h4>Headquarters</h4>
            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <span>📍</span>
                <span>CabGo Mobility Hub, College Road, Nashik, MH - 422005</span>
              </div>
              <div className={styles.contactItem}>
                <span>📞</span>
                <span>+91 (0253) 250-CABGO</span>
              </div>
              <div className={styles.contactItem}>
                <span>✉️</span>
                <span>support@cabgo-mobility.in</span>
              </div>
              <div className={styles.contactItem}>
                <span>⏰</span>
                <span>24x7 Customer Helpline</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <div>
            &copy; {new Date().getFullYear()} CabGo Technologies Inc. All rights reserved.
          </div>
          <div>
            Designed for seamless urban transit across India.
          </div>
        </div>
      </div>
    </footer>
  );
}
